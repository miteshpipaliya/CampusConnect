import test from 'node:test';import assert from 'node:assert/strict';
import {mayModerate} from '../src/lib/core/admin-action-rules.ts';
test('admin operations restrict disabled accounts to user reports',()=>{
 assert.equal(mayModerate('disable-account','user'),true);
 assert.equal(mayModerate('disable-account','post'),false);
 assert.equal(mayModerate('remove-content','comment'),true);
 assert.equal(mayModerate('dismiss','story'),true);
});
