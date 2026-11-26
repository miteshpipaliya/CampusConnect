'use client';
import {CampusScene} from './campus/campus-scene';
import {CampusBrand} from './campus/campus-brand';
import { SocialPanels } from './social-panels';
import {FeedList} from './feed/feed-list';
import {CreateComposer} from './create-composer';
import { isAllowedEmail } from '@/lib/student-email';
import { LiveStories } from './live-stories';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect,useState, type FormEvent } from 'react';

async function api<T>(path:string,method='GET',data?:object):Promise<T>{
 const r=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
  ...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 const kind=(r.headers.get('content-type')||'').toLowerCase();
 if(!kind.includes('application/json')){
  if(r.redirected||r.status===401||r.status===403)throw Error('Sign-in or deployment access blocked this request. Check your login and deployment access settings.');
  if(r.status>=500)throw Error('The service is temporarily unavailable. Please try again shortly.');
  throw Error('The server returned a webpage instead of API data. Refresh the page or check deployment logs.');
 }
 const result:unknown=await r.json().catch(()=>null);
 if(!result||typeof result!=='object')throw Error('The server returned an invalid API response. Please try again.');
 if(!r.ok)throw Error('error' in result&&typeof result.error==='string'?result.error:'Request failed ('+r.status+')');
 return result as T;
}
export function CampusAuth({mode}:{mode:'login'|'register'}){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[resetMode,setResetMode]=useState(false),[needsProfile,setNeedsProfile]=useState(false),[stage,setStage]=useState<'email'|'otp'|'profile'|'privacy'|'password'|'done'>('email');
 const [name,setName]=useState(''),[handle,setHandle]=useState(''),[relationshipStatus,setRelationshipStatus]=useState(''),[relationshipVisibility,setRelationshipVisibility]=useState('me');
 const [acceptTerms,setAcceptTerms]=useState(false),[acknowledgePrivacy,setAcknowledgePrivacy]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[resendAt,setResendAt]=useState(0),[clock,setClock]=useState(0);
 useEffect(()=>{if(stage!=='otp')return;const tick=()=>setClock(Date.now());tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer)},[stage]);
 const resendSeconds=Math.max(0,Math.ceil((resendAt-clock)/1000));
 const parsed=/^(\d{2})(cp|el|ec|it|me|cl|ee|pr)(\d{3,8})@bvmengineering\.ac\.in$/i.exec(email.trim());
 const branchName:Record<string,string>={cp:'Computer Engineering',el:'Electrical Engineering',ec:'Electronics & Communication Engineering',it:'Information Technology',me:'Mechanical Engineering',cl:'Civil Engineering',ee:'Electronics Engineering',pr:'Production Engineering'};
 const enrollment=parsed?.[1]&&parsed?.[2]&&parsed?.[3]?`${parsed[1]}${parsed[2]}${parsed[3]}`:'';
 const branch=parsed?.[2]?branchName[parsed[2].toLowerCase()]??'':'';
 async function requestCode(){
  if(!isAllowedEmail(email)&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())){setMessage('Enter a valid BVM student email, for example 26el309@bvmengineering.ac.in');return}
  setBusy(true);setMessage('');
  try{const r=await api<{message:string}>('/api/auth','POST',{action:'requestOtp',email:email.trim().toLowerCase()});setStage('otp');setClock(Date.now());setResendAt(Date.now()+60000);setMessage(r.message)}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to send code')}finally{setBusy(false)}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage('');
  if(stage==='email'){if(mode==='login'&&!resetMode){setBusy(true);try{await api('/api/auth','POST',{action:'loginPassword',email:email.trim().toLowerCase(),password});window.location.assign('/home')}catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed')}finally{setBusy(false)}}else await requestCode();return}
  if(stage==='profile'){setStage('privacy');return}
  if(stage==='otp'){
   setBusy(true);
   try{const r=await api<{needsProfile:boolean}>('/api/auth','POST',{action:'verifyOtp',email:email.trim().toLowerCase(),code});setNeedsProfile(r.needsProfile);if(r.needsProfile){setStage('profile');setMessage('Email verified. Complete your campus profile.')}else{setStage('password');setMessage('Email verified. Create a password to sign in next time.')}}
   catch(e){setMessage(e instanceof Error?e.message:'Verification failed')}finally{setBusy(false)}
   return;
  }
  if(stage==='privacy'){if(!acceptTerms||!acknowledgePrivacy){setMessage('Accept the terms and acknowledge the privacy policy to continue');return}setStage('password');return}
  if(stage==='password'){
   if(password.length<12){setMessage('Use a password with at least 12 characters');return}
   setBusy(true);
   try{await api('/api/auth','POST',{action:'finishOtp',email:email.trim().toLowerCase(),password,...(needsProfile?{profile:{name,handle:handle.toLowerCase().trim(),relationshipStatus,relationshipVisibility,acceptTerms,acknowledgePrivacy}}:{})});window.location.assign('/home')}
   catch(e){setMessage(e instanceof Error?e.message:'Account creation failed')}finally{setBusy(false)}
  }
 }
 return <main className="auth-page cc-campus-auth">
  <CampusScene view="account"/>
  <Link className="brand" href="/enter"><CampusBrand/></Link>
  <section className="auth-card wide cc-otp-card">
   <div className="cc-otp-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.1a4.5 4.5 0 1 0 0 7.8M17.7 8.1a4.5 4.5 0 1 0 0 7.8"/></svg></div><Link className="cc-campus-auth-back" href="/enter">← Back to campus entry</Link>
   <h1>{stage==='email'?(mode==='login'&&!resetMode?'Welcome back':mode==='register'?'Join CampusConnect':'Reset your password'):stage==='otp'?'Verify your college email':stage==='password'?'Create your password':'Make it yours'}</h1>
   <p>{stage==='email'?(mode==='login'&&!resetMode?'Sign in with your campus email and password.':'Verify your BVM email or approved test account.'):stage==='otp'?'Enter the six-digit code sent to your institutional inbox.':'A few details to finish your verified campus profile.'}</p>
   <div className="cc-otp-steps" aria-label="Registration progress"><span className="active"/><span className={stage!=='email'?'active':''}/><span className={stage==='profile'||stage==='privacy'?'active':''}/></div>
   <form className="auth-form" onSubmit={submit}>
    {stage==='email'&&<>
     <label>BVM student email or approved tester<input autoFocus required type="email" autoComplete="email" placeholder="26el309@bvmengineering.ac.in" value={email} onChange={e=>setEmail(e.target.value.toLowerCase().trim())}/></label>
     {mode==='login'&&!resetMode&&<label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>}
     {parsed&&<div className="cc-email-preview"><strong>Student details detected</strong><span>Enrollment: {enrollment.toLowerCase()}</span><span>Branch: {branch}</span><small>Branch mapping is provisional and must be confirmed by BVM.</small></div>}
    </>}
    {stage==='otp'&&<>
     <div className="cc-email-preview">Code sent to <strong>{email}</strong></div>
     <label>Verification code<input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
     <button type="button" className="cc-text-action" disabled={busy||resendSeconds>0} onClick={requestCode}>{resendSeconds>0?'Resend code in '+resendSeconds+'s':'Resend verification code'}</button>
     <button type="button" className="cc-text-action" onClick={()=>{setStage('email');setCode('');setMessage('')}}>Change email address</button>
    </>}
    {stage==='password'&&<label>Create password (12+ characters)<input autoFocus required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a secure password"/></label>}
    {stage==='profile'&&<>
     <label>Full name<input autoFocus required minLength={2} maxLength={70} autoComplete="name" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>Username<input required pattern="[a-z][a-z0-9._]{2,29}" maxLength={30} placeholder="your.username" value={handle} onChange={e=>setHandle(e.target.value.toLowerCase())}/></label>
    </>}
    {stage==='privacy'&&<>
     <label>Relationship status<select required aria-label="Relationship status" value={relationshipStatus} onChange={e=>setRelationshipStatus(e.target.value)}><option value="">Choose your status</option>{['Single','In Relationship','Engaged','Married','Situationship'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label>Who can see your relationship status?<select required aria-label="Who can see your relationship status?" value={relationshipVisibility} onChange={e=>setRelationshipVisibility(e.target.value)}><option value="me">Only me (recommended)</option><option value="followers">Followers only</option><option value="campus">Campus members</option></select></label>
     <label className="cc-check"><input type="checkbox" required checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)}/> I accept the Terms of Service</label>
     <label className="cc-check"><input type="checkbox" required checked={acknowledgePrivacy} onChange={e=>setAcknowledgePrivacy(e.target.checked)}/> I acknowledge the Privacy Policy</label>
    </>}
    {message&&<p role="status" className={message.toLowerCase().includes('failed')||message.toLowerCase().includes('invalid')||message.toLowerCase().includes('unable')?'form-error':'auth-legal'}>{message}</p>}
    {stage==='privacy'&&<button type="button" className="cc-text-action" onClick={()=>setStage('profile')}>Back</button>}
    {stage==='email'&&mode==='login'&&<button type="button" className="cc-text-action" onClick={()=>{setResetMode(v=>!v);setMessage('')}}>{resetMode?'Back to password login':'Set or reset password using email verification'}</button>}
    <button disabled={busy} type="submit" className="primary-button full">{busy?'Please wait…':stage==='email'?(mode==='login'&&!resetMode?'Sign in':'Send verification code'):stage==='otp'?'Verify code':stage==='profile'?'Continue':stage==='privacy'?'Continue':'Save password & enter CampusConnect'}</button>
   </form>
   <p className="auth-foot">{mode==='register'?<>Already registered? <Link href="/login">Log in</Link></>:<>New to CampusConnect? <Link href="/register">Sign up with BVM email</Link></>}</p>
   <p className="auth-legal">BVM institutional email required, except one approved testing account. Email verification is required to register or reset a password. Subsequent logins use email and password.</p>
  </section>
 </main>;
}
export function ConnectedFeed(){
 const params=useSearchParams(),[section,setSection]=useState('home'),[composeOpen,setComposeOpen]=useState(false),[epoch,setEpoch]=useState(0);
 useEffect(()=>{const s=params.get('section')||'home';if(s==='chat'){window.location.replace('/messages');return}setSection(s);if(params.get('compose')==='1')setComposeOpen(true)},[params]);
 return <section className="cc-feed-col"><SocialPanels section={section}/>{composeOpen&&<CreateComposer key={params.get('kind')||'choose'} {...(params.get('kind')==='post'?{initialKind:'post' as const}:params.get('kind')==='story'?{initialKind:'story' as const}:params.get('kind')==='reel'?{initialKind:'reel' as const}:{})} onClose={()=>setComposeOpen(false)} onPublished={()=>setEpoch(n=>n+1)}/>} {(section==='home'||section==='community')&&<><LiveStories/><FeedList epoch={epoch}/></>}</section>
}
