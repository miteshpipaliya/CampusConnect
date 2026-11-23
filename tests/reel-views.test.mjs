import test from 'node:test';import assert from 'node:assert/strict';
import {eligibleReelView,dedupeReels} from '../src/lib/core/reel-views.ts';
test('three second minimum and stable id dedupe',()=>{
 assert.equal(eligibleReelView(2999),false);assert.equal(eligibleReelView(3000),true);assert.equal(eligibleReelView(NaN),false);
 assert.deepEqual(dedupeReels([{id:'a'}],[{id:'a'},{id:'b'}]).map(x=>x.id),['a','b']);
});