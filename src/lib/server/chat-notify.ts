import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {isBlockedEitherWay} from './privacy';
import {chatNotificationId,shouldNotifyChat} from '../core/chat-notifications';

/** No private message text is retained in Firestore notification records. */
export async function notifyChatMessage(input:{senderUid:string;recipientUid:string;channelId:string;messageId:string}):Promise<void>{
 const store=db();
 const [sender,recipient,blocked]=await Promise.all([
  store.collection('users').doc(input.senderUid).get(),
  store.collection('users').doc(input.recipientUid).get(),
  isBlockedEitherWay(input.senderUid,input.recipientUid)
 ]);
 if(!sender.exists||!recipient.exists||sender.data()?.deletedAt||recipient.data()?.deletedAt)return;
 const prefs=recipient.data()?.settings?.notifications;
 if(!shouldNotifyChat({senderUid:input.senderUid,recipientUid:input.recipientUid,messagesEnabled:prefs?.messages!==false,blocked}))return;
 await store.collection('users').doc(input.recipientUid).collection('notifications').doc(chatNotificationId(input.messageId)).set({
  type:'chat_message',actorUid:input.senderUid,actorHandle:String(sender.data()?.handle||''),
  channelId:input.channelId,messageId:input.messageId,read:false,readAt:null,createdAt:FieldValue.serverTimestamp()
 },{merge:true});
}
