import Link from 'next/link';
import {ArrowRight,Users} from 'lucide-react';
import {CampusScene} from '@/components/campus/campus-scene';
import {CampusBrand} from '@/components/campus/campus-brand';
export default function IndexPage(){return <main className="cc-campus-entry"><section className="cc-campus-entry-stage" aria-labelledby="campus-entry-title">
 <CampusScene view="welcome"/>
 <header className="cc-campus-entry-header"><CampusBrand/><small>BVM · ANAND</small></header>
 <div className="cc-campus-entry-title"><p>WELCOME TO</p><h1 id="campus-entry-title">BVM</h1><p className="cc-campus-entry-script">Your Campus. Your Community.</p></div>
 <Link className="cc-campus-enter-button" href="/enter">ENTER CAMPUS <ArrowRight aria-hidden="true"/></Link>
 <footer className="cc-campus-entry-footer"><span><Users size={18}/> A community built for BVM students</span><span className="cc-campus-entry-step" aria-label="Step 1 of 2">01 / 02 <i aria-hidden="true"/></span></footer>
 </section></main>}
