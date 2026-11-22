import {LivePostDetail} from '@/components/live-post-detail';
export default async function PostPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LivePostDetail id={id}/>}
