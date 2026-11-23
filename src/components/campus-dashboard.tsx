'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Day={day:string;profileVisits:number;reach:number;storyViews:number;views:number};
type Dashboard={range:7|30;totals:{posts:number;followers:number;following:number;likes:number;comments:number;views:number;storyViews:number;profileVisits:number};series:Day[];topPosts:Array<{id:string;caption:string;likes:number;comments:number;views:number;mediaUrl:string|null}>};
export function CampusDashboard(){
 const [range,setRange]=useState<7|30>(7),[data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
  void fetch('/api/dashboard?range='+range,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load dashboard');if(alive)setData(d)}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Dashboard unavailable')}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[range]);
 const series=data?.series||[],peak=Math.max(1,...series.map(d=>d.views+d.profileVisits+d.storyViews));
 return <section className="cc-dashboard"><header><h1>Your campus dashboard</h1><div><button aria-pressed={range===7} onClick={()=>setRange(7)}>7 days</button><button aria-pressed={range===30} onClick={()=>setRange(30)}>30 days</button></div></header>
  {loading&&<p>Loading statistics…</p>}{error&&<p role="alert">{error}</p>}
  {data&&<><div className="cc-dashboard-counters">{Object.entries(data.totals).map(([name,value])=><div key={name}><small>{name}</small><strong>{value.toLocaleString()}</strong></div>)}</div>
   <h2>Recent activity</h2>
   <svg viewBox="0 0 620 170" role="img" aria-label="Daily engagement activity" preserveAspectRatio="none" style={{width:'100%',height:170}}>
    {series.map((day,i)=>{const width=610/series.length,x=5+width*i,height=135*(day.views+day.profileVisits+day.storyViews)/peak;
     return <rect key={day.day} x={x+2} y={146-height} width={Math.max(1,width-4)} height={height} rx="2" fill="#7e66fa"><title>{day.day}: {day.views} views, {day.profileVisits} profile visits, {day.storyViews} story views</title></rect>;
    })}
   </svg>
   <h2>Top posts</h2>
   {data.topPosts.length===0?<p>No posts yet. <Link href="/home?compose=1">Create a post</Link> to begin.</p>:data.topPosts.map(item=><Link key={item.id} href={'/posts/'+encodeURIComponent(item.id)} className="cc-dashboard-post"><strong>{item.caption||'Untitled post'}</strong><small>{item.likes} likes · {item.comments} comments · {item.views} views</small></Link>)}
  </>}
 </section>;
}
