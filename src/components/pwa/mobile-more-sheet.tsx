'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {PushToggleRow} from '../push-settings';
import {InstallPrompt} from './install-prompt';
export function MobileMoreSheet({open,onClose,onLogout,error}:{open:boolean;onClose:()=>void;onLogout:()=>void;error:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close()},[open]);
 return <dialog ref={ref} className="cc-pwa-more" aria-label="More options" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="cc-pwa-more-content"><div className="cc-pwa-handle"/><header><strong>More</strong><button type="button" onClick={onClose} aria-label="Close more options">×</button></header>{[['Settings','/settings'],['Saved','/settings/saved'],['Community','/home?section=community'],['Dashboard','/dashboard'],['Leaderboard','/leaderboard']].map(([label,href])=><Link key={label} href={href!} onClick={onClose}>{label}</Link>)}<PushToggleRow/><InstallPrompt row/><button type="button" onClick={onLogout}>Log out</button>{error&&<p role="alert">{error}</p>}</div></dialog>
}
