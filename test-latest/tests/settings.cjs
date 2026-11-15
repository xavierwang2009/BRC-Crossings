const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync(__dirname + '/../src/' + name, 'utf8');
const app = read('app.js');
const part = (from, to) => app.slice(app.indexOf(from), app.indexOf(to));
const ctx = vm.createContext({ console });
vm.runInContext(read('content.js') + '\n' + read('checkin-content.js') + `
const S = {scene:'riverbank', sceneAll:true, member:true, screen:'home'};
const sceneNow = () => SCENES.find(s => s.id === S.scene && s.photo) || null;
` + part('const rgbOf =', 'let backdropFor'), ctx);
const run = code => vm.runInContext(code, ctx);

// Every place has what the page and the Companion need to sit in it.
const scenes = run('JSON.parse(JSON.stringify(SCENES))');
assert.equal(new Set(scenes.map(s => s.id)).size, scenes.length, 'Scene ids are unique');
assert.equal(scenes[0].id, 'riverbank');
for (const s of scenes) {
  for (const l of ['en', 'ht', 'hs']) assert.ok(s[l], `${s.id} is named in ${l}`);
  if (!s.photo) continue;
  assert.match(s.photo, /^\d{10,}-[0-9a-f]{12}$/, `${s.id} photo id`);
  assert.match(s.tint, /^#[0-9a-f]{6}$/, `${s.id} has a page colour`);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(s.tint.slice(i, i + 2), 16));
  assert.ok(Math.min(r, g, b) >= 208, `${s.id} page colour is light enough for dark text`);
  assert.ok(s.credit && s.light && s.size > 0 && s.at.length === 2 && s.at.every(n => n > 0 && n < 1), `${s.id} is complete`);
}
assert.ok(scenes.filter(s => s.people).length >= 5, 'Several places have people around');
assert.ok(scenes.filter(s => s.photo && !s.people).length >= 8, 'Quiet places remain the larger set');

// The place shows behind every page only for a signed-in Member who has it switched on.
assert.equal(run('backdropOn()'), false, 'The live riverbank keeps the plain pages');
assert.equal(run('S.scene="street"; backdropOn()'), true);
assert.equal(run('S.sceneAll=false; backdropOn()'), false, 'Switched off: Companion page only');
assert.equal(run('S.sceneAll=true; S.member=false; backdropOn()'), false, 'Not on the public welcome page');
assert.equal(run('S.member=true; S.screen="onboard"; backdropOn()'), false);
assert.equal(run('S.screen="counselor"; backdropOn()'), false);
assert.equal(run('S.screen="me"; backdropOn()'), true);
assert.equal(run('rgbOf("#f5ebdf")'), '245,235,223');

// The choices are kept, and Settings is worded in all three languages.
const saved = app.slice(app.indexOf('const SAVED ='), app.indexOf('const PERSIST'));
for (const k of ['scene', 'sceneAll', 'sceneFx', 'musicOn', 'musicKind', 'musicVol']) assert.ok(saved.includes(`"${k}"`), `${k} is saved`);
for (const k of ['settings', 'settings_sub', 'bg_title', 'bg_sub', 'bg_quiet', 'bg_people', 'bg_people_sub', 'bg_everywhere', 'bg_everywhere_sub', 'fx_on', 'fx_sub', 'sound_title', 'music_on', 'music_on_sub', 'music_choice', 'music_note', 'app_tour_settings', 'app_tour_settings_body', 'on', 'off'])
  for (const l of ['en', 'ht', 'hs']) assert.ok(run(`I18N.${k} && I18N.${k}.${l}`), `${k} in ${l}`);
assert.ok(!app.includes('musicControls() + view()'), 'Music is in Settings, not a bar on every page');
assert.match(app, /musicOn: false/, 'Music stays off until the Member turns it on');
console.log('Settings: scene data, page colours, where the background shows, saved choices and wording passed.');
