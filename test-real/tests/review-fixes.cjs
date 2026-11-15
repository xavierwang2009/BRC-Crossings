const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync(__dirname + '/../src/' + name, 'utf8');
const app = read('app.js');
const part = (from, to) => app.slice(app.indexOf(from), app.indexOf(to));
const ctx = vm.createContext({ console, Date });
vm.runInContext(read('content.js') + '\n' + read('checkin-content.js') + '\n' + read('checkin.js') + `
const S = {daily:newDaily(), phq:null, history:[], stack:[], seeds:20, earnedToday:0, bonusDay:{}, checkedIn:false, mood:null, checkinSafety:false, phqSafety:false, phqLast:null, dMedNote:'', dLine:'', screen:'companion', joined:[], mainFocus:'career', lang:'en', posts:[]};
const world=null; const render=()=>{}; const talkTo=node=>{S.said=node}; const toast=()=>{};
const t=k=>k; const go=screen=>S.screen=screen;
` + app.split('/* ---------- activity dates and streaks ---------- */')[1].split('/* ---------- activity presentation ---------- */')[0]
  + part('function earn(n)', 'function toast(') .split('/* ---------- saved on this device')[0]
  + part('/* Circle posts are for', 'const suggestions ='), ctx);
const run = code => vm.runInContext(code, ctx);

// One tap checks in, and the longer check-in never replaces the mood the Member picked.
run('CHECKIN_ACTIONS.quickCheckin("anxious")');
assert.equal(run('S.checkedIn'), true);
assert.equal(run('S.mood'), 'anxious');
assert.equal(run('S.seeds'), 25);
run('Object.assign(S.daily, {trend:"better",sleep:"good",safe:"no",med:"none",topics:["work"]}); dailyFinish()');
assert.equal(run('S.mood'), 'anxious', 'Answers add to the mood; they do not overwrite it');
assert.equal(run('S.history.length'), 1);
assert.equal(run('S.history[0].mood'), 'anxious');
assert.ok(run('S.history[0].sleep'), 'Sleep is kept with the day, not thrown away');
assert.equal(run('S.seeds'), 25, 'The longer check-in earns nothing extra on the same day');
run('CHECKIN_ACTIONS.quickCheckin("good")');
assert.equal(run('S.history.length'), 1);
assert.equal(run('S.history[0].mood'), 'good');
assert.equal(run('S.seeds'), 25, 'Changing the mood does not earn again');
run('CHECKIN_ACTIONS.quickCheckin("nonsense")');
assert.equal(run('S.mood'), 'good');
run('S.checkedIn=false; CHECKIN_ACTIONS.dailyOpen()');
assert.equal(run('S.screen'), 'companion', 'The longer check-in opens only after the one-tap mood');

// The two-week questionnaire is offered at most once in two weeks.
assert.equal(run('S.phqLast=null; phqDue()'), true);
assert.equal(run('S.phqLast=dayKey(); phqDue()'), false);
assert.equal(run('S.phqLast=shiftDay(dayKey(),-13); phqDue()'), false);
assert.equal(run('S.phqLast=shiftDay(dayKey(),-14); phqDue()'), true);

// Taking part earns once a day, however many posts follow.
assert.equal(run('S.earnedToday=0; earnOnce("share",5)'), 5);
assert.equal(run('earnOnce("share",5)'), 0);
assert.equal(run('earnOnce("practice",3)'), 3);

// Circles: a new Member joins the one for their focus and language; Circle posts stay inside the Circle.
assert.deepEqual(Array.from(run('suggestedCircles()')), ['c5']);
assert.deepEqual(Array.from(run('S.mainFocus="parenting"; S.lang="ht"; suggestedCircles()')), ['c2']);
assert.deepEqual(Array.from(run('S.mainFocus="family"; suggestedCircles()')), []);
assert.equal(run('S.joined=["c5"]; canSee({circle:"c1"})'), false);
assert.equal(run('canSee({circle:"c5"})'), true);
assert.equal(run('canSee({})'), true);
assert.equal(run('canSee({circle:"c1", mine:true})'), true);
assert.equal(run('canSee({hiddenForMe:true})'), false);
assert.equal(run('POSTS.every(p => !p.circle || CIRCLES.some(c => c.id === p.circle))'), true);

// Risk words: an everyday "miss you so much" is not held; the real phrases still are.
assert.equal(run('isRisky("好久不見，想死你了")'), false);
assert.equal(run('isRisky("我真的想死")'), true);
assert.equal(run('isRisky("有時候覺得活不下去")'), true);
assert.equal(run('isRisky("I recommend it")'), false);
assert.equal(run("isRisky(\"I don't want to live\")"), true);
console.log('Review fixes: one-tap check-in keeps the chosen mood, two-week questionnaire spacing, once-a-day thanks, Circle membership and risk phrases passed.');
