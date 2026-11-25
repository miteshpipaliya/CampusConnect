import 'server-only';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from './services';
import {INTRO_COOKIE,readIntroProof} from '../core/introduction-proof';
import {INTRO_VERSION} from '../core/introduction';
export {INTRO_COOKIE};
export function introSecret(){const key=process.env.OTP_SIGNING_SECRET;if(!key||key.length<32)throw Error('Introduction signing unavailable');return key}
export function introCompleted(cookie:string|undefined){try{return readIntroProof(cookie,introSecret())?.completed!==undefined}catch{return false}}
export async function persistIntroduction(uid:string,cookie:string|undefined){if(!introCompleted(cookie))return;const ref=db().collection('users').doc(uid);await db().runTransaction(async tx=>{const d=await tx.get(ref);if(d.exists&&d.data()?.introductionVersion!==INTRO_VERSION)tx.update(ref,{introductionVersion:INTRO_VERSION,introductionCompleted:true,introductionCompletedAt:FieldValue.serverTimestamp()})})}
