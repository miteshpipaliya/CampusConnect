import {ChatWorkspace} from '@/components/chat/chat-workspace';
import {ChatErrorBoundary} from '@/components/chat/chat-error-boundary';
export default function MessagesPage(){return <ChatErrorBoundary><ChatWorkspace/></ChatErrorBoundary>}
