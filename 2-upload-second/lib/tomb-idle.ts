// Decorative idle animation: after five idle minutes a small tomb opens and a skeleton
// walks out pulling a toy car on a rope. Any activity sends them home and the lid closes.
// Pure DOM so it never touches app state. The layer ignores all pointer and keyboard input.

type State = 'resting' | 'tremble' | 'opening' | 'emerging' | 'roaming' | 'returning' | 'closing' | 'lidclose';
const IDLE_MS = 300000;
const IVORY = '#E9DDC4', IVORY_BACK = '#CFC3AA', PLUM = '#34143F', PLUM_BLACK = '#17121F', SLATE = '#5D5965', BRASS = '#B89B66', ROPE = '#AA8C62';
let mounted = false;

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

function skeletonSvg() {
  const bone = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let ribs = '';
  for (let i = 0; i < 5; i++) { const y = -80 + i * 5; ribs += `<path d="M-1,${y} C-7,${y} -8,${y + 4} -3,${y + 5}" stroke="${IVORY_BACK}" stroke-width="1.5"/><path d="M-1,${y} C9,${y - 1} 10,${y + 4} 3,${y + 5}" stroke-width="1.7"/>`; }
  const leg = (cls: string, x: number, color: string) => `<g class="sk-leg${cls}" stroke="${color}">${bone(0, 0, 0, 23)}<g class="sk-shin${cls}">${bone(0, 0, 0, 22)}${bone(0, 22, 6, 23)}</g></g>`;
  return `<svg viewBox="-35 -114 70 120" width="100%" height="100%" overflow="visible"><g class="sk-flip" fill="none" stroke="${IVORY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<ellipse cx="0" cy="1.5" rx="14" ry="2.6" fill="${PLUM_BLACK}" stroke="none" opacity=".2"/>
<g class="sk-bob">
<g class="sk-armB" stroke="${IVORY_BACK}">${bone(0, 0, 0, 17)}${bone(0, 17, 0, 34)}<circle cx="0" cy="34" r="2" fill="${IVORY_BACK}" stroke="none"/></g>
${leg('B', -2, IVORY_BACK)}
<path d="M0,-87 C-1.5,-74 1,-60 0,-50" stroke-width="2.6"/>${ribs}
<line x1="-6" y1="-83" x2="7" y2="-83" stroke-width="2.2"/>
<path d="M-6.5,-51 C-7.5,-43 7.5,-43 6.5,-51 C3,-48 -3,-48 -6.5,-51Z" fill="${IVORY}" stroke-width="1.4"/>
<g class="sk-head"><rect x="0.5" y="-93.5" width="7.5" height="5.5" rx="2.2" fill="${IVORY}" stroke="none"/><ellipse cx="1.5" cy="-99" rx="7.6" ry="8.4" fill="${IVORY}" stroke="none"/>
<ellipse cx="4.6" cy="-99" rx="1.8" ry="2.2" fill="${PLUM_BLACK}" stroke="none"/><ellipse cx="-0.4" cy="-99.2" rx="1.5" ry="2" fill="${PLUM_BLACK}" stroke="none" opacity=".85"/>
<path d="M2.6,-95.6 l.8,1.6 h-1.6z" fill="${PLUM_BLACK}" stroke="none" opacity=".7"/><line x1="1.5" y1="-91.6" x2="7" y2="-91.6" stroke="${PLUM_BLACK}" stroke-width=".5" opacity=".55"/></g>
${leg('F', 2, IVORY)}
<g class="sk-armF">${bone(0, 0, 0, 17)}<g transform="translate(0,17) rotate(-14)">${bone(0, 0, 0, 16)}<circle cx="0" cy="16" r="2" fill="${IVORY}" stroke="none"/></g></g>
</g></g></svg>`;
}
function carSvg() {
  const wheel = (cls: string, x: number) => `<g transform="translate(${x},-5)"><g class="car-wheel${cls}"><circle r="5" fill="${PLUM_BLACK}"/><circle r="2.3" fill="${BRASS}"/><line x1="-4" y1="0" x2="4" y2="0" stroke="${BRASS}" stroke-width=".8"/><line x1="0" y1="-4" x2="0" y2="4" stroke="${BRASS}" stroke-width=".8"/></g></g>`;
  return `<svg viewBox="-36 -30 72 34" width="100%" height="100%" overflow="visible"><g class="car-flip">
<ellipse cx="0" cy="0.5" rx="30" ry="2.4" fill="${PLUM_BLACK}" opacity=".2"/>
<path d="M-29,-7 V-15 Q-28,-19 -23,-19 H-13 L-8,-26 H12 L19,-19 L26,-18 Q31,-17 31,-12 V-7Z" fill="${PLUM}"/>
<path d="M-11,-19.5 L-7,-24.4 H1 V-19.5Z M3,-24.4 H11 L15.5,-19.5 H3Z" fill="#F5F0E8" opacity=".55"/>
<path d="M-28,-16 Q-27,-18 -23,-18 H-13" fill="none" stroke="#fff" stroke-width=".7" opacity=".25"/>
<rect x="-26" y="-17.6" width="46" height="8.2" rx="2.2" fill="${IVORY}"/>
<line x1="-29" y1="-8.2" x2="31" y2="-8.2" stroke="${BRASS}" stroke-width="1"/>
<circle cx="32.5" cy="-11" r="1.6" fill="none" stroke="${BRASS}" stroke-width="1"/>
<g class="car-label"><text x="-3" y="-11.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="5.6" font-weight="700" fill="${PLUM}" textLength="41" lengthAdjust="spacingAndGlyphs">I love genaper</text></g>
${wheel('R', -17)}${wheel('F', 17)}</g></svg>`;
}
const tombBackSvg = `<svg viewBox="0 0 72 66" width="100%" height="100%" overflow="visible"><ellipse cx="36" cy="63" rx="36" ry="3" fill="${PLUM_BLACK}" opacity=".18"/><path d="M19,40 V17 a17,17 0 0 1 34,0 V40Z" fill="${SLATE}"/><path d="M24,36 V18 a12,12 0 0 1 24,0 V36" fill="none" stroke="#4b4753" stroke-width="1.2"/><path d="M19,17 a17,17 0 0 1 12,-16" fill="none" stroke="#fff" stroke-width="1" opacity=".18"/><rect x="9" y="33" width="54" height="8" rx="3" fill="${PLUM_BLACK}"/></svg>`;
const tombFrontSvg = `<svg viewBox="0 0 72 66" width="100%" height="100%" overflow="visible"><rect x="6" y="36" width="60" height="24" rx="4" fill="#3a3142"/><rect x="6" y="36" width="60" height="5" rx="2.5" fill="#fff" opacity=".07"/><line x1="10" y1="45" x2="62" y2="45" stroke="${BRASS}" stroke-width="1"/><rect x="3" y="57" width="66" height="6" rx="2.5" fill="${SLATE}"/><g class="tomb-lid"><rect x="4" y="29" width="64" height="9" rx="4.5" fill="#6b6774"/><rect x="8" y="30.5" width="56" height="2" rx="1" fill="#fff" opacity=".2"/></g></svg>`;

export function mountTombIdle(root: HTMLElement, options: {idleMs?: number} = {}) {
  if (mounted) return () => {};
  mounted = true;
  const preview = Number(new URLSearchParams(location.search).get('tomb'));
  const idleMs = options.idleMs ?? (Number.isFinite(preview) && preview >= 3 ? preview * 1000 : IDLE_MS);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make = (cls: string, html: string) => { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; el.style.cssText = 'position:absolute;left:0;top:0;will-change:transform'; root.appendChild(el); return el; };
  const tombBack = make('tomb-back', tombBackSvg);
  const carEl = make('tomb-car', carSvg());
  const skEl = make('tomb-skeleton', skeletonSvg());
  const ropeEl = make('tomb-rope', `<svg width="100%" height="100%" overflow="visible"><path fill="none" stroke="${ROPE}" stroke-width="1.6" stroke-linecap="round"/></svg>`);
  const tombFront = make('tomb-front', tombFrontSvg);
  ropeEl.style.cssText = 'position:absolute;inset:0;will-change:auto';
  const q = (el: Element, sel: string) => el.querySelector(sel) as SVGElement;
  const ropePath = q(ropeEl, 'path'), lidEl = q(tombFront, '.tomb-lid');
  const skFlip = q(skEl, '.sk-flip'), skBob = q(skEl, '.sk-bob'), armB = q(skEl, '.sk-armB'), armF = q(skEl, '.sk-armF'), legB = q(skEl, '.sk-legB'), legF = q(skEl, '.sk-legF'), shinB = q(skEl, '.sk-shinB'), shinF = q(skEl, '.sk-shinF'), head = q(skEl, '.sk-head');
  const carFlip = q(carEl, '.car-flip'), carLabel = q(carEl, '.car-label'), wheelF = q(carEl, '.car-wheelF'), wheelR = q(carEl, '.car-wheelR');

  let W = 0, H = 0, s = 1, cx = 0, ground = 0, rimY = 0, exitDir = -1, exitX = 0, carHomeX = 0;
  let state: State = 'resting', stateAt = 0, lastActivity = performance.now(), timer: ReturnType<typeof setTimeout> | null = null, frame = 0, last = 0;
  let lid = 0, emerge = 0, shake = 0;
  const sk = {x: 0, y: 0, f: -1, dir: -1, phase: 0, amp: 0, clip: 0, visible: false};
  const car = {x: 0, y: 0, f: -1, dir: -1, wheel: 0, k: 1, alpha: 0};
  let target = {x: 0, y: 0}, pauseUntil = 0, returnSpeed = 90;
  const closing = {from: {skx: 0, sky: 0, clip: 0, carx: 0, cary: 0, cark: 1, carAlpha: 0}, skInside: false, duration: 1500};

  function layout() {
    W = window.innerWidth; H = window.innerHeight; s = W < 720 ? .72 : 1;
    const right = W >= 720;
    const left = right ? W - 14 - 72 * s : 10;
    ground = H - 8; cx = left + 36 * s; rimY = ground - 26 * s; exitDir = right ? -1 : 1;
    exitX = cx + exitDir * 122 * s; carHomeX = cx + exitDir * 54 * s;
    for (const el of [tombBack, tombFront]) { el.style.width = 72 * s + 'px'; el.style.height = 66 * s + 'px'; }
    skEl.style.width = 70 * s + 'px'; skEl.style.height = 120 * s + 'px';
    carEl.style.width = 72 * s + 'px'; carEl.style.height = 34 * s + 'px';
    if (state === 'roaming') { target.x = clamp(target.x, laneMin(), laneMax()); target.y = clamp(target.y, ground - 24 * s, ground); sk.x = clamp(sk.x, laneMin(), laneMax()); sk.y = clamp(sk.y, ground - 24 * s, ground); car.x = clamp(car.x, 36 * s, W - 36 * s); }
    render();
  }
  const laneMin = () => 40 * s + 8, laneMax = () => W - 40 * s - 8;
  const ropeLen = () => 110 * s * (2 / 1.7);
  function hand() { const a = (30 + 6 * Math.sin(sk.phase) * sk.amp) * Math.PI / 180; return {x: sk.x + sk.f * (-2 - 34 * Math.sin(a)) * s, y: sk.y + (-81 + 34 * Math.cos(a)) * s - bob() * s}; }
  const bob = () => Math.abs(Math.sin(sk.phase)) * 1.6 * sk.amp;
  const tow = () => ({x: car.x + car.f * 32.5 * s * car.k, y: car.y - 11 * s * car.k});

  function render() {
    const shakeX = shake ? Math.sin(shake * 34) * 1.6 * Math.sin(Math.PI * clamp(shake % .3 / .3)) : 0, shakeR = shake ? Math.sin(shake * 34) * .8 : 0;
    const tombT = `translate3d(${cx - 36 * s + shakeX}px,${ground - 62 * s}px,0) rotate(${shakeR}deg)`;
    tombBack.style.transform = tombT; tombFront.style.transform = tombT;
    const o = ease(lid);
    lidEl.setAttribute('transform', `translate(${-exitDir * 20 * o},${-5 * o}) rotate(${exitDir * 12 * o},36,34)`);
    skEl.style.display = sk.visible ? '' : 'none';
    carEl.style.display = car.alpha > 0 ? '' : 'none';
    ropeEl.style.display = sk.visible && car.alpha > .05 ? '' : 'none';
    if (sk.visible) {
      skEl.style.transform = `translate3d(${sk.x - 35 * s}px,${sk.y - 114 * s}px,0)`;
      skEl.style.clipPath = sk.clip > 0 ? `inset(-20px -20px ${sk.clip + 6 * s}px -20px)` : '';
      const p = sk.phase, a = sk.amp;
      skFlip.setAttribute('transform', `scale(${Math.abs(sk.f) < .08 ? .08 * (sk.f < 0 ? -1 : 1) : sk.f},1)`);
      skBob.setAttribute('transform', `translate(0,${-bob()})`);
      head.setAttribute('transform', `rotate(${2.5 * Math.sin(p * 2) * a},1,-90)`);
      armB.setAttribute('transform', `translate(-2,-81) rotate(${30 + 6 * Math.sin(p) * a})`);
      armF.setAttribute('transform', `translate(4,-81) rotate(${-20 * Math.sin(p) * a})`);
      legF.setAttribute('transform', `translate(2,-46) rotate(${-22 * Math.sin(p) * a})`);
      shinF.setAttribute('transform', `translate(0,23) rotate(${26 * Math.max(0, -Math.cos(p)) * a})`);
      legB.setAttribute('transform', `translate(-2,-46) rotate(${22 * Math.sin(p) * a})`);
      shinB.setAttribute('transform', `translate(0,23) rotate(${26 * Math.max(0, Math.cos(p)) * a})`);
    }
    if (car.alpha > 0) {
      carEl.style.opacity = String(clamp(car.alpha));
      carEl.style.transformOrigin = '50% 88%';
      carEl.style.transform = `translate3d(${car.x - 36 * s}px,${car.y - 30 * s}px,0) scale(${car.k})`;
      const f = Math.abs(car.f) < .08 ? .08 * (car.f < 0 ? -1 : 1) : car.f;
      carFlip.setAttribute('transform', `scale(${f},1)`);
      carLabel.setAttribute('transform', `translate(-3,0) scale(${f < 0 ? -1 : 1},1) translate(3,0)`);
      const deg = car.wheel * 180 / Math.PI;
      wheelF.setAttribute('transform', `rotate(${deg})`); wheelR.setAttribute('transform', `rotate(${deg})`);
    }
    if (sk.visible && car.alpha > .05) {
      const h = hand(), t = tow(), d = Math.hypot(t.x - h.x, t.y - h.y), L = ropeLen();
      const sag = Math.min(.5 * Math.sqrt(Math.max(0, L * L - d * d)) * .62 + 2, Math.max(2, Math.max(sk.y, car.y) - Math.max(h.y, t.y)));
      ropePath.setAttribute('d', `M${h.x.toFixed(1)},${h.y.toFixed(1)} Q${((h.x + t.x) / 2).toFixed(1)},${(Math.max(h.y, t.y) + sag).toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
      ropeEl.style.opacity = String(clamp(car.alpha));
    }
  }

  function go(next: State, now: number) { state = next; stateAt = now; }
  function pickTarget(now: number) { target = {x: lerp(laneMin(), laneMax(), Math.random()), y: ground - Math.random() * 24 * s}; if (Math.abs(target.x - sk.x) < 120 * s) target.x = sk.x < W / 2 ? laneMax() - Math.random() * W * .25 : laneMin() + Math.random() * W * .25; pauseUntil = now; }
  function walk(dt: number, speed: number) {
    const dx = target.x - sk.x, dy = target.y - sk.y, dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 2) sk.dir = dx > 0 ? 1 : -1;
    sk.f += clamp((sk.dir - sk.f) * dt * 5, -dt * 3.2, dt * 3.2);
    const aligned = clamp((sk.f * sk.dir - .35) / .65), slow = clamp(dist / (40 * s), .25, 1);
    const step = Math.min(dist, speed * s * aligned * slow * dt);
    if (dist > .5) { sk.x += dx / dist * step; sk.y += dy / dist * step; }
    sk.phase += step / (s * 13);
    sk.amp += ((step > .02 ? 1 : 0) - sk.amp) * Math.min(1, dt * 6);
    return dist;
  }
  function pullCar(dt: number) {
    const h = hand();
    car.y += (sk.y - car.y) * Math.min(1, dt * 2);
    const towY = car.y - 11 * s, maxLen = ropeLen() * .94, dy = h.y - towY, reach = Math.sqrt(Math.max(0, maxLen * maxLen - dy * dy));
    if (Math.abs(h.x - car.x) > 44 * s) car.dir = h.x > car.x ? 1 : -1;
    car.f += clamp((car.dir - car.f) * dt * 4, -dt * 2.6, dt * 2.6);
    const towX = car.x + car.f * 32.5 * s, gap = h.x - towX;
    if (Math.abs(gap) > reach) { const move = gap - Math.sign(gap) * reach; car.x += move; car.wheel += move / (5 * s) * Math.sign(car.f || 1); }
  }
  function beginClosing(now: number) {
    closing.from = {skx: sk.x, sky: sk.y, clip: sk.clip, carx: car.x, cary: car.y, cark: car.k, carAlpha: car.alpha};
    closing.skInside = sk.clip > 0 || !sk.visible;
    closing.duration = sk.visible ? (closing.skInside ? 700 : 1500) : 1;
    go('closing', now);
  }
  function settle() { state = 'resting'; lid = 0; emerge = 0; shake = 0; sk.visible = false; sk.clip = 0; sk.amp = 0; car.alpha = 0; car.k = 1; render(); }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    const t = now - stateAt;
    if (state === 'tremble') { shake = t / 1000; if (t >= 900) { shake = 0; go('opening', now); } }
    else if (state === 'opening') { lid = clamp(t / 650); if (t >= 650) { go('emerging', now); sk.visible = true; sk.f = exitDir; sk.dir = exitDir; car.f = exitDir; car.dir = exitDir; } }
    else if (state === 'emerging') {
      emerge = clamp(t / 1900);
      const es = clamp(emerge / .7), a = ease(clamp(es / .6)), b = ease(clamp((es - .6) / .4)), Hs = 110 * s;
      if (es < .6) { sk.x = cx; sk.y = rimY + Hs * (1 - a); sk.clip = sk.y - rimY; sk.phase += dt * 5; sk.amp = .5; }
      else { sk.clip = 0; sk.x = lerp(cx, exitX, b); sk.y = lerp(rimY, ground, b) - Math.sin(Math.PI * b) * 9 * s; sk.phase += dt * 6; sk.amp = .8; }
      const c = ease(clamp((emerge - .5) / .5));
      car.alpha = clamp(c * 4); car.k = lerp(.35, 1, c); car.x = lerp(cx, carHomeX, c); car.y = lerp(rimY + 6 * s, ground, c); car.wheel += dt * 6 * exitDir;
      if (emerge >= 1) { sk.x = exitX; sk.y = ground; car.x = carHomeX; car.y = ground; car.k = 1; car.alpha = 1; go('roaming', now); pickTarget(now); pauseUntil = now + 500; }
    }
    else if (state === 'roaming') {
      if (now < pauseUntil) { sk.amp += (0 - sk.amp) * Math.min(1, dt * 6); }
      else if (walk(dt, 40) < 1.5) { pickTarget(now); pauseUntil = now + 600 + Math.random() * 1700; }
      pullCar(dt);
    }
    else if (state === 'returning') {
      if (walk(dt, returnSpeed) < 2) beginClosing(now);
      pullCar(dt);
    }
    else if (state === 'closing') {
      const p = clamp(t / closing.duration), from = closing.from, Hs = 110 * s;
      if (sk.visible) {
        const c = ease(clamp(p / .4));
        if (from.carAlpha > 0) { car.x = lerp(from.carx, cx, c); car.y = lerp(from.cary, rimY + 6 * s, c); car.k = lerp(from.cark, .35, c); car.alpha = from.carAlpha * (1 - clamp((c - .7) / .3)); car.wheel -= dt * 7 * exitDir; if (car.alpha > 0 && Math.abs(car.x - cx) > 4) { car.dir = cx > car.x ? -1 : 1; car.f += clamp((car.dir - car.f) * dt * 6, -dt * 4, dt * 4); } }
        if (closing.skInside) { const d = ease(p); sk.x = cx; sk.y = lerp(from.sky, rimY + Hs, d); sk.clip = Math.max(0, sk.y - rimY); sk.amp = .4; sk.phase += dt * 5; }
        else {
          const hop = ease(clamp((p - .3) / .35)), sink = ease(clamp((p - .65) / .35));
          sk.dir = cx > from.skx ? 1 : -1; sk.f += clamp((sk.dir - sk.f) * dt * 6, -dt * 4, dt * 4);
          sk.x = lerp(from.skx, cx, hop); sk.y = lerp(from.sky, rimY, hop) - Math.sin(Math.PI * hop) * 10 * s + Hs * sink; sk.clip = Math.max(0, sk.y - rimY); sk.amp = .7; sk.phase += dt * 6;
        }
      }
      if (p >= 1) { sk.visible = false; sk.clip = 0; car.alpha = 0; emerge = 0; go('lidclose', now); }
    }
    else if (state === 'lidclose') { lid = Math.max(0, lid - dt / .7); shake = 0; if (lid <= 0) { settle(); return; } }
    render();
    if (state !== 'resting') frame = requestAnimationFrame(tick);
  }
  function start(now: number) { if (frame || state !== 'resting' || document.hidden) return; go('tremble', now); last = now; frame = requestAnimationFrame(tick); }
  function arm(delay: number) { if (timer) clearTimeout(timer); timer = setTimeout(deadline, Math.max(50, delay)); }
  function deadline() { timer = null; if (document.hidden) return; const now = performance.now(), idle = now - lastActivity; if (idle >= idleMs - 20) { if (state === 'resting') start(now); else arm(500); } else arm(idleMs - idle); }
  function activity() {
    const now = performance.now(); lastActivity = now;
    if (!timer) arm(idleMs);
    if (state === 'resting' || state === 'returning' || state === 'closing' || state === 'lidclose') return;
    if (state === 'tremble' || state === 'opening') { shake = 0; go('lidclose', now); return; }
    if (state === 'emerging') { beginClosing(now); return; }
    target = {x: exitX, y: ground}; pauseUntil = 0;
    const dist = Math.hypot(target.x - sk.x, target.y - sk.y); returnSpeed = Math.max(60, dist / s / clamp(dist / (260 * s), 1, 2.6));
    go('returning', now);
  }
  function visibility() {
    if (document.hidden) { if (timer) { clearTimeout(timer); timer = null; } if (frame) { cancelAnimationFrame(frame); frame = 0; } settle(); }
    else { lastActivity = performance.now(); arm(idleMs); }
  }

  layout(); settle();
  window.addEventListener('resize', layout);
  const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
  if (!still) {
    for (const name of events) document.addEventListener(name, activity, {passive: true, capture: true});
    window.addEventListener('focus', activity);
    document.addEventListener('visibilitychange', visibility);
    arm(idleMs);
  }
  return () => {
    mounted = false;
    if (timer) clearTimeout(timer); if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', layout); window.removeEventListener('focus', activity);
    for (const name of events) document.removeEventListener(name, activity, {capture: true});
    document.removeEventListener('visibilitychange', visibility);
    root.replaceChildren();
  };
}
