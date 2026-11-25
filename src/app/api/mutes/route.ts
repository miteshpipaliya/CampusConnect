import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {guard} from '@/lib/server/guard';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({handle:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._]{2,29}$/),posts:z.boolean().default(true),stories:z.boolean().default(true)});
export async function GET(req:NextRequest){const u=await session(req);if(!u)return errorResponse(401,'Sign in required');try{const s=await db().collection('mutes').where('ownerUid','==',u.uid).limit(100).get();return NextResponse.json({items:s.docs.map(d=>d.data())},{headers:safeHeaders})}catch{return errorResponse(503,'Mutes unavailable')}}
async function change(req:NextRequest,remove:boolean){const checked=await guard(req,{write:true,schema,rateLimit:{key:'mutes:{uid}',limit:60,windowSec:3600}});if(!checked.ok)return checked.response;const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid mute');try{const store=db(),h=await store.collection('handles').doc(parsed.data.handle).get();if(!h.exists)return errorResponse(404,'User not found');const target=h.data()?.uid;if(typeof target!=='string'||target===checked.user.uid)return errorResponse(400,'Invalid user');const ref=store.collection('mutes').doc(checked.user.uid+'_'+target);if(remove)await ref.delete();else await ref.set({ownerUid:checked.user.uid,targetUid:target,...parsed.data});return NextResponse.json({ok:true},{headers:safeHeaders})}catch{return errorResponse(503,'Mute update unavailable')}}
export async function POST(req:NextRequest){return change(req,false)}
export async function DELETE(req:NextRequest){return change(req,true)}
