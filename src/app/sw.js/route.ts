import {buildServiceWorker} from '@/lib/core/sw-script';
import {pushConfig} from '@/lib/server/push-config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){
 const cfg=pushConfig();
 return new Response(buildServiceWorker({version:process.env.VERCEL_GIT_COMMIT_SHA??'dev',push:cfg?{firebase:cfg.firebase}:null}),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate','Service-Worker-Allowed':'/','X-Content-Type-Options':'nosniff'}});
}
