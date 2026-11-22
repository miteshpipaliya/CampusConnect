import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {mayClaimChatMedia} from '../core/chat-media-rules';

export async function claimChatMedia(input:{uid:string;peerUid:string;channelId:string;mediaId:string}):Promise<{contentType:string}|null>{
 const store=db(),ref=store.collection('media').doc(input.mediaId);
 return store.runTransaction(async tx=>{
  const snap=await tx.get(ref),data=snap.data();
  if(!snap.exists||!mayClaimChatMedia({
   ownerUid:String(data?.ownerUid||''),senderUid:input.uid,status:String(data?.status||''),
   purpose:String(data?.purpose||''),contentType:String(data?.contentType||''),
   alreadyAttached:Boolean(data?.postId||data?.storyId||data?.avatarOwnerUid||data?.chatChannelId||data?.chatMessageId)
  }))return null;
  tx.update(ref,{chatChannelId:input.channelId,chatPeerUid:input.peerUid,chatPending:true});
  return {contentType:String(data!.contentType)};
 });
}
export async function finishChatMedia(mediaId:string,channelId:string,messageId:string){
 const store=db(),ref=store.collection('media').doc(mediaId);
 await store.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(snap.data()?.chatChannelId!==channelId||snap.data()?.chatPending!==true)throw Error('CHAT_MEDIA_CLAIM_LOST');
  tx.update(ref,{chatMessageId:messageId,chatPending:FieldValue.delete()});
 });
}
export async function releaseChatMedia(mediaId:string,channelId:string){
 const store=db(),ref=store.collection('media').doc(mediaId);
 await store.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(snap.data()?.chatChannelId!==channelId||snap.data()?.chatMessageId)return;
  tx.update(ref,{chatChannelId:FieldValue.delete(),chatPeerUid:FieldValue.delete(),chatPending:FieldValue.delete()});
 });
}
export async function revokeChatMedia(mediaId:string,messageId:string){
 if(!/^[0-9a-f-]{36}$/.test(mediaId))return;
 const ref=db().collection('media').doc(mediaId);
 await db().runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(snap.data()?.purpose==='chat'&&snap.data()?.chatMessageId===messageId)tx.update(ref,{chatDeletedAt:FieldValue.serverTimestamp()});
 });
}
