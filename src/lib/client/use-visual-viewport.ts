'use client';
import {useEffect} from 'react';
export function useVisualViewport(){useEffect(()=>{const v=window.visualViewport;if(!v)return;const sync=()=>document.documentElement.style.setProperty('--cc-vvh',v.height+'px');sync();v.addEventListener('resize',sync);v.addEventListener('scroll',sync);return()=>{v.removeEventListener('resize',sync);v.removeEventListener('scroll',sync);document.documentElement.style.removeProperty('--cc-vvh')}},[])}
