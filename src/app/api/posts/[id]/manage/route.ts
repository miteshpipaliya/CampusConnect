import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {parseCaption} from '@/lib/core/content-rules';
import {hashtagDelta,nextPinnedPosts} from '@/lib/core/post-management-rules';
import {syncFeedItems} from '@/lib/server/post-feed-sync';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('edit'),caption:z.string().trim().min(1).max(2200)}),
 z.object({action:z.literal('archive'),archived:z.boolean()}),
 z.object({action:z.literal('delete')}),
 z.object({action:z.literal('hideLikes'),value:z.boolean()}),
 z.object({action:z.literal('commentsOff'),value:z.boolean()}),
 z.object({action:z.literal('pin'),value:z.boolean()})
]);
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,schema,rateLimit:{key:'post-management:{uid}',limit:40,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const action=schema.parse(checked.input),{id}=await params;
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid post');
 const store=db(),ref=store.collection('posts').doc(id),author=store.collection('users').doc(checked.user.uid);
 try{
  // Query read before the transaction is needed for the privacy-safe fanout.
  const current=await ref.get();
  if(!current.exists||current.data()?.deletedAt)return errorResponse(404,'Post unavailable');
  if(current.data()?.authorUid!==checked.user.uid)return errorResponse(403,'Only the author can manage this post');
  let resync:boolean|null=null,fanoutError=false;
  const result=await store.runTransaction(async tx=>{
   const [post,user]=await Promise.all([tx.get(ref),tx.get(author)]);
   if(!post.exists||post.data()?.deletedAt)throw Error('MISSING');
   if(post.data()?.authorUid!==checked.user.uid)throw Error('FORBIDDEN');
   const data=post.data()!;
   if(action.action==='hideLikes'){tx.update(ref,{hideLikeCount:action.value});return 'hideLikes'}
   if(action.action==='commentsOff'){tx.update(ref,{commentsOff:action.value});return 'commentsOff'}
   if(action.action==='pin'){
    const previous:Array<string>=Array.isArray(user.data()?.pinnedPostIds)?user.data()!.pinnedPostIds:[];
    const next=nextPinnedPosts(previous,id,action.value);
    if(!next)throw Error('PIN_LIMIT');
    tx.set(author,{pinnedPostIds:next},{merge:true});
    tx.update(ref,{pinned:action.value});
    return 'pin';
   }
   if(action.action==='edit'){
    const parsed=parseCaption(action.caption),older:Array<string>=Array.isArray(data.hashtags)?data.hashtags:[];
    tx.update(ref,{caption:action.caption,hashtags:parsed.hashtags,mentions:parsed.mentions,editedAt:FieldValue.serverTimestamp()});
    for(const {tag,delta} of hashtagDelta(older,parsed.hashtags)){
     tx.set(store.collection('hashtags').doc(tag),{tag,count:FieldValue.increment(delta),postCount:FieldValue.increment(delta),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    return 'edit';
   }
   if(action.action==='archive'){tx.update(ref,{archived:action.archived,updatedAt:FieldValue.serverTimestamp()});return 'archive'}
   if(action.action==='delete'){
    tx.update(ref,{deletedAt:FieldValue.serverTimestamp(),archived:true,pinned:false});
    const posts=Math.max(0,Number(user.data()?.counters?.posts||0)-1);
    const pins:Array<string>=Array.isArray(user.data()?.pinnedPostIds)?user.data()!.pinnedPostIds:[];
    tx.set(author,{counters:{posts},pinnedPostIds:pins.filter(x=>x!==id)},{merge:true});
    const oldTags:Array<string>=Array.isArray(data.hashtags)?data.hashtags:[];
    for(const tag of oldTags)tx.set(store.collection('hashtags').doc(tag),{count:FieldValue.increment(-1),postCount:FieldValue.increment(-1)},{merge:true});
    return 'delete';
   }
   return 'unknown';
  });
  if(result==='archive')resync=!(action.action==='archive'&&action.archived);
  if(result==='delete')resync=false;
  if(resync!==null){
   try{const fanout=await syncFeedItems(checked.user.uid,id,resync);fanoutError=fanout.truncated}
   catch{fanoutError=true}
  }
  return NextResponse.json({ok:true,action:result,fanoutPartial:fanoutError},{headers:safeHeaders});
 }catch(error){
  if(error instanceof Error&&error.message==='PIN_LIMIT')return errorResponse(409,'Pin limit reached');
  if(error instanceof Error&&error.message==='MISSING')return errorResponse(404,'Post unavailable');
  if(error instanceof Error&&error.message==='FORBIDDEN')return errorResponse(403,'Only the author can manage this post');
  return errorResponse(503,'Post update unavailable');
 }
}
