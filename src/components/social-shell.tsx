'use client';

import Link from 'next/link';
import '@/app/shell-upgrade.css';
import '@/app/notifications-upgrade.css';
import '@/app/explore-upgrade.css';
import {NotificationsFeed} from './notifications-feed';
import {SearchPanel} from './search-panel';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, PlusSquare, UserRound, Clapperboard, Send, Search, Heart, Users, ChartNoAxesCombined, Menu } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {Avatar} from './avatar';
import {userKey} from '@/lib/queries';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {StreamConnectionProvider} from './chat/stream-connection';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type NavItem = { label: string; href: string; Icon: LucideIcon };
const links: NavItem[] = [
  {label:'Home',href:'/home',Icon:Home},
  {label:'Reels',href:'/reels',Icon:Clapperboard},
  {label:'Messages',href:'/messages',Icon:Send},
  {label:'Search',href:'/explore',Icon:Search},
  {label:'Notifications',href:'/notifications',Icon:Heart},
  {label:'Create',href:'/home?compose=1',Icon:PlusSquare},
  {label:'Community',href:'/home?section=community',Icon:Users},
  {label:'Dashboard',href:'/dashboard',Icon:ChartNoAxesCombined},
  {label:'Profile',href:'/profile/me',Icon:UserRound},
];
const mobileLabels = new Set(['Home', 'Reels', 'Messages', 'Search', 'Profile']);
function activeLink(pathname: string, item: NavItem, section: string) {
  if (item.label === 'Create') return false;
  const sections:Record<string,string>={Reels:'reels',Messages:'chat',Search:'search',Notifications:'notifications',Community:'community'};
  if(item.label==='Messages')return pathname.startsWith('/messages')||section==='chat';
  if(item.label==='Reels'&&pathname.startsWith('/reels'))return true;
  if(item.label==='Search'&&pathname.startsWith('/explore'))return true;
  if(item.label==='Notifications'&&pathname.startsWith('/notifications'))return true;
  if(sections[item.label])return section===sections[item.label];
  if(item.label==='Home')return pathname==='/home'&&section==='home';
  if (item.label === 'Profile') return pathname.startsWith('/profile');
  if (item.label === 'Search') return pathname.startsWith('/explore');
  if (item.label === 'Community') return pathname.startsWith('/communities');
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/home" className={'cc-brand' + (compact ? ' cc-brand-mobile' : '')} aria-label="CampusConnect home">
    <span className="cc-logo" aria-hidden="true"><span style={{fontWeight:900,letterSpacing:"-0.12em"}}>C<span style={{color:"#c4a0ff"}}>C</span></span></span>
    <span className="cc-wordmark">Campus<span>Connect</span><small>BVM CAMPUS</small></span>
  </Link>;
}
function Nav({ pathname, section, mobile = false, counts, account, onPanel }: { pathname: string; section:string; mobile?: boolean; counts:{unread:number;unreadMessages:number};account?:{handle:string;avatarMediaId:string|null};onPanel?:(name:'notifications'|'search')=>void }) {
  return <nav className={mobile ? 'cc-mobile-nav' : 'cc-navigation'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
    {links.filter((item) => !mobile || mobileLabels.has(item.label)).map((item) => {
      const active = activeLink(pathname, item, section);
      const Icon = item.Icon;
      return <Link key={item.label} href={item.href} scroll={false} className={'cc-nav-item' + (active ? ' is-active' : '')}
        onClick={e=>{if(!mobile&&onPanel&&(item.label==='Notifications'||item.label==='Search')){e.preventDefault();onPanel(item.label==='Notifications'?'notifications':'search')}}} aria-current={active ? 'page' : undefined} aria-label={item.label} title={item.label}>
        {item.label==='Profile'&&account?<Avatar user={account} size={24} ring={active?'seen':'none'}/>:<Icon size={mobile ? 23 : 25} strokeWidth={active ? 2.8 : 1.8} fill={active && (item.label === 'Home'||item.label==='Notifications') ? 'currentColor' : 'none'} aria-hidden="true" />}
        <span className="cc-nav-label">{item.label}</span>
        {((item.label==='Notifications'?counts.unread:item.label==='Messages'?counts.unreadMessages:0)>0)&&<b aria-label={item.label==='Messages'?'Unread conversations':'Unread notifications'} style={{position:'absolute',top:0,right:0,minWidth:17,height:17,borderRadius:20,background:'#fa3659',color:'white',fontSize:10,lineHeight:'17px',textAlign:'center'}}>{(item.label==='Notifications'?counts.unread:counts.unreadMessages)>(mobile?9:99)?(mobile?'9+':'99+'):(item.label==='Notifications'?counts.unread:counts.unreadMessages)}</b>}
      </Link>;
    })}
  </nav>;
}
function FollowSuggestion({handle}:{handle:string}){const [status,setStatus]=useState('none'),[busy,setBusy]=useState(false);return <button className="cc-suggestion-follow" disabled={busy||status!=='none'} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle})});const d=await r.json();if(r.ok)setStatus(d.status||'active')}finally{setBusy(false)}}}>{status==='pending'?'Requested':status==='active'?'Following':'Follow'}</button>}
function Suggestions({handle,avatarMediaId}:{handle:string;avatarMediaId:string|null}){
 const [members,setMembers]=useState<Array<{handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null;reason?:string}>>([]);
 useEffect(()=>{let active=true;fetch('/api/suggestions',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(active&&Array.isArray(d?.members))setMembers(d.members.filter((m:{handle:string})=>m.handle&&m.handle!==handle).slice(0,8))}).catch(()=>{});return()=>{active=false}},[handle]);
 return <aside className="cc-suggestions"><div className="cc-me"><Avatar user={{handle,avatarMediaId}} size={44}/><div><Link href="/profile/me"><b>@{handle}</b></Link><small>Your profile</small></div><Link href="/profile/me" >Profile</Link></div><div className="cc-suggestion-heading">Suggested for you</div>{members.length?members.map(m=><div className="cc-suggested" key={m.handle}><Avatar user={{name:m.name,handle:m.handle,avatarMediaId:m.avatarMediaId??null,avatarUrl:m.avatarUrl??null}} size={44}/><div><Link href={'/profile/'+encodeURIComponent(m.handle)}><b>@{m.handle}</b></Link><small>{m.reason||m.name}</small></div><FollowSuggestion handle={m.handle}/></div>):<p style={{fontSize:12,color:'#aaa'}}>No other campus members found.</p>}</aside>;
}

export default function SocialShell({ children }: { children: ReactNode }) {
  const pathname=usePathname(),params=useSearchParams(),router=useRouter();
  const [avatarMediaId,setAvatarMediaId]=useState<string|null>(null),[menu,setMenu]=useState(false),[recent,setRecent]=useState<Array<{handle:string;avatarUrl:string|null;avatarMediaId:string|null}>>([]),[menuError,setMenuError]=useState('');
  const [panel,setPanel]=useState<'notifications'|'search'|null>(null),[collapsed,setCollapsed]=useState(false);
  const [uid,setUid]=useState<string|null>(null);
  const [handle,setHandle]=useState<string|null>(null),[checked,setChecked]=useState(false),[section,setSection]=useState('home');
  const queryClient=useQueryClient();
  const summary=useQuery({queryKey:userKey(uid,'notification-summary'),enabled:checked&&Boolean(uid),queryFn:async({signal})=>{
   const response=await fetch('/api/notifications/summary',{cache:'no-store',signal});
   if(!response.ok)throw Error('Notification summary unavailable');
   const data=await response.json();
   return {unread:Number(data.unread||0),unreadMessages:Number(data.unreadMessages||0)};
  },refetchInterval:20000,refetchIntervalInBackground:false,staleTime:20000});
  const counts=summary.data??{unread:0,unreadMessages:0};
  useEffect(()=>{
   const changed=()=>{if(uid&&document.visibilityState!=='hidden')void queryClient.invalidateQueries({queryKey:userKey(uid,'notification-summary')})};
   window.addEventListener('cc-notifications-updated',changed);document.addEventListener('visibilitychange',changed);
   return()=>{window.removeEventListener('cc-notifications-updated',changed);document.removeEventListener('visibilitychange',changed)};
  },[uid,queryClient]);
  useEffect(()=>{setSection(params.get('section')||'home')},[params]);
  useEffect(()=>{
   const cached=localStorage.getItem('cc-theme');
   if(cached==='dark'||cached==='light')document.documentElement.dataset.theme=cached;
   void fetch('/api/settings',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    const theme=data?.settings?.theme;
    if(theme==='dark'||theme==='light'){document.documentElement.dataset.theme=theme;localStorage.setItem('cc-theme',theme)}
   }).catch(()=>{});
  },[]);
  useEffect(()=>{let live=true;fetch('/api/auth',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{
   if(!live)return;setChecked(true);queryClient.clear();if(x?.user?.profile?.handle&&x?.user?.uid){setUid(x.user.uid);setHandle(x.user.profile.handle);setAvatarMediaId(x.user.profile.avatarMediaId||null)}else router.replace('/login');
  }).catch(()=>{if(live){setChecked(true);router.replace('/login')}});return()=>{live=false}},[router,queryClient]);
  useEffect(()=>{if(!uid)return;let live=true;void fetch('/api/chat',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live)setRecent(Array.isArray(d?.conversations)?d.conversations.slice(0,3):[])}).catch(()=>{});return()=>{live=false}},[uid]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);setPanel(null)}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  useEffect(()=>{setPanel(null)},[pathname]);
  if(!checked||!handle)return <div className="cc-live-empty">Checking campus sign-in… <Link href="/login">Sign in</Link></div>;
  return <StreamConnectionProvider key={uid}><div className={'cc-app cc-shell-v2'+(panel?' cc-panel-open':'')+(collapsed?' cc-shell-collapsed':'')+(pathname==='/home'?' cc-home-mode':'')+(pathname.startsWith('/reels')?' cc-reels-mode':pathname.startsWith('/profile')?' cc-profile-mode':(section==='chat'||pathname.startsWith('/messages'))?' cc-chat-mode':'')}>
    <aside className="cc-sidebar" aria-label="Site navigation">
      <Brand />
      <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} onPanel={name=>setPanel(old=>old===name?null:name)}/>
      <div className="cc-more-wrap"><button className="cc-more-toggle" aria-label="More" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><Menu size={25}/><span className="cc-nav-label">More</span></button>{menu&&<div className="cc-more-menu"><button onClick={()=>{setCollapsed(v=>!v);setMenu(false)}}>{collapsed?'Expand sidebar':'Collapse sidebar'}</button><Link href="/settings" onClick={()=>setMenu(false)}>Settings</Link><Link href="/saved" onClick={()=>setMenu(false)}>Saved</Link><Link href="/dashboard" onClick={()=>setMenu(false)}>Dashboard</Link><button onClick={async()=>{try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw Error('Sign out failed');queryClient.clear();window.location.assign('/login')}catch{setMenuError('Sign out failed')}}}>Log out</button>{menuError&&<p role="alert">{menuError}</p>}</div>}</div>

    </aside>
    <main className="cc-main" id="main-content">
      <header className="cc-mobile-header"><Brand compact/><div className="cc-mobile-actions"><Link href="/home?compose=1" aria-label="Create"><PlusSquare size={24}/></Link><Link href="/notifications" aria-label="Notifications"><Heart size={24}/>{counts.unread>0&&<b>{counts.unread>9?'9+':counts.unread}</b>}</Link><Link href="/messages" aria-label="Messages"><Send size={24}/></Link></div></header>
      <div className="cc-page">{children}</div>
    </main>
    {!pathname.startsWith('/profile')&&!pathname.startsWith('/reels')&&section!=='chat'&&!pathname.startsWith('/messages')&&<Suggestions handle={handle} avatarMediaId={avatarMediaId}/>}
    <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} mobile />
    {panel&&<><button className="cc-panel-dim" aria-label="Close panel" onClick={()=>setPanel(null)}/><aside className="cc-side-panel" role="dialog" aria-modal="true" aria-label={panel==='notifications'?'Notifications':'Search'}><button className="cc-panel-close" aria-label="Close panel" onClick={()=>setPanel(null)}>×</button>{panel==='notifications'?<NotificationsFeed/>:<SearchPanel/>}</aside></>}
    {(pathname==='/home'||pathname.startsWith('/explore')||pathname.startsWith('/reels'))&&<Link href="/messages" className="cc-messages-pill"><Send size={23}/> Messages <span className="cc-recent-avatars">{recent.map(m=><Avatar key={m.handle} user={{handle:m.handle,avatarUrl:m.avatarUrl,avatarMediaId:m.avatarMediaId}} size={24}/>)}</span>{counts.unreadMessages>0&&<b>{counts.unreadMessages>99?'99+':counts.unreadMessages}</b>}</Link>}
  </div></StreamConnectionProvider>;
}
