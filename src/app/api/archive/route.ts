import {NextRequest,NextResponse} from 'next/server';
import {Timestamp} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{
  const now=Date.now(),store=db(),snap=await store.collection('stories').where('authorUid','==',user.uid).orderBy('createdAt','desc').limit(100).get();
  const archive=snap.docs.filter(d=>{const end=d.data().expiresAt;const expiry=end instanceof Timestamp?end.toMillis():end?.toMillis?.()??0;return expiry<=now&&d.data().archived!==false});
  const mediaIds=archive.map(d=>d.data().mediaId).filter((x):x is string=>typeof x==='string');
  const media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})})),{viewerUid:user.uid});
  const mediaTypes=new Map(media.map(d=>[d.id,String(d.data()?.contentType||'image/jpeg')]));
  return NextResponse.json({items:archive.map(d=>({id:d.id,caption:String(d.data().caption??''),mediaUrl:urls[d.data().mediaId]?.url??null,contentType:mediaTypes.get(String(d.data().mediaId||''))||'image/jpeg',createdAt:d.data().createdAt?.toMillis?.()??0}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Story archive unavailable')}
}
