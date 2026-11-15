/* OrbitImages adapted from user-supplied React Bits source.
Component by Dominik Koch https://x.com/dominikkoch
React Bits https://github.com/DavidHDev/react-bits
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**

What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
window.BRCOrbit = (() => {
const SAMPLES = 720;
const FRONT_GROW = 0.3;
const BACK_SHRINK = 0.45;
const BACK_DIM = 0.55;
const INTRO_SPREAD = 1.3;
const INTRO_FADE = 0.45;
const DRAG_THRESHOLD = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));


const wrapSigned = value => value - Math.round(value);

const cubicBezier = (x1, y1, x2, y2) => {
  const sample = (a1, a2, t) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
  const slope = (a1, a2, t) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
  return x => {
    if (x <= 0 || x >= 1) return x;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(x1, x2, t);
      if (Math.abs(s) < 1e-6) break;
      t = clamp(t - (sample(x1, x2, t) - x) / s, 0, 1);
    }
    return sample(y1, y2, t);
  };
};

const EASINGS = {
  linear: t => t,
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1)
};

const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

const createEngine = (root, config, setAspect) => {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const st = {
    lut: null,
    length: 0,
    front: 0,
    yMid: 0,
    yHalf: 1,
    bbox: [0, 0, 1, 1],
    width: 0,
    height: 0,
    scale: 0,
    size: 0,
    items: [],
    strokes: [],
    lap: 0,
    manual: 0,
    glide: 0,
    speed: 1,
    drag: null,
    seek: null,
    hovered: false,
    hoverIndex: -1,
    suppressUntil: 0,
    introStart: -1,
    introDone: !config.current.intro,
    visible: typeof IntersectionObserver === 'undefined',
    reduced: !!query?.matches,
    raf: 0,
    last: 0,
    destroyed: false
  };
  st.speed = st.reduced || config.current.paused ? 0 : 1;

  const collect = () => {
    st.items = Array.from(root.querySelectorAll('[data-orbit-item]')).map(el => ({ el, t: '', o: '', z: '' }));
    st.strokes = Array.from(root.querySelectorAll('[data-orbit-stroke]'));
  };

  const build = () => {
    const cfg = config.current;
    const path = root.querySelector('[data-orbit-path]');
    let length = 0;
    try {
      length = path ? path.getTotalLength() : 0;
    } catch {
      length = 0;
    }
    if (!path || !length || !isFinite(length)) {
      st.lut = null;
      return;
    }
    const lut = new Float32Array(SAMPLES * 2);
    const angle = (cfg.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const origin = cfg.baseWidth / 2;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let front = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const point = path.getPointAtLength((i / SAMPLES) * length);
      const dx = point.x - origin;
      const dy = point.y - origin;
      const x = origin + dx * cos - dy * sin;
      const y = origin + dx * sin + dy * cos;
      lut[i * 2] = x;
      lut[i * 2 + 1] = y;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      if (y > lut[front * 2 + 1] + 1e-6) front = i;
    }
    st.lut = lut;
    st.length = length;
    st.front = front / SAMPLES;
    st.yMid = (y0 + y1) / 2;
    st.yHalf = Math.max(1e-3, (y1 - y0) / 2);
    const depth = clamp(cfg.depth, 0, 1);
    const margin = (cfg.itemSize / 2) * (1 + depth * FRONT_GROW) * Math.max(1, cfg.hoverScale) + 2;
    st.bbox = [x0 - margin, y0 - margin, x1 + margin, y1 + margin];
    setAspect((x1 - x0 + margin * 2) / (y1 - y0 + margin * 2));
  };

  const layout = () => {
    const cfg = config.current;
    st.width = root.clientWidth;
    st.height = root.clientHeight;
    if (!st.lut) return;
    const [bx0, by0, bx1, by1] = st.bbox;
    const scale = Math.min(st.width / (bx1 - bx0), st.height / (by1 - by0));
    st.scale = scale > 0 && isFinite(scale) ? scale : 0;
    st.size = cfg.itemSize * st.scale;
    for (const it of st.items) {
      it.el.style.width = `${st.size}px`;
      it.el.style.height = `${st.size}px`;
    }
    if (!st.scale) return;
    const vw = st.width / st.scale;
    const vh = st.height / st.scale;
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    root.querySelectorAll('[data-orbit-svg]').forEach(svg => {
      svg.setAttribute('viewBox', `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`);
    });
    const clip = root.querySelector('[data-orbit-clip]');
    if (clip) {
      clip.setAttribute('x', String(cx - vw));
      clip.setAttribute('y', String(st.yMid));
      clip.setAttribute('width', String(vw * 2));
      clip.setAttribute('height', String(vh * 2));
    }
    for (const stroke of st.strokes) {
      stroke.style.strokeWidth = String(cfg.pathWidth / st.scale);
    }
    applyDash(1);
  };

  const applyDash = reveal => {
    const cfg = config.current;
    const dash = cfg.pathDash > 0 && st.scale ? cfg.pathDash / st.scale : 0;
    for (const stroke of st.strokes) {
      if (reveal < 1 && !dash) {
        stroke.style.strokeDasharray = `${st.length} ${st.length}`;
        stroke.style.strokeDashoffset = String(st.length * (1 - reveal));
        stroke.style.opacity = '';
      } else {
        stroke.style.strokeDasharray = dash ? `${dash} ${dash * 1.6}` : '';
        stroke.style.strokeDashoffset = '';
        stroke.style.opacity = reveal < 1 ? String(reveal) : '';
      }
    }
  };

  const sample = u => {
    const f = (((u % 1) + 1) % 1) * SAMPLES;
    const i0 = Math.floor(f) % SAMPLES;
    const i1 = (i0 + 1) % SAMPLES;
    const t = f - Math.floor(f);
    const lut = st.lut;
    return [lut[i0 * 2] + (lut[i1 * 2] - lut[i0 * 2]) * t, lut[i0 * 2 + 1] + (lut[i1 * 2 + 1] - lut[i0 * 2 + 1]) * t];
  };

  const heading = u => {
    const a = sample(u - 2 / SAMPLES);
    const b = sample(u + 2 / SAMPLES);
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  };

  const progress = () => {
    const cfg = config.current;
    const ease = EASINGS[cfg.easing] || EASINGS.linear;
    const whole = Math.floor(st.lap);
    return (whole + ease(st.lap - whole)) * (cfg.direction === 'reverse' ? -1 : 1) + st.manual;
  };

  const offsetOf = (index, count) => {
    const cfg = config.current;
    if (cfg.fill) return index / Math.max(1, count);
    return (-index * cfg.itemSize * 1.3) / Math.max(1, st.length);
  };

  const write = (it, key, prop, value) => {
    if (it[key] !== value) {
      it[key] = value;
      it.el.style[prop] = value;
    }
  };

  const render = now => {
    const cfg = config.current;
    if (!st.lut || !st.scale) return;
    const p = progress();
    const count = st.items.length;
    const depth = clamp(cfg.depth, 0, 1);
    const [bx0, by0, bx1, by1] = st.bbox;
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const half = st.size / 2;
    const introRunning = st.introStart >= 0;
    const elapsed = introRunning ? (now - st.introStart) / 1000 : 0;
    const spread = introRunning ? easeOutQuint(clamp(elapsed / INTRO_SPREAD, 0, 1)) : 1;
    const appear = introRunning ? clamp(elapsed / INTRO_FADE, 0, 1) : 1;
    let frontIndex = -1, frontDepth = -Infinity, frontSide = 1;
    for (let i = 0; i < count; i++) {
      const it = st.items[i];
      let u = p + offsetOf(i, count);
      if (introRunning) u = st.front + wrapSigned(u - st.front) * spread;
      const [x, y] = sample(u);
      const d = clamp((y - st.yMid) / st.yHalf, -1, 1);
      if (d > frontDepth) { frontIndex = i; frontDepth = d; frontSide = Math.sign(x - cx) || 1; }
      const w = (d + 1) / 2;
      let scale = 1 + depth * (FRONT_GROW * w - BACK_SHRINK * (1 - w));
      let opacity = 1 - depth * BACK_DIM * (1 - w);
      if (introRunning) {
        scale *= 0.7 + 0.3 * appear;
        opacity *= appear * appear * (3 - 2 * appear);
      }
      const sx = (x - cx) * st.scale + st.width / 2 - half;
      const sy = (y - cy) * st.scale + st.height / 2 - half;
      const rot = cfg.alignToPath ? heading(u) : 0;
      let z = depth > 0 ? (d <= 0 ? 10 + Math.round((d + 1) * 80) : 110 + Math.round(d * 80)) : 1;
      if (i === st.hoverIndex) z += 200;
      write(
        it,
        't',
        'transform',
        `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0px)${rot ? ` rotate(${rot.toFixed(2)}deg)` : ''} scale(${scale.toFixed(4)})`
      );
      write(it, 'o', 'opacity', opacity > 0.999 ? '' : opacity.toFixed(3));
      write(it, 'z', 'zIndex', String(z));
    }
    if (frontIndex >= 0 && frontIndex !== st.frontIndex) {
      st.frontIndex = frontIndex;
      cfg.onFrontChange?.(frontIndex, frontSide);
    }
    if (introRunning) applyDash(easeOutQuint(clamp(elapsed / INTRO_SPREAD, 0, 1)));
  };

  const frame = now => {
    st.raf = 0;
    if (st.destroyed) return;
    const cfg = config.current;
    const dt = st.last ? clamp((now - st.last) / 1000, 0, 0.1) : 0;
    st.last = now;
    let busy = false;
    if (st.lut && st.scale && st.introStart === -1 && !st.introDone && st.visible) {
      if (cfg.intro && !st.reduced) {
        st.introStart = now;
      } else {
        st.introDone = true;
      }
      root.removeAttribute('data-intro');
    }
    if (st.introStart >= 0) {
      if ((now - st.introStart) / 1000 >= INTRO_SPREAD) {
        st.introStart = -2;
        st.introDone = true;
        applyDash(1);
      } else {
        busy = true;
      }
    }
    const want = cfg.paused || st.reduced || document.hidden ? 0 : st.hovered ? clamp(cfg.hoverSpeed, 0, 1) : 1;
    if (st.speed !== want) {
      st.speed += (want - st.speed) * (1 - Math.exp(-dt / 0.35));
      if (Math.abs(st.speed - want) < 0.002) st.speed = want;
      busy = true;
    }
    if (st.speed > 0 && cfg.duration > 0) {
      st.lap += (dt * st.speed) / cfg.duration;
      busy = true;
    }
    if (st.drag?.active) {
      busy = true;
    } else if (st.seek) {
      st.seek.t = Math.min(1, st.seek.t + dt / st.seek.dur);
      const e = st.seek.t < 0.5 ? 4 * st.seek.t ** 3 : 1 - Math.pow(-2 * st.seek.t + 2, 3) / 2;
      st.manual = st.seek.from + st.seek.delta * e;
      if (st.seek.t >= 1) st.seek = null;
      busy = true;
    } else if (st.glide) {
      st.manual += st.glide * dt;
      st.glide *= Math.exp(-dt / 0.7);
      if (Math.abs(st.glide) < 0.0004) st.glide = 0;
      busy = true;
    }
    render(now);
    const whole = Math.floor(st.lap);
    if (whole) st.lap -= whole;
    if (!st.drag && !st.seek) st.manual -= Math.floor(st.manual);
    if (busy && st.visible && !st.destroyed) st.raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (st.raf || st.destroyed || !st.visible) return;
    st.last = 0;
    st.raf = requestAnimationFrame(frame);
  };

  const local = e => {
    const r = root.getBoundingClientRect();
    const k = root.offsetWidth ? r.width / root.offsetWidth || 1 : 1;
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  };

  const dragRate = () => {
    if (!st.lut || !st.scale) return 0;
    const a = sample(st.front - 3 / SAMPLES);
    const b = sample(st.front + 3 / SAMPLES);
    const along = ((b[0] - a[0]) / (6 / SAMPLES)) * st.scale;
    const floor = st.length * st.scale * 0.35;
    return Math.abs(along) < floor ? Math.sign(along || 1) * floor : along;
  };

  const itemIndex = target => {
    const el = target instanceof Element ? target.closest('[data-orbit-item]') : null;
    return el && root.contains(el) ? Number(el.getAttribute('data-orbit-item')) : -1;
  };

  const bringToFront = index => {
    if (!st.lut || index < 0) return;
    const u = progress() + offsetOf(index, st.items.length);
    const delta = wrapSigned(st.front - u);
    st.glide = 0;
    if (st.reduced) { st.manual += delta; render(performance.now()); return; }
    st.seek = { from: st.manual, delta, t: 0, dur: 0.45 + Math.abs(delta) * 1.4 };
    wake();
  };

  const onEnter = () => {
    st.hovered = true;
    wake();
  };

  const onLeave = () => {
    st.hovered = false;
    st.hoverIndex = -1;
    wake();
  };

  const onOver = e => {
    const index = itemIndex(e.target);
    if (index !== st.hoverIndex) {
      st.hoverIndex = index;
      if (st.lut) render(performance.now());
    }
  };

  const onDown = e => {
    const cfg = config.current;
    if (!cfg.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target instanceof Element && e.target.closest('[data-orbit-center]')) return;
    const [x, y] = local(e);
    st.drag = { id: e.pointerId, x, y, active: false, samples: [], rate: dragRate(), anchor: 0, manual: 0 };
  };

  const onMove = e => {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    const [x, y] = local(e);
    const along = x - d.x;
    if (!d.active) {
      if (Math.abs(along) < DRAG_THRESHOLD) return;
      if (Math.abs(y - d.y) > Math.abs(along)) {
        st.drag = null;
        return;
      }
      d.active = true;
      d.anchor = along;
      d.manual = st.manual;
      st.seek = null;
      st.glide = 0;
      try {
        root.setPointerCapture(e.pointerId);
      } catch {}
      root.setAttribute('data-dragging', '');
    }
    if (d.rate) st.manual = d.manual + (along - d.anchor) / d.rate;
    const now = performance.now();
    d.samples.push([now, along]);
    while (d.samples.length > 2 && now - d.samples[0][0] > 100) d.samples.shift();
    wake();
  };

  const endDrag = (e, cancelled) => {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    st.drag = null;
    if (!d.active) return;
    root.removeAttribute('data-dragging');
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {}
    const now = performance.now();
    st.suppressUntil = now + 400;
    const s = d.samples;
    if (!cancelled && s.length > 1 && d.rate) {
      const [t0, a0] = s[0];
      const [t1, a1] = s[s.length - 1];
      if (t1 > t0 && now - t1 < 80) st.glide = clamp((((a1 - a0) / (t1 - t0)) * 1000) / d.rate, -3, 3);
    }
    wake();
  };

  const onUp = e => endDrag(e, false);
  const onCancel = e => endDrag(e, true);

  const activate = index => {
    const cfg = config.current;
    if (index < 0) return;
    if (cfg.clickToFront) bringToFront(index);
    cfg.onItemClick?.(index, cfg.sources[index]);
  };

  const onClick = e => {
    if (performance.now() < st.suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
      st.suppressUntil = 0;
      return;
    }
    activate(itemIndex(e.target));
  };

  const onKey = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const index = itemIndex(e.target);
    if (index < 0) return;
    e.preventDefault();
    activate(index);
  };

  const onFocus = e => {
    const index = itemIndex(e.target);
    if (index >= 0 && config.current.clickToFront && e.target instanceof Element && e.target.matches(':focus-visible'))
      bringToFront(index);
  };

  const onMotion = () => {
    st.reduced = !!query?.matches;
    wake();
  };

  root.addEventListener('pointerenter', onEnter);
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onCancel);
  root.addEventListener('lostpointercapture', onCancel);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  root.addEventListener('focusin', onFocus);
  query?.addEventListener?.('change', onMotion);

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      layout();
      render(performance.now());
      wake();
    });
    resizeObserver.observe(root);
  }

  let intersection = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersection = new IntersectionObserver(
      entries => {
        st.visible = entries[entries.length - 1].isIntersecting;
        if (st.visible) wake();
      },
      { threshold: 0.05 }
    );
    intersection.observe(root);
  }

  const onVisibility = () => {
    if (document.hidden) { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; st.last = 0; } else wake();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', wake);

  const refresh = () => {
    collect();
    build();
    layout();
    render(performance.now());
    wake();
  };

  const destroy = () => {
    st.destroyed = true;
    if (st.raf) cancelAnimationFrame(st.raf);
    root.removeEventListener('pointerenter', onEnter);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerover', onOver);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onCancel);
    root.removeEventListener('lostpointercapture', onCancel);
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKey);
    root.removeEventListener('focusin', onFocus);
    query?.removeEventListener?.('change', onMotion);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', wake);
    resizeObserver?.disconnect();
    intersection?.disconnect();
  };

  return { refresh, wake, destroy, bringToFront };
};


return createEngine;
})();
