import 'server-only';
import {db} from './services';

/** Synchronize derived public highlight flags after a collection is changed.
 * Legacy manually highlighted stories are never cleared by collection edits. */
export async function syncHighlightMembership(ownerUid:string,ids:string[]):Promise<void>{
 const unique=[...new Set(ids)].filter(id=>/^[A-Za-z0-9_-]{10,100}$/.test(id)).slice(0,100);
 if(!unique.length)return;
 const store=db(),highlights=await store.collection('highlights').where('ownerUid','==',ownerUid).limit(100).get();
 const linked=new Set(highlights.docs.flatMap(d=>Array.isArray(d.data().storyIds)?d.data().storyIds as string[]:[]));
 const stories=await store.getAll(...unique.map(id=>store.collection('stories').doc(id)));
 const batch=store.batch();let count=0;
 for(const story of stories){
  if(!story.exists||story.data()?.authorUid!==ownerUid)continue;
  if(linked.has(story.id)){batch.update(story.ref,{highlight:true,highlightManaged:true});count++}
  else if(story.data()?.highlightManaged===true){batch.update(story.ref,{highlight:false,highlightManaged:false});count++}
 }
 if(count)await batch.commit();
}
