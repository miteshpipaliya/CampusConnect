import {PostModal} from '@/components/post-modal';
export default async function InterceptedPost({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <PostModal id={id}/>;
}
