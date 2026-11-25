import 'server-only';
import {FieldPath,FieldValue,type Transaction,type DocumentData} from 'firebase-admin/firestore';
import {auth,db} from './services';
import {isAllowedEmail} from '../student-email';
import {generateCode,normalizeCode,isShortCode,readAttribution,studentDigest,isOpen,inCompetition,ONBOARDING_TTL} from '../core/referral-policy';
export function referralSecret(){const key=process.env.REFERRAL_SIGNING_SECRET||process.env.OTP_SIGNING_SECRET;if(!key||key.length<32)throw Error('Referral signing unavailable');return key}
export function institutional(email:unknown){return typeof email==='string'&&isAllowedEmail(email,'')}
export function eligible(d:DocumentData|undefined){return Boolean(d&&institutional(d.email)&&d.verifiedInstitutionalEmail===true&&!d.deletedAt&&!d.suspendedAt)}
async function getIdentity(uid:string){return auth().getUser(uid).catch(e=>{if((e as {code?:string}).code==='auth/user-not-found')return null;throw e})}
export async function activeOwner(code:string){const store=db(),idx=(await store.collection('referralCodes').doc(code).get()).data();if(idx?.status!=='active'||typeof idx.uid!=='string')return null;const [p,u]=await Promise.all([store.collection('users').doc(idx.uid).get(),getIdentity(idx.uid)]);return eligible(p.data())&&u?.emailVerified&&!u.disabled&&institutional(u.email)?idx.uid as string:null}
export async function registrationFields(tx:Transaction,email:string,fresh:boolean,token:string|undefined){
 if(!institutional(email))return {referralCodeEntryStatus:'skipped'};
 const key=referralSecret(),ledger=db().collection('referralStudents').doc(studentDigest(email,key)),prior=await tx.get(ledger);
 if(!prior.exists)tx.create(ledger,{firstSeenAt:FieldValue.serverTimestamp()});
 const now=Date.now(),link=token?readAttribution(token,key,now):null;
 return fresh&&!prior.exists?{referralCodeEntryStatus:'pending',referralUntil:now+ONBOARDING_TTL,referralLinkPending:link?.code??null,referralLinkExpires:link?.expiresAt??0}:{referralCodeEntryStatus:'skipped'};
}
export async function ensureReferralCode(uid:string){
 const store=db(),ref=store.collection('users').doc(uid);
 const identity=await getIdentity(uid);
 if(!identity?.emailVerified||identity.disabled||!institutional(identity.email))return null;
 for(let attempt=0;attempt<32;attempt++){
  const candidate=generateCode();
  const result=await store.runTransaction(async tx=>{
   const profile=(await tx.get(ref)).data();if(!eligible(profile))return {code:null,collision:false};
   const ledger=store.collection('referralStudents').doc(studentDigest(String(profile!.email),referralSecret()));
   const old=normalizeCode(String(profile!.referralCode??''));
   const index=store.collection('referralCodes').doc(candidate);
   const oldRef=old?store.collection('referralCodes').doc(old):null;
   const [reserved,known,previous]=await Promise.all([tx.get(index),tx.get(ledger),oldRef?tx.get(oldRef):Promise.resolve(null)]);
   if(old&&(!previous?.exists||previous.data()?.uid!==uid||previous.data()?.status!=='active'))return {code:null,collision:false};
   if(old&&isShortCode(old)){if(!known.exists)tx.create(ledger,{firstSeenAt:FieldValue.serverTimestamp()});return {code:old,collision:false}}
   if(reserved.exists)return {code:null,collision:true};
   tx.create(index,{uid,status:'active',createdAt:FieldValue.serverTimestamp()});
   if(!known.exists)tx.create(ledger,{firstSeenAt:FieldValue.serverTimestamp()});
   // Keep the old reservation active as a permanent alias; never delete or reassign it.
   tx.update(ref,{referralCode:candidate,...(old?{referralLegacyCode:old,referralCodeShortenedAt:FieldValue.serverTimestamp()}:{referralCodeCreatedAt:FieldValue.serverTimestamp()})});
   return {code:candidate,collision:false};
  });
  if(!result.collision)return result.code;
 }
 throw Error('Referral code reservation failed');
}
export type ReferralAction='bootstrap'|'apply'|'skip';
export async function settleReferral(uid:string,action:ReferralAction,manual?:string){
 const store=db(),profile=store.collection('users').doc(uid),relationship=store.collection('referrals').doc(uid);
 const preliminary=(await profile.get()).data();if(!eligible(preliminary))return 'closed' as const;
 if(!isOpen(preliminary?.referralCodeEntryStatus,preliminary?.referralUntil))return 'closed' as const;
 const pending=typeof preliminary?.referralLinkPending==='string'&&Number(preliminary.referralLinkExpires)>Date.now()?normalizeCode(preliminary.referralLinkPending):null;
 const chosen=pending??(action==='apply'?normalizeCode(manual??''):null);
 const owner=chosen?await activeOwner(chosen):null;
 return store.runTransaction(async tx=>{
  const [student,existing]=await Promise.all([tx.get(profile),tx.get(relationship)]);const d=student.data(),now=Date.now();
  if(!eligible(d)||existing.exists||!isOpen(d?.referralCodeEntryStatus,d?.referralUntil,now))return 'closed' as const;
  const link=typeof d?.referralLinkPending==='string'&&Number(d.referralLinkExpires)>now?normalizeCode(d.referralLinkPending):null;
  if(link!==pending)return 'retry' as const;
  if(!chosen){if(action==='skip'){tx.update(profile,{referralCodeEntryStatus:'skipped',referralOnboardingCompletedAt:FieldValue.serverTimestamp(),referralLinkPending:FieldValue.delete()});return 'skipped' as const}return action==='apply'?'invalid' as const:'pending' as const}
  const index=store.collection('referralCodes').doc(chosen),idx=(await tx.get(index)).data();
  const ownerProfile=owner?await tx.get(store.collection('users').doc(owner)):null;
  if(!owner||owner===uid||idx?.uid!==owner||idx?.status!=='active'||!eligible(ownerProfile?.data())){
   if(link){tx.update(profile,{referralLinkPending:FieldValue.delete(),referralLinkExpires:FieldValue.delete()});return 'pending' as const}return 'invalid' as const;
  }
  const pointer=(await tx.get(store.collection('referralConfig').doc('current'))).data();
  const cid=typeof pointer?.competitionId==='string'?pointer.competitionId:null;
  const comp=cid?store.collection('referralCompetitions').doc(cid):null;
  const competition=comp?(await tx.get(comp)).data():undefined;
  const competitionId=comp&&inCompetition(competition,now)?cid:null;
  const stats=store.collection('referralStats').doc(owner);
  const score=competitionId&&comp?comp.collection('scores').doc(owner):null;
  // All reads precede writes. UID document creation is the unique attribution lock.
  tx.create(relationship,{referrerUid:owner,referredUid:uid,referralCode:chosen,referralMethod:link?'link':'manual_code',createdAt:now,verifiedAt:now,status:'eligible',competitionId});
  tx.set(stats,{totalEligibleReferrals:FieldValue.increment(1),updatedAt:now},{merge:true});
  if(score)tx.set(score,{count:FieldValue.increment(1),reachedAt:now},{merge:true});
  tx.update(profile,{referredBy:owner,referralCodeEntryStatus:'applied',referralOnboardingCompletedAt:FieldValue.serverTimestamp(),referralLinkPending:FieldValue.delete(),referralLinkExpires:FieldValue.delete()});
  return 'applied' as const;
 });
}
export async function backfillReferrals(cursor:string|undefined){
 const store=db();let query=store.collection('users').orderBy(FieldPath.documentId()).limit(50);
 if(cursor)query=query.startAfter(cursor);
 const page=await query.get();let issued=0,failed=0;
 for(let i=0;i<page.docs.length;i+=5)await Promise.all(page.docs.slice(i,i+5).map(async doc=>{try{if(await ensureReferralCode(doc.id))issued++}catch{failed++;console.error('Referral backfill record failed')}}));
 return {issued,failed,next:page.size===50?page.docs.at(-1)?.id??null:null};
}
