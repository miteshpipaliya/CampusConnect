export function encodeCursor(millis: number, id: string): string {
  if (!Number.isSafeInteger(millis) || millis < 0 || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw Error('Invalid cursor');
  return Buffer.from(JSON.stringify([millis,id])).toString('base64url');
}
export function decodeCursor(value: string): {millis:number;id:string}|null {
  if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.length!==2) return null;
    const [millis,id]:unknown[]=parsed;
    if (typeof millis!=='number'||!Number.isSafeInteger(millis)||millis<0||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
    return {millis,id};
  } catch {return null}
}
export function clampLimit(value: unknown, def=10, max=30): number {
  const n=typeof value==='string'&&value.trim()!==''?Number(value):typeof value==='number'?value:NaN;
  return Number.isInteger(n)&&n>0?Math.min(n,max):def;
}
