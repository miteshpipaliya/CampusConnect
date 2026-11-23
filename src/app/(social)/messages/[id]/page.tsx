import {SocialPanels} from '@/components/social-panels';
import {ChatErrorBoundary} from '@/components/chat/chat-error-boundary';
export default async function ConversationPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <ChatErrorBoundary><div className="cc-connected-feed cc-chat-view"><SocialPanels section="chat" initialPeer={id}/></div></ChatErrorBoundary>;
}
