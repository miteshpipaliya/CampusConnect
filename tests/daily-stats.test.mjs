import test from 'node:test';import assert from 'node:assert/strict';
import {dayDocId,zeroFilledSeries,utcDay} from '../src/lib/core/daily-stats.ts';
test('UTC day keys are stable across months',()=>{
 assert.equal(dayDocId('abc',utcDay(Date.UTC(2026,0,1))),'abc_20260101');
 const series=zeroFilledSeries(7,Date.UTC(2026,0,2),{'2026-01-01':{views:3}});
 assert.equal(series.length,7);
 assert.equal(series.at(-2).views,3);
 assert.equal(series.at(-1).views,0);
});
