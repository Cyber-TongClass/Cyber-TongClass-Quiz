// Actual admin handlers; synthetic roles and mocked identity service. No network.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]??require(n),m,m.exports);return m.exports;}
const v=require('convex/values').v,lib=load('convex/lib.ts');
const admin=load('convex/admin.ts',{'./_generated/server':{action:x=>x},'./_generated/api':{internal:{adminStore:new Proxy({},{get:(_,k)=>k})}},'./schema':{question:v.any()},'./lib':lib});
const original=global.fetch;let calls=0,checks=0;const ctx={runQuery:async()=>{calls++;return null},runMutation:async()=>{calls++;return null}};
async function main(){
 for(const user of [null,{_id:'u',role:'student',identityType:'undergrad'},{_id:'u',role:'admin',identityType:'graduate'},{_id:'u',role:'admin',identityType:'undergrad',status:'disabled'}]){
  global.fetch=async()=>({ok:true,json:async()=>({status:'success',value:user})});
  for(const endpoint of Object.values(admin)){await assert.rejects(()=>endpoint.handler(ctx,{mainToken:'synthetic-invalid-token'}));checks++;}
 }
 assert.equal(calls,0);
 global.fetch=async()=>({ok:false});await assert.rejects(()=>admin.catalog.handler(ctx,{mainToken:'fake'}));checks++;
 const hash=await lib.hash('synthetic-token');let user={_id:'s',version:1,status:'active'},session={student:'s',version:1,expires:Date.now()+60000};
 const db={get:async()=>user,query:()=>({withIndex:(_,fn)=>{let supplied;fn({eq:(_,v)=>{supplied=v}});return {unique:async()=>supplied===hash?session:null}}})};
 assert.equal((await lib.student({db},'synthetic-token'))._id,'s');checks++;
 await assert.rejects(()=>lib.student({db},'wrong'));checks++;
 session.expires=0;await assert.rejects(()=>lib.student({db},'synthetic-token'));checks++;session.expires=Date.now()+60000;
 user.version=2;await assert.rejects(()=>lib.student({db},'synthetic-token'));checks++;user.version=1;
 user.status='disabled';await assert.rejects(()=>lib.student({db},'synthetic-token'));checks++;
 console.log(`PASS: ${checks} admin authorization and session validity checks; no unauthorized store calls`);
}
main().finally(()=>{global.fetch=original}).catch(e=>{console.error(e);process.exitCode=1});
