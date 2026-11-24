import type {ReactNode} from 'react';
export function NavIcon({name,active=false}:{name:string;active?:boolean}){let content:ReactNode;switch(name){
case 'Home':content=<path d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3Z" fill={active?'currentColor':'none'}/>;break;
case 'Reels':content=<><rect x="3" y="3" width="18" height="18" rx="5" fill={active?'currentColor':'none'}/><path d="m10 8 6 4-6 4Z" fill={active?'var(--cc-shell-bg)':'currentColor'} stroke={active?'var(--cc-shell-bg)':'currentColor'}/></>;break;
case 'Messages':content=<path d="m3 5 18-2-6 18-4.4-8L3 9Z M10.6 13 21 3" fill={active?'currentColor':'none'}/>;break;
case 'Search':content=<><circle cx="10.8" cy="10.8" r="7.2"/><path d="m16.1 16.1 5 5"/></>;break;
case 'Notifications':content=<path d="M20.7 5.8a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.3-1.3a5.2 5.2 0 0 0-7.4 7.4L12 22l8.7-8.8a5.2 5.2 0 0 0 0-7.4Z" fill={active?'currentColor':'none'}/>;break;
case 'Create':content=<path d="M12 3v18M3 12h18"/>;break;
case 'Dashboard':content=<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 16v-5m4 5V7m4 9v-7"/></>;break;
case 'More':content=<path d="M4 6h16M4 12h16M4 18h16"/>;break;
default:content=<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>;}
return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={active?2.4:1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{content}</svg>}
