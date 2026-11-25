'use client';
import {useState} from 'react';
import {useShellUid} from '../shell-session';
import {userKey} from '@/lib/queries';
import {useQuery} from '@tanstack/react-query';
import {SafeImg} from '../safe-img';
import {Gift,Copy,Share2} from 'lucide-react';
export type Student={handle:string;name:string;avatarUrl:string|null}|null;
export type BoardRow={rank:number;student:Student;count:number;self:boolean};
type History={student:Student;createdAt:number;status:string};
type Dashboard={code:string|null;link:string|null;lifetime:number;history:History[];hasMore:boolean};
export type Competition={id:string;title:string;status:string;startAt:number;endAt:number;rulesVersion:number};
export type Board={competition:Competition|null;competitions:Competition[];rows:BoardRow[];podium:BoardRow[];me:{rank:number|null;count:number;lifetime:number;needed:number|null};hasMore:boolean;serverNow:number;admin:boolean};
export async function fetchData<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Service unavailable');return d as T}
export function StudentLabel({student}:{student:Student}){return <span className="cc-referral-student"><span className="cc-referral-avatar">{student?.avatarUrl?<SafeImg src={student.avatarUrl} alt="" width={44} height={44}/>:student?.name.slice(0,1).toUpperCase()||'?'}</span><span>{student?<><b>{student.name}</b><small>@{student.handle}</small></>:<b>Private or unavailable student</b>}</span></span>}
export function ReferralDashboard({me}:{me:Board['me']|undefined}){
 const uid=useShellUid();
 const [page,setPage]=useState(0),[notice,setNotice]=useState('');
 const dashboard=useQuery({queryKey:userKey(uid,'referral','dashboard',page),queryFn:()=>fetchData<Dashboard>('/api/referrals?page='+page),refetchInterval:15000});
 const d=dashboard.data;
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setNotice('Copied successfully')}catch{setNotice('Unable to copy automatically. Select and copy the value manually.')}}
 if(dashboard.isPending)return <section className="cc-referral-panel cc-invite-panel" aria-busy="true">Loading referral information…</section>;
 if(dashboard.isError||!d)return <section className="cc-referral-panel cc-invite-panel" role="alert">Referral information unavailable. <button onClick={()=>void dashboard.refetch()}>Retry</button></section>;
 if(!d.code||!d.link||!/^CC-[A-Z0-9]{4}$/.test(d.code))return <section className="cc-referral-panel cc-invite-panel"><h2>Invite &amp; earn</h2><p>Your short code is being prepared if you are a verified BVM student. Refresh if it is not available yet.</p><button onClick={()=>void fetch('/api/referrals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap'})}).then(async r=>{if(!r.ok)throw Error('Referral service unavailable');return dashboard.refetch()}).catch(()=>setNotice('Referral service unavailable'))}>Refresh referral code</button>{notice&&<p role="status">{notice}</p>}</section>;
 const text='Hey! Join CampusConnect, the exclusive student community for BVM students. Join here: '+d.link+' — or enter my referral code: '+d.code;
 const wa='https://wa.me/?text='+encodeURIComponent(text);
 return <section className="cc-referral-panel cc-invite-panel"><header><Gift size={23}/><h2>Invite &amp; earn</h2></header><div className="cc-referral-metrics"><div><small>Lifetime referrals</small><b>{d.lifetime}</b></div><div><small>Competition</small><b>{me?.count??'—'}</b></div><div><small>Current rank</small><b>{me?.rank??'—'}</b></div></div><div className="cc-referral-share"><label>Your referral link<input readOnly value={d.link} onFocus={e=>e.target.select()}/></label><div className="cc-referral-actions"><button type="button" onClick={()=>void copy(d.link!)}><Copy size={16}/> Copy link</button><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></div><label>Your referral code<input className="cc-referral-code" readOnly value={d.code} onFocus={e=>e.target.select()}/></label><div className="cc-referral-actions"><button type="button" onClick={()=>void copy(d.code!)}><Copy size={16}/> Copy code</button><button type="button" onClick={()=>{if(navigator.share)void navigator.share({text}).catch(()=>{});else window.open(wa,'_blank','noopener,noreferrer')}}><Share2 size={16}/> Share code</button></div></div>{notice&&<p role="status">{notice}</p>}<h3>Referral history</h3>{d.history.length?d.history.map((h,i)=><div key={i} className="cc-referral-history"><StudentLabel student={h.student}/><span><small>{new Date(h.createdAt).toLocaleDateString()}</small><b>{h.status}</b></span></div>):<p>No referrals yet.</p>}<div className="cc-referral-actions"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={!d.hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div></section>
}
