import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Stream user-management routes are under /api/v2/users, not /api/v2/chat/users',()=>{
 const source=read('src/lib/server/stream-user.ts');
 assert.doesNotMatch(source,/\/api\/v2\/chat\/users/);
 assert.match(source,/\/api\/v2\/users/);
 assert.match(source,/method:'PATCH'/);
 assert.match(source,/set:\{invisible:!visible\}/);
});

test('presence is opt-in and synchronized when Stream client tokens are enabled',()=>{
 const route=read('src/app/api/settings/route.ts');
 assert.match(route,/activityStatus:false/);
 assert.match(route,/STREAM_CLIENT_TOKENS_ENABLED/);
 assert.match(route,/setStreamActivityVisibility\(uid,false\)/);
 assert.match(route,/setStreamActivityVisibility\(uid,true\)/);
});
