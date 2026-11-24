import 'server-only';
import {db} from './services';
import {canViewPrivacy,isPrivateAccount} from '../core/privacy-rules';
/** Resolve each distinct author once and reuse results throughout a request. */
export async function canViewMany(viewerUid:string,authorUids:string[]):Promise<Map<string,boolean>>{
 const unique=[...new Set(authorUids.filter(Boolean))],out=new Map<string,boolean>();
 const others=unique.filter(uid=>uid!==viewerUid);
 if(unique.includes(viewerUid))out.set(viewerUid,true);
 if(!others.length)return out;
 const store=db();
 const viewer=await store.collection('users').doc(viewerUid).get();
 if(!viewer.exists||viewer.data()?.deletedAt){for(const uid of others)out.set(uid,false);return out}
 // Firestore getAll batches reference reads and avoids N separate network round trips.
 for(let i=0;i<others.length;i+=80){
  const ids=others.slice(i,i+80);
  const refs=ids.flatMap(uid=>[
   store.collection('users').doc(uid),
   store.collection('follows').doc(viewerUid+'_'+uid),
   store.collection('blocks').doc(viewerUid+'_'+uid),
   store.collection('blocks').doc(uid+'_'+viewerUid)
  ]);
  const docs=await store.getAll(...refs);
  ids.forEach((uid,j)=>{
   const [target,follow,ab,ba]=docs.slice(j*4,j*4+4);
   out.set(uid,Boolean(target?.exists&&!target.data()?.deletedAt&&canViewPrivacy({
    self:false,blocked:Boolean(ab?.exists||ba?.exists),
    privateAccount:isPrivateAccount(target.data()),activeFollower:follow?.data()?.status==='active'
   })));
  });
 }
 return out;
}
export async function canViewAuthor(viewerUid:string,authorUid:string):Promise<boolean>{
 return (await canViewMany(viewerUid,[authorUid])).get(authorUid)??false;
}
export async function isBlockedEitherWay(a:string,b:string):Promise<boolean>{
 if(a===b)return false;
 const store=db(),[ab,ba]=await store.getAll(store.collection('blocks').doc(a+'_'+b),store.collection('blocks').doc(b+'_'+a));
 return Boolean(ab?.exists||ba?.exists);
}

/** Batch-read block edges for account discovery. Private account summaries are
 * searchable, but either block direction must exclude the person. */
export async function blockedEitherWayMany(viewer:string,uids:string[]):Promise<Set<string>>{
 const ids=[...new Set(uids.filter(uid=>uid&&uid!==viewer))];
 const denied=new Set<string>(),store=db();
 for(let i=0;i<ids.length;i+=80){
  const group=ids.slice(i,i+80);
  const snaps=await store.getAll(...group.flatMap(uid=>[
   store.collection('blocks').doc(viewer+'_'+uid),
   store.collection('blocks').doc(uid+'_'+viewer)
  ]));
  group.forEach((uid,j)=>{if(snaps[j*2]?.exists||snaps[j*2+1]?.exists)denied.add(uid)});
 }
 return denied;
}
