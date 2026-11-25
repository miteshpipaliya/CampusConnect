import {NextRequest,NextResponse} from 'next/server';
const base="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https://*.stream-io-cdn.com https://*.r2.cloudflarestorage.com data: blob:; media-src 'self' https://*.stream-io-cdn.com https://*.r2.cloudflarestorage.com data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://www.gstatic.com/firebasejs/13.4.0/; worker-src 'self'; connect-src 'self' https://chat.stream-io-api.com wss://chat.stream-io-api.com https://*.r2.cloudflarestorage.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://fcm.googleapis.com; upgrade-insecure-requests";
export function middleware(request:NextRequest){
 if(process.env.CSP_NONCE!=='1')return NextResponse.next();
 const nonce=btoa(crypto.randomUUID());
 const policy=base.replace("script-src 'self' 'unsafe-inline'","script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic'");
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',policy);return response;
}
export const config={matcher:['/((?!api/|_next/|favicon.ico|firebase-messaging-sw.js|.*\\..*).*)']};
