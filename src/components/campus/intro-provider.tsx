'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode,type MouseEvent} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {INTRO_AUDIO,INTRO_DURATION,validateTimings,visibleWordCount,type IntroWord} from '@/lib/core/introduction';
type Phase='checking'|'ready'|'starting'|'playing'|'buffering'|'interrupted'|'finishing'|'done'|'error';
type Context={phase:Phase;words:IntroWord[];count:number;progress:number;message:string;start:()=>void;resume:()=>void;retryFinish:()=>void;completePending:boolean};
const IntroContext=createContext<Context|null>(null);
export function useIntro(){const v=useContext(IntroContext);if(!v)throw Error('Introduction provider missing');return v}
async function api(action?:'start'|'finish'){const r=await fetch('/api/introduction',{cache:'no-store',credentials:'same-origin',...(action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Introduction service unavailable');return Boolean(d.completed)}
export function IntroProvider({children}:{children:ReactNode}){
 const router=useRouter(),path=usePathname();
 const audio=useRef<HTMLAudioElement>(null),run=useRef(0),active=useRef(false),done=useRef(false),started=useRef(false),ended=useRef(false),frame=useRef(0),last=useRef(-1),lastSecond=useRef(-1),wordsRef=useRef<IntroWord[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),pathRef=useRef(path);
 const [phase,setPhase]=useState<Phase>('checking'),[words,setWords]=useState<IntroWord[]>([]),[count,setCount]=useState(0),[progress,setProgress]=useState(0),[message,setMessage]=useState(''),[completePending,setCompletePending]=useState(false);
 const phaseRef=useRef<Phase>('checking');const update=useCallback((p:Phase)=>{phaseRef.current=p;setPhase(p)},[]);
 const halt=useCallback(()=>{run.current++;active.current=false;started.current=false;ended.current=false;cancelAnimationFrame(frame.current);if(timer.current)clearTimeout(timer.current);audio.current?.pause()},[]);
 useEffect(()=>()=>halt(),[halt]);
 const loadWords=useCallback(async()=>{if(wordsRef.current.length)return wordsRef.current;const r=await fetch('/data/introduction-timings.json',{cache:'force-cache'});if(!r.ok)throw Error('Synchronized captions are not ready. Please try again later.');const w=validateTimings(await r.json());if(!w)throw Error('Caption data does not match the recording. Please retry later.');wordsRef.current=w;setWords(w);return w},[]);
 useEffect(()=>{if(path!=='/'&&path!=='/enter')return;void loadWords().catch(()=>{});if(active.current||done.current)return;let cancelled=false;void api().then(ok=>{if(cancelled||active.current)return;done.current=ok;update(ok?'done':'ready')}).catch(()=>{if(!cancelled&&!active.current){setMessage('Unable to check introduction status. Please retry.');update('error')}});return()=>{cancelled=true}},[path,loadWords,update]);
 useEffect(()=>{const prev=pathRef.current;pathRef.current=path;if(prev==='/enter'&&path!=='/enter'&&active.current){halt();update(done.current?'done':'ready');setCount(0);setProgress(0)}},[path,halt,update]);
 const fail=useCallback((e:unknown)=>{active.current=false;cancelAnimationFrame(frame.current);audio.current?.pause();setMessage(e instanceof Error?e.message:'Unable to play introduction. Please retry.');update('error')},[update]);
 const sync=useCallback(function tick(){const a=audio.current;if(!active.current||!a)return;const n=visibleWordCount(wordsRef.current,a.currentTime);if(n!==last.current){last.current=n;setCount(n)}const s=Math.floor(a.currentTime);if(s!==lastSecond.current){lastSecond.current=s;setProgress(Math.min(1,a.currentTime/INTRO_DURATION))}frame.current=requestAnimationFrame(tick)},[]);
 const finish=useCallback(async()=>{if(!ended.current||!started.current||!wordsRef.current.length||done.current)return;const id=run.current;update('finishing');setCompletePending(true);try{if(!await api('finish'))throw Error('Unable to confirm completion. Retry.');if(id!==run.current)return;done.current=true;setCompletePending(false);active.current=false;timer.current=setTimeout(()=>{if(id===run.current)update('done')},1400)}catch(e){if(id===run.current){setMessage(e instanceof Error?e.message:'Unable to confirm completion.');update('error')}}},[update]);
 const start=useCallback(()=>{if(active.current||done.current)return;const a=audio.current;if(!a)return;const id=++run.current;active.current=true;started.current=false;ended.current=false;setCompletePending(false);setMessage('');setCount(0);setProgress(0);last.current=-1;lastSecond.current=-1;update('starting');
 a.currentTime=0;a.volume=1;a.playbackRate=1;
 // Call play synchronously inside the original user gesture, before any await or route navigation.
 const play=a.play();
 const startRequest=api('start');
 void Promise.all([play,startRequest,loadWords()]).then(([,complete])=>{if(id!==run.current)return;if(complete){done.current=true;halt();update('done');return}started.current=true;update(a.paused?'interrupted':'playing');cancelAnimationFrame(frame.current);sync()}).catch(e=>{if(id===run.current)fail(e)});
 },[fail,halt,loadWords,sync,update]);
 const resume=useCallback(()=>{const a=audio.current;if(!a||!active.current)return;void a.play().then(()=>update('playing')).catch(()=>{setMessage('Your browser blocked sound. Tap to resume.');update('interrupted')})},[update]);
 const endedEvent=()=>{const a=audio.current;if(!a||!active.current||!started.current||!a.ended||Math.abs(a.duration-INTRO_DURATION)>.5)return;ended.current=true;cancelAnimationFrame(frame.current);setCount(wordsRef.current.length);setProgress(1);void finish()};
 return <IntroContext.Provider value={{phase,words,count,progress,message,start,resume,retryFinish:()=>void finish(),completePending}}>{children}<audio ref={audio} src={INTRO_AUDIO} preload="none" hidden onEnded={endedEvent} onWaiting={()=>{if(active.current&&started.current)update('buffering')}} onPlaying={()=>{if(active.current&&started.current&&!ended.current)update('playing')}} onPause={()=>{if(active.current&&started.current&&!ended.current&&!audio.current?.ended)update('interrupted')}} onError={()=>{if(active.current)fail(Error('Audio could not load. Tap to retry.'))}}/></IntroContext.Provider>
}
export function EnterCampusLink(){const {phase,start}=useIntro();const router=useRouter();const click=(e:MouseEvent<HTMLAnchorElement>)=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();if(phase!=='done')start();router.push('/enter')};return <Link className="cc-campus-enter-button" href="/enter" onClick={click}>ENTER CAMPUS <ArrowRight aria-hidden="true"/></Link>}
