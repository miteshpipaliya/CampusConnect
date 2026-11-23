/**
 * A Reel is either an explicitly published Reel or a legacy single-video post.
 * The latter is important for posts created before the Reels tab was introduced.
 * Carousel posts containing multiple files are not silently treated as Reels.
 */
export function reelMediaId(post:{type?:unknown;mediaId?:unknown;media?:unknown}):string|null{
 const id=typeof post.mediaId==='string'?post.mediaId:null;
 const attachments=Array.isArray(post.media)?post.media.length:id?1:0;
 if(attachments!==1)return null;
 const first=Array.isArray(post.media)?post.media[0]:null;
 const candidate=id??(first&&typeof first.mediaId==='string'?first.mediaId:null);
 return typeof candidate==='string'&&candidate.length>0?candidate:null;
}
export function couldBeReel(post:{type?:unknown;mediaId?:unknown;media?:unknown;deletedAt?:unknown;archived?:unknown}):boolean{
 return !post.deletedAt&&!post.archived&&reelMediaId(post)!==null;
}
export function isPlayableReelMedia(media:{status?:unknown;contentType?:unknown}|undefined):boolean{
 return media?.status==='uploaded'&&typeof media.contentType==='string'&&media.contentType.startsWith('video/');
}
export function safeVideoAspect(width:number,height:number):number{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 9/16;
 return Math.max(0.45,Math.min(2.5,width/height));
}
