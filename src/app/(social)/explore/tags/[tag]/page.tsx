import Link from 'next/link';import {ExploreGrid} from '@/components/explore-grid';import '@/app/explore-upgrade.css';
export default async function TagPage({params,searchParams}:{params:Promise<{tag:string}>;searchParams:Promise<{sort?:string}>}){
 const {tag}=await params,{sort}=await searchParams;
 return <section className="cc-explore-page"><header><Link href="/explore">← Explore</Link><h1>#{tag}</h1><nav><Link href={'/explore/tags/'+encodeURIComponent(tag)+'?sort=top'}>Top</Link> · <Link href={'/explore/tags/'+encodeURIComponent(tag)+'?sort=recent'}>Recent</Link></nav></header><ExploreGrid tag={tag} sort={sort==='top'?'top':'recent'}/></section>;
}