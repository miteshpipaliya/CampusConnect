import test from 'node:test';
import assert from 'node:assert/strict';
import { toMillis } from '../src/lib/core/time.ts';

test('Firestore timestamp objects and dates', () => {
  assert.equal(toMillis({ toMillis: () => 1234 }), 1234);
  assert.equal(toMillis({ seconds: 2, nanoseconds: 500_000_000 }), 2500);
  assert.equal(toMillis(new Date('2024-01-01T00:00:00Z')), 1704067200000);
  assert.equal(toMillis('2024-01-01T00:00:00Z'), 1704067200000);
});
test('invalid timestamps never produce a valid millisecond value', () => {
  for (const value of [null, undefined, {}, '', 'invalid', Infinity, new Date(NaN), {seconds:1,nanoseconds:-1}, {toMillis:()=>Infinity}, {toMillis:()=>{throw Error('bad')}}]) {
    assert.ok(Number.isNaN(toMillis(value)));
  }
});
