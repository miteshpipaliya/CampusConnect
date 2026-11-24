import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const endpoints=[
 'src/app/api/posts/route.ts',
 'src/app/api/reels/route.ts',
 'src/app/api/stories/route.ts',
 'src/app/api/profile/[username]/route.ts',
 'src/app/api/media/route.ts',
 'src/app/api/posts/[id]/likes/route.ts',
 'src/app/api/posts/[id]/comments/route.ts',
 'src/app/api/reposts/route.ts',
 'src/app/api/saves/route.ts',
 'src/lib/server/media-urls.ts'
];
test('all principal content APIs consult server-side author visibility',()=>{
 for(const endpoint of endpoints){
  assert.match(load(endpoint),/canViewAuthor|canViewMany/,endpoint+' must check the authenticated viewer');
 }
});
test('direct Stream tokens require explicit owner opt-in',()=>{
 assert.match(load('src/app/api/chat/token/route.ts'),/STREAM_CLIENT_TOKENS_ENABLED/);
 // The former GET /api/chat?token=1 path was removed; only the CSRF-protected POST endpoint issues client tokens.
 assert.doesNotMatch(load('src/app/api/chat/route.ts'),/nextUrl\.searchParams\.get\('token'\)/);
 assert.match(load('src/app/api/chat/token/route.ts'),/guard\(request,\{write:true/);
 const guard=load('src/lib/server/guard.ts');
 assert.match(guard,/sameOrigin\(request\)/);
 assert.match(guard,/session\(request\)/);
});
test('account purge waits thirty days and requires explicit flags',()=>{
 const cron=load('src/app/api/cron/cleanup/route.ts');
 assert.match(cron,/CRON_DELETE_ENABLED/);
 assert.match(cron,/CRON_PURGE_ACCOUNTS_ENABLED/);
 assert.match(load('src/lib/server/purge-account.ts'),/deletionDue/);
});
