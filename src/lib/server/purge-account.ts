import 'server-only';
import {Timestamp} from 'firebase-admin/firestore';
import {auth,db} from './services';
import {deleteObject} from './storage';
import {deletionDue} from '../core/phase2-rules';
import {streamDeletionStep} from './stream-user';
/** Runs only for an account that opted into deletion >=30 days ago.
 * Each invocation performs a bounded batch and returns; cron resumes on the next run.
 * Never bypass review flags in the cron route.
 */
export async function purgeAccountBatch(uid:string,now=Date.now()):Promise<{stage:string;processed:number;complete:boolean}>{
 const store=db(),profileRef=store.collection('users').doc(uid),profile=await profileRef.get();
 const deleted=profile.data()?.deletedAt;
 if(!profile.exists||!deleted||typeof deleted.toMillis!=='function'||!deletionDue(deleted.toMillis(),now)){
  return {stage:'not_due',processed:0,complete:false};
 }
 const media=await store.collection('media').where('ownerUid','==',uid).limit(30).get();
 if(!media.empty){
  for(const doc of media.docs){
   const key=doc.data().key;
   if(typeof key==='string')await deleteObject(key);
   await doc.ref.delete();
  }
  return {stage:'media',processed:media.size,complete:false};
 }
 const stages:Array<{name:string;field:string;value:string;recursive?:boolean;group?:boolean}>=[
  {name:'posts',field:'authorUid',value:uid,recursive:true},
  {name:'stories',field:'authorUid',value:uid,recursive:true},
  {name:'reposts',field:'ownerUid',value:uid},
  {name:'follows_out',field:'followerUid',value:uid},
  {name:'follows_in',field:'followeeUid',value:uid},
  {name:'blocks_out',field:'ownerUid',value:uid},
  {name:'blocks_in',field:'targetUid',value:uid},
  {name:'mutes_out',field:'ownerUid',value:uid},
  {name:'mutes_in',field:'targetUid',value:uid},
  {name:'close_friends_out',field:'ownerUid',value:uid},
  {name:'close_friends_in',field:'targetUid',value:uid},
  {name:'likes',field:'uid',value:uid,group:true},
  {name:'comments',field:'uid',value:uid,group:true},
  {name:'notifications',field:'actorUid',value:uid,group:true}
 ];
 for(const stage of stages){
  const collection=stage.group?store.collectionGroup(stage.name):store.collection(stage.name.replace(/_(out|in)$/,'').replace('close_friends','closeFriends'));
  const result=await collection.where(stage.field,'==',stage.value).limit(30).get();
  if(result.empty)continue;
  for(const doc of result.docs){
   if(stage.recursive)await store.recursiveDelete(doc.ref);
   else await doc.ref.delete();
  }
  return {stage:stage.name,processed:result.size,complete:false};
 }
 // Stream hard deletion is asynchronous; poll until confirmed before removing Firebase identity.
 const priorTask=profile.data()?.streamDeleteTaskId;
 const stream=await streamDeletionStep(uid,typeof priorTask==='string'?priorTask:undefined);
 if(!stream.complete){
  if(stream.taskId!==priorTask)await profileRef.update({streamDeleteTaskId:stream.taskId});
  return {stage:'stream',processed:0,complete:false};
 }
 // Auth is deleted last so that a recoverable Firestore profile remains until external data is cleaned.
 try{await auth().deleteUser(uid)}catch(e){
  if((e as {code?:string}).code!=='auth/user-not-found')throw e;
 }
 const handle=profile.data()?.handle;
 if(typeof handle==='string'){
  const ref=store.collection('handles').doc(handle.toLowerCase()),snapshot=await ref.get();
  if(snapshot.exists&&snapshot.data()?.uid===uid)await ref.delete();
 }
 await store.recursiveDelete(profileRef);
 return {stage:'complete',processed:1,complete:true};
}
