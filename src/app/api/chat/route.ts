import { NextRequest,NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db } from '@/lib/server/services';
import { session,sameOrigin,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
const body=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),recipientHandle:z.string().min(3).max(30),text:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('read'),recipientHandle:z.string().min(3).max(30)}),
 z.object({action:z.literal('typing'),recipientHandle:z.string().min(3).max(30),typing:z.boolean()})
]);
async function peer(handle:string){const s=await db().collection('users').where('handle','==',handle.toLowerCase()).limit(1).get();return s.docs[0]??null}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
 const handle=request.nextUrl.searchParams.get('with');
 if(!handle){const s=await db().collection('users').limit(100).get();return NextResponse.json({members:s.docs.filter(d=>d.id!==user.uid).map(d=>({handle:d.data().handle,name:d.data().name})).filter(x=>x.handle)},{headers:safeHeaders})}
 const other=await peer(handle);if(!other||other.id===user.uid)return errorResponse(404,'Member unavailable');
 const id=[user.uid,other.id].sort().join('_'),room=db().collection('chats').doc(id);
 const [snap,typing]=await Promise.all([room.collection('messages').orderBy('createdAt','desc').limit(50).get(),room.get()]);
 return NextResponse.json({messages:snap.docs.reverse().map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()??null})),peerTyping:Boolean(typing.data()?.typing?.[other.id]&&Date.now()-typing.data()!.typing[other.id]<6000),myUid:user.uid},{headers:safeHeaders});
 }catch{return errorResponse(503,'Chat unavailable')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const parsed=body.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse(400,'Invalid chat request');
 try{const input=parsed.data,other=await peer(input.recipientHandle);if(!other||other.id===user.uid)return errorResponse(404,'Member unavailable');
 const id=[user.uid,other.id].sort().join('_'),room=db().collection('chats').doc(id);
 if(input.action==='typing'){await room.set({participants:[user.uid,other.id],typing:{[user.uid]:input.typing?Date.now():0}},{merge:true});return NextResponse.json({ok:true},{headers:safeHeaders})}
 if(input.action==='read'){const snap=await room.collection('messages').orderBy('createdAt','desc').limit(50).get();const batch=db().batch();snap.docs.filter(d=>d.data().recipientUid===user.uid&&!d.data().seen).forEach(d=>batch.update(d.ref,{seen:true,seenAt:FieldValue.serverTimestamp()}));await batch.commit();return NextResponse.json({ok:true},{headers:safeHeaders})}
 await room.set({participants:[user.uid,other.id],updatedAt:FieldValue.serverTimestamp()},{merge:true});
 await room.collection('messages').add({senderUid:user.uid,recipientUid:other.id,text:input.text,seen:false,createdAt:FieldValue.serverTimestamp()});
 return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to send message')}
}
