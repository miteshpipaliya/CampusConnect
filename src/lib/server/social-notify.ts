import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
export async function notifySocial(recipientUid:string,actorUid:string,type:'follow'|'follow_request'|'follow_accepted'){
 if(recipientUid===actorUid)return;
 const store=db(),actor=await store.collection('users').doc(actorUid).get();
 if(!actor.exists||actor.data()?.deletedAt)return;
 await store.collection('users').doc(recipientUid).collection('notifications').add({
  type,actorUid,actorHandle:String(actor.data()?.handle||''),createdAt:FieldValue.serverTimestamp(),read:false
 });
}
