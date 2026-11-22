import test from 'node:test';
import assert from 'node:assert/strict';
import {followCounterDelta,safeCounter,socialNotificationId} from '../src/lib/core/social-rules.ts';
test('only active follows count',()=>{for(const [before,after,delta] of [['none','pending',0],['none','active',1],['pending','active',1],['active','none',-1],['pending','none',0],['active','active',0]])assert.equal(followCounterDelta(before,after),delta)});
test('counters never go negative',()=>{assert.equal(safeCounter(0,-1),0);assert.equal(safeCounter(2,-1),1);assert.equal(safeCounter(undefined,1),1)});
test('notification IDs are stable',()=>{assert.equal(socialNotificationId('follow','user123'),'follow_user123');assert.equal(socialNotificationId('like','user123','post456'),'like_user123_post456')});
