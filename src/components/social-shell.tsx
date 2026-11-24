'use client';

import Link from 'next/link';
import {PushSettings,PushConnection} from './push-settings';
import '@/app/chat-live-upgrade.css';
import {LiveMessageActivity} from './chat/live-message-activity';
import '@/app/shell-upgrade.css';
import '@/app/notifications-upgrade.css';
import '@/app/explore-upgrade.css';
import {NotificationsFeed} from './notifications-feed';
import {SearchPanel} from './search-panel';
import { usePathname, useSearchParams } from 'next/navigation';
import {Send} from 'lucide-react';
import {NavIcon} from './icons/nav-icons';
import {navActive,badgeLabel} from '@/lib/core/nav-active';
import {MoreMenu} from './more-menu';
import {SidePanel} from './side-panel';
import {ShellSession} from './shell-session';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {Avatar} from './avatar';
import {userKey} from '@/lib/queries';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {StreamConnectionProvider} from './chat/stream-connection';
import { useRouter } from 'next/navigation';

type NavItem={label:string;href:string};
const links:NavItem[]=[{label:'Home',href:'/home'},{label:'Reels',href:'/reels'},{label:'Messages',href:'/messages'},{label:'Search',href:'/explore'},{label:'Notifications',href:'/notifications'},{label:'Create',href:'/home?compose=1'},{label:'Dashboard',href:'/dashboard'},{label:'Profile',href:'/profile/me'}];
const mobileLabels=new Set(['Home','Reels','Messages','Search','Profile']);
function Badge({count,label,mobile=false}:{count:number;label:string;mobile?:boolean}){const value=badgeLabel(count,mobile);return value?<b className="cc-nav-badge" aria-label={label} title={count+' '+label.toLowerCase()}>{value}</b>:null}
function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/home" className={'cc-brand' + (compact ? ' cc-brand-mobile' : '')} aria-label="CampusConnect home">
    <span className="cc-logo" aria-hidden="true"><span style={{fontWeight:900,letterSpacing:"-0.12em"}}>C<span style={{color:"#c4a0ff"}}>C</span></span></span>
    <span className="cc-wordmark">Campus<span>Connect</span><small>BVM CAMPUS</small></span>
  </Link>;
}
function Nav({ pathname, section, mobile = false, counts, account, onPanel }: { pathname: string; section:string; mobile?: boolean; counts:{unread:number;unreadMessages:number};account?:{handle:string;avatarMediaId:string|null};onPanel?:(name:'notifications'|'search')=>void }) {
  return <nav className={mobile ? 'cc-mobile-nav' : 'cc-navigation'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
    {links.filter((item) => !mobile || mobileLabels.has(item.label)).map((item) => {
      const active=navActive(pathname,item.label,section);
      return <Link key={item.label} href={item.href} scroll={false} className={'cc-nav-item' + (active ? ' is-active' : '')}
        onClick={e=>{if(!mobile&&onPanel&&(item.label==='Notifications'||item.label==='Search')){e.preventDefault();onPanel(item.label==='Notifications'?'notifications':'search')}}} aria-current={active ? 'page' : undefined} aria-label={item.label}>
        <i className="cc-nav-icon">{item.label==='Profile'&&account?<Avatar user={account} size={24} ring={active?'seen':'none'}/>:<NavIcon name={item.label} active={active}/>}</i>
        <span className="cc-nav-label">{item.label}</span>
        <Badge count={item.label==='Notifications'?counts.unread:item.label==='Messages'?counts.unreadMessages:0} label={item.label==='Messages'?'Unread conversations':'Unread notifications'} mobile={mobile}/>

      </Link>;
    })}
  </nav>;
}
function FollowSuggestion({handle}:{handle:string}){const [status,setStatus]=useState('none'),[busy,setBusy]=useState(false);return <button className="cc-suggestion-follow" disabled={busy||status!=='none'} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle})});const d=await r.json();if(r.ok)setStatus(d.status||'active')}catch{/* Keep the follow action available for retry. */}finally{setBusy(false)}}}>{status==='pending'?'Requested':status==='active'?'Following':'Follow'}</button>}
function Suggestions({handle,avatarMediaId}:{handle:string;avatarMediaId:string|null}){
 const [members,setMembers]=useState<Array<{handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null;reason?:string}>>([]);
 useEffect(()=>{let active=true;fetch('/api/suggestions',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(active&&Array.isArray(d?.members))setMembers(d.members.filter((m:{handle:string})=>m.handle&&m.handle!==handle).slice(0,8))}).catch(()=>{});return()=>{active=false}},[handle]);
 return <aside className="cc-suggestions"><div className="cc-me"><Avatar user={{handle,avatarMediaId}} size={44}/><div><Link href="/profile/me"><b>@{handle}</b></Link><small>Your profile</small></div><Link href="/profile/me" >Profile</Link></div><div className="cc-suggestion-heading">Suggested for you</div>{members.length?members.map(m=><div className="cc-suggested" key={m.handle}><Avatar user={{name:m.name,handle:m.handle,avatarMediaId:m.avatarMediaId??null,avatarUrl:m.avatarUrl??null}} size={44}/><div><Link href={'/profile/'+encodeURIComponent(m.handle)}><b>@{m.handle}</b></Link><small>{m.reason||m.name}</small></div><FollowSuggestion handle={m.handle}/></div>):<p style={{fontSize:12,color:'#aaa'}}>No other campus members found.</p>}</aside>;
}

export default function SocialShell({ children }: { children: ReactNode }) {
  const pathname=usePathname(),params=useSearchParams(),router=useRouter();
  const [avatarMediaId,setAvatarMediaId]=useState<string|null>(null),[menu,setMenu]=useState(false),[recent,setRecent]=useState<Array<{handle:string;avatarUrl:string|null;avatarMediaId:string|null}>>([]),[menuError,setMenuError]=useState('');
  const [panel,setPanel]=useState<'notifications'|'search'|null>(null),[collapsed,setCollapsed]=useState(false);
  const [liveUnread,setLiveUnread]=useState<number|null>(null);
  const [uid,setUid]=useState<string|null>(null);
  const [handle,setHandle]=useState<string|null>(null),[checked,setChecked]=useState(false),[section,setSection]=useState('home');
  const queryClient=useQueryClient();
  const changeMenu=useCallback((open:boolean)=>{if(open)setPanel(null);setMenu(open)},[]);
  const summary=useQuery({queryKey:userKey(uid,'notification-summary',liveUnread===null?'fallback':'live'),enabled:checked&&Boolean(uid),queryFn:async({signal})=>{
   const response=await fetch('/api/notifications/summary'+(liveUnread===null?'':'?messages=0'),{cache:'no-store',signal});
   if(!response.ok)throw Error('Notification summary unavailable');
   const data=await response.json();
   return {unread:Number(data.unread||0),unreadMessages:Number(data.unreadMessages||0)};
  },refetchInterval:5000,refetchIntervalInBackground:false,staleTime:5000});
  const counts={unread:summary.data?.unread??0,unreadMessages:liveUnread??summary.data?.unreadMessages??0};
  useEffect(()=>{
   const changed=()=>{if(uid&&document.visibilityState!=='hidden')void queryClient.invalidateQueries({queryKey:userKey(uid,'notification-summary')})};
   window.addEventListener('cc-notifications-updated',changed);document.addEventListener('visibilitychange',changed);
   return()=>{window.removeEventListener('cc-notifications-updated',changed);document.removeEventListener('visibilitychange',changed)};
  },[uid,queryClient]);
  useEffect(()=>{setSection(params.get('section')||'home')},[params]);
  useEffect(()=>{
   try{const cached=localStorage.getItem('cc-theme');if(cached==='dark'||cached==='light')document.documentElement.dataset.theme=cached}catch{/* Storage unavailable */}
   void fetch('/api/settings',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    const theme=data?.settings?.theme;
    if(theme==='dark'||theme==='light'){document.documentElement.dataset.theme=theme;try{localStorage.setItem('cc-theme',theme)}catch{/* Storage unavailable */}}
   }).catch(()=>{});
  },[]);
  useEffect(()=>{let live=true;fetch('/api/auth',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{
   if(!live)return;setChecked(true);const previous=queryClient.getQueryData<string>(['cc-active-uid']);const next=x?.user?.uid;if(previous&&previous!==next)queryClient.clear();if(x?.user?.profile?.handle&&next){queryClient.setQueryData(['cc-active-uid'],next);setUid(x.user.uid);setHandle(x.user.profile.handle);setAvatarMediaId(x.user.profile.avatarMediaId||null)}else router.replace('/login');
  }).catch(()=>{if(live){setChecked(true);router.replace('/login')}});return()=>{live=false}},[router,queryClient]);
  useEffect(()=>{if(!uid)return;let live=true;void fetch('/api/chat',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live)setRecent(Array.isArray(d?.conversations)?d.conversations.slice(0,3):[])}).catch(()=>{});return()=>{live=false}},[uid]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);setPanel(null)}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  useEffect(()=>{setPanel(null);setMenu(false)},[pathname,params]);
  if(!checked||!handle)return <div className="cc-live-empty">Checking campus sign-in… <Link href="/login">Sign in</Link></div>;
  return <ShellSession.Provider value={uid}><StreamConnectionProvider key={uid}><PushConnection/><LiveMessageActivity onUnread={setLiveUnread} onRecent={setRecent}/><div className={'cc-app cc-shell-v2'+(panel?' cc-panel-open':'')+(collapsed?' cc-shell-collapsed':'')+((collapsed||panel||pathname.startsWith('/reels')||pathname.startsWith('/messages')||section==='chat')?' cc-force-rail':'')+(!pathname.startsWith('/profile')&&!pathname.startsWith('/reels')&&section!=='chat'&&!pathname.startsWith('/messages')?' cc-with-suggestions':'')+(pathname==='/home'?' cc-home-mode':'')+(pathname.startsWith('/reels')?' cc-reels-mode':pathname.startsWith('/profile')?' cc-profile-mode':(section==='chat'||pathname.startsWith('/messages'))?' cc-chat-mode':'')}>
    <aside className="cc-sidebar" aria-label="Site navigation">
      <Brand />
      <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} onPanel={name=>{setMenu(false);setPanel(old=>old===name?null:name)}}/>
      <MoreMenu open={menu} setOpen={changeMenu}><Link role="menuitem" href="/settings" onClick={()=>setMenu(false)}>Settings</Link><Link role="menuitem" href="/saved" onClick={()=>setMenu(false)}>Saved</Link><Link role="menuitem" href="/home?section=community" onClick={()=>setMenu(false)}>Community</Link><PushSettings/><button role="menuitem" onClick={()=>{setCollapsed(v=>!v);setMenu(false)}}>{collapsed?'Expand sidebar':'Collapse sidebar'}</button><hr/><button role="menuitem" onClick={async()=>{try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw Error('Sign out failed');queryClient.clear();window.location.assign('/login')}catch{setMenuError('Sign out failed')}}}>Log out</button>{menuError&&<p role="alert">{menuError}</p>}</MoreMenu>

    </aside>
    <main className="cc-main" id="main-content">
      <header className="cc-mobile-header"><Brand compact/><div className="cc-mobile-actions"><Link href="/home?compose=1" aria-label="Create"><NavIcon name="Create"/></Link><Link href="/notifications" aria-label="Notifications"><NavIcon name="Notifications"/><Badge count={counts.unread} label="Unread notifications" mobile/></Link><Link href="/messages" aria-label="Messages"><NavIcon name="Messages"/><Badge count={counts.unreadMessages} label="Unread conversations" mobile/></Link></div></header>
      <div className="cc-page">{children}</div>
    </main>
    {!pathname.startsWith('/profile')&&!pathname.startsWith('/reels')&&section!=='chat'&&!pathname.startsWith('/messages')&&<Suggestions handle={handle} avatarMediaId={avatarMediaId}/>}
    <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} mobile />
    {panel&&<SidePanel label={panel==='notifications'?'Notifications':'Search'} onClose={()=>setPanel(null)}>{panel==='notifications'?<NotificationsFeed/>:<SearchPanel/>}</SidePanel>}
    {(pathname==='/home'||pathname.startsWith('/explore')||pathname.startsWith('/reels'))&&<Link href="/messages" className="cc-messages-pill"><Send size={23}/> Messages <span className="cc-recent-avatars">{recent.map(m=><Avatar key={m.handle} user={{handle:m.handle,avatarUrl:m.avatarUrl,avatarMediaId:m.avatarMediaId}} size={24}/>)}</span><Badge count={counts.unreadMessages} label="Unread conversations"/></Link>}
  </div></StreamConnectionProvider></ShellSession.Provider>;
}
