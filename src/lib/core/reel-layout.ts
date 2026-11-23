/**
 * Inscribe video dimensions inside the actual player viewport without
 * stretching the source. The action rail is already subtracted by the caller.
 */
export function fitReelFrame(availableWidth:number,availableHeight:number,sourceAspectRatio:number){
 if(!Number.isFinite(availableWidth)||!Number.isFinite(availableHeight)||availableWidth<=0||availableHeight<=0)return {width:0,height:0};
 const aspect=Number.isFinite(sourceAspectRatio)&&sourceAspectRatio>0
  ?Math.max(.45,Math.min(2.5,sourceAspectRatio))
  :9/16;
 const fittedWidth=Math.min(availableWidth,availableHeight*aspect);
 const fittedHeight=Math.min(availableHeight,fittedWidth/aspect);
 return {width:Math.max(1,Math.round(fittedWidth)),height:Math.max(1,Math.round(fittedHeight))};
}
