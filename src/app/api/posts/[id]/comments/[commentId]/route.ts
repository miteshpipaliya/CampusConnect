import {NextRequest,NextResponse} from 'next/server';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {removePostComment} from '@/lib/server/comment-operations';
export const runtime='nodejs';
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string;commentId:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'comment-delete:{uid}',...RATE_LIMITS.commentDelete}});
 if(!checked.ok)return checked.response;
 const {id,commentId}=await params;
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)||!/^[A-Za-z0-9_-]{10,100}$/.test(commentId))return errorResponse(400,'Invalid comment ID');
 try{
  const status=await removePostComment(checked.user.uid,id,commentId);
  if(status==='missing')return errorResponse(404,'Comment unavailable');
  if(status==='forbidden')return errorResponse(403,'Cannot delete this comment');
  if(status==='too-many')return errorResponse(409,'Too many replies to delete at once');
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to delete comment')}
}
