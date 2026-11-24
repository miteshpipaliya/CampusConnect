import test from 'node:test';
import assert from 'node:assert/strict';
import {fitReelFrame,captionPlacement} from '../src/lib/core/reel-layout.ts';
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
 assert.equal(frame.width,1067);assert.equal(frame.height,600);
});
test('small viewport and invalid media ratio are safe',()=>{
 const frame=fitReelFrame(285,490,0);
 assert.ok(frame.width<=285&&frame.height<=490&&frame.width>0);
 assert.deepEqual(fitReelFrame(0,0,16/9),{width:0,height:0});
});

test('caption placement follows shape and available desktop gutter',()=>{for(const ratio of [.5625,.8,.89])assert.equal(captionPlacement(ratio,1440,340),'left');for(const ratio of [.9,1,1.78])assert.equal(captionPlacement(ratio,1440,340),'overlay');assert.equal(captionPlacement(.5625,390,340),'overlay');assert.equal(captionPlacement(.5625,1100,259),'overlay');assert.equal(captionPlacement(.5625,1100,260),'left')});
