import 'server-only';
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {NextRequest,NextResponse} from 'next/server';
import {AUTH_LIMITS,authRateKey,normalizeEmail,type AuthAction} from '../core/auth-limits';
import {checkRateLimit} from './rate-limit';
import {safeHeaders} from './session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function clientIp(req:NextRequest){
 const raw=(req.headers.get('x-vercel-forwarded-for')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'').split(',')[0]?.trim()||'';
 return isIP(raw)?raw.toLowerCase():'unknown';
}
export async function authThrottle(req:NextRequest,action:AuthAction,email?:string){
 const limits=AUTH_LIMITS[action];
 const ip=await checkRateLimit({key:authRateKey(action,'ip',hash(clientIp(req))),...limits.ip,failClosed:true});
 if(!ip.allowed)return NextResponse.json({error:'Too many requests. Please try again later.'},{status:429,headers:{...safeHeaders,'Retry-After':String(ip.retryAfterSec)}});
 if('email' in limits&&email){const result=await checkRateLimit({key:authRateKey(action,'email',hash(normalizeEmail(email))),...limits.email,failClosed:true});if(!result.allowed)return NextResponse.json({error:'Too many requests. Please try again later.'},{status:429,headers:{...safeHeaders,'Retry-After':String(result.retryAfterSec)}})}
 return null;
}
