'use client';
import {useState,useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Crown,Trophy,Link2,Gift,ArrowLeft,ChevronLeft,ChevronRight,Users} from 'lucide-react';
import Link from 'next/link';
import {fetchData,StudentLabel,ReferralDashboard,type Board} from './referral-dashboard';
import {ReferralAdmin} from './referral-admin';
import {useShellUid} from '../shell-session';
import {userKey} from '@/lib/queries';
export function ReferralLeaderboard({referralOpen=false}:{referralOpen?:boolean}){
 const uid=useShellUid(),[page,setPage]=useState(0),[competition,setCompetition]=useState(''),[now,setNow]=useState(0);
 const q=useQuery({queryKey:userKey(uid,'referral','leaderboard',competition,page),queryFn:()=>fetchData<Board>('/api/leaderboard?page='+page+(competition?'&competition='+encodeURIComponent(competition):'')),refetchInterval:10000});
 useEffect(()=>{if(!q.data)return;const offset=q.data.serverNow-Date.now(),tick=()=>setNow(Date.now()+offset);tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[q.data]);
 const d=q.data,c=d?.competition,remaining=c?Math.max(0,(c.status==='scheduled'?c.startAt:c.endAt)-now):0,days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60;
 return <section className="cc-referral-board cc-board-v2">
 <header className="cc-board-heading"><div className="cc-board-title"><Trophy size={25}/><h1>Leaderboard</h1></div><nav aria-label="Referral actions" className="cc-board-actions"><Link href="/leaderboard?tab=referral" aria-current={referralOpen?'page':undefined}><Link2 size={17}/> Referral link</Link><button type="button" disabled title="Rewards coming soon"><Gift size={17}/> Rewards</button></nav></header>
 {referralOpen?<><Link className="cc-board-back" href="/leaderboard"><ArrowLeft size={17}/> Back to leaderboard</Link><ReferralDashboard me={d?.me}/></>:<>
 <div className="cc-board-intro"><p>Bring BVM together. Climb the rankings.</p>{c?<><strong>{c.title}</strong><span className="cc-board-status">{c.status}{(c.status==='active'||c.status==='scheduled')&&now>0?' · '+days+'d '+hours+'h '+minutes+'m '+(c.status==='scheduled'?'until start':'remaining'):''}</span></>:<span className="cc-board-status">No competition scheduled</span>}</div>
 {q.isPending?<div aria-busy="true" className="cc-referral-skeleton"/>:q.isError||!d?<div className="cc-board-empty" role="alert">Unable to load rankings. <button onClick={()=>void q.refetch()}>Retry</button></div>:<>
 {d.competitions.length>0&&<label className="cc-board-filter">Competition <select value={competition||c?.id||''} onChange={e=>{setCompetition(e.target.value);setPage(0)}}>{d.competitions.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>}
 <div className="cc-referral-podium cc-board-podium" aria-label="Top three students">{[2,1,3].map(rank=>{const row=d.podium.find(x=>x.rank===rank);return <article key={rank} className={'cc-referral-podium-'+rank+(row?'':' is-vacant')}>{rank===1?<Crown size={30}/>:<span className="cc-board-podium-spacer"/>}<b className="cc-board-place">{rank}</b>{row?<><StudentLabel student={row.student}/><strong><span className="cc-board-coin"/> {row.count}</strong></>:<><span className="cc-referral-avatar cc-board-vacant-avatar"><Users size={26}/></span><small>Unclaimed</small><strong>—</strong></>}</article>})}</div>
 <div className="cc-referral-metrics cc-board-metrics"><div><small>Your rank</small><b>{d.me.rank??'—'}</b></div><div><small>Competition</small><b>{d.me.count}</b></div><div><small>Lifetime</small><b>{d.me.lifetime}</b></div></div>{d.me.needed!==null&&<p className="cc-board-target">{d.me.needed} more referral{d.me.needed===1?'':'s'} to overtake the next position at current scores.</p>}
 <section className="cc-board-list"><header><h2>Rankings</h2><small>Referrals</small></header>{!c?<div className="cc-board-empty">No competition has been scheduled.</div>:!d.rows.length?<div className="cc-board-empty">No qualifying referrals yet. Invite your friends to get started.</div>:d.rows.map(row=><div key={row.rank} className={'cc-referral-ranking'+(row.self?' is-self':'')}><strong>{row.rank}</strong><StudentLabel student={row.student}/>{row.self&&<small>You</small>}<b className="cc-board-score"><span className="cc-board-coin"/>{row.count}</b></div>)}{(page>0||d.hasMore)&&<div className="cc-board-pagination"><button disabled={!page} onClick={()=>setPage(v=>v-1)} aria-label="Previous page"><ChevronLeft size={18}/></button><span>Page {page+1}</span><button disabled={!d.hasMore} onClick={()=>setPage(v=>v+1)} aria-label="Next page"><ChevronRight size={18}/></button></div>}</section>
 <details className="cc-board-rules"><summary>Competition rules</summary>{c&&<p>{new Date(c.startAt).toLocaleString()} – {new Date(c.endAt).toLocaleString()}</p>}<p>Only new verified BVM accounts qualify. Each student counts once, through either a link or manual code. Existing accounts cannot add a referrer. Duplicate or fraudulent referrals may be disqualified. Final rankings are subject to review.</p></details>
 {d.admin&&<ReferralAdmin competition={c??null} onChanged={()=>void q.refetch()}/>}</>}</>}
 </section>
}
