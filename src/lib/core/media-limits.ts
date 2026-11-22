export type MediaPurpose='avatar'|'post'|'story'|'reel'|'chat';
export const MEDIA_LIMITS={image:8*1024*1024,avatar:5*1024*1024,video:50*1024*1024,reel:100*1024*1024,storySeconds:60,reelSeconds:90} as const;
export function validateReserve(input:{purpose?:unknown;contentType:unknown;size:unknown;durationSec?:unknown}):{ok:true;purpose:MediaPurpose}|{ok:false;error:string}{
 const purpose=input.purpose===undefined?'post':input.purpose;
 if(!['avatar','post','story','reel','chat'].includes(String(purpose)))return {ok:false,error:'Invalid media purpose'};
 const kind=purpose as MediaPurpose;
 const image=['image/jpeg','image/png','image/webp','image/gif'].includes(String(input.contentType));
 const video=['video/mp4','video/webm','video/quicktime'].includes(String(input.contentType));
 if(!image&&!video || (kind==='avatar'&&!image))return {ok:false,error:'Unsupported media type'};
 const max=image?(kind==='avatar'?MEDIA_LIMITS.avatar:MEDIA_LIMITS.image):(kind==='reel'?MEDIA_LIMITS.reel:MEDIA_LIMITS.video);
 if(typeof input.size!=='number'||!Number.isSafeInteger(input.size)||input.size<=0||input.size>max)return {ok:false,error:'Unsupported media size'};
 if(video&&(kind==='story'||kind==='reel')&&input.durationSec===undefined)return {ok:false,error:'Video duration required'};
 if(input.durationSec!==undefined){
  const d=input.durationSec;
  if(typeof d!=='number'||!Number.isFinite(d)||d<=0)return {ok:false,error:'Invalid duration'};
  if(video&&kind==='story'&&d>MEDIA_LIMITS.storySeconds)return {ok:false,error:'Story too long'};
  if(video&&kind==='reel'&&d>MEDIA_LIMITS.reelSeconds)return {ok:false,error:'Reel too long'};
 }
 return {ok:true,purpose:kind};
}
