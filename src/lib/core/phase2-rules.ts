export function handleChangesAllowed(history:unknown,now:number,windowMs=14*86400000,maxChanges=2):boolean{
 if(!Array.isArray(history))return true;
 return history.filter(t=>typeof t==='number'&&Number.isFinite(t)&&t>now-windowMs&&t<=now).length<maxChanges;
}
export function deletionDue(deletedAtMs:number|null,now:number,retentionDays=30):boolean{
 return deletedAtMs!==null&&Number.isFinite(deletedAtMs)&&deletedAtMs<=now-retentionDays*86400000;
}
export function cropRect(imgWidth:number,imgHeight:number,size:number,zoom:number,panX:number,panY:number){
 const w=imgWidth*Math.max(size/imgWidth,size/imgHeight)*zoom;
 const h=imgHeight*Math.max(size/imgWidth,size/imgHeight)*zoom;
 const x=(size-w)/2+Math.max(-1,Math.min(1,panX))*Math.max(0,w-size)/2;
 const y=(size-h)/2+Math.max(-1,Math.min(1,panY))*Math.max(0,h-size)/2;
 return {x,y,w,h};
}
