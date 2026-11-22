import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {clearSession,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({confirmHandle:z.string().min(3).max(30)});
export async function DELETE(req:NextRequest){
 const checked=await guard(req,{write:true,schema});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid confirmation');
 try{
  const store=db(),ref=store.collection('users').doc(checked.user.uid),profile=await ref.get();
  if(!profile.exists||String(profile.data()?.handle||'').toLowerCase()!==parsed.data.confirmHandle.toLowerCase())return errorResponse(400,'Type your exact username to confirm');
  await ref.update({deletedAt:FieldValue.serverTimestamp(),deletionRequestedAt:FieldValue.serverTimestamp(),privacy:'private',isPrivate:true});
  // Existing Firebase login remains valid for recovery; the application session denies deletedAt accounts.
  // Keep the Firebase identity enabled during the 30-day restoration window.
  const response=NextResponse.json({ok:true,softDeleted:true},{headers:safeHeaders});clearSession(response);return response;
 }catch{return errorResponse(503,'Account deletion unavailable')}
}
