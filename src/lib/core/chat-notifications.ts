/** Stable notification identity prevents duplicate alerts after webhook or API retries. */
export function chatNotificationId(messageId:string):string{
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(messageId))throw Error('INVALID_STREAM_MESSAGE_ID');
 return 'chat_'+messageId;
}
export function shouldNotifyChat(input:{senderUid:string;recipientUid:string;messagesEnabled:boolean;blocked:boolean}):boolean{
 return input.senderUid!==input.recipientUid&&input.messagesEnabled&&!input.blocked;
}
