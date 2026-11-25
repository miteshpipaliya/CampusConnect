'use client';
import {ChevronLeft} from 'lucide-react';
import {useRouter} from 'next/navigation';
export function MobileBackBar({path}:{path:string}){const router=useRouter();const segment=path.split('/')[1]||'home';return <div className="cc-pwa-back"><button type="button" aria-label="Go back" onClick={()=>{if(window.history.length>1)router.back();else router.push('/home')}}><ChevronLeft/></button><strong>{segment.charAt(0).toUpperCase()+segment.slice(1)}</strong></div>}
