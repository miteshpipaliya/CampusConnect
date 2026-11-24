import test from 'node:test';import assert from 'node:assert/strict';
import {validReportReason} from '../src/lib/core/report-rules.ts';
test('report reasons accept only documented choices',()=>{
 for(const reason of ['spam','harassment','nudity','violence','false-info','other'])assert.equal(validReportReason(reason),true);
 for(const value of ['fake','',null,{}])assert.equal(validReportReason(value),false);
});
