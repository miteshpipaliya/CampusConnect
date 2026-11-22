import {FieldValue} from 'firebase-admin/firestore';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
export const runtime='nodejs';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,rateLimit:{key:'likes:{uid}',...RATE_LIMITS.likes}});
 if(!checked.ok)return checked.response;
 const user=checked.user,{id}=await params;
 try{const store=db(),post=store.collection('posts').doc(id),like=post.collection('likes').doc(user.uid);
  const liked=await store.runTransaction(async t=>{const p=await t.get(post);
   if(!p.exists||!(p.data()?.visibility==='campus'||p.data()?.authorUid===user.uid))throw Error('NOT_FOUND');
   const old=await t.get(like);
   if(old.exists)t.delete(like);else t.create(like,{uid:user.uid,createdAt:new Date()});
   const count=Number(p.data()?.counters?.likes);
   const current=Number.isFinite(count)?Math.max(0,Math.floor(count)):null;
   if(current===null){const tally=await post.collection('likes').count().get();t.set(post,{counters:{likes:Math.max(0,tally.data().count+(old.exists?-1:1))}},{merge:true})}
   else t.update(post,{'counters.likes':Math.max(0,current+(old.exists?-1:1))});
   return !old.exists;
  });
  if(liked){const [owner,actor]=await Promise.all([post.get(),store.collection('users').doc(user.uid).get()]);const uid=owner.data()?.authorUid;if(uid&&uid!==user.uid)await store.collection('users').doc(uid).collection('notifications').add({type:'like',actorUid:user.uid,actorHandle:actor.data()?.handle??'Member',postId:id,createdAt:FieldValue.serverTimestamp()});}
  return NextResponse.json({liked},{headers:safeHeaders});
 }catch{return errorResponse(404,'Post unavailable')}
}
