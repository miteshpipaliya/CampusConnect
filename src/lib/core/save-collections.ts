export function collectionCounts(names:string[]):Array<{name:string;count:number}>{
 const counts=new Map<string,number>();
 for(const value of names){
  const name=value.trim();if(!name)continue;
  counts.set(name,(counts.get(name)||0)+1);
 }
 return [...counts].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name));
}
