import 'server-only';
import {db} from './services';
import {isPrivateUser} from './models';
import {canViewFromFacts} from '../core/privacy-rules';
export async function getRelationship(viewerUid:string,targetUid:string){
 if(viewerUid===targetUid)return {self:true,blocked:false,following:true,pending:false};
 const store=db();
 const [forward,reverse,follow]=await store.getAll(store.collection('blocks').doc(viewerUid+'_'+targetUid),store.collection('blocks').doc(targetUid+'_'+viewerUid),store.collection('follows').doc(viewerUid+'_'+targetUid));
 return {self:false,blocked:forward.exists||reverse.exists,following:follow.data()?.status==='active',pending:follow.data()?.status==='pending'};
}
export async function canViewAuthor(viewerUid:string,authorUid:string){
 if(viewerUid===authorUid)return true;
 const [relationship,author]=await Promise.all([getRelationship(viewerUid,authorUid),db().collection('users').doc(authorUid).get()]);
 if(!author.exists)return false;
 return canViewFromFacts({...relationship,privateAccount:isPrivateUser(author.data()??{})});
}
