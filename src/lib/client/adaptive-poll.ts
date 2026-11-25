import {nextDelay} from '../core/poll-schedule';
/** Never overlap requests; stop while hidden/offline and recover on visibility or connectivity. */
export function adaptivePoll(work:()=>Promise<boolean>,initial=4000){
 let active=true,running=false,delay=initial,timer:ReturnType<typeof setTimeout>|undefined;
 const visible=()=>!document.hidden&&navigator.onLine;
 const clear=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined};
 const schedule=()=>{clear();if(active&&visible())timer=setTimeout(()=>void tick(),delay)};
 async function tick(){clear();if(!active||running||!visible())return;running=true;let changed=false;try{changed=await work()}catch{/* The caller retains its last known state. */}finally{running=false;delay=nextDelay(delay,changed,false)??4000;schedule()}}
 const resume=()=>{clear();delay=initial;if(visible())void tick()};
 document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);window.addEventListener('offline',resume);schedule();
 return ()=>{active=false;clear();document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);window.removeEventListener('offline',resume)};
}
