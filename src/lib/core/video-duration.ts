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

/** WebM Info.Duration in milliseconds, using EBML's default 1ms timecode scale. */
export function parseWebmDuration(bytes:Uint8Array):number|null{
 let scale=1000000,duration:number|null=null;
 const limit=bytes.length;
 const vint=(at:number,forSize:boolean):{value:number;length:number}|null=>{
  if(at>=limit)return null;
  const first=bytes[at]??0;if(!first)return null;
  let mask=128,length=1;while(length<=8&&!(first&mask)){mask>>=1;length++}
  if(length>8||at+length>limit)return null;
  let value=forSize?(first&(mask-1)):first;
  for(let i=1;i<length;i++)value=value*256+(bytes[at+i]??0);
  if(!Number.isSafeInteger(value))return null;
  return {value,length};
 };
 const walk=(start:number,end:number,depth:number):void=>{
  if(depth>6)return;
  for(let pos=start;pos<end;){
   const id=vint(pos,false);if(!id)return;
   const size=vint(pos+id.length,true);if(!size)return;
   const at=pos+id.length+size.length,finish=at+size.value;
   if(finish>end){
    // Matroska segments may use an unknown size. Parse only the bytes available.
    const unknownSize= size.value===Math.pow(2,7*size.length)-1;
    if(!unknownSize)return;
   }
   const boundedFinish=Math.min(finish,end);
   if(id.value===0x2ad7b1&&size.value<=8){
    scale=0;for(let i=at;i<finish;i++)scale=scale*256+(bytes[i]??0);
   }else if(id.value===0x4489&&(size.value===4||size.value===8)){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    duration=size.value===4?view.getFloat32(at,false):view.getFloat64(at,false);
   }else if(id.value===0x18538067||id.value===0x1549a966)walk(at,boundedFinish,depth+1);
   pos=boundedFinish;
  }
 };
 walk(0,limit,0);
 return duration!==null&&Number.isFinite(duration)&&duration>0&&scale>0?duration*scale/1000000000:null;
}
