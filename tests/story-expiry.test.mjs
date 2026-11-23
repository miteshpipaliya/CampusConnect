import test from 'node:test';import assert from 'node:assert/strict';
import {isStoryActive,storyMediaTtlSeconds,STORY_LIFETIME_MS} from '../src/lib/core/story-expiry.ts';
test('stories expire at exactly 24 hours',()=>{
 const now=Date.UTC(2026,10,23,10);const s={expiresAt:now+STORY_LIFETIME_MS};
 assert.equal(isStoryActive(s,now+STORY_LIFETIME_MS-1000),true);
 assert.equal(isStoryActive(s,now+STORY_LIFETIME_MS),false);
 assert.equal(isStoryActive(s,now+STORY_LIFETIME_MS+1000),false);
 assert.equal(storyMediaTtlSeconds(s,now+STORY_LIFETIME_MS-1000),1);
 assert.equal(storyMediaTtlSeconds(s,now+STORY_LIFETIME_MS),0);
});