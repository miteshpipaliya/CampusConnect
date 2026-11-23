import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {normalizeSearch,normalizeTag,validSearch} from '@/lib/core/search-rules';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {explorePage} from '@/lib/server/explore-service';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const raw=req.nextUrl.searchParams.get('q')||'',q=normalizeSearch(raw);
 const type=req.nextUrl.searchParams.get('type')||'accounts';
 if(!validSearch(q)||!['accounts','tags','posts'].includes(type))return errorResponse(400,'Invalid search');
 try{
  const store=db();
  if(type==='tags'){
   const tag=normalizeTag(q);if(!tag)return NextResponse.json({items:[]},{headers:safeHeaders});
   const snap=await store.collection('hashtags').orderBy('tag').startAt(tag).endAt(tag+'\uf8ff').limit(20).get();
   return NextResponse.json({items:snap.docs.map(d=>({tag:d.id,postCount:Number(d.data().postCount||0)}))},{headers:safeHeaders});
  }
  if(type==='posts'){const tag=normalizeTag(q);const results=await explorePage(user.uid,{tag,limit:'20'});return NextResponse.json(results,{headers:safeHeaders})}
  const refs=await Promise.all([
   store.collection('users').orderBy('handleLower').startAt(q).endAt(q+'\uf8ff').limit(20).get(),
   store.collection('users').orderBy('handle').startAt(q).endAt(q+'\uf8ff').limit(20).get(),
   store.collection('users').orderBy('name').startAt(q).endAt(q+'\uf8ff').limit(20).get(),
   store.collection('users').where('nameTokens','array-contains',q).limit(20).get()
  ]);
  const people=[...new Map(refs.flatMap(s=>s.docs).map(d=>[d.id,d])).values()].slice(0,30);
  const visibility=await canViewMany(user.uid,people.map(d=>d.id));
  const allowed=people.filter(d=>visibility.get(d.id)&&!d.data().deletedAt);
  const avatars=await hydrateAvatars(allowed.map(d=>d.id),user.uid);
  return NextResponse.json({items:allowed.map(d=>({uid:d.id,handle:avatars[d.id]?.handle||d.data().handle,name:avatars[d.id]?.name||d.data().name,avatarUrl:avatars[d.id]?.avatarUrl??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Search unavailable')}
}
