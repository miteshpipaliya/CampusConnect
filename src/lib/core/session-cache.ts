export function createTtlCache<T>({ttlMs,max,now=Date.now}:{ttlMs:number;max:number;now?:()=>number}){
 const entries=new Map<string,{value:T;expires:number}>();
 return {
  get(key:string):T|undefined{
   const entry=entries.get(key);if(!entry)return undefined;
   if(entry.expires<=now()){entries.delete(key);return undefined}
   return entry.value;
  },
  set(key:string,value:T):void{
   if(max<=0||ttlMs<=0)return;
   entries.delete(key);
   while(entries.size>=max){const oldest=entries.keys().next().value;if(oldest===undefined)break;entries.delete(oldest)}
   entries.set(key,{value,expires:now()+ttlMs});
  },
  delete(key:string):boolean{return entries.delete(key)},
  size():number{return entries.size}
 };
}
