import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { S3Client } from '@aws-sdk/client-s3';

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
export function storage(){
 const endpoint=process.env.R2_ENDPOINT,account=process.env.R2_ACCOUNT_ID;
 const accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY;
 const Bucket=process.env.R2_BUCKET_NAME;
 if(!endpoint||!account||!accessKeyId||!secretAccessKey||!Bucket)throw Error('R2 configuration unavailable');
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.hostname!==account+'.r2.cloudflarestorage.com'||url.pathname!=='/')throw Error('R2 endpoint misconfigured');
 return {client:new S3Client({endpoint:url.origin,region:'auto',forcePathStyle:true,credentials:{accessKeyId,secretAccessKey}}),Bucket};
}
