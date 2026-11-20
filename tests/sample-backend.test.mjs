import test from 'node:test';import assert from 'node:assert/strict';import {profiles,getFollowers,getFollowing,getProfile,searchProfiles,validHandle} from '../src/lib/sample-backend.ts';
test('seeded profiles have ten unique valid handles',()=>{assert.equal(profiles.length,10);assert.equal(new Set(profiles.map(p=>p.handle)).size,10);assert.ok(profiles.every(p=>validHandle(p.handle)));});
test('followers and following use a consistent directed graph',()=>{for(const p of profiles){for(const f of getFollowing(p.handle)){assert.ok(getFollowers(f.handle).some(x=>x.handle===p.handle));}}});
test('branch and division match both fields',()=>{const matches=searchProfiles('','Computer Engineering','4');assert.ok(matches.length>=3);assert.ok(matches.every(p=>p.branch==='Computer Engineering'&&p.division==='4'));});
test('invalid handles cannot be looked up',()=>{assert.equal(validHandle('../secrets'),false);assert.equal(getProfile('unknown'),undefined)});
