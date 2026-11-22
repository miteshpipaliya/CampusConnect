'use client';
import {useEffect,useState,type FormEvent} from 'react';
type Prefs={isPrivate:boolean;activityStatus:boolean;storyReplies:'everyone'|'following'|'off';storySharing:boolean;theme:'dark'|'light';notifications:{likes:boolean;comments:boolean;follows:boolean;messages:boolean}};
export function AccountPreferences(){
 const [prefs,setPrefs]=useState<Prefs|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;void fetch('/api/settings',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Settings unavailable');if(active)setPrefs(d.settings)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 async function save(e:FormEvent){e.preventDefault();if(!prefs)return;setBusy(true);setError('');setMessage('');try{const r=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(prefs)});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to save');setMessage('Preferences saved.');document.documentElement.dataset.theme=prefs.theme;localStorage.setItem('cc-theme',prefs.theme)}catch(e){setError(String(e))}finally{setBusy(false)}}
 if(!prefs)return <section className="cc-live-empty">{error||'Loading preferences…'}</section>;
 return <form onSubmit={save} style={{display:'grid',gap:16,maxWidth:580,padding:20}}>
 <h2>Account preferences</h2>
 <label><input type="checkbox" checked={prefs.isPrivate} onChange={e=>setPrefs({...prefs,isPrivate:e.target.checked})}/> Private account</label>
 <label><input type="checkbox" checked={prefs.activityStatus} onChange={e=>setPrefs({...prefs,activityStatus:e.target.checked})}/> Show activity status</label>
 <label><input type="checkbox" checked={prefs.storySharing} onChange={e=>setPrefs({...prefs,storySharing:e.target.checked})}/> Allow story sharing</label>
 <label>Story replies <select value={prefs.storyReplies} onChange={e=>setPrefs({...prefs,storyReplies:e.target.value as Prefs['storyReplies']})}><option value="everyone">Everyone</option><option value="following">Following</option><option value="off">Off</option></select></label>
 <label>Appearance <select value={prefs.theme} onChange={e=>setPrefs({...prefs,theme:e.target.value as Prefs['theme']})}><option value="dark">Dark</option><option value="light">Light</option></select></label>
 <h3>Notifications</h3>{(['likes','comments','follows','messages'] as const).map(k=><label key={k}><input type="checkbox" checked={prefs.notifications[k]} onChange={e=>setPrefs({...prefs,notifications:{...prefs.notifications,[k]:e.target.checked}})}/> {k.charAt(0).toUpperCase()+k.slice(1)}</label>)}
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <button type="submit" disabled={busy}>{busy?'Saving…':'Save preferences'}</button>
 </form>
}
