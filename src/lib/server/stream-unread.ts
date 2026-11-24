import 'server-only';import {unreadForMember} from '../core/chat-activity';import {createHmac} from 'node:crypto';
export async function getStreamUnread(uid:string):Promise<number|null>{
 const key=process.env.STREAM_API_KEY,secret=process.env.STREAM_API_SECRET;
 if(!key||!secret)return null;
 const enc=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const part=enc({alg:'HS256',typ:'JWT'})+'.'+enc({server:true});
 const token=part+'.'+createHmac('sha256',secret).update(part).digest('base64url');
 try{
  const r=await fetch('https://chat.stream-io-api.com/api/v2/chat/channels?api_key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json',Authorization:token,'stream-auth-type':'jwt'},body:JSON.stringify({filter_conditions:{type:'messaging',members:{$in:[uid]}},sort:[{field:'last_message_at',direction:-1}],limit:100,state:true,watch:false}),cache:'no-store'});
  if(!r.ok)return null;
  const data=await r.json();return (Array.isArray(data.channels)?data.channels:[]).reduce((sum:number,ch:{read?:Array<{user?:{id?:string};unread_messages?:number}>;unread_count?:number})=>sum+Number(unreadForMember(ch.read,uid,ch.unread_count||0)>0),0);
 }catch{return null}
}
