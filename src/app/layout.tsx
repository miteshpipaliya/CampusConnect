import type { Metadata, Viewport } from 'next';
import './globals.css';
import './live.css';
import './feed-ui.css';
import './profile-tab-upgrade.css';
import {Providers} from '@/components/providers';
export const metadata: Metadata = { title: 'CampusConnect — Your Campus. Your People.', description: 'CampusConnect: student social community.', applicationName: 'CampusConnect' };
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#080a0e' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
