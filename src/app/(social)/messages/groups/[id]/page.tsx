import {GroupChatWorkspace} from '@/components/chat/group-chat-workspace';
export default async function GroupChatPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;return <GroupChatWorkspace id={id}/>;
}
