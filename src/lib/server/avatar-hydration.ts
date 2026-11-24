import 'server-only';
import {db} from './services';
import {mintUrls} from './media-urls';
/** Hydrate author avatars in one Firestore batch and one signed URL batch per list response. */
export async function hydrateAvatars(uids:string[],viewerUid:string):Promise<Record<string,{handle:string;name:string;avatarMediaId:string|null;avatarUrl:string|null;verified:boolean}>>{
 const unique=[...new Set(uids.filter(uid=>typeof uid==='string'&&uid.length>0))];
 const result:Record<string,{handle:string;name:string;avatarMediaId:string|null;avatarUrl:string|null;verified:boolean}>={};
 if(!unique.length)return result;
 const store=db(),users=await store.getAll(...unique.map(uid=>store.collection('users').doc(uid)));
 const avatars=users.map(d=>d.data()?.avatarMediaId).filter((id):id is string=>typeof id==='string');
 const media=avatars.length?await store.getAll(...[...new Set(avatars)].map(id=>store.collection('media').doc(id))):[];
 const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})})),{viewerUid});
 for(const user of users){
  if(!user.exists||user.data()?.deletedAt)continue;
  const data=user.data()!,mediaId=typeof data.avatarMediaId==='string'?data.avatarMediaId:null;
  result[user.id]={handle:String(data.handle||''),name:String(data.name||data.handle||'Student'),avatarMediaId:mediaId,verified:data.verified===true,avatarUrl:mediaId?urls[mediaId]?.url??null:null};
 }
 return result;
}
