'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {AvatarCrop} from './avatar-crop';
type Profile={handle:string;name:string;bio:string;website:string;branch:string;division:string;relationshipStatus:string;relationshipVisibility:'me'|'followers'|'campus';privacy:'campus'|'private';avatarMediaId:string|null};
export function ProfileSettings(){
 const photoInput=useRef<HTMLInputElement>(null),[cropFile,setCropFile]=useState<File|null>(null),[photoBusy,setPhotoBusy]=useState(false),[photoVersion,setPhotoVersion]=useState(0);
 const [profile,setProfile]=useState<Profile|null>(null),[handle,setHandle]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void fetch('/api/profile/settings',{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error??'Unable to load settings');if(active){setProfile(data.profile);setHandle(data.profile.handle)}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 const change=<K extends keyof Profile>(key:K,value:Profile[K])=>setProfile(p=>p?{...p,[key]:value}:p);
 async function uploadAvatar(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Choose JPG, PNG or WebP under 5 MB');
  setPhotoBusy(true);setError('');
  try{
   const post=async(url:string,body:object)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Photo upload failed');return d};
   const reserved=await post('/api/media',{action:'reserve',purpose:'avatar',contentType:file.type,size:file.size});
   const sent=await fetch(reserved.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!sent.ok)throw Error('Photo storage upload failed');
   await post('/api/media',{action:'confirm',id:reserved.id});
   await post('/api/profile/avatar',{mediaId:reserved.id});
   setProfile(p=>p?{...p,avatarMediaId:reserved.id}:p);setPhotoVersion(n=>n+1);setMessage('Profile photo updated.');
  }catch(e){setError(e instanceof Error?e.message:'Photo upload failed');throw e}finally{setPhotoBusy(false);if(photoInput.current)photoInput.current.value=''}
 }
 async function removeAvatar(){
  setPhotoBusy(true);setError('');try{
   const r=await fetch('/api/profile/avatar',{method:'DELETE'});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not remove photo');
   setProfile(p=>p?{...p,avatarMediaId:null}:p);setPhotoVersion(n=>n+1);setMessage('Profile photo removed.');
  }catch(e){setError(e instanceof Error?e.message:'Could not remove photo')}finally{setPhotoBusy(false)}
 }
 async function save(event:FormEvent){event.preventDefault();if(!profile)return;setBusy(true);setError('');setMessage('');
 try{
  const {handle:currentHandle,avatarMediaId,...settings}=profile;
  const response=await fetch('/api/profile/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
  const result=await response.json();if(!response.ok)throw Error(result.error??'Unable to save');
  if(handle.trim().toLowerCase()!==currentHandle){const rename=await fetch('/api/profile/username',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:handle.trim().toLowerCase()})});const renameResult=await rename.json();if(!rename.ok)throw Error('Settings saved, but username change failed: '+(renameResult.error??'Unavailable'));change('handle',renameResult.handle)}
  setMessage('Your profile settings were saved.');
 }catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}
 }
 if(error&&!profile)return <section className="cc-live-empty" role="alert">{error}</section>;
 if(!profile)return <section className="cc-live-empty">Loading your settings…</section>;
 return <section className="cc-real-profile" style={{maxWidth:680,margin:'0 auto',padding:'24px'}}><h1>Edit profile</h1><p>Update the information displayed on your campus profile.</p>
 {cropFile&&<AvatarCrop file={cropFile} onCancel={()=>setCropFile(null)} onConfirm={async file=>{await uploadAvatar(file);setCropFile(null)}}/>}
 <div style={{display:'flex',gap:20,alignItems:'center',padding:'16px 0'}}>
  <Avatar key={photoVersion} user={{name:profile.name,handle:profile.handle,avatarMediaId:profile.avatarMediaId}} size={150}/>
  <div style={{display:'grid',gap:10}}><strong>Profile picture</strong><input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)setCropFile(f)}}/>
   <button type="button" disabled={photoBusy} onClick={()=>photoInput.current?.click()}>Upload / crop photo</button>
   <button type="button" disabled={photoBusy||!profile.avatarMediaId} onClick={()=>void removeAvatar()}>Remove photo</button>
   <small>Photo is cropped to a circle on your profile. Max 5 MB.</small></div>
 </div><form className="auth-form" onSubmit={save}>
 <label>Username<input required value={handle} pattern="[a-z][a-z0-9._]{2,29}" maxLength={30} onChange={e=>setHandle(e.target.value.toLowerCase())}/></label>
 <label>Full name<input required minLength={2} maxLength={70} value={profile.name} onChange={e=>change('name',e.target.value)}/></label>
 <label>Bio<textarea maxLength={150} rows={4} value={profile.bio} onChange={e=>change('bio',e.target.value)}/></label>
 <label>Website<input type="url" placeholder="https://example.com" maxLength={200} value={profile.website} onChange={e=>change('website',e.target.value)}/></label>
 <label>Branch<input maxLength={80} value={profile.branch} onChange={e=>change('branch',e.target.value)}/></label>
 <label>Division<input maxLength={30} value={profile.division} onChange={e=>change('division',e.target.value)}/></label>
 <label>Relationship status<select value={profile.relationshipStatus} onChange={e=>change('relationshipStatus',e.target.value)}>{['','Single','In Relationship','Engaged','Married','Situationship'].map(x=><option key={x} value={x}>{x||'Not specified'}</option>)}</select></label>
 <label>Relationship visibility<select value={profile.relationshipVisibility} onChange={e=>change('relationshipVisibility',e.target.value as Profile['relationshipVisibility'])}><option value="me">Only me</option><option value="followers">Followers</option><option value="campus">Campus</option></select></label>
 <label>Account privacy<select value={profile.privacy} onChange={e=>change('privacy',e.target.value as Profile['privacy'])}><option value="campus">Campus visible</option><option value="private">Private</option></select></label>
 {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status">{message}</p>}
 <button type="submit" className="primary-button full" disabled={busy}>{busy?'Saving…':'Save profile changes'}</button>
 </form><p><Link href="/profile/me">Return to profile</Link></p></section>
}
