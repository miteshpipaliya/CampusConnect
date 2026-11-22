export function mergeChronologicalMessages<T extends {id:string;createdAt:string|null}>(existing:readonly T[],incoming:readonly T[]):T[]{
 const indexed=new Map<string,T>();
 for(const message of existing)indexed.set(message.id,message);
 for(const message of incoming)indexed.set(message.id,message);
 return [...indexed.values()].sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id));
}
