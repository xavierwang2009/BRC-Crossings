/* Quiet, locally synthesized ambient music; starts only from a user gesture. */
let backgroundMusic = null, musicVolume = 40, musicChoice = "piano";
function musicControls() {
  return `<div class="music-controls"><button type="button" data-a="music" aria-pressed="${!!backgroundMusic}" title="${t('music_note')}">${icon('wind')}<span>${t(backgroundMusic ? 'music_pause' : 'music_play')}</span></button><select id="music-choice" aria-label="${t('music_choice')}">${['piano','ambient'].map(kind=>`<option value="${kind}" ${musicChoice === kind ? 'selected' : ''}>${t('music_'+kind)}</option>`).join('')}</select>${backgroundMusic ? `<label for="music-volume">${t('care_volume')}</label><input id="music-volume" type="range" min="0" max="100" value="${musicVolume}" aria-label="${t('music_volume')}">` : ''}</div>`;
}
function stopBackgroundMusic() {
  if (!backgroundMusic) return;
  const {ctx,timer} = backgroundMusic;
  backgroundMusic = null; clearInterval(timer); ctx.close().catch(() => {});
}
async function chooseBackgroundMusic(kind) {
  if (!['piano','ambient'].includes(kind) || kind === musicChoice) return;
  const playing = !!backgroundMusic;
  stopBackgroundMusic(); musicChoice = kind;
  if (playing) await toggleBackgroundMusic(); else render();
}
async function toggleBackgroundMusic() {
  if (backgroundMusic) { stopBackgroundMusic(); render(); return; }
  stopCareAudio();
  let ctx;
  try {
    ctx = new AudioContext();
    const master = ctx.createGain(); master.gain.value = musicVolume / 100 * .5; master.connect(ctx.destination);
    const piano = musicChoice === 'piano';
    const session = {ctx,master,timer:null}; backgroundMusic = session;
    await ctx.resume();
    if (backgroundMusic !== session) return;
    const melody = [261.63,329.63,392,440,392,329.63,293.66,329.63];
    const chords = [[130.81,196,246.94],[110,164.81,220],[174.61,220,261.63],[130.81,196,293.66]];
    const pianoChords = [[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]];
    const pianoMelody = [[76,74,72,null,71,72,67,null],[72,71,69,null,67,69,64,null],[69,67,65,null,64,65,60,null],[67,69,71,null,74,71,67,null]];
    // A quiet stereo-free echo adds space without masking the melody.
    let echo;
    if (piano) {
      const delay = ctx.createDelay(1), wet = ctx.createGain();
      delay.delayTime.value = .28; wet.gain.value = .18;
      delay.connect(wet).connect(master); echo = delay;
    }
    function pianoNote(midi, at, level) {
      const hz = 440 * Math.pow(2,(midi-69)/12);
      [1,.24,.09,.025].forEach((weight,i)=>{
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = hz * (i+1); osc.type = 'sine';
        gain.gain.setValueAtTime(0,at);
        gain.gain.linearRampToValueAtTime(level*weight,at+.012);
        gain.gain.exponentialRampToValueAtTime(Math.max(.0001,level*weight*.32),at+.35);
        const end = at + 3.8/(1+i*.45);
        gain.gain.exponentialRampToValueAtTime(.0001,end);
        osc.connect(gain); gain.connect(master); gain.connect(echo);
        osc.start(at); osc.stop(end+.05);
        osc.onended=()=>{osc.disconnect();gain.disconnect();};
      });
    }
    let beat = 0, next = ctx.currentTime + .08;
    function note(hz, at, duration, level) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = hz;
      gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(level,at+.8);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain).connect(master); osc.start(at); osc.stop(at+duration+.05);
      osc.onended = () => {osc.disconnect();gain.disconnect();};
    }
    function schedule() {
      while (next < ctx.currentTime + .5) {
        if (piano) {
          const bar = Math.floor(beat/8)%4, step = beat%8, melodyNote = pianoMelody[bar][step];
          if (melodyNote !== null) pianoNote(melodyNote,next,.17);
          if (step%2 === 0) pianoNote(pianoChords[bar][step/2],next+.04,.1);
        } else {
          note(melody[beat % melody.length],next,3.8,.22);
          if (beat % 4 === 0) chords[Math.floor(beat/4)%chords.length].forEach(hz=>note(hz,next,9,.07));
        }
        next += piano ? .9 : 2.4; beat++;
      }
    }
    schedule(); session.timer = setInterval(schedule,250); render();
  } catch {
    if (backgroundMusic?.ctx === ctx) stopBackgroundMusic();
    toast(t('care_audio_error')); render();
  }
}
document.addEventListener('visibilitychange',()=>{if(document.hidden && backgroundMusic){stopBackgroundMusic();render();}});
window.addEventListener('pagehide',stopBackgroundMusic);
