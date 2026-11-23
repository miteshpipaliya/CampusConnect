import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {isPrivateAccount} from '@/lib/core/privacy-rules';
import {setStreamActivityVisibility} from '@/lib/server/stream-user';
export const runtime='nodejs';
const schema=z.object({isPrivate:z.boolean(),activityStatus:z.boolean(),storyReplies:z.enum(['everyone','following','off']),storySharing:z.boolean(),theme:z.enum(['dark','light']),notifications:z.object({likes:z.boolean(),comments:z.boolean(),follows:z.boolean(),messages:z.boolean(),mentions:z.boolean().default(true),reposts:z.boolean().default(true),stories:z.boolean().default(true),shares:z.boolean().default(true)})}).strict();
const defaults={isPrivate:false,activityStatus:false,storyReplies:'everyone' as const,storySharing:true,theme:'dark' as const,notifications:{likes:true,comments:true,follows:true,messages:true,mentions:true,reposts:true,stories:true,shares:true}};
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const doc=await db().collection('users').doc(user.uid).get();if(!doc.exists)return errorResponse(404,'Profile not found');
 const saved=doc.data()?.settings??{};
 return NextResponse.json({settings:schema.parse({...defaults,...saved,isPrivate:isPrivateAccount(doc.data()),notifications:{...defaults.notifications,...saved.notifications}})},{headers:safeHeaders});
 }catch{return errorResponse(503,'Settings unavailable')}
}
export async function PATCH(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid settings',rateLimit:{key:'settings:{uid}',limit:30,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid settings');
 try{
  const uid=checked.user.uid,ref=db().collection('users').doc(uid),before=await ref.get();
  if(!before.exists||before.data()?.deletedAt)return errorResponse(403,'Account unavailable');
  const wasVisible=before.data()?.settings?.activityStatus===true;
  const visible=parsed.data.activityStatus;
  const realtimeEnabled=process.env.STREAM_CLIENT_TOKENS_ENABLED==='true';
  // Disable global Stream visibility before reporting that the user's activity is private.
  if(realtimeEnabled&&wasVisible&&!visible&&!(await setStreamActivityVisibility(uid,false)))
   return errorResponse(503,'Activity visibility could not be updated. Please retry.');
  await ref.update({settings:parsed.data,isPrivate:parsed.data.isPrivate,privacy:parsed.data.isPrivate?'private':'campus',updatedAt:FieldValue.serverTimestamp()});
  // Make a user visible only after their explicit opt-in has been saved.
  if(realtimeEnabled&&!wasVisible&&visible&&!(await setStreamActivityVisibility(uid,true)))
   return NextResponse.json({ok:false,error:'Settings saved, but activity status remains unavailable',settings:parsed.data},{status:503,headers:safeHeaders});
  return NextResponse.json({ok:true,settings:parsed.data},{headers:safeHeaders});
 }
 catch{return errorResponse(503,'Unable to save settings')}
}
