/** Bounded token bucket with an injected clock. */
export function createTokenBucket(maxKeys=4096,now:()=>number=Date.now){
 const entries=new Map<string,{tokens:number;at:number}>();
 return {take(key:string,limit:number,windowSec=60){const time=now(),old=entries.get(key),capacity=Math.max(1,limit),rate=capacity/(Math.max(1,windowSec)*1000);const tokens=Math.min(capacity,(old?.tokens??capacity)+Math.max(0,time-(old?.at??time))*rate);const allowed=tokens>=1,remaining=allowed?tokens-1:tokens;entries.delete(key);while(entries.size>=Math.max(1,maxKeys)){const first=entries.keys().next().value;if(first===undefined)break;entries.delete(first)}entries.set(key,{tokens:remaining,at:time});return {allowed,nearLimit:remaining<=capacity*.2,retryAfterSec:allowed?0:Math.max(1,Math.ceil((1-tokens)/rate/1000))}},size:()=>entries.size};
}
