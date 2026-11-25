'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main role="alert" style={{padding:32}}><h1>Something went wrong</h1><p>Please try loading this page again.</p><button onClick={reset}>Retry</button></main>}
