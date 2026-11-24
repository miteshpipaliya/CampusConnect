import 'server-only';
import {db} from './services';
import {canViewMany} from './privacy';
import {presignGet} from './storage';
import {maySignMedia,signedMediaTTL} from '../core/media-access';

export type MediaUrl={url:string;expiresAt:number};
type MediaDoc={id:string;ownerUid?:string;key?:string;status?:string;postId?:string;storyId?:string;avatarOwnerUid?:string;storyExpiresAt?:number};
type Doc=FirebaseFirestore.DocumentSnapshot;
function chunks<T>(items:T[],size:number):T[][]{const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}
export async function mintUrls(mediaDocs:MediaDoc[],opts:{viewerUid:string;storyExpiresAt?:number}):Promise<Record<string,MediaUrl>>{
 const output:Record<string,MediaUrl>={};
 const eligible=mediaDocs.filter(media=>media.status==='uploaded'&&typeof media.key==='string'&&media.key.length>0);
 if(!eligible.length)return output;
 const store=db();
 const avatars=[...new Set(eligible.map(m=>m.avatarOwnerUid).filter((id):id is string=>Boolean(id)))];
 const stories=[...new Set(eligible.map(m=>m.storyId).filter((id):id is string=>Boolean(id)))];
 const posts=[...new Set(eligible.map(m=>m.postId).filter((id):id is string=>Boolean(id)))];
 const refs=[
  ...avatars.map(id=>store.collection('users').doc(id)),
  ...stories.map(id=>store.collection('stories').doc(id)),
  ...posts.map(id=>store.collection('posts').doc(id))
 ];
 const docs:Doc[]=[];
 for(const part of chunks(refs,100))docs.push(...await store.getAll(...part));
 const avatarDocs=new Map(avatars.map((id,i)=>[id,docs[i]]));
 const storyDocs=new Map(stories.map((id,i)=>[id,docs[avatars.length+i]]));
 const postDocs=new Map(posts.map((id,i)=>[id,docs[avatars.length+stories.length+i]]));
 const authors=[...new Set([...stories.map(id=>String(storyDocs.get(id)?.data()?.authorUid||'')),...posts.map(id=>String(postDocs.get(id)?.data()?.authorUid||''))].filter(Boolean))];
 const visibility=await canViewMany(opts.viewerUid,[...authors,...avatars]);
 const otherAvatars=avatars.filter(uid=>uid!==opts.viewerUid);
 const blockRefs=otherAvatars.flatMap(uid=>[store.collection('blocks').doc(opts.viewerUid+'_'+uid),store.collection('blocks').doc(uid+'_'+opts.viewerUid)]);
 const blockDocs:Doc[]=[];for(const part of chunks(blockRefs,100))blockDocs.push(...await store.getAll(...part));
 const blockedAvatars=new Set(otherAvatars.filter((_,i)=>blockDocs[i*2]?.exists||blockDocs[i*2+1]?.exists));
 const closeAuthors=[...new Set(stories.map(id=>storyDocs.get(id)?.data()).filter(d=>d?.audience==='close'&&d.authorUid!==opts.viewerUid).map(d=>String(d?.authorUid||'')))];
 const closeRefs=closeAuthors.map(uid=>store.collection('closeFriends').doc(uid+'_'+opts.viewerUid));
 const closeDocs:Doc[]=[];for(const part of chunks(closeRefs,100))closeDocs.push(...await store.getAll(...part));
 const closeFriends=new Set(closeAuthors.filter((_,i)=>closeDocs[i]?.exists));
 await Promise.all(eligible.map(async media=>{
  try{
   const avatar=media.avatarOwnerUid?avatarDocs.get(media.avatarOwnerUid):undefined;
   const story=media.storyId?storyDocs.get(media.storyId):undefined;
   const post=media.postId?postDocs.get(media.postId):undefined;
   const storyData=story?.data(),postData=post?.data();
   const storyAuthor=String(storyData?.authorUid||''),postAuthor=String(postData?.authorUid||'');
   const allowed=maySignMedia({
    owner:media.ownerUid===opts.viewerUid,status:media.status||'',hasKey:Boolean(media.key),
    ...(avatar?{avatar:{active:avatar.exists&&!avatar.data()?.deletedAt&&avatar.data()?.avatarMediaId===media.id,blocked:blockedAvatars.has(media.avatarOwnerUid||''),visible:visibility.get(media.avatarOwnerUid||'')??false}}:{}),
    ...(story?{story:{active:Boolean(story.exists&&!storyData?.deletedAt&&(storyData?.highlight||storyData?.expiresAt?.toMillis?.()>Date.now())),visible:visibility.get(storyAuthor)??false,closeFriendsOnly:storyData?.audience==='close'&&storyAuthor!==opts.viewerUid,closeFriend:closeFriends.has(storyAuthor)}}:{}),
    ...(post?{post:{exists:post.exists,deleted:Boolean(postData?.deletedAt),archived:Boolean(postData?.archived),author:postAuthor===opts.viewerUid,visible:visibility.get(postAuthor)??false}}:{})
   });
   if(!allowed||!media.key)return;
   const expiry=storyData?.expiresAt?.toMillis?.();
   const deadlines=[media.storyExpiresAt,opts.storyExpiresAt,...(story&&!storyData?.highlight?[typeof expiry==='number'?expiry:0]:[])].filter((v):v is number=>typeof v==='number');
   const seconds=signedMediaTTL(Date.now(),deadlines.length?Math.min(...deadlines):undefined,story?60:3600);
   if(!seconds)return;
   output[media.id]={url:await presignGet(media.key,seconds),expiresAt:Date.now()+seconds*1000};
  }catch{/* deny on failed authorization or signing */}
 }));
 return output;
}
