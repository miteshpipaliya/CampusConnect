import test from 'node:test';
import assert from 'node:assert/strict';
import {checkStudentEmail,relationshipStatuses} from '../src/lib/student-email.ts';
test('institutional examples follow proposed convention',()=>{
 for(const [email,branch] of [['26cp309@bvmengineering.ac.in','Computer'],['25el309@bvmengineering.ac.in','Electrical'],['24ec309@bvmengineering.ac.in','Electronics & Communication']]){
  assert.equal(checkStudentEmail(email,branch).ok,true,email);
 }
});
test('rejects personal domains and malformed emails',()=>{
 for(const email of ['26cp309@gmail.com','26cp309@bvmengineering.ac.in.evil.com','cp309@bvmengineering.ac.in','26cp@bvmengineering.ac.in']){
  assert.equal(checkStudentEmail(email,'Computer').ok,false,email);
 }
});
test('rejects mismatched branch, unknown code and invalid year',()=>{
 assert.equal(checkStudentEmail('26el309@bvmengineering.ac.in','Computer').ok,false);
 assert.equal(checkStudentEmail('26zz309@bvmengineering.ac.in','Computer').ok,false);
 assert.equal(checkStudentEmail('99cp309@bvmengineering.ac.in','Computer').ok,false);
});
test('relationship status has five options',()=>assert.deepEqual(relationshipStatuses,['Single','In Relationship','Engaged','Married','Situationship']));
