import 'server-only';
import {db} from './services';
import {canViewAuthor} from './privacy';
import {isStoryActive} from '../core/story-expiry';
import {mintUrls} from './media-urls';

export async function authorizedStory(viewerUid:string,id:string,opts:{allowArchive?:boolean}={}){
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return null;
 const store=db(),doc=await store.collection('stories').doc(id).get();
 if(!doc.exists)return null;
 const data=doc.data()!,authorUid=String(data.authorUid||'');
 if(!authorUid||!(await canViewAuthor(viewerUid,authorUid)))return null;
 const owned=authorUid===viewerUid,active=isStoryActive(data,Date.now());
 if(!active&&!(opts.allowArchive&&owned))return null;
 if(data.audience==='close'&&!owned){
  const relation=await store.collection('closeFriends').doc(authorUid+'_'+viewerUid).get();
  if(!relation.exists)return null;
 }
 return {doc,data,authorUid,owned,active};
}
export async function authorizedStoryMedia(viewerUid:string,id:string){
 const allowed=await authorizedStory(viewerUid,id);
 if(!allowed)return null;
 const mediaId=allowed.data.mediaId;
 if(typeof mediaId!=='string')return null;
 const media=await db().collection('media').doc(mediaId).get();
 if(!media.exists)return null;
 const urls=await mintUrls([{id:media.id,...(media.data()||{}),storyExpiresAt:allowed.data.expiresAt?.toMillis?.()??0}],{viewerUid});
 return urls[mediaId]?.url??null;
}
