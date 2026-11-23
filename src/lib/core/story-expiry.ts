export const STORY_LIFETIME_MS=24*60*60*1000;
export function storyExpiryMs(value:unknown):number|null{
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(typeof value==='string'){const t=Date.parse(value);return Number.isFinite(t)?t:null}
 if(value&&typeof value==='object'&&'toMillis'in value){
  const convert=(value as {toMillis?:unknown}).toMillis;
  if(typeof convert==='function'){const n=convert.call(value);return typeof n==='number'&&Number.isFinite(n)?n:null}
 }
 return null;
}
export function isStoryActive(story:{expiresAt?:unknown;createdAt?:unknown},nowMs:number):boolean{
 const expiry=storyExpiryMs(story.expiresAt);
 return Number.isFinite(nowMs)&&expiry!==null&&nowMs<expiry;
}
export function storyTimeLeft(story:{expiresAt?:unknown},nowMs:number):number{
 const expiry=storyExpiryMs(story.expiresAt);return expiry===null?0:Math.max(0,expiry-nowMs);
}
export function storyMediaTtlSeconds(story:{expiresAt?:unknown},nowMs:number):number{
 const remaining=storyTimeLeft(story,nowMs);
 return remaining<=0?0:Math.max(1,Math.min(3600,Math.floor(remaining/1000)));
}
