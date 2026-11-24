import 'server-only';
import {db} from './services';
/** Remove one comment plus its direct replies atomically, keeping post counts in sync. */
export async function removePostComment(actorUid:string,postId:string,commentId:string):Promise<'deleted'|'missing'|'forbidden'|'too-many'>{
 const store=db(),post=store.collection('posts').doc(postId),comment=post.collection('comments').doc(commentId);
 return store.runTransaction(async tx=>{
  const [p,c]=await Promise.all([tx.get(post),tx.get(comment)]);
  if(!p.exists||!c.exists||c.data()?.deletedAt||p.data()?.deletedAt)return 'missing';
  if(c.data()?.uid!==actorUid&&p.data()?.authorUid!==actorUid)return 'forbidden';
  const replies=c.data()?.parentId?[]:(await tx.get(post.collection('comments').where('parentId','==',commentId).limit(399))).docs;
  if(replies.length>=399)return 'too-many';
  for(const item of replies)tx.delete(item.ref);
  tx.delete(comment);
  const count=Number(p.data()?.counters?.comments||0);
  tx.update(post,{'counters.comments':Math.max(0,count-1-replies.length)});
  return 'deleted';
 });
}
