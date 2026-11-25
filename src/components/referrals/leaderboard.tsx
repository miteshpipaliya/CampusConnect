'use client';
import {useState,useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Crown,Trophy} from 'lucide-react';
import Link from 'next/link';
import {fetchData,StudentLabel,type Board} from './referral-dashboard';
import {ReferralAdmin} from './referral-admin';
export function ReferralLeaderboard(){
 const [page,setPage]=useState(0),[competition,setCompetition]=useState(''),[now,setNow]=useState(0);
 const q=useQuery({queryKey:['referral-leaderboard',competition,page],queryFn:()=>fetchData<Board>('/api/leaderboard?page='+page+(competition?'&competition='+encodeURIComponent(competition):'')),refetchInterval:10000});
 useEffect(()=>{if(!q.data)return;const offset=q.data.serverNow-Date.now(),tick=()=>setNow(Date.now()+offset);tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[q.data]);
 if(q.isPending)return <main className="cc-referral-board" aria-busy="true"><div className="cc-referral-skeleton"/><div className="cc-referral-skeleton"/></main>;
 if(q.isError||!q.data)return <main className="cc-referral-board"><h1>CampusConnect leaderboard</h1><p role="alert">Unable to load rankings. <button onClick={()=>void q.refetch()}>Retry</button></p></main>;
 const d=q.data,c=d.competition,remaining=c?Math.max(0,(c.status==='scheduled'?c.startAt:c.endAt)-now):0,days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60;
 return <section className="cc-referral-board"><header className="cc-referral-hero"><Trophy size={32}/><small>INVITE • CONNECT • COMPETE</small><h1>CampusConnect Leaderboard</h1><p>Bring BVM together. Climb the rankings. Earn your rewards.</p>{c&&<><b>{c.title} · {c.status}</b>{(c.status==='active'||c.status==='scheduled')&&now>0&&<p>{days}d {hours}h {minutes}m {c.status==='scheduled'?'until start':'remaining'}</p>}</>}<Link href="/profile/me">Your referral link &amp; code →</Link></header>
 {d.competitions.length>0&&<label>Competition <select value={competition||c?.id||''} onChange={e=>{setCompetition(e.target.value);setPage(0)}}>{d.competitions.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>}
 <div className="cc-referral-metrics"><div><small>Your rank</small><b>{d.me.rank??'—'}</b></div><div><small>Competition referrals</small><b>{d.me.count}</b></div><div><small>Lifetime referrals</small><b>{d.me.lifetime}</b></div></div>{d.me.needed!==null&&<p>{d.me.needed} additional referral{d.me.needed===1?'':'s'} to overtake the next position at current scores.</p>}
 {d.podium.length>0&&<div className="cc-referral-podium">{[2,1,3].map(rank=>{const row=d.podium.find(x=>x.rank===rank);return row?<article key={rank} className={'cc-referral-podium-'+rank}>{rank===1?<Crown/>:<Trophy/>}<b>#{rank}</b><StudentLabel student={row.student}/><strong>{row.count}</strong><small>referrals</small></article>:null})}</div>}
 <section className="cc-referral-panel"><h2>Rankings</h2>{!c?<p>No competition has been scheduled.</p>:!d.rows.length?<p>No qualifying referrals yet.</p>:d.rows.map(row=><div key={row.rank} className={'cc-referral-ranking'+(row.self?' is-self':'')}><strong>#{row.rank}</strong><StudentLabel student={row.student}/><b>{row.count}</b>{row.self&&<small>You</small>}</div>)}<div className="cc-referral-actions"><button disabled={!page} onClick={()=>setPage(v=>v-1)}>Previous</button><button disabled={!d.hasMore} onClick={()=>setPage(v=>v+1)}>Next</button></div></section>
 <section className="cc-referral-panel"><h2>Competition rules</h2>{c&&<p>{new Date(c.startAt).toLocaleString()} – {new Date(c.endAt).toLocaleString()}</p>}<p>Only new verified BVM accounts qualify. Each student counts once, through either a link or manual code. Existing accounts cannot add a referrer. Duplicate or fraudulent referrals may be disqualified. Final rankings are subject to review.</p></section>
 {d.admin&&<ReferralAdmin competition={c} onChanged={()=>void q.refetch()}/>}</section>
}
