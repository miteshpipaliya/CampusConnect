export const PUSH_MAX_AGE_MS=30*86400000;
export function canDeliverPush(device:{ownerUid?:unknown;expiresAt?:unknown;token?:unknown},uid:string,now=Date.now()){return device.ownerUid===uid&&typeof device.expiresAt==='number'&&device.expiresAt>now&&typeof device.token==='string'&&device.token.length>20}
export function pushTarget(kind:unknown){return kind==='message'?'/messages':'/notifications'}
