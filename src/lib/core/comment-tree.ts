export type CommentNode={id:string;parentId?:string;createdAt?:number;pinned?:boolean;replies?:CommentNode[]};
export function groupCommentTree<T extends CommentNode>(input:T[]):Array<T&{replies:T[]}>{
 const ids=new Map(input.map(c=>[c.id,c])),top:Array<T&{replies:T[]}>=[];
 for(const comment of input){
  const parent=comment.parentId?ids.get(comment.parentId):undefined;
  if(parent&&parent.id!==comment.id){
   if(!parent.replies)parent.replies=[];
   parent.replies.push(comment);
  }else top.push({...comment,replies:comment.replies||[]});
 }
 for(const root of top){
  const attached=ids.get(root.id)?.replies;
  if(attached)root.replies=attached as T[];
  root.replies.sort((a,b)=>(a.createdAt??0)-(b.createdAt??0));
 }
 top.sort((a,b)=>Number(b.pinned===true)-Number(a.pinned===true)||(b.createdAt??0)-(a.createdAt??0));
 return top;
}
export function pinAllowed(existingPinnedId:string|null,targetId:string):boolean{return !existingPinnedId||existingPinnedId===targetId}
