export type Counters={likes:number;comments:number;reposts:number;saves:number;shares:number;views:number};
export function normalizeCounters(raw:unknown):Counters&{isLegacy:boolean}{
 const object=typeof raw==='object'&&raw!==null&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
 const num=(key:keyof Counters)=>{const value=object?.[key];return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0};
 return {likes:num('likes'),comments:num('comments'),reposts:num('reposts'),saves:num('saves'),shares:num('shares'),views:num('views'),isLegacy:object===null||typeof object.likes!=='number'||typeof object.comments!=='number'};
}
