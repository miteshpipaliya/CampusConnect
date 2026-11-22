import test from 'node:test';
import assert from 'node:assert/strict';
import {isReservedHandle} from '../src/lib/core/phase2-rules.ts';
test('reserved handles cannot be claimed regardless of case',()=>{for(const handle of ['admin','Support','CampusConnect','MODERATOR'])assert.equal(isReservedHandle(handle),true);assert.equal(isReservedHandle('student_123'),false)});
