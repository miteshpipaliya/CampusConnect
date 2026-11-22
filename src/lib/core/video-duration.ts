/** Read MP4/QuickTime mvhd duration from a bounded header. Returns null when the metadata is absent. */
export function parseMp4Duration(bytes:Uint8Array):number|null{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const scan=(start:number,end:number,depth:number):number|null=>{
  if(depth>5)return null;
  for(let at=start;at+8<=end;){
   let size=view.getUint32(at,false),header=8;
   const type=String.fromCharCode(...bytes.subarray(at+4,at+8));
   if(size===1){if(at+16>end)return null;const high=view.getUint32(at+8,false),low=view.getUint32(at+12,false);size=high*4294967296+low;header=16}
   if(size===0)size=end-at;
   if(!Number.isSafeInteger(size)||size<header||at+size>end)return null;
   if(type==='mvhd'){
    const pos=at+header,version=bytes[pos];
    if(version===0&&pos+20<=at+size){
     const timescale=view.getUint32(pos+12,false),duration=view.getUint32(pos+16,false);
     return timescale>0&&duration!==0xffffffff?duration/timescale:null;
    }
    if(version===1&&pos+32<=at+size){
     const timescale=view.getUint32(pos+20,false),duration=Number(view.getBigUint64(pos+24,false));
     return timescale>0&&Number.isSafeInteger(duration)?duration/timescale:null;
    }
    return null;
   }
   if(type==='moov'){const found=scan(at+header,at+size,depth+1);if(found!==null)return found}
   at+=size;
  }
  return null;
 };
 return scan(0,bytes.length,0);
}
export function durationWithinLimit(actual:number|null,reported:number,limit:number):boolean{
 return actual!==null&&Number.isFinite(actual)&&actual>0&&actual<=limit&&Number.isFinite(reported)&&reported>0&&Math.abs(actual-reported)<=2;
}
