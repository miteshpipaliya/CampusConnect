import Link from 'next/link';
import {ArrowRight,Users} from 'lucide-react';
export default function IndexPage(){return <main className="cc-campus-entry"><section className="cc-campus-entry-stage" aria-labelledby="campus-entry-title">
 <header className="cc-campus-entry-mobile-brand"><span className="cc-campus-brand-mark">C</span><strong>CampusConnect</strong><small>BVM · ANAND</small></header>
 <div className="cc-campus-entry-title"><p>WELCOME TO</p><h1 id="campus-entry-title">BVM</h1><p className="cc-campus-entry-script">Your Campus. Your Community.</p></div>
 <Link className="cc-campus-enter-button" href="/enter">ENTER CAMPUS <ArrowRight aria-hidden="true"/></Link>
 <footer className="cc-campus-entry-footer"><span><Users size={18}/> A community built for BVM students</span><span className="cc-campus-entry-step">01 / 02 <i/></span></footer>
 </section></main>}
