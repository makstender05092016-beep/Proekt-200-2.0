/* ПРОЕКТ 200 — ядро: утилиты, ГСЧ, разбор выражений, единицы измерения, звук */
'use strict';
const P = window.P = {};
P.VERSION = '1.2.0';
P.$ = (s, r = document) => r.querySelector(s);
P.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
P.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
P.today = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
P.addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return P.today(d); };
P.daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
P.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- форматирование чисел по-русски ---------- */
P.round = (x, n = 10) => { const k = Math.pow(10, n); return Math.round(x * k) / k; };
P.fmt = (x, n = 6) => {
  if (!isFinite(x)) return String(x);
  let s = String(P.round(x, n));
  if (/e/.test(s)) s = x.toPrecision(4);
  return s.replace('-', '−').replace('.', ',');
};
/* дробь в HTML */
P.F = (a, b) => `<span class="fr"><i>${a}</i><i>${b}</i></span>`;
P.R = a => `<span class="rt">√<i>${a}</i></span>`;

/* ---------- ГСЧ с зерном (для воспроизводимых вариантов) ---------- */
P.rng = seed => {
  let a = (seed >>> 0) || 1;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < .5 ? -1 : 1);
  r.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  r.intNZ = (lo, hi) => { let v; do v = r.int(lo, hi); while (v === 0); return v; };
  return r;
};
P.seed = () => (Math.random() * 2 ** 31) >>> 0;

/* ---------- безопасный разбор математического выражения (без eval) ---------- */
P.parseExpr = function (src) {
  let s = String(src || '').trim();
  if (!s) return NaN;
  s = s.replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/[×·*]/g, '*').replace(/[÷:]/g, '/')
    .replace(/,/g, '.').replace(/pi|пи/gi, 'π').replace(/sqrt|корень/gi, '√').replace(/²/g, '^2').replace(/³/g, '^3');
  let i = 0;
  const peek = () => s[i];
  const num = () => { const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
  function primary() {
    const c = peek();
    if (c === '(') { i++; const v = expr(); if (s[i] !== ')') throw 0; i++; return v; }
    if (c === 'π') { i++; return Math.PI; }
    if (c === '√') { i++; const v = unary(); if (v < 0) throw 0; return Math.sqrt(v); }
    if (/[\d.]/.test(c)) return num();
    throw 0;
  }
  function power() { const b = primary(); if (peek() === '^') { i++; const e = unary(); return Math.pow(b, e); } return b; }
  function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return power(); }
  function term() {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === '*') { i++; v *= unary(); }
      else if (c === '/') { i++; const d = unary(); v /= d; }
      else if (c === '(' || c === 'π' || c === '√') v *= power();
      else return v;
    }
  }
  function expr() { let v = term(); for (;;) { const c = peek(); if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v; } }
  try { const v = expr(); if (i !== s.length) return NaN; return v; } catch (e) { return NaN; }
};

/* ---------- единицы измерения и размерности ---------- */
/* размерность: [м, кг, с, А, К, моль] */
(function () {
  const U = {
    'м': [1, [1, 0, 0, 0, 0, 0]], 'г': [1e-3, [0, 1, 0, 0, 0, 0]], 'с': [1, [0, 0, 1, 0, 0, 0]], 'мин': [60, [0, 0, 1, 0, 0, 0]], 'ч': [3600, [0, 0, 1, 0, 0, 0]],
    'сут': [86400, [0, 0, 1, 0, 0, 0]], 'А': [1, [0, 0, 0, 1, 0, 0]], 'К': [1, [0, 0, 0, 0, 1, 0]], 'моль': [1, [0, 0, 0, 0, 0, 1]], 'т': [1000, [0, 1, 0, 0, 0, 0]],
    'Н': [1, [1, 1, -2, 0, 0, 0]], 'Дж': [1, [2, 1, -2, 0, 0, 0]], 'Вт': [1, [2, 1, -3, 0, 0, 0]], 'Па': [1, [-1, 1, -2, 0, 0, 0]],
    'Кл': [1, [0, 0, 1, 1, 0, 0]], 'В': [1, [2, 1, -3, -1, 0, 0]], 'Ом': [1, [2, 1, -3, -2, 0, 0]], 'Гц': [1, [0, 0, -1, 0, 0, 0]],
    'Тл': [1, [0, 1, -2, -1, 0, 0]], 'Ф': [1, [-2, -1, 4, 2, 0, 0]], 'Гн': [1, [2, 1, -2, -2, 0, 0]], 'Вб': [1, [2, 1, -2, -1, 0, 0]],
    'эВ': [1.602176634e-19, [2, 1, -2, 0, 0, 0]], 'л': [1e-3, [3, 0, 0, 0, 0, 0]], 'дптр': [1, [-1, 0, 0, 0, 0, 0]], 'рад': [1, [0, 0, 0, 0, 0, 0]],
    'об': [1, [0, 0, 0, 0, 0, 0]], '%': [0.01, [0, 0, 0, 0, 0, 0]], 'атм': [101325, [-1, 1, -2, 0, 0, 0]]
  };
  const PRE = [['мк', 1e-6], ['М', 1e6], ['Г', 1e9], ['к', 1e3], ['м', 1e-3], ['с', 1e-2], ['д', 1e-1], ['н', 1e-9], ['п', 1e-12]];
  const LAT = { m: 'м', kg: 'кг', g: 'г', s: 'с', N: 'Н', J: 'Дж', W: 'Вт', Pa: 'Па', C: 'Кл', V: 'В', A: 'А', K: 'К', Hz: 'Гц', T: 'Тл', h: 'ч', ohm: 'Ом', 'Ω': 'Ом', eV: 'эВ', mol: 'моль' };
  function one(tok) {
    if (LAT[tok]) tok = LAT[tok];
    if (U[tok]) return { f: U[tok][0], d: U[tok][1].slice() };
    for (const [p, k] of PRE) if (tok.startsWith(p) && U[tok.slice(p.length)]) { const u = U[tok.slice(p.length)]; return { f: k * u[0], d: u[1].slice() }; }
    return null;
  }
  P.parseUnit = function (str) {
    let s = String(str || '').trim().replace(/[·*×]/g, '*').replace(/\s+/g, '*').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁻¹/g, '^-1').replace(/[−–]/g, '-');
    if (!s) return null;
    const res = { f: 1, d: [0, 0, 0, 0, 0, 0] };
    const re = /([*/]?)([A-Za-zА-Яа-яЁёΩ%]+)(?:\^?(-?\d+))?/g;
    let m, used = 0;
    while ((m = re.exec(s))) {
      used += m[0].length;
      const u = one(m[2]); if (!u) return { err: 'неизвестная единица «' + m[2] + '»' };
      const pw = (m[3] ? parseInt(m[3], 10) : 1) * (m[1] === '/' ? -1 : 1);
      res.f *= Math.pow(u.f, pw); for (let k = 0; k < 6; k++) res.d[k] += u.d[k] * pw;
    }
    if (used !== s.length) return { err: 'не удалось разобрать запись единиц' };
    return res;
  };
  const NAMES = [
    [[1, 0, 0, 0, 0, 0], 'длина'], [[0, 1, 0, 0, 0, 0], 'масса'], [[0, 0, 1, 0, 0, 0], 'время'], [[1, 0, -1, 0, 0, 0], 'скорость'],
    [[1, 0, -2, 0, 0, 0], 'ускорение'], [[1, 1, -2, 0, 0, 0], 'сила'], [[2, 1, -2, 0, 0, 0], 'энергия (работа)'], [[2, 1, -3, 0, 0, 0], 'мощность'],
    [[1, 1, -1, 0, 0, 0], 'импульс'], [[-1, 1, -2, 0, 0, 0], 'давление'], [[0, 0, -1, 0, 0, 0], 'частота'], [[2, 0, 0, 0, 0, 0], 'площадь'],
    [[3, 0, 0, 0, 0, 0], 'объём'], [[0, 0, 0, 1, 0, 0], 'сила тока'], [[2, 1, -3, -1, 0, 0], 'напряжение'], [[2, 1, -3, -2, 0, 0], 'сопротивление'],
    [[0, 0, 1, 1, 0, 0], 'заряд'], [[0, 0, 0, 0, 1, 0], 'температура'], [[-3, 1, 0, 0, 0, 0], 'плотность'], [[0, 0, 0, 0, 0, 0], 'безразмерная величина'],
    [[1, 1, -3, -1, 0, 0], 'напряжённость поля'], [[0, 1, -2, -1, 0, 0], 'магнитная индукция'], [[2, 1, -2, -1, 0, 0], 'магнитный поток']
  ];
  P.dimName = d => { for (const [v, n] of NAMES) if (v.every((x, i) => x === d[i])) return n; return 'величина другой размерности'; };
  P.sameDim = (a, b) => a.every((x, i) => x === b[i]);
})();

/* ---------- звук: процедурный синтез Web Audio (без файлов, работает офлайн) ----------
   Две шины: «эффекты» (сигналы интерфейса, ракета) и «музыка» (заставка, отбивки, церемонии).
   Все мелодии — оригинальные, сочинены для приложения. Звук не воспроизводится до первого касания. */
P.snd = (function () {
  let ctx = null, master = null, sfxBus = null, musBus = null, echo = null, unlocked = false;
  const st = { on: true, vol: 0.5, sfx: true, music: true };
  const MUSIC = new Set(['boot', 'award', 'rank', 'examEnd', 'goal']);
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Гц
  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); musBus = ctx.createGain(); sfxBus.connect(master); musBus.connect(master);
    // лёгкое эхо «большого зала» для музыки
    const d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
    d.delayTime.value = 0.19; fb.gain.value = 0.28; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = 0.3;
    musBus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master); echo = d;
    apply(); return ctx;
  }
  function apply() { if (!ctx) return; master.gain.value = st.on ? st.vol * 0.9 : 0; sfxBus.gain.value = st.sfx ? 1 : 0; musBus.gain.value = st.music ? 0.85 : 0; }
  const unlock = () => { unlocked = true; if (init() && ctx.state !== 'running') ctx.resume(); };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  const T = () => ctx.currentTime;
  function env(g, t, a, peak, dec, sus, rel, dur) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t + a + dec); g.gain.setValueAtTime(Math.max(0.0002, peak * sus), t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
  function osc(type, f, t, dur, vol, bus, opt = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + (opt.glide || dur)); if (opt.det) o.detune.value = opt.det;
    env(g, t, opt.a || 0.005, vol, opt.d || dur * 0.4, opt.s == null ? 0.4 : opt.s, opt.r || 0.08, dur);
    let node = o; if (opt.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(opt.lp, t); if (opt.lpTo) f2.frequency.exponentialRampToValueAtTime(opt.lpTo, t + dur); f2.Q.value = opt.q || 1; o.connect(f2); node = f2; }
    node.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + (opt.r || 0.08) + 0.05);
  }
  function noise(t, dur, vol, bus, ftype = 'bandpass', freq = 2500, q = 1, opt = {}) {
    const len = Math.ceil(ctx.sampleRate * (dur + 0.1)), b = ctx.createBuffer(1, len, ctx.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.fTo) f.frequency.exponentialRampToValueAtTime(opt.fTo, t + (opt.fT || dur));
    if (opt.curve) { g.gain.setValueAtTime(0.0001, t); opt.curve.forEach(([dt, v]) => g.gain.linearRampToValueAtTime(v * vol, t + dt)); }
    else env(g, t, opt.a || 0.002, vol, dur * 0.5, 0.2, 0.03, dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.1);
  }
  /* «медные» — две расстроенные пилы через фильтр с огибающей, как у советских синтезаторов */
  const brass = (n, t, dur, vol = 0.18, bus = musBus) => { [-7, 7].forEach(dt => osc('sawtooth', N(n), t, dur, vol, bus, { det: dt, a: 0.03, d: 0.15, s: 0.7, r: 0.18, lp: 600, lpTo: 2600, q: 2 })); };
  const bell = (n, t, dur = 0.9, vol = 0.16, bus = musBus) => { osc('sine', N(n), t, dur, vol, bus, { a: 0.002, d: dur, s: 0.001, r: 0.2 }); osc('sine', N(n) * 2.76, t, dur * 0.5, vol * 0.35, bus, { a: 0.002, d: dur * 0.5, s: 0.001, r: 0.1 }); };
  const timp = (t, f = 98, vol = 0.5) => { osc('sine', f, t, 0.35, vol, musBus, { to: f * 0.62, glide: 0.3, a: 0.003, d: 0.3, s: 0.05, r: 0.2 }); noise(t, 0.08, 0.15, musBus, 'lowpass', 600); };
  const seq = (notes, t0, fn) => { let t = t0; notes.forEach(([n, d]) => { if (n) fn(n, t, d); t += d; }); return t; };
  const S = {
    key(t) { noise(t, 0.025, 0.35, sfxBus, 'bandpass', 3800, 2); osc('square', 2200, t, 0.012, 0.03, sfxBus, { s: 0.1 }); },
    toggle(t) { noise(t, 0.02, 0.5, sfxBus, 'highpass', 2500); noise(t + 0.035, 0.02, 0.35, sfxBus, 'highpass', 3000); osc('sine', 130, t, 0.05, 0.25, sfxBus, { to: 80, s: 0.1 }); },
    nav(t) { noise(t, 0.018, 0.4, sfxBus, 'bandpass', 1800, 3); osc('square', 1320, t + 0.02, 0.045, 0.05, sfxBus, { lp: 4000 }); osc('square', 1760, t + 0.07, 0.05, 0.045, sfxBus, { lp: 4000 }); },
    ok(t) { bell(84, t, 0.45, 0.14, sfxBus); bell(91, t + 0.09, 0.6, 0.12, sfxBus); },
    bad(t) { osc('triangle', N(55), t, 0.32, 0.22, sfxBus, { to: N(50), glide: 0.3, a: 0.01, s: 0.6, lp: 900 }); osc('sine', N(43), t, 0.32, 0.18, sfxBus, { a: 0.01, s: 0.6 }); },
    term(t) { osc('sine', 1200, t, 0.06, 0.12, sfxBus, { s: 0.8 }); osc('sine', 1200, t + 0.11, 0.06, 0.12, sfxBus, { s: 0.8 }); },
    topic(t) { brass(76, t, 0.14, 0.14, sfxBus); brass(79, t + 0.13, 0.14, 0.14, sfxBus); brass(84, t + 0.26, 0.55, 0.16, sfxBus); bell(96, t + 0.26, 0.9, 0.08, sfxBus); },
    stamp(t) { osc('sine', 110, t, 0.18, 0.6, sfxBus, { to: 55, glide: 0.15, a: 0.002, s: 0.1, r: 0.1 }); noise(t, 0.12, 0.5, sfxBus, 'lowpass', 900); noise(t + 0.01, 0.05, 0.3, sfxBus, 'highpass', 3000); },
    examStart(t) { const P5 = [72, 74, 76, 79, 81, 84, 86, 88]; for (let i = 0; i < 10; i++) osc('square', N(P5[(i * 5 + 3) % 8]), t + i * 0.055, 0.04, 0.05, sfxBus, { lp: 3500, s: 0.6 }); noise(t, 0.6, 0.06, sfxBus, 'bandpass', 4500, 6, { curve: [[0.05, 1], [0.55, 0.6], [0.6, 0]] }); osc('sine', 880, t + 0.62, 0.5, 0.14, sfxBus, { s: 0.9, r: 0.1 }); },
    rocket(t, dur = 3.6) {
      noise(t, dur, 0.9, sfxBus, 'lowpass', 160, 0.7, { fTo: 900, fT: dur * 0.55, curve: [[0.25, 0.25], [1.0, 0.8], [dur * 0.6, 1], [dur, 0]] });
      noise(t + 0.6, dur - 0.6, 0.18, sfxBus, 'bandpass', 2200, 0.8, { curve: [[0.4, 0.6], [dur * 0.5, 1], [dur - 0.6, 0]] });
      osc('sawtooth', 38, t, dur, 0.22, sfxBus, { to: 62, glide: dur, a: 0.4, s: 0.9, r: 0.6, lp: 160 });
    },
    boot(t) { // торжественная электронная заставка
      timp(t, 98, 0.35); [67, 72, 76].forEach((n, i) => brass(n, t + i * 0.11, 0.9 - i * 0.11, 0.12));
      const e = seq([[79, 0.16], [84, 0.16], [88, 0.62]], t + 0.36, (n, tt, d) => brass(n, tt, d, 0.13)); [72, 76, 79, 84].forEach(n => brass(n, e - 0.62, 0.62, 0.07)); [96, 100, 103].forEach((n, i) => bell(n, e - 0.6 + i * 0.07, 0.9, 0.06));
    },
    award(t) { [84, 88, 91, 96].forEach((n, i) => bell(n, t + i * 0.075, 0.7, 0.12)); brass(72, t + 0.3, 0.45, 0.09); brass(79, t + 0.3, 0.45, 0.07); },
    rank(t) { // церемониальный марш (оригинальный мотив)
      timp(t, 82, 0.5); timp(t + 0.36, 82, 0.35);
      const mel = [[67, 0.24], [72, 0.24], [72, 0.12], [74, 0.12], [76, 0.48], [74, 0.24], [76, 0.24], [79, 0.72], [0, 0.12], [77, 0.18], [76, 0.18], [74, 0.18], [79, 0.18], [84, 1.0]];
      const end = seq(mel, t + 0.12, (n, tt, d) => brass(n, tt, d * 0.92, 0.14));
      seq([[48, 0.96], [53, 0.96], [55, 0.84], [48, 1.2]], t + 0.12, (n, tt, d) => brass(n, tt, d * 0.95, 0.07));
      timp(end - 1.0, 98, 0.5); [60, 64, 67, 72].forEach(n => brass(n, end - 1.0, 1.0, 0.06)); [96, 100, 103, 108].forEach((n, i) => bell(n, end - 0.95 + i * 0.08, 1.2, 0.06));
    },
    examEnd(t) { timp(t, 98, 0.4); const e = seq([[72, 0.14], [76, 0.14], [79, 0.14], [84, 0.7]], t + 0.05, (n, tt, d) => brass(n, tt, d, 0.13)); [60, 67, 72, 76].forEach(n => brass(n, e - 0.7, 0.7, 0.06)); bell(96, e - 0.68, 1, 0.08); },
    goal(t) { timp(t, 73, 0.6); timp(t + 0.5, 98, 0.5); [55, 60, 64, 67, 72].forEach((n, i) => brass(n, t + i * 0.14, 2.2 - i * 0.14, 0.08)); seq([[79, 0.3], [84, 0.3], [88, 0.3], [91, 1.2]], t + 0.7, (n, tt, d) => { brass(n, tt, d, 0.12); bell(n + 12, tt, 0.8, 0.05); }); }
  };
  return {
    set(o) { Object.assign(st, o); apply(); },
    get state() { return { ...st, unlocked }; },
    play(name, arg) {
      if (!unlocked || !st.on || !S[name]) return;
      if (MUSIC.has(name) ? !st.music : !st.sfx) return;
      try { if (!init()) return; if (ctx.state !== 'running') ctx.resume(); S[name](T() + 0.02, arg); } catch (e) { }
    },
    get on() { return st.on; }, get vol() { return st.vol; }
  };
})();

/* ---------- мелкий UI ---------- */
P.toast = function (msg, ms = 2200) {
  let t = P.$('#toast'); if (t) t.remove();
  t = document.createElement('div'); t.id = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
};
P.modal = function (html, onMount) {
  P.closeModal();
  const m = document.createElement('div'); m.id = 'modal';
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) P.closeModal(); });
  document.body.appendChild(m); if (onMount) onMount(m.firstChild);
  return m.firstChild;
};
P.closeModal = () => { const m = P.$('#modal'); if (m) m.remove(); };

/* SVG-эмблема ПРОЕКТ 200 */
P.emblem = (cls = 'emblem') => `<svg class="${cls}" viewBox="0 0 200 200" aria-label="Эмблема ПРОЕКТ 200">
<defs><path id="arcT" d="M30 100a70 70 0 0 1 140 0"/><path id="arcB" d="M26 100a74 74 0 0 0 148 0"/></defs>
<circle cx="100" cy="100" r="96" fill="#7f1913"/><circle cx="100" cy="100" r="90" fill="none" stroke="#b8954a" stroke-width="3"/>
<circle cx="100" cy="100" r="68" fill="#b3261e" stroke="#e8d6a8" stroke-width="2"/>
<g fill="#e8d6a8">${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return `<circle cx="${100 + 80 * Math.cos(a)}" cy="${100 + 80 * Math.sin(a)}" r="1.6"/>`; }).join('')}</g>
<path transform="translate(100 62) scale(.38) translate(-50 -50)" fill="#ffd27a" d="M50 4l13.4 31.6 34.2 3-26 22.5 7.8 33.5L50 77 20.6 94.6l7.8-33.5-26-22.5 34.2-3z"/>
<text x="100" y="128" text-anchor="middle" font-family="Avenir Next Condensed,Arial Narrow,DejaVu Sans Condensed,sans-serif" font-weight="800" font-size="56" fill="#fffdf8" letter-spacing="1">200</text>
<text x="100" y="146" text-anchor="middle" font-family="Avenir Next Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="11" fill="#e8d6a8" letter-spacing="3">ПРОЕКТ</text>
</svg>`;
