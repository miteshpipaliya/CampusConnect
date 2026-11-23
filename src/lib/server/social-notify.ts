import 'server-only';
import {notify} from './notify';
export async function notifySocial(recipientUid:string,actorUid:string,type:'follow'|'follow_request'|'follow_accepted'){
 await notify({recipientUid,actorUid,type:type==='follow_accepted'?'follow_accept':type});
}
