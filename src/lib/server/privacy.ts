import 'server-only';
import {db} from './services';
export async function canViewAuthor(viewerUid:string,authorUid:string):Promise<boolean>{
 if(viewerUid===authorUid)return true;
 const store=db();
 const [viewer,target,following,blockA,blockB]=await Promise.all([
 store.collection('users').doc(viewerUid).get(),store.collection('users').doc(authorUid).get(),
 store.collection('follows').doc(viewerUid+'_'+authorUid).get(),
 store.collection('blocks').doc(viewerUid+'_'+authorUid).get(),
 store.collection('blocks').doc(authorUid+'_'+viewerUid).get()
 ]);
 if(!viewer.exists||!target.exists||viewer.data()?.deletedAt||target.data()?.deletedAt||blockA.exists||blockB.exists)return false;
 if(target.data()?.privacy==='private'||target.data()?.isPrivate===true)return following.data()?.status==='active';
 return true;
}
