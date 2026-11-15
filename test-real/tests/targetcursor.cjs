const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../src/targetcursor.js', 'utf8');
// Normal preview must not touch the DOM or install listeners.
vm.runInNewContext(source, { location: { search: '' }, URLSearchParams });
for (const [fine, reduced] of [[false,false],[true,true],[false,true]]) {
  const events = {};
  const media = query => ({ matches: query.includes('reduced') ? reduced : fine, addEventListener() {} });
  vm.runInNewContext(source, {
    location: { search: '?cursor=target' }, URLSearchParams,
    matchMedia: media, window: { addEventListener: (key, fn) => events[key] = fn },
    document: { createElement() { throw Error('Cursor must stay off'); } }
  });
  events.pageshow(); events.pagehide();
}
const helpers = source.slice(source.indexOf('const CORNER_ANGLES'),source.indexOf('  const fine ='));
const ctx = vm.createContext({});
vm.runInContext(helpers + `
const state = {x:0,v:0};
for(let i=0;i<180;i++) spring(state,100,529,46,1/60);
if(Math.abs(state.x-100)>0.01 || !Number.isFinite(state.v)) throw Error('Spring did not settle');
`,ctx);
console.log('TargetCursor: opt-in gate, touch/reduced-motion fallback, lifecycle, and spring convergence passed.');
