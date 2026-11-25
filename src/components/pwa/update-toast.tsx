'use client';
export function UpdateToast({onRefresh}:{onRefresh:()=>void}){return <div className="cc-pwa-update" role="status">Update available <button type="button" onClick={onRefresh}>Refresh</button></div>}
