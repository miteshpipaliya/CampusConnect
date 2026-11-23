import test from 'node:test';import assert from 'node:assert/strict';
import {validCampusGroupId,normaliseGroupMembers,normaliseGroupName} from '../src/lib/core/group-chat-rules.ts';
test('group requires two to eight other distinct valid members',()=>{
 assert.deepEqual(normaliseGroupMembers(['ani.1','dev.2','ani.1'],'owner'),['ani.1','dev.2']);
 assert.equal(normaliseGroupMembers(['ani.1'],'owner'),null);
 assert.equal(normaliseGroupMembers(['owner','dev.2'],'owner'),null);
});
test('generated ID format and bounded name',()=>{
 assert.equal(validCampusGroupId('campus-group-'+'a'.repeat(32)),true);
 assert.equal(validCampusGroupId('../other'),false);
 assert.equal(normaliseGroupName(' Class  Group '),'Class Group');
 assert.equal(normaliseGroupName(' '),null);
});
