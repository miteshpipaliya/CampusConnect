import 'server-only';
import {FieldValue,FieldPath} from 'firebase-admin/firestore';
import {db} from './services';
import {backfillReferrals} from './referrals';
export {backfillReferrals};
const MAX_REFERRALS=5000,MAX_SCORES=400;
type AdminAction={action:'competition';title:string;startAt:number;endAt:number}|{action:'edit';id:string;title:string;startAt:number;endAt:number}|{action:'finalize';id:string}|{action:'disqualify';id:string;reason:string}|{action:'review';id:string;status:'flagged'|'cleared';reason:string}|{action:'reconcile';handle:string}|{action:'backfill';cursor?:string|undefined};
export async function manageReferrals(actor:string,input:AdminAction){
 const store=db(),audit=store.collection('referralAuditLogs').doc(),pointer=store.collection('referralConfig').doc('current');
 if(input.action==='backfill'){const result=await backfillReferrals(input.cursor);await audit.create({actorUid:actor,action:input.action,timestamp:FieldValue.serverTimestamp(),metadata:{issued:result.issued,failed:result.failed}});return result}
 return store.runTransaction(async tx=>{
  const log=(details:Record<string,unknown>)=>tx.create(audit,{actorUid:actor,action:input.action,timestamp:FieldValue.serverTimestamp(),...details});
  if(input.action==='competition'||input.action==='edit'){
   if(input.endAt<=input.startAt||input.endAt-input.startAt>30*86400000||input.startAt<Date.now()-60000)throw Error('Dates must define a future competition of up to 30 days');
   const current=(await tx.get(pointer)).data();const id=input.action==='edit'?input.id:store.collection('referralCompetitions').doc().id;
   const ref=store.collection('referralCompetitions').doc(id);
   const prev=typeof current?.competitionId==='string'?await tx.get(store.collection('referralCompetitions').doc(current.competitionId)):null;
   if(input.action==='edit'){
    const old=await tx.get(ref);if(!old.exists||old.data()?.status!=='active'||Number(old.data()?.startAt)<=Date.now()||current?.competitionId!==id)throw Error('Only the scheduled current competition can be edited');
   }else if(prev?.exists&&prev.data()?.status!=='finalized')throw Error('Finalize the current competition first');
   tx.set(ref,{title:input.title,startAt:input.startAt,endAt:input.endAt,status:'active',rulesVersion:1,updatedAt:FieldValue.serverTimestamp(),...(input.action==='competition'?{createdAt:FieldValue.serverTimestamp()}: {})},{merge:true});tx.set(pointer,{competitionId:id});log({competitionId:id});return {ok:true,id};
  }
  if(input.action==='finalize'){
   const ref=store.collection('referralCompetitions').doc(input.id),c=(await tx.get(ref)).data();
   if(!c||c.status!=='active'||Date.now()<Number(c.endAt))throw Error('Competition must have ended and not be finalized');
   const [records,old]=await Promise.all([tx.get(store.collection('referrals').where('competitionId','==',input.id).where('status','==','eligible').limit(MAX_REFERRALS+1)),tx.get(ref.collection('scores').limit(MAX_SCORES+1))]);
   if(records.size>MAX_REFERRALS||old.size>MAX_SCORES)throw Error('Competition exceeds safe atomic finalization capacity');
   if(records.docs.some(d=>d.data().reviewStatus==='flagged'))throw Error('Resolve flagged referrals before finalization');
   const totals=new Map<string,{count:number;reachedAt:number}>();
   for(const record of records.docs){const d=record.data();if(Number(d.createdAt)<Number(c.startAt)||Number(d.createdAt)>=Number(c.endAt))continue;const uid=String(d.referrerUid),prior=totals.get(uid);totals.set(uid,{count:(prior?.count??0)+1,reachedAt:Math.max(prior?.reachedAt??0,Number(d.createdAt))})}
   if(new Set([...old.docs.map(d=>d.id),...totals.keys()]).size>MAX_SCORES)throw Error('Competition exceeds safe atomic finalization capacity');
   for(const d of old.docs)if(!totals.has(d.id))tx.delete(d.ref);
   for(const [uid,score] of totals)tx.set(ref.collection('scores').doc(uid),score);
   tx.update(ref,{status:'finalized',finalizedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});log({competitionId:input.id,metadata:{participants:totals.size,eligible:records.size}});return {ok:true};
  }
  if(input.action==='review'){
   const ref=store.collection('referrals').doc(input.id),d=(await tx.get(ref)).data();if(!d||d.status!=='eligible')throw Error('Eligible referral not found');
   const comp=typeof d.competitionId==='string'?await tx.get(store.collection('referralCompetitions').doc(d.competitionId)):null;
   if(comp?.data()?.status==='finalized')throw Error('Finalized competition results are immutable');
   tx.update(ref,{reviewStatus:input.status,reviewReason:input.reason,reviewedAt:FieldValue.serverTimestamp()});
   log({targetUid:input.id,competitionId:d.competitionId??null,reason:input.reason,metadata:{reviewStatus:input.status}});return {ok:true};
  }
  if(input.action==='disqualify'){
   const ref=store.collection('referrals').doc(input.id),d=(await tx.get(ref)).data();if(!d||d.status!=='eligible')throw Error('Eligible referral not found');
   const owner=String(d.referrerUid),comp=typeof d.competitionId==='string'?store.collection('referralCompetitions').doc(d.competitionId):null;
   const c=comp?(await tx.get(comp)).data():undefined;if(c?.status==='finalized')throw Error('Finalized competition results are immutable');
   const records=await tx.get(store.collection('referrals').where('referrerUid','==',owner).where('status','==','eligible').limit(MAX_REFERRALS+1));
   if(records.size>MAX_REFERRALS)throw Error('Referrer exceeds safe reconciliation capacity');
   const rest=records.docs.filter(x=>x.id!==input.id),same=rest.filter(x=>x.data().competitionId===d.competitionId);
   tx.update(ref,{status:'disqualified',eligibilityReason:input.reason,disqualifiedAt:FieldValue.serverTimestamp()});
   tx.set(store.collection('referralStats').doc(owner),{totalEligibleReferrals:rest.length,updatedAt:Date.now()},{merge:true});
   if(comp)tx.set(comp.collection('scores').doc(owner),{count:same.length,reachedAt:Math.max(0,...same.map(x=>Number(x.data().createdAt)))});
   log({targetUid:input.id,competitionId:d.competitionId??null,reason:input.reason});return {ok:true};
  }
  if(input.action==='reconcile'){
   const handle=(await tx.get(store.collection('handles').doc(input.handle))).data();if(typeof handle?.uid!=='string')throw Error('Student not found');const uid=handle.uid as string;
   const current=(await tx.get(pointer)).data(),comp=typeof current?.competitionId==='string'?store.collection('referralCompetitions').doc(current.competitionId):null;
   const c=comp?(await tx.get(comp)).data():undefined;
   const records=await tx.get(store.collection('referrals').where('referrerUid','==',uid).where('status','==','eligible').limit(MAX_REFERRALS+1));
   if(records.size>MAX_REFERRALS)throw Error('Referrer exceeds safe reconciliation capacity');
   tx.set(store.collection('referralStats').doc(uid),{totalEligibleReferrals:records.size,updatedAt:Date.now()},{merge:true});
   if(comp&&c?.status==='active'){const same=records.docs.filter(d=>d.data().competitionId===comp.id);tx.set(comp.collection('scores').doc(uid),{count:same.length,reachedAt:Math.max(0,...same.map(d=>Number(d.data().createdAt)))})}
   log({targetUid:uid});return {ok:true};
  }
  throw Error('Unsupported action');
 });
}
export async function adminReferralRecords(handle:string|undefined,page:number){
 const store=db();let query:FirebaseFirestore.Query=store.collection('referrals');if(handle){const h=(await store.collection('handles').doc(handle).get()).data();if(typeof h?.uid!=='string')return {rows:[],hasMore:false};query=query.where('referrerUid','==',h.uid)}
 const records=await query.orderBy('createdAt','desc').offset(page*30).limit(31).get();
 const ids=[...new Set(records.docs.flatMap(d=>[String(d.data().referrerUid),d.id]))];const profiles=ids.length?await store.getAll(...ids.map(id=>store.collection('users').doc(id))):[];
 const handles=new Map(profiles.map(p=>[p.id,p.data()?.deletedAt?'Deleted student':String(p.data()?.handle||'Unavailable student')]));
 return {rows:records.docs.slice(0,30).map(d=>({id:d.id,referrer:handles.get(String(d.data().referrerUid)),student:handles.get(d.id),method:d.data().referralMethod,status:d.data().status,createdAt:d.data().createdAt,reason:d.data().eligibilityReason??null,reviewStatus:d.data().reviewStatus??'unreviewed',reviewReason:d.data().reviewReason??null,competitionId:d.data().competitionId??null})),hasMore:records.size>30};
}
export async function exportCompetition(id:string,actor:string){const store=db(),ref=store.collection('referralCompetitions').doc(id),c=(await ref.get()).data();if(c?.status!=='finalized')throw Error('Finalize competition before export');const scores=await ref.collection('scores').where('count','>',0).orderBy('count','desc').orderBy('reachedAt','asc').orderBy(FieldPath.documentId(),'asc').limit(MAX_SCORES+1).get();if(scores.size>MAX_SCORES)throw Error('Export exceeds supported capacity');const users=scores.size?await store.getAll(...scores.docs.map(d=>store.collection('users').doc(d.id))):[];const handles=new Map(users.map(d=>[d.id,d.data()?.deletedAt?'Deleted student':String(d.data()?.handle||'Unavailable student')]));await store.collection('referralAuditLogs').doc().create({actorUid:actor,action:'export',competitionId:id,timestamp:FieldValue.serverTimestamp()});return {title:String(c.title),rows:scores.docs.map((d,i)=>({rank:i+1,handle:handles.get(d.id),count:d.data().count,reachedAt:d.data().reachedAt}))}}
