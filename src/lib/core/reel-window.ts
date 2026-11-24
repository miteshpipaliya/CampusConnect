export function windowRange(active:number,total:number,radius=1):{start:number;end:number}{
 if(!Number.isInteger(total)||total<=0)return {start:0,end:-1};
 const index=Math.min(total-1,Math.max(0,Number.isFinite(active)?Math.trunc(active):0));
 const r=Number.isFinite(radius)?Math.max(0,Math.trunc(radius)):1;
 return {start:Math.max(0,index-r),end:Math.min(total-1,index+r)};
}
