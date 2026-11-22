import test from 'node:test';
import assert from 'node:assert/strict';
import {handleChangesAllowed,deletionDue,cropRect} from '../src/lib/core/phase2-rules.ts';
test('two username changes within fourteen days disallow a third',()=>{
 const now=Date.UTC(2026,10,22);
 assert.equal(handleChangesAllowed([now-1000,now-2000],now),false);
 assert.equal(handleChangesAllowed([now-1000,now-20*86400000],now),true);
 assert.equal(handleChangesAllowed([],now),true);
});
test('purge respects the thirty-day grace period',()=>{
 const now=Date.UTC(2026,10,22);
 assert.equal(deletionDue(null,now),false);
 assert.equal(deletionDue(now-29*86400000,now),false);
 assert.equal(deletionDue(now-30*86400000,now),true);
});
test('crop rectangle always covers square viewport',()=>{
 for(const [w,h] of [[200,100],[100,200],[100,100]]){
  const rect=cropRect(w,h,320,1.5,0.9,-0.8);
  assert.ok(rect.w>=320&&rect.h>=320);
  assert.ok(rect.x<=0&&rect.y<=0);
  assert.ok(rect.x+rect.w>=320&&rect.y+rect.h>=320);
 }
});
