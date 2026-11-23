'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, PlusSquare, UserRound, Clapperboard, Send, Search, Heart, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {Avatar} from './avatar';
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
  {label:'Profile',href:'/profile/me',Icon:UserRound},
];
const mobileLabels = new Set(['Home', 'Search', 'Reels', 'Create', 'Community', 'Profile']);
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
function Nav({ pathname, section, mobile = false }: { pathname: string; section:string; mobile?: boolean }) {
  return <nav className={mobile ? 'cc-mobile-nav' : 'cc-navigation'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
    {links.filter((item) => !mobile || mobileLabels.has(item.label)).map((item) => {
      const active = activeLink(pathname, item, section);
      const Icon = item.Icon;
      return <Link key={item.label} href={item.href} scroll={false} className={'cc-nav-item' + (active ? ' is-active' : '')}
        aria-current={active ? 'page' : undefined} aria-label={item.label} title={item.label}>
        <Icon size={mobile ? 23 : 25} strokeWidth={active ? 2.8 : 1.8} fill={active && item.label === 'Home' ? 'currentColor' : 'none'} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
function Suggestions({handle}:{handle:string}){
 const [members,setMembers]=useState<Array<{handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null}>>([]);
 useEffect(()=>{let active=true;fetch('/api/chat?directory=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(active&&Array.isArray(d?.members))setMembers(d.members.filter((m:{handle:string})=>m.handle&&m.handle!==handle).slice(0,8))}).catch(()=>{});return()=>{active=false}},[handle]);
 return <aside className="cc-suggestions"><div className="cc-me"><Avatar user={{handle}} size={44}/><div><Link href="/profile/me"><b>@{handle}</b></Link><small>Your campus account</small></div><Link href="/profile/me">View</Link></div><div className="cc-suggestion-heading">Campus members</div>{members.length?members.map(m=><div className="cc-suggested" key={m.handle}><Avatar user={{name:m.name,handle:m.handle,avatarMediaId:m.avatarMediaId??null,avatarUrl:m.avatarUrl??null}} size={44}/><div><Link href={'/profile/'+encodeURIComponent(m.handle)}><b>@{m.handle}</b></Link><small>{m.name}</small></div><Link href={'/messages/'+encodeURIComponent(m.handle)}>Message</Link></div>):<p style={{fontSize:12,color:'#aaa'}}>No other campus members found.</p>}</aside>;
}

export default function SocialShell({ children }: { children: ReactNode }) {
  const pathname=usePathname(),params=useSearchParams(),router=useRouter();
  const [handle,setHandle]=useState<string|null>(null),[checked,setChecked]=useState(false),[section,setSection]=useState('home');
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
   if(!live)return;setChecked(true);if(x?.user?.profile?.handle)setHandle(x.user.profile.handle);else router.replace('/login');
  }).catch(()=>{if(live){setChecked(true);router.replace('/login')}});return()=>{live=false}},[router]);
  if(!checked||!handle)return <div className="cc-live-empty">Checking campus sign-in… <Link href="/login">Sign in</Link></div>;
  return <StreamConnectionProvider><div className={'cc-app'+(pathname.startsWith('/profile')?' cc-profile-mode':(section==='chat'||pathname.startsWith('/messages'))?' cc-chat-mode':'')}>
    <aside className="cc-sidebar" aria-label="Site navigation">
      <Brand />
      <Nav pathname={pathname} section={section} />

    </aside>
    <main className="cc-main" id="main-content">
      <header className="cc-mobile-header"><Brand compact/></header>
      <div className="cc-page">{children}</div>
    </main>
    {!pathname.startsWith('/profile')&&section!=='chat'&&!pathname.startsWith('/messages')&&<Suggestions handle={handle}/>}
    <Nav pathname={pathname} section={section} mobile />
  </div></StreamConnectionProvider>;
}
