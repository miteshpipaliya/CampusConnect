import {NextRequest,NextResponse,after} from 'next/server';
import {db,auth} from '@/lib/server/services';
import {canViewAuthor,isBlockedEitherWay,canViewMany} from '@/lib/server/privacy';
import {isPrivateAccount} from '@/lib/core/privacy-rules';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {recordProfileVisit} from '@/lib/server/daily-stats';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{username:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {username}=await params;
 try{
  const store=db(),current=await store.collection('users').doc(user.uid).get();
  const self=username==='me'||username===current.data()?.handle;
  const target=self?current:await (async()=>{const handle=await store.collection('handles').doc(username.toLowerCase()).get();return handle.exists?store.collection('users').doc(handle.data()!.uid).get():null})();
  if(!target?.exists||target.data()?.deletedAt||await isBlockedEitherWay(user.uid,target.id))return errorResponse(404,'Profile not found');
  const d=target.data()!,allowed=await canViewAuthor(user.uid,target.id);
  if(!self)after(()=>recordProfileVisit(target.id,user.uid).catch(()=>{}));
  const {handle,name,branch,division,bio='',relationshipStatus='',relationshipVisibility='me',avatarMediaId=null}=d;
  const [avatarMap,follow,verification]=await Promise.all([
   hydrateAvatars([target.id],user.uid),
   store.collection('follows').doc(user.uid+'_'+target.id).get(),
   auth().getUser(target.id).then(record=>Boolean(record.emailVerified&&record.email?.toLowerCase().endsWith('@bvmengineering.ac.in'))).catch(()=>false)
  ]);
  const avatarUrl=avatarMap[target.id]?.avatarUrl??null;
  const viewerRelation=self?'self':String(follow.data()?.status||'none');
  const stored=d.counters||{};
  // A bounded legacy fallback runs only when old counter fields are missing.
  const [fallbackPosts,fallbackFollowers,fallbackFollowing]=await Promise.all([
   Number.isFinite(Number(stored.posts))?Promise.resolve(null):store.collection('posts').where('authorUid','==',target.id).limit(1000).get(),
   Number.isFinite(Number(stored.followers))?Promise.resolve(null):store.collection('follows').where('followingUid','==',target.id).limit(1000).get(),
   Number.isFinite(Number(stored.following))?Promise.resolve(null):store.collection('follows').where('followerUid','==',target.id).limit(1000).get()
  ]);
  const counters={posts:fallbackPosts?fallbackPosts.docs.filter(x=>!x.data().deletedAt).length:Number(stored.posts||0),
   followers:fallbackFollowers?fallbackFollowers.docs.filter(x=>x.data().status==='active').length:Number(stored.followers||0),
   following:fallbackFollowing?fallbackFollowing.docs.filter(x=>x.data().status==='active').length:Number(stored.following||0),
   reposts:Number(stored.reposts||0)};
  const profile={uid:target.id,handle,name,branch,division,bio:allowed?bio:'',avatarMediaId,avatarUrl,
   ...(allowed?{relationshipStatus:relationshipVisibility==='campus'||self||(relationshipVisibility==='followers'&&viewerRelation==='active')?relationshipStatus:undefined}:{}),
   verified:verification};
  if(!allowed)return NextResponse.json({self:false,profile,verified:verification,viewerRelation,posts:[],tagged:[],reposts:[],highlights:[],private:isPrivateAccount(d),counters},{headers:safeHeaders});
  const [posts,reposts,stories,taggedDocs,closeFriend]=await Promise.all([
   store.collection('posts').where('authorUid','==',target.id).limit(80).get(),
   store.collection('reposts').where('ownerUid','==',target.id).limit(50).get(),
   store.collection('stories').where('authorUid','==',target.id).limit(30).get(),
   store.collection('posts').where('mentions','array-contains',String(handle||'').toLowerCase()).limit(40).get().catch(()=>null),
   store.collection('closeFriends').doc(target.id+'_'+user.uid).get()
  ]);
  const visiblePosts=posts.docs.filter(p=>!p.data().deletedAt&&!p.data().archived);
  const taggedCandidates=(taggedDocs?.docs||[]).filter(p=>!p.data().deletedAt&&!p.data().archived);
  const permitted=await canViewMany(user.uid,taggedCandidates.map(p=>String(p.data().authorUid||'')));
  const tagged=taggedCandidates.filter(p=>permitted.get(String(p.data().authorUid||'')));
  const allMediaIds=[...new Set([...visiblePosts,...tagged].map(p=>String(p.data().mediaId||'')).filter(Boolean))];
  const mediaDocs=allMediaIds.length?await store.getAll(...allMediaIds.map(id=>store.collection('media').doc(id))):[];
  const mediaType=new Map(mediaDocs.map(s=>[s.id,String(s.data()?.contentType||'')]));
  const describe=(p:FirebaseFirestore.QueryDocumentSnapshot)=>{
   const data=p.data(),mediaId=typeof data.mediaId==='string'?data.mediaId:null;
   return {id:p.id,caption:String(data.caption||''),mediaId,contentType:mediaId?mediaType.get(mediaId)||null:null,
    authorHandle:String(data.authorHandle||''),pinned:data.pinned===true,createdAt:data.createdAt?.toMillis?.()??0};
  };
  const detailedPosts=visiblePosts.map(describe).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.createdAt-a.createdAt);
  const detailedTagged=tagged.map(describe).sort((a,b)=>b.createdAt-a.createdAt);
  const visibleReposts=await Promise.all(reposts.docs.map(async doc=>{
   const p=await store.collection('posts').doc(doc.data().postId).get();
   return p.exists&&!p.data()?.deletedAt&&!p.data()?.archived&&await canViewAuthor(user.uid,String(p.data()?.authorUid||''))?
    {id:doc.id,postId:p.id,caption:String(p.data()?.caption||''),mediaId:p.data()?.mediaId||null,authorHandle:p.data()?.authorHandle||''}:null;
  }));
  const highlights=stories.docs.filter(s=>s.data().highlight&&(s.data().audience!=='close'||self||closeFriend.exists))
   .map(s=>({id:s.id,mediaId:s.data().mediaId,caption:s.data().caption||'',active:(s.data().expiresAt?.toMillis?.()||0)>Date.now()}));
  return NextResponse.json({self,profile,verified:verification,viewerRelation,counters,posts:detailedPosts,tagged:detailedTagged,
   reposts:visibleReposts.filter(Boolean),highlights},{headers:safeHeaders});
 }catch(error){console.error('Profile read failed',error instanceof Error?error.name:'unknown');return errorResponse(503,'Profile unavailable')}
}
