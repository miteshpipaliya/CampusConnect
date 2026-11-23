export type NotificationEvent='like'|'comment'|'reply'|'mention'|'comment_like'|'follow'|'follow_request'|'follow_accept'|'repost'|'story_reply'|'story_mention'|'share';
export function notificationGroupKey(type:NotificationEvent,target:string,ms:number):string{
 const day=Math.floor(ms/86400000);
 return [type,target||'profile',day].join(':');
}
export function mergeActors(existing:string[],actor:string):string[]{
 return [...new Set([actor,...existing])].slice(0,20);
}
export function normalizeNotificationType(type:string):string{return type==='follow_accepted'?'follow_accept':type}
export function notificationUnread(data:{read?:boolean;readAt?:unknown}):boolean{return data.read!==true&&(data.readAt===null||data.readAt===undefined)}
