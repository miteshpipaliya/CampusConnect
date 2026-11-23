import {notify} from '@/lib/server/notify';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {canViewAuthor} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,rateLimit:{key:'likes:{uid}',...RATE_LIMITS.likes}});
 if(!checked.ok)return checked.response;
 const user=checked.user,{id}=await params;
 try{const store=db(),post=store.collection('posts').doc(id),like=post.collection('likes').doc(user.uid);
  const source=await post.get();
  if(!source.exists||source.data()?.deletedAt||!(await canViewAuthor(user.uid,String(source.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  const liked=await store.runTransaction(async t=>{const p=await t.get(post);
   if(!p.exists||p.data()?.deletedAt)throw Error('NOT_FOUND');
   const old=await t.get(like);
   if(old.exists)t.delete(like);else t.create(like,{uid:user.uid,createdAt:new Date()});
   const count=Number(p.data()?.counters?.likes);
   const current=Number.isFinite(count)?Math.max(0,Math.floor(count)):null;
   if(current===null){const tally=await post.collection('likes').count().get();t.set(post,{counters:{likes:Math.max(0,tally.data().count+(old.exists?-1:1))}},{merge:true})}
   else t.update(post,{'counters.likes':Math.max(0,current+(old.exists?-1:1))});
   return !old.exists;
  });
  if(liked){const uid=String(source.data()?.authorUid||'');if(uid)await notify({recipientUid:uid,actorUid:user.uid,type:'like',postId:id}).catch(()=>{})}
  return NextResponse.json({liked},{headers:safeHeaders});
 }catch{return errorResponse(404,'Post unavailable')}
}
