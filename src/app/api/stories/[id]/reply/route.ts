import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {guard} from '@/lib/server/guard';
import {authorizedStory} from '@/lib/server/story-service';
import {sendStoryDM} from '@/lib/server/story-reply';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({text:z.string().trim().min(1).max(1000)});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'story-reply:{uid}',limit:30,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params,story=await authorizedStory(checked.user.uid,id);
 if(!story)return errorResponse(404,'Story unavailable');
 if(story.owned)return errorResponse(400,'Cannot reply to your own story');
 try{
  const store=db(),owner=await store.collection('users').doc(story.authorUid).get();
  const preference=String(owner.data()?.settings?.storyReplies||'everyone');
  if(preference==='off')return errorResponse(403,'Story replies disabled');
  if(preference==='following'){
   const relation=await store.collection('follows').doc(story.authorUid+'_'+checked.user.uid).get();
   if(relation.data()?.status!=='active')return errorResponse(403,'Story reply restricted');
  }
  const idSent=await sendStoryDM(checked.user.uid,story.authorUid,id,schema.parse(checked.input).text);
  return NextResponse.json({ok:true,messageId:idSent},{headers:safeHeaders});
 }catch{return errorResponse(503,'Story reply unavailable')}
}
