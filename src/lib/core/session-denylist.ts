/** An existing revocation record is authoritative until its expiry. Invalid records fail closed. */
export function isRevoked(exists:boolean,expiresAtMs:unknown,now:number):boolean{return exists&&(typeof expiresAtMs!=='number'||!Number.isFinite(expiresAtMs)||expiresAtMs>now)}
