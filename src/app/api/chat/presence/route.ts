import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {mayShowActivity} from '@/lib/core/activity-visibility';
export const runtime='nodejs';
const idsSchema=z.string().min(1).max(4000).transform(value=>[...new Set(value.split(',').filter(Boolean))]).pipe(z.array(z.string().min(1).max(128)).max(40));
/** Authorization only. Stream owns the actual online state; never store or simulate it in Firestore. */
export async function GET(request:NextRequest){
 const auth=await session(request);if(!auth)return errorResponse(401,'Sign in required');
 const parsed=idsSchema.safeParse(request.nextUrl.searchParams.get('uids')||'');
 if(!parsed.success)return errorResponse(400,'Invalid member IDs');
 try{
  const store=db(),ids=parsed.data.filter(uid=>uid!==auth.uid);
  const refs=[store.collection('users').doc(auth.uid),...ids.flatMap(uid=>[
   store.collection('users').doc(uid),
   store.collection('blocks').doc(auth.uid+'_'+uid),
   store.collection('blocks').doc(uid+'_'+auth.uid)
  ])];
  const docs=await store.getAll(...refs),viewer=docs[0]?.data();
  if(!viewer||viewer.deletedAt)return errorResponse(403,'Account unavailable');
  const allowed:Record<string,boolean>={};
  ids.forEach((uid,index)=>{
   const [target,ab,ba]=docs.slice(1+index*3,4+index*3);
   allowed[uid]=mayShowActivity({
    viewerUid:auth.uid,targetUid:uid,
    viewerEnabled:viewer.settings?.activityStatus===true,
    targetEnabled:target?.data()?.settings?.activityStatus===true,
    blocked:Boolean(ab?.exists||ba?.exists),targetDeleted:!target?.exists||Boolean(target?.data()?.deletedAt)
   });
  });
  return NextResponse.json({allowed},{headers:safeHeaders});
 }catch{return errorResponse(503,'Activity visibility unavailable')}
}
