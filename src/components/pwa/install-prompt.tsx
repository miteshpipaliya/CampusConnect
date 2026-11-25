'use client';
import {useEffect,useState} from 'react';
import {isIOS,isStandalone} from '@/lib/client/pwa-device';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
let deferred:InstallEvent|null=null;
export function InstallCapture(){useEffect(()=>{const capture=(e:Event)=>{e.preventDefault();deferred=e as InstallEvent;window.dispatchEvent(new Event('cc-install-ready'))};const installed=()=>{deferred=null;window.dispatchEvent(new Event('cc-install-ready'))};window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',installed)}},[]);return null}
export function InstallPrompt({row=false}:{row?:boolean}){
 const [available,setAvailable]=useState(false),[dismissed,setDismissed]=useState(false),[help,setHelp]=useState(false);
 useEffect(()=>{const refresh=()=>setAvailable(!isStandalone()&&(Boolean(deferred)||isIOS()));refresh();try{setDismissed(Date.now()-Number(localStorage.getItem('cc-install-dismissed')||0)<14*86400000)}catch{}window.addEventListener('cc-install-ready',refresh);return()=>window.removeEventListener('cc-install-ready',refresh)},[]);
 const dismiss=()=>{setDismissed(true);try{localStorage.setItem('cc-install-dismissed',String(Date.now()))}catch{}};
 async function install(){if(deferred){const event=deferred;deferred=null;try{await event.prompt();await event.userChoice}finally{setAvailable(false);dismiss()}}else setHelp(true)}
 if(!available||(!row&&dismissed))return null;
 return <div className={row?'cc-pwa-install-row':'cc-pwa-install'}><button type="button" onClick={()=>void install()}>Install CampusConnect</button>{!row&&<button type="button" onClick={dismiss} aria-label="Dismiss install suggestion">×</button>}{help&&<p role="status">In Safari, tap Share, then Add to Home Screen.</p>}</div>
}
