import test from 'node:test';
import assert from 'node:assert/strict';
import {formatLocalInstant} from '../ui/localInstantDisplay.js';
test('format local instants without mutating stored UTC timestamps',()=>{
 const value='2026-11-27T03:33:02.176Z';
 assert.deepEqual(formatLocalInstant(value,{language:'ja',timeZone:'Asia/Tokyo'}),{date:'2026/11/27',time:'12:33:02',offset:'UTC+9'});
 assert.deepEqual(formatLocalInstant(value,{language:'en',timeZone:'America/New_York'}),{date:'26 Nov 2026',time:'22:33:02',offset:'UTC-5'});
 assert.equal(value,'2026-11-27T03:33:02.176Z');
});
test('summer time, fractional offsets and unknown dates preserve semantics',()=>{
 assert.equal(formatLocalInstant('2026-07-01T12:00:00Z',{timeZone:'America/New_York'}).offset,'UTC-4');
 assert.equal(formatLocalInstant('2026-07-01T12:00:00Z',{timeZone:'Asia/Kolkata'}).offset,'UTC+5:30');
 for(const value of [null,undefined,'','不明','2026-11-27','2026-11-27T03:33:02','bad'])assert.equal(formatLocalInstant(value),null);
});
