'use client';
import Link from 'next/link';
import {CampusScene} from './campus-scene';
import {CampusBrand} from './campus-brand';
import {ArrowLeft,ArrowRight,GraduationCap,LockKeyhole} from 'lucide-react';
import {useEffect,useState} from 'react';
export function CampusAccountChoice(){const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/auth',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!controller.signal.aborted)setSignedIn(Boolean(d?.user?.uid&&d?.user?.profile?.handle))}).catch(()=>{});return()=>controller.abort()},[]);
 return <main className="cc-campus-account"><CampusScene view="account"/><header className="cc-campus-account-top"><Link href="/" aria-label="Back to campus entrance"><ArrowLeft size={19}/> Entrance</Link><CampusBrand/><small aria-label="Step 2 of 2">02 / 02</small></header><section className="cc-campus-account-card" aria-labelledby="cc-account-title"><span className="cc-campus-account-icon"><GraduationCap size={32}/></span><p className="cc-campus-eyebrow">BVM · VALLABH VIDYANAGAR</p><h1 id="cc-account-title">Your campus.<br/>Your community.</h1><p>Meet your classmates, share campus moments and connect with verified BVM students.</p>{signedIn?<Link className="cc-campus-primary" href="/home">Continue to campus <ArrowRight size={18}/></Link>:<><Link className="cc-campus-primary" href="/register">Sign up with BVM email <ArrowRight size={18}/></Link><Link className="cc-campus-secondary" href="/login">Log in</Link></>}<small><LockKeyhole size={15}/> Secure account verification · BVM student community</small></section><footer>Birla Vishwakarma Mahavidyalaya · CampusConnect</footer></main>
}
