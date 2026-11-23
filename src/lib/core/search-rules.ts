export function normalizeSearch(raw:string):string{return raw.normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ').slice(0,60)}
export function normalizeTag(raw:string):string{return normalizeSearch(raw).replace(/^#+/,'').replace(/[^a-z0-9_]/g,'').slice(0,50)}
export function validSearch(raw:string):boolean{return normalizeSearch(raw).length>=2&&normalizeSearch(raw).length<=60}
