import test from 'node:test';
import assert from 'node:assert/strict';
import {chatNotificationId,shouldNotifyChat} from '../src/lib/core/chat-notifications.ts';
test('message notifications are deterministic and cannot contain Firestore path delimiters',()=>{
 assert.equal(chatNotificationId('msg_123'),'chat_msg_123');
 assert.equal(chatNotificationId('msg_123'),chatNotificationId('msg_123'));
 assert.throws(()=>chatNotificationId('message/x'));
});
test('muted and blocked chats do not notify',()=>{
 const base={senderUid:'a',recipientUid:'b',messagesEnabled:true,blocked:false};
 assert.equal(shouldNotifyChat(base),true);
 assert.equal(shouldNotifyChat({...base,senderUid:'b'}),false);
 assert.equal(shouldNotifyChat({...base,blocked:true}),false);
 assert.equal(shouldNotifyChat({...base,messagesEnabled:false}),false);
});
