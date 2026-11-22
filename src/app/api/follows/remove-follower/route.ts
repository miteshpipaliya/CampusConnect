import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {safeCounter} from '@/lib/core/social-rules';
export const runtime='nodejs';
const schema=z.object({uid:z.string().min(8).max(128)});
export async function DELETE(request:NextRequest){
 const checked=await guard(request,{write:true,schema,rateLimit:{key:'remove-follower:{uid}',limit:60,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success||parsed.data.uid===checked.user.uid)return errorResponse(400,'Invalid follower');
 try{
  const store=db(),followerUid=parsed.data.uid,ref=store.collection('follows').doc(followerUid+'_'+checked.user.uid);
  const meRef=store.collection('users').doc(checked.user.uid),otherRef=store.collection('users').doc(followerUid);
  const removed=await store.runTransaction(async tx=>{
   const [follow,me,other]=await Promise.all([tx.get(ref),tx.get(meRef),tx.get(otherRef)]);
   if(!follow.exists)return false;
   if(follow.data()?.status==='active'){
    tx.update(meRef,{'counters.followers':safeCounter(me.data()?.counters?.followers,-1)});
    if(other.exists)tx.update(otherRef,{'counters.following':safeCounter(other.data()?.counters?.following,-1)});
   }
   tx.delete(ref);return true;
  });
  return NextResponse.json({ok:true,removed},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to remove follower')}
}
