export type PreferenceKey='likes'|'comments'|'follows'|'messages'|'mentions'|'reposts'|'stories'|'shares';
export function preferenceFor(type:string):PreferenceKey{
 if(type==='like'||type==='comment_like')return 'likes';
 if(type==='comment'||type==='reply')return 'comments';
 if(type==='follow'||type==='follow_request'||type==='follow_accept'||type==='follow_accepted')return 'follows';
 if(type==='mention'||type==='story_mention')return 'mentions';
 if(type==='repost')return 'reposts';
 if(type==='story_reply')return 'stories';
 if(type==='share')return 'shares';
 return 'messages';
}
export function acceptsNotification(type:string,prefs:Record<string,unknown>|null|undefined):boolean{return prefs?.[preferenceFor(type)]!==false}
