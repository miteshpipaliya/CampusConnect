import { Suspense } from 'react';
import SocialShell from '@/components/social-shell';
export default function SocialLayout({children}:{children:React.ReactNode}){return <Suspense fallback={null}><SocialShell>{children}</SocialShell></Suspense>}
