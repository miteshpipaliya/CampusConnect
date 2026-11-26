'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode,type MouseEvent} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import timings from '../../../public/data/introduction-timings.json';
import {INTRO_VERSION,INTRO_AUDIO,INTRO_DURATION,validateTimings,visibleWordCount,type IntroWord} from '@/lib/core/introduction';
type Phase='checking'|'ready'|'starting'|'playing'|'buffering'|'interrupted'|'finishing'|'done'|'error';
type Context={phase:Phase;words:IntroWord[];count:number;spoken:number;progress:number;message:string;start:()=>void;resume:()=>void;retryFinish:()=>void;completePending:boolean};
const IntroContext=createContext<Context|null>(null);
const alignedWords=validateTimings(timings);
export function useIntro(){const v=useContext(IntroContext);if(!v)throw Error('Introduction provider missing');return v}
async function api(action?:'start'|'finish'){const r=await fetch('/api/introduction',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000),...(action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Introduction service unavailable');return Boolean(d.completed)}
export function IntroProvider({children}:{children:ReactNode}){
 const path=usePathname();
 const audio=useRef<HTMLAudioElement>(null),run=useRef(0),active=useRef(false),done=useRef(false),started=useRef(false),ended=useRef(false),frame=useRef(0),last=useRef(-1),lastSecond=useRef(-1),wordsRef=useRef<IntroWord[]>(alignedWords??[]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),pathRef=useRef(path);
 const [phase,setPhase]=useState<Phase>('checking'),[words]=useState<IntroWord[]>(alignedWords??[]),[count,setCount]=useState(0),[spoken,setSpoken]=useState(-1),[progress,setProgress]=useState(0),[message,setMessage]=useState(''),[completePending,setCompletePending]=useState(false);
 const finishLock=useRef(false),serverStarted=useRef(false);
 const phaseRef=useRef<Phase>('checking');const update=useCallback((p:Phase)=>{phaseRef.current=p;setPhase(p)},[]);
 const halt=useCallback(()=>{run.current++;active.current=false;started.current=false;ended.current=false;finishLock.current=false;serverStarted.current=false;cancelAnimationFrame(frame.current);if(timer.current)clearTimeout(timer.current);audio.current?.pause()},[]);
 useEffect(()=>()=>halt(),[halt]);

 useEffect(()=>{if(path!=='/'&&path!=='/enter')return;if(active.current||done.current||phaseRef.current==='error')return;let cancelled=false;void api().then(ok=>{if(cancelled||active.current||phaseRef.current==='error')return;done.current=ok;update(ok?'done':'ready')}).catch(()=>{if(!cancelled&&!active.current&&!done.current){update('ready')}});return()=>{cancelled=true}},[path,update]);
 useEffect(()=>{const prev=pathRef.current;pathRef.current=path;if(prev==='/enter'&&path!=='/enter'&&active.current){halt();update(done.current?'done':'ready');setCount(0);setProgress(0)}},[path,halt,update]);
 const fail=useCallback((e:unknown)=>{run.current++;active.current=false;cancelAnimationFrame(frame.current);audio.current?.pause();setMessage(e instanceof Error?e.message:'Unable to play introduction. Please retry.');update('error')},[update]);
 const sync=useCallback(function tick(){const a=audio.current;if(!active.current||!a)return;const n=visibleWordCount(wordsRef.current,a.currentTime);if(n!==last.current){last.current=n;setCount(n)}const w=wordsRef.current[n-1];setSpoken(w&&a.currentTime<w.end?n-1:-1);const s=Math.floor(a.currentTime);if(s!==lastSecond.current){lastSecond.current=s;setProgress(Math.min(1,a.currentTime/INTRO_DURATION))}frame.current=requestAnimationFrame(tick)},[]);
 const finish=useCallback(async()=>{if(!ended.current||!started.current||!wordsRef.current.length||done.current||finishLock.current)return;finishLock.current=true;const id=run.current;update('finishing');setCompletePending(true);setMessage('');
 // Require a current signed completion before revealing password login.
 try{if(!serverStarted.current)throw Error('Introduction could not be verified. Please restart the recording.');if(!await api('finish'))throw Error('Introduction completion not verified.');}catch(e){if(id===run.current){finishLock.current=false;if(!serverStarted.current){active.current=false;setCompletePending(false)}setMessage(e instanceof Error?e.message:'Retry completion');update('error')}return}
 if(id!==run.current)return;done.current=true;setCompletePending(false);active.current=false;timer.current=setTimeout(()=>{if(id===run.current)update('done')},1000);
 },[update]);
 const start=useCallback(()=>{if(active.current||done.current)return;const a=audio.current;if(!a)return;if(!alignedWords){setMessage('Caption data does not match the recording.');update('error');return}const id=++run.current;active.current=true;started.current=false;ended.current=false;finishLock.current=false;serverStarted.current=false;setCompletePending(false);setMessage('');setCount(0);setSpoken(-1);setProgress(0);last.current=-1;lastSecond.current=-1;update('starting');
 a.currentTime=0;a.volume=1;a.playbackRate=1;
 // Preserve activation: play inside the click handler, not after an awaited API.
 const play=a.play();
 cancelAnimationFrame(frame.current);sync();
 void api('start').then(complete=>{if(id!==run.current||!active.current)return;if(complete){done.current=true;halt();update('done');return}serverStarted.current=true}).catch(()=>{/* Audio and captions remain available without the optional proof service. */});
 void play.then(()=>{if(id!==run.current||!active.current)return;started.current=true;update(a.paused?'interrupted':'playing')}).catch(e=>{if(id===run.current)fail(e)});
 },[fail,halt,sync,update]);
 const resume=useCallback(()=>{const a=audio.current;if(!a||!active.current)return;void a.play().then(()=>update('playing')).catch(()=>{setMessage('Your browser blocked sound. Tap to resume.');update('interrupted')})},[update]);
 const endedEvent=()=>{const a=audio.current;if(!a||!active.current||!started.current||!a.ended)return;if(Math.abs(a.duration-INTRO_DURATION)>.5){fail(Error('The recording version is incorrect. Reload the latest page and retry.'));return}ended.current=true;cancelAnimationFrame(frame.current);setCount(wordsRef.current.length);setSpoken(-1);setProgress(1);void finish()};
 return <IntroContext.Provider value={{phase,words,count,spoken,progress,message,start,resume,retryFinish:()=>void finish(),completePending}}>{children}<audio ref={audio} src={INTRO_AUDIO+'?v='+INTRO_VERSION+'-0f4b0119'} preload="metadata" hidden onEnded={endedEvent} onWaiting={()=>{if(active.current&&started.current)update('buffering')}} onPlaying={()=>{if(active.current&&started.current&&!ended.current)update('playing')}} onPause={()=>{if(active.current&&started.current&&!ended.current&&!audio.current?.ended)update('interrupted')}} onError={()=>{if(active.current)fail(Error('Audio could not load. Tap to retry.'))}}/></IntroContext.Provider>
}
export function EnterCampusLink(){const {phase,start}=useIntro();const router=useRouter();const click=(e:MouseEvent<HTMLAnchorElement>)=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();if(phase!=='done')start();router.push('/enter')};return <Link className="cc-campus-enter-button" href="/enter" onClick={click}>ENTER CAMPUS <ArrowRight aria-hidden="true"/></Link>}
