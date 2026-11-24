const key=(uid:string,path:string)=>'cc-explore-scroll:'+uid+':'+path;
export function rememberExploreScroll(uid:string|null){if(!uid||!location.pathname.startsWith('/explore'))return;try{sessionStorage.setItem(key(uid,location.pathname+location.search),String(window.scrollY))}catch{/* storage disabled */}}
export function takeExploreScroll(uid:string,path:string):number|null{try{const k=key(uid,path),raw=sessionStorage.getItem(k);sessionStorage.removeItem(k);const n=raw===null?NaN:Number(raw);return Number.isFinite(n)&&n>=0?n:null}catch{return null}}
