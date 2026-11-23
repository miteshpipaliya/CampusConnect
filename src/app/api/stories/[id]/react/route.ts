import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {guard} from '@/lib/server/guard';
import {authorizedStory} from '@/lib/server/story-service';
import {safeHeaders,errorResponse} from '@/lib/server/session';
import {notify} from '@/lib/server/notify';
export const runtime='nodejs';
const schema=z.object({emoji:z.enum(['❤️','😂','🔥','😍','👏','💜'])});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'story-react:{uid}',limit:60,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params,story=await authorizedStory(checked.user.uid,id);
 if(!story)return errorResponse(404,'Story unavailable');
 if(story.owned)return errorResponse(400,'Cannot react to your own story');
 const actor=await story.doc.ref.firestore.collection('users').doc(checked.user.uid).get();
 const value=schema.parse(checked.input);
 await story.doc.ref.collection('reactions').doc(checked.user.uid).set({uid:checked.user.uid,emoji:value.emoji,actorHandle:String(actor.data()?.handle||''),createdAt:FieldValue.serverTimestamp()});
 await notify({recipientUid:story.authorUid,actorUid:checked.user.uid,type:'story_reaction',storyId:id}).catch(()=>{});
 return NextResponse.json({ok:true},{headers:safeHeaders});
}
