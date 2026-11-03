const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync(__dirname + '/../src/' + name, 'utf8');
const app = read('app.js');
const ctx = vm.createContext({ console, Date });
vm.runInContext(read('content.js') + '\n' + read('checkin-content.js') + '\n' + read('checkin.js') + `
const S = {daily:newDaily(), phq:null, history:[], stack:[], seeds:20, checkedIn:false, mood:null, checkinSafety:false, dMedNote:'',dLine:''};
const world=null; const render=()=>{}; const talkTo=()=>{}; const toast=()=>{};
const t=k=>k; const earn=n=>(S.seeds+=n,n); const go=screen=>S.screen=screen;
` + app.split('/* ---------- activity dates and streaks ---------- */')[1].split('/* ---------- activity presentation ---------- */')[0],ctx);
const run = code => vm.runInContext(code,ctx);
assert.equal(run('S.phq=newPhq(9); phqScore()'), null);
for(let total=0;total<=27;total++) {
  assert.equal(run(`S.phq=newPhq(9); S.phq.ans=Array.from({length:9},(_,i)=>Math.min(3,Math.max(0,${total}-i*3))); phqScore()`),total);
  assert.equal(run(`PHQ9_BANDS.filter(b=>${total}>=b.min && ${total}<=b.max).length`),1);
}
for(const bad of ['null','undefined','4','-1','1.5','"2"']) assert.equal(run(`S.phq.ans[0]=${bad};phqScore()`),null);
assert.equal(run('S.phq=newPhq(2); S.phq.ans[0]=1;phqScore()'),null);
assert.equal(run('S.phq.ans[1]=2;phqScore()'),3);
run('CHECKIN_ACTIONS.phqContinue()');
assert.equal(run('S.phq.i'),2);
assert.equal(run('S.phq.ans[0]+S.phq.ans[1]'),3);
assert.equal(run('phqScore()'),null);
run('S.phq.i=8;CHECKIN_ACTIONS.phqPick("1")');
assert.equal(run('S.phq.i'),'safety');
assert.equal(run('S.phqSafety'),true);
run('CHECKIN_ACTIONS.phqStart("2")');
assert.equal(run('phqFlag()'),true);
run('S.checkinSafety=false;S.daily=newDaily();S.daily.step=2;CHECKIN_ACTIONS.dailyPick("unsure")');
assert.equal(run('S.daily.step'),'safety');
run('S.daily=newDaily(); dailyFinish()');
assert.equal(run('S.history.length'),0);
run('Object.assign(S.daily,D_SAMPLES[0].a); dailyFinish(); dailyFinish()');
assert.equal(run('S.history.length'),1);
assert.equal(run('S.seeds'),25);
run('S.phq=newPhq(2);phqFinish()');
assert.notEqual(run('S.screen'),'phqResult');
for (const topic of ['sleep','stress','mood','family','kids','partner','work','health']) {
  assert.equal(run(`S.daily.topics=['${topic}'];dailyResources().every(r=>r && r.steps.length)`),true);
}
assert.equal(run('RESOURCES.map(r=>r.id).join(",")'),'notice,gratitude,work,family,listen,future');
console.log('Check-in: incomplete answers, all PHQ-9 totals, carry-over, immediate/sticky safety, daily reward deduplication, and real resource routes passed.');
