import {readLimit} from '@/lib/server/read-limit';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const limited=await readLimit(user.uid,'connections',60);if(limited)return limited;
 const handle=req.nextUrl.searchParams.get('handle')?.toLowerCase()||'';
 const type=req.nextUrl.searchParams.get('type')==='following'?'following':'followers';
 try{
  const store=db(),h=await store.collection('handles').doc(handle).get(),target=handle?h.data()?.uid:user.uid;
  if(typeof target!=='string')return errorResponse(404,'Profile unavailable');
  if(await isBlockedEitherWay(user.uid,target))return errorResponse(404,'Profile unavailable');
  const profile=await store.collection('users').doc(target).get();
  if(!profile.exists||profile.data()?.deletedAt)return errorResponse(404,'Profile unavailable');
  if(target!==user.uid&&(profile.data()?.privacy==='private'||profile.data()?.isPrivate===true)){
   const rel=await store.collection('follows').doc(user.uid+'_'+target).get();
   if(rel.data()?.status!=='active')return errorResponse(403,'Private account');
  }
  const field=type==='followers'?'followingUid':'followerUid';
  const snap=await store.collection('follows').where(field,'==',target).limit(150).get();
  const active=snap.docs.filter(d=>d.data().status==='active');
  const other=type==='followers'?'followerUid':'followingUid';
  const users=active.length?await store.getAll(...active.map(d=>store.collection('users').doc(String(d.data()[other])))):[];
  const allowed=await Promise.all(users.map(d=>d.exists&&!d.data()?.deletedAt?isBlockedEitherWay(user.uid,d.id).then(blocked=>!blocked):Promise.resolve(false)));
  return NextResponse.json({items:users.filter((d,i)=>allowed[i]).map(d=>({uid:d.id,handle:d.data()?.handle||'',name:d.data()?.name||''}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Connections unavailable')}
}
