import 'server-only';
import {createHmac} from 'node:crypto';
import {db} from './services';
import {presignGet} from './storage';
/** Stream users receive a signed R2 avatar URL; token creation refreshes expiring URLs. */
export async function syncStreamUser(uid:string):Promise<{synced:boolean;user:{id:string;name:string;username:string;image:string}}>{
 const apiKey=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!apiKey||!secret)return {synced:false,user:{id:uid,name:'Student',username:'',image:''}};
 const snap=await db().collection('users').doc(uid).get();
 if(!snap.exists||snap.data()?.deletedAt)return {synced:false,user:{id:uid,name:'Student',username:'',image:''}};
 const d=snap.data()!,name=String(d.name||d.handle||'Student');
 const user={id:uid,name,username:String(d.handle||''),image:''};
 if(typeof d.avatarMediaId==='string'){
  const media=await db().collection('media').doc(d.avatarMediaId).get();
  if(media.exists&&media.data()?.status==='uploaded'&&media.data()?.ownerUid===uid&&typeof media.data()?.key==='string'){
   user.image=await presignGet(media.data()!.key,3600*12);
  }
 }
 const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode({server:true});
 const jwt=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
 const endpoint=new URL('https://chat.stream-io-api.com/api/v2/chat/users');
 endpoint.searchParams.set('api_key',apiKey);
 const response=await fetch(endpoint.toString(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:jwt,'stream-auth-type':'jwt'},body:JSON.stringify({users:{[uid]:user}}),cache:'no-store'});
 if(!response.ok){console.error('Stream sync rejected',{status:response.status});return {synced:false,user}}
 return {synced:true,user};
}

/** Mirror Firestore block mutations into Stream's native user block list.
 * Stream's default block behavior is one-way; configure two-way blocking on the Stream app.
 */
export async function syncStreamBlock(ownerUid:string,targetUid:string,remove:boolean):Promise<boolean>{
 const apiKey=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!apiKey||!secret)return false;
 const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode({server:true});
 const jwt=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
 const url=new URL('https://chat.stream-io-api.com/api/v2/chat/users/'+(remove?'unblock':'block'));
 url.searchParams.set('api_key',apiKey);
 const response=await fetch(url.toString(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:jwt,'stream-auth-type':'jwt'},body:JSON.stringify({user_id:ownerUid,blocked_user_id:targetUid}),cache:'no-store'});
 if(!response.ok){console.error('Stream user block synchronization rejected',{status:response.status,remove});return false}
 return true;
}

/** Delete Stream data as a confirmed async task; never drop the local audit record
 * until Stream reports completion. A missing configuration pauses purging.
 */
export async function streamDeletionStep(uid:string,existingTaskId?:string):Promise<{complete:boolean;taskId:string|null}>{
 const apiKey=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!apiKey||!secret)throw Error('STREAM_DELETE_UNCONFIGURED');
 const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode({server:true});
 const jwt=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
 const url=new URL(existingTaskId?
  'https://chat.stream-io-api.com/api/v2/tasks/'+encodeURIComponent(existingTaskId):
  'https://chat.stream-io-api.com/api/v2/chat/users/delete');
 url.searchParams.set('api_key',apiKey);
 const response=await fetch(url.toString(),{
  method:existingTaskId?'GET':'POST',
  headers:{'Content-Type':'application/json',Authorization:jwt,'stream-auth-type':'jwt'},
  ...(!existingTaskId?{body:JSON.stringify({user_ids:[uid],user:'hard',messages:'hard',conversations:'hard'})}:{}),
  cache:'no-store'
 });
 if(!response.ok)throw Error('STREAM_DELETE_REJECTED_'+response.status);
 const data=await response.json() as {task_id?:string;status?:string;task?:{status?:string}};
 if(existingTaskId){
  const status=data.status??data.task?.status;
  if(status==='failed')throw Error('STREAM_DELETE_FAILED');
  return {complete:status==='completed',taskId:existingTaskId};
 }
 if(typeof data.task_id!=='string'||!data.task_id)throw Error('STREAM_DELETE_TASK_MISSING');
 return {complete:false,taskId:data.task_id};
}
