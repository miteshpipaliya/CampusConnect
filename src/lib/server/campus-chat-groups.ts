import 'server-only';
import {createHmac} from 'node:crypto';
import {validCampusGroupId} from '../core/group-chat-rules';
const endpoint='https://chat.stream-io-api.com/api/v2/chat';
export type StreamGroup={id:string;name:string;ownerUid:string;memberUids:string[];updatedAt:string};
function config(){const key=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();if(!key||!secret)throw Error('STREAM_GROUPS_UNCONFIGURED');return {key,secret}}
export async function groupStream(path:string,payload:object,method='POST'):Promise<Record<string,unknown>>{
 const {key,secret}=config();
 const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const base=encode({alg:'HS256',typ:'JWT'})+'.'+encode({server:true});
 const token=base+'.'+createHmac('sha256',secret).update(base).digest('base64url');
 const url=new URL(endpoint+path);url.searchParams.set('api_key',key);
 const response=await fetch(url.toString(),{method,headers:{'Content-Type':'application/json',Authorization:token,'stream-auth-type':'jwt'},body:JSON.stringify(payload),cache:'no-store'});
 if(!response.ok){console.error('Group Stream request rejected',{status:response.status,path:path.split('/').at(-1)});throw Error('GROUP_STREAM_REJECTED')}
 const data:unknown=await response.json().catch(()=>null);
 return data&&typeof data==='object'?data as Record<string,unknown>:{};
}
type Channel={id?:string;name?:string;created_by?:{id?:string};created_by_id?:string;members?:Array<{user_id?:string;user?:{id?:string}}>;isCampusGroup?:boolean;ownerUid?:string;data?:{name?:string;isCampusGroup?:boolean;ownerUid?:string}};
function unwrap(record:Record<string,unknown>):Channel{
 return (record.channel&&typeof record.channel==='object'?record.channel:record) as Channel;
}
export function groupInfo(record:Record<string,unknown>):StreamGroup|null{
 const ch=unwrap(record),id=String(ch.id||'');
 if(!validCampusGroupId(id))return null;
 const ids=(ch.members||[]).map(m=>String(m.user_id||m.user?.id||'')).filter(Boolean);
 return {id,name:String(ch.data?.name||ch.name||'Campus group'),ownerUid:String(ch.created_by?.id||ch.created_by_id||ch.data?.ownerUid||ch.ownerUid||''),memberUids:[...new Set(ids)],updatedAt:String((record as {updated_at?:string}).updated_at||'')};
}
export async function listGroups(uid:string):Promise<StreamGroup[]>{
 const result=await groupStream('/channels',{filter_conditions:{type:'messaging',members:{$in:[uid]}},sort:[{field:'last_message_at',direction:-1}],limit:100,state:true,watch:false});
 const list=Array.isArray(result.channels)?result.channels as Record<string,unknown>[]:[];
 return list.map(groupInfo).filter((x):x is StreamGroup=>Boolean(x&&x.memberUids.includes(uid)));
}
export async function memberGroup(uid:string,id:string):Promise<StreamGroup|null>{
 if(!validCampusGroupId(id))return null;
 const result=await groupStream('/channels',{filter_conditions:{type:'messaging',id,members:{$in:[uid]}},limit:10,state:true,watch:false});
 const list=Array.isArray(result.channels)?result.channels as Record<string,unknown>[]:[];
 return list.map(groupInfo).find(x=>x?.id===id&&x.memberUids.includes(uid))||null;
}
