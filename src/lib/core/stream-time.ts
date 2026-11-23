/** Stream Chat v10 returns dates as nanoseconds in some REST payloads.
 * Keep the API response stable as an ISO string for every browser and timezone.
 * Reject invalid/out-of-range timestamps instead of rendering "Invalid Date".
 */
export function streamEpochMs(value:unknown):number|null {
 if(value===null||value===undefined)return null;
 let milliseconds:number;
 if(typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value.trim())){
  milliseconds=Date.parse(value);
 }else{
  const valueNumber=typeof value==='bigint'?Number(value):typeof value==='number'?value:typeof value==='string'?Number(value.trim()):NaN;
  if(!Number.isFinite(valueNumber))return null;
  const magnitude=Math.abs(valueNumber);
  milliseconds=magnitude>=1e17?valueNumber/1e6:magnitude>=1e14?valueNumber/1e3:magnitude>=1e11?valueNumber:valueNumber*1000;
 }
 if(!Number.isFinite(milliseconds))return null;
 const time=Math.trunc(milliseconds);
 if(time<Date.UTC(2000,0,1)||time>Date.UTC(2100,0,1))return null;
 return time;
}
export function streamIso(value:unknown):string|null{
 const ms=streamEpochMs(value);return ms===null?null:new Date(ms).toISOString();
}
export function streamReadByPeer(messageTime:unknown,readTime:unknown):boolean{
 const msg=streamEpochMs(messageTime),read=streamEpochMs(readTime);
 return msg!==null&&read!==null&&read>=msg;
}
