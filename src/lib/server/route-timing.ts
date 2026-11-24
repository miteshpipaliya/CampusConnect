import 'server-only';
export async function routeTiming<T extends Response>(route:string,work:()=>Promise<T>):Promise<T>{
 const start=performance.now();const response=await work();const ms=Math.round((performance.now()-start)*10)/10;
 response.headers.append('Server-Timing','app;dur='+ms);
 if(ms>400)console.warn(JSON.stringify({event:'slow_route',route,ms,status:response.status}));
 return response;
}
