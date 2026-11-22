import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {socialNotificationId} from '../core/social-rules';
import {isBlockedEitherWay} from './privacy';
export async function notifySocial(recipientUid:string,actorUid:string,type:'follow'|'follow_request'|'follow_accepted'){
 if(recipientUid===actorUid)return;
 const store=db(),[actor,recipient,blocked]=await Promise.all([store.collection('users').doc(actorUid).get(),store.collection('users').doc(recipientUid).get(),isBlockedEitherWay(actorUid,recipientUid)]);
 if(!actor.exists||actor.data()?.deletedAt||!recipient.exists||recipient.data()?.deletedAt||blocked||recipient.data()?.settings?.notifications?.follows===false)return;
 await store.collection('users').doc(recipientUid).collection('notifications').doc(socialNotificationId(type,actorUid)).set({
  type,actorUid,actorHandle:String(actor.data()?.handle||''),createdAt:FieldValue.serverTimestamp(),read:false
 });
}
