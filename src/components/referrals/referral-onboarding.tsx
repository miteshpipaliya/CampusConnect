'use client';
import {useEffect,useState} from 'react';
type Status='pending'|'applied'|'skipped'|'closed'|'retry'|'invalid';
async function submit(action:'bootstrap'|'apply'|'skip',code?:string){const r=await fetch('/api/referrals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(code===undefined?{}:{code})})});const d=await r.json();if(!r.ok)throw Error(d.error||'Referral service unavailable');return d.status as Status}
export function ReferralOnboarding(){
 const [status,setStatus]=useState<Status|'loading'|'error'>('loading'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let alive=true;void submit('bootstrap').then(s=>{if(alive)setStatus(s)}).catch(()=>{if(alive)setStatus('error')});return()=>{alive=false}},[]);
 async function act(action:'bootstrap'|'apply'|'skip'){setBusy(true);setMessage('');try{const next=await submit(action,action==='apply'?code:undefined);setStatus(next);if(next==='applied'&&action==='apply')setMessage('Referral code applied successfully!')}catch(e){setMessage(e instanceof Error?e.message:'Referral service unavailable')}finally{setBusy(false)}}
 if(status==='error')return <div className="cc-referral-notice" role="status">Referral check unavailable. You can keep using CampusConnect. <button type="button" disabled={busy} onClick={()=>void act('bootstrap')}>Retry</button>{message}</div>;
 if(status!=='pending')return message?<p className="cc-referral-notice" role="status">{message}</p>:null;
 return <section className="cc-referral-onboarding" aria-label="Optional referral code"><span>INVITE &amp; EARN</span><h2>Were you invited by a friend?</h2><p>Enter their referral code and help them climb the CampusConnect leaderboard. Don&apos;t have a code? Continue without one.</p><form onSubmit={e=>{e.preventDefault();void act('apply')}}><label htmlFor="cc-ref-code">Referral code</label><input id="cc-ref-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="CC-…" autoComplete="off" maxLength={35}/><div className="cc-referral-actions"><button type="submit" disabled={busy||!/^CC-[A-F0-9]{32}$/.test(code.trim())}>{busy?'Checking…':'Apply code'}</button><button type="button" disabled={busy} onClick={()=>void act('skip')}>Skip for now</button></div></form>{message&&<p role="alert">{message}</p>}</section>
}
