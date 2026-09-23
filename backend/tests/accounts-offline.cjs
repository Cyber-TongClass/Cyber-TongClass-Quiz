// Actual handlers with an isolated in-memory database. No live data or network.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]??require(n),m,m.exports);return m.exports;}
const lib=load('convex/lib.ts'),passwords=load('convex/passwords.ts');
const defs={action:x=>x,internalQuery:x=>x,internalMutation:x=>x};
const store=load('convex/authStore.ts',{'./lib':lib,'./_generated/server':defs});
const internal={authStore:Object.fromEntries(Object.keys(store).map(k=>[k,k]))};
const auth=load('convex/auth.ts',{'./passwords':passwords,'./_generated/server':defs,'./_generated/api':{internal}});
const roster=load('convex/localRoster.ts',{'./_generated/server':defs});
const rows=new Map();let seq=0,count=0;const copy=x=>x==null?null:structuredClone(x);
const db={get:async id=>copy(rows.get(id)),delete:async id=>rows.delete(id),patch:async(id,p)=>{if(!rows.has(id))throw Error('Missing');rows.set(id,{...rows.get(id),...copy(p)})},insert:async(table,data)=>{const id=table+ ++seq;rows.set(id,{_id:id,_table:table,...copy(data)});return id;},query:table=>{const filters=[],q={eq:(k,v)=>{filters.push([k,v]);return q;}};const results=()=>[...rows.values()].filter(x=>x._table===table&&filters.every(([k,v])=>x[k]===v));const chain={withIndex:(_,fn)=>{fn(q);return chain;},unique:async()=>copy(results()[0]),collect:async()=>copy(results())};return chain;}};
const ctx={db},actions={runQuery:(name,a)=>store[name].handler(ctx,a),runMutation:(name,a)=>store[name].handler(ctx,a)};
const call=(name,a)=>auth[name].handler(actions,a),eq=(a,b)=>{assert.deepEqual(a,b);count++},reject=async f=>{await assert.rejects(f);count++};
async function main(){
 const password=await passwords.hashPassword('Initial123!');const id=await db.insert('students',{studentId:'LOCAL',name:'Local',status:'active',version:0,password});
 const old=await call('login',{studentId:'LOCAL',password:'Initial123!'});const other=await call('login',{studentId:'LOCAL',password:'Initial123!'});
 await reject(()=>call('changePassword',{token:old.token,currentPassword:'Initial123!',newPassword:'1234567'}));
 await reject(()=>call('changePassword',{token:old.token,currentPassword:'wrong',newPassword:'12345678'}));eq((await db.get(id)).version,0);
 const result=await call('changePassword',{token:old.token,currentPassword:'Initial123!',newPassword:'12345678'});
 eq((await db.get(id)).version,1);eq((await passwords.verifyPassword('12345678',(await db.get(id)).password)),true);eq((await db.get(id)).password!==password,true);
 eq((await lib.student(ctx,result.token))._id,id);await reject(()=>lib.student(ctx,old.token));await reject(()=>lib.student(ctx,other.token));await reject(()=>call('login',{studentId:'LOCAL',password:'Initial123!'}));eq(typeof(await call('login',{studentId:'LOCAL',password:'12345678'})).token,'string');
 await reject(()=>call('changePassword',{token:old.token,currentPassword:'12345678',newPassword:'Abcd1234'}));
 await reject(()=>store.changePassword.handler(ctx,{token:result.token,version:0,expectedPassword:password,password,hash:'bad'}));
 const realCourse=await db.insert('courses',{slug:'tong-2026',title:'Real',published:false});
 const row={studentId:'2026000001',name:'Roster student',password};const args={batch:'roster-20260924',course:realCourse,rows:[row]};
 eq(await roster.provision.handler(ctx,args),{created:1,existing:0});eq(await roster.provision.handler(ctx,args),{created:0,existing:1});
 const enrolled=await db.query('students').withIndex('studentId',q=>q.eq('studentId',row.studentId)).unique();await db.patch(enrolled._id,{password:'student-changed-password'});
 eq(await roster.provision.handler(ctx,args),{created:0,existing:1});eq((await db.get(enrolled._id)).password,'student-changed-password');
 await reject(()=>roster.provision.handler(ctx,{...args,rows:[{...row,studentId:'LOCAL'}]}));
 await reject(()=>roster.provision.handler(ctx,{...args,rows:[{...row,password:'plaintext'}]}));
 const keep=await db.insert('students',{studentId:'T1790178749366',name:'Internal',status:'active',version:0});
 const keepCourse=await db.insert('courses',{slug:'test-1790178749366',title:'Internal'});
 const discard=await db.insert('students',{studentId:'EDIT1790178749000',name:'Test',status:'active',version:0});
 const c=await db.insert('courses',{slug:'edit-test-1790178749000',title:'Test'});
 const b=await db.insert('banks',{key:'1790178749000old'});const l=await db.insert('lectures',{course:c,bank:b});const q=await db.insert('questions',{bank:b});
 await db.insert('attempts',{student:discard,course:c,questions:[q]});await db.insert('progress',{student:discard,course:c});await db.insert('sessions',{student:discard});await db.insert('enrollments',{student:discard,course:c});
 const kb=await db.insert('banks',{key:'test-1790178749366'});await db.insert('lectures',{course:keepCourse,bank:kb});await db.insert('questions',{bank:kb});
 const preview=await roster.cleanup.handler(ctx,{execute:false});eq(preview.students,1);eq(preview.courses,1);eq(preview.questions,1);eq(!!await db.get(discard),true);
 const protectedEnrollment=await db.insert('enrollments',{student:enrolled._id,course:c});await reject(()=>roster.cleanup.handler(ctx,{execute:true}));await db.delete(protectedEnrollment);
 await roster.cleanup.handler(ctx,{execute:true});eq(await db.get(discard),null);eq(await db.get(c),null);eq(await db.get(l),null);eq(await db.get(b),null);eq(!!await db.get(keep),true);eq(!!await db.get(keepCourse),true);eq(!!await db.get(realCourse),true);eq(!!await db.get(enrolled._id),true);
 const repeated=await roster.cleanup.handler(ctx,{execute:false});for(const k of ['students','courses','banks','questions','attempts','enrollments','progress','sessions'])eq(repeated[k],0);
 console.log(`PASS: ${count} password-change/session, idempotent provisioning, and scoped-cleanup assertions (mock database)`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
