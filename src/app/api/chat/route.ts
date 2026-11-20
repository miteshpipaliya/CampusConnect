import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,sameOrigin,errorResponse,safeHeaders} from '@/lib/server/session';
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
 const url='https://chat.stream-io-api.com'+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(key);
 const response=await fetch(url,{method,headers:{'Content-Type':'application/json','Authorization':jwt(secret,{server:true}),'stream-auth-type':'jwt'},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){console.error('Stream chat request rejected',{status:response.status,code:body?.code});throw Error('Stream service rejected request')}
 return body;
}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),recipientHandle:z.string().min(3).max(30),text:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('read'),recipientHandle:z.string().min(3).max(30)}),
 z.object({action:z.literal('typing'),recipientHandle:z.string().min(3).max(30),typing:z.boolean()})
]);
async function peer(handle:string){const snap=await db().collection('users').where('handle','==',handle.toLowerCase()).limit(1).get();return snap.docs[0]??null}
function channelId(a:string,b:string){return createHmac('sha256',config().secret).update([a,b].sort().join(':')).digest('hex').slice(0,40)}
async function ensureChannel(uid:string,otherUid:string,handle:string,otherName:string){
 const own=await db().collection('users').doc(uid).get();
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
  if(!handle){const s=await db().collection('users').limit(100).get();return NextResponse.json({members:s.docs.filter(d=>d.id!==user.uid).map(d=>({handle:d.data().handle,name:d.data().name})).filter(x=>x.handle)},{headers:safeHeaders})}
  const other=await peer(handle);if(!other||other.id===user.uid)return errorResponse(404,'Member unavailable');
  const {id,result}=await ensureChannel(user.uid,other.id,handle,other.data().name);
  const messages=(result.messages||[]).map((m:{id:string;text?:string;user?:{id:string};created_at?:string})=>({id:m.id,text:m.text||'',senderUid:m.user?.id||'',createdAt:m.created_at||null,seen:Boolean((result.read||[]).find((x:{user?:{id:string};last_read?:string})=>x.user?.id===other.id&&x.last_read&&m.created_at&&x.last_read>=m.created_at))}));
  const users=await stream('/users/query','POST',{filter_conditions:{id:{$in:[other.id]}},limit:1});
  const remote=(users.users||[])[0]||{};
  const peerTyping=remote.typingIn===id&&typeof remote.typingAt==='number'&&Date.now()-remote.typingAt<6500;
  return NextResponse.json({messages,peerTyping,myUid:user.uid},{headers:safeHeaders});
 }catch{return errorResponse(503,'Stream chat unavailable. Check Stream credentials and service logs.')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse(400,'Invalid chat request');
 try{
  const input=parsed.data,other=await peer(input.recipientHandle);
  if(!other||other.id===user.uid)return errorResponse(404,'Member unavailable');
  const {id}=await ensureChannel(user.uid,other.id,input.recipientHandle,other.data().name);
  const path='/channels/messaging/'+id;
  if(input.action==='typing'){
   await stream('/users','POST',{users:{[user.uid]:{id:user.uid,typingIn:input.typing?id:'',typingAt:input.typing?Date.now():0}}});
   await stream(path+'/event','POST',{event:{type:input.typing?'typing.start':'typing.stop',user_id:user.uid}});
  }else if(input.action==='read'){
   await stream(path+'/read','POST',{user_id:user.uid});
  }else{
   await stream(path+'/message','POST',{message:{text:input.text,user_id:user.uid}});
  }
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Stream chat operation failed')}
}
