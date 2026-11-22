import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {getStorage} from './storage';

function app(){
 const present=getApps().find(x=>x.name==='campusconnect');
 if(present)return present;
 const projectId=process.env.FIREBASE_PROJECT_ID;
 const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
 const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!projectId||!clientEmail||!privateKey)throw Error('Firebase configuration unavailable');
 return initializeApp({credential:cert({projectId,clientEmail,privateKey}),projectId},'campusconnect');
}
export const auth=()=>getAuth(app());
export const db=()=>getFirestore(app());
export function identityKey(){
 // Read on the server only. Never import this module into any client component.
 const key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
 if(!key)throw Error('Firebase server configuration unavailable');
 return key;
}
export function storage(){const {client,Bucket}=getStorage();return {client,Bucket}}
