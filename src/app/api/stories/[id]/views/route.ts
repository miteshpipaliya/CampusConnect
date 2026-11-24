import {NextRequest,NextResponse} from 'next/server';
import {session,safeHeaders,errorResponse} from '@/lib/server/session';
import {authorizedStory} from '@/lib/server/story-service';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params,story=await authorizedStory(user.uid,id,{allowArchive:true});
 if(!story||!story.owned)return errorResponse(403,'Only the owner can see viewers');
 try{
  const ref=story.doc.ref.collection('views');
  const [snap,count,self]=await Promise.all([ref.orderBy('createdAt','desc').limit(100).get(),ref.count().get(),ref.doc(user.uid).get()]);
  const visible=snap.docs.filter(d=>d.id!==user.uid);
  const people=await hydrateAvatars(visible.map(d=>d.id),user.uid);
  return NextResponse.json({total:Math.max(0,count.data().count-Number(self.exists)),viewers:visible.map(d=>({uid:d.id,handle:people[d.id]?.handle||'',name:people[d.id]?.name||'Student',avatarUrl:people[d.id]?.avatarUrl??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Story viewers unavailable')}
}
