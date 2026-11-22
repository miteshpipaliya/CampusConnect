import test from 'node:test';import assert from 'node:assert/strict';
import {maySignMedia,mayClaimMedia} from '../src/lib/core/media-access.ts';
test('media access requires uploaded object and valid key',()=>{
 const base={owner:false,status:'uploaded',hasKey:true};
 assert.equal(maySignMedia({...base,owner:true}),true);
 assert.equal(maySignMedia({...base,owner:true,status:'pending'}),false);
 assert.equal(maySignMedia({...base,owner:true,hasKey:false}),false);
 assert.equal(maySignMedia({...base,avatar:{active:true,blocked:true}}),false);
 assert.equal(maySignMedia({...base,avatar:{active:true,blocked:false}}),true);
 assert.equal(maySignMedia({...base,story:{active:true,visible:true,closeFriendsOnly:true,closeFriend:false}}),false);
 assert.equal(maySignMedia({...base,story:{active:true,visible:true,closeFriendsOnly:true,closeFriend:true}}),true);
 assert.equal(maySignMedia({...base,post:{exists:true,deleted:false,archived:true,author:false,visible:true}}),false);
 assert.equal(maySignMedia({...base,post:{exists:true,deleted:false,archived:true,author:true,visible:true}}),true);
 assert.equal(maySignMedia({...base,post:{exists:true,deleted:true,archived:false,author:true,visible:true}}),false);
});
test('media claim purpose and ownership matrix',()=>{
 const base={owner:true,status:'uploaded',attached:false,purpose:'post',contentType:'image/jpeg'};
 assert.equal(mayClaimMedia({...base,kind:'post'}),true);
 assert.equal(mayClaimMedia({...base,kind:'post',owner:false}),false);
 assert.equal(mayClaimMedia({...base,kind:'post',attached:true}),false);
 assert.equal(mayClaimMedia({...base,kind:'reel'}),false);
 assert.equal(mayClaimMedia({...base,kind:'reel',purpose:'reel',contentType:'video/mp4'}),true);
 assert.equal(mayClaimMedia({...base,kind:'story',purpose:'story'}),true);
 assert.equal(mayClaimMedia({...base,kind:'avatar',purpose:'avatar'}),true);
 assert.equal(mayClaimMedia({...base,kind:'avatar',purpose:'avatar',contentType:'video/mp4'}),false);
});
