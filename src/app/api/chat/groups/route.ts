import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {blockedEitherWayMany} from '@/lib/server/privacy';
import {syncStreamUser} from '@/lib/server/stream-user';
import {listGroups,groupStream} from '@/lib/server/campus-chat-groups';
import {normaliseGroupMembers,normaliseGroupName} from '@/lib/core/group-chat-rules';
export const runtime='nodejs';
const schema=z.object({name:z.string().trim().min(1).max(60),handles:z.array(z.string()).min(2).max(12)}).strict();
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{return NextResponse.json({groups:await listGroups(user.uid)},{headers:safeHeaders})}
 catch{return errorResponse(503,'Group conversations unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'chat-group-create:{uid}',limit:6,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input),store=db(),owner=await store.collection('users').doc(checked.user.uid).get();
 if(!owner.exists||owner.data()?.deletedAt)return errorResponse(401,'Campus profile unavailable');
 const handles=normaliseGroupMembers(input.handles,String(owner.data()?.handle||'')),name=normaliseGroupName(input.name);
 if(!handles||!name)return errorResponse(400,'Select 2–8 other campus members');
 try{
  const snapshots=await store.getAll(...handles.map(h=>store.collection('handles').doc(h)));
  const uids=snapshots.map(d=>String(d.data()?.uid||''));
  if(uids.some(uid=>!uid)||new Set(uids).size!==uids.length||uids.includes(checked.user.uid))return errorResponse(400,'Group members unavailable');
  const [profiles,blocked]=await Promise.all([store.getAll(...uids.map(uid=>store.collection('users').doc(uid))),blockedEitherWayMany(checked.user.uid,uids)]);
  if(profiles.some(x=>!x.exists||x.data()?.deletedAt)||blocked.size)return errorResponse(403,'One or more members unavailable');
  const members=[checked.user.uid,...uids];
  // Stream must know each member before a channel can be created.
  const sync=await Promise.all(members.map(uid=>syncStreamUser(uid)));
  if(sync.some(s=>!s.synced))return errorResponse(503,'Unable to prepare all group members');
  const id='campus-group-'+randomUUID().replaceAll('-','');
  await groupStream('/channels/messaging/'+id+'/query',{data:{members,created_by_id:checked.user.uid,name,isCampusGroup:true,ownerUid:checked.user.uid},state:true,watch:false});
  return NextResponse.json({ok:true,id,name},{status:201,headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to create group')}
}
