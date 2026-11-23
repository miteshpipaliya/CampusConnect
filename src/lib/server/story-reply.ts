import 'server-only';
import {createHmac} from 'node:crypto';
export async function sendStoryDM(sender:string,owner:string,storyId:string,text:string){
 const key=process.env.STREAM_API_KEY,secret=process.env.STREAM_API_SECRET;
 if(!key||!secret)throw Error('Stream is unavailable');
 const enc=(data:object)=>Buffer.from(JSON.stringify(data)).toString('base64url');
 const unsigned=enc({alg:'HS256',typ:'JWT'})+'.'+enc({server:true});
 const token=unsigned+'.'+createHmac('sha256',secret).update(unsigned).digest('base64url');
 const id=createHmac('sha256',secret).update([sender,owner].sort().join(':')).digest('hex').slice(0,40);
 const path='/channels/messaging/'+id;
 const post=async(route:string,data:object)=>{
  const response=await fetch('https://chat.stream-io-api.com/api/v2/chat'+route+'?api_key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json',Authorization:token,'stream-auth-type':'jwt'},body:JSON.stringify(data),cache:'no-store'});
  if(!response.ok)throw Error('Stream rejected story reply');
  return response.json() as Promise<{message?:{id?:string}}>;
 };
 await post(path+'/query',{data:{members:[sender,owner],created_by_id:sender},state:false,watch:false});
 const sent=await post(path+'/message',{message:{text,user_id:sender,campusStoryId:storyId,campusContentType:'story'}});
 if(!sent.message?.id)throw Error('Story delivery did not acknowledge');
 return sent.message.id;
}
