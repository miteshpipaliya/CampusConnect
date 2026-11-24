'use client';
import {useCallback,useState} from 'react';
import {normalizeVolume} from '../core/audio-policy';
/** A fresh page visit starts at full volume; scrolling between reels keeps the chosen value. */
export function useReelVolume(){const [volume,setVolume]=useState(1);const changeVolume=useCallback((value:number)=>{const next=normalizeVolume(value);setVolume(next);try{sessionStorage.setItem('cc:reels:volume',String(next))}catch{/* Storage is optional. */}},[]);return {volume,changeVolume}}
