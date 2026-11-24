import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Stream identity does not carry an R2 media bearer URL',()=>{const s=source('src/lib/server/stream-user.ts');assert.doesNotMatch(s,/presignGet|user\.image\s*=/);assert.match(s,/image:'',invisible:/);assert.doesNotMatch(s,/detail\?\.message/)});
test('Stream token opt-in, authenticated guard and server-only signing are preserved',()=>{const s=source('src/app/api/chat/token/route.ts');assert.match(s,/STREAM_CLIENT_TOKENS_ENABLED!=='true'/);assert.match(s,/await guard\(request/);assert.match(s,/createHmac\('sha256',secret\)/);assert.doesNotMatch(s,/error\.message/)});
