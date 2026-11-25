'use client';
import {useEffect,useState} from 'react';
export function OfflineBanner(){const [offline,setOffline]=useState(false);useEffect(()=>{const change=()=>setOffline(!navigator.onLine);change();window.addEventListener('online',change);window.addEventListener('offline',change);return()=>{window.removeEventListener('online',change);window.removeEventListener('offline',change)}},[]);return offline?<div className="cc-pwa-offline" role="status">You&apos;re offline — showing what&apos;s loaded</div>:null}
