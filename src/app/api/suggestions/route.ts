import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const viewer=await session(req);if(!viewer)return errorResponse(401,'Sign in required');
 try{
  const store=db(),[me,users,follows]=await Promise.all([store.collection('users').doc(viewer.uid).get(),store.collection('users').limit(100).get(),store.collection('follows').where('followerUid','==',viewer.uid).limit(200).get()]);
  const following=new Set(follows.docs.map(d=>String(d.data().followingUid||'')));
  const candidates=users.docs.filter(d=>d.id!==viewer.uid&&!d.data().deletedAt&&typeof d.data().handle==='string'&&!following.has(d.id));
  const permitted=await Promise.all(candidates.map(d=>isBlockedEitherWay(viewer.uid,d.id).then(blocked=>!blocked)));
  const members=candidates.filter((d,i)=>permitted[i]).map(d=>({uid:d.id,handle:String(d.data().handle),name:String(d.data().name||''),branch:String(d.data().branch||''),avatarMediaId:d.data().avatarMediaId||null,private:d.data().privacy==='private'}));
  const myBranch=String(me.data()?.branch||'');
  members.sort((a,b)=>Number(b.branch===myBranch)-Number(a.branch===myBranch)||a.handle.localeCompare(b.handle));
  return NextResponse.json({members:members.slice(0,20)},{headers:safeHeaders});
 }catch{return errorResponse(503,'Suggestions unavailable')}
}
