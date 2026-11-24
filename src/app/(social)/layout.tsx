import { Suspense } from 'react';
import SocialShell from '@/components/social-shell';
export default function SocialLayout({children,modal}:{children:React.ReactNode;modal:React.ReactNode}){
 return <Suspense fallback={null}><SocialShell>{children}{modal}</SocialShell></Suspense>
}
