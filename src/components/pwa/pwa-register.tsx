'use client';
import {useEffect,useState} from 'react';
export function PwaRegister(){
 const [waiting,setWaiting]=useState<ServiceWorker|null>(null);
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production'||!('serviceWorker'in navigator))return;
  let live=true,registration:ServiceWorkerRegistration|undefined,accepted=false,refreshing=false;
  const controllerChange=()=>{if(accepted&&!refreshing){refreshing=true;location.reload()}};
  const inspect=()=>{if(live&&registration?.waiting&&navigator.serviceWorker.controller)setWaiting(registration.waiting)};
  const update=()=>{if(document.visibilityState==='visible')void registration?.update().catch(()=>{})};
  const start=async()=>{try{registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});if(!live)return;inspect();registration.addEventListener('updatefound',()=>{registration?.installing?.addEventListener('statechange',inspect)})}catch{/* Optional PWA */}};
  const accept=()=>{accepted=true};
  window.addEventListener('cc-pwa-update',accept);navigator.serviceWorker.addEventListener('controllerchange',controllerChange);
  if(document.readyState==='complete')void start();else window.addEventListener('load',start,{once:true});
  document.addEventListener('visibilitychange',update);const timer=window.setInterval(update,3600000);
  return()=>{live=false;clearInterval(timer);window.removeEventListener('load',start);window.removeEventListener('cc-pwa-update',accept);document.removeEventListener('visibilitychange',update);navigator.serviceWorker.removeEventListener('controllerchange',controllerChange)};
 },[]);
 return waiting?<div className="cc-pwa-update" role="status">Update available <button type="button" onClick={()=>{window.dispatchEvent(new Event('cc-pwa-update'));waiting.postMessage({type:'SKIP_WAITING'})}}>Refresh</button></div>:null;
}
