import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {INTRO_DURATION,INTRO_SHA256,INTRO_VERSION} from './introduction.ts';
export const INTRO_COOKIE='cc_intro_v1';
const START_TTL=30*60*1000,COMPLETED_TTL=30*86400000;
type Proof={v:string;asset:string;nonce:string;started:number;completed?:number;expires:number};
const signature=(body:string,key:string)=>createHmac('sha256',key).update('campus-introduction:'+body).digest('base64url');
const encode=(p:Proof,key:string)=>{const body=Buffer.from(JSON.stringify(p)).toString('base64url');return body+'.'+signature(body,key)};
export function newIntroProof(key:string,now=Date.now()){return encode({v:INTRO_VERSION,asset:INTRO_SHA256,nonce:randomBytes(24).toString('hex'),started:now,expires:now+START_TTL},key)}
export function readIntroProof(token:string|undefined,key:string,now=Date.now()):Proof|null{
 if(!token||token.length>2048||key.length<32)return null;
 try{const [body,mac,...rest]=token.split('.');if(!body||!mac||rest.length)return null;const a=Buffer.from(mac),b=Buffer.from(signature(body,key));if(a.length!==b.length||!timingSafeEqual(a,b))return null;const p=JSON.parse(Buffer.from(body,'base64url').toString()) as Proof;
 if(p.v!==INTRO_VERSION||p.asset!==INTRO_SHA256||!(/^[a-f0-9]{48}$/).test(p.nonce)||!Number.isSafeInteger(p.started)||p.started>now||!Number.isSafeInteger(p.expires)||p.expires<=now)return null;
 if(p.completed!==undefined&&(!Number.isSafeInteger(p.completed)||p.completed<p.started||p.completed>now))return null;return p}catch{return null}
}
export function finishIntroProof(token:string|undefined,key:string,now=Date.now()){
 const p=readIntroProof(token,key,now);if(!p)return null;if(p.completed!==undefined)return token!;
 // The server can enforce elapsed time, not prove that a human listened.
 if(now-p.started<Math.floor((INTRO_DURATION-1)*1000))return null;
 return encode({...p,completed:now,expires:now+COMPLETED_TTL},key)
}
