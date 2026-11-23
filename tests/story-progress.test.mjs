import test from 'node:test';import assert from 'node:assert/strict';
import {storyDurationMs,storyProgress} from '../src/lib/core/story-progress.ts';
test('story progress uses five seconds for images and video duration',()=>{
 assert.equal(storyDurationMs('image/jpeg'),5000);assert.equal(storyDurationMs('video/mp4',12),12000);
 assert.equal(storyProgress(5000,5000),1);assert.equal(storyProgress(2500,5000),.5);
 assert.equal(storyProgress(6000,5000),1);assert.equal(storyProgress(-1,5000),0);
});