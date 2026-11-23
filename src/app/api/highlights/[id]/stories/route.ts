import {NextRequest,NextResponse} from 'next/server';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {db} from '@/lib/server/services';
import {canViewAuthor} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid highlight');
 try{
  const store=db(),highlight=await store.collection('highlights').doc(id).get();
  if(!highlight.exists)return errorResponse(404,'Highlight unavailable');
  const ownerUid=String(highlight.data()?.ownerUid||'');
  if(!ownerUid||!(await canViewAuthor(user.uid,ownerUid)))return errorResponse(404,'Highlight unavailable');
  const ids:Array<string>=Array.isArray(highlight.data()?.storyIds)?highlight.data()!.storyIds:[];
  const docs=ids.length?await store.getAll(...ids.slice(0,50).map(key=>store.collection('stories').doc(key))):[];
  let close=false;
  if(ownerUid!==user.uid){
   close=(await store.collection('closeFriends').doc(ownerUid+'_'+user.uid).get()).exists;
  }
  const visible=docs.filter(d=>d.exists&&d.data()?.authorUid===ownerUid&&(ownerUid===user.uid||d.data()?.audience!=='close'||close));
  if(!visible.length)return errorResponse(404,'Highlight unavailable');
  const avatars=await hydrateAvatars([ownerUid],user.uid);
  const mediaIds=[...new Set(visible.map(d=>String(d.data()?.mediaId||'')).filter(Boolean))];
  const media=mediaIds.length?await store.getAll(...mediaIds.map(mid=>store.collection('media').doc(mid))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()||{})})),{viewerUid:user.uid});
  const group={handle:avatars[ownerUid]?.handle||'',name:avatars[ownerUid]?.name||'Student',avatarUrl:avatars[ownerUid]?.avatarUrl??null,isMine:ownerUid===user.uid,
   stories:visible.map(d=>{const x=d.data()!,mid=String(x.mediaId||'');return {id:d.id,mediaUrl:urls[mid]?.url??null,contentType:String(x.contentType||'image/jpeg'),caption:String(x.caption||''),createdAt:x.createdAt?.toMillis?.()??0,expiresAt:x.expiresAt?.toMillis?.()??0,isMine:ownerUid===user.uid,highlight:true,overlay:x.overlay||null,poll:x.poll||null}})};
  return NextResponse.json({groups:[group],title:String(highlight.data()?.title||'Highlight')},{headers:safeHeaders});
 }catch{return errorResponse(503,'Highlight unavailable')}
}
