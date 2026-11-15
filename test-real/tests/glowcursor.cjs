const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../src/glowcursor.js', 'utf8');
vm.runInNewContext(source, {location:{search:''},URLSearchParams});
for (const [fine,reduced] of [[false,false],[true,true],[false,true],[true,false]]) {
  let added=0, removed=0;
  const events={};
  const canvas={setAttribute(){},getContext(){return null;},remove(){removed++;}};
  vm.runInNewContext(source,{
    location:{search:'?cursor=glow'},URLSearchParams,
    matchMedia:q=>({matches:q.includes('reduced')?reduced:fine,addEventListener(){}}),
    window:{addEventListener:(key,fn)=>events[key]=fn},
    document:{querySelector(){return {};},createElement(){return canvas;},body:{appendChild(){added++;}}}
  });
  assert.equal(added,fine&&!reduced?1:0);
  assert.equal(removed,added,'Unavailable WebGL must remove its overlay');
  events.pagehide();
}
console.log('GlowCursor: opt-in, touch/reduced-motion gates, and unavailable-WebGL fallback passed.');
