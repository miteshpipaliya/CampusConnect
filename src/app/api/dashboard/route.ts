import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {dayDocId,zeroFilledSeries,utcDay} from '@/lib/core/daily-stats';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const range=req.nextUrl.searchParams.get('range')==='30'?30:7;
 try{
  const store=db(),today=Date.now(),days=zeroFilledSeries(range,today,{});
  const [profile,posts,stats]=await Promise.all([
   store.collection('users').doc(user.uid).get(),
   store.collection('posts').where('authorUid','==',user.uid).limit(200).get(),
   store.getAll(...days.map(s=>store.collection('dailyStats').doc(dayDocId(user.uid,s.day))))
  ]);
  const byDay:Record<string,{profileVisits:number;reach:number;storyViews:number;views:number}>={};
  for(const doc of stats){if(!doc.exists)continue;const x=doc.data()||{},day=String(x.day||'');if(!day)continue;
   byDay[day]={profileVisits:Number(x.profileVisits||0),reach:Number(x.reach||0),storyViews:Number(x.storyViews||0),views:Number(x.views||0)};
  }
  const series=zeroFilledSeries(range,today,byDay);
  const own=posts.docs.filter(d=>!d.data().deletedAt),fields=own.reduce((sum,d)=>({
   likes:sum.likes+Number(d.data().counters?.likes||0),comments:sum.comments+Number(d.data().counters?.comments||0),
   views:sum.views+Number(d.data().counters?.views||0)
  }),{likes:0,comments:0,views:0});
  const top=own.map(d=>({id:d.id,caption:String(d.data().caption||''),likes:Number(d.data().counters?.likes||0),
   comments:Number(d.data().counters?.comments||0),views:Number(d.data().counters?.views||0),
   mediaId:typeof d.data().mediaId==='string'?String(d.data().mediaId):null
  })).sort((a,b)=>b.views+b.likes-a.views-a.likes).slice(0,5);
  const mediaIds=[...new Set(top.map(x=>x.mediaId).filter((id):id is string=>Boolean(id)))];
  const media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()||{})})),{viewerUid:user.uid});
  const counters=profile.data()?.counters||{};
  return NextResponse.json({range,totals:{posts:Number(counters.posts??own.length),followers:Number(counters.followers||0),
   following:Number(counters.following||0),...fields,storyViews:series.reduce((n,s)=>n+s.storyViews,0),
   profileVisits:series.reduce((n,s)=>n+s.profileVisits,0)},
   series,topPosts:top.map(p=>({id:p.id,caption:p.caption,likes:p.likes,comments:p.comments,views:p.views,mediaUrl:p.mediaId?urls[p.mediaId]?.url??null:null}))
  },{headers:safeHeaders});
 }catch(error){console.error('Dashboard query failed',error instanceof Error?error.name:'unknown');return errorResponse(503,'Dashboard unavailable')}
}
