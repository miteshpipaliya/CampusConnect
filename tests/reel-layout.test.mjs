import test from 'node:test';
import assert from 'node:assert/strict';
import {fitReelFrame} from '../src/lib/core/reel-layout.ts';
test('landscape fills the available width without distortion',()=>{
 const frame=fitReelFrame(1200,800,16/9);
 assert.equal(frame.width,1200);assert.equal(frame.height,675);
});
test('portrait fills available height and keeps a 9:16 frame',()=>{
 const frame=fitReelFrame(1200,800,9/16);
 assert.equal(frame.width,450);assert.equal(frame.height,800);
});
test('landscape adapts to limited height instead of overflowing',()=>{
 const frame=fitReelFrame(1600,600,16/9);
 assert.equal(frame.width,1066);assert.equal(frame.height,600);
});
test('small viewport and invalid media ratio are safe',()=>{
 const frame=fitReelFrame(285,490,0);
 assert.ok(frame.width<=285&&frame.height<=490&&frame.width>0);
 assert.deepEqual(fitReelFrame(0,0,16/9),{width:0,height:0});
});
