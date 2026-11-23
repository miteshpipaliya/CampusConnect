import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';import {createHash} from 'node:crypto';import {FieldValue} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';import {session,errorResponse,safeHeaders} from '@/lib/server/session';import {guard} from '@/lib/server/guard';import {normalizeSearch,validSearch} from '@/lib/core/search-rules';
export const runtime='nodejs';
const schema=z.object({query:z.string().min(2).max(60)});
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{const snap=await db().collection('users').doc(user.uid).collection('searchHistory').orderBy('createdAt','desc').limit(20).get();
  return NextResponse.json({items:snap.docs.map(d=>({id:d.id,query:d.data().query}))},{headers:safeHeaders})
 }catch{return errorResponse(503,'History unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'search-history:{uid}',limit:80,windowSec:3600}});if(!checked.ok)return checked.response;
 const term=normalizeSearch(schema.parse(checked.input).query);if(!validSearch(term))return errorResponse(400,'Invalid query');
 const ref=db().collection('users').doc(checked.user.uid).collection('searchHistory');
 const id=createHash('sha256').update(term).digest('hex').slice(0,32);
 await ref.doc(id).set({query:term,createdAt:FieldValue.serverTimestamp()});
 const snap=await ref.orderBy('createdAt','desc').limit(50).get();if(snap.size>20){const batch=db().batch();snap.docs.slice(20).forEach(d=>batch.delete(d.ref));await batch.commit()}
 return NextResponse.json({ok:true,id},{headers:safeHeaders});
}
export async function DELETE(req:NextRequest){
 const checked=await guard(req,{write:true,rateLimit:{key:'search-history-delete:{uid}',limit:20,windowSec:3600}});if(!checked.ok)return checked.response;
 const id=req.nextUrl.searchParams.get('id');const ref=db().collection('users').doc(checked.user.uid).collection('searchHistory');
 if(id&&/^[a-f0-9]{32}$/.test(id)){await ref.doc(id).delete();return NextResponse.json({ok:true},{headers:safeHeaders})}
 if(id)return errorResponse(400,'Invalid history ID');
 const snap=await ref.limit(100).get();const batch=db().batch();snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();
 return NextResponse.json({ok:true},{headers:safeHeaders});
}
