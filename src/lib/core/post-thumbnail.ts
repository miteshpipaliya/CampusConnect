/** Thumbnails must be unclaimed, confirmed images owned by the publishing user. */
export function validPostThumbnail(data:{ownerUid?:unknown;status?:unknown;contentType?:unknown;purpose?:unknown;postId?:unknown;storyId?:unknown;avatarOwnerUid?:unknown;chatChannelId?:unknown;chatPending?:unknown}|undefined,uid:string):boolean{
 return Boolean(data&&data.ownerUid===uid&&data.status==='uploaded'&&data.purpose==='post'&&typeof data.contentType==='string'&&data.contentType.startsWith('image/')&&!data.postId&&!data.storyId&&!data.avatarOwnerUid&&!data.chatChannelId&&!data.chatPending);
}
