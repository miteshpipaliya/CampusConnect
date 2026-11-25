import 'server-only';
import {createHash} from 'node:crypto';
import {db,messaging} from './services';
import {pushConfig} from './push-config';
import {canDeliverPush,PUSH_MAX_AGE_MS} from '../core/push-policy';
export const PUSH_COOKIE='cc_push_binding';
const binding=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function registerPush(uid:string,token:string){const id=binding(token);await db().collection('pushDevices').doc(id).set({ownerUid:uid,token,expiresAt:Date.now()+PUSH_MAX_AGE_MS},{merge:false});return id}
export async function revokePush(uid:string,id:string|undefined){if(!id||!(/^[a-f0-9]{64}$/).test(id))return;const store=db(),ref=store.collection('pushDevices').doc(id);await store.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.ownerUid===uid)tx.delete(ref)})}
export async function registeredPush(uid:string,id:string|undefined){if(!id||!(/^[a-f0-9]{64}$/).test(id))return false;const snap=await db().collection('pushDevices').doc(id).get();return canDeliverPush(snap.data()||{},uid)}
/** No private student names, message contents or media are sent to OS notifications. */
export async function deliverPush(uid:string,kind:'message'|'activity'){if(!pushConfig())return;const snap=await db().collection('pushDevices').where('ownerUid','==',uid).limit(20).get();const eligible=snap.docs.filter(d=>canDeliverPush(d.data(),uid));if(!eligible.length)return;const result=await messaging().sendEachForMulticast({tokens:eligible.map(d=>String(d.data().token)),data:{kind},webpush:{headers:{TTL:'120',...(kind==='message'?{Urgency:'high'}:{})}}});await Promise.all(result.responses.map(async(r,i)=>{const id=eligible[i]?.id;if(id&&(r.error?.code==='messaging/registration-token-not-registered'||r.error?.code==='messaging/invalid-registration-token'))await revokePush(uid,id)}))}
