import {connection} from 'next/server';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './live.css';
import './feed-ui.css';
import './profile-tab-upgrade.css';
import './pwa.css';
import './referrals.css';
import './campus-illustrated.css';
import './rules-onboarding.css';
import './mobile-ui.css';
import './desktop-ui.css';
import {Providers} from '@/components/providers';
export const metadata: Metadata = { title: 'CampusConnect — Your Campus. Your People.', description: 'CampusConnect: student social community.', applicationName: 'CampusConnect', icons:{icon:[{url:'/pwa-icon/32?v=1',sizes:'32x32',type:'image/png'},{url:'/cc-mark.svg',type:'image/svg+xml'}],apple:[{url:'/pwa-icon/apple-180?v=1',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,title:'CampusConnect',statusBarStyle:'black-translucent'},formatDetection:{telephone:false} };
export const viewport: Viewport = { width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',colorScheme:'dark',themeColor:'#080a0e' };
export default async function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { if(process.env.CSP_NONCE==='1')await connection();return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
