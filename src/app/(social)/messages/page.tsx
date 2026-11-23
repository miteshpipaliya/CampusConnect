import {SocialPanels} from '@/components/social-panels';
import {ChatErrorBoundary} from '@/components/chat/chat-error-boundary';
export default function MessagesPage(){
 return <ChatErrorBoundary><div className="cc-connected-feed cc-chat-view"><SocialPanels section="chat"/></div></ChatErrorBoundary>;
}
