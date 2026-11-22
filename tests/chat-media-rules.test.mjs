import test from 'node:test';
import assert from 'node:assert/strict';
import {mayClaimChatMedia,mayViewChatMedia} from '../src/lib/core/chat-media-rules.ts';
const base={ownerUid:'a',senderUid:'a',status:'uploaded',purpose:'chat',contentType:'image/jpeg',alreadyAttached:false};
test('chat media ownership and purpose must match',()=>{
 assert.equal(mayClaimChatMedia(base),true);
 assert.equal(mayClaimChatMedia({...base,senderUid:'b'}),false);
 assert.equal(mayClaimChatMedia({...base,status:'pending'}),false);
 assert.equal(mayClaimChatMedia({...base,purpose:'post'}),false);
 assert.equal(mayClaimChatMedia({...base,alreadyAttached:true}),false);
 assert.equal(mayClaimChatMedia({...base,contentType:'application/pdf'}),false);
 assert.equal(mayClaimChatMedia({...base,contentType:'video/mp4'}),true);
});
test('only active non-blocked sender or intended peer can read an attached chat file',()=>{
 const access={viewerUid:'b',ownerUid:'a',peerUid:'b',messageAttached:true,deleted:false,hidden:false,blocked:false,ownerDeleted:false};
 assert.equal(mayViewChatMedia(access),true);
 assert.equal(mayViewChatMedia({...access,viewerUid:'c'}),false);
 assert.equal(mayViewChatMedia({...access,messageAttached:false}),false);
 assert.equal(mayViewChatMedia({...access,blocked:true}),false);
 assert.equal(mayViewChatMedia({...access,deleted:true}),false);
 assert.equal(mayViewChatMedia({...access,hidden:true}),false);
 assert.equal(mayViewChatMedia({...access,ownerDeleted:true}),false);
 assert.equal(mayViewChatMedia({...access,viewerUid:'a'}),true);
});
