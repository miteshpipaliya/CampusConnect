import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {syncStreamUser} from '@/lib/server/stream-user';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {relationshipStatuses,relationshipVisibilities} from '@/lib/student-email';
export const runtime='nodejs';
const schema=z.object({
 name:z.string().trim().min(2).max(70),
 bio:z.string().trim().max(150),
 website:z.union([z.literal(''),z.string().trim().url().max(200).refine(value=>/^https:\/\//i.test(value))]),
 branch:z.string().trim().max(80),
 division:z.string().trim().max(30),
 relationshipStatus:z.union([z.literal(''),z.enum(relationshipStatuses)]),
 relationshipVisibility:z.enum(relationshipVisibilities),
 privacy:z.enum(['campus','private'])
}).strict();
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const doc=await db().collection('users').doc(user.uid).get();if(!doc.exists)return errorResponse(404,'Profile not found');
 const d=doc.data()!;
 return NextResponse.json({profile:{handle:d.handle,name:d.name??'',bio:d.bio??'',website:d.website??'',branch:d.branch??'',division:d.division??'',relationshipStatus:d.relationshipStatus??'',relationshipVisibility:d.relationshipVisibility??'me',privacy:d.privacy??'campus',avatarMediaId:d.avatarMediaId??null}},{headers:safeHeaders});
 }catch{return errorResponse(503,'Settings unavailable')}
}
export async function PATCH(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid profile settings',rateLimit:{key:'settings:{uid}',limit:20,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid profile settings');
 try{
  const ref=db().collection('users').doc(checked.user.uid);
  await ref.update({...parsed.data,updatedAt:FieldValue.serverTimestamp()});
  const result=await syncStreamUser(checked.user.uid).catch(()=>({synced:false}));
  return NextResponse.json({ok:true,streamSynced:result.synced},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to save profile settings')}
}
