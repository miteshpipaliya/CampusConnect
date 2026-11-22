export function windowStart(nowMs:number,windowSec:number):number{
 if(!Number.isFinite(nowMs)||!Number.isFinite(windowSec)||windowSec<=0)throw Error('Invalid rate window');
 return Math.floor(nowMs/(windowSec*1000))*windowSec*1000;
}
export function decide(count:number,limit:number):boolean{return Number.isFinite(count)&&count<limit}
export function retryAfterSec(nowMs:number,windowSec:number):number{
 return Math.max(1,Math.ceil((windowStart(nowMs,windowSec)+windowSec*1000-nowMs)/1000));
}
