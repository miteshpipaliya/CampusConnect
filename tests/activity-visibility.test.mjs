import test from 'node:test';import assert from 'node:assert/strict';
import {mayShowActivity,streamPresenceState} from '../src/lib/core/activity-visibility.ts';
const base={viewerUid:'a',targetUid:'b',targetEnabled:true,viewerEnabled:true,blocked:false,targetDeleted:false};
test('activity visibility is bilateral and blocked accounts cannot reveal presence',()=>{
 assert.equal(mayShowActivity(base),true);
 for(const key of ['targetEnabled','viewerEnabled'])assert.equal(mayShowActivity({...base,[key]:false}),false);
 assert.equal(mayShowActivity({...base,blocked:true}),false);
 assert.equal(mayShowActivity({...base,targetDeleted:true}),false);
 assert.equal(mayShowActivity({...base,targetUid:'a'}),false);
});
test('unknown and disconnected presence is always offline',()=>{
 assert.equal(streamPresenceState({allowed:true,online:true,connected:true}),true);
 assert.equal(streamPresenceState({allowed:false,online:true,connected:true}),false);
 assert.equal(streamPresenceState({allowed:true,online:true,connected:false}),false);
 assert.equal(streamPresenceState({allowed:true,online:undefined}),false);
});
