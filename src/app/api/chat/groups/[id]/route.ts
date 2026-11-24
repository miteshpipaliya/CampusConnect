import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {groupStream,memberGroup} from '@/lib/server/campus-chat-groups';
import {validCampusGroupId,normaliseGroupName} from '@/lib/core/group-chat-rules';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),text:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('rename'),name:z.string().trim().min(1).max(60)}),
 z.object({action:z.literal('leave')})
]);
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;if(!validCampusGroupId(id))return errorResponse(400,'Invalid group');
 try{
  const group=await memberGroup(user.uid,id);if(!group)return errorResponse(404,'Group unavailable');
  const result=await groupStream('/channels/messaging/'+id+'/query',{state:true,watch:false,messages:{limit:50}});
  const messages=Array.isArray(result.messages)?result.messages:[];
  return NextResponse.json({group,messages,myUid:user.uid},{headers:safeHeaders});
 }catch{return errorResponse(503,'Group messages unavailable')}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'chat-group-write:{uid}',limit:120,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const {id}=await params;if(!validCampusGroupId(id))return errorResponse(400,'Invalid group');
 const input=schema.parse(checked.input);
 try{
  const group=await memberGroup(checked.user.uid,id);if(!group)return errorResponse(404,'Group unavailable');
  if(input.action==='rename'){
   if(group.ownerUid!==checked.user.uid)return errorResponse(403,'Only the group creator can rename it');
   const name=normaliseGroupName(input.name);if(!name)return errorResponse(400,'Invalid group name');
   await groupStream('/channels/messaging/'+id,{set:{name}},'PATCH');
   return NextResponse.json({ok:true,name},{headers:safeHeaders});
  }
  if(input.action==='leave'){
   await groupStream('/channels/messaging/'+id,{remove_members:[checked.user.uid]});
   return NextResponse.json({ok:true,left:true},{headers:safeHeaders});
  }
  const sent=await groupStream('/channels/messaging/'+id+'/message',{message:{user_id:checked.user.uid,text:input.text}});
  const message=sent.message&&typeof sent.message==='object'?sent.message:null;
  return NextResponse.json({ok:true,message},{headers:safeHeaders});
 }catch{return errorResponse(503,'Group action unavailable')}
}
