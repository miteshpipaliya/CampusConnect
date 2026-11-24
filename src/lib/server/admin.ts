import 'server-only';
import {auth} from './services';
/** Verify the current Firebase custom claim (not a client field). */
export async function isAdmin(uid:string):Promise<boolean>{
 if(!uid)return false;
 try{const user=await auth().getUser(uid);return !user.disabled&&user.customClaims?.admin===true}
 catch{return false}
}
