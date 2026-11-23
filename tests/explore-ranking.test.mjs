import test from 'node:test';import assert from 'node:assert/strict';
import {exploreScore} from '../src/lib/core/explore-ranking.ts';
test('ranking favors engagement and decays by recency',()=>{const now=1e10,base={likes:2,comments:1,createdAt:now};assert.ok(exploreScore({...base,likes:10},now)>exploreScore(base,now));assert.ok(exploreScore(base,now)>exploreScore(base,now+864000000))})