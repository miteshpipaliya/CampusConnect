import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeChronologicalMessages} from '../src/lib/core/chat-pagination.ts';
test('merge pages and reconnect events in chronological order without duplicate messages',()=>{
 const a=[{id:'a',createdAt:'2026-11-22T12:00:00Z'}];
 const b=[{id:'b',createdAt:'2026-11-22T13:00:00Z'},a[0]];
 assert.deepEqual(mergeChronologicalMessages(a,b).map(m=>m.id),['a','b']);
 assert.deepEqual(mergeChronologicalMessages(b,[]).map(m=>m.id),['a','b']);
});
