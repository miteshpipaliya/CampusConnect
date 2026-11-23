import test from 'node:test';import assert from 'node:assert/strict';
import {reelMediaId,couldBeReel,isPlayableReelMedia,safeVideoAspect} from '../src/lib/core/reel-discovery.ts';
test('single-video legacy posts are eligible while multi-media carousels are not',()=>{
 const one={type:'post',mediaId:'video',media:[{mediaId:'video'}]};
 const two={type:'post',mediaId:'video',media:[{mediaId:'video'},{mediaId:'image'}]};
 assert.equal(reelMediaId(one),'video');assert.equal(couldBeReel(one),true);
 assert.equal(reelMediaId(two),null);assert.equal(couldBeReel(two),false);
 assert.equal(couldBeReel({...one,archived:true}),false);
 assert.equal(couldBeReel({...one,deletedAt:'yesterday'}),false);
});
test('video media must be confirmed and video-typed',()=>{
 assert.equal(isPlayableReelMedia({status:'uploaded',contentType:'video/mp4'}),true);
 assert.equal(isPlayableReelMedia({status:'pending',contentType:'video/mp4'}),false);
 assert.equal(isPlayableReelMedia({status:'uploaded',contentType:'image/png'}),false);
});
test('player preserves original aspect ratio with reasonable limits',()=>{
 assert.ok(Math.abs(safeVideoAspect(1920,1080)-16/9)<.001);
 assert.ok(Math.abs(safeVideoAspect(1080,1920)-9/16)<.001);
 assert.equal(safeVideoAspect(0,0),9/16);
});
