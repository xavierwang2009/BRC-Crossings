/* Local adaptation of the user-supplied Framer QuickMotionCursor.
   Source: https://framer.com/m/QuickMotionCursor-1BnR.js@H13RbhTGrUJQVZna5DRn
   Preserves its 20 circles, 20px size, 2px blur and .2/.17 following rates. */
(() => {
  if (new URLSearchParams(location.search).get('cursor') !== 'quick') return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scope = document.querySelector('#app');
  let cleanup;
  function mount() {
    const root = document.createElement('div');
    root.className = 'quick-cursor'; root.setAttribute('aria-hidden', 'true');
    const trail = Array.from({length:20}, (_,i) => {
      const el = document.createElement('span');
      el.style.opacity = String(1 - i / 20 * .6); root.appendChild(el);
      return {el,x:0,y:0};
    });
    document.body.appendChild(root);
    let raf = 0, last = 0, inside = false, x = 0, y = 0;
    function hide() {
      inside = false; last = 0; cancelAnimationFrame(raf); raf = 0;
      root.style.visibility = 'hidden'; scope.classList.remove('quick-cursor-active');
    }
    function frame(now) {
      raf = 0;
      if (!inside || document.hidden) return hide();
      const dt = last ? Math.min((now-last)/1000,.05) : 1/60;
      last = now;
      let goalX = x, goalY = y, moving = false;
      trail.forEach((p,i) => {
        const rate = 1 - Math.pow(1 - (i ? .17 : .2), dt*60);
        p.x += (goalX-p.x)*rate; p.y += (goalY-p.y)*rate;
        p.el.style.transform = `translate3d(${p.x-10}px,${p.y-10}px,0)`;
        moving ||= Math.abs(goalX-p.x)+Math.abs(goalY-p.y)>.05;
        goalX = p.x; goalY = p.y;
      });
      if (moving) raf = requestAnimationFrame(frame); else last = 0;
    }
    function move(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!scope.contains(e.target)) return hide();
      x = e.clientX; y = e.clientY;
      if (!inside) trail.forEach(p => {p.x=x;p.y=y;});
      inside = true; root.style.visibility = 'visible'; scope.classList.add('quick-cursor-active');
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function key(e) { if (e.key === 'Tab' || e.key === 'Escape') hide(); }
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('blur',hide);
    window.addEventListener('keydown',key);
    document.documentElement.addEventListener('pointerleave',hide);
    document.addEventListener('visibilitychange',hide);
    return () => {
      hide(); root.remove();
      window.removeEventListener('pointermove',move); window.removeEventListener('blur',hide);
      window.removeEventListener('keydown',key); document.documentElement.removeEventListener('pointerleave',hide);
      document.removeEventListener('visibilitychange',hide);
    };
  }
  function sync() { cleanup?.(); cleanup = fine.matches && !reduced.matches ? mount() : null; }
  fine.addEventListener('change',sync); reduced.addEventListener('change',sync);
  window.addEventListener('pagehide',()=>{cleanup?.();cleanup=null;});
  window.addEventListener('pageshow',sync);
  sync();
})();
