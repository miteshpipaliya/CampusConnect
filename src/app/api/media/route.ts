import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db,storage } from '@/lib/server/services';
import { session,sameOrigin,errorResponse,safeHeaders } from '@/lib/server/session';

export const runtime='nodejs';
const max:Record<string,number>={'image/jpeg':8*1024*1024,'image/png':8*1024*1024,'image/webp':8*1024*1024,'video/mp4':50*1024*1024,'video/webm':50*1024*1024};
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const body:unknown=await request.json();
  const input=z.discriminatedUnion('action',[
   z.object({action:z.literal('reserve'),contentType:z.string(),size:z.number().int().positive()}),
   z.object({action:z.literal('confirm'),id:z.string().uuid()})
  ]).safeParse(body);
  if(!input.success)return errorResponse(400,'Invalid media request');
  const {client,Bucket}=storage();
  if(input.data.action==='reserve'){
   const {contentType,size}=input.data;
   if(!max[contentType]||size>(max[contentType]??0))return errorResponse(400,'Unsupported media type or size');
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
   await db().collection('media').doc(id).create({ownerUid:user.uid,key,contentType,size,status:'pending',createdAt:FieldValue.serverTimestamp()});
   const uploadUrl=await getSignedUrl(client,new PutObjectCommand({Bucket,Key:key,ContentType:contentType}),{expiresIn:90});
   return NextResponse.json({id,uploadUrl},{headers:safeHeaders});
  }
  const id=input.data.id,ref=db().collection('media').doc(id),item=await ref.get();
  if(!item.exists||item.data()?.ownerUid!==user.uid)return errorResponse(404,'File not found');
  const data=item.data()!;
  if(data.status!=='pending')return errorResponse(400,'Invalid upload state');
  const obj=await client.send(new HeadObjectCommand({Bucket,Key:data.key}));
  if(Number(obj.ContentLength)!==data.size||obj.ContentType!==data.contentType){
   await client.send(new DeleteObjectCommand({Bucket,Key:data.key}));
   await ref.update({status:'rejected'});
   return errorResponse(400,'Uploaded content does not match expected metadata');
  }
  await ref.update({status:'uploaded'});
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
   if(!data.postId)return errorResponse(403,'Private media');
   const post=await db().collection('posts').doc(data.postId).get();
   if(!post.exists||post.data()?.visibility!=='campus')return errorResponse(403,'Private media');
  }
  const {client,Bucket}=storage();
  const downloadUrl=await getSignedUrl(client,new GetObjectCommand({Bucket,Key:data.key}),{expiresIn:60});
  const response=NextResponse.redirect(downloadUrl,302);
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
 }catch{return errorResponse(503,'Media download unavailable')}
}
