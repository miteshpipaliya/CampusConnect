import {SocialConnections} from '@/components/social-connections';
export default async function ConnectionsPage({searchParams}:{searchParams:Promise<{handle?:string;tab?:string}>}){
 const {handle,tab}=await searchParams;
 const initialTab=tab==='following'?'following':tab==='suggestions'?'suggestions':'followers';
 return <SocialConnections {...(handle?{handle}:{})} initialTab={initialTab}/>;
}