import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const REFERRAL_COOKIE='cc_referral';
export const LINK_TTL=30*86400000;
export const ONBOARDING_TTL=24*3600000;
export function normalizeCode(input:string){const code=input.trim().toUpperCase();return /^CC-[A-F0-9]{32}$/.test(code)?code:null}
export function generateCode(){return 'CC-'+randomBytes(16).toString('hex').toUpperCase()}
function mac(value:string,key:string){return createHmac('sha256',key).update(value).digest('hex')}
export function signAttribution(code:string,key:string,now=Date.now()){const value=code+'.'+(now+LINK_TTL);return value+'.'+mac('referral-link:'+value,key)}
export function readAttribution(token:string|undefined,key:string,now=Date.now()){if(!token||token.length>160)return null;const [code,expiry,signature,...rest]=token.split('.');if(rest.length||!code||!normalizeCode(code)||!expiry||!/^\d{13}$/.test(expiry)||!signature||!/^[a-f0-9]{64}$/.test(signature))return null;const until=Number(expiry);if(until<=now||until>now+LINK_TTL)return null;const expected=mac('referral-link:'+code+'.'+expiry,key);if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))return null;return {code,expiresAt:until}}
export function studentDigest(email:string,key:string){return mac('referral-student:'+email.trim().toLowerCase(),key)}
export function isOpen(status:unknown,until:unknown,now=Date.now()){return status==='pending'&&typeof until==='number'&&until>now}
export function inCompetition(c:{status?:unknown;startAt?:unknown;endAt?:unknown}|undefined,now:number){return c?.status==='active'&&typeof c.startAt==='number'&&typeof c.endAt==='number'&&now>=c.startAt&&now<c.endAt}
export function compareRank(a:{count:number;reachedAt:number;id:string},b:{count:number;reachedAt:number;id:string}){return b.count-a.count||a.reachedAt-b.reachedAt||(a.id<b.id?-1:a.id>b.id?1:0)}
