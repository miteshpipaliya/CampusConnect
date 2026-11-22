import test from 'node:test';
import assert from 'node:assert/strict';
import {checkStudentEmail,isAllowedEmail,relationshipStatuses,relationshipVisibilities} from '../src/lib/student-email.ts';

test('BVM pattern and provisional branch mapping can be evaluated without claiming official enrollment',()=>{
 for(const [email,branch] of [['26cp309@bvmengineering.ac.in','Computer Engineering'],['25el309@bvmengineering.ac.in','Electrical Engineering'],['24ec309@bvmengineering.ac.in','Electronics & Communication Engineering']]){
  assert.equal(checkStudentEmail(email,branch).ok,true,email);
 }
});
test('student email validation rejects mismatched branch, unknown code and malformed domains',()=>{
 for(const [email,branch] of [['26el309@bvmengineering.ac.in','Computer Engineering'],['26zz309@bvmengineering.ac.in','Computer Engineering'],['99cp309@bvmengineering.ac.in','Computer Engineering'],['26cp309@gmail.com','Computer Engineering'],['26cp309@bvmengineering.ac.in.evil.com','Computer Engineering']]){
  assert.equal(checkStudentEmail(email,branch).ok,false,email);
 }
});
test('approved testers remain permitted without weakening public-domain restrictions',()=>{
 assert.equal(isAllowedEmail('test@example.com'),false);
 assert.equal(isAllowedEmail('test@example.com','test@example.com'),true);
 assert.equal(isAllowedEmail('test@example.com','other@example.com'),false);
});
test('relationship onboarding choices remain available',()=>{
 assert.deepEqual(relationshipStatuses,['Single','In Relationship','Engaged','Married','Situationship']);
 assert.deepEqual(relationshipVisibilities,['campus','followers','me']);
});
