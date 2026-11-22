import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewAuthor} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid post');
 try{
  const store=db(),ref=store.collection('posts').doc(id),post=await ref.get();
  if(!post.exists||post.data()?.deletedAt||(post.data()?.archived&&post.data()?.authorUid!==user.uid))return errorResponse(404,'Post unavailable');
  const d=post.data()!,authorUid=String(d.authorUid||'');
  if(!(await canViewAuthor(user.uid,authorUid)))return errorResponse(404,'Post unavailable');
  const [liked,saved,avatars]=await Promise.all([
   ref.collection('likes').doc(user.uid).get(),
   store.collection('users').doc(user.uid).collection('saves').doc(id).get(),
   hydrateAvatars([authorUid],user.uid)
  ]);
  const mediaId=typeof d.mediaId==='string'?d.mediaId:null,media=mediaId?await store.collection('media').doc(mediaId).get():null;
  const allMedia=Array.isArray(d.media)?d.media as Array<{mediaId:string;alt?:string}>:[];
  const mediaDocs=allMedia.length?await store.getAll(...allMedia.map(m=>store.collection('media').doc(m.mediaId))):[];
  const mediaUrls=await mintUrls([...(media?.exists?[{id:media.id,...(media.data()??{})}]:[]),...mediaDocs.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})}))],{viewerUid:user.uid});
  return NextResponse.json({post:{
   id:post.id,authorUid,caption:String(d.caption||''),authorHandle:String(d.authorHandle||avatars[authorUid]?.handle||'student'),
   authorName:avatars[authorUid]?.name||'',avatarMediaId:avatars[authorUid]?.avatarMediaId??null,avatarUrl:avatars[authorUid]?.avatarUrl??null,
   mediaUrl:mediaId?mediaUrls[mediaId]?.url??null:null,media:allMedia.map(m=>({...m,url:mediaUrls[m.mediaId]?.url??null})),
   mediaContentType:media?.data()?.contentType??null,likes:Number(d.counters?.likes||0),comments:Number(d.counters?.comments||0),
   liked:liked.exists,saved:saved.exists
  }},{headers:safeHeaders});
 }catch{return errorResponse(503,'Post unavailable')}
}
