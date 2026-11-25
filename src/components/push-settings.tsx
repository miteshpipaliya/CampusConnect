'use client';
import {useState,useEffect,useRef} from 'react';
import {isIOS,isStandalone} from '@/lib/client/pwa-device';
type Config={firebase:{projectId:string;apiKey:string;appId:string;messagingSenderId:string};vapidKey:string};
type State={enabled:boolean;registered:boolean;config:Config|null};
async function connect(config:Config):Promise<()=>void>{const path='/cc-push.js';const sdk=await import(/* webpackIgnore: true */ path) as {connectPush:(config:Config)=>Promise<()=>void>};return sdk.connectPush(config)}
function usePush(){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[permission,setPermission]=useState<NotificationPermission|'unsupported'>('unsupported'),[needsInstall,setNeedsInstall]=useState(false);
 useEffect(()=>{let live=true;const refresh=()=>{setNeedsInstall(isIOS()&&!isStandalone());setPermission('Notification'in window&&'serviceWorker'in navigator?Notification.permission:'unsupported');void fetch('/api/push',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d)setState(d)}).catch(()=>{})};refresh();window.addEventListener('cc-push-changed',refresh);window.addEventListener('focus',refresh);return()=>{live=false;window.removeEventListener('cc-push-changed',refresh);window.removeEventListener('focus',refresh)}},[]);
 const toggle=async()=>{if(!state||busy)return;setBusy(true);setError('');try{if(state.registered){const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'disable'})});if(!r.ok)throw Error('Unable to disable notifications');setState({...state,registered:false})}else{if(!state.config||permission==='unsupported'||permission==='denied'||needsInstall)throw Error('Push unavailable');const result=await Notification.requestPermission();setPermission(result);if(result!=='granted')throw Error('Notification permission was not granted');const unsub=await connect(state.config);unsub();setState({...state,registered:true})}window.dispatchEvent(new Event('cc-push-changed'))}catch(e){setError(e instanceof Error?e.message:'Push unavailable')}finally{setBusy(false)}};
 const test=async()=>{setBusy(true);setError('');try{const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test'})});if(!r.ok)throw Error('Unable to send test notification');setError('Test requested. Check your device.') }catch(e){setError(e instanceof Error?e.message:'Push unavailable')}finally{setBusy(false)}};
 return {state,busy,error,permission,needsInstall,toggle,test};
}
function PushControl({menu=false,prompt=false}:{menu?:boolean;prompt?:boolean}){
 const {state,busy,error,permission,needsInstall,toggle,test}=usePush();
 const [dismissed,setDismissed]=useState(true);
 useEffect(()=>{try{setDismissed(Date.now()-Number(localStorage.getItem('cc-push-prompt-dismissed')||0)<14*86400000)}catch{setDismissed(false)}},[]);
 if(!state?.enabled||prompt&&(dismissed||state.registered||permission!=='default'||needsInstall))return null;
 const blocked=needsInstall||permission==='unsupported'||permission==='denied';
 const status=needsInstall?'Install the app first: iOS only delivers web push to installed apps.':permission==='unsupported'?'This browser does not support push.':permission==='denied'?'Notifications blocked. Enable them in device settings.':state.registered?'Enabled on this device':'Not enabled';
 return <div className="cc-push-control">{!menu&&<><strong>Push notifications on this device</strong><small>{status}</small></>}<button type="button" role={menu?'menuitem':undefined} disabled={busy||blocked&&!state.registered} onClick={()=>void toggle()}>{state.registered?'Disable browser notifications':'Enable browser notifications'}</button>{!menu&&state.registered&&<button type="button" disabled={busy} onClick={()=>void test()}>Send test notification</button>}{prompt&&<button type="button" onClick={()=>{setDismissed(true);try{localStorage.setItem('cc-push-prompt-dismissed',String(Date.now()))}catch{}}}>Not now</button>}{error&&<small role="status">{error}</small>}</div>
}
export function PushSettings(){return <PushControl menu/>}
export function PushToggleRow(){return <PushControl/>}
export function PushPrompt(){return <PushControl prompt/>}
export function PushConnection(){const stop=useRef<(()=>void)|null>(null);useEffect(()=>{let live=true;let seq=0;const start=async()=>{const version=++seq;stop.current?.();stop.current=null;try{const r=await fetch('/api/push',{cache:'no-store'});if(!r.ok)return;const d=await r.json() as State;if(!live||version!==seq||!d.enabled||!d.registered||!d.config||!('Notification'in window)||Notification.permission!=='granted')return;const unsub=await connect(d.config);if(live&&version===seq)stop.current=unsub;else unsub()}catch{/* Browser push is optional; never break sign-in or chat. */}};void start();window.addEventListener('cc-push-changed',start);return()=>{live=false;window.removeEventListener('cc-push-changed',start);stop.current?.()}},[]);return null}
