import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import { session,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{username:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {username}=await params;
 try{const store=db(),current=await store.collection('users').doc(user.uid).get();
  const self=username==='me'||username===current.data()?.handle;
  const target=self?current:await (async()=>{const handle=await store.collection('handles').doc(username.toLowerCase()).get();return handle.exists?store.collection('users').doc(handle.data()!.uid).get():null})();
  if(!target?.exists)return errorResponse(404,'Profile not found');
  const d=target.data()!,{handle,name,branch,division,bio='',relationshipStatus='',relationshipVisibility='me'}=d;
  const posts=await store.collection('posts').where('authorUid','==',target.id).limit(30).get();
  return NextResponse.json({self,profile:{handle,name,branch,division,bio,relationshipStatus:self||relationshipVisibility==='campus'?relationshipStatus:undefined},
   posts:posts.docs.filter(p=>self||p.data().visibility==='campus').map(p=>({id:p.id,caption:p.data().caption,mediaId:p.data().mediaId||null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Profile unavailable')}
}