import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {guard,parsedInput} from '@/lib/server/guard';
import {db} from '@/lib/server/services';
import {canViewMany} from '@/lib/server/privacy';
import {mintUrls} from '@/lib/server/media-urls';
import {couldBeReel,reelMediaId,isPlayableReelMedia} from '@/lib/core/reel-discovery';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({ids:z.array(z.string().regex(/^[A-Za-z0-9_-]{10,100}$/)).min(1).max(12)}).strict();
export async function POST(req:NextRequest){
 const g=await guard(req,{write:true,schema,rateLimit:{key:'explore-preview:{uid}',limit:60,windowSec:60}});if(!g.ok)return g.response;
 try{
  const ids=[...new Set(parsedInput<z.infer<typeof schema>>(g).ids)],store=db();
  const docs=await store.getAll(...ids.map(id=>store.collection('posts').doc(id)));
  const candidates=docs.filter(d=>d.exists&&couldBeReel(d.data()||{}));
  const visible=await canViewMany(g.user.uid,candidates.map(d=>String(d.data()?.authorUid||'')));
  const pairs=candidates.flatMap(d=>{const x=d.data()||{},mid=reelMediaId(x);return mid&&/^[0-9a-f-]{36}$/.test(mid)&&visible.get(String(x.authorUid||''))?[{postId:d.id,mediaId:mid}]:[]});
  const media=pairs.length?await store.getAll(...pairs.map(p=>store.collection('media').doc(p.mediaId))):[];
  const eligible=pairs.flatMap((pair,i)=>{const d=media[i],x=d?.data();return d?.exists&&x&&x.postId===pair.postId&&isPlayableReelMedia(x)?[{pair,doc:{id:d.id,...x}}]:[]});
  const signed=await mintUrls(eligible.map(x=>x.doc),{viewerUid:g.user.uid,maxSeconds:600});
  return NextResponse.json({previews:Object.fromEntries(eligible.flatMap(({pair})=>signed[pair.mediaId]?[[pair.postId,signed[pair.mediaId]]]:[]))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Previews unavailable')}
}
