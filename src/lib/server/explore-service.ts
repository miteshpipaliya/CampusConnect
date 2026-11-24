import 'server-only';
import {db} from './services';
import {canViewMany} from './privacy';
import {profileContentKind} from '../core/profile-content-kind';
import {reelMediaId} from '../core/reel-discovery';
import {mintUrls} from './media-urls';
import {clampLimit} from '../core/cursor';
import {exploreScore} from '../core/explore-ranking';
export async function explorePage(viewer:string,opts:{cursor?:string|null;tag?:string;text?:string;limit?:string|null;sort?:string}={}){
 const store=db(),limit=clampLimit(opts.limit,18,30);
 let query=opts.tag?store.collection('posts').where('hashtags','array-contains',opts.tag).orderBy('createdAt','desc'):store.collection('posts').orderBy('createdAt','desc');
 if(opts.cursor){
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(opts.cursor))throw Error('INVALID_CURSOR');
  const last=await store.collection('posts').doc(opts.cursor).get();
  if(!last.exists)throw Error('INVALID_CURSOR');
  query=query.startAfter(last);
 }
 const [snap,muteDocs]=await Promise.all([query.limit(120).get(),store.collection('mutes').where('ownerUid','==',viewer).limit(200).get()]);
 const muted=new Set(muteDocs.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
 const allowed=await canViewMany(viewer,snap.docs.map(d=>String(d.data().authorUid||'')));
 const selected:FirebaseFirestore.QueryDocumentSnapshot[]=[];
 let lastScanned:FirebaseFirestore.QueryDocumentSnapshot|undefined;
 for(const d of snap.docs){
  lastScanned=d;const x=d.data(),uid=String(x.authorUid||'');
  if(x.deletedAt||x.archived||muted.has(uid)||!allowed.get(uid)||!((typeof x.mediaId==='string'&&x.mediaId)||(Array.isArray(x.media)&&typeof x.media[0]?.mediaId==='string')))continue;
  if(opts.text&&!String(x.caption||'').toLowerCase().includes(opts.text))continue;
  selected.push(d);if(selected.length>=limit)break;
 }
 const pickMedia=(x:FirebaseFirestore.DocumentData)=>String(x.mediaId||((Array.isArray(x.media)&&x.media[0]?.mediaId)||''));
 const thumbId=(x:FirebaseFirestore.DocumentData)=>String((Array.isArray(x.media)&&x.media[0]?.thumbMediaId)||x.thumbMediaId||'');
 const ids=[...new Set(selected.flatMap(d=>[pickMedia(d.data()),thumbId(d.data())]).filter(id=>id&&!id.includes('/')))];
 const media=ids.length?await store.getAll(...ids.map(id=>store.collection('media').doc(id))):[];
 const byId=new Map(media.map(d=>[d.id,d]));
 // Only use image thumbnails that belong to the same authorized post; never sign a video for grid tiles.
 const preview=(d:FirebaseFirestore.QueryDocumentSnapshot)=>{const x=d.data(),original=byId.get(pickMedia(x)),thumb=byId.get(thumbId(x));if(thumb?.exists&&thumb.data()?.postId===d.id&&String(thumb.data()?.contentType||'').startsWith('image/'))return thumb.id;return original?.exists&&String(original.data()?.contentType||'').startsWith('image/')?original.id:null};
 const previewIds=[...new Set(selected.map(preview).filter((id):id is string=>Boolean(id)))];
 const urls=await mintUrls(previewIds.flatMap(id=>{const doc=byId.get(id);return doc?.exists?[{id:doc.id,...doc.data()}]:[]}),{viewerUid:viewer});
 let posts=selected.map(d=>{const x=d.data(),id=pickMedia(x),original=byId.get(id)?.data(),thumb=preview(d),createdAt=x.createdAt?.toMillis?.()??0;
  const mediaType=String(original?.contentType||'');
  const playable=Boolean(reelMediaId(x)&&original?.status==='uploaded'&&original?.postId===d.id&&mediaType.startsWith('video/')&&/^[0-9a-f-]{36}$/.test(id));
  return {id:d.id,caption:String(x.caption||''),type:reelMediaId(x)&&mediaType.startsWith('video/')?'reel':profileContentKind(x,mediaType),authorUid:String(x.authorUid||''),authorHandle:String(x.authorHandle||''),previewUrl:playable?'/api/media?id='+encodeURIComponent(id):null,thumbUrl:thumb?urls[thumb]?.url??null:null,mediaUrl:thumb?urls[thumb]?.url??null:null,mediaType,hideLikeCount:x.hideLikeCount===true,likes:x.hideLikeCount===true?0:Number(x.counters?.likes||0),comments:Number(x.counters?.comments||0),reposts:Number(x.counters?.reposts||0),saves:Number(x.counters?.saves||0),createdAt,mediaCount:Array.isArray(x.media)?x.media.length:1,width:Number(original?.width)||null,height:Number(original?.height)||null};
 });
 if(opts.sort==='top'||(!opts.tag&&!opts.text))posts=[...posts].sort((a,b)=>exploreScore(b,Date.now())-exploreScore(a,Date.now())||b.createdAt-a.createdAt);
 return {items:posts,nextCursor:lastScanned&&(lastScanned.id!==snap.docs.at(-1)?.id||snap.size===120)?lastScanned.id:null};
}
