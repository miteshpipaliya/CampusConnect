import 'server-only';
import {db} from './services';
import {canViewAuthor} from './privacy';
import {presignGet} from './storage';
import {isBlockedEitherWay} from './privacy';
export type MediaUrl={url:string;expiresAt:number};
export async function mintUrls(mediaDocs:Array<{id:string;ownerUid?:string;key?:string;status?:string;postId?:string;storyId?:string;avatarOwnerUid?:string;storyExpiresAt?:number}>,opts:{viewerUid:string;storyExpiresAt?:number}):Promise<Record<string,MediaUrl>>{
 const output:Record<string,MediaUrl>={};
 await Promise.all(mediaDocs.map(async media=>{
  if(media.status!=='uploaded'||!media.key)return;
  try{
   let allowed=media.ownerUid===opts.viewerUid;
   if(!allowed&&media.avatarOwnerUid){const doc=await db().collection('users').doc(media.avatarOwnerUid).get();allowed=doc.data()?.avatarMediaId===media.id&&!(await isBlockedEitherWay(opts.viewerUid,media.avatarOwnerUid))}
   if(!allowed&&media.storyId){const doc=await db().collection('stories').doc(media.storyId).get();const data=doc.data();allowed=Boolean(data&&(data.highlight||data.expiresAt?.toMillis?.()>Date.now())&&await canViewAuthor(opts.viewerUid,String(data.authorUid||'')));
    if(allowed&&data?.audience==='close'&&data.authorUid!==opts.viewerUid){
     const friend=await db().collection('closeFriends').doc(String(data.authorUid||'')+'_'+opts.viewerUid).get();
     allowed=friend.exists;
    }}
   if(!allowed&&media.postId){const doc=await db().collection('posts').doc(media.postId).get();allowed=Boolean(doc.exists&&await canViewAuthor(opts.viewerUid,String(doc.data()?.authorUid||'')))}
   if(!allowed)return;
   const expiresAt=media.storyExpiresAt??opts.storyExpiresAt;
   const seconds=expiresAt===undefined?3600:Math.max(1,Math.min(3600,Math.floor((expiresAt-Date.now())/1000)));
   output[media.id]={url:await presignGet(media.key,seconds),expiresAt:Date.now()+seconds*1000};
  }catch{return}
 }));
 return output;
}
