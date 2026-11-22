/** Pure account validation shared by client and server. */
export const HANDLE_PATTERN=/^[a-z][a-z0-9._]{2,29}$/;
export function normalizeHandle(value:string){return value.trim().toLowerCase()}
export function validateHandle(value:string){const handle=normalizeHandle(value);return HANDLE_PATTERN.test(handle)&&!handle.includes('..')}
export function validateBio(value:string){return value.length<=150}
export function isAllowedEmail(value:string,approved:string[]=[]){
 const email=value.trim().toLowerCase();
 return /^(\d{2})(cp|el|ec|it|me|cl|ee|pr)(\d{3,8})@bvmengineering\.ac\.in$/.test(email)||approved.some(item=>item.trim().toLowerCase()===email);
}
export function nameTokens(name:string){return [...new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))].slice(0,12)}
