import '@/app/loading-skeleton.css';
type Kind='story'|'reel'|'profile'|'notifications'|'inbox'|'conversation'|'shell';
export function LoadingSkeleton({kind}:{kind:Kind}){
 const rows=kind==='notifications'?6:kind==='inbox'?4:kind==='conversation'?5:kind==='shell'?3:0;
 return <div className={'cc-load-skeleton cc-load-'+kind} role="status" aria-label={'Loading '+kind} aria-busy="true">
 {kind==='profile'?<><div className="cc-load-profile-head"><i/><div><b/><b/><b/></div></div><div className="cc-load-profile-tabs"/><div className="cc-load-grid">{Array.from({length:6},(_,i)=><i key={i}/>)}</div></>:kind==='story'||kind==='reel'?<div className="cc-load-video"><div className="cc-load-progress"/><div className="cc-load-video-user"><i/><b/></div><div className="cc-load-video-caption"><b/><b/></div></div>:Array.from({length:rows},(_,i)=><div key={i} className="cc-load-row"><i/><div><b/><b/></div></div>)}
 </div>
}
