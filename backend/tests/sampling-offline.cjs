const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('convex/sampling.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {selectQuestions}=m.exports;
const qs=['easy','medium','hard'].flatMap((difficulty,d)=>Array.from({length:d===2?20:15},(_,i)=>({id:`${difficulty}-${i}`,difficulty})));
const original=JSON.stringify(qs),seen=new Set();
for(let seed=1;seed<=1000;seed++) {let state=seed;const rand=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);const sample=selectQuestions(qs,10,'stratified-334',rand);assert.equal(new Set(sample.map(q=>q.id)).size,10);assert.deepEqual(['easy','medium','hard'].map(d=>sample.filter(q=>q.difficulty===d).length),[3,3,4]);sample.forEach(q=>seen.add(q.id));}
assert.equal(seen.size,50);assert.equal(JSON.stringify(qs),original);assert.throws(()=>selectQuestions(qs,9,'stratified-334'));assert.throws(()=>selectQuestions(qs.filter(q=>q.difficulty!=='hard'),10,'stratified-334'));assert.throws(()=>selectQuestions(qs,51));assert.equal(selectQuestions(qs,7).length,7);
console.log('PASS: 1000 seeded stratified draws, exact 3:3:4, no repeats, all questions reachable, immutable input, invalid pools, legacy sampling');
