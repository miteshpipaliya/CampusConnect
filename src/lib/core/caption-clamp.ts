export function clampCaption(text:string,maxChars=120):{short:string;truncated:boolean}{
 const chars=Array.from(text.trim()),limit=Math.max(1,Math.trunc(maxChars)||120);
 return {short:chars.length>limit?chars.slice(0,limit).join('').trimEnd()+'…':chars.join(''),truncated:chars.length>limit};
}
