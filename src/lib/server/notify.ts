import 'server-only';
import {createHash} from 'node:crypto';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {isBlockedEitherWay} from './privacy';
import {acceptsNotification} from '../core/notification-preferences';
import {notificationGroupKey,mergeActors,type NotificationEvent} from '../core/notification-grouping';
export async function notify(input:{recipientUid:string;actorUid:string;type:NotificationEvent;postId?:string;storyId?:string;commentId?:string;targetId?:string}):Promise<boolean>{
 const {recipientUid,actorUid,type}=input;
 if(!recipientUid||!actorUid||recipientUid===actorUid||await isBlockedEitherWay(recipientUid,actorUid))return false;
 const store=db(),[actor,recipient]=await Promise.all([store.collection('users').doc(actorUid).get(),store.collection('users').doc(recipientUid).get()]);
 if(!actor.exists||actor.data()?.deletedAt||!recipient.exists||recipient.data()?.deletedAt)return false;
 if(!acceptsNotification(type,recipient.data()?.settings?.notifications))return false;
 const target=input.postId||input.storyId||input.commentId||input.targetId||actorUid;
 const key=createHash('sha256').update(notificationGroupKey(type,target,Date.now())).digest('hex').slice(0,32);
 const ref=recipient.ref.collection('notifications').doc(key);
 return store.runTransaction(async tx=>{
  const previous=await tx.get(ref),old=previous.data()||{},actorUids:Array<string>=Array.isArray(old.actorUids)?old.actorUids:typeof old.actorUid==='string'?[old.actorUid]:[];
  if(actorUids.includes(actorUid))return false;
  tx.set(ref,{
   type,actorUid,actorHandle:String(actor.data()?.handle||'Member'),actorUids:mergeActors(actorUids,actorUid),count:Math.max(0,Number(old.count||actorUids.length))+1,
   ...(input.postId?{postId:input.postId}:{}),...(input.storyId?{storyId:input.storyId}:{}),...(input.commentId?{commentId:input.commentId}:{}),
   read:false,readAt:null,createdAt:FieldValue.serverTimestamp()
  },{merge:true});
  return true;
 });
}
