import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {Timestamp} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {deleteObject} from '@/lib/server/storage';
import {purgeAccountBatch} from '@/lib/server/purge-account';
import {safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret)return NextResponse.json({error:'Cron unavailable'},{status:503,headers:safeHeaders});
 const provided=request.headers.get('authorization')||'';
 const expected='Bearer '+secret;
 const a=Buffer.from(provided),b=Buffer.from(expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Unauthorized'},{status:401,headers:safeHeaders});
 const dryRun=process.env.CRON_DELETE_ENABLED!=='true';
 const counts:{dryRun:boolean;mediaDeleted:number;rateLimitsDeleted:number;storiesDeleted:number;accountPurge?:{stage:string;processed:number;complete:boolean}}={dryRun,mediaDeleted:0,rateLimitsDeleted:0,storiesDeleted:0};
 try{
  const store=db(),now=Date.now(),older=Timestamp.fromMillis(now-86400000);
  const pending=await store.collection('media').where('status','in',['pending','rejected']).limit(200).get();
  let processed=0;
  for(const doc of pending.docs){if(processed>=200)break;const data=doc.data();if((data.createdAt?.toMillis?.()??now)>older.toMillis())continue;processed++;counts.mediaDeleted++;if(!dryRun){if(typeof data.key==='string')await deleteObject(data.key);await doc.ref.delete()}}
  if(processed<200){const limits=await store.collection('rateLimits').where('expiresAt','<',Timestamp.now()).limit(200-processed).get();for(const doc of limits.docs){processed++;counts.rateLimitsDeleted++;if(!dryRun)await doc.ref.delete()}}
  const archiveDays=Math.min(365,Math.max(1,Number(process.env.STORY_ARCHIVE_DAYS)||30));
  if(processed<200){const stories=await store.collection('stories').where('expiresAt','<',Timestamp.fromMillis(now-archiveDays*86400000)).limit(200-processed).get();for(const doc of stories.docs){if(doc.data().highlight)continue;processed++;counts.storiesDeleted++;if(!dryRun){const id=doc.data().mediaId;if(typeof id==='string'){const media=await store.collection('media').doc(id).get();if(media.exists){const key=media.data()?.key;if(typeof key==='string')await deleteObject(key);await media.ref.delete()}}await doc.ref.delete()}}}
  if(!dryRun&&process.env.CRON_PURGE_ACCOUNTS_ENABLED==='true'){
   const due=await store.collection('users').where('deletedAt','<',Timestamp.fromMillis(now-30*86400000)).limit(1).get();
   if(!due.empty)counts.accountPurge=await purgeAccountBatch(due.docs[0]!.id,now);
  }
  return NextResponse.json(counts,{headers:safeHeaders});
 }catch{return NextResponse.json({error:'Cleanup unavailable'},{status:503,headers:safeHeaders})}
}
