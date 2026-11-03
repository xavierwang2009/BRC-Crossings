const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const events={},timers=new Set(),contexts=[];
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({gain:param(),frequency:param(),delayTime:param(),connect(){return this},disconnect(){},start(){},stop(){}});
class AudioContext {constructor(){this.currentTime=0;this.destination={};this.notes=0;contexts.push(this)}createGain(){return node()}createDelay(){return node()}createOscillator(){this.notes++;return node()}resume(){return Promise.resolve()}close(){this.closed=true;return Promise.resolve()}}
const ctx=vm.createContext({AudioContext,document:{hidden:false,addEventListener:(k,fn)=>events[k]=fn},window:{addEventListener:(k,fn)=>events[k]=fn},setInterval:fn=>{timers.add(fn);return fn},clearInterval:fn=>timers.delete(fn),stopCareAudio(){},render(){},toast(){},t:k=>k});
vm.runInContext(fs.readFileSync('src/music.js','utf8'),ctx);
(async()=>{
 assert.equal(contexts.length,0,'No autoplay');
 await ctx.toggleBackgroundMusic(); assert.equal(contexts.length,1);assert.equal(contexts[0].notes,8);assert.equal(timers.size,1);
 await ctx.toggleBackgroundMusic();assert.equal(contexts[0].closed,true);assert.equal(timers.size,0);
 await ctx.toggleBackgroundMusic();ctx.document.hidden=true;events.visibilitychange();assert.equal(contexts[1].closed,true);assert.equal(timers.size,0);
 ctx.document.hidden=false; await ctx.chooseBackgroundMusic('ambient'); assert.equal(contexts.length,2,'Changing a paused choice does not autoplay'); await ctx.toggleBackgroundMusic();assert.equal(contexts[2].notes,4);await ctx.chooseBackgroundMusic('piano');assert.equal(contexts[2].closed,true);assert.equal(contexts[3].notes,8);assert.equal(timers.size,1);ctx.stopBackgroundMusic();
 console.log('Music: no autoplay, scheduled melody, pause and hidden-tab cleanup passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
