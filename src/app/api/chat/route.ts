import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {syncStreamUser} from '@/lib/server/stream-user';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';

/** Stream owns chat messages, receipts, and typing metadata. Firestore is used only to resolve campus identities. */
function config(){
 const key=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!key||!secret)throw Error('Stream chat is not configured');
 return {key,secret};
}
function jwt(secret:string,claims:object){
 const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode(claims);
 return unsigned+'.'+createHmac('sha256',secret).update(unsigned).digest('base64url');
}
async function stream(path:string,method='POST',data?:object){
 const {key,secret}=config();
 const base=path==='/users'||path.startsWith('/users/')?'/api/v2':'/api/v2/chat';
 const url=new URL('https://chat.stream-io-api.com'+base+path);
 url.searchParams.set('api_key',key);
 const response=await fetch(url.toString(),{method,headers:{'Content-Type':'application/json','Authorization':jwt(secret,{server:true}),'stream-auth-type':'jwt'},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){console.error('Stream chat request rejected',{path:path.split('?')[0],status:response.status,code:body?.code,message:String(body?.message||'').slice(0,180)});throw Error('Stream service rejected request')}
 return body;
}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),recipientHandle:z.string().min(3).max(30),text:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('read'),recipientHandle:z.string().min(3).max(30)}),
 z.object({action:z.literal('typing'),recipientHandle:z.string().min(3).max(30),typing:z.boolean()}),
 z.object({action:z.literal('deleteForMe'),recipientHandle:z.string().min(3).max(30),messageId:z.string().min(1).max(200)}),
 z.object({action:z.literal('unsend'),recipientHandle:z.string().min(3).max(30),messageId:z.string().min(1).max(200)})
]);
async function peer(handle:string){const snap=await db().collection('users').where('handle','==',handle.toLowerCase()).limit(1).get();return snap.docs[0]??null}
function channelId(a:string,b:string){return createHmac('sha256',config().secret).update([a,b].sort().join(':')).digest('hex').slice(0,40)}
async function ensureChannel(uid:string,otherUid:string,handle:string,otherName:string){
 const own=await db().collection('users').doc(uid).get();
 if(await isBlockedEitherWay(uid,otherUid))throw Error('CHAT_BLOCKED');
 const users:Record<string,object>={[uid]:{id:uid,name:own.data()?.name||own.data()?.handle||'Student'},[otherUid]:{id:otherUid,name:otherName||handle}};
 await stream('/users','POST',{users});
 const id=channelId(uid,otherUid);
 const result=await stream('/channels/messaging/'+id+'/query','POST',{data:{members:[uid,otherUid],created_by_id:uid},state:true,watch:false,messages:{limit:50}});
 return {id,result};
}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const handle=request.nextUrl.searchParams.get('with');
  if(request.nextUrl.searchParams.get('token')==='1'){const {key,secret}=config();await syncStreamUser(user.uid);return NextResponse.json({apiKey:key,userId:user.uid,token:jwt(secret,{user_id:user.uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})},{headers:safeHeaders})}
  if(!handle&&request.nextUrl.searchParams.get('directory')==='1'){const snapshot=await db().collection('users').limit(100).get();
   const allowed=await Promise.all(snapshot.docs.map(d=>isBlockedEitherWay(user.uid,d.id)));
   const visible=snapshot.docs.filter((d,i)=>d.id!==user.uid&&!allowed[i]&&!d.data().deletedAt);
   const avatars=await hydrateAvatars(visible.map(d=>d.id),user.uid);
   return NextResponse.json({members:visible.map(d=>({handle:d.data().handle,name:d.data().name,avatarMediaId:avatars[d.id]?.avatarMediaId??null,avatarUrl:avatars[d.id]?.avatarUrl??null})).filter(x=>x.handle)},{headers:safeHeaders})}
  if(!handle){
   // Only channels the signed-in member belongs to; do not expose the entire campus directory.
   const result=await stream('/channels','POST',{filter_conditions:{type:'messaging',members:{$in:[user.uid]}},sort:[{field:'last_message_at',direction:-1}],limit:30,state:true,watch:false});
   const channels=(result.channels||[]) as Array<{channel?:{id?:string;members?:Array<{user_id?:string;user?:{id?:string}}>};members?:Array<{user_id?:string;user?:{id?:string}}>;messages?:Array<{text?:string;created_at?:string}>}>;
   const peerIds=[...new Set(channels.flatMap(c=>(c.channel?.members||c.members||[]).map(m=>m.user_id||m.user?.id||'').filter(id=>id&&id!==user.uid)))];
   const profiles=await Promise.all(peerIds.map(async id=>{
    const [doc,blocked]=await Promise.all([db().collection('users').doc(id).get(),isBlockedEitherWay(user.uid,id)]);
    return {id,handle:blocked||doc.data()?.deletedAt?undefined:doc.data()?.handle as string|undefined,name:doc.data()?.name as string|undefined};
   }));
   const byId=new Map(profiles.map(p=>[p.id,p]));
   const avatars=await hydrateAvatars(profiles.map(p=>p.id),user.uid);
   const conversations=channels.flatMap(c=>{const id=(c.channel?.members||c.members||[]).map(m=>m.user_id||m.user?.id||'').find(id=>id&&id!==user.uid);const profile=id?byId.get(id):null;if(!profile?.handle)return [];return [{handle:profile.handle,name:profile.name||profile.handle,preview:c.messages?.at(-1)?.text||'',updatedAt:c.messages?.at(-1)?.created_at||'',avatarMediaId:avatars[id!]?.avatarMediaId??null,avatarUrl:avatars[id!]?.avatarUrl??null}]});
   return NextResponse.json({conversations},{headers:safeHeaders});
  }
  const other=await peer(handle);if(!other||other.id===user.uid||other.data().deletedAt||await isBlockedEitherWay(user.uid,other.id))return errorResponse(404,'Member unavailable');
  const {result}=await ensureChannel(user.uid,other.id,handle,other.data().name);
  const hidden=await db().collection('users').doc(user.uid).collection('hiddenChatMessages').where('channelId','==',channelId(user.uid,other.id)).limit(500).get();
  const hiddenIds=new Set(hidden.docs.map(d=>d.id));
  const messages=(result.messages||[]).filter((m:{id:string;type?:string})=>!hiddenIds.has(m.id)&&m.type!=='deleted').map((m:{id:string;text?:string;user?:{id:string};created_at?:string})=>({id:m.id,text:m.text||'',senderUid:m.user?.id||'',createdAt:m.created_at||null,seen:Boolean((result.read||[]).find((x:{user?:{id:string};last_read?:string})=>x.user?.id===other.id&&x.last_read&&m.created_at&&x.last_read>=m.created_at))}));
  // Typing state is delivered by Stream's realtime events, not a users/query lookup.
  // Avoid rejecting the entire message history when optional presence metadata is unavailable.
  const peerTyping=false;
  return NextResponse.json({messages,peerTyping,myUid:user.uid},{headers:safeHeaders});
 }catch(error){console.error('CampusConnect chat GET failed',{operation:request.nextUrl.searchParams.has('with')?'conversation':'inbox',error:error instanceof Error?error.message:'unknown'});return errorResponse(503,'Stream chat unavailable. Check Stream credentials and service logs.')}
}
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid chat request'});if(!checked.ok)return checked.response;
 const user=checked.user;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid chat request');
 try{
  const input=parsed.data,other=await peer(input.recipientHandle);
  if(!other||other.id===user.uid)return errorResponse(404,'Member unavailable');
  const {id,result}=await ensureChannel(user.uid,other.id,input.recipientHandle,other.data().name);
  const path='/channels/messaging/'+id;
  if(input.action==='deleteForMe'||input.action==='unsend'){
   const message=(result.messages||[]).find((m:{id:string})=>m.id===input.messageId);
   if(!message)return errorResponse(404,'Message not found in conversation');
   if(input.action==='unsend'){
    if((message.user?.id||message.user_id)!==user.uid)return errorResponse(403,'You can only unsend your own messages');
    await stream('/messages/'+encodeURIComponent(input.messageId),'DELETE');
   }else{
    await db().collection('users').doc(user.uid).collection('hiddenChatMessages').doc(input.messageId).set({channelId:id,hiddenAt:new Date().toISOString()});
   }
  }else if(input.action==='typing'){
   await stream('/users','POST',{users:{[user.uid]:{id:user.uid,typingIn:input.typing?id:'',typingAt:input.typing?Date.now():0}}});
   await stream(path+'/event','POST',{event:{type:input.typing?'typing.start':'typing.stop',user_id:user.uid}});
  }else if(input.action==='read'){
   await stream(path+'/read','POST',{user_id:user.uid});
  }else{
   await stream(path+'/message','POST',{message:{text:input.text,user_id:user.uid}});
  }
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch(error){console.error('CampusConnect chat POST failed',{error:error instanceof Error?error.message:'unknown'});return errorResponse(503,'Stream chat operation failed')}
}
