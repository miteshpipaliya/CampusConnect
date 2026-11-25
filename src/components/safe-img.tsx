'use client';
import {useState,type ComponentProps} from 'react';
type Props=ComponentProps<'img'>&{fallbackSrc?:string};
const placeholder='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23282b30"/%3E%3Cpath d="M8 49l17-18 10 10 10-12 11 20z" fill="%23666b74"/%3E%3Ccircle cx="42" cy="19" r="6" fill="%23666b74"/%3E%3C/svg%3E';
/** Private, expiring signed media must not be sent through the shared Next image optimizer. */
export function SafeImg({src,fallbackSrc=placeholder,loading='lazy',decoding='async',onError,alt='',...props}:Props){
 const [failed,setFailed]=useState<string|undefined>(undefined);
 const source=typeof src==='string'&&failed===src?fallbackSrc:src;
 // eslint-disable-next-line @next/next/no-img-element -- preserve private signed media URL authorization and expiry.
 return <img {...props} src={source} alt={alt} loading={loading} decoding={decoding} onError={event=>{if(typeof src==='string'&&source!==fallbackSrc)setFailed(src);onError?.(event)}}/>;
}
