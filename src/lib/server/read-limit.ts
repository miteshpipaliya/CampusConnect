import 'server-only';
import {NextResponse} from 'next/server';
import {createTokenBucket} from '../core/token-bucket';
import {checkRateLimit} from './rate-limit';
import {safeHeaders} from './session';
const bucket=createTokenBucket();
export async function readLimit(uid:string,route:string,limit:number){
 const key='read:'+route+':'+uid;
 const local=bucket.take(key,limit,60);
 if(!local.allowed)return NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(local.retryAfterSec)}});
 if(local.nearLimit){const remote=await checkRateLimit({key,limit:Math.max(1,Math.ceil(limit*.2)),windowSec:60,failClosed:true});if(!remote.allowed)return NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(remote.retryAfterSec)}})}
 return null;
}
