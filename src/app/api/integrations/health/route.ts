import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {ListObjectsV2Command} from '@aws-sdk/client-s3';
import {auth,db,storage} from '@/lib/server/services';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Health={firebaseAuth:boolean;firestore:boolean;r2:boolean};
let cached:{at:number;services:Health}|null=null,inflight:Promise<Health>|null=null;
async function probe():Promise<Health>{
 const checks=await Promise.allSettled([
  Promise.resolve().then(()=>auth().getUser('health-probe')).catch(e=>{if((e as {code?:string}).code!=='auth/user-not-found')throw e}),
  Promise.resolve().then(()=>db().collection('_health').limit(1).get()),
  (async()=>{const {client,Bucket}=storage();await client.send(new ListObjectsV2Command({Bucket,MaxKeys:1}),{abortSignal:AbortSignal.timeout(5000)})})()
 ]);
 return {firebaseAuth:checks[0].status==='fulfilled',firestore:checks[1].status==='fulfilled',r2:checks[2].status==='fulfilled'};
}
async function health(){if(cached&&Date.now()-cached.at<30000)return cached.services;if(!inflight)inflight=probe().then(services=>{cached={at:Date.now(),services};return services}).finally(()=>{inflight=null});return inflight}
function detailed(req:NextRequest){const secret=process.env.HEALTH_SECRET;if(!secret)return false;const a=Buffer.from(req.headers.get('authorization')||''),b=Buffer.from('Bearer '+secret);return a.length===b.length&&timingSafeEqual(a,b)}
export async function GET(req:NextRequest){
 let services:Health;try{services=await health()}catch{services={firebaseAuth:false,firestore:false,r2:false}}
 const ready=Object.values(services).every(Boolean);
 return NextResponse.json({status:ready?'ready':'degraded',...(detailed(req)?{services}:{})},{status:ready?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
