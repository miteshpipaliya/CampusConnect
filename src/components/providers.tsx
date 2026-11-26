'use client';
import {MediaLifecycle} from './media-lifecycle';
import {IntroProvider} from './campus/intro-provider';
import {InstallCapture} from './pwa/install-prompt';
import {PwaRegister} from './pwa/pwa-register';
import {useState,type ReactNode} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
export function Providers({children}:{children:ReactNode}){
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1,refetchOnWindowFocus:false}}}));
 return <QueryClientProvider client={client}><MediaLifecycle/><InstallCapture/><PwaRegister/><IntroProvider>{children}</IntroProvider></QueryClientProvider>;
}
