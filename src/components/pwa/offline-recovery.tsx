'use client';
import {useEffect} from 'react';
export function OfflineRecovery(){useEffect(()=>{const online=()=>location.replace('/home');window.addEventListener('online',online);return()=>window.removeEventListener('online',online)},[]);return <button type="button" onClick={()=>location.reload()}>Try again</button>}
