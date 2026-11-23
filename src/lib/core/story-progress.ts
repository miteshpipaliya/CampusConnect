export function storyDurationMs(type:string,durationSec?:number|null):number{
 return type.startsWith('video/')&&typeof durationSec==='number'&&Number.isFinite(durationSec)?Math.max(1000,Math.min(60000,durationSec*1000)):5000;
}
export function storyProgress(elapsedMs:number,durationMs:number):number{
 if(!Number.isFinite(elapsedMs)||!Number.isFinite(durationMs)||durationMs<=0)return 0;
 return Math.max(0,Math.min(1,elapsedMs/durationMs));
}
