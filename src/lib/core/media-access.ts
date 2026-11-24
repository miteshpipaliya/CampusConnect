export type MediaAccessInput={owner:boolean;status:string;hasKey:boolean;avatar?:{active:boolean;blocked:boolean;visible?:boolean};story?:{active:boolean;visible:boolean;closeFriendsOnly:boolean;closeFriend:boolean};post?:{exists:boolean;deleted:boolean;archived:boolean;author:boolean;visible:boolean}};
export function maySignMedia(input:MediaAccessInput):boolean{
 if(input.status!=='uploaded'||!input.hasKey)return false;
 if(input.owner&&!input.avatar&&!input.story&&!input.post)return true;
 if(input.avatar?.active&&!input.avatar.blocked)return true;
 if(input.story?.active&&input.story.visible&&(!input.story.closeFriendsOnly||input.story.closeFriend))return true;
 if(input.post?.exists&&!input.post.deleted&&(!input.post.archived||input.post.author)&&input.post.visible)return true;
 return false;
}
export type ClaimKind='avatar'|'post'|'story'|'reel';
export function mayClaimMedia(input:{owner:boolean;status:string;attached:boolean;purpose:string;contentType:string;kind:ClaimKind}):boolean{
 if(!input.owner||input.status!=='uploaded'||input.attached)return false;
 if(input.kind==='avatar')return input.purpose==='avatar'&&input.contentType.startsWith('image/');
 if(input.kind==='story')return input.purpose==='story'&&(input.contentType.startsWith('image/')||input.contentType.startsWith('video/'));
 if(input.kind==='reel')return input.purpose==='reel'&&input.contentType.startsWith('video/');
 return (input.purpose==='post'||input.purpose==='reel')&&(input.contentType.startsWith('image/')||input.contentType.startsWith('video/'));
}

export function signedMediaTTL(now:number,expiry?:number,max=60):number{if(expiry===undefined)return max;if(!Number.isFinite(expiry))return 0;return Math.max(0,Math.min(max,Math.floor((expiry-now)/1000)))}
