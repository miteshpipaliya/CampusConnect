import 'server-only';
import {withApi} from './with-api';
export async function routeTiming<T extends Response>(route:string,work:()=>Promise<T>){
 return withApi(route,async()=>{const start=performance.now();const response=await work();const ms=Math.round((performance.now()-start)*10)/10;response.headers.append('Server-Timing','app;dur='+ms);if(ms>800)console.warn(JSON.stringify({event:'slow_route',route,ms,status:response.status}));return response});
}
