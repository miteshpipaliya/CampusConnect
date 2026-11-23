import test from 'node:test';
import assert from 'node:assert/strict';
import {streamEpochMs,streamIso,streamReadByPeer} from '../src/lib/core/stream-time.ts';
const iso='2026-11-23T06:00:00.000Z';
const ms=Date.parse(iso);
test('Stream dates work for ISO, milliseconds, microseconds, nanoseconds and seconds',()=>{
 for(const value of [iso,ms,ms*1000,BigInt(ms)*1000000n,ms/1000,String(ms),String(ms*1000000)]){
  assert.equal(streamIso(value),iso, String(value));
 }
});
test('bad Stream dates become null instead of Invalid Date',()=>{
 for(const value of [null,undefined,'','Invalid Date',{},NaN,Infinity,0,999,'not-a-time']){
  assert.equal(streamIso(value),null,String(value));
 }
});
test('read receipts compare normalized timestamps rather than lexicographic strings',()=>{
 assert.equal(streamReadByPeer(ms*1000000,(ms+2000)*1000000),true);
 assert.equal(streamReadByPeer(ms*1000000,(ms-2000)*1000000),false);
 assert.equal(streamReadByPeer('bad',ms),false);
 assert.equal(streamEpochMs(1795413600),1795413600000);
});
