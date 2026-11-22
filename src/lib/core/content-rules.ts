import {MEDIA_LIMITS,validateReserve,type MediaPurpose} from './media-limits.ts';
export const MEDIA_RULES={maxCarousel:10,storySeconds:MEDIA_LIMITS.storySeconds,reelSeconds:MEDIA_LIMITS.reelSeconds,allowedTypes:['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']} as const;
export function parseCaption(text:string):{hashtags:string[];mentions:string[]}{
 const hashtags:string[]=[],mentions:string[]=[];
 const tags=/(^|[^\w])#([A-Za-z][A-Za-z0-9_]{0,49})/g;
 const users=/(^|[^\w@])@([a-z][a-z0-9._]{2,29})/gi;
 for(const match of text.matchAll(tags)){const tag=match[2]!.toLowerCase();if(!hashtags.includes(tag)&&hashtags.length<20)hashtags.push(tag)}
 for(const match of text.matchAll(users)){const name=match[2]!.toLowerCase();if(!mentions.includes(name)&&mentions.length<15)mentions.push(name)}
 return {hashtags,mentions};
}
export function validateFileForPurpose(file:{type:string;size:number;durationSec?:number},purpose:MediaPurpose):{ok:true}|{ok:false;message:string}{
 const result=validateReserve({purpose,contentType:file.type,size:file.size,durationSec:file.durationSec});
 return result.ok?{ok:true}:{ok:false,message:result.error};
}
export type PublishKind='post'|'story'|'reel';
export function canPublish(input:{kind:PublishKind;items:readonly {type?:string;status?:string}[];caption?:string}):boolean{
 const {kind,items,caption=''}=input;
 if(caption.length>2200||items.length>MEDIA_RULES.maxCarousel)return false;
 if(kind==='post')return items.length>0&&items.every(x=>x.status===undefined||x.status==='done');
 if(items.length!==1)return false;
 if(kind==='reel'&&!items[0]?.type?.startsWith('video/'))return false;
 return items.every(x=>x.status===undefined||x.status==='done');
}
