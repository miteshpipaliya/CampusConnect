import { NextRequest, NextResponse } from 'next/server';
import { getFollowers,getFollowing,getProfile,profiles,searchProfiles,validHandle } from '@/lib/sample-backend';
export const dynamic='force-dynamic';
const responseHeaders={'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
export async function GET(request:NextRequest){
 const url=request.nextUrl;const handle=(url.searchParams.get('handle')||'').trim().toLowerCase();
 const relation=url.searchParams.get('relation')||'';
 const query=(url.searchParams.get('q')||'').trim();
 const branch=(url.searchParams.get('branch')||'').trim();
 const division=(url.searchParams.get('division')||'').trim();
 if(handle&&!validHandle(handle))return NextResponse.json({error:'Invalid profile handle'},{status:400,headers:responseHeaders});
 if(query.length>80||branch.length>80||division.length>20)return NextResponse.json({error:'Query too long'},{status:400,headers:responseHeaders});
 if(relation&&!['followers','following'].includes(relation))return NextResponse.json({error:'Invalid relation'},{status:400,headers:responseHeaders});
 if(relation&&!handle)return NextResponse.json({error:'A profile handle is required'},{status:400,headers:responseHeaders});
 if(handle&&!getProfile(handle))return NextResponse.json({error:'Sample profile not found'},{status:404,headers:responseHeaders});
 if(relation)return NextResponse.json({demo:true,profiles:relation==='followers'?getFollowers(handle):getFollowing(handle)},{headers:responseHeaders});
 if(handle)return NextResponse.json({demo:true,profile:getProfile(handle),followers:getFollowers(handle).length,following:getFollowing(handle).length},{headers:responseHeaders});
 return NextResponse.json({demo:true,profiles:searchProfiles(query,branch,division),total:profiles.length},{headers:responseHeaders});
}
export async function POST(){return NextResponse.json({error:'Demo API is read-only. Changes are local to your browser; real account actions require a database and authentication.'},{status:501,headers:responseHeaders});}
