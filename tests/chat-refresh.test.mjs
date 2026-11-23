import test from 'node:test';
import assert from 'node:assert/strict';
import {chatRefreshIntervalMs,shouldRefreshChat} from '../src/lib/core/chat-refresh.ts';
test('socket-connected clients use a low-frequency recovery refresh',()=>{
 assert.equal(chatRefreshIntervalMs('connected','thread'),15000);
 assert.equal(chatRefreshIntervalMs('connected','inbox'),20000);
});
test('socket failures fall back to frequent authenticated conversation updates',()=>{
 for(const state of ['disabled','connecting','disconnected','error']){
  assert.equal(chatRefreshIntervalMs(state,'thread'),3000);
  assert.equal(chatRefreshIntervalMs(state,'inbox'),6000);
 }
});
test('do not poll while hidden, offline, or already fetching',()=>{
 assert.equal(shouldRefreshChat({visible:true,online:true,inFlight:false}),true);
 assert.equal(shouldRefreshChat({visible:false,online:true,inFlight:false}),false);
 assert.equal(shouldRefreshChat({visible:true,online:false,inFlight:false}),false);
 assert.equal(shouldRefreshChat({visible:true,online:true,inFlight:true}),false);
});
