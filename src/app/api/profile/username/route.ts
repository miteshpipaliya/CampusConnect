import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {syncStreamUser} from '@/lib/server/stream-user';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const handleSchema=z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._]{2,29}$/);
const schema=z.object({handle:handleSchema}).strict();
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const parsed=handleSchema.safeParse(request.nextUrl.searchParams.get('handle'));
 if(!parsed.success)return errorResponse(400,'Invalid username');
 try{
  const store=db(),[reserved,profile]=await Promise.all([store.collection('handles').doc(parsed.data).get(),store.collection('users').doc(user.uid).get()]);
  const available=!reserved.exists||reserved.data()?.uid===user.uid;
  return NextResponse.json({available,own:profile.data()?.handle===parsed.data},{headers:safeHeaders});
 }catch{return errorResponse(503,'Username check unavailable')}
}
export async function PATCH(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid username',rateLimit:{key:'username:{uid}',limit:5,windowSec:86400}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid username');
 const handle=parsed.data.handle;
 try{
  const store=db(),profile=store.collection('users').doc(checked.user.uid),reservation=store.collection('handles').doc(handle);
  const result=await store.runTransaction(async transaction=>{
   const user=await transaction.get(profile);if(!user.exists)throw Error('MISSING_PROFILE');
   const old=String(user.data()?.handle??'').toLowerCase();
   const now=Date.now();
   const history=Array.isArray(user.data()?.handleChangeTimes)?(user.data()?.handleChangeTimes as unknown[]).filter((value):value is number=>typeof value==='number'&&value>now-14*86400000):[];
   if(history.length>=2)throw Error('CHANGE_LIMIT');
   if(old===handle)return 'unchanged';
   const taken=await transaction.get(reservation);
   if(taken.exists&&taken.data()?.uid!==checked.user.uid)throw Error('TAKEN');
   const oldRef=old?store.collection('handles').doc(old):null;
   const oldSnap=oldRef?await transaction.get(oldRef):null;
   if(taken.exists)transaction.set(reservation,{uid:checked.user.uid,changedAt:FieldValue.serverTimestamp()},{merge:true});
   else transaction.create(reservation,{uid:checked.user.uid,changedAt:FieldValue.serverTimestamp()});
   transaction.update(profile,{handle,handleLower:handle,handleChangeTimes:[...history,now],updatedAt:FieldValue.serverTimestamp()});
   if(oldRef&&oldSnap?.exists&&oldSnap.data()?.uid===checked.user.uid)transaction.delete(oldRef)
   return 'updated';
  });
  const sync=await syncStreamUser(checked.user.uid).catch(()=>({synced:false}));
  return NextResponse.json({ok:true,result,handle,streamSynced:sync.synced},{headers:safeHeaders});
 }catch(error){if(error instanceof Error&&error.message==='TAKEN')return errorResponse(409,'Username is already taken');if(error instanceof Error&&error.message==='CHANGE_LIMIT')return errorResponse(429,'You can change your username twice every 14 days');return errorResponse(503,'Unable to update username')}
}
