/** Stable pseudo-random interior frame, avoiding the start and end of the clip. */
export function reelPreviewTime(id:string,duration:number):number{
 if(!Number.isFinite(duration)||duration<=0)return 0;
 let hash=2166136261;for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619);
 return Math.min(Math.max(0,duration-.05),duration*(.2+((hash>>>0)/4294967295)*.6));
}
