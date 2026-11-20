import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { auth,db,storage } from '@/lib/server/services';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const checks=await Promise.allSettled([
  Promise.resolve().then(()=>auth().listUsers(1)),
  Promise.resolve().then(()=>db().collection('_health').limit(1).get()),
  (async()=>{const {client,Bucket}=storage();await client.send(new ListObjectsV2Command({Bucket,MaxKeys:1}))})()
 ]);
 const services={firebaseAuth:checks[0].status==='fulfilled',firestore:checks[1].status==='fulfilled',r2:checks[2].status==='fulfilled'};
 const ready=Object.values(services).every(Boolean);
 return NextResponse.json({status:ready?'ready':'degraded',services},{
  status:ready?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}
 });
}
