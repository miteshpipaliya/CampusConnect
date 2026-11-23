/** Refresh cadence is a fallback, not a replacement for Stream websocket events. */
export type ChatConnectionStatus='connecting'|'connected'|'disconnected'|'disabled'|'error';
export type ChatSurface='thread'|'inbox';
export function chatRefreshIntervalMs(status:ChatConnectionStatus,surface:ChatSurface):number{
 if(status==='connected')return surface==='thread'?15000:20000;
 return surface==='thread'?3000:6000;
}
export function shouldRefreshChat(input:{visible:boolean;online:boolean;inFlight:boolean}):boolean{
 return input.visible&&input.online&&!input.inFlight;
}
