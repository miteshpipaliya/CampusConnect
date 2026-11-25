'use client';
import {createContext,useContext,useEffect,useMemo,useCallback,useState,type ReactNode} from 'react';
import type {StreamChat} from 'stream-chat';

type Status='connecting'|'connected'|'disconnected'|'disabled'|'error';
type StreamSession={client:StreamChat|null;userId:string|null;status:Status};
type StreamContext=StreamSession&{retry:()=>void};
const Context=createContext<StreamContext>({client:null,userId:null,status:'connecting',retry:()=>{}});
type TokenResponse={token:string;apiKey:string;user:{id:string;name:string;username:string;image:string;invisible:boolean}};

async function getCredentials():Promise<TokenResponse>{
 const response=await fetch('/api/chat/token',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'}});
 if(response.status===403)throw Error('STREAM_DISABLED');
 if(response.status===401)throw Error('SESSION_EXPIRED');
 if(!response.ok)throw Error('CHAT_TOKEN_UNAVAILABLE');
 const data:unknown=await response.json();
 if(!data||typeof data!=='object')throw Error('CHAT_TOKEN_INVALID');
 const obj=data as Partial<TokenResponse>;
 if(typeof obj.token!=='string'||typeof obj.apiKey!=='string'||typeof obj.user?.id!=='string'||typeof obj.user.name!=='string'||typeof obj.user.invisible!=='boolean')throw Error('CHAT_TOKEN_INVALID');
 return obj as TokenResponse;
}

/** One authenticated Stream connection per mounted campus session. Stream owns socket recovery and presence. */
export function StreamConnectionProvider({children,enabled=true}:{children:ReactNode;enabled?:boolean}){
 const [session,setSession]=useState<StreamSession>({client:null,userId:null,status:'connecting'});
 const [attempt,setAttempt]=useState(0);
 const retry=useCallback(()=>{setSession({client:null,userId:null,status:'connecting'});setAttempt(x=>x+1)},[]);
 useEffect(()=>{
  if(!enabled){setSession({client:null,userId:null,status:'disabled'});return}
  let live=true;
  let socket:StreamChat|null=null;
  let stopConnection:(()=>void)|null=null;
  const setup=async()=>{
   try{
    const initial=await getCredentials();
    if(!live)return;
    const {StreamChat:StreamChatClass}=await import('stream-chat');
    if(!live)return;
    const chat=new StreamChatClass(initial.apiKey);
    socket=chat;
    // stream-chat v10 removed connection.changed; observe the socket's reactive health instead.
    const unsubscribe=chat.wsConnection.state.subscribeWithSelector(
     ({isHealthy})=>({isHealthy}),
     ({isHealthy})=>{if(live)setSession(previous=>({...previous,status:isHealthy?'connected':'disconnected'}))}
    );
    stopConnection=unsubscribe;
    await chat.connectUser({
     id:initial.user.id,
     name:initial.user.name,
     image:initial.user.image,
     invisible:initial.user.invisible
    },async()=>{
     const refreshed=await getCredentials();
     if(refreshed.user.id!==initial.user.id||refreshed.apiKey!==initial.apiKey)throw Error('CHAT_IDENTITY_CHANGED');
     return refreshed.token;
    });
    if(!live){await chat.disconnectUser();return}
    setSession({client:chat,userId:initial.user.id,status:'connected'});
   }catch(error){
    stopConnection?.();stopConnection=null;
    if(socket){const failed=socket;socket=null;await failed.disconnectUser().catch(()=>{})}
    if(!live)return;
    const reason=error instanceof Error?error.message:'CHAT_CONNECTION_FAILED';
    setSession({client:null,userId:null,status:reason==='STREAM_DISABLED'?'disabled':reason==='SESSION_EXPIRED'?'disconnected':'error'});
   }
  };
  void setup();
  const verifyOnFocus=async()=>{
   if(!live||document.visibilityState!=='visible'||!socket)return;
   try{
    const response=await fetch('/api/auth',{cache:'no-store',credentials:'same-origin'});
    const auth=response.ok?await response.json().catch(()=>null):null;
    if(!response.ok||auth?.user?.uid!==socket.userID){
     stopConnection?.();stopConnection=null;
     await socket.disconnectUser();
     socket=null;
     if(live)setSession({client:null,userId:null,status:'disconnected'});
    }
   }catch{/* Temporary connectivity errors are handled by Stream reconnect. */}
  };
  document.addEventListener('visibilitychange',verifyOnFocus);
  window.addEventListener('online',verifyOnFocus);
  return ()=>{
   live=false;
   document.removeEventListener('visibilitychange',verifyOnFocus);
   window.removeEventListener('online',verifyOnFocus);
   stopConnection?.();
   if(socket)void socket.disconnectUser();
  };
 },[attempt,enabled]);
 const value=useMemo<StreamContext>(()=>({...session,retry}),[session,retry]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStreamConnection(){return useContext(Context)}
