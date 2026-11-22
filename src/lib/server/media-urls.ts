import 'server-only';
import {db} from './services';
import {presignGet} from './storage';
export type MediaUrl={url:string;expiresAt:number};
export async function mintUrls(mediaDocs:Array<{id:string;ownerUid?:string;key?:string;status?:string;postId?:string;storyId?:string;avatarOwnerUid?:string}>,opts:{viewerUid:string;storyExpiresAt?:number}):Promise<Record<string,MediaUrl>>{
 const output:Record<string,MediaUrl>={};
 await Promise.all(mediaDocs.map(async media=>{
  if(media.status!=='uploaded'||!media.key)return;
  try{
   let allowed=media.ownerUid===opts.viewerUid;
   if(!allowed&&media.avatarOwnerUid){const doc=await db().collection('users').doc(media.avatarOwnerUid).get();allowed=doc.data()?.avatarMediaId===media.id}
   if(!allowed&&media.storyId){const doc=await db().collection('stories').doc(media.storyId).get();const data=doc.data();allowed=Boolean(data&&data.visibility==='campus'&&(data.highlight||data.expiresAt?.toMillis?.()>Date.now()))}
   if(!allowed&&media.postId){const doc=await db().collection('posts').doc(media.postId).get();allowed=doc.data()?.visibility==='campus'}
   if(!allowed)return;
   const seconds=opts.storyExpiresAt===undefined?3600:Math.max(1,Math.min(3600,Math.floor((opts.storyExpiresAt-Date.now())/1000)));
   output[media.id]={url:await presignGet(media.key,seconds),expiresAt:Date.now()+seconds*1000};
  }catch{return}
 }));
 return output;
}
