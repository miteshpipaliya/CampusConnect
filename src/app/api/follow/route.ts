import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';
const schema=z.object({handle:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._]{2,29}$/)});
async function targetUid(handle:string){const d=await db().collection('handles').doc(handle).get();return d.exists&&typeof d.data()?.uid==='string'?String(d.data()?.uid):null}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const handle=request.nextUrl.searchParams.get('handle')?.trim().toLowerCase()||'';
 if(!schema.safeParse({handle}).success)return errorResponse(400,'Invalid handle');
 try{
  const target=await targetUid(handle);if(!target)return errorResponse(404,'Profile unavailable');
  if(await isBlockedEitherWay(user.uid,target))return errorResponse(404,'Profile unavailable');
  const store=db(),[profile,follow]=await Promise.all([store.collection('users').doc(target).get(),store.collection('follows').doc(user.uid+'_'+target).get()]);
  if(!profile.exists||profile.data()?.deletedAt)return errorResponse(404,'Profile unavailable');
  return NextResponse.json({self:target===user.uid,status:follow.data()?.status||'none',private:profile.data()?.privacy==='private'||profile.data()?.isPrivate===true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Follow status unavailable')}
}
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,rateLimit:{key:'follow:{uid}',limit:60,windowSec:3600}});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid handle');
 try{
  const target=await targetUid(parsed.data.handle);if(!target||target===checked.user.uid)return errorResponse(400,'Invalid account');
  if(await isBlockedEitherWay(checked.user.uid,target))return errorResponse(403,'Unavailable');
  const store=db(),ref=store.collection('follows').doc(checked.user.uid+'_'+target),targetRef=store.collection('users').doc(target);
  const status=await store.runTransaction(async tx=>{
   const [profile,existing]=await Promise.all([tx.get(targetRef),tx.get(ref)]);
   if(!profile.exists||profile.data()?.deletedAt)throw Error('TARGET_MISSING');
   const current=existing.data()?.status;
   if(current==='active'||current==='pending')return current as 'active'|'pending';
   const next=profile.data()?.privacy==='private'||profile.data()?.isPrivate===true?'pending':'active';
   tx.set(ref,{followerUid:checked.user.uid,followingUid:target,status:next,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
   return next;
  });
  return NextResponse.json({ok:true,status},{headers:safeHeaders});
 }catch{return errorResponse(503,'Follow unavailable')}
}
export async function DELETE(request:NextRequest){
 const checked=await guard(request,{write:true,schema});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid handle');
 try{const target=await targetUid(parsed.data.handle);if(!target)return errorResponse(404,'Profile unavailable');await db().collection('follows').doc(checked.user.uid+'_'+target).delete();return NextResponse.json({ok:true,status:'none'},{headers:safeHeaders})}catch{return errorResponse(503,'Unfollow unavailable')}
}
