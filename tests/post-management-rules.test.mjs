import test from 'node:test';import assert from 'node:assert/strict';
import {hashtagDelta,nextPinnedPosts} from '../src/lib/core/post-management-rules.ts';
test('caption edit changes only added and removed hashtags',()=>assert.deepEqual(hashtagDelta(['one','two'],['two','three']),[{tag:'one',delta:-1},{tag:'three',delta:1}]));
test('profile pins allow three and reject a fourth',()=>{
 assert.deepEqual(nextPinnedPosts(['a','b'],'c',true),['a','b','c']);
 assert.equal(nextPinnedPosts(['a','b','c'],'d',true),null);
 assert.deepEqual(nextPinnedPosts(['a','b','c'],'b',false),['a','c']);
});
