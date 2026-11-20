import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,sameOrigin,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({postId:z.string().min(10).max(100)});
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const input=schema.safeParse(await request.json().catch(()=>null));if(!input.success)return errorResponse(400,'Invalid post');
 try{const store=db(),original=await store.collection('posts').doc(input.data.postId).get();
  if(!original.exists||original.data()?.visibility!=='campus')return errorResponse(404,'Post unavailable');
  const id=user.uid+'_'+input.data.postId,ref=store.collection('reposts').doc(id),existing=await ref.get();
  if(existing.exists){await ref.delete();return NextResponse.json({reposted:false},{headers:safeHeaders})}
  await ref.create({ownerUid:user.uid,postId:input.data.postId,createdAt:FieldValue.serverTimestamp()});
  return NextResponse.json({reposted:true},{status:201,headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to update repost')}
}
