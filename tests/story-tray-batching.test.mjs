import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkAudienceIds,uniqueStoryDocs} from '../src/lib/core/story-tray-batching.ts';
test('a followed audience over 150 is split without losing student IDs',()=>{
 const ids=Array.from({length:183},(_,i)=>'student'+i);
 const chunks=chunkAudienceIds(ids,30);
 assert.equal(chunks.length,7);assert.ok(chunks.every(c=>c.length<=30));
 assert.deepEqual(chunks.flat(),ids);
});
test('results spanning Firestore pages dedupe by immutable story ID',()=>{
 const docs=[{id:'a',text:'one'},{id:'b',text:'two'},{id:'a',text:'one'}];
 assert.deepEqual(uniqueStoryDocs(docs),docs.slice(0,2));
});
