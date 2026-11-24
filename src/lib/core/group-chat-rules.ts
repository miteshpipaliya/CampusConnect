export function validCampusGroupId(id:string){return /^campus-group-[a-f0-9]{32}$/.test(id)}
export function normaliseGroupMembers(handles:string[],ownerHandle:string):string[]|null{
 const uniq=[...new Set(handles.map(x=>x.trim().toLowerCase()))].filter(Boolean).filter(h=>h!==ownerHandle.trim().toLowerCase());
 if(uniq.length<2||uniq.length>8||uniq.some(h=>!/^[a-z][a-z0-9._]{2,29}$/.test(h)))return null;
 return uniq;
}
export function normaliseGroupName(name:string):string|null{
 const trimmed=name.trim().replace(/\s+/g,' ');
 return trimmed.length>=1&&trimmed.length<=60?trimmed:null;
}
