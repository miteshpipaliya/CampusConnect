import 'server-only';
import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {safeHeaders} from './session';
export async function withApi<T extends Response>(route:string,work:()=>Promise<T>):Promise<T|NextResponse>{
 const requestId=randomUUID();try{const response=await work();response.headers.set('x-request-id',requestId);return response}catch(error){console.error('API request failed',{route,requestId,name:error instanceof Error?error.name:'Unknown'});return NextResponse.json({error:'Server error',requestId},{status:500,headers:{...safeHeaders,'x-request-id':requestId}})}
}
