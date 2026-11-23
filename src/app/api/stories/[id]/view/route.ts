import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';
import {authorizedStory} from '@/lib/server/story-service';
import {safeHeaders,errorResponse} from '@/lib/server/session';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'story-view:{uid}',limit:180,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const {id}=await params,story=await authorizedStory(checked.user.uid,id,{allowHighlighted:true});
 if(!story)return errorResponse(404,'Story unavailable');
 try{
  const ref=story.doc.ref.collection('views').doc(checked.user.uid);
  const created=await story.doc.ref.firestore.runTransaction(async tx=>{
   const previous=await tx.get(ref);if(previous.exists)return false;
   tx.create(ref,{uid:checked.user.uid,createdAt:FieldValue.serverTimestamp()});return true;
  });
  return NextResponse.json({ok:true,firstView:created},{headers:safeHeaders});
 }catch{return errorResponse(503,'Could not record story view')}
}
