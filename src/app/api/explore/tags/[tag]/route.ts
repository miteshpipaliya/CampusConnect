import {NextRequest,NextResponse} from 'next/server';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {normalizeTag} from '@/lib/core/search-rules';
import {explorePage} from '@/lib/server/explore-service';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{tag:string}>}){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const {tag:raw}=await params,tag=normalizeTag(raw);if(!tag)return errorResponse(400,'Invalid hashtag');
 try{return NextResponse.json({...await explorePage(user.uid,{tag,cursor:req.nextUrl.searchParams.get('cursor'),...(req.nextUrl.searchParams.get('sort')?{sort:req.nextUrl.searchParams.get('sort')!}:{})}),tag},{headers:safeHeaders})}
 catch{return errorResponse(503,'Hashtag feed unavailable')}
}
