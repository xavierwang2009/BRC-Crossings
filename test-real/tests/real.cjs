const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync(__dirname + '/../' + name, 'utf8');
const app = read('src/app.js'), checkin = read('src/checkin.js'), page = read('index.html');
const ctx = vm.createContext({ console });
vm.runInContext(read('src/content.js') + '\n' + read('src/checkin-content.js') + '\nvar OUT = { LIVE, POSTS, COUNSELORS, MEMBERS, CIRCLES, D_SAMPLES, PHQ_SAMPLES, I18N, RESOURCES, CRISIS_LINES };', ctx);
const { LIVE, POSTS, COUNSELORS, MEMBERS, CIRCLES, D_SAMPLES, PHQ_SAMPLES, I18N, RESOURCES, CRISIS_LINES } = ctx.OUT;

// No invented people, posts, counts or answers ship in the real app.
assert.equal(POSTS.length, 0, 'No sample posts');
assert.equal(COUNSELORS.length, 0, 'No fictional Counselors');
assert.equal(MEMBERS.length, 0, 'No sample Members');
assert.equal(D_SAMPLES.length + PHQ_SAMPLES.length, 0, 'No sample check-in answers');
assert.ok(CIRCLES.every(c => !('members' in c)), 'No made-up member counts');
for (const name of ['Lily', 'Kevin W', 'Ana M.', 'Jenny H', 'Mei Lin', 'Daniel Ross', 'Grace Chen', 'Sam Patel', '張麗麗', '张丽丽'])
  assert.ok(!page.includes(name), `"${name}" is not in the page`);
assert.ok(!page.includes('9:41'), 'No fake phone status bar');
assert.ok(!/<aside class="notes"/.test(page), 'No prototype notes beside the app');
assert.match(page, /<title>BRC Crossings 同渡<\/title>/);

// What needs a server and real people is off, and nothing leads into it.
assert.deepEqual({ ...LIVE }, { community: false, counselors: false });
const tabs = vm.runInNewContext('const LIVE = { community: false, counselors: false };' + app.slice(app.indexOf('const TAB_ROOTS ='), app.indexOf('const liveItem')) + '; ({ TAB_ROOTS, NEEDS })');
assert.deepEqual([...tabs.TAB_ROOTS], ['home', 'learn', 'companion', 'me']);
for (const screen of ['circles', 'circle', 'compose', 'thread', 'ask', 'friends', 'friendDm']) assert.equal(tabs.NEEDS[screen], 'community', screen);
for (const screen of ['guide', 'dm']) assert.equal(tabs.NEEDS[screen], 'counselors', screen);
assert.ok(app.includes('if (NEEDS[S.screen] && !LIVE[NEEDS[S.screen]]) { S.screen = "home"; S.stack = []; }'), 'A switched-off screen falls back to Home');

// No reviewer aids: no demo mode, no links that fake a Member, no sample sign-in or counselor preview.
assert.ok(app.includes('const DEMO = false;'));
for (const gone of ['URLSearchParams', 'params.get', 'signin()', 'sampleWeek', 'friendDemo', 'counselorWorkspace', 'CW_MEMBERS', 'renderNotes', 'data-time', 'replay()'])
  assert.ok(!app.includes(gone), `${gone} is gone`);

// A real Member's data is kept, in a place of its own.
assert.ok(app.includes('const SAVE_KEY = "brc-crossings-real-v1";') && app.includes('const PERSIST = true;'));
assert.ok(read('sw.js').includes('const CACHE = "brc-crossings-real-v1";'));

// What stays is real: crisis lines, the clinic's own site, practices in three languages.
assert.equal(CRISIS_LINES['988'].call, '988'); assert.equal(CRISIS_LINES['911'].call, '911');
assert.ok(checkin.includes('const CLINIC_URL = "https://www.bridgerivercounseling.com/services";'));
assert.ok(RESOURCES.length >= 10 && RESOURCES.every(r => r.t.en && r.t.ht && r.t.hs && r.steps.length));
for (const k of ['welcome_sub', 'hero_title', 'hero_places', 'hero_places_body', 'hero_places_label', 'home_sub', 'age_body', 'agree_terms', 'name_sub', 'focus_sub', 'state_sub', 'library_note', 'help_reach_body', 'learn'])
  for (const l of ['en', 'ht', 'hs']) assert.ok(I18N[k] && I18N[k][l], `${k} in ${l}`);
for (const k of ['welcome_sub', 'home_sub', 'age_body', 'agree_terms', 'name_sub', 'focus_sub', 'state_sub', 'library_note', 'help_reach_body'])
  assert.ok(!/communit|Circle|friend|Counselor guide|test version|sample|prototype/i.test(I18N[k].en), `${k} does not promise what is switched off`);
console.log('Real build: no sample people, posts, counts or demo aids; community and Counselor screens are off and unreachable; data is kept under its own key.');
