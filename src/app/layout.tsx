import {connection} from 'next/server';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './live.css';
import './feed-ui.css';
import './profile-tab-upgrade.css';
import {Providers} from '@/components/providers';
export const metadata: Metadata = { title: 'CampusConnect — Your Campus. Your People.', description: 'CampusConnect: student social community.', applicationName: 'CampusConnect', icons: {icon:'/cc-mark.svg',apple:'/cc-mark.svg'} };
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#080a0e' };
export default async function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { if(process.env.CSP_NONCE==='1')await connection();return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
