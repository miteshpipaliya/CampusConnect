import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {dayDocId,utcDay} from '../core/daily-stats';
/** Best effort, unique per owner+viewer per UTC calendar day. */
export async function recordProfileVisit(ownerUid:string,viewerUid:string):Promise<void>{
 if(!ownerUid||!viewerUid||ownerUid===viewerUid)return;
 const store=db(),day=utcDay(Date.now()),stats=store.collection('dailyStats').doc(dayDocId(ownerUid,day));
 const visitor=stats.collection('viewers').doc(viewerUid);
 await store.runTransaction(async tx=>{
  const previous=await tx.get(visitor);
  if(previous.exists)return;
  tx.create(visitor,{viewerUid,day,createdAt:FieldValue.serverTimestamp()});
  tx.set(stats,{ownerUid,day,profileVisits:FieldValue.increment(1)},{merge:true});
 });
}
export async function recordDailyView(ownerUid:string,field:'views'|'storyViews',isNew:boolean):Promise<void>{
 if(!ownerUid||!isNew)return;
 const store=db(),day=utcDay(Date.now()),ref=store.collection('dailyStats').doc(dayDocId(ownerUid,day));
 await ref.set({ownerUid,day,[field]:FieldValue.increment(1),...(field==='views'?{reach:FieldValue.increment(1)}:{})},{merge:true});
}
