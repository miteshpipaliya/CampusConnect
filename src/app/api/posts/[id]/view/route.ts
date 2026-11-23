import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {canViewAuthor} from '@/lib/server/privacy';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {eligibleReelView} from '@/lib/core/reel-views';
export const runtime='nodejs';
const schema=z.object({watchMs:z.number().int().min(0).max(3600000)});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'reel-view:{uid}',limit:120,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params;if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid Reel');
 if(!eligibleReelView(schema.parse(checked.input).watchMs))return errorResponse(400,'Not enough playback time');
 const store=db(),ref=store.collection('posts').doc(id),post=await ref.get();
 if(!post.exists||post.data()?.type!=='reel'||post.data()?.deletedAt||post.data()?.archived||!(await canViewAuthor(checked.user.uid,String(post.data()?.authorUid||''))))return errorResponse(404,'Reel unavailable');
 try{
  const view=ref.collection('views').doc(checked.user.uid);
  const counted=await store.runTransaction(async tx=>{
   const [p,v]=await Promise.all([tx.get(ref),tx.get(view)]);
   if(!p.exists||p.data()?.deletedAt||v.exists)return false;
   tx.create(view,{viewerUid:checked.user.uid,createdAt:FieldValue.serverTimestamp()});
   tx.update(ref,{'counters.views':FieldValue.increment(1)});
   return true;
  });
  return NextResponse.json({ok:true,firstView:counted},{headers:safeHeaders});
 }catch{return errorResponse(503,'Could not record Reel view')}
}
