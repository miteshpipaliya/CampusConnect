import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
export const runtime='nodejs';
const schema=z.object({isPrivate:z.boolean(),activityStatus:z.boolean(),storyReplies:z.enum(['everyone','following','off']),storySharing:z.boolean(),theme:z.enum(['dark','light']),notifications:z.object({likes:z.boolean(),comments:z.boolean(),follows:z.boolean(),messages:z.boolean()})}).strict();
const defaults={isPrivate:false,activityStatus:true,storyReplies:'everyone' as const,storySharing:true,theme:'dark' as const,notifications:{likes:true,comments:true,follows:true,messages:true}};
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const doc=await db().collection('users').doc(user.uid).get();if(!doc.exists)return errorResponse(404,'Profile not found');
 const saved=doc.data()?.settings??{};
 return NextResponse.json({settings:schema.parse({...defaults,...saved,isPrivate:doc.data()?.privacy==='private'||doc.data()?.isPrivate===true,notifications:{...defaults.notifications,...saved.notifications}})},{headers:safeHeaders});
 }catch{return errorResponse(503,'Settings unavailable')}
}
export async function PATCH(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid settings',rateLimit:{key:'settings:{uid}',limit:30,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid settings');
 try{await db().collection('users').doc(checked.user.uid).update({settings:parsed.data,isPrivate:parsed.data.isPrivate,privacy:parsed.data.isPrivate?'private':'campus',updatedAt:FieldValue.serverTimestamp()});return NextResponse.json({ok:true,settings:parsed.data},{headers:safeHeaders})}
 catch{return errorResponse(503,'Unable to save settings')}
}
