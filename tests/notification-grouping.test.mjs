import test from 'node:test';import assert from 'node:assert/strict';
import {notificationGroupKey,mergeActors,normalizeNotificationType,notificationUnread} from '../src/lib/core/notification-grouping.ts';
test('notification grouping deduplicates actors and day buckets',()=>{assert.equal(notificationGroupKey('like','post',0),notificationGroupKey('like','post',3000));assert.notEqual(notificationGroupKey('like','post',0),notificationGroupKey('like','post',86400000));
 assert.deepEqual(mergeActors(['a','b'],'a'),['a','b']);assert.equal(mergeActors(Array.from({length:25},(_,i)=>String(i)),'new').length,20);
 assert.equal(normalizeNotificationType('follow_accepted'),'follow_accept');assert.equal(notificationUnread({read:false}),true);assert.equal(notificationUnread({readAt:'2026-11-23'}),false);
});