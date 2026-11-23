import 'server-only';
import {db} from './services';
import {canViewMany} from './privacy';
import {hydrateAvatars} from './avatar-hydration';
import {mintUrls} from './media-urls';
import {clampLimit} from '../core/cursor';
import {exploreScore} from '../core/explore-ranking';
export async function explorePage(viewer:string,opts:{cursor?:string|null;tag?:string;limit?:string|null;sort?:string}={}){
 const store=db(),limit=clampLimit(opts.limit,18,30);
 let query=opts.tag?store.collection('posts').where('hashtags','array-contains',opts.tag).orderBy('createdAt','desc'):store.collection('posts').orderBy('createdAt','desc');
 if(opts.cursor){
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(opts.cursor))throw Error('INVALID_CURSOR');
  const last=await store.collection('posts').doc(opts.cursor).get();
  if(!last.exists)throw Error('INVALID_CURSOR');
  query=query.startAfter(last);
 }
 const selected:FirebaseFirestore.QueryDocumentSnapshot[]=[];
 let lastScanned:FirebaseFirestore.QueryDocumentSnapshot|undefined;
 const muteDocs=await store.collection('mutes').where('ownerUid','==',viewer).limit(200).get();
 const muted=new Set(muteDocs.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
 for(let batch=0;batch<4&&selected.length<limit;batch++){
  const snap=await query.limit(30).get();if(snap.empty)break;
  const allowed=await canViewMany(viewer,snap.docs.map(d=>String(d.data().authorUid||'')));
  for(const d of snap.docs){
   lastScanned=d;const a=String(d.data().authorUid||'');
   if(d.data().deletedAt||d.data().archived||muted.has(a)||!allowed.get(a)||typeof d.data().mediaId!=='string')continue;
   selected.push(d);if(selected.length>=limit)break;
  }
  if(snap.size<30)break;query=query.startAfter(snap.docs.at(-1)!);
 }
 const authors=await hydrateAvatars(selected.map(d=>String(d.data().authorUid||'')),viewer);
 const mediaIds=[...new Set(selected.map(d=>String(d.data().mediaId||'')))],media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
 const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})})),{viewerUid:viewer});
 const mediaTypes=new Map(media.map(d=>[d.id,String(d.data()?.contentType||'')]));
 let posts=selected.map(d=>{const x=d.data(),id=String(x.mediaId||''),uid=String(x.authorUid||''),createdAt=x.createdAt?.toMillis?.()??0;
  return {id:d.id,caption:String(x.caption||''),type:x.type==='reel'?'reel':'post',authorUid:uid,authorHandle:authors[uid]?.handle||String(x.authorHandle||''),avatarUrl:authors[uid]?.avatarUrl??null,mediaUrl:urls[id]?.url??null,mediaType:mediaTypes.get(id)||'',likes:Number(x.counters?.likes||0),comments:Number(x.counters?.comments||0),reposts:Number(x.counters?.reposts||0),saves:Number(x.counters?.saves||0),createdAt,mediaCount:Array.isArray(x.media)?x.media.length:1};
 });
 if(opts.sort==='top')posts=[...posts].sort((a,b)=>exploreScore(b,Date.now())-exploreScore(a,Date.now())||b.createdAt-a.createdAt);
 return {items:posts,nextCursor:selected.length===limit&&lastScanned?lastScanned.id:null};
}
