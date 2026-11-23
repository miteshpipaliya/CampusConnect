export type CommentNode={id:string;parentId?:string;createdAt?:number;pinned?:boolean};
export function groupCommentTree<T extends CommentNode>(input:T[]):Array<T&{replies:T[]}>{
 const nodes=new Map<string,T&{replies:T[]}>(input.map(item=>[item.id,{...item,replies:[]}]));
 const top:Array<T&{replies:T[]}>=[];
 for(const item of input){
  const node=nodes.get(item.id)!;
  const parent=item.parentId?nodes.get(item.parentId):undefined;
  if(parent&&parent.id!==item.id)parent.replies.push(item);
  else top.push(node);
 }
 for(const root of top)root.replies.sort((a,b)=>(a.createdAt??0)-(b.createdAt??0));
 top.sort((a,b)=>Number(b.pinned===true)-Number(a.pinned===true)||(b.createdAt??0)-(a.createdAt??0));
 return top;
}
export function pinAllowed(existingPinnedId:string|null,targetId:string):boolean{return !existingPinnedId||existingPinnedId===targetId}
