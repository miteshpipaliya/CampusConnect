'use client';

import Link from 'next/link';
import {RulesOnboarding} from './campus/rules-onboarding';
import {ReferralOnboarding} from './referrals/referral-onboarding';
import {LoadingSkeleton} from './loading-skeleton';
import {PushSettings,PushConnection} from './push-settings';
import '@/app/chat-live-upgrade.css';
import {LiveMessageActivity} from './chat/live-message-activity';
import '@/app/shell-upgrade.css';
import '@/app/notifications-upgrade.css';
import '@/app/explore-upgrade.css';
import {NotificationsFeed} from './notifications-feed';
import {BrandMark} from './brand-mark';
import { usePathname, useSearchParams, useSelectedLayoutSegment } from 'next/navigation';
import {Menu,Send,ImagePlus,Film,Camera} from 'lucide-react';
import {NavIcon} from './icons/nav-icons';
import {isRootTab,navActive,badgeLabel} from '@/lib/core/nav-active';
import {clearPwaDevice,updateThemeColor} from '@/lib/client/pwa-device';
import {useVisualViewport} from '@/lib/client/use-visual-viewport';
import {MobileBackBar} from './pwa/mobile-back-bar';
import {MobileMoreSheet} from './pwa/mobile-more-sheet';
import {OfflineBanner} from './pwa/offline-banner';
import {InstallPrompt} from './pwa/install-prompt';
import {MoreMenu} from './more-menu';
import {SidePanel} from './side-panel';
import {ShellSession} from './shell-session';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {Avatar} from './avatar';
import {userKey} from '@/lib/queries';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {StreamConnectionProvider} from './chat/stream-connection';
import { useRouter } from 'next/navigation';

type NavItem={label:string;href:string};
const links:NavItem[]=[{label:'Home',href:'/home'},{label:'Reels',href:'/reels'},{label:'Messages',href:'/messages'},{label:'Search',href:'/explore'},{label:'Notifications',href:'/notifications'},{label:'Create',href:'/home?compose=1'},{label:'Dashboard',href:'/dashboard'},{label:'Leaderboard',href:'/leaderboard'},{label:'Profile',href:'/profile/me'}];
const mobileLabels=new Set(['Home','Reels','Messages','Search','Profile']);
function Badge({count,label,mobile=false}:{count:number;label:string;mobile?:boolean}){const value=badgeLabel(count,mobile);return value?<b className="cc-nav-badge" aria-label={label} title={count+' '+label.toLowerCase()}>{value}</b>:null}
function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/home" className={'cc-brand' + (compact ? ' cc-brand-mobile' : '')} aria-label="CampusConnect home">
    <BrandMark/>
    <span className="cc-wordmark">CampusConnect</span>
  </Link>;
}
function Nav({ pathname, section, mobile = false, counts, account, onPanel }: { pathname: string; section:string; mobile?: boolean; counts:{unread:number;unreadMessages:number};account?:{handle:string;avatarMediaId:string|null};onPanel?:(name:'notifications')=>void }) {
  const [createOpen,setCreateOpen]=useState(false);
  const createRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setCreateOpen(false)},[pathname]);
  useEffect(()=>{if(!createOpen)return;const close=(e:PointerEvent)=>{if(!createRef.current?.contains(e.target as Node))setCreateOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setCreateOpen(false);createRef.current?.querySelector('button')?.focus()}};const mq=window.matchMedia('(min-width:1024px)');const resize=()=>{if(!mq.matches)setCreateOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);mq.addEventListener('change',resize);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);mq.removeEventListener('change',resize)}},[createOpen]);
  return <nav className={mobile ? 'cc-mobile-nav' : 'cc-navigation'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
    {links.filter((item) => !mobile || mobileLabels.has(item.label)).map((item) => {
      const active=navActive(pathname,item.label,section);
      if(!mobile&&item.label==='Create')return <div key={item.label} ref={createRef} className="cc-desktop-create-wrap"><button type="button" className="cc-nav-item" aria-label="Create" title="Create" aria-expanded={createOpen} onClick={()=>setCreateOpen(v=>!v)}><i className="cc-nav-icon"><NavIcon name="Create"/></i><span className="cc-nav-label">Create</span></button>{createOpen&&<div className="cc-desktop-create-menu" aria-label="Create content">{([{kind:'post',label:'Post',Icon:ImagePlus},{kind:'story',label:'Story',Icon:Camera},{kind:'reel',label:'Reel',Icon:Film}] as const).map(({kind,label,Icon})=><Link key={kind} href={'/home?compose=1&kind='+kind} onClick={()=>setCreateOpen(false)}>{label}<Icon size={20}/></Link>)}</div>}</div>;
      return <Link key={item.label} href={item.href} scroll={false} className={'cc-nav-item' + (active ? ' is-active' : '')}
        onClick={e=>{if(!mobile&&onPanel&&item.label==='Notifications'){e.preventDefault();onPanel('notifications')}}} aria-current={active ? 'page' : undefined} aria-label={item.label} title={item.label}>
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
  const actualPath=usePathname(),params=useSearchParams(),router=useRouter(),modalSegment=useSelectedLayoutSegment('modal');
  const backgroundPath=useRef(actualPath);const hasPostModal=Boolean(modalSegment&&modalSegment.includes('posts')&&actualPath.startsWith('/posts/'));if(!hasPostModal)backgroundPath.current=actualPath;const pathname=hasPostModal?backgroundPath.current:actualPath;
  const [avatarMediaId,setAvatarMediaId]=useState<string|null>(null),[menu,setMenu]=useState(false),[recent,setRecent]=useState<Array<{handle:string;avatarUrl:string|null;avatarMediaId:string|null}>>([]),[menuError,setMenuError]=useState('');
  const [rulesStep,setRulesStep]=useState<number|null>(null);
  const [panel,setPanel]=useState<'notifications'|null>(null);
  const [liveUnread,setLiveUnread]=useState<number|null>(null);
  const [uid,setUid]=useState<string|null>(null);
  const [handle,setHandle]=useState<string|null>(null),[checked,setChecked]=useState(false),[section,setSection]=useState(params.get('section')||'home');
  const queryClient=useQueryClient();
  const rulesDone=useCallback(()=>{setRulesStep(null);void queryClient.invalidateQueries()},[queryClient]);
  const [mobileMore,setMobileMore]=useState(false);
  const [mobileCreate,setMobileCreate]=useState(false);
  const mobileCreateRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setMobileCreate(false)},[actualPath,params]);
  useEffect(()=>{if(!mobileCreate)return;const outside=(e:PointerEvent)=>{if(!mobileCreateRef.current?.contains(e.target as Node))setMobileCreate(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMobileCreate(false);mobileCreateRef.current?.querySelector('button')?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[mobileCreate]);
  useVisualViewport();
  const logout=async()=>{setMenuError('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw Error('Sign out failed');queryClient.clear();await clearPwaDevice();window.location.assign('/')}catch{setMenuError('Sign out failed')}};
  const changeMenu=useCallback((open:boolean)=>{if(open)setPanel(null);setMenu(open)},[]);
  const summary=useQuery({queryKey:userKey(uid,'notification-summary',liveUnread===null?'fallback':'live'),enabled:checked&&Boolean(uid),queryFn:async({signal})=>{
   const response=await fetch('/api/notifications/summary'+(liveUnread===null?'':'?messages=0'),{cache:'no-store',signal});
   if(!response.ok)throw Error('Notification summary unavailable');
   const data=await response.json();
   return {unread:Number(data.unread||0),unreadMessages:Number(data.unreadMessages||0)};
  },refetchInterval:liveUnread===null?15000:30000,refetchIntervalInBackground:false,staleTime:15000});
  const counts={unread:summary.data?.unread??0,unreadMessages:liveUnread??summary.data?.unreadMessages??0};
  useEffect(()=>{if(!checked||!uid)return;const count=counts.unread+counts.unreadMessages;void (async()=>{try{if(count)await navigator.setAppBadge?.(count);else await navigator.clearAppBadge?.()}catch{}})()},[checked,uid,counts.unread,counts.unreadMessages]);
  useEffect(()=>{
   const changed=()=>{if(uid&&document.visibilityState!=='hidden')void queryClient.invalidateQueries({queryKey:userKey(uid,'notification-summary')})};
   window.addEventListener('cc-notifications-updated',changed);document.addEventListener('visibilitychange',changed);
   return()=>{window.removeEventListener('cc-notifications-updated',changed);document.removeEventListener('visibilitychange',changed)};
  },[uid,queryClient]);
  useEffect(()=>{setSection(params.get('section')||'home')},[params]);
  useEffect(()=>{
   try{const cached=localStorage.getItem('cc-theme');if(cached==='dark'||cached==='light'){document.documentElement.dataset.theme=cached;updateThemeColor(cached)}}catch{/* Storage unavailable */}
   void fetch('/api/settings',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    const theme=data?.settings?.theme;
    if(theme==='dark'||theme==='light'){document.documentElement.dataset.theme=theme;updateThemeColor(theme);try{localStorage.setItem('cc-theme',theme)}catch{/* Storage unavailable */}}
   }).catch(()=>{});
  },[]);
  useEffect(()=>{let live=true;fetch('/api/auth',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{
   if(!live)return;setChecked(true);const previous=queryClient.getQueryData<string>(['cc-active-uid']);const next=x?.user?.uid;if(previous&&previous!==next)queryClient.clear();if(x?.user?.profile?.handle&&next){queryClient.setQueryData(['cc-active-uid'],next);setRulesStep(x.user.rulesOnboarding?.required?x.user.rulesOnboarding.step:null);setUid(x.user.uid);setHandle(x.user.profile.handle);setAvatarMediaId(x.user.profile.avatarMediaId||null)}else router.replace('/');
  }).catch(()=>{if(live){setChecked(true);router.replace('/')}});return()=>{live=false}},[router,queryClient]);
  useEffect(()=>{if(!uid)return;let live=true;const verify=()=>{if(document.hidden)return;void fetch('/api/auth',{cache:'no-store'}).then(r=>{if(live&&r.status===401){queryClient.clear();window.location.replace('/')}}).catch(()=>{})};const timer=window.setInterval(verify,30000);document.addEventListener('visibilitychange',verify);return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',verify)}},[uid,queryClient]);
  useEffect(()=>{if(!uid)return;let live=true;void fetch('/api/chat',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live)setRecent(Array.isArray(d?.conversations)?d.conversations.slice(0,3):[])}).catch(()=>{});return()=>{live=false}},[uid]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);setPanel(null)}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  useEffect(()=>{setPanel(null);setMenu(false);setMobileMore(false)},[actualPath,params]);
  useEffect(()=>{if(rulesStep!==null&&actualPath!=='/home')router.replace('/home')},[rulesStep,actualPath,router]);
  if(!checked||!handle)return <LoadingSkeleton kind="shell"/>;
  return <ShellSession.Provider value={uid}><StreamConnectionProvider key={uid} enabled={rulesStep===null}>{rulesStep===null&&<><PushConnection/><LiveMessageActivity onUnread={setLiveUnread} onRecent={setRecent}/></>}<div inert={rulesStep!==null} aria-hidden={rulesStep!==null?true:undefined} className={'cc-app cc-shell-v2'+(rulesStep!==null?' cc-rules-background':'')+(panel?' cc-panel-open':'')+(panel?' cc-force-rail':'')+(!pathname.startsWith('/leaderboard')&&!pathname.startsWith('/explore')&&!pathname.startsWith('/profile')&&!pathname.startsWith('/reels')&&section!=='chat'&&!pathname.startsWith('/messages')?' cc-with-suggestions':'')+(pathname.startsWith('/leaderboard')?' cc-leaderboard-mode':'')+(pathname.startsWith('/explore')?' cc-explore-mode':'')+(pathname==='/home'?' cc-home-mode':'')+(pathname.startsWith('/reels')?' cc-reels-mode':pathname.startsWith('/profile')?' cc-profile-mode':(section==='chat'||pathname.startsWith('/messages'))?' cc-chat-mode':'')}>
    <aside className="cc-sidebar" aria-label="Site navigation">
      <Brand />
      <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} onPanel={name=>{setMenu(false);setPanel(old=>old===name?null:name)}}/>
      <MoreMenu open={menu} setOpen={changeMenu}><Link role="menuitem" href="/settings" onClick={()=>setMenu(false)}>Settings</Link><Link role="menuitem" href="/settings/saved" onClick={()=>setMenu(false)}>Saved</Link><Link role="menuitem" href="/home?section=community" onClick={()=>setMenu(false)}>Community</Link><PushSettings/><hr/><button role="menuitem" onClick={()=>void logout()}>Log out</button>{menuError&&<p role="alert">{menuError}</p>}</MoreMenu>

    </aside>
    <main className="cc-main" id="main-content">
      <header className={'cc-mobile-header'+(actualPath==='/home'?' cc-mobile-home-header':'')}>{actualPath==='/home'?<><div className="cc-mobile-create-wrap" ref={mobileCreateRef}><button type="button" className="cc-mobile-create-trigger" aria-label="Create" aria-expanded={mobileCreate} onClick={()=>setMobileCreate(v=>!v)}><NavIcon name="Create"/></button>{mobileCreate&&<div className="cc-mobile-create-menu" aria-label="Create content">{([{kind:'reel',label:'Reel',Icon:Film},{kind:'post',label:'Post',Icon:ImagePlus},{kind:'story',label:'Story',Icon:Camera}] as const).map(({kind,label,Icon})=><Link key={kind} href={'/home?compose=1&kind='+kind} onClick={()=>setMobileCreate(false)}><Icon size={22}/>{label}</Link>)}</div>}</div><Link href="/home" className="cc-mobile-centered-brand" aria-label="CampusConnect home">CampusConnect</Link><Link className="cc-mobile-heart" href="/notifications" aria-label="Notifications"><NavIcon name="Notifications"/><Badge count={counts.unread} label="Unread notifications" mobile/></Link></>:<>{isRootTab(actualPath)?<Brand compact/>:<MobileBackBar path={actualPath}/>}<div className="cc-mobile-actions"><Link href="/home?compose=1" aria-label="Create"><NavIcon name="Create"/></Link><Link href="/notifications" aria-label="Notifications"><NavIcon name="Notifications"/><Badge count={counts.unread} label="Unread notifications" mobile/></Link><button type="button" aria-label="More" onClick={()=>setMobileMore(true)}><Menu size={24}/></button></div></>}</header>
      <OfflineBanner/><InstallPrompt/><div className="cc-referral-onboarding-slot">{rulesStep===null&&<ReferralOnboarding key={uid}/>}</div><div className="cc-page">{children}</div>
    </main>
    {!pathname.startsWith('/leaderboard')&&!pathname.startsWith('/explore')&&!pathname.startsWith('/profile')&&!pathname.startsWith('/reels')&&section!=='chat'&&!pathname.startsWith('/messages')&&<Suggestions handle={handle} avatarMediaId={avatarMediaId}/>}
    <Nav pathname={pathname} section={section} counts={counts} account={{handle,avatarMediaId}} mobile />
    <MobileMoreSheet open={mobileMore} onClose={()=>setMobileMore(false)} onLogout={()=>void logout()} error={menuError}/>
    {panel&&<SidePanel label="Notifications" onClose={()=>setPanel(null)}><NotificationsFeed/></SidePanel>}
    {(pathname==='/home'||pathname.startsWith('/explore')||pathname.startsWith('/reels')||pathname.startsWith('/profile'))&&<Link href="/messages" className="cc-messages-pill"><Send size={23}/> Messages <span className="cc-recent-avatars">{recent.map(m=><Avatar key={m.handle} user={{handle:m.handle,avatarUrl:m.avatarUrl,avatarMediaId:m.avatarMediaId}} size={24}/>)}</span><Badge count={counts.unreadMessages} label="Unread conversations"/></Link>}
  </div>{rulesStep!==null&&<RulesOnboarding key={uid} initialStep={rulesStep} onComplete={rulesDone}/>}</StreamConnectionProvider></ShellSession.Provider>;
}
