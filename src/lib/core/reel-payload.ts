export function validVideoDimension(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=16&&value<=8192}
export function reelMetadata(media:{width?:unknown;height?:unknown}|undefined,attachment:{width?:unknown;height?:unknown}|undefined,post:{location?:unknown;counters?:{shares?:unknown;saves?:unknown};commentsOff?:unknown;hideLikeCount?:unknown},verified:unknown){
 const w=media?.width,h=media?.height,aw=attachment?.width,ah=attachment?.height;
 const primary=validVideoDimension(w)&&validVideoDimension(h),fallback=validVideoDimension(aw)&&validVideoDimension(ah);
 const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
 return {width:primary?w:fallback?aw:null,height:primary?h:fallback?ah:null,location:typeof post.location==='string'?post.location:null,verified:verified===true,shares:count(post.counters?.shares),saves:count(post.counters?.saves),commentsOff:post.commentsOff===true,hideLikeCount:post.hideLikeCount===true};
}
