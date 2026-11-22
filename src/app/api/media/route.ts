import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import {guard} from '@/lib/server/guard';
import {checkRateLimit,RATE_LIMITS} from '@/lib/server/rate-limit';
import {validateReserve} from '@/lib/core/media-limits';
import {signatureMatches} from '@/lib/core/media-signature';
import {parseMp4Duration,parseWebmDuration,durationWithinLimit} from '@/lib/core/video-duration';
import {MEDIA_LIMITS} from '@/lib/core/media-limits';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db,storage } from '@/lib/server/services';
import {canViewAuthor} from '@/lib/server/privacy';
import { session,errorResponse,safeHeaders } from '@/lib/server/session';

export const runtime='nodejs';
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true});if(!checked.ok)return checked.response;
 const user=checked.user;
 try{
  const body:unknown=await request.json();
  const input=z.discriminatedUnion('action',[
   z.object({action:z.literal('reserve'),contentType:z.string(),size:z.number().int().positive(),purpose:z.enum(['avatar','post','story','reel','chat']).optional(),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSec:z.number().positive().optional()}),
   z.object({action:z.literal('confirm'),id:z.string().uuid()})
  ]).safeParse(body);
  if(!input.success)return errorResponse(400,'Invalid media request');
  const {client,Bucket}=storage();
  if(input.data.action==='reserve'){
   const {contentType,size}=input.data;
   const validation=validateReserve(input.data);
   if(!validation.ok)return errorResponse(400,'Unsupported media type or size');
   const limit=await checkRateLimit({key:'media:'+user.uid,...RATE_LIMITS.media});
   if(!limit.allowed)return NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(limit.retryAfterSec)}});
   const today=new Date().toISOString().slice(0,10);
   const quota=db().collection('uploadQuotas').doc(user.uid+'_'+today);
   const allowed=await db().runTransaction(async t=>{
     const current=await t.get(quota);const count=Number(current.data()?.count||0);
     if(count>=30)return false;
     t.set(quota,{count:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
     return true;
   });
   if(!allowed)return errorResponse(429,'Daily upload limit reached');
   const id=randomUUID(),key='uploads/'+user.uid+'/'+id;
   await db().collection('media').doc(id).create({ownerUid:user.uid,key,contentType,size,status:'pending',purpose:validation.purpose,...(input.data.width?{width:input.data.width}:{}),...(input.data.height?{height:input.data.height}:{}),...(input.data.durationSec?{durationSec:input.data.durationSec}:{}),createdAt:FieldValue.serverTimestamp()});
   const uploadUrl=await getSignedUrl(client,new PutObjectCommand({Bucket,Key:key,ContentType:contentType}),{expiresIn:90});
   return NextResponse.json({id,uploadUrl},{headers:safeHeaders});
  }
  const id=input.data.id,ref=db().collection('media').doc(id),item=await ref.get();
  if(!item.exists||item.data()?.ownerUid!==user.uid)return errorResponse(404,'File not found');
  const data=item.data()!;
  if(data.status!=='pending')return errorResponse(400,'Invalid upload state');
  let obj;
  try{obj=await client.send(new HeadObjectCommand({Bucket,Key:data.key}));}
  catch(error){if((error as {name?:string}).name==='NotFound'||(error as {name?:string}).name==='NoSuchKey')return errorResponse(409,'Upload not finished');throw error;}
  if(Number(obj.ContentLength)!==data.size||obj.ContentType!==data.contentType){
   await client.send(new DeleteObjectCommand({Bucket,Key:data.key}));
   await ref.update({status:'rejected'});
   return errorResponse(400,'Uploaded content does not match expected metadata');
  }
  const range=await client.send(new GetObjectCommand({Bucket,Key:data.key,Range:'bytes=0-31'}));
  const bytes=range.Body?await range.Body.transformToByteArray():new Uint8Array();
  if(!signatureMatches(data.contentType,bytes)){
   await client.send(new DeleteObjectCommand({Bucket,Key:data.key}));await ref.update({status:'rejected'});
   return errorResponse(400,'Uploaded content does not match expected metadata');
  }
  if((data.purpose==='story'||data.purpose==='reel')&&String(data.contentType).startsWith('video/')){
   const header=await client.send(new GetObjectCommand({Bucket,Key:data.key,Range:'bytes=0-65535'}));
   const buffer=header.Body?await header.Body.transformToByteArray():new Uint8Array();
   const actual=data.contentType==='video/webm'?parseWebmDuration(buffer):parseMp4Duration(buffer);
   const limit=data.purpose==='story'?MEDIA_LIMITS.storySeconds:MEDIA_LIMITS.reelSeconds;
   if(!durationWithinLimit(actual,Number(data.durationSec),limit)){
    await client.send(new DeleteObjectCommand({Bucket,Key:data.key}));await ref.update({status:'rejected'});
    return errorResponse(400,'Video duration invalid or unreadable');
   }
  }
  await ref.update({status:'uploaded',confirmedAt:FieldValue.serverTimestamp()});
  return NextResponse.json({id,status:'uploaded'},{headers:safeHeaders});
 }catch{return errorResponse(503,'Media service unavailable')}
}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const id=request.nextUrl.searchParams.get('id')||'';
 if(!/^[0-9a-f-]{36}$/.test(id))return errorResponse(400,'Invalid media ID');
 try{
  const item=await db().collection('media').doc(id).get();
  if(!item.exists||item.data()?.status!=='uploaded')return errorResponse(404,'File unavailable');
  const data=item.data()!;
  if(data.ownerUid!==user.uid){
   if(data.avatarOwnerUid){const owner=await db().collection('users').doc(data.avatarOwnerUid).get();if(owner.exists&&owner.data()?.avatarMediaId===id&&!owner.data()?.deletedAt&&!(await (await import('@/lib/server/privacy')).isBlockedEitherWay(user.uid,data.avatarOwnerUid))){const {client,Bucket}=storage();const url=await getSignedUrl(client,new GetObjectCommand({Bucket,Key:data.key}),{expiresIn:60});const response=NextResponse.redirect(url,302);response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;}}
   if(data.storyId){
    const story=await db().collection('stories').doc(data.storyId).get();
    if(!story.exists||!(await canViewAuthor(user.uid,String(story.data()?.authorUid||'')))||(story.data()?.expiresAt?.toMillis?.()<=Date.now()&&!story.data()?.highlight))return errorResponse(403,'Story unavailable');
    if(story.data()?.audience==='close'&&story.data()?.authorUid!==user.uid){
     const friend=await db().collection('closeFriends').doc(String(story.data()?.authorUid||'')+'_'+user.uid).get();
     if(!friend.exists)return errorResponse(403,'Story unavailable');
    }
   }else{
    if(!data.postId)return errorResponse(403,'Private media');
    const post=await db().collection('posts').doc(data.postId).get();
    if(!post.exists||post.data()?.deletedAt||(post.data()?.archived&&post.data()?.authorUid!==user.uid)||!(await canViewAuthor(user.uid,String(post.data()?.authorUid||''))))return errorResponse(403,'Private media');
   }
  }
  const {client,Bucket}=storage();
  const downloadUrl=await getSignedUrl(client,new GetObjectCommand({Bucket,Key:data.key}),{expiresIn:60});
  const response=NextResponse.redirect(downloadUrl,302);
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
 }catch{return errorResponse(503,'Media download unavailable')}
}
