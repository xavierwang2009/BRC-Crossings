const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/quickcursor.js','utf8');
vm.runInNewContext(code,{location:{search:''},URLSearchParams});
for(const [fine,reduced] of [[false,false],[true,true],[true,false]]){
 const events={},frames=new Map(),nodes=[];let id=0;
 const classes=new Set();
 const scope={contains:t=>t==='inside',classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}};
 const element=()=>({style:{},children:[],setAttribute(){},appendChild(n){this.children.push(n)},remove(){this.removed=true}});
 const doc={hidden:false,querySelector:()=>scope,createElement:element,body:{appendChild:n=>nodes.push(n)},documentElement:{addEventListener(){},removeEventListener(){}},addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]};
 vm.runInNewContext(code,{location:{search:'?cursor=quick'},URLSearchParams,matchMedia:q=>({matches:q.includes('reduced')?reduced:fine,addEventListener(){}}),document:doc,window:{addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:i=>frames.delete(i)});
 assert.equal(nodes.length,fine&&!reduced?1:0);
 if(!nodes.length)continue;
 assert.equal(nodes[0].children.length,20);
 events.pointermove({pointerType:'mouse',clientX:100,clientY:100,target:'inside'});
 assert.equal(classes.size,1);
 for(let n=0;n<240;n++){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(n*16.7));}
 assert.equal(frames.size,0,'Resting trail stops animation');
 assert.ok(nodes[0].children.every(n=>n.style.transform==='translate3d(90px,90px,0)'));
 events.keydown({key:'Tab'});assert.equal(classes.size,0);assert.equal(nodes[0].style.visibility,'hidden');
 events.pagehide();assert.equal(nodes[0].removed,true);
}
console.log('Quick Cursor: opt-in, fine pointer/reduced motion, trail placement, idle stop, keyboard fallback and cleanup passed.');
