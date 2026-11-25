import 'server-only';
import {FieldPath,type DocumentSnapshot} from 'firebase-admin/firestore';
import {db} from './services';
import {canViewMany} from './privacy';
import {hydrateAvatars} from './avatar-hydration';
import {eligible} from './referrals';
async function publicStudents(viewer:string,ids:string[]){
 const unique=[...new Set(ids)];const visible=await canViewMany(viewer,unique);
 const avatars=await hydrateAvatars(unique.filter(id=>visible.get(id)),viewer);
 return (id:string)=>{const p=avatars[id];return visible.get(id)&&p?{handle:p.handle,name:p.name,avatarUrl:p.avatarUrl}:null};
}
function competitionView(doc:DocumentSnapshot){const d=doc.data();return d?{id:doc.id,title:String(d.title),status:d.status==='finalized'?'finalized':Date.now()>=Number(d.endAt)?'ended':Date.now()<Number(d.startAt)?'scheduled':'active',startAt:Number(d.startAt),endAt:Number(d.endAt),rulesVersion:Number(d.rulesVersion||1)}:null}
export async function referralDashboard(uid:string,origin:string,page:number){
 const store=db(),profile=(await store.collection('users').doc(uid).get()).data(),stats=(await store.collection('referralStats').doc(uid).get()).data();
 const history=await store.collection('referrals').where('referrerUid','==',uid).orderBy('createdAt','desc').offset(page*20).limit(21).get();
 const rows=history.docs.slice(0,20);const student=await publicStudents(uid,rows.map(d=>d.id));
 const code=eligible(profile)&&typeof profile?.referralCode==='string'?profile.referralCode:null;
 return {code,link:code?origin+'/r/'+code:null,lifetime:Number(stats?.totalEligibleReferrals||0),history:rows.map(d=>({student:student(d.id),createdAt:Number(d.data().createdAt),status:String(d.data().status)})),hasMore:history.size>20};
}
export async function referralLeaderboard(uid:string,page:number,requested?:string){
 const store=db(),current=(await store.collection('referralConfig').doc('current').get()).data();
 const cid=requested??(typeof current?.competitionId==='string'?current.competitionId:null);
 const lifetime=Number((await store.collection('referralStats').doc(uid).get()).data()?.totalEligibleReferrals||0);
 const competitions=(await store.collection('referralCompetitions').orderBy('startAt','desc').limit(30).get()).docs.map(competitionView).filter(Boolean);
 if(!cid)return {competition:null,competitions,rows:[],podium:[],me:{rank:null,count:0,lifetime,needed:null},hasMore:false,serverNow:Date.now()};
 const comp=store.collection('referralCompetitions').doc(cid),snapshot=await comp.get(),competition=competitionView(snapshot);
 if(!competition)return {competition:null,competitions,rows:[],podium:[],me:{rank:null,count:0,lifetime,needed:null},hasMore:false,serverNow:Date.now()};
 const scores=comp.collection('scores'),order=scores.where('count','>',0).orderBy('count','desc').orderBy('reachedAt','asc').orderBy(FieldPath.documentId(),'asc');
 const [result,top,own]=await Promise.all([order.offset(page*20).limit(21).get(),order.limit(3).get(),scores.doc(uid).get()]);
 const visibleRows=result.docs.slice(0,20);
 const student=await publicStudents(uid,[...visibleRows,...top.docs].map(d=>d.id));
 const row=(d:DocumentSnapshot,rank:number)=>({rank,student:student(d.id),count:Number(d.data()?.count||0),self:d.id===uid});
 const count=Number(own.data()?.count||0);
 let rank:number|null=null,needed:number|null=null;
 if(count>0){const before=await order.endBefore(own).count().get();rank=before.data().count+1;if(rank>1){const next=await order.offset(rank-2).limit(1).get();if(next.docs[0])needed=Number(next.docs[0].data().count)-count+1}}
 else if(top.docs[0]){const total=await order.count().get();if(total.data().count){const tail=await order.offset(total.data().count-1).limit(1).get();if(tail.docs[0])needed=Number(tail.docs[0].data().count)+1}}
 return {competition,competitions,rows:visibleRows.map((d,i)=>row(d,page*20+i+1)),podium:top.docs.map((d,i)=>row(d,i+1)),me:{rank,count,lifetime,needed},hasMore:result.size>20,serverNow:Date.now()};
}
