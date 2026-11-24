export function normalizeVolume(value:number):number{return Number.isFinite(value)?Math.min(1,Math.max(0,value)):1}
export function mayRetryMuted(error:unknown,volume:number):boolean{return volume>0&&typeof error==='object'&&error!==null&&'name' in error&&error.name==='NotAllowedError'}
