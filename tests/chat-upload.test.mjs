import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_CHAT_PROXY_BYTES,canProxyChatUpload} from '../src/lib/core/chat-upload.ts';
test('small private chat files are eligible for the same-origin fallback',()=>{
 assert.equal(MAX_CHAT_PROXY_BYTES,3*1024*1024);
 for(const value of [1,100000,MAX_CHAT_PROXY_BYTES])assert.equal(canProxyChatUpload(value),true);
});
test('large, empty, malformed uploads cannot use the serverless proxy',()=>{
 for(const value of [0,-1,MAX_CHAT_PROXY_BYTES+1,Infinity,NaN,1.5])assert.equal(canProxyChatUpload(value),false);
});
