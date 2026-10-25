/* BRC Crossings — Companion3D: the living riverbank diorama.
   One WebGL renderer, moved between screens. Small API so it ports cleanly to React:
     const world = new CompanionWorld();
     world.attach(el, mode)     // mode: 'welcome' | 'home' | 'companion' | 'picker' | 'breathe'
     world.set({ species, mood, asleep, wear, timeOverride })
     world.celebrate(hard)      // after a check-in
     world.breathe(on)
     world.thumb(species, item) // PNG data URL of a studio render, cached
     world.on('pet' | 'stroke' | 'hug' | 'wake', fn)
     world.sky                  // { top, bottom, dark }
   Everything the diorama shows comes from real state: the clock sets the light and season,
   the check-in sets weather and pose, touch sets the Companion's reaction. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth = t => t * t * (3 - 2 * t);
/* The app's single motion grammar: about 0.4s with one gentle overshoot. */
const MOTION = 0.42;
const springOut = t => { t = clamp(t, 0, 1); const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const gloss = color => new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 });
const sph = (r, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h);
function mesh(geo, material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m;
}
/* add a child and return the child, so scale/rotation chain onto it */
const put = (parent, child) => (parent.add(child), child);

/* ---------------- sky: keyed by real clock time ---------------- */
// hour, skyTop, skyBottom, sun, sunIntensity, hemiSky, hemiGround, hemiIntensity, waterDeep, waterLight, night
const SKY_KEYS = [
  [0, '#141d3a', '#2b3765', '#b4c2ff', 0.95, '#5566a3', '#2a3a33', 1.3, '#173b52', '#2d6380', 1],
  [5.2, '#1b2550', '#46507f', '#b4c2ff', 0.95, '#5a68a6', '#2c3a31', 1.3, '#1c4560', '#33708c', 0.95],
  [6.6, '#f0a493', '#ffdfb2', '#ffbf88', 2.0, '#ffd6c2', '#5f7046', 1.05, '#2f8796', '#7cc6cf', 0.12],
  [8.5, '#74c0ee', '#cdeeff', '#fff3df', 2.7, '#d6ecff', '#73914f', 1.15, '#2a8fa3', '#86d4dc', 0],
  [16.5, '#7dc4ed', '#d6f0ff', '#ffefd4', 2.6, '#d6ecff', '#73914f', 1.1, '#2a8fa3', '#86d4dc', 0],
  [18.4, '#f2967a', '#ffd59c', '#ff9b5a', 2.0, '#ffc9a8', '#5e5b41', 1.0, '#367f99', '#9fc9cf', 0.2],
  [19.7, '#584a8c', '#e68f80', '#ff8866', 1.0, '#8c7abb', '#3a3a3a', 0.85, '#2b5579', '#5e86a8', 0.6],
  [21, '#1b2446', '#363f73', '#b4c2ff', 0.95, '#5566a3', '#2a3a33', 1.3, '#183e56', '#2e6582', 1],
  [24, '#141d3a', '#2b3765', '#b4c2ff', 0.95, '#5566a3', '#2a3a33', 1.3, '#173b52', '#2d6380', 1],
];
const KEY_COLS = [1, 2, 3, 5, 6, 8, 9];
function skyAt(hour) {
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= hour) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const t = smooth(clamp((hour - a[0]) / (b[0] - a[0]), 0, 1));
  const c = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t);
  return { top: c(1), bottom: c(2), sun: c(3), sunI: lerp(a[4], b[4], t), hemiSky: c(5), hemiGround: c(6), hemiI: lerp(a[7], b[7], t), deep: c(8), light: c(9), night: lerp(a[10], b[10], t) };
}
function seasonOf(date) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return ['#7cc46b', '#f4a7b9', '#9bd27f'];
  if (m >= 5 && m <= 7) return ['#5dae57', '#4a9a4c', '#79c267'];
  if (m >= 8 && m <= 10) return ['#e9a23b', '#d9663a', '#6dae57'];
  return ['#4f8a5b', '#6c9a74', '#a9c3a3'];
}

/* ---------------- weather: keyed by today's check-in ---------------- */
const WEATHER = {
  none: { cloud: 0.3, wind: 0.2, rain: 0, dim: 0, grey: 0 },
  great: { cloud: 0.1, wind: 0.15, rain: 0, dim: 0, grey: 0, butterflies: 1 },
  good: { cloud: 0.25, wind: 0.2, rain: 0, dim: 0, grey: 0 },
  okay: { cloud: 0.45, wind: 0.25, rain: 0, dim: 0.06, grey: 0.15 },
  low: { cloud: 0.75, wind: 0.25, rain: 0, dim: 0.2, grey: 0.45 },
  sad: { cloud: 0.9, wind: 0.2, rain: 1, dim: 0.25, grey: 0.55, leaf: 1 },
  anxious: { cloud: 0.55, wind: 0.85, rain: 0, dim: 0.1, grey: 0.2, leaves: 1 },
  frustrated: { cloud: 0.7, wind: 0.6, rain: 0, dim: 0.18, grey: 0.4 },
  tired: { cloud: 0.35, wind: 0.1, rain: 0, dim: 0.22, grey: 0.1, fireflies: 1, blanket: 1 },
};

/* ---------------- island geometry ---------------- */
const R = 3.2, GROUND = 1.02, WATER_Y = 0.84, HW = 0.6;
const riverZ = x => -0.85 + 0.28 * Math.sin(x * 0.9 + 0.4);
const PET_POS = new THREE.Vector3(-0.3, GROUND, 1.05);
const PET_SCALE = 1.3;
const BRIDGE_X = 1.2, BRIDGE_YAW = -0.7;
const BRIDGE_AXIS = [Math.sin(BRIDGE_YAW), Math.cos(BRIDGE_YAW)], BRIDGE_PERP = [Math.cos(BRIDGE_YAW), -Math.sin(BRIDGE_YAW)];
function nearBridge(x, z, pad = 0.35) {
  const dx = x - BRIDGE_X, dz = z - riverZ(BRIDGE_X);
  return Math.abs(dx * BRIDGE_AXIS[0] + dz * BRIDGE_AXIS[1]) < 1.25 + pad && Math.abs(dx * BRIDGE_PERP[0] + dz * BRIDGE_PERP[1]) < 0.32 + pad;
}

function bankShape(side) {
  const edge = x => riverZ(x) + side * HW;
  const inside = x => x * x + edge(x) ** 2 <= R * R;
  const solve = (xin, xout) => { for (let i = 0; i < 32; i++) { const m = (xin + xout) / 2; if (inside(m)) xin = m; else xout = m; } return xin; };
  const xL = solve(0, -R - 1), xR = solve(0, R + 1);
  const pts = [];
  for (let i = 0; i <= 48; i++) { const x = lerp(xL, xR, i / 48); pts.push([x, edge(x)]); }
  const a0 = Math.atan2(edge(xR), xR); let a1 = Math.atan2(edge(xL), xL);
  if (side > 0) { while (a1 < a0) a1 += TAU; } else { while (a1 > a0) a1 -= TAU; }
  for (let i = 1; i < 72; i++) { const a = lerp(a0, a1, i / 72); pts.push([R * Math.cos(a), R * Math.sin(a)]); }
  const shape = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  return { shape, xL, xR };
}
function onLand(x, z, margin = 0.22) {
  return x * x + z * z < (R - margin) ** 2 && Math.abs(z - riverZ(x)) > HW + margin;
}

const WATER_VERT = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FRAG = `
uniform float uT; uniform float uFall; uniform vec3 uDeep; uniform vec3 uLight; uniform float uNight; uniform float uWarm;
varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
void main(){
  vec2 p = uFall > .5 ? vec2(vW.x + vW.z, vW.y * 2.2 + uT * 1.6) : vec2(vW.x * 1.5 - uT * .5, vW.z * 5.0);
  float n = noise(p * vec2(1.3, 1.)) * .6 + noise(p * vec2(3.1, 1.9) + vec2(0., uT * .25)) * .4;
  vec3 col = mix(uDeep, uLight, smoothstep(.32, .9, n));
  float glint = smoothstep(.8, .88, noise(p * vec2(4., 2.6)));
  col += glint * mix(vec3(.95,.98,1.), vec3(1.,.82,.52), uNight) * mix(.5, .8, uNight);
  float streak = exp(-pow((vW.x - ${BRIDGE_X.toFixed(2)}) * 1.6, 2.)) * smoothstep(.45, .8, noise(vec2(vW.x * 9., vW.z * 3. - uT * .6)));
  col += vec3(1., .74, .38) * streak * uWarm * 1.1;
  float a = 1.;
  if (uFall > .5) { a = smoothstep(-.9, .0, vW.y - ${WATER_Y.toFixed(2)}) * .92; }
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function spriteTexture(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- Companion rigs ---------------- */
const SPECIES_SPEC = {
  otter: { headTop: 0.31, hat: 1, neck: [0, 0.8, 0.02, 0.27], height: 1.32, hold: true },
  rabbit: { headTop: 0.27, hat: 0.92, neck: [0, 0.76, 0.02, 0.26], height: 1.6 },
  turtle: { headTop: 0.22, hat: 0.72, neckOnHead: [0, -0.12, -0.06, 0.19], height: 0.95, low: true },
  bird: { headTop: 0.15, hat: 0.56, neck: [0, 1.0, 0.13, 0.12], height: 1.42 },
  fox: { headTop: 0.29, hat: 0.98, neck: [0, 0.79, 0.02, 0.27], height: 1.46 },
};

function addFace(head, o) {
  const eyeMat = gloss('#1d1918');
  const hi = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const ink = new THREE.MeshBasicMaterial({ color: '#2b211d' });
  const blushMat = new THREE.MeshBasicMaterial({ color: '#ff8f9c', transparent: true, opacity: 0, depthWrite: false });
  const face = { open: [], closed: [], happy: [], blush: [], mouths: {} };
  for (const s of [-1, 1]) {
    const e = mesh(sph(o.eyeR, 20, 16), eyeMat, s * o.eye[0], o.eye[1], o.eye[2], false);
    e.scale.set(1, 1.18, 0.62); e.rotation.y = s * 0.28;
    e.add(mesh(sph(o.eyeR * 0.34, 10, 8), hi, o.eyeR * 0.32, o.eyeR * 0.42, o.eyeR * 0.78, false));
    head.add(e); face.open.push(e);
    const arc = new THREE.TorusGeometry(o.eyeR * 0.92, o.eyeR * 0.24, 8, 20, Math.PI);
    const closed = mesh(arc, ink, s * o.eye[0], o.eye[1] - o.eyeR * 0.15, o.eye[2] + 0.005, false); closed.rotation.set(0, s * 0.28, Math.PI);
    const happy = mesh(arc, ink, s * o.eye[0], o.eye[1] - o.eyeR * 0.45, o.eye[2] + 0.005, false); happy.rotation.y = s * 0.28;
    closed.visible = happy.visible = false;
    head.add(closed, happy); face.closed.push(closed); face.happy.push(happy);
    if (o.blush) {
      const b = mesh(sph(o.blushR || 0.06, 16, 12), blushMat, s * o.blush[0], o.blush[1], o.blush[2], false);
      b.scale.set(1.25, 0.7, 0.3); b.rotation.y = s * 0.55; head.add(b); face.blush.push(b);
    }
  }
  if (o.mouth) {
    const [mx, my, mz] = o.mouth; const r = o.mouthR || 0.045;
    const arc = new THREE.TorusGeometry(r, r * 0.26, 8, 18, Math.PI);
    const smile = mesh(arc, ink, mx, my + r * 0.5, mz, false); smile.rotation.z = Math.PI;
    const frown = mesh(arc, ink, mx, my - r * 0.4, mz, false);
    const flat = mesh(new THREE.CapsuleGeometry(r * 0.24, r * 1.1, 4, 8), ink, mx, my, mz, false); flat.rotation.z = Math.PI / 2;
    const open = mesh(sph(r * 0.85, 16, 12), new THREE.MeshStandardMaterial({ color: '#5a2a2a', roughness: 0.5 }), mx, my - r * 0.1, mz - 0.01, false); open.scale.set(1, 1.2, 0.45);
    Object.assign(face.mouths, { smile, frown, flat, open });
    for (const k in face.mouths) { face.mouths[k].visible = false; head.add(face.mouths[k]); }
  }
  face.brows = [];
  const browGeo = new THREE.CapsuleGeometry(o.eyeR * 0.19, o.eyeR * 1.05, 4, 8);
  for (const s of [-1, 1]) {
    const b = mesh(browGeo, ink, s * o.eye[0] * 1.05, o.eye[1] + o.eyeR * 2.75, o.eye[2] - o.eyeR * 0.55, false);
    b.rotation.set(0, s * 0.28, Math.PI / 2); b.visible = false; b.userData.y = b.position.y; b.userData.s = s;
    head.add(b); face.brows.push(b);
  }
  return face;
}

function buildRig(species) {
  const root = new THREE.Group();
  const torso = new THREE.Group(); root.add(torso);
  const head = new THREE.Group(); torso.add(head);
  const rig = { species, root, torso, head, ears: [], arms: [], tail: null, face: null, spec: SPECIES_SPEC[species], hold: null };
  if (species === 'otter') {
    const fur = mat('#9a6a48'), dark = mat('#7c5537'), cream = mat('#ecd5b6');
    put(torso, mesh(sph(0.42), fur, 0, 0.47, 0)).scale.set(1, 1.12, 0.92);
    put(torso, mesh(sph(0.3), cream, 0, 0.45, 0.25)).scale.set(0.95, 1.05, 0.45);
    for (const s of [-1, 1]) {
      put(torso, mesh(sph(0.12), dark, s * 0.19, 0.06, 0.17)).scale.set(1, 0.55, 1.35);
      const arm = mesh(new THREE.CapsuleGeometry(0.075, 0.17, 6, 12), fur, s * 0.21, 0.56, 0.3); arm.rotation.set(-1.05, 0, s * 0.55);
      torso.add(arm); rig.arms.push(arm);
    }
    rig.hold = mesh(sph(0.09), mat('#9fb1bc', { roughness: 0.4 }), 0, 0.5, 0.43); rig.hold.scale.set(1.25, 0.8, 1); torso.add(rig.hold);
    const tail = mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), fur, 0, 0.13, -0.42); tail.rotation.x = 1.2; torso.add(tail); rig.tail = tail;
    head.position.set(0, 0.99, 0.02);
    put(head, mesh(sph(0.36), fur)).scale.set(1.08, 0.94, 0.95);
    put(head, mesh(sph(0.19), cream, 0, -0.09, 0.27)).scale.set(1.3, 0.78, 0.75);
    put(head, mesh(sph(0.055), gloss('#3a2a22'), 0, -0.02, 0.41, false)).scale.set(1.5, 1, 1);
    for (const s of [-1, 1]) {
      const ear = mesh(sph(0.085), dark, s * 0.28, 0.2, -0.02); ear.scale.set(1, 1, 0.6); head.add(ear); rig.ears.push(ear);
      for (const k of [-1, 1]) {
        const w = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), mat('#f6ead8'), s * 0.19, -0.08 + k * 0.025, 0.35, false);
        w.rotation.z = s * (1.45 + k * 0.12); head.add(w);
      }
    }
    rig.face = addFace(head, { eye: [0.135, 0.06, 0.31], eyeR: 0.05, mouth: [0, -0.15, 0.37], blush: [0.24, -0.06, 0.25] });
  } else if (species === 'rabbit') {
    const fur = mat('#f4efe9'), pink = mat('#f5b4c0');
    put(torso, mesh(sph(0.4), fur, 0, 0.43, 0)).scale.set(1, 1.05, 0.95);
    for (const s of [-1, 1]) {
      put(torso, mesh(sph(0.13), fur, s * 0.2, 0.06, 0.12)).scale.set(1, 0.5, 1.7);
      const paw = mesh(sph(0.08), fur, s * 0.13, 0.32, 0.33); torso.add(paw); rig.arms.push(paw);
    }
    const tail = mesh(sph(0.12), mat('#ffffff', { roughness: 0.9 }), 0, 0.28, -0.4); torso.add(tail); rig.tail = tail;
    head.position.set(0, 0.92, 0.03);
    put(head, mesh(sph(0.34), fur)).scale.set(1.06, 0.95, 0.98);
    put(head, mesh(sph(0.14), mat('#ffffff'), 0, -0.1, 0.27)).scale.set(1.3, 0.8, 0.8);
    head.add(mesh(sph(0.04), gloss('#ef8aa0'), 0, -0.04, 0.37, false));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(s * 0.12, 0.24, -0.03); ear.rotation.z = -s * 0.2;
      put(ear, mesh(new THREE.CapsuleGeometry(0.075, 0.38, 6, 14), fur, 0, 0.26, 0)).scale.set(1, 1, 0.55);
      put(ear, mesh(new THREE.CapsuleGeometry(0.044, 0.3, 6, 12), pink, 0, 0.26, 0.032, false)).scale.set(1, 1, 0.35);
      head.add(ear); rig.ears.push(ear);
    }
    rig.face = addFace(head, { eye: [0.14, 0.05, 0.29], eyeR: 0.05, mouth: [0, -0.16, 0.335], blush: [0.22, -0.06, 0.24] });
  } else if (species === 'turtle') {
    const skin = mat('#a9cf7c'), shell = mat('#6f8c3b', { roughness: 0.45 }), rim = mat('#caa35a'), plate = mat('#8ba84a', { roughness: 0.45 });
    put(torso, mesh(sph(0.48), skin, 0, 0.24, 0)).scale.set(1.05, 0.42, 1.15);
    put(torso, mesh(new THREE.SphereGeometry(0.52, 40, 20, 0, TAU, 0, Math.PI / 2), shell, 0, 0.24, 0)).scale.set(1.02, 0.8, 1.1);
    const rimM = mesh(new THREE.TorusGeometry(0.51, 0.06, 10, 48), rim, 0, 0.25, 0); rimM.rotation.x = Math.PI / 2; rimM.scale.set(1.03, 1.12, 1); torso.add(rimM);
    [[0, 0.62, 0], [0.24, 0.55, 0.18], [-0.24, 0.55, 0.18], [0.24, 0.55, -0.2], [-0.24, 0.55, -0.2]].forEach(([x, y, z]) => {
      const p = mesh(sph(0.14), plate, x, y, z); p.scale.set(1, 0.3, 1); p.lookAt(0, -0.6, 0); torso.add(p);
    });
    for (const s of [-1, 1]) for (const f of [-1, 1]) {
      const leg = mesh(sph(0.12), skin, s * 0.38, 0.1, f * 0.32); leg.scale.set(1, 0.7, 1.2); torso.add(leg); if (f > 0) rig.arms.push(leg);
    }
    const neck = mesh(new THREE.CapsuleGeometry(0.12, 0.18, 6, 12), skin, 0, 0.32, 0.47); neck.rotation.x = 1.15; torso.add(neck);
    const tail = mesh(new THREE.ConeGeometry(0.06, 0.18, 10), skin, 0, 0.16, -0.6); tail.rotation.x = -1.6; torso.add(tail); rig.tail = tail;
    head.position.set(0, 0.44, 0.62);
    put(head, mesh(sph(0.25), skin)).scale.set(1, 0.95, 1.05);
    rig.face = addFace(head, { eye: [0.105, 0.07, 0.205], eyeR: 0.045, mouth: [0, -0.06, 0.25], mouthR: 0.04, blush: [0.165, -0.02, 0.175], blushR: 0.05 });
  } else if (species === 'bird') {
    const body = mat('#cfdce6'), wing = mat('#a8bdcf'), white = mat('#f4f7f9'), leg = mat('#e8993b'), beak = gloss('#f2b33d');
    put(torso, mesh(sph(0.36), body, 0, 0.72, 0)).scale.set(0.95, 0.88, 1.15);
    for (const s of [-1, 1]) {
      const w = mesh(sph(0.26), wing, s * 0.31, 0.75, -0.04); w.scale.set(0.35, 0.75, 1.1); torso.add(w); rig.arms.push(w);
      torso.add(mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.44, 8), leg, s * 0.1, 0.22, 0.02));
      put(torso, mesh(sph(0.06), leg, s * 0.1, 0.02, 0.07)).scale.set(1, 0.35, 1.6);
    }
    const tail = mesh(new THREE.ConeGeometry(0.12, 0.28, 12), mat('#7f93a6'), 0, 0.66, -0.46); tail.rotation.x = -1.9; torso.add(tail); rig.tail = tail;
    const neck = mesh(new THREE.CapsuleGeometry(0.085, 0.26, 6, 12), white, 0, 0.99, 0.17); neck.rotation.x = -0.35; torso.add(neck);
    head.position.set(0, 1.21, 0.24);
    head.add(mesh(sph(0.17), white));
    const bk = mesh(new THREE.ConeGeometry(0.045, 0.32, 16), beak, 0, -0.02, 0.27, false); bk.rotation.x = Math.PI / 2; head.add(bk);
    const crest = mesh(new THREE.CapsuleGeometry(0.018, 0.2, 4, 8), mat('#4a5664'), 0, 0.12, -0.12); crest.rotation.x = -1.0; head.add(crest); rig.ears.push(crest);
    rig.face = addFace(head, { eye: [0.085, 0.04, 0.125], eyeR: 0.033, blush: [0.12, -0.03, 0.095], blushR: 0.04 });
  } else if (species === 'fox') {
    const fur = mat('#e5813f'), cream = mat('#fff1e2'), dark = mat('#4e3426');
    put(torso, mesh(sph(0.4), fur, 0, 0.45, 0)).scale.set(0.98, 1.1, 0.95);
    put(torso, mesh(sph(0.25), cream, 0, 0.5, 0.25)).scale.set(0.95, 1.1, 0.45);
    for (const s of [-1, 1]) {
      put(torso, mesh(sph(0.11), dark, s * 0.18, 0.06, 0.17)).scale.set(1, 0.55, 1.35);
      const paw = mesh(sph(0.075), dark, s * 0.14, 0.2, 0.3); torso.add(paw); rig.arms.push(paw);
    }
    const tail = new THREE.Group(); tail.position.set(0.22, 0.25, -0.38); tail.rotation.set(0.5, 0.7, 0);
    put(tail, mesh(sph(0.22), fur, 0, 0, 0)).scale.set(0.8, 0.8, 1.6);
    tail.add(mesh(sph(0.13), cream, 0, 0, -0.33));
    torso.add(tail); rig.tail = tail;
    head.position.set(0, 0.95, 0.03);
    put(head, mesh(sph(0.34), fur)).scale.set(1.12, 0.95, 0.95);
    for (const s of [-1, 1]) put(head, mesh(sph(0.15), cream, s * 0.13, -0.1, 0.2)).scale.set(1, 0.8, 0.8);
    put(head, mesh(sph(0.13), cream, 0, -0.1, 0.29)).scale.set(1, 0.85, 1.35);
    head.add(mesh(sph(0.045), gloss('#2b1d16'), 0, -0.06, 0.46, false));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(s * 0.2, 0.28, -0.02); ear.rotation.z = -s * 0.32;
      ear.add(mesh(new THREE.ConeGeometry(0.12, 0.26, 16), fur, 0, 0.1, 0));
      ear.add(mesh(new THREE.ConeGeometry(0.055, 0.12, 12), dark, 0, 0.19, 0));
      put(ear, mesh(new THREE.ConeGeometry(0.07, 0.15, 12), cream, 0, 0.07, 0.06, false)).scale.set(1, 1, 0.4);
      head.add(ear); rig.ears.push(ear);
    }
    rig.face = addFace(head, { eye: [0.13, 0.05, 0.3], eyeR: 0.048, mouth: [0, -0.17, 0.36], blush: [0.25, -0.07, 0.22] });
  }
  rig.baseHead = head.position.clone();
  rig.arms.forEach(a => { a.userData.basePos = a.position.clone(); a.userData.baseRot = a.rotation.clone(); });
  root.traverse(o => { if (o.isMesh) o.userData.pet = true; });
  return rig;
}

/* Accessories: built in a unit space and attached to the rig's anchors. */
function buildAccessory(id, rig) {
  const spec = rig.spec;
  const g = new THREE.Group(); g.userData.item = id;
  if (id === 'hat') {
    const straw = mat('#e8c877', { roughness: 0.85 });
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.37, 0.03, 40), straw));
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.17, 32), straw, 0, 0.1, 0));
    put(g, mesh(sph(0.17), straw, 0, 0.185, 0)).scale.set(1, 0.3, 1);
    const band = mesh(new THREE.TorusGeometry(0.197, 0.026, 8, 40), mat('#e35b4a'), 0, 0.04, 0); band.rotation.x = Math.PI / 2; g.add(band);
    g.scale.setScalar(spec.hat); g.position.set(0, spec.headTop, -0.02); g.rotation.set(-0.12, 0, 0.14);
    rig.head.add(g);
  } else if (id === 'scarf') {
    const knit = mat('#3fa3b4', { roughness: 0.95 }), sun = mat('#ffd15c', { roughness: 0.95 });
    const [x, y, z, r] = spec.neck || spec.neckOnHead;
    const ring = mesh(new THREE.TorusGeometry(r, 0.075, 12, 40), knit); ring.rotation.x = Math.PI / 2 - 0.12; g.add(ring);
    const end = mesh(new RoundedBoxGeometry(0.13, 0.3, 0.06, 2, 0.03), knit, r * 0.5, -0.14, r * 0.82); end.rotation.z = 0.22; g.add(end);
    g.add(mesh(new RoundedBoxGeometry(0.135, 0.05, 0.065, 2, 0.02), sun, r * 0.5 + 0.03, -0.27, r * 0.82));
    g.position.set(x, y, z);
    (spec.neckOnHead ? rig.head : rig.torso).add(g);
  } else if (id === 'lantern') {
    const red = mat('#e0412f', { emissive: new THREE.Color('#ff5a3a'), emissiveIntensity: 0.15, roughness: 0.7 });
    const gold = mat('#e6b54a', { roughness: 0.4, metalness: 0.2 });
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.85, 8), mat('#c9a35a'), 0, 0.425, 0));
    put(g, mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), mat('#c9a35a'), 0.1, 0.84, 0)).rotation.z = Math.PI / 2;
    const lan = new THREE.Group(); lan.position.set(0.2, 0.66, 0);
    put(lan, mesh(sph(0.14), red)).scale.set(1, 0.85, 1);
    lan.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.035, 16), gold, 0, 0.12, 0));
    lan.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.035, 16), gold, 0, -0.12, 0));
    lan.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), mat('#c7362a'), 0, -0.22, 0));
    lan.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), gold, 0, 0.19, 0));
    g.add(lan); g.userData.glow = red; g.userData.swing = lan;
    g.position.set(0.62, 0, 0.12);
    rig.root.add(g);
  } else if (id === 'mooncake') {
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.03, 32), mat('#f7f3ec', { roughness: 0.3 }), 0, 0.015, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 28), mat('#d49a4a', { roughness: 0.55 }), 0, 0.07, 0));
    const rimM = mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 28), mat('#b9772f'), 0, 0.11, 0); rimM.rotation.x = Math.PI / 2; g.add(rimM);
    put(g, mesh(sph(0.035, 12, 8), mat('#b9772f'), 0, 0.112, 0)).scale.set(1, 0.4, 1);
    g.position.set(-0.6, 0, 0.32);
    rig.root.add(g);
  } else if (id === 'ribbon') {
    put(g, mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), mat('#ff8066'), 0, 0, 0)).rotation.x = Math.PI / 2;
    put(g, mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), mat('#ffd15c'), 0, 0, 0.01)).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const t = mesh(new RoundedBoxGeometry(0.04, 0.12, 0.012, 1, 0.006), mat('#ff8066'), s * 0.03, -0.09, -0.005); t.rotation.z = s * 0.25; g.add(t); }
    g.position.set(0.12, 0.62, 0.36);
    rig.torso.add(g);
  } else if (id === 'leaf') {
    const h = spec.height + 0.25;
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.028, h, 8), mat('#5c8f45'), 0, h / 2, 0));
    const leaf = mesh(sph(0.5, 32, 16), mat('#6db35a', { roughness: 0.5, side: THREE.DoubleSide }), -0.32, h + 0.02, 0.05);
    leaf.scale.set(1.25, 0.16, 1.0); leaf.rotation.z = 0.12; g.add(leaf);
    g.position.set(0.32, 0, -0.12); g.userData.sway = leaf;
    rig.root.add(g);
  } else if (id === 'blanket') {
    if (rig.species === 'turtle') return null;
    const bird = rig.species === 'bird';
    const r = bird ? 0.36 : 0.45;
    const geo = new THREE.SphereGeometry(r, 36, 18, Math.PI / 2 + 0.7, TAU - 1.4, 0.3, 1.25);
    const b = mesh(geo, mat('#b8a5de', { roughness: 0.95, side: THREE.DoubleSide }), 0, bird ? 0.74 : 0.5, 0.0);
    b.scale.set(1.08, bird ? 0.95 : 1.12, 1.02); g.add(b);
    rig.torso.add(g);
  }
  return g;
}

/* ---------------- the world ---------------- */
export class CompanionWorld {
  constructor() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.canvas.className = 'c3d';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.listeners = {};
    this.state = { species: 'otter', mood: null, asleep: true, wear: [], timeOverride: null };
    this.mode = 'home';
    this.time = 0;
    this.thumbs = new Map();
    this.pointer = { x: 0, y: 0, active: false, lastMove: -10, down: null };
    this.anim = { hop: -10, hug: 0, hugOn: false, stroke: 0, strokeDist: 0, wake: -100, yawn: -100, blinkAt: 2, blink: 0, happy: 0, pop: -10, strokeLean: 0, breath: false, breathT: 0, celebrate: -10 };
    this.look = { yaw: 0, pitch: 0 };
    this.weather = { ...WEATHER.none };
    this.blinkRand = rng(7);
    this.emo = null; this.talkUntil = -10; this.lastInteract = 0; this.sitting = false; this.hopH = 0.32;
    this.petPos = PET_POS.clone(); this.walk = { state: 'idle', target: null, next: 7, spot: 0, until: 0 };

    const scene = new THREE.Scene();
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    this.camPos = new THREE.Vector3(0, 4, 12); this.camTarget = new THREE.Vector3(0, 1, 0);
    this.camGoal = { pos: this.camPos.clone(), target: this.camTarget.clone() };

    this.hemi = new THREE.HemisphereLight('#d6ecff', '#73914f', 1.1); scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff3df', 2.6);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025; sun.shadow.radius = 4;
    scene.add(sun, sun.target); this.sun = sun;
    this.lamp = new THREE.PointLight('#ffc27a', 0, 4.5, 1.6); scene.add(this.lamp);
    this.lanternLight = new THREE.PointLight('#ff7a4a', 0, 2.2, 1.6); scene.add(this.lanternLight);
    this.bridgeLight = new THREE.PointLight('#ffc86b', 0, 3.5, 1.6); scene.add(this.bridgeLight);

    this.buildIsland();
    this.buildSkyBits();
    this.buildParticles();
    this.setSpecies('otter');
    this.applySky(true);

    this.raycaster = new THREE.Raycaster();
    this.bindPointer();
    this.ro = new ResizeObserver(() => this.resize());
    this._tick = this.tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data)); }

  /* ---------- scene building ---------- */
  buildIsland() {
    const island = new THREE.Group(); this.island = island; this.scene.add(island);
    const soil = mat('#b98557', { roughness: 0.9 }), grass = mat('#79c267', { roughness: 0.8 });
    for (const side of [1, -1]) {
      const { shape } = bankShape(side);
      const body = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 4, curveSegments: 12 });
      body.rotateX(-Math.PI / 2);
      const b = mesh(body, soil, 0, 0.3, 0); b.castShadow = false; island.add(b);
      const cap = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.13, bevelSegments: 5, curveSegments: 12 });
      cap.rotateX(-Math.PI / 2);
      const c = mesh(cap, grass, 0, 0.92, 0); c.castShadow = false; island.add(c);
    }
    island.add(mesh(new THREE.CylinderGeometry(R + 0.05, R - 0.12, 0.4, 72), mat('#8f6a4c', { roughness: 0.95 }), 0, 0.25, 0, false));
    // floating rock base
    const prof = [[R + 0.06, 0.12], [R - 0.12, -0.12], [R - 0.5, -0.5], [2.2, -0.92], [1.45, -1.3], [0.7, -1.6], [0.05, -1.78]].map(([r, y]) => new THREE.Vector2(r, y));
    const rock = new THREE.LatheGeometry(prof, 56);
    const pos = rock.attributes.position, rockRnd = rng(11);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y > 0.05) continue;
      const k = 1 + (rockRnd() - 0.5) * 0.16 * clamp(-y, 0, 1);
      pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); pos.setY(i, y + (rockRnd() - 0.5) * 0.06);
    }
    rock.computeVertexNormals();
    island.add(mesh(rock, mat('#8a6a52', { roughness: 0.95, flatShading: true }), 0, 0, 0, false));

    // water + falls
    this.waterU = { uT: { value: 0 }, uFall: { value: 0 }, uWarm: { value: 0 }, uDeep: { value: new THREE.Color('#2a8fa3') }, uLight: { value: new THREE.Color('#86d4dc') }, uNight: { value: 0 } };
    const water = new THREE.Mesh(new THREE.CircleGeometry(R + 0.07, 72), new THREE.ShaderMaterial({ uniforms: this.waterU, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG }));
    water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; island.add(water);
    const fallU = { ...this.waterU, uFall: { value: 1 } };
    const fallMat = new THREE.ShaderMaterial({ uniforms: fallU, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    for (const sx of [-1, 1]) {
      const x = sx * (R + 0.08), z = riverZ(x);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.15, 1, 8), fallMat);
      f.position.set(x, WATER_Y - 0.57, z); f.rotation.y = sx * Math.PI / 2; island.add(f);
    }

    // stone arch bridge, echoing the Bridge River mark
    const bridge = new THREE.Group(); this.bridge = bridge;
    const L = 2.4, H = 0.5, W = 0.62;
    const s = new THREE.Shape();
    s.moveTo(-L / 2, 0); s.lineTo(-L / 2, H * 0.7); s.quadraticCurveTo(0, H * 1.1, L / 2, H * 0.7); s.lineTo(L / 2, 0);
    s.lineTo(0.74, 0); s.absarc(0.44, 0, 0.3, 0, Math.PI, false); s.lineTo(-0.14, 0); s.absarc(-0.44, 0, 0.3, 0, Math.PI, false); s.lineTo(-L / 2, 0);
    const bg = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 24 });
    bg.translate(0, 0, -W / 2); bg.rotateY(Math.PI / 2);
    const stone = spriteTexture((g, n) => {
      g.fillStyle = '#8e948f'; g.fillRect(0, 0, n, n);
      const rows = 4, cols = 3, rh = n / rows, cw = n / cols, tones = ['#c9cdc8', '#bfc4bf', '#d2d5cf', '#b8bdb8', '#c4c8c2'];
      for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
        const x = c * cw + (r % 2 ? cw / 2 : 0); g.fillStyle = tones[(r * 7 + c * 3 + 10) % tones.length];
        g.beginPath(); g.roundRect(x + 3, r * rh + 3, cw - 6, rh - 6, 6); g.fill();
      }
    }, 256);
    stone.wrapS = stone.wrapT = THREE.RepeatWrapping; stone.repeat.set(2.6, 3.4);
    bridge.add(mesh(bg, mat('#ffffff', { map: stone, roughness: 0.92 })));
    const railMat = mat('#a9aea8', { roughness: 0.9 });
    const topY = u => { const t = (u + L / 2) / L; return (1 - t) ** 2 * H * 0.7 + 2 * (1 - t) * t * H * 1.1 + t * t * H * 0.7; };
    this.bridgeBulbs = [];
    const bulbMat = mat('#fff1c9', { emissive: new THREE.Color('#ffc86b'), emissiveIntensity: 0, roughness: 0.3 });
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 4; i++) {
        const u = lerp(-L * 0.38, L * 0.38, i / 4);
        bridge.add(mesh(new RoundedBoxGeometry(0.07, 0.2, 0.07, 2, 0.02), railMat, side * (W / 2 - 0.02), topY(u) + 0.1, -u));
        const bulb = mesh(sph(0.032, 12, 8), bulbMat, side * (W / 2 - 0.02), topY(u) + 0.23, -u, false); bulb.visible = false; bridge.add(bulb); this.bridgeBulbs.push(bulb);
      }
      for (let i = 0; i < 4; i++) {
        const u0 = lerp(-L * 0.38, L * 0.38, i / 4), u1 = lerp(-L * 0.38, L * 0.38, (i + 1) / 4);
        const len = Math.hypot(u1 - u0, topY(u1) - topY(u0));
        const rail = mesh(new RoundedBoxGeometry(0.05, 0.045, len + 0.04, 2, 0.015), railMat, side * (W / 2 - 0.02), (topY(u0) + topY(u1)) / 2 + 0.18, -(u0 + u1) / 2);
        rail.rotation.x = Math.atan2(topY(u1) - topY(u0), u1 - u0); bridge.add(rail);
      }
    }
    this.bulbMat = bulbMat;
    bridge.position.set(BRIDGE_X, WATER_Y - 0.03, riverZ(BRIDGE_X)); bridge.rotation.y = BRIDGE_YAW;
    island.add(bridge);
    this.bridgeLight.position.set(BRIDGE_X, GROUND + 0.6, riverZ(BRIDGE_X));

    // trees: colours follow the real season
    const leaves = seasonOf(new Date());
    this.trees = [];
    [[-1.75, -2.0, 1.0, 0], [-0.75, -2.55, 1.15, 1], [2.05, -1.95, 0.9, 2], [-2.45, -0.15 + 0.9, 0.7, 2]].forEach(([x, z, k, ci]) => {
      if (!onLand(x, z, 0.05)) return;
      const t = new THREE.Group(); t.position.set(x, GROUND, z);
      t.add(mesh(new THREE.CylinderGeometry(0.07 * k, 0.11 * k, 0.6 * k, 10), mat('#8a5a3b', { roughness: 0.9 }), 0, 0.3 * k, 0));
      const crown = new THREE.Group(); crown.position.y = 0.72 * k;
      const lm = mat(leaves[ci], { roughness: 0.75 });
      [[0, 0.12, 0, 0.46], [0.26, -0.02, 0.06, 0.32], [-0.24, 0.0, -0.04, 0.34], [0.04, 0.38, -0.02, 0.3]].forEach(([a, b, c, r]) => crown.add(mesh(new THREE.IcosahedronGeometry(r * k, 2), lm, a * k, b * k, c * k)));
      t.add(crown); island.add(t); this.trees.push({ crown, phase: x * 1.7 });
    });

    // lamp post near the bridge foot
    const lamp = new THREE.Group(); lamp.position.set(2.3, GROUND, 0.25);
    lamp.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.85, 10), mat('#5b4636'), 0, 0.425, 0));
    this.lampGlass = mat('#fff4d6', { emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 0, roughness: 0.25 });
    lamp.add(mesh(new RoundedBoxGeometry(0.16, 0.2, 0.16, 2, 0.03), this.lampGlass, 0, 0.95, 0));
    put(lamp, mesh(new THREE.ConeGeometry(0.15, 0.1, 4), mat('#5b4636'), 0, 1.1, 0)).rotation.y = Math.PI / 4;
    island.add(lamp); this.lamp.position.set(lamp.position.x, GROUND + 0.95, lamp.position.z);

    // flowers, tufts, stones (deterministic placement)
    const rnd = rng(42);
    const flowerCols = ['#ffd15c', '#ff8066', '#ffffff', '#f4a7b9', '#b9a6ef'].map(c => new THREE.Color(c));
    const petals = mergeGeometries([0, 1, 2, 3, 4].map(i => { const g = sph(0.034, 10, 8); g.scale(1, 0.45, 1); g.translate(Math.cos(i * TAU / 5) * 0.042, 0, Math.sin(i * TAU / 5) * 0.042); return g; }));
    const fl = new THREE.InstancedMesh(petals, mat('#ffffff', { roughness: 0.55 }), 40);
    const fc = new THREE.InstancedMesh(sph(0.026, 10, 8), mat('#ffc23d', { roughness: 0.5 }), 40);
    const tu = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.13, 5), mat('#68ad55', { roughness: 0.9 }), 36);
    const st = new THREE.InstancedMesh(sph(0.13, 14, 10), mat('#c9c0ae', { roughness: 0.8 }), 4);
    const d = new THREE.Object3D();
    const place = (inst, n, y, scale, colorFn) => {
      let k = 0, guard = 0;
      while (k < n && guard++ < 4000) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * (R - 0.3);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!onLand(x, z)) continue;
        if (Math.hypot(x - PET_POS.x, z - PET_POS.z) < 0.8) continue;
        if (nearBridge(x, z) || Math.hypot(x - 2.3, z - 0.25) < 0.3) continue;
        d.position.set(x, GROUND + y, z); d.rotation.set(0, rnd() * TAU, 0); d.scale.setScalar(scale * (0.7 + rnd() * 0.6));
        if (inst === st) d.scale.y *= 0.5;
        d.updateMatrix(); inst.setMatrixAt(k, d.matrix);
        if (colorFn) inst.setColorAt(k, colorFn());
        k++;
      }
      inst.count = k; inst.castShadow = inst !== tu; inst.receiveShadow = true; island.add(inst);
    };
    // flowers grow in a few patches, each patch one colour
    { const patches = [[-1.6, 1.6, 0], [0.75, 1.95, 1], [1.95, 1.05, 3], [-2.3, 0.45, 2], [0.2, -2.2, 4], [-1.2, -2.6, 0]];
      let k = 0;
      for (const [px, pz, ci] of patches) for (let j = 0; j < 7 && k < 40; j++) {
        const x = px + (rnd() - 0.5) * 0.7, z = pz + (rnd() - 0.5) * 0.5;
        if (!onLand(x, z) || nearBridge(x, z)) continue;
        const sc = 0.85 + rnd() * 0.5;
        d.position.set(x, GROUND + 0.07, z); d.rotation.set(0, rnd() * TAU, 0); d.scale.setScalar(sc); d.updateMatrix();
        fl.setMatrixAt(k, d.matrix); fl.setColorAt(k, flowerCols[ci]);
        d.position.y = GROUND + 0.085; d.updateMatrix(); fc.setMatrixAt(k, d.matrix); k++;
      }
      fl.count = fc.count = k; fl.castShadow = true; island.add(fl, fc); }
    place(tu, 36, 0.06, 1);
    place(st, 4, 0.02, 1);

    // soft contact shadow under the Companion
    const blob = spriteTexture((g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(20,40,25,.45)'); gr.addColorStop(1, 'rgba(20,40,25,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, 64);
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
    this.contact.rotation.x = -Math.PI / 2; this.contact.position.set(PET_POS.x, GROUND + 0.012, PET_POS.z); island.add(this.contact);
  }

  buildSkyBits() {
    // clouds
    this.clouds = [];
    const cm = mat('#ffffff', { roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25 });
    this.cloudMat = cm;
    const rnd = rng(5);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(rnd() * 2);
      const own = cm.clone(); own.transparent = true; c.userData.mat = own; c.userData.fade = 1;
      for (let j = 0; j < n; j++) c.add(mesh(new THREE.IcosahedronGeometry(0.32 + rnd() * 0.22, 2), own, (j - n / 2) * 0.34, rnd() * 0.16, (rnd() - 0.5) * 0.3, false));
      c.position.set(-6 + i * 2.3, 3.0 + rnd() * 0.6, -4.2 + rnd() * 1.4); c.scale.setScalar(0.85 + rnd() * 0.4);
      c.userData.speed = 0.15 + rnd() * 0.12; c.visible = false;
      this.scene.add(c); this.clouds.push(c);
    }
    // stars + moon
    const sp = [], rnd2 = rng(9);
    for (let i = 0; i < 160; i++) { const a = rnd2() * Math.PI - Math.PI, e = 0.15 + rnd2() * 1.1; sp.push(Math.cos(a) * 18 * Math.cos(e), 2 + Math.sin(e) * 14, -10 + Math.sin(a) * 6); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6dc', size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.stars);
    this.moon = new THREE.Mesh(sph(0.42), new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0 }));
    this.moon.position.set(-4.6, 5.2, -7); this.scene.add(this.moon);
  }

  buildParticles() {
    const heart = spriteTexture((g, n) => {
      g.translate(n / 2, n / 2 + 4); g.scale(n / 120, n / 120);
      g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-55, -8, -30, -52, 0, -24); g.bezierCurveTo(30, -52, 55, -8, 0, 30); g.closePath();
      g.fillStyle = '#ff6f6f'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
    });
    const zz = spriteTexture((g, n) => { g.font = `700 ${n * 0.72}px Fredoka, Nunito, 'Arial Rounded MT Bold', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = n * 0.09; g.strokeStyle = '#24452f'; g.strokeText('z', n / 2, n / 2); g.fillStyle = '#fff3d6'; g.fillText('z', n / 2, n / 2); }, 256);
    const spark = spriteTexture((g, n) => { g.translate(n / 2, n / 2); g.fillStyle = '#ffd15c'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? n * 0.1 : n * 0.46; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
    const glow = spriteTexture((g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,220,120,.55)'); gr.addColorStop(1, 'rgba(255,210,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, 64);
    this.tex = { heart, zz, spark, glow };
    this.sprites = [];
    for (let i = 0; i < 28; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heart, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; s.userData = { life: 0, max: 1, vel: new THREE.Vector3() }; this.scene.add(s); this.sprites.push(s);
    }
    // rain
    const rp = [], rnd = rng(3);
    for (let i = 0; i < 240; i++) { const x = (rnd() - 0.5) * 8, y = 0.7 + rnd() * 5, z = (rnd() - 0.5) * 6; rp.push(x, y, z, x - 0.03, y - 0.22, z); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#d6ebff', transparent: true, opacity: 0 }));
    this.rain.visible = false; this.scene.add(this.rain);
    // fireflies
    const fp = [], rnd3 = rng(13);
    this.fireflySeed = [];
    for (let i = 0; i < 18; i++) { const a = rnd3() * TAU, r = 0.6 + rnd3() * 2.3; fp.push(Math.cos(a) * r, GROUND + 0.3 + rnd3() * 1.2, Math.sin(a) * r); this.fireflySeed.push(rnd3() * TAU); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    this.fireflyBase = fp.slice();
    this.fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ map: glow, size: 0.28, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe7a0' }));
    this.scene.add(this.fireflies);
    // butterflies + blowing leaves
    this.butterflies = [];
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Group();
      const wm = new THREE.MeshStandardMaterial({ color: i ? '#ff8066' : '#ffd15c', side: THREE.DoubleSide, roughness: 0.6 });
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), wm); w.position.x = s * 0.06; w.scale.set(1, 0.8, 1); const p = new THREE.Group(); p.add(w); b.add(p); }
      b.visible = false; b.userData.phase = i * 2.4; this.scene.add(b); this.butterflies.push(b);
    }
    this.leavesFly = [];
    const lc = seasonOf(new Date());
    for (let i = 0; i < 12; i++) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), new THREE.MeshStandardMaterial({ color: lc[i % 3], side: THREE.DoubleSide }));
      l.scale.set(1.6, 0.8, 1); l.visible = false; l.userData.phase = i * 0.9; this.scene.add(l); this.leavesFly.push(l);
    }
  }

  spawn(kind, at, n = 1) {
    if (REDUCED.matches && kind !== 'heart') n = Math.min(n, 1);
    for (let k = 0; k < n; k++) {
      const s = this.sprites.find(x => !x.visible); if (!s) return;
      const map = this.tex[kind === 'z' ? 'zz' : kind];
      s.material.map = map; s.material.needsUpdate = true;
      s.position.copy(at).add(kind === 'z' ? new THREE.Vector3(0.28, 0.05, 0.1) : new THREE.Vector3((Math.random() - 0.5) * 0.35, Math.random() * 0.1, (Math.random() - 0.5) * 0.2));
      const big = kind === 'z' ? 0.4 : 0.2;
      s.scale.setScalar(big); s.userData.base = big;
      s.userData.vel.set(kind === 'z' ? 0.26 : (Math.random() - 0.5) * 0.5, kind === 'spark' ? 0.9 + Math.random() * 0.6 : kind === 'z' ? 0.36 : 0.55, 0);
      s.userData.life = 0; s.userData.max = kind === 'z' ? 2.4 : kind === 'spark' ? 0.9 : 1.3; s.userData.kind = kind;
      s.visible = true;
    }
  }

  /* ---------- species + accessories ---------- */
  setSpecies(species) {
    if (this.rig && this.rig.species === species) return;
    if (this.rig) this.island.remove(this.rig.root);
    this.rig = buildRig(species);
    this.rig.root.position.copy(this.petPos); this.rig.root.rotation.y = 0.18;
    this.island.add(this.rig.root);
    this.accessories = {};
    this.syncWear(true);
    this.anim.pop = this.time;
  }
  syncWear(force) {
    const want = new Set(this.state.wear.filter(w => ['hat', 'scarf', 'lantern', 'mooncake', 'ribbon'].includes(w)));
    const mood = this.state.asleep ? null : this.state.mood;
    if (mood && WEATHER[mood].leaf) want.add('leaf');
    if (mood && WEATHER[mood].blanket) want.add('blanket');
    for (const id of Object.keys(this.accessories)) if (!want.has(id)) { this.accessories[id]?.removeFromParent(); delete this.accessories[id]; }
    for (const id of want) if (!this.accessories[id] || force) { this.accessories[id]?.removeFromParent(); const a = buildAccessory(id, this.rig); if (a) this.accessories[id] = a; }
    const lights = this.state.wear.includes('bridge');
    this.bridgeBulbs.forEach(b => (b.visible = lights));
  }

  set(next) {
    const prev = { ...this.state };
    Object.assign(this.state, next);
    if (next.species && next.species !== prev.species) this.setSpecies(next.species);
    if (next.wear || next.mood !== undefined || next.asleep !== undefined) this.syncWear(false);
    if (prev.asleep && !this.state.asleep) { this.anim.wake = this.time; this.anim.yawn = this.time; }
    if (next.timeOverride !== undefined) this.applySky(true);
    this.updateLabel();
  }
  celebrate(hard) {
    this.anim.celebrate = this.time;
    const head = this.headWorld();
    if (hard) { this.spawn('heart', head, 2); this.anim.happy = 1.4; }
    else { this.anim.hop = this.time; this.spawn('spark', head, 6); this.spawn('heart', head, 2); this.anim.happy = 2; }
  }
  breathe(on) { this.anim.breath = on; this.anim.breathT = this.time; }
  /* Gestures the app can ask for; each plays once on the shared motion clock. */
  emote(name, dur) {
    const D = { wave: 1.6, nod: 0.9, tilt: 1.8, jump: 0.9, cheer: 1.2, dance: 1.4, comfort: 2.6, think: 1.6, surprise: 0.9, sniff: 1.8, yawn: 1.3 };
    this.emo = { name, t0: this.time, dur: dur || D[name] || 1.2 };
    this.lastInteract = this.time;
    if (name === 'jump' || name === 'cheer') { this.hopH = 0.5; this.anim.hop = this.time; }
    if (name === 'surprise') { this.hopH = 0.16; this.anim.hop = this.time; }
    if (name === 'dance') { this.hopH = 0.3; this.anim.hop = this.time; this.spawn('spark', this.headWorld(), 5); }
    if (name === 'cheer') this.spawn('spark', this.headWorld(), 6);
    if (name === 'comfort') this.spawn('heart', this.headWorld(), 2);
  }
  talk(seconds) { this.talkUntil = this.time + seconds; this.lastInteract = this.time; }
  sit(on) { this.sitting = on; this.lastInteract = this.time; }
  headScreen() {
    const v = this.headWorld().project(this.camera), r = this.canvas.getBoundingClientRect();
    return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
  }
  /* Idle life: wander to a spot, sniff a flower or wave, come home; sit close when asked. */
  updateWalk(dt) {
    const w = this.walk, t = this.time, r = this.rig, p = this.petPos;
    const awake = !this.state.asleep || t - this.anim.wake < 7;
    const free = awake && !this.anim.breath && !this.sitting && !REDUCED.matches && !this.pointer.down
      && t > this.talkUntil + 1.5 && (!this.emo || this.emo.idle || t - this.emo.t0 > this.emo.dur) && t - this.lastInteract > 8
      && ['home', 'companion', 'welcome'].includes(this.mode);
    const SPOTS = [[-1.2, 0.45, 'sniff'], [0.6, 0.05, 'think'], [-0.45, -0.3, 'sniff'], [0.3, 0.5, 'wave']];
    if (this.sitting && w.state !== 'sit') w.state = 'go-sit';
    if (!this.sitting && (w.state === 'sit' || w.state === 'go-sit')) w.state = 'back';
    if (w.state === 'idle' && free && t > w.next) {
      const sp = SPOTS[w.spot++ % SPOTS.length];
      w.target = new THREE.Vector3(PET_POS.x + sp[0], 0, PET_POS.z + sp[1]); w.act = sp[2]; w.state = 'out';
    }
    if ((w.state === 'out' || w.state === 'pause') && !free) w.state = 'back';
    let tx = null, tz = null;
    if (w.state === 'out') { tx = w.target.x; tz = w.target.z; }
    else if (w.state === 'back') { tx = PET_POS.x; tz = PET_POS.z; }
    else if (w.state === 'go-sit') { tx = PET_POS.x + 0.2; tz = PET_POS.z + 0.6; }
    let heading = null;
    if (tx !== null) {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.03) {
        if (w.state === 'out') { w.state = 'pause'; w.until = t + 2.8; this.emo = { name: w.act, t0: t, dur: w.act === 'wave' ? 1.6 : 1.8, idle: true }; }
        else if (w.state === 'go-sit') w.state = 'sit';
        else { w.state = 'idle'; w.next = t + 11 + (w.spot % 3) * 4; }
      } else {
        const step = Math.min(d, 0.62 * dt); p.x += dx / d * step; p.z += dz / d * step; heading = Math.atan2(dx, dz);
      }
    }
    if (w.state === 'pause' && t > w.until) w.state = 'back';
    this.walking = heading !== null;
    const want = heading !== null ? heading : 0.18;
    const cur = r.root.rotation.y, diff = ((want - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
    r.root.rotation.y = cur + diff * (1 - Math.exp(-8 * dt));
    r.root.position.x = p.x; r.root.position.z = p.z;
    this.contact.position.x = p.x; this.contact.position.z = p.z;
  }

  /* ---------- mounting ---------- */
  attach(el, mode = 'home') {
    if (!el) return;
    if (this.canvas.parentElement !== el) { this.ro.disconnect(); el.appendChild(this.canvas); this.ro.observe(el); }
    const changed = this.mode !== mode; this.mode = mode;
    this.textBand = mode === 'home' || mode === 'companion';
    this.resize(changed ? false : true);
    this.updateLabel();
  }
  resize(keep) {
    const el = this.canvas.parentElement; if (!el) return;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.frame(!keep && this.everFramed !== true);
    this.everFramed = true;
  }
  frame(snap) {
    const p = this.rig ? this.rig.root.position : PET_POS;
    const h = this.rig ? this.rig.spec.height : 1.3;
    const cfg = {
      welcome: { t: [0.1, 1.55, 0.2], w: 7.0, e: 0.5 },
      home: { t: [0.05, 1.55, 0.35], w: 7.5, e: 0.5 },
      companion: { t: [-0.05, 1.8, 0.6], w: 5.8, e: 0.42 },
      picker: { t: [p.x + 0.05, GROUND + h * PET_SCALE * 0.5, p.z], w: 3.9, e: 0.24 },
      breathe: { t: [p.x, GROUND + h * PET_SCALE * 0.55, p.z], w: 3.3, e: 0.2 },
    }[this.mode] || { t: [0, 1.1, 0.2], w: 7.5, e: 0.36 };
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    let dist = (cfg.w / 2) / Math.tan(hHalf);
    dist = Math.max(dist, (cfg.w * 0.78 / 2) / Math.tan(vHalf));
    this.camGoal.target.set(...cfg.t);
    this.camGoal.pos.set(cfg.t[0], cfg.t[1] + Math.sin(cfg.e) * dist, cfg.t[2] + Math.cos(cfg.e) * dist);
    if (snap || REDUCED.matches) { this.camPos.copy(this.camGoal.pos); this.camTarget.copy(this.camGoal.target); }
  }

  /* ---------- sky + weather ---------- */
  hour() {
    if (this.state.timeOverride != null) return this.state.timeOverride;
    const d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }
  applySky(force) {
    const s = skyAt(this.hour());
    const w = this.weather;
    const grey = new THREE.Color('#9aa5b1');
    const top = s.top.clone().lerp(grey, w.grey * 0.8 * (1 - s.night * 0.6));
    const bottom = s.bottom.clone().lerp(grey, w.grey * 0.7 * (1 - s.night * 0.6));
    const css = c => '#' + c.getHexString(THREE.SRGBColorSpace);
    this.sky = { top: css(top), bottom: css(bottom), dark: s.night > 0.45, night: s.night };
    this.canvas.style.background = `linear-gradient(180deg, ${this.sky.top} 0%, ${this.sky.bottom} 78%)`;
    this.skyNow = s;
  }
  updateLighting(dt) {
    const s = this.skyNow; const w = this.weather;
    const dim = 1 - w.dim;
    this.sun.color.copy(s.sun); this.sun.intensity = s.sunI * dim * (1 - w.cloud * 0.25);
    this.hemi.color.copy(s.hemiSky); this.hemi.groundColor.copy(s.hemiGround); this.hemi.intensity = s.hemiI * (0.92 + w.grey * 0.15);
    const h = this.hour();
    const dayT = clamp((h - 6) / 13, 0, 1);
    const az = lerp(-1.1, 1.1, dayT), el = s.night > 0.5 ? 0.9 : 0.35 + Math.sin(dayT * Math.PI) * 0.75;
    const dir = s.night > 0.5 ? new THREE.Vector3(-0.5, 0.9, 0.45) : new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el) * 0.8 + 0.25);
    this.sun.position.copy(dir.normalize().multiplyScalar(12)); this.sun.target.position.set(0, 0.8, 0);
    const n = s.night;
    this.lampGlass.emissiveIntensity = n * 2.4 + 0.05; this.lamp.intensity = n * 3.2;
    this.stars.material.opacity = n * (1 - w.cloud * 0.6); this.moon.material.opacity = n;
    this.waterU.uDeep.value.copy(s.deep).lerp(new THREE.Color('#5d7380'), w.grey * 0.4);
    this.waterU.uLight.value.copy(s.light).lerp(new THREE.Color('#9fb2bd'), w.grey * 0.4);
    this.waterU.uNight.value = n;
    this.waterU.uWarm.value = (this.state.wear.includes('bridge') ? 1 : 0.35) * n;
    const lan = this.accessories.lantern;
    if (lan) { lan.userData.glow.emissiveIntensity = 0.25 + n * 2.2; this.lanternLight.intensity = n * 2.5; const lp = new THREE.Vector3(); lan.userData.swing.getWorldPosition(lp); this.lanternLight.position.copy(lp); }
    else this.lanternLight.intensity = 0;
    const bl = this.state.wear.includes('bridge');
    this.bulbMat.emissiveIntensity = bl ? 0.6 + n * 2.4 : 0; this.bridgeLight.intensity = bl ? 0.4 + n * 3 : 0;
    for (const c of this.clouds) {
      const m = c.userData.mat;
      m.color.set('#ffffff').lerp(new THREE.Color('#a3abb5'), w.grey);
      m.emissive.set(n > 0.5 ? '#2a3150' : '#ffffff'); m.emissiveIntensity = 0.22 * (1 - n * 0.7);
    }
  }
  updateWeather(dt) {
    const target = WEATHER[this.state.asleep ? 'none' : (this.state.mood || 'none')] || WEATHER.none;
    for (const k of ['cloud', 'wind', 'rain', 'dim', 'grey']) this.weather[k] = damp(this.weather[k], target[k] || 0, 1.6, dt);
    this.weather.butterflies = target.butterflies; this.weather.leaves = target.leaves; this.weather.fireflies = target.fireflies;
    const w = this.weather, still = REDUCED.matches;
    const showN = Math.round(w.cloud * this.clouds.length + 0.2);
    const p = new THREE.Vector3();
    this.clouds.forEach((c, i) => {
      if (!still) { c.position.x += c.userData.speed * (0.4 + w.wind * 2.2) * dt; if (c.position.x > 7.5) c.position.x = -7.5; }
      p.copy(c.position).project(this.camera);
      const inBand = this.textBand && p.y > 0.12 && p.x < 0.45;
      c.userData.fade = still ? (inBand ? 0 : 1) : damp(c.userData.fade, inBand ? 0 : 1, 5, dt);
      c.userData.mat.opacity = c.userData.fade;
      c.visible = i < showN && c.userData.fade > 0.02;
    });
    this.rain.visible = w.rain > 0.05 && !still;
    this.rain.material.opacity = w.rain * 0.55;
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 2) {
        let y = p.getY(i) - 5.5 * dt;
        if (y < WATER_Y) y += 5;
        p.setY(i, y); p.setY(i + 1, y - 0.22); p.setX(i + 1, p.getX(i) - 0.03 - w.wind * 0.05);
      }
      p.needsUpdate = true;
    }
    const t = this.time, n = this.skyNow.night;
    const ff = Math.max(n, w.fireflies ? 0.75 : 0);
    this.fireflies.material.opacity = damp(this.fireflies.material.opacity, ff * (still ? 0.6 : 0.95), 2, dt);
    if (ff > 0.02 && !still) {
      const p = this.fireflies.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const ph = this.fireflySeed[i];
        p.setX(i, this.fireflyBase[i * 3] + Math.sin(t * 0.6 + ph) * 0.25);
        p.setY(i, this.fireflyBase[i * 3 + 1] + Math.sin(t * 0.9 + ph * 2) * 0.18);
        p.setZ(i, this.fireflyBase[i * 3 + 2] + Math.cos(t * 0.5 + ph) * 0.25);
      }
      p.needsUpdate = true;
      this.fireflies.material.size = 0.24 + Math.sin(t * 3) * 0.04;
    }
    this.butterflies.forEach(b => {
      b.visible = !!w.butterflies && n < 0.5 && !still;
      if (!b.visible) return;
      const ph = b.userData.phase;
      b.position.set(Math.sin(t * 0.45 + ph) * 1.9, GROUND + 0.7 + Math.sin(t * 1.3 + ph) * 0.25, 0.6 + Math.cos(t * 0.35 + ph) * 1.4);
      b.rotation.y = -t * 0.45 - ph;
      const flap = Math.sin(t * 18 + ph) * 0.9;
      b.children[0].rotation.y = flap; b.children[1].rotation.y = -flap;
    });
    this.leavesFly.forEach((l, i) => {
      l.visible = !!w.leaves && !still;
      if (!l.visible) return;
      const ph = l.userData.phase;
      const u = ((t * 0.35 + ph * 0.21) % 1);
      l.position.set(lerp(-4.5, 4.5, u), GROUND + 0.5 + Math.sin(t * 2 + ph) * 0.5 + i * 0.06, -1 + Math.sin(ph * 3) * 2);
      l.rotation.set(t * 3 + ph, t * 2, t * 4);
    });
    // sway: trees, leaf umbrella, lantern
    const sway = still ? 0 : (0.02 + w.wind * 0.13);
    this.trees.forEach(tr => { tr.crown.rotation.z = Math.sin(t * (1.1 + w.wind) + tr.phase) * sway; tr.crown.rotation.x = Math.cos(t * 0.8 + tr.phase) * sway * 0.5; });
    if (this.accessories.leaf) this.accessories.leaf.userData.sway.rotation.x = Math.sin(t * 1.5) * sway * 0.8;
    if (this.accessories.lantern) this.accessories.lantern.userData.swing.rotation.z = Math.sin(t * 1.7) * (still ? 0 : 0.06 + w.wind * 0.1);
  }

  /* ---------- the Companion ---------- */
  headWorld() { const v = new THREE.Vector3(); this.rig.head.getWorldPosition(v); v.y += (this.rig.spec.headTop + 0.15) * PET_SCALE; return v; }
  awakeNow() { return !this.state.asleep || this.time - this.anim.wake < 7; }
  updatePet(dt) {
    const r = this.rig, a = this.anim, t = this.time, still = REDUCED.matches;
    const asleep = !this.awakeNow() && !a.breath;
    const mood = this.state.asleep ? null : this.state.mood;
    // breathing (or guided breathing)
    let breath;
    if (a.breath) { const c = ((t - a.breathT) % 8) / 8; breath = c < 0.5 ? smooth(c * 2) : 1 - smooth((c - 0.5) * 2); breath = 1 + breath * 0.1; }
    else { const period = asleep ? 4.4 : (mood === 'anxious' ? 4.8 : 3.2); breath = 1 + Math.sin(t * TAU / period) * (asleep ? 0.03 : 0.022) * (still ? 0.5 : 1); }
    // hop, hug, pop
    let y = 0, sx = 1, sy = 1;
    const hopT = (t - a.hop) / MOTION;
    if (hopT >= 0 && hopT < 1.6) {
      if (hopT < 1) { y = still ? 0 : Math.sin(hopT * Math.PI) * this.hopH; sy = 1 + Math.sin(hopT * Math.PI) * 0.08; sx = 1 - Math.sin(hopT * Math.PI) * 0.04; }
      else { const k = (hopT - 1) / 0.6; const s = 1 - springOut(k); sy = 1 - 0.12 * s * (1 - k); sx = 1 + 0.08 * s * (1 - k); }
    }
    if (hopT > 1.6) this.hopH = 0.32;
    if (this.walking && !still) { const st = Math.abs(Math.sin(t * 11)); y += st * 0.06; sy *= 1 - (1 - st) * 0.04; }
    a.hug = damp(a.hug, a.hugOn ? 1 : 0, a.hugOn ? 9 : 6, dt);
    sx *= 1 + a.hug * 0.1; sy *= 1 - a.hug * 0.1;
    const popT = (t - a.pop) / MOTION;
    const pop = popT >= 0 && popT < 1 ? springOut(popT) : 1;
    const curl = asleep ? 0.94 : 1;
    r.root.position.y = GROUND + y;
    r.root.scale.set(sx * pop * PET_SCALE, sy * pop * curl * PET_SCALE, sx * pop * PET_SCALE);
    r.torso.scale.y = breath;
    r.torso.scale.x = r.torso.scale.z = 1 + (breath - 1) * 0.5;
    // stroke lean + purr
    a.stroke = damp(a.stroke, 0, 2.5, dt);
    const gust = still || asleep ? 0 : Math.max(0, this.weather.wind - 0.4) * (0.05 + Math.sin(t * 1.7) * 0.04);
    r.torso.rotation.z = a.stroke > 0.05 && !still ? Math.sin(t * 22) * 0.025 * a.stroke + a.strokeLean * 0.12 * a.stroke : damp(r.torso.rotation.z, -gust, 6, dt);
    this.contact.scale.setScalar((1 - y * 0.6) * PET_SCALE);
    // head look
    let yaw = 0, pitch = 0;
    if (asleep) { pitch = 0.32; yaw = 0.05; }
    else if (a.breath) { pitch = 0.05; }
    else if (t - this.pointer.lastMove < 2.5) {
      const hp = this.headWorld().project(this.camera);
      yaw = clamp((this.pointer.x - hp.x) * 1.2, -0.65, 0.65);
      pitch = clamp(-(this.pointer.y - hp.y) * 0.9, -0.35, 0.4);
    } else { yaw = Math.sin(t * 0.35) * 0.18 + 0.05; pitch = Math.sin(t * 0.23) * 0.05 - 0.04; }
    if (mood === 'low' || mood === 'sad') pitch += 0.12;
    const k = still ? 30 : 7;
    this.look.yaw = damp(this.look.yaw, yaw, k, dt); this.look.pitch = damp(this.look.pitch, pitch, k, dt);
    r.head.rotation.y = this.walking ? 0 : this.look.yaw - r.root.rotation.y * 0.6; r.head.rotation.x = this.look.pitch;
    r.head.rotation.z = asleep ? 0.12 : (a.stroke > 0.05 ? a.strokeLean * 0.15 * a.stroke : damp(r.head.rotation.z, mood === 'okay' ? 0.04 : 0, 4, dt));
    // ears + tail
    const ear = Math.sin(t * 0.7) > 0.97 && !still ? Math.sin(t * 40) * 0.25 : 0;
    const droop = (mood === 'low' || mood === 'sad' || mood === 'tired' || asleep) ? 1 : 0;
    r.ears.forEach((e, i) => {
      if (r.species === 'rabbit') { e.rotation.x = damp(e.rotation.x, droop * 0.9 + (i ? ear : 0), 5, dt); }
      else if (r.species === 'fox') { e.rotation.x = damp(e.rotation.x, droop * 0.5 + (i ? ear : 0), 5, dt); }
      else e.rotation.z = (i ? 1 : -1) * ear * 0.4;
    });
    if (r.tail && !still) {
      const wag = a.happy > 0 || a.stroke > 0.2 ? 6 : 1.4;
      if (r.species === 'fox') r.tail.rotation.y = 0.7 + Math.sin(t * wag) * 0.25;
      else if (r.species === 'otter') r.tail.rotation.z = Math.sin(t * wag) * 0.2;
      else if (r.species === 'rabbit') r.tail.position.x = Math.sin(t * wag * 1.5) * 0.02;
    }
    // arms: hug lifts arms, heron flaps on hop
    const e = this.emo, et = e ? (t - e.t0) / e.dur : 9, eOn = !!e && et < 1;
    const waving = eOn && e.name === 'wave' ? Math.sin(Math.PI * Math.min(1, et * 1.25)) : 0;
    const osc = Math.sin((t - (e ? e.t0 : 0)) * 13);
    r.arms.forEach((arm, i) => {
      const s = i ? 1 : -1, wv = i === 1 ? waving : 0, bp = arm.userData.basePos, br = arm.userData.baseRot;
      if (r.species === 'bird') arm.rotation.z = s * (a.hug * 0.6 + (hopT >= 0 && hopT < 1 ? Math.abs(Math.sin(hopT * Math.PI * 3)) * 0.9 : 0) + wv * (1.1 + osc * 0.35));
      else if (r.species === 'otter') { arm.rotation.x = br.x - wv * 1.5; arm.rotation.z = s * (0.55 + a.hug * 0.5) + wv * osc * 0.4; }
      else if (bp) arm.position.set(bp.x + s * wv * 0.1 + wv * osc * 0.04, bp.y + wv * (r.species === 'turtle' ? 0.22 : 0.42), bp.z + wv * 0.06);
    });
    // gestures that move the head and body
    if (eOn) {
      if (e.name === 'nod') r.head.rotation.x += Math.sin(et * Math.PI * 4) * 0.16 * (1 - et);
      if (e.name === 'tilt') r.head.rotation.z += 0.28 * Math.sin(Math.PI * et);
      if (e.name === 'think') { r.head.rotation.x -= 0.22 * Math.sin(Math.PI * et); r.head.rotation.y += 0.35 * Math.sin(Math.PI * et); }
      if (e.name === 'sniff') { r.head.rotation.x += 0.38 * Math.sin(Math.PI * et); r.head.rotation.y += Math.sin(t * 22) * 0.07; }
      if (e.name === 'yawn') r.head.rotation.x -= 0.2 * Math.sin(Math.PI * et);
      if (e.name === 'comfort') { r.head.rotation.z += 0.16 * Math.sin(Math.PI * Math.min(1, et * 1.4)); r.torso.rotation.x = 0.12 * Math.sin(Math.PI * et); }
      if (e.name === 'dance') { r.torso.rotation.y = TAU * smooth(et); if (et > 0.5 && !e.hop2) { e.hop2 = true; a.hop = t; } }
    } else { r.torso.rotation.y = 0; r.torso.rotation.x = damp(r.torso.rotation.x, 0, 6, dt); }
    if (t < this.talkUntil && !asleep) r.head.rotation.x += Math.sin(t * 9) * 0.025;
    if (this.sitting) r.head.rotation.z += 0.1;
    // expression
    a.happy = Math.max(0, a.happy - dt);
    const sinceWake = t - a.wake;
    let eyes = 'open', mouth = 'smile', lid = 1, blush = 0.15;
    const m = mood || 'none';
    if (m === 'great') { mouth = 'smile'; blush = 0.55; if (Math.sin(t * 0.8) > 0.6) eyes = 'happy'; }
    else if (m === 'good') { mouth = 'smile'; blush = 0.35; }
    else if (m === 'okay') { mouth = 'flat'; blush = 0.1; }
    else if (m === 'low') { mouth = 'frown'; lid = 0.72; blush = 0; }
    else if (m === 'sad') { mouth = 'frown'; lid = 0.7; blush = 0; }
    else if (m === 'anxious') { mouth = 'flat'; lid = 1; blush = 0.05; }
    else if (m === 'frustrated') { mouth = 'flat'; lid = 0.85; blush = 0.4; }
    else if (m === 'tired') { mouth = 'flat'; lid = 0.5; blush = 0.1; }
    if (this.state.asleep && sinceWake < 7) { lid = sinceWake < 0.6 ? smooth(sinceWake / 0.6) * 0.6 : 0.6; mouth = 'flat'; }
    if (t - a.yawn < 1.1) mouth = 'open';
    if (m === 'tired' && Math.sin(t * 0.3) > 0.985) mouth = 'open';
    if (a.happy > 0 || a.stroke > 0.3 || a.hug > 0.4) { eyes = 'happy'; mouth = 'smile'; blush = 0.8; }
    if (a.breath) { eyes = ((t - a.breathT) % 8) < 4 ? 'happy' : 'closed'; mouth = 'smile'; blush = 0.3; }
    let brow = null, eyeScale = 1;
    if (m === 'sad' || m === 'low') brow = { tilt: 0.38, raise: 0 };
    else if (m === 'anxious') brow = { tilt: 0.28, raise: 0.006 };
    else if (m === 'frustrated') brow = { tilt: -0.32, raise: -0.004 };
    if (eOn) {
      if (e.name === 'surprise') { eyes = 'open'; lid = 1; eyeScale = 1.3; mouth = 'open'; brow = { tilt: 0, raise: 0.03 }; }
      else if (e.name === 'comfort') { eyes = 'happy'; mouth = 'smile'; blush = 0.85; brow = { tilt: 0.2, raise: 0.01 }; }
      else if (e.name === 'dance' || e.name === 'cheer' || e.name === 'jump') { eyes = 'happy'; mouth = 'open'; blush = 0.8; brow = null; }
      else if (e.name === 'wave' || e.name === 'nod') { if (mouth !== 'frown') mouth = 'smile'; blush = Math.max(blush, 0.45); }
      else if (e.name === 'yawn') { mouth = 'open'; lid = 0.4; }
      else if (e.name === 'think') brow = { tilt: -0.1, raise: 0.015 };
    }
    if (this.sitting) { eyes = Math.sin(t * 0.5) > 0.2 ? 'happy' : 'open'; blush = 0.6; if (mouth === 'frown') mouth = 'flat'; }
    if (t < this.talkUntil && !asleep && r.face.mouths.open) mouth = (Math.floor(t * 8.5) % 2) ? 'open' : (mouth === 'open' ? 'smile' : mouth === 'frown' ? 'flat' : mouth);
    if (asleep) { eyes = 'closed'; mouth = 'flat'; blush = 0.25; brow = null; }
    // blink
    if (t > a.blinkAt) { a.blink = 0.13; a.blinkAt = t + 2.4 + this.blinkRand() * 3.2; }
    a.blink = Math.max(0, a.blink - dt);
    const f = r.face;
    f.open.forEach(o => { o.visible = eyes === 'open'; o.scale.y = 1.18 * lid * eyeScale * (a.blink > 0 ? 0.12 : 1); o.scale.x = eyeScale; });
    f.brows.forEach(b => { b.visible = !!brow; if (brow) { b.position.y = b.userData.y + brow.raise; b.rotation.z = Math.PI / 2 - b.userData.s * brow.tilt; } });
    f.closed.forEach(e => (e.visible = eyes === 'closed'));
    f.happy.forEach(e => (e.visible = eyes === 'happy'));
    f.blush.forEach(b => (b.material.opacity = damp(b.material.opacity, blush * 0.75, 5, dt)));
    for (const key in f.mouths) f.mouths[key].visible = key === mouth;
    // ambient particles
    if (asleep && !a.breath) { this.zTimer = (this.zTimer || 0) - dt; if (this.zTimer <= 0) { this.zTimer = 1.3; this.spawn('z', this.headWorld()); } }
    if (m === 'great' && !asleep && !still) { this.sparkTimer = (this.sparkTimer || 0) - dt; if (this.sparkTimer <= 0) { this.sparkTimer = 2.8; this.spawn('spark', this.headWorld(), 1); } }
    if (m === 'great' && !asleep && !still && (t % 5) < dt) this.anim.hop = t;
  }
  updateParticles(dt) {
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const u = s.userData; u.life += dt;
      const k = u.life / u.max;
      if (k >= 1) { s.visible = false; continue; }
      if (!REDUCED.matches) s.position.addScaledVector(u.vel, dt);
      if (u.kind === 'z') s.position.x += Math.sin(u.life * 3) * 0.003;
      if (u.kind === 'spark') u.vel.y -= 2 * dt;
      const pop = k < 0.2 ? springOut(k / 0.2) : 1;
      s.scale.setScalar(u.base * pop * (u.kind === 'z' ? 1 + k * 0.6 : 1));
      s.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      s.material.rotation = u.kind === 'spark' ? u.life * 3 : 0;
    }
  }

  /* ---------- touch ---------- */
  bindPointer() {
    const c = this.canvas;
    c.style.touchAction = 'pan-y';
    const ndc = e => { const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
    const hitsPet = p => { this.raycaster.setFromCamera(p, this.camera); return this.raycaster.intersectObject(this.rig.root, true).length > 0; };
    c.addEventListener('pointermove', e => {
      const p = ndc(e); this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.lastMove = this.time;
      const d = this.pointer.down; if (!d) { c.style.cursor = hitsPet(p) ? 'grab' : ''; return; }
      const dx = e.clientX - d.cx, dy = e.clientY - d.cy;
      d.moved += Math.hypot(e.clientX - d.lx, e.clientY - d.ly); d.lx = e.clientX; d.ly = e.clientY;
      if (d.onPet && d.moved > 10 && hitsPet(p) && !this.anim.hugOn) {
        clearTimeout(d.hugTimer);
        this.anim.stroke = Math.min(1, this.anim.stroke + 0.12); this.anim.strokeLean = clamp(dx / 60, -1, 1);
        this.anim.strokeDist += Math.hypot(dx, dy) > 0 ? 1 : 0;
        if (d.moved - d.lastHeart > 70) { d.lastHeart = d.moved; this.spawn('heart', this.headWorld()); this.emit('stroke'); this.wakeIfAsleep(); }
      }
    });
    c.addEventListener('pointerdown', e => {
      const p = ndc(e); const onPet = hitsPet(p);
      this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.lastMove = this.time;
      this.lastInteract = this.time;
      this.pointer.down = { cx: e.clientX, cy: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, lastHeart: 0, at: performance.now(), onPet };
      if (onPet) {
        c.style.cursor = 'grabbing';
        this.pointer.down.hugTimer = setTimeout(() => {
          if (!this.pointer.down || this.pointer.down.moved > 12) return;
          this.anim.hugOn = true; this.spawn('heart', this.headWorld(), 4); this.wakeIfAsleep(); navigator.vibrate?.([8, 40, 8]); this.emit('hug');
        }, 550);
      }
    });
    const end = () => {
      const d = this.pointer.down; if (!d) return;
      clearTimeout(d.hugTimer);
      const quick = performance.now() - d.at < 380 && d.moved < 10;
      if (this.anim.hugOn) { this.anim.hugOn = false; this.anim.happy = 1.2; this.anim.pop = this.time; }
      else if (d.onPet && quick) this.tap();
      this.pointer.down = null; c.style.cursor = '';
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => { if (this.pointer.down) clearTimeout(this.pointer.down.hugTimer); this.pointer.down = null; this.anim.hugOn = false; });
    c.addEventListener('pointerleave', () => { if (this.pointer.down && !this.anim.hugOn) end(); this.pointer.lastMove = this.time - 1.5; });
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.tap(); } });
  }
  wakeIfAsleep(fromUser = true) { if (this.state.asleep && this.time - this.anim.wake > 7) { this.anim.wake = this.time; this.anim.yawn = this.time + 0.2; if (fromUser) this.emit('wake'); return true; } return false; }
  stir() { return this.wakeIfAsleep(false); }
  tap() {
    this.lastInteract = this.time;
    navigator.vibrate?.(10);
    if (this.wakeIfAsleep()) return;
    this.anim.hop = this.time; this.anim.happy = 0.9;
    this.spawn('heart', this.headWorld(), 2);
    this.emit('pet');
  }

  updateLabel() {
    const fn = this.labeler; if (fn) this.canvas.setAttribute('aria-label', fn(this.state));
  }

  /* ---------- loop ---------- */
  tick(now) {
    requestAnimationFrame(this._tick);
    if (!this.canvas.isConnected || document.hidden) { this.last = null; return; }
    const t = now / 1000; const dt = Math.min(0.05, this.last ? t - this.last : 0.016); this.last = t;
    this.time += dt;
    this.skyTimer = (this.skyTimer || 0) - dt; if (this.skyTimer <= 0) { this.skyTimer = 1; this.applySky(); }
    this.waterU.uT.value = REDUCED.matches ? 0 : this.time;
    this.updateWeather(dt);
    this.updateLighting(dt);
    this.updateWalk(dt);
    this.updatePet(dt);
    this.updateParticles(dt);
    const k = 1 - Math.exp(-4.5 * dt);
    this.camPos.lerp(this.camGoal.pos, k); this.camTarget.lerp(this.camGoal.target, k);
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTarget);
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------- studio thumbnails ---------- */
  thumb(species, item = null, size = 200) {
    const key = `${species}|${item || ''}|${size}`;
    if (this.thumbs.has(key)) return this.thumbs.get(key);
    if (!this.studio) {
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight('#ffffff', '#9fbf8a', 2.2));
      const key1 = new THREE.DirectionalLight('#fff3df', 2.8); key1.position.set(2, 4, 5); sc.add(key1);
      const rim = new THREE.DirectionalLight('#cfe8ff', 1.4); rim.position.set(-4, 2, -3); sc.add(rim);
      this.studio = { scene: sc, cam: new THREE.PerspectiveCamera(28, 1, 0.1, 50) };
    }
    const { scene: sc, cam } = this.studio;
    const holder = new THREE.Group(); sc.add(holder);
    let target;
    if (item === 'bridge') {
      const b = this.bridge.clone(true); b.position.set(0, 0, 0); b.rotation.y = Math.PI / 2 - 0.5;
      const lit = new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: new THREE.Color('#ffc86b'), emissiveIntensity: 1.6 });
      b.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry') { o.visible = true; o.material = lit; } });
      holder.add(b); target = new THREE.Box3().setFromObject(holder);
    } else {
      const rig = buildRig(species);
      if (item && item !== 'species') buildAccessory(item, rig);
      rig.root.rotation.y = 0.35; rig.face.open.forEach(e => (e.visible = true));
      if (rig.face.mouths.smile) rig.face.mouths.smile.visible = true;
      rig.face.blush.forEach(b => (b.material.opacity = 0.45));
      holder.add(rig.root); target = new THREE.Box3().setFromObject(holder);
    }
    const c = target.getCenter(new THREE.Vector3()), s = target.getSize(new THREE.Vector3());
    const dist = Math.max(s.x, s.y * 1.05, s.z) / (2 * Math.tan(THREE.MathUtils.degToRad(14))) * 1.12;
    cam.position.set(c.x, c.y + dist * 0.18, c.z + dist); cam.lookAt(c); cam.aspect = 1; cam.updateProjectionMatrix();
    const r = this.renderer;
    const prevPR = r.getPixelRatio(), prevSize = r.getSize(new THREE.Vector2()), prevShadow = r.shadowMap.enabled;
    r.setPixelRatio(1); r.setSize(size, size, false); r.shadowMap.enabled = false;
    r.render(sc, cam);
    const url = this.canvas.toDataURL('image/png');
    r.setPixelRatio(prevPR); r.setSize(prevSize.x, prevSize.y, false); r.shadowMap.enabled = prevShadow;
    sc.remove(holder);
    if (this.canvas.isConnected) r.render(this.scene, this.camera);
    this.thumbs.set(key, url);
    return url;
  }
}

window.CompanionWorld = CompanionWorld;
window.dispatchEvent(new Event('companion-ready'));
