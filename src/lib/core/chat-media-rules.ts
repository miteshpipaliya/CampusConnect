export type ChatMediaClaim={ownerUid:string;senderUid:string;status:string;purpose:string;contentType:string;alreadyAttached:boolean};
export function mayClaimChatMedia(input:ChatMediaClaim):boolean{
 return input.ownerUid===input.senderUid&&input.status==='uploaded'&&input.purpose==='chat'&&!input.alreadyAttached&&
  (input.contentType.startsWith('image/')||input.contentType.startsWith('video/'));
}
export type ChatMediaAccess={viewerUid:string;ownerUid:string;peerUid?:string;messageAttached:boolean;deleted:boolean;hidden:boolean;blocked:boolean;ownerDeleted:boolean};
export function mayViewChatMedia(input:ChatMediaAccess):boolean{
 if(input.deleted||input.hidden||input.ownerDeleted)return false;
 if(input.viewerUid===input.ownerUid)return true;
 return input.messageAttached&&input.viewerUid===input.peerUid&&!input.blocked;
}
