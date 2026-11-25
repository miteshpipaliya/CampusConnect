import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';
import {db} from '@/lib/server/services';
import {syncStreamBlock} from '@/lib/server/stream-user';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({handle:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._]{2,29}$/)});
export async function GET(req:NextRequest){const u=await session(req);if(!u)return errorResponse(401,'Sign in required');try{const snap=await db().collection('blocks').where('ownerUid','==',u.uid).limit(100).get();return NextResponse.json({items:snap.docs.map(d=>({handle:d.data().handle}))},{headers:safeHeaders})}catch{return errorResponse(503,'Blocks unavailable')}}
async function change(req:NextRequest,remove:boolean){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'blocks:{uid}',limit:60,windowSec:3600}});if(!checked.ok)return checked.response;
 const input=schema.safeParse(checked.input);if(!input.success)return errorResponse(400,'Invalid handle');
 try{const store=db(),h=await store.collection('handles').doc(input.data.handle).get();if(!h.exists)return errorResponse(404,'User not found');const target=h.data()?.uid;if(typeof target!=='string'||target===checked.user.uid)return errorResponse(400,'Invalid user');
 const ref=store.collection('blocks').doc(checked.user.uid+'_'+target);
 if(remove)await ref.delete();
 else await store.runTransaction(async tx=>{
  const forward=store.collection('follows').doc(checked.user.uid+'_'+target);
  const reverse=store.collection('follows').doc(target+'_'+checked.user.uid);
  const [a,b]=await Promise.all([tx.get(forward),tx.get(reverse)]);
  tx.set(ref,{ownerUid:checked.user.uid,targetUid:target,handle:input.data.handle,createdAt:FieldValue.serverTimestamp()});
  if(a.exists)tx.delete(forward);
  if(b.exists)tx.delete(reverse);
 });
 const streamSynced=await syncStreamBlock(checked.user.uid,target,remove).catch(()=>false);
 return NextResponse.json({ok:true,streamSynced},{headers:safeHeaders})}catch{return errorResponse(503,'Block update unavailable')}
}
export async function POST(req:NextRequest){return change(req,false)}
export async function DELETE(req:NextRequest){return change(req,true)}
