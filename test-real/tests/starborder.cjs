const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const events = () => ({listeners: new Map(), addEventListener(k,fn) { this.listeners.set(k,fn); }, removeEventListener(k) { this.listeners.delete(k); }});
const document = {...events(), hidden:false};
const motion = {...events(), matches:false};
const frames = new Map();
let id=0, time=0, strokes=0, disconnected=0;
const context = new Proxy({createRadialGradient:()=>({addColorStop(){}}), stroke(){strokes++;}}, {get:(o,k)=>o[k] || (()=>{})});
const canvas = {getContext:()=>context};
document.createElement = () => ({getContext:()=>({fillStyle:'#000000'})});
const root = {...events(), querySelector:()=>canvas, classList:{contains:()=>false}, offsetWidth:300, offsetHeight:48, matches:()=>true};
class Observer { observe(){} disconnect(){disconnected++;} }
const sandbox = {window:{matchMedia:()=>motion, devicePixelRatio:1}, document, performance:{now:()=>time}, ResizeObserver:Observer, IntersectionObserver:Observer, requestAnimationFrame:fn=>{frames.set(++id,fn);return id;}, cancelAnimationFrame:id=>frames.delete(id)};
vm.runInNewContext(fs.readFileSync('src/starborder.js','utf8'),sandbox);
const border=sandbox.window.BRCStarBorder(root);
function tick(n){for(let i=0;i<n;i++){time+=16;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}}
tick(120); assert(strokes>0); assert(frames.size>0,'animation should run');
border.setPaused(true);tick(300);assert.equal(frames.size,0,'pause must settle');
border.setPaused(false);tick(5);assert(frames.size>0);
document.hidden=true;document.listeners.get('visibilitychange')();assert.equal(frames.size,0);
document.hidden=false;document.listeners.get('visibilitychange')();tick(5);assert(frames.size>0);
motion.matches=true;motion.listeners.get('change')();tick(300);assert.equal(frames.size,0,'reduced motion must settle');
root.listeners.get('focus')();tick(300);assert.equal(frames.size,0,'keyboard focus must respect reduced motion');
border.destroy();assert.equal(frames.size,0);assert.equal(root.listeners.size,0);assert.equal(document.listeners.size,0);assert.equal(motion.listeners.size,0);assert.equal(disconnected,2);
console.log('StarBorder drawing, pause, visibility, reduced motion, focus and cleanup passed.');
