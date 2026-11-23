import test from 'node:test';import assert from 'node:assert/strict';
import {collectionCounts} from '../src/lib/core/save-collections.ts';
test('saved collections count only named folders',()=>{
 assert.deepEqual(collectionCounts(['Travel','Travel','Study','', ' Study ']),[{name:'Study',count:2},{name:'Travel',count:2}]);
});
