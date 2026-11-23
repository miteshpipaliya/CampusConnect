import {ChatWorkspace} from '@/components/chat/chat-workspace';
import {ChatErrorBoundary} from '@/components/chat/chat-error-boundary';
export default async function ConversationPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <ChatErrorBoundary><ChatWorkspace initialPeer={id}/></ChatErrorBoundary>;
}
