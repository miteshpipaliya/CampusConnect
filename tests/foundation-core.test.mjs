import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeCursor,decodeCursor,clampLimit} from '../src/lib/core/cursor.ts';
import {detectMediaType,signatureMatches} from '../src/lib/core/media-signature.ts';
import {MEDIA_LIMITS,validateReserve} from '../src/lib/core/media-limits.ts';
import {windowStart,decide,retryAfterSec} from '../src/lib/core/rate-window.ts';
import {createTtlCache} from '../src/lib/core/session-cache.ts';
import {normalizeCounters} from '../src/lib/core/counters.ts';
import {deriveHandleLower,deriveNameTokens,postToV2} from '../src/lib/core/migrate-transforms.ts';
test('cursor validation and limit clamping',()=>{
 const c=encodeCursor(123,'abc_2');assert.deepEqual(decodeCursor(c),{millis:123,id:'abc_2'});
 for(const value of ['', '!', 'a'.repeat(513),Buffer.from('[-1,"a"]').toString('base64url')])assert.equal(decodeCursor(value),null);
 assert.throws(()=>encodeCursor(-1,'x'));assert.equal(clampLimit('999'),30);assert.equal(clampLimit('0'),10);
});
test('magic bytes identify media formats',()=>{
 const bytes=(...n)=>Uint8Array.from(n);
 assert.equal(detectMediaType(bytes(255,216,255)), 'image/jpeg');
 assert.equal(detectMediaType(bytes(137,80,78,71,13,10,26,10)),'image/png');
 assert.equal(detectMediaType(bytes(82,73,70,70,0,0,0,0,87,69,66,80)),'image/webp');
 assert.equal(detectMediaType(bytes(71,73,70,56,57,97)),'image/gif');
 assert.equal(detectMediaType(bytes(26,69,223,163)),'video/webm');
 assert.equal(detectMediaType(bytes(0,0,0,0,102,116,121,112,113,116,32,32)),'video/quicktime');
 assert.equal(detectMediaType(bytes(0,0,0,0,102,116,121,112,105,115,111,109)),'video/mp4');
 assert.equal(detectMediaType(bytes(1,2,3)),null);
 assert.equal(signatureMatches('image/jpeg',bytes(137,80,78,71,13,10,26,10)),false);
});
test('media purpose limits and duration',()=>{
 assert.deepEqual(validateReserve({contentType:'image/jpeg',size:10}),{ok:true,purpose:'post'});
 assert.equal(validateReserve({purpose:'avatar',contentType:'video/mp4',size:1}).ok,false);
 assert.equal(validateReserve({purpose:'reel',contentType:'video/mp4',size:MEDIA_LIMITS.reel}).ok,true);
 assert.equal(validateReserve({purpose:'story',contentType:'video/mp4',size:100,durationSec:61}).ok,false);
 assert.equal(validateReserve({purpose:'reel',contentType:'video/mp4',size:100,durationSec:91}).ok,false);
 assert.equal(validateReserve({contentType:'image/png',size:0}).ok,false);
});
test('rate windows',()=>{assert.equal(windowStart(61500,60),60000);assert.equal(decide(9,10),true);assert.equal(decide(10,10),false);assert.equal(retryAfterSec(61500,60),59)});
test('TTL cache expires and evicts',()=>{
 let now=0;const cache=createTtlCache({ttlMs:100,max:2,now:()=>now});
 cache.set('a',1);cache.set('b',2);cache.set('c',3);
 assert.equal(cache.get('a'),undefined);assert.equal(cache.get('b'),2);now=101;assert.equal(cache.get('c'),undefined);assert.equal(cache.size(),1);
});
test('legacy counters and migration transforms',()=>{
 assert.deepEqual(normalizeCounters(null),{likes:0,comments:0,reposts:0,saves:0,shares:0,views:0,isLegacy:true});
 assert.equal(normalizeCounters({likes:-1,comments:2.8}).comments,2);
 assert.equal(deriveHandleLower(' Test.Name '),'test.name');
 assert.deepEqual(deriveNameTokens('Ava Ava BVM-2026'),['ava','bvm','2026']);
 assert.deepEqual(postToV2({caption:'#BVM hello #bvm',mediaId:'abc'}).hashtags,['bvm']);
});
