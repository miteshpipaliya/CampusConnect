import {randomInt,createHmac,timingSafeEqual} from 'node:crypto';
export const REFERRAL_COOKIE='cc_referral';
export const LINK_TTL=30*86400000;
export const ONBOARDING_TTL=24*3600000;
export function normalizeCode(input:string){const code=input.trim().toUpperCase();return /^CC-(?:[A-Z0-9]{4}|[A-F0-9]{32})$/.test(code)?code:null}
export function isShortCode(code:string){return /^CC-[A-Z0-9]{4}$/.test(code)}
export function generateCode(){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let suffix='';do{suffix=Array.from({length:4},()=>alphabet[randomInt(alphabet.length)]!).join('')}while(!/[A-Z]/.test(suffix)||!/[0-9]/.test(suffix));return 'CC-'+suffix}
function mac(value:string,key:string){return createHmac('sha256',key).update(value).digest('hex')}
export function signAttribution(code:string,key:string,now=Date.now()){const value=code+'.'+(now+LINK_TTL);return value+'.'+mac('referral-link:'+value,key)}
export function readAttribution(token:string|undefined,key:string,now=Date.now()){if(!token||token.length>160)return null;const [code,expiry,signature,...rest]=token.split('.');if(rest.length||!code||!normalizeCode(code)||!expiry||!/^\d{13}$/.test(expiry)||!signature||!/^[a-f0-9]{64}$/.test(signature))return null;const until=Number(expiry);if(until<=now||until>now+LINK_TTL)return null;const expected=mac('referral-link:'+code+'.'+expiry,key);if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))return null;return {code,expiresAt:until}}
export function studentDigest(email:string,key:string){return mac('referral-student:'+email.trim().toLowerCase(),key)}
export function isOpen(status:unknown,until:unknown,now=Date.now()){return status==='pending'&&typeof until==='number'&&until>now}
export function inCompetition(c:{status?:unknown;startAt?:unknown;endAt?:unknown}|undefined,now:number){return c?.status==='active'&&typeof c.startAt==='number'&&typeof c.endAt==='number'&&now>=c.startAt&&now<c.endAt}
export function compareRank(a:{count:number;reachedAt:number;id:string},b:{count:number;reachedAt:number;id:string}){return b.count-a.count||a.reachedAt-b.reachedAt||(a.id<b.id?-1:a.id>b.id?1:0)}

/** Code and URL are produced together from the canonical reserved short code. */
export function referralInvite(origin:string,stored:unknown){const code=typeof stored==='string'?normalizeCode(stored):null;if(!code||!isShortCode(code))return {code:null,link:null};return {code,link:new URL('/r/'+code,origin).href}}
