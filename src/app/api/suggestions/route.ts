import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {blockedEitherWayMany} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const viewer=await session(req);if(!viewer)return errorResponse(401,'Sign in required');
 try{
  const store=db(),[me,users,follows]=await Promise.all([store.collection('users').doc(viewer.uid).get(),store.collection('users').limit(100).get(),store.collection('follows').where('followerUid','==',viewer.uid).limit(200).get()]);
  const following=new Set(follows.docs.map(d=>String(d.data().followingUid||'')));
  const candidates=users.docs.filter(d=>d.id!==viewer.uid&&!d.data().deletedAt&&typeof d.data().handle==='string'&&!following.has(d.id));
  const blocked=await blockedEitherWayMany(viewer.uid,candidates.map(d=>d.id));
  const members=candidates.filter(d=>!blocked.has(d.id)).map(d=>({uid:d.id,handle:String(d.data().handle),name:String(d.data().name||''),branch:String(d.data().branch||''),avatarMediaId:d.data().avatarMediaId||null,private:d.data().privacy==='private'}));
  const activeFollows=follows.docs.filter(d=>d.data().status==='active').map(d=>String(d.data().followingUid||'')).filter(Boolean).slice(0,20);
  const shortlist=members.slice(0,12);
  const mutualRefs=shortlist.flatMap(m=>activeFollows.map(uid=>store.collection('follows').doc(uid+'_'+m.uid)));
  const mutualDocs:FirebaseFirestore.DocumentSnapshot[]=[];for(let i=0;i<mutualRefs.length;i+=100)mutualDocs.push(...await store.getAll(...mutualRefs.slice(i,i+100)));
  const mutuals=new Map(shortlist.map((m,i)=>[m.uid,mutualDocs.slice(i*activeFollows.length,(i+1)*activeFollows.length).filter(d=>d.data()?.status==='active').length]));
  const myBranch=String(me.data()?.branch||'');
  members.sort((a,b)=>Number(b.branch===myBranch)-Number(a.branch===myBranch)||a.handle.localeCompare(b.handle));
  return NextResponse.json({members:members.slice(0,12).map(m=>({...m,followStatus:'none',mutualCount:mutuals.get(m.uid)||0,reason:(mutuals.get(m.uid)||0)>0?'Followed by '+mutuals.get(m.uid)+' you follow':m.branch&&m.branch===myBranch?'Same branch':'Suggested for you',avatarUrl:m.avatarMediaId?'/api/media?id='+encodeURIComponent(m.avatarMediaId):null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Suggestions unavailable')}
}
