import 'server-only';
import type {Transaction,DocumentReference} from 'firebase-admin/firestore';
import {mayClaimMedia,type ClaimKind} from '../core/media-access';
export async function claimMedia(tx:Transaction,input:{uid:string;mediaRefs:DocumentReference[];kind:ClaimKind;attachmentId:string}):Promise<Array<FirebaseFirestore.DocumentData>>{
 const snapshots=input.mediaRefs.length?await tx.getAll(...input.mediaRefs):[];
 for(const doc of snapshots){
  const media=doc.data();
  if(!doc.exists||!mayClaimMedia({owner:media?.ownerUid===input.uid,status:String(media?.status||''),attached:Boolean(media?.postId||media?.storyId||media?.avatarOwnerUid),purpose:String(media?.purpose||''),contentType:String(media?.contentType||''),kind:input.kind}))throw new Error('INVALID_MEDIA');
 }
 for(const ref of input.mediaRefs)tx.update(ref,input.kind==='story'?{storyId:input.attachmentId}:input.kind==='avatar'?{avatarOwnerUid:input.uid}:{postId:input.attachmentId});
 return snapshots.map(doc=>doc.data()??{});
}
