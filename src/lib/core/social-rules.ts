export type FollowStatus='none'|'pending'|'active';
export function followCounterDelta(before:FollowStatus,after:FollowStatus):number{
 return Number(after==='active')-Number(before==='active');
}
export function safeCounter(current:unknown,delta:number):number{
 return Math.max(0,(typeof current==='number'&&Number.isFinite(current)?current:0)+delta);
}
export function socialNotificationId(type:string,actorUid:string,postId?:string):string{
 const parts=[type,actorUid,...(postId?[postId]:[])];
 if(parts.some(part=>!/^[a-zA-Z0-9_-]{1,128}$/.test(part)))throw Error('Invalid notification identifier');
 return parts.join('_');
}
