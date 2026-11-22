export function deriveHandleLower(handle:unknown):string{return typeof handle==='string'?handle.trim().toLowerCase():''}
export function deriveNameTokens(name:unknown):string[]{
 if(typeof name!=='string')return [];
 return [...new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(part=>part.length>=2))].slice(0,8);
}
export function postToV2(legacyPost:Record<string,unknown>):Record<string,unknown>{
 const caption=typeof legacyPost.caption==='string'?legacyPost.caption:'';
 const mediaId=typeof legacyPost.mediaId==='string'?legacyPost.mediaId:null;
 const media=Array.isArray(legacyPost.media)?legacyPost.media:mediaId?[{mediaId}]:[];
 return {...legacyPost,type:legacyPost.type??'post',media,hashtags:[...new Set([...caption.matchAll(/#([a-z0-9_]+)/gi)].map(m=>m[1]?.toLowerCase()).filter((x):x is string=>Boolean(x)))],deletedAt:legacyPost.deletedAt??null};
}
