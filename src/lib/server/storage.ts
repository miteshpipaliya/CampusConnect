import 'server-only';
import {S3Client,PutObjectCommand,GetObjectCommand,HeadObjectCommand,DeleteObjectCommand,DeleteObjectsCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
let cachedStorage:ReturnType<typeof initializeStorage>|undefined;
export function getStorage(){return cachedStorage??=initializeStorage()}
function initializeStorage(){
 const provider=process.env.STORAGE_PROVIDER||'r2';
 if(provider==='r2'){
  const endpoint=process.env.R2_ENDPOINT,account=process.env.R2_ACCOUNT_ID;
  const accessKeyId=process.env.R2_ACCESS_KEY_ID?.trim(),secretAccessKey=process.env.R2_SECRET_ACCESS_KEY?.trim();
  const Bucket=process.env.R2_BUCKET_NAME;
  if(!endpoint||!account||!accessKeyId||!secretAccessKey||!Bucket)throw Error('R2 configuration unavailable');
  if(!/^[A-Za-z0-9]+$/.test(accessKeyId))throw Error('R2 access key ID contains invalid characters');
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.hostname!==account+'.r2.cloudflarestorage.com'||url.pathname!=='/')throw Error('R2 endpoint misconfigured');
  return {client:new S3Client({endpoint:url.origin,region:'auto',forcePathStyle:true,credentials:{accessKeyId,secretAccessKey}}),Bucket,provider};
 }
 if(provider!=='s3'&&provider!=='b2')throw Error('Unsupported storage provider');
 const endpoint=process.env.S3_ENDPOINT,region=process.env.S3_REGION,accessKeyId=process.env.S3_ACCESS_KEY_ID,secretAccessKey=process.env.S3_SECRET_ACCESS_KEY,Bucket=process.env.S3_BUCKET_NAME;
 if(!endpoint||!region||!accessKeyId||!secretAccessKey||!Bucket||new URL(endpoint).protocol!=='https:')throw Error('S3 configuration unavailable');
 return {client:new S3Client({endpoint,region,credentials:{accessKeyId,secretAccessKey}}),Bucket,provider};
}
export async function presignPut(Key:string,ContentType:string,expiresIn=90){const {client,Bucket}=getStorage();return getSignedUrl(client,new PutObjectCommand({Bucket,Key,ContentType}),{expiresIn})}
export async function presignGet(Key:string,expiresIn=60){const {client,Bucket}=getStorage();return getSignedUrl(client,new GetObjectCommand({Bucket,Key}),{expiresIn})}
export async function headObject(Key:string){const {client,Bucket}=getStorage();return client.send(new HeadObjectCommand({Bucket,Key}))}
export async function getObjectRange(Key:string,range='bytes=0-31'){const {client,Bucket}=getStorage();return client.send(new GetObjectCommand({Bucket,Key,Range:range}))}
export async function deleteObject(Key:string){const {client,Bucket}=getStorage();return client.send(new DeleteObjectCommand({Bucket,Key}))}
export async function deleteMany(keys:string[]){if(!keys.length)return;const {client,Bucket}=getStorage();return client.send(new DeleteObjectsCommand({Bucket,Delete:{Objects:keys.map(Key=>({Key}))}}))}
