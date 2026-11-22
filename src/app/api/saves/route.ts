import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewAuthor} from '@/lib/server/privacy';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
const schema=z.object({postId:z.string().min(10).max(100)}).strict();
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{
  const store=db(),list=await store.collection('users').doc(user.uid).collection('saves').orderBy('createdAt','desc').limit(50).get();
  const snap=list.docs.length?await store.getAll(...list.docs.map(d=>store.collection('posts').doc(d.id))):[];
  const allowed=await Promise.all(snap.map(doc=>doc.exists?canViewAuthor(user.uid,String(doc.data()?.authorUid??'')):Promise.resolve(false)));
  const visible=snap.filter((doc,i)=>doc.exists&&allowed[i]&&!doc.data()?.deletedAt);
  const mediaRefs=visible.map(d=>d.data()?.mediaId).filter((id):id is string=>typeof id==='string');
  const media=mediaRefs.length?await store.getAll(...mediaRefs.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})})),{viewerUid:user.uid});
  return NextResponse.json({items:visible.map(d=>({id:d.id,caption:d.data()?.caption??'',handle:d.data()?.authorHandle??'',mediaUrl:urls[d.data()?.mediaId]?.url??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Saved posts unavailable')}
}
async function update(req:NextRequest,remove:boolean){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'saves:{uid}',limit:80,windowSec:3600}});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid post');
 const store=db(),post=store.collection('posts').doc(parsed.data.postId),save=store.collection('users').doc(checked.user.uid).collection('saves').doc(parsed.data.postId);
 try{
  const existing=await post.get();
  if(!existing.exists||existing.data()?.deletedAt||!(await canViewAuthor(checked.user.uid,String(existing.data()?.authorUid??''))))return errorResponse(404,'Post unavailable');
  const saved=await store.runTransaction(async t=>{
   const [p,s]=await Promise.all([t.get(post),t.get(save)]);if(!p.exists)throw Error('MISSING');
   if(remove&&s.exists){t.delete(save);t.update(post,{'counters.saves':FieldValue.increment(-1)});return false}
   if(!remove&&!s.exists){t.create(save,{postId:post.id,createdAt:FieldValue.serverTimestamp()});t.update(post,{'counters.saves':FieldValue.increment(1)});return true}
   return s.exists;
  });
  return NextResponse.json({saved},{headers:safeHeaders});
 }catch{return errorResponse(503,'Save operation unavailable')}
}
export async function POST(req:NextRequest){return update(req,false)}
export async function DELETE(req:NextRequest){return update(req,true)}
