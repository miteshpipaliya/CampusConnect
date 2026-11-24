import test from 'node:test';import assert from 'node:assert/strict';import {reelPreviewTime} from '../src/lib/core/reel-preview-time.ts';
test('reel preview uses stable varying interior frames',()=>{const a=reelPreviewTime('reel-one',20);assert.equal(a,reelPreviewTime('reel-one',20));assert.ok(a>=4&&a<=16);assert.notEqual(a,reelPreviewTime('reel-two',20))});
test('invalid and tiny durations cannot seek past the end',()=>{for(const value of [NaN,Infinity,-1,0])assert.equal(reelPreviewTime('a',value),0);assert.equal(reelPreviewTime('a',.01),0)});
