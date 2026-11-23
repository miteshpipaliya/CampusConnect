/** Max authenticated upload-proxy request below Vercel Function body limits. */
export const MAX_CHAT_PROXY_BYTES=3*1024*1024;
export function canProxyChatUpload(size:number):boolean{
 return Number.isSafeInteger(size)&&size>0&&size<=MAX_CHAT_PROXY_BYTES;
}
