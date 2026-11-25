import {readLimit} from '@/lib/server/read-limit';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const limited=await readLimit(user.uid,'activity',120);if(limited)return limited;
 try{
  const store=db();
  const [likes,reposts,comments]=await Promise.all([
   store.collectionGroup('likes').where('uid','==',user.uid).orderBy('createdAt','desc').limit(100).get(),
   store.collection('reposts').where('ownerUid','==',user.uid).orderBy('createdAt','desc').limit(100).get(),
   store.collectionGroup('comments').where('uid','==',user.uid).orderBy('createdAt','desc').limit(100).get()
  ]);
  const raw=[
   ...likes.docs.map(d=>({type:'like' as const,postId:d.ref.parent.parent?.id??'',commentId:null,text:'',createdAt:d.data().createdAt?.toMillis?.()??0})),
   ...reposts.docs.map(d=>({type:'repost' as const,postId:String(d.data().postId||''),commentId:null,text:'',createdAt:d.data().createdAt?.toMillis?.()??0})),
   ...comments.docs.map(d=>({type:'comment' as const,postId:d.ref.parent.parent?.id??'',commentId:d.id,text:String(d.data().text||''),createdAt:d.data().createdAt?.toMillis?.()??0}))
  ].sort((a,b)=>b.createdAt-a.createdAt).slice(0,100);
  const ids=[...new Set(raw.map(x=>x.postId).filter(Boolean))];
  const docs=ids.length?await store.getAll(...ids.map(id=>store.collection('posts').doc(id))):[];
  const visibility=await canViewMany(user.uid,docs.map(d=>String(d.data()?.authorUid??'')));
  const allowed=docs.map(d=>visibility.get(String(d.data()?.authorUid??''))??false);
  const accessible=new Set(docs.filter((d,i)=>d.exists&&allowed[i]&&!d.data()?.deletedAt&&!d.data()?.archived).map(d=>d.id));
  return NextResponse.json({items:raw.filter(x=>accessible.has(x.postId))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Activity unavailable; Firestore collection-group indexes may be required')}
}
