export type MediaType='image/jpeg'|'image/png'|'image/webp'|'image/gif'|'video/mp4'|'video/quicktime'|'video/webm';
export function detectMediaType(bytes: Uint8Array): MediaType|null {
 const has=(offset:number,values:number[])=>values.every((v,i)=>bytes[offset+i]===v);
 if(has(0,[255,216,255]))return 'image/jpeg';
 if(has(0,[137,80,78,71,13,10,26,10]))return 'image/png';
 if(has(0,[82,73,70,70])&&has(8,[87,69,66,80]))return 'image/webp';
 if(has(0,[71,73,70,56,55,97])||has(0,[71,73,70,56,57,97]))return 'image/gif';
 if(has(0,[26,69,223,163]))return 'video/webm';
 if(bytes.length>=12&&has(4,[102,116,121,112]))return has(8,[113,116,32,32])?'video/quicktime':'video/mp4';
 return null;
}
export function signatureMatches(declaredType:string,bytes:Uint8Array):boolean {
 const actual=detectMediaType(bytes);
 return actual===declaredType || (declaredType==='video/mp4'&&actual==='video/quicktime');
}
