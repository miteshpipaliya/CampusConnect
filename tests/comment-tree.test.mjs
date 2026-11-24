import test from 'node:test';
import assert from 'node:assert/strict';
import {groupCommentTree,pinAllowed} from '../src/lib/core/comment-tree.ts';
test('comment replies attach to a parent; pinned comment is first',()=>{
 const list=[{id:'a',createdAt:2},{id:'b',parentId:'a',createdAt:3},{id:'c',createdAt:1,pinned:true},{id:'d',parentId:'a',createdAt:2.5}];
 const result=groupCommentTree(list);
 assert.deepEqual(result.map(x=>x.id),['c','a']);
 assert.deepEqual(result[1].replies.map(x=>x.id),['d','b']);
});
test('legacy orphan replies are visible instead of discarded',()=>{
 const result=groupCommentTree([{id:'o',parentId:'missing',createdAt:1}]);
 assert.equal(result[0].id,'o');
});
test('only one owner-pinned comment',()=>{
 assert.equal(pinAllowed(null,'a'),true);
 assert.equal(pinAllowed('a','a'),true);
 assert.equal(pinAllowed('a','b'),false);
});
