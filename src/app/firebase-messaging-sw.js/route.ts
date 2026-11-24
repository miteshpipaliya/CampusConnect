import {NextResponse} from 'next/server';
import {pushConfig} from '@/lib/server/push-config';
export const dynamic='force-dynamic';
export async function GET(){const cfg=pushConfig();if(!cfg)return new NextResponse('/* Push disabled */',{status:503,headers:{'Content-Type':'application/javascript','Cache-Control':'no-store'}});const script=`
self.addEventListener('notificationclick',event=>{event.notification.close();const path=event.notification.data?.kind==='message'?'/messages':'/notifications';event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{for(const c of list){if(new URL(c.url).origin===self.location.origin){await c.navigate(path);return c.focus()}}return self.clients.openWindow(path)}))});
importScripts('https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(cfg.firebase)});
firebase.messaging().onBackgroundMessage(payload=>self.registration.showNotification('CampusConnect',{body:'You have new activity. Open CampusConnect to view it.',tag:payload.data?.kind==='message'?'cc-message':'cc-activity',data:{kind:payload.data?.kind==='message'?'message':'activity'}}));
`;return new NextResponse(script,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
