'use client';
import type {CSSProperties} from 'react';
/** Only render when server-authorized and Stream confirms the user is online. */
export function OnlineIndicator({online,allowed=true,size=10}:{online:boolean;allowed?:boolean;size?:number}){
 if(!allowed||!online)return null;
 const style:CSSProperties={position:'absolute',right:0,bottom:0,width:size,height:size,borderRadius:'50%',background:'#22c55e',border:'2px solid var(--cc-surface, #fff)',boxSizing:'content-box',pointerEvents:'none'};
 return <span aria-label="Online" title="Online" role="img" style={style}/>;
}
