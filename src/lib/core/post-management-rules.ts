export function hashtagDelta(before:string[],after:string[]):Array<{tag:string;delta:number}>{
 const old=new Set(before),current=new Set(after);
 return [...new Set([...old,...current])].flatMap(tag=>old.has(tag)===current.has(tag)?[]:[{tag,delta:current.has(tag)?1:-1}]);
}
export function nextPinnedPosts(current:string[],postId:string,value:boolean):string[]|null{
 const deduped=[...new Set(current)];
 const next=value?[...new Set([...deduped,postId])]:deduped.filter(x=>x!==postId);
 return next.length>3?null:next;
}
