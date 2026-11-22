import {SocialConnections} from '@/components/social-connections';
export default async function ConnectionsPage({searchParams}:{searchParams:Promise<{handle?:string}>}){const {handle}=await searchParams;return <SocialConnections handle={handle}/>}
