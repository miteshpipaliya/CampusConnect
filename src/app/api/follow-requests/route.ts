import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';
const schema=z.object({uid:z.string().min(8).max(128),action:z.enum(['accept','decline'])});
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{const store=db(),snap=await store.collection('follows').where('followingUid','==',user.uid).limit(100).get();
  const pending=snap.docs.filter(d=>d.data().status==='pending');
  const users=pending.length?await store.getAll(...pending.map(d=>store.collection('users').doc(String(d.data().followerUid)))):[];
  const requests=pending.flatMap((d,i)=>users[i]?.exists?[{uid:d.data().followerUid,handle:users[i]!.data()?.handle||'',name:users[i]!.data()?.name||''}]:[]);
  return NextResponse.json({requests},{headers:safeHeaders});
 }catch{return errorResponse(503,'Requests unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid request');
 const {uid,action}=parsed.data;
 if(uid===checked.user.uid)return errorResponse(400,'Invalid request');
 try{
  const store=db(),ref=store.collection('follows').doc(uid+'_'+checked.user.uid);
  if(await isBlockedEitherWay(uid,checked.user.uid))return errorResponse(403,'Unavailable');
  const changed=await store.runTransaction(async tx=>{const d=await tx.get(ref);if(!d.exists||d.data()?.status!=='pending')return false;
   if(action==='accept')tx.update(ref,{status:'active',updatedAt:FieldValue.serverTimestamp()});else tx.delete(ref);return true;
  });
  if(!changed)return errorResponse(404,'Request unavailable');
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Request update unavailable')}
}
