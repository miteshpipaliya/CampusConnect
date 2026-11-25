'use client';
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="en"><body><main role="alert" style={{padding:32}}><h1>CampusConnect could not load</h1><button onClick={reset}>Retry</button></main></body></html>}
