import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
/** Best effort fan-out cleanup for author followers; returns false if capped.
 * Failure is logged, never silently presented as a guaranteed global removal.
 */
export async function syncFeedItems(authorUid:string,postId:string,restore:boolean):Promise<{touched:number;truncated:boolean}>{
 const store=db(),followers=store.collection('follows'),recipientIds=new Set<string>();
 let query=followers.where('followingUid','==',authorUid).limit(200);
 let truncated=false;
 for(let page=0;page<5;page++){
  const snap=await query.get();
  for(const f of snap.docs){const data=f.data();if(data.status==='active'&&typeof data.followerUid==='string')recipientIds.add(data.followerUid)}
  if(snap.size<200)break;
  if(page===4){truncated=true;break}
  query=query.startAfter(snap.docs.at(-1)!);
 }
 const ids=[...recipientIds];
 for(let i=0;i<ids.length;i+=400){
  const batch=store.batch();
  for(const uid of ids.slice(i,i+400)){
   const ref=store.collection('users').doc(uid).collection('feedItems').doc(postId);
   if(restore)batch.set(ref,{postId,authorUid,createdAt:FieldValue.serverTimestamp()},{merge:true});
   else batch.delete(ref);
  }
  await batch.commit();
 }
 return {touched:ids.length,truncated};
}
