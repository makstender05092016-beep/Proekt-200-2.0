/* ПРОЕКТ 200 — motion design: заставка, ракета-носитель, центр управления, анимации тем и наград.
   Только Canvas/SVG/CSS, без WebGL. Все анимации конечны или ставятся на паузу вне экрана. */
'use strict';
(function () {
  const $ = P.$;
  const COL = { gold: '#E8B84A', copper: '#B87333', orange: '#FF7A1A', fire: '#E8321E', blue: '#0B1B3A', turq: '#2EC4B6', white: '#EAF2FF', red: '#C4161C', ink: '#F1E6CF' };
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- настройки эффектов ---------- */
  const FX = P.fx = {};
  FX.cfg = () => { const s = P.DB.get('settings', {}) || {}; return { level: s.anim != null ? s.anim : (RM() ? 1 : 2), splash: s.fxSplash !== false, rocket: s.fxRocket !== false, home: s.fxHome !== false, topic: s.fxTopic !== false, awards: s.fxAwards !== false }; };
  FX.level = () => FX.cfg().level;
  FX.on = name => { const c = FX.cfg(); return c.level > 0 && c[name] !== false; };
  FX.applyClass = () => { const l = FX.level(), r = document.documentElement; r.classList.toggle('anim-off', l === 0); r.classList.toggle('anim-low', l === 1); };
  /* очередь полноэкранных эффектов — чтобы они не накладывались */
  let q = Promise.resolve();
  FX.queue = fn => (q = q.then(() => fn().catch(() => { })));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function canvasFit(cv, H) { const W = cv.clientWidth || 320, h = H || cv.clientHeight || 160, d = Math.min(2, window.devicePixelRatio || 1); cv.width = W * d; cv.height = h * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return { c, W, H: h }; }
  const starPath = (c, x, y, R, r) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q2 = i % 2 ? r : R; i ? c.lineTo(x + q2 * Math.cos(a), y + q2 * Math.sin(a)) : c.moveTo(x + q2 * Math.cos(a), y + q2 * Math.sin(a)); } c.closePath(); };

  /* ================= ЗАСТАВКА ================= */
  FX.splash = function () {
    return new Promise(res => {
      const low = FX.level() === 1, dur = low ? 1700 : 3600;
      const d = document.createElement('div'); d.className = 'splash' + (low ? ' low' : '');
      const sys = ['Питание', 'ЭВМ', 'Память', 'Телеметрия', 'Связь', 'Орбита', 'Старт'];
      d.innerHTML = `<div class="sp-grid"></div>
<svg class="sp-emb" viewBox="0 0 200 200" aria-hidden="true">
 <circle class="sp-c1" cx="100" cy="100" r="92"/><circle class="sp-c2" cx="100" cy="100" r="74"/>
 <g class="sp-ticks">${Array.from({ length: 36 }, (_, i) => { const a = i * Math.PI / 18; return `<line x1="${100 + 82 * Math.cos(a)}" y1="${100 + 82 * Math.sin(a)}" x2="${100 + (i % 3 ? 86 : 90) * Math.cos(a)}" y2="${100 + (i % 3 ? 86 : 90) * Math.sin(a)}"/>`; }).join('')}</g>
 <ellipse class="sp-orb" cx="100" cy="100" rx="96" ry="34" transform="rotate(-24 100 100)"/>
 <g class="sp-sat-g" transform="rotate(-24 100 100)"><circle class="sp-sat" r="4.5" cx="196" cy="100"/></g>
 <path class="sp-star" d="M100 44l13.4 31.6 34.2 3-26 22.5 7.8 33.5L100 117l-29.4 17.6 7.8-33.5-26-22.5 34.2-3z"/>
</svg>
<div class="sp-title">Проект 200</div><div class="sp-motto">Знание · Дисциплина · Совершенство</div>
<div class="sp-lights">${sys.map((n, i) => `<div style="--i:${i}"><i></i><span>${n}</span></div>`).join('')}</div>
<div class="sp-tel"><div style="--i:0">ВЦ «ПРОЕКТ 200» · ИНИЦИАЛИЗАЦИЯ</div><div style="--i:1">ФАКУЛЬТЕТ МАТЕМАТИКИ ······ 21 ТЕМА</div><div style="--i:2">ФАКУЛЬТЕТ ФИЗИКИ ········· 29 ТЕМ</div><div style="--i:3">ЛАБОРАТОРИИ ·············· 12</div><div style="--i:4">ГОТОВНОСТЬ ··············· 100</div></div>
<div class="sp-bar"><i></i></div><div class="sp-hint">Коснитесь, чтобы пропустить</div>`;
      document.body.appendChild(d);
      let done = false;
      const end = () => { if (done) return; done = true; d.classList.add('out'); setTimeout(() => { d.remove(); res(); }, 450); };
      d.addEventListener('pointerdown', () => { P.snd.play('boot'); end(); }, { once: true });
      setTimeout(end, dur);
    });
  };

  /* ================= РАКЕТА-НОСИТЕЛЬ ================= */
  function drawRocket(c, x, y, s, t) {
    // x,y — центр среза сопел; s — высота. Схема пакета: центральный блок + 4 боковых конических блока.
    const g = (x0, w) => { const gr = c.createLinearGradient(x0 - w, 0, x0 + w, 0); gr.addColorStop(0, '#7E868C'); gr.addColorStop(.35, '#EEF1F3'); gr.addColorStop(.6, '#D7DCE0'); gr.addColorStop(1, '#6E767C'); return gr; };
    const booster = (bx, w, front) => {
      c.fillStyle = g(bx, w); c.beginPath(); c.moveTo(bx - w, y - 0.02 * s); c.lineTo(bx - w * 0.92, y - 0.30 * s); c.quadraticCurveTo(bx - w * 0.2, y - 0.43 * s, bx + (bx < x ? w * 0.55 : -w * 0.1), y - 0.46 * s);
      c.lineTo(bx + w * 0.92, y - 0.30 * s); c.lineTo(bx + w, y - 0.02 * s); c.closePath(); c.fill();
      c.fillStyle = '#B3111A'; c.fillRect(bx - w * 0.93, y - 0.29 * s, w * 1.86, 0.018 * s);
      c.fillStyle = '#3A3F44'; c.fillRect(bx - w * 0.8, y - 0.02 * s, w * 1.6, 0.025 * s);
      if (front) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(bx - w, y - 0.12 * s, w * 2, 0.008 * s); }
    };
    const cw = 0.055 * s;
    booster(x - cw * 1.55, 0.042 * s); booster(x + cw * 1.55, 0.042 * s);
    // центральный блок: «талия» и верхняя ступень
    c.fillStyle = g(x, cw); c.beginPath(); c.moveTo(x - cw, y - 0.02 * s); c.lineTo(x - cw * 0.78, y - 0.46 * s); c.lineTo(x - cw * 0.95, y - 0.62 * s); c.lineTo(x - cw * 0.95, y - 0.66 * s);
    c.lineTo(x - cw * 0.85, y - 0.80 * s); c.lineTo(x - cw * 0.85, y - 0.88 * s); c.quadraticCurveTo(x - cw * 0.6, y - 0.97 * s, x, y - s); c.quadraticCurveTo(x + cw * 0.6, y - 0.97 * s, x + cw * 0.85, y - 0.88 * s);
    c.lineTo(x + cw * 0.85, y - 0.80 * s); c.lineTo(x + cw * 0.95, y - 0.66 * s); c.lineTo(x + cw * 0.95, y - 0.62 * s); c.lineTo(x + cw * 0.78, y - 0.46 * s); c.lineTo(x + cw, y - 0.02 * s); c.closePath(); c.fill();
    c.fillStyle = '#B3111A'; c.fillRect(x - cw * 0.95, y - 0.66 * s, cw * 1.9, 0.035 * s);
    c.fillStyle = '#2B3036'; c.fillRect(x - cw * 0.9, y - 0.625 * s, cw * 1.8, 0.012 * s); // ферма между ступенями
    c.fillStyle = '#E8B84A'; c.font = `${Math.max(8, 0.035 * s)}px VKHUTE, sans-serif`; c.textAlign = 'center'; c.save(); c.translate(x, y - 0.40 * s); c.rotate(-Math.PI / 2); c.fillText('П-200', 0, 0.012 * s); c.restore();
    c.fillStyle = 'rgba(30,20,20,.55)'; c.beginPath(); c.arc(x, y - 0.84 * s, 0.012 * s, 0, 7); c.fill();
    booster(x, 0.036 * s, true);
  }
  function flame(c, x, y, len, w, k) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createLinearGradient(x, y, x, y + len); gr.addColorStop(0, 'rgba(255,255,240,.95)'); gr.addColorStop(.18, 'rgba(255,214,107,.9)'); gr.addColorStop(.5, 'rgba(255,122,26,.6)'); gr.addColorStop(1, 'rgba(232,50,30,0)');
    c.fillStyle = gr; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * (1.2 + k * 0.3), y + len * 0.4, x, y + len); c.quadraticCurveTo(x + w * (1.2 + k * 0.3), y + len * 0.4, x + w, y); c.closePath(); c.fill(); c.restore();
  }
  FX.rocket = function (o = {}) {
    return FX.queue(async () => {
      if (!FX.on('rocket')) { if (o.caption) { P.toast(o.caption + (o.sub ? ' · ' + o.sub : ''), 3200); P.snd.play(o.music || 'award'); } return; }
      const low = FX.level() === 1, total = low ? 3.4 : 5.4, tIgn = low ? 0.25 : 0.6, tLift = low ? 0.6 : 1.3, cap = low ? 70 : 150;
      const cv = document.createElement('canvas'); cv.className = 'fx-layer'; document.body.appendChild(cv);
      const capEl = document.createElement('div'); capEl.className = 'fx-cap'; capEl.innerHTML = o.caption ? `<div class="fx-cap-t">${P.esc(o.caption)}</div>${o.sub ? `<div class="fx-cap-s">${P.esc(o.sub)}</div>` : ''}` : ''; document.body.appendChild(capEl);
      const { c, W, H } = canvasFit(cv, window.innerHeight); cv.style.height = H + 'px';
      const s = Math.min(H * 0.36, W * 0.95), x = W / 2, y0 = H * 0.9, a = 0.62 * H;
      const stars = Array.from({ length: low ? 40 : 90 }, () => [Math.random() * W, Math.random() * H * 0.8, Math.random() * 1.3 + .3, Math.random() * 6]);
      const parts = []; let t0 = performance.now(), last = t0, soundOn = false, skip = false;
      cv.addEventListener('pointerdown', () => skip = true); capEl.addEventListener('pointerdown', () => skip = true);
      setTimeout(() => capEl.classList.add('in'), (low ? 500 : 1100));
      const nozzles = [-1.55, -0.55, 0.55, 1.55].map(k => k * 0.05 * s);
      await new Promise(done => {
        const frame = now => {
          const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (t > total || (skip && t > 0.3)) return done();
          if (!soundOn && t >= tIgn) { soundOn = true; P.snd.play('rocket', total - tIgn - 0.6); if (o.music) setTimeout(() => P.snd.play(o.music), (low ? 700 : 1300)); }
          const fadeIn = Math.min(1, t / 0.4), fadeOut = Math.min(1, Math.max(0, (total - t) / 0.7));
          c.clearRect(0, 0, W, H); c.globalAlpha = fadeOut;
          const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `rgba(4,8,20,${0.97 * fadeIn})`); bg.addColorStop(1, `rgba(20,6,4,${0.98 * fadeIn})`); c.fillStyle = bg; c.fillRect(0, 0, W, H);
          stars.forEach(([sx, sy, r, ph]) => { c.fillStyle = `rgba(234,242,255,${(0.45 + 0.4 * Math.sin(t * 2 + ph)) * fadeIn})`; c.fillRect(sx, sy, r, r); });
          // стартовая площадка и фермы обслуживания
          const lift = Math.max(0, t - tLift), y = y0 - 0.5 * a * lift * lift, open = Math.min(1, Math.max(0, (t - tIgn) / 0.8));
          c.fillStyle = '#120C0A'; c.fillRect(0, y0, W, H - y0); c.fillStyle = '#2A1D18'; c.fillRect(x - s * 0.3, y0 - 4, s * 0.6, 6);
          [-1, 1].forEach(side => { c.save(); c.translate(x + side * s * 0.16, y0); c.rotate(side * open * 0.7); c.strokeStyle = `rgba(184,115,51,${0.9 - open * 0.5})`; c.lineWidth = 2; c.beginPath();
            for (let k = 0; k < 8; k++) { const yy = -k * s * 0.07; c.moveTo(-6, yy); c.lineTo(6, yy - s * 0.07); c.moveTo(6, yy); c.lineTo(-6, yy - s * 0.07); } c.moveTo(-6, 0); c.lineTo(-6, -s * 0.56); c.moveTo(6, 0); c.lineTo(6, -s * 0.56); c.stroke(); c.restore(); });
          // частицы: огонь и дым (ограниченное количество)
          if (t > tIgn && y > -s * 1.4) {
            const thrust = lift > 0 ? 1 : 0.6;
            for (let i = 0; i < (low ? 2 : 4) && parts.length < cap; i++) { const nx = x + nozzles[i % 4]; parts.push({ x: nx, y: y + 2, vx: (Math.random() - .5) * 40, vy: 160 + Math.random() * 120 * thrust, l: 0, m: 0.35 + Math.random() * 0.25, r: 4 + Math.random() * 5, k: 'f' }); }
            if (parts.length < cap) parts.push({ x: x + (Math.random() - .5) * s * 0.2, y: y + 10, vx: (Math.random() - .5) * (lift > 0 ? 60 : 260), vy: lift > 0 ? 40 + Math.random() * 40 : 10 + Math.random() * 30, l: 0, m: 1.6 + Math.random() * 1.2, r: 10 + Math.random() * 12, k: 's' });
          }
          for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l += dt; if (p.l > p.m) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > y0) { p.y = y0; p.vy = -Math.abs(p.vy) * 0.2; p.vx *= 1.6; } const f = p.l / p.m;
            if (p.k === 's') { c.fillStyle = `rgba(150,140,135,${0.22 * (1 - f) * fadeIn})`; c.beginPath(); c.arc(p.x, p.y, p.r * (1 + f * 2.5), 0, 7); c.fill(); }
            else { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = f < .3 ? `rgba(255,214,107,${1 - f})` : `rgba(255,${Math.round(122 - f * 80)},26,${0.8 * (1 - f)})`; c.beginPath(); c.arc(p.x, p.y, p.r * (1 - f * 0.6), 0, 7); c.fill(); c.restore(); } }
          // огненный шлейф-след над стартом
          if (lift > 0) { const tr = c.createLinearGradient(0, y, 0, y0); tr.addColorStop(0, 'rgba(255,170,60,.55)'); tr.addColorStop(.25, 'rgba(232,80,30,.25)'); tr.addColorStop(1, 'rgba(232,50,30,0)'); c.fillStyle = tr; c.fillRect(x - s * 0.05, y, s * 0.1, Math.max(0, y0 - y)); }
          if (t > tIgn) { const k = Math.sin(t * 60) * 0.5 + 0.5; nozzles.forEach(nx => flame(c, x + nx, y, s * (lift > 0 ? 0.32 : 0.16) * (0.85 + k * 0.3), s * 0.026, k)); }
          c.globalAlpha = Math.min(1, t / 0.4) * fadeOut; drawRocket(c, x, y, s, t); c.globalAlpha = 1;
          if (t > tIgn && t < tIgn + 0.25) { c.fillStyle = `rgba(255,230,160,${0.35 * (1 - (t - tIgn) / 0.25)})`; c.fillRect(0, 0, W, H); }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      cv.remove(); capEl.classList.add('out'); setTimeout(() => capEl.remove(), 400);
    });
  };

  /* ================= ЦЕНТР УПРАВЛЕНИЯ (главный экран) ================= */
  FX.homeScene = function (cv, data = {}) {
    const low = FX.level() === 1; let alive = true, visible = true, raf = 0, lastDraw = 0, t = 0, prev = performance.now();
    const step = low ? 90 : 33, nStars = low ? 30 : 70;
    let { c, W, H } = canvasFit(cv, 170);
    const stars = Array.from({ length: nStars }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .3, v: Math.random() * 4 + 1, p: Math.random() * 6 }));
    const lights = Array.from({ length: 6 }, (_, i) => ({ c: [COL.red, COL.gold, COL.turq, COL.orange, COL.turq, COL.red][i], p: Math.random() * 4, f: 0.6 + Math.random() * 1.6 }));
    const t0 = Date.now();
    const draw = () => {
      c.clearRect(0, 0, W, H);
      const bg = c.createRadialGradient(W * 0.25, H * 1.1, 10, W * 0.4, H * 0.5, W); bg.addColorStop(0, '#0E2A4D'); bg.addColorStop(.5, '#06101F'); bg.addColorStop(1, '#030407'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      stars.forEach(s => { s.x -= s.v * 0.016; if (s.x < 0) s.x += W; c.fillStyle = `rgba(234,242,255,${0.35 + 0.35 * Math.sin(t * 1.5 + s.p)})`; c.fillRect(s.x, s.y, s.r, s.r); });
      const px = W * 0.2, py = H * 1.18, pr = H * 0.78;
      const pg = c.createRadialGradient(px - pr * 0.3, py - pr * 0.5, pr * 0.1, px, py, pr); pg.addColorStop(0, '#1E5AA8'); pg.addColorStop(.75, '#0B1B3A'); pg.addColorStop(1, '#2EC4B6');
      c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
      c.strokeStyle = 'rgba(46,196,182,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, pr + 2, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(234,242,255,.08)'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.ellipse(px, py, pr * k / 4, pr, 0, 0, 7); c.stroke(); }
      // орбиты и аппараты
      const orb = (rx, ry, rot, sp, ph, kind) => {
        c.save(); c.translate(px, py); c.rotate(rot); c.setLineDash([3, 5]); c.strokeStyle = 'rgba(232,184,74,.35)'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.stroke(); c.setLineDash([]);
        const a = ph + t * sp, ox = rx * Math.cos(a), oy = ry * Math.sin(a); c.restore();
        const X = px + ox * Math.cos(rot) - oy * Math.sin(rot), Y = py + ox * Math.sin(rot) + oy * Math.cos(rot);
        if (Y > py - pr * 0.98 && Math.hypot(X - px, Y - py) < pr) return; // за планетой
        c.save(); c.translate(X, Y);
        if (kind === 'st') { c.fillStyle = '#C9D2DA'; c.fillRect(-6, -2.5, 12, 5); c.fillStyle = COL.turq; c.fillRect(-17, -4, 9, 8); c.fillRect(8, -4, 9, 8); c.fillStyle = COL.gold; c.fillRect(-1.5, -6, 3, 3); }
        else { c.fillStyle = '#E3E7EA'; c.beginPath(); c.arc(0, 0, 3.5, 0, 7); c.fill(); c.strokeStyle = '#E3E7EA'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, 2); c.lineTo(-10, 9); c.moveTo(1, 2); c.lineTo(-4, 11); c.moveTo(-2, -1); c.lineTo(-12, 3); c.stroke(); }
        c.restore();
      };
      orb(pr * 1.35, pr * 0.55, -0.35, 0.18, 0, 'st'); orb(pr * 1.7, pr * 0.85, -0.6, 0.11, 2, 'sp');
      // траектория полёта к Луне
      c.strokeStyle = 'rgba(255,122,26,.55)'; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(px + pr * 0.6, py - pr * 0.8); c.bezierCurveTo(W * 0.45, H * 0.05, W * 0.6, H * 0.02, W * 0.62, H * 0.22); c.stroke(); c.setLineDash([]);
      const u = (t * 0.07) % 1, bz = (p0, p1, p2, p3) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u * u * p2 + u ** 3 * p3;
      c.fillStyle = COL.orange; c.beginPath(); c.arc(bz(px + pr * 0.6, W * 0.45, W * 0.6, W * 0.62), bz(py - pr * 0.8, H * 0.05, H * 0.02, H * 0.22), 2.5, 0, 7); c.fill();
      c.fillStyle = '#C8C2B4'; c.beginPath(); c.arc(W * 0.62, H * 0.22, 7, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(W * 0.635, H * 0.215, 6, -1, 2); c.fill();
      // панель телеметрии
      const tx = W * 0.68, el = Math.floor((Date.now() - t0) / 1000);
      c.fillStyle = 'rgba(10,6,5,.55)'; c.fillRect(tx - 8, 10, W - tx, H - 20); c.strokeStyle = 'rgba(184,115,51,.6)'; c.strokeRect(tx - 8, 10, W - tx, H - 20);
      c.font = '10px VKHUTE, sans-serif'; c.textAlign = 'left'; c.fillStyle = COL.gold;
      const lines = [['ТЕЛЕМЕТРИЯ', ''], ['МАТЕМ.', (data.math || 0) + '/100'], ['ФИЗИКА', (data.phys || 0) + '/100'], ['ОРБИТА', (327 + Math.round(4 * Math.sin(t / 3))) + ' КМ'], ['СКОРОСТЬ', (7.78 + 0.01 * Math.sin(t)).toFixed(2).replace('.', ',')], ['Т+', [Math.floor(el / 3600), Math.floor(el / 60) % 60, el % 60].map(v => String(v).padStart(2, '0')).join(':')]];
      lines.forEach(([k, v], i) => { c.fillStyle = i ? 'rgba(241,230,207,.65)' : COL.gold; c.fillText(k, tx, 26 + i * 18); c.fillStyle = COL.turq; c.textAlign = 'right'; c.fillText(v, W - 8, 26 + i * 18); c.textAlign = 'left'; });
      lights.forEach((l, i) => { const on = Math.sin(t * l.f + l.p) > -0.2; c.fillStyle = on ? l.c : 'rgba(255,255,255,.08)'; c.shadowColor = l.c; c.shadowBlur = on ? 8 : 0; c.beginPath(); c.arc(tx + 4 + i * ((W - tx - 16) / 5.2), H - 20, 3.2, 0, 7); c.fill(); c.shadowBlur = 0; });
      // бегущая линия сканирования
      const sx = (t * 40) % (W * 0.68); c.fillStyle = 'rgba(46,196,182,.07)'; c.fillRect(sx, 0, 2, H);
    };
    const loop = now => { if (!alive) return; raf = requestAnimationFrame(loop); if (!visible || document.hidden) { prev = now; return; } if (now - lastDraw < step) return; t += (now - prev) / 1000; prev = now; lastDraw = now; draw(); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null; if (io) io.observe(cv);
    const rs = () => { ({ c, W, H } = canvasFit(cv, 170)); draw(); }; window.addEventListener('resize', rs);
    draw(); raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); if (io) io.disconnect(); window.removeEventListener('resize', rs); };
  };

  /* ================= АНИМАЦИИ НАЧАЛА ТЕМЫ ================= */
  const SCENE = {
    m1: 'formula', m2: 'formula', m3: 'formula', m4: 'formula', m5: 'graph', m6: 'graph', m7: 'graph', m8: 'graph', m9: 'graph', m10: 'circle', m11: 'tangent', m12: 'area', m13: 'geom', m14: 'solid', m15: 'vectors', m16: 'vectors', m17: 'bars', m18: 'bars', m19: 'graph', m20: 'graph', m21: 'tangent',
    p1: 'atom', p2: 'atom', p3: 'formula', p4: 'formula', p5: 'vectors', p6: 'motion', p7: 'motion', p8: 'motion', p9: 'forces', p10: 'planets', p11: 'forces', p12: 'forces', p13: 'forces', p14: 'collide', p15: 'collide', p16: 'collide', p17: 'collide',
    p18: 'pendulum', p19: 'wave', p20: 'molecules', p21: 'molecules', p22: 'field', p23: 'circuit', p24: 'circuit', p25: 'field', p26: 'field', p27: 'optics', p28: 'atom', p29: 'planets'
  };
  const FORM = { m1: ['a = b·q + r', '|a| ≥ 0', '18 : 3 : 2 = 3'], m2: ['a/b + c/d', 'p% = p/100', '×(1 + p/100)'], m3: ['aᵐ·aⁿ = aᵐ⁺ⁿ', '√(a²) = |a|', 'a⁻ⁿ = 1/aⁿ'], m4: ['(a+b)² = a²+2ab+b²', 'a²−b² = (a−b)(a+b)', 'log(xy) = log x + log y'], p3: ['1 Н = 1 кг·м/с²', 'км/ч : 3,6 = м/с', '1 см² = 10⁻⁴ м²'], p4: ['ε = Δx/x', 'x = x₀ ± Δx', 'цена деления'] };
  const scenes = {
    formula(c, W, H, u, tp) { const L = FORM[tp] || ['E = mc²']; c.font = '22px Georgia, serif'; c.textAlign = 'left'; L.forEach((s, i) => { const k = Math.min(1, Math.max(0, u * 3.2 - i)); c.save(); c.beginPath(); c.rect(20, 18 + i * 34, (W - 40) * k, 34); c.clip(); c.fillStyle = i === 0 ? COL.gold : COL.ink; c.fillText(s, 24 + i * 18, 42 + i * 34); c.restore(); if (k > 0 && k < 1) { c.fillStyle = COL.orange; c.fillRect(20 + (W - 40) * k, 22 + i * 34, 2, 26); } }); },
    axes(c, W, H) { c.strokeStyle = 'rgba(241,230,207,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(16, H * 0.62); c.lineTo(W - 10, H * 0.62); c.moveTo(W * 0.3, H - 8); c.lineTo(W * 0.3, 8); c.stroke(); c.strokeStyle = 'rgba(241,230,207,.07)'; for (let x = W * 0.3 % 20; x < W; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } },
    graph(c, W, H, u) { scenes.axes(c, W, H); const f = x => H * 0.62 - (Math.sin((x - W * 0.3) / 38) * 30 + (x - W * 0.3) * 0.12); c.strokeStyle = COL.gold; c.lineWidth = 2.5; c.beginPath(); for (let x = 16; x < 16 + (W - 26) * u; x += 2) x === 16 ? c.moveTo(x, f(x)) : c.lineTo(x, f(x)); c.stroke(); const px = 16 + (W - 26) * u; c.fillStyle = COL.orange; c.beginPath(); c.arc(px, f(px), 5, 0, 7); c.fill(); },
    tangent(c, W, H, u) { scenes.axes(c, W, H); const f = x => H * 0.62 - ((x - W * 0.55) ** 2) * -0.004 - 40; c.strokeStyle = COL.gold; c.lineWidth = 2.5; c.beginPath(); for (let x = 16; x < W - 10; x += 2) x === 16 ? c.moveTo(x, f(x)) : c.lineTo(x, f(x)); c.stroke(); const x0 = 30 + (W - 60) * u, k = (f(x0 + 1) - f(x0 - 1)) / 2; c.strokeStyle = COL.turq; c.beginPath(); c.moveTo(x0 - 80, f(x0) - 80 * k); c.lineTo(x0 + 80, f(x0) + 80 * k); c.stroke(); c.fillStyle = COL.orange; c.beginPath(); c.arc(x0, f(x0), 5, 0, 7); c.fill(); },
    area(c, W, H, u) { scenes.axes(c, W, H); const f = x => H * 0.62 - 20 - ((x - W * 0.3) / 50) ** 2 * 12; c.fillStyle = 'rgba(232,184,74,.3)'; c.beginPath(); c.moveTo(W * 0.35, H * 0.62); for (let x = W * 0.35; x < W * 0.35 + W * 0.45 * u; x += 2) c.lineTo(x, f(x)); c.lineTo(W * 0.35 + W * 0.45 * u, H * 0.62); c.fill(); c.strokeStyle = COL.gold; c.lineWidth = 2.5; c.beginPath(); for (let x = 16; x < W - 10; x += 2) x === 16 ? c.moveTo(x, f(x)) : c.lineTo(x, f(x)); c.stroke(); },
    circle(c, W, H, u) { const cx = W / 2, cy = H / 2, R = H * 0.38, a = u * Math.PI * 1.6; c.strokeStyle = 'rgba(241,230,207,.35)'; c.beginPath(); c.moveTo(cx - R - 20, cy); c.lineTo(cx + R + 20, cy); c.moveTo(cx, cy - R - 10); c.lineTo(cx, cy + R + 10); c.stroke(); c.strokeStyle = COL.ink; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); const x = cx + R * Math.cos(a), y = cy - R * Math.sin(a); c.strokeStyle = COL.gold; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); c.strokeStyle = COL.fire; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, cy); c.stroke(); c.strokeStyle = COL.turq; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, cy); c.stroke(); c.fillStyle = COL.orange; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); },
    geom(c, W, H, u) { const A = [W * 0.2, H * 0.85], B = [W * 0.8, H * 0.85], C2 = [W * 0.42, H * 0.15], seg = (p, q, k) => { c.beginPath(); c.moveTo(...p); c.lineTo(p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k); c.stroke(); }; c.strokeStyle = COL.ink; c.lineWidth = 2; const k = Math.min(1, u * 3); seg(A, B, Math.min(1, k * 3)); seg(B, C2, Math.max(0, Math.min(1, k * 3 - 1))); seg(C2, A, Math.max(0, Math.min(1, k * 3 - 2))); if (u > 0.4) { const D = 2 * (A[0] * (B[1] - C2[1]) + B[0] * (C2[1] - A[1]) + C2[0] * (A[1] - B[1])), qq = p => p[0] ** 2 + p[1] ** 2, ux = (qq(A) * (B[1] - C2[1]) + qq(B) * (C2[1] - A[1]) + qq(C2) * (A[1] - B[1])) / D, uy = (qq(A) * (C2[0] - B[0]) + qq(B) * (A[0] - C2[0]) + qq(C2) * (B[0] - A[0])) / D; c.strokeStyle = COL.gold; c.beginPath(); c.arc(ux, uy, Math.hypot(A[0] - ux, A[1] - uy), 0, (u - 0.4) / 0.6 * 6.29); c.stroke(); } [A, B, C2].forEach(p => { c.fillStyle = COL.orange; c.beginPath(); c.arc(p[0], p[1], 4, 0, 7); c.fill(); }); },
    solid(c, W, H, u) { const ry = u * 2.4 + 0.5, rx = -0.4, s = H * 0.3, V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => { [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)]; return [W / 2 + x * s, H / 2 - y * s]; }); c.strokeStyle = COL.gold; c.lineWidth = 2; [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { c.beginPath(); c.moveTo(...V[a]); c.lineTo(...V[b]); c.stroke(); }); c.strokeStyle = COL.turq; c.beginPath(); c.moveTo(...V[0]); c.lineTo(...V[6]); c.stroke(); },
    vectors(c, W, H, u) { scenes.axes(c, W, H); const o = [W * 0.3, H * 0.62], a = [70 * u, -40 * u], b = [30 * u, -70 * u]; const ar = (p, v, col) => { c.strokeStyle = c.fillStyle = col; c.lineWidth = 2.5; c.beginPath(); c.moveTo(...p); c.lineTo(p[0] + v[0], p[1] + v[1]); c.stroke(); c.beginPath(); c.arc(p[0] + v[0], p[1] + v[1], 3.5, 0, 7); c.fill(); }; ar(o, a, COL.fire); ar(o, b, COL.turq); ar(o, [a[0] + b[0], a[1] + b[1]], COL.gold); },
    bars(c, W, H, u) { const v = [0.3, 0.55, 0.9, 0.7, 0.45, 0.2], bw = (W - 60) / v.length; v.forEach((h, i) => { const k = Math.min(1, Math.max(0, u * 2 - i * 0.15)); c.fillStyle = i === 2 ? COL.fire : COL.gold; c.fillRect(30 + i * bw + 4, H - 14 - h * (H - 30) * k, bw - 8, h * (H - 30) * k); }); c.fillStyle = 'rgba(241,230,207,.4)'; c.fillRect(20, H - 14, W - 40, 1); },
    motion(c, W, H, u) { c.fillStyle = 'rgba(241,230,207,.25)'; c.fillRect(0, H - 14, W, 1); const x = 20 + (W - 40) * u, y = H - 14 - Math.sin(u * Math.PI) * (H - 40); c.setLineDash([3, 5]); c.strokeStyle = 'rgba(232,184,74,.5)'; c.beginPath(); for (let k = 0; k <= u; k += 0.02) { const xx = 20 + (W - 40) * k, yy = H - 14 - Math.sin(k * Math.PI) * (H - 40); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.setLineDash([]); c.fillStyle = COL.fire; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.strokeStyle = COL.turq; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y - Math.cos(u * Math.PI) * 30); c.stroke(); },
    forces(c, W, H, u) { const a = 0.45, x0 = W * 0.15, y0 = H - 10, L = W * 0.7; c.fillStyle = '#3A2418'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + L, y0); c.lineTo(x0 + L, y0 - L * Math.tan(a) * 0.5); c.fill(); const p = 0.75 - u * 0.4, bx = x0 + L * p, by = y0 - L * p * Math.tan(a) * 0.5; c.save(); c.translate(bx, by); c.rotate(-Math.atan(Math.tan(a) * 0.5)); c.fillStyle = COL.gold; c.fillRect(-16, -22, 32, 22); c.restore(); const k = Math.min(1, u * 2); c.lineWidth = 2.5; c.strokeStyle = COL.fire; c.beginPath(); c.moveTo(bx, by - 12); c.lineTo(bx, by - 12 + 45 * k); c.stroke(); c.strokeStyle = COL.turq; c.beginPath(); c.moveTo(bx, by - 12); c.lineTo(bx - 18 * k, by - 12 - 38 * k); c.stroke(); },
    collide(c, W, H, u) { c.fillStyle = 'rgba(241,230,207,.25)'; c.fillRect(0, H * 0.7, W, 1); const hit = 0.5, x1 = u < hit ? 30 + (W / 2 - 50) * u / hit : W / 2 - 20 - (u - hit) * 60, x2 = u < hit ? W - 30 - (W / 2 - 50) * u / hit : W / 2 + 20 + (u - hit) * 140; c.fillStyle = COL.fire; c.beginPath(); c.arc(x1, H * 0.7 - 18, 18, 0, 7); c.fill(); c.fillStyle = COL.turq; c.beginPath(); c.arc(x2, H * 0.7 - 12, 12, 0, 7); c.fill(); if (Math.abs(u - hit) < 0.06) { c.strokeStyle = COL.gold; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(W / 2 + 22 * Math.cos(a), H * 0.7 - 16 + 22 * Math.sin(a)); c.lineTo(W / 2 + 34 * Math.cos(a), H * 0.7 - 16 + 34 * Math.sin(a)); c.stroke(); } } },
    pendulum(c, W, H, u) { const a = 0.7 * Math.cos(u * Math.PI * 4) * (1 - u * 0.4), L = H - 30, x = W / 2 + L * Math.sin(a), y = 10 + L * Math.cos(a); c.fillStyle = COL.ink; c.fillRect(W / 2 - 30, 6, 60, 4); c.strokeStyle = COL.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W / 2, 10); c.lineTo(x, y); c.stroke(); c.fillStyle = COL.fire; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); },
    wave(c, W, H, u) { c.strokeStyle = COL.turq; c.lineWidth = 2.5; c.beginPath(); for (let x = 0; x < W * u; x += 2) { const y = H / 2 - 28 * Math.sin(x / 28 - u * 12) * Math.min(1, (W * u - x) / 60); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); for (let x = 20; x < W * u; x += 28) { const y = H / 2 - 28 * Math.sin(x / 28 - u * 12) * Math.min(1, (W * u - x) / 60); c.fillStyle = x === 104 ? COL.fire : COL.gold; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } },
    molecules(c, W, H, u, tp, st) { if (!st.m) st.m = Array.from({ length: 26 }, () => [Math.random() * W, Math.random() * H, (Math.random() - .5) * 2, (Math.random() - .5) * 2]); st.m.forEach(m => { m[0] += m[2] * 3; m[1] += m[3] * 3; if (m[0] < 6 || m[0] > W - 6) m[2] *= -1; if (m[1] < 6 || m[1] > H - 6) m[3] *= -1; c.fillStyle = `hsl(${20 + Math.hypot(m[2], m[3]) * 20},90%,55%)`; c.beginPath(); c.arc(m[0], m[1], 4, 0, 7); c.fill(); }); c.strokeStyle = 'rgba(241,230,207,.4)'; c.strokeRect(3, 3, W - 6, H - 6); },
    circuit(c, W, H, u) { const x0 = 30, y0 = 18, w = W - 60, h = H - 36, per = 2 * (w + h); c.strokeStyle = COL.copper; c.lineWidth = 3; c.strokeRect(x0, y0, w, h); const lit = Math.min(1, u * 2); c.fillStyle = `rgba(255,214,107,${lit})`; c.shadowColor = COL.gold; c.shadowBlur = 20 * lit; c.beginPath(); c.arc(x0 + w / 2, y0, 12, 0, 7); c.fill(); c.shadowBlur = 0; c.strokeStyle = COL.ink; c.lineWidth = 1.5; c.beginPath(); c.arc(x0 + w / 2, y0, 12, 0, 7); c.stroke(); c.fillStyle = COL.ink; c.fillRect(x0 - 10, y0 + h / 2 - 2, 20, 3); c.fillRect(x0 - 6, y0 + h / 2 + 5, 12, 4);
      for (let k = 0; k < 18; k++) { let d = ((k / 18) * per + u * per * 0.6) % per, x, y; if (d < w) { x = x0 + d; y = y0; } else if (d < w + h) { x = x0 + w; y = y0 + d - w; } else if (d < 2 * w + h) { x = x0 + w - (d - w - h); y = y0 + h; } else { x = x0; y = y0 + h - (d - 2 * w - h); } c.fillStyle = COL.turq; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } },
    field(c, W, H, u) { c.strokeStyle = 'rgba(46,196,182,.35)'; c.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(W / 2, H / 2, 30 + Math.abs(i) * 22, 14 + Math.abs(i) * 10, 0, 0, 7); c.stroke(); } const a = u * Math.PI * 3, x = W / 2 + 70 * Math.cos(a), y = H / 2 + 34 * Math.sin(a); c.fillStyle = COL.fire; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); c.fillStyle = COL.gold; c.font = '14px VKHUTE, sans-serif'; c.fillText('B', W / 2 - 4, H / 2 + 5); },
    optics(c, W, H, u) { const cx = W / 2, cy = H / 2; c.strokeStyle = 'rgba(241,230,207,.35)'; c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.stroke(); c.strokeStyle = COL.turq; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, 8, H / 2 - 8, 0, 0, 7); c.stroke(); const F = W * 0.2; c.lineWidth = 2; c.strokeStyle = COL.gold; [-30, -15, 15, 30].forEach(dy => { const k = Math.min(1, u * 2), k2 = Math.max(0, u * 2 - 1); c.beginPath(); c.moveTo(10, cy + dy); c.lineTo(10 + (cx - 10) * k, cy + dy); if (k2 > 0) c.lineTo(cx + F * 2 * k2, cy + dy - dy * 2 * k2); c.stroke(); }); },
    atom(c, W, H, u) { const cx = W / 2, cy = H / 2; c.fillStyle = COL.fire; c.beginPath(); c.arc(cx, cy, 8, 0, 7); c.fill(); [0, 1.05, 2.1].forEach((r, i) => { c.save(); c.translate(cx, cy); c.rotate(r); c.strokeStyle = 'rgba(46,196,182,.5)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, H * 0.45, H * 0.16, 0, 0, 7); c.stroke(); const a = u * 8 + i * 2; c.fillStyle = COL.white; c.beginPath(); c.arc(H * 0.45 * Math.cos(a), H * 0.16 * Math.sin(a), 3.5, 0, 7); c.fill(); c.restore(); }); },
    planets(c, W, H, u) { const cx = W / 2, cy = H / 2; c.fillStyle = COL.gold; c.shadowColor = COL.orange; c.shadowBlur = 18; c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.fill(); c.shadowBlur = 0; [[40, 3, COL.copper, 3], [70, 4.5, '#2E7BD6', 1.8], [100, 3.5, COL.fire, 1.1]].forEach(([r, s, col, sp]) => { c.strokeStyle = 'rgba(241,230,207,.15)'; c.beginPath(); c.ellipse(cx, cy, r * W / 300, r * 0.42, 0, 0, 7); c.stroke(); const a = u * sp * 4; c.fillStyle = col; c.beginPath(); c.arc(cx + r * W / 300 * Math.cos(a), cy + r * 0.42 * Math.sin(a), s, 0, 7); c.fill(); }); }
  };
  FX.topicIntro = function (cv, topic) {
    const kind = SCENE[topic.id] || 'atom', fn = scenes[kind], low = FX.level() === 1, dur = low ? 1300 : 2600, st = {};
    let { c, W, H } = canvasFit(cv, 120); let raf = 0, alive = true; const t0 = performance.now();
    const paint = u => { c.clearRect(0, 0, W, H); const bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0A1324'); bg.addColorStop(1, '#170A08'); c.fillStyle = bg; c.fillRect(0, 0, W, H); try { fn(c, W, H, u, topic.id, st); } catch (e) { } };
    if (!FX.on('topic')) { paint(1); return () => { }; }
    const fr = now => { if (!alive) return; const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2.2); paint(e); if (u < 1) raf = requestAnimationFrame(fr); };
    raf = requestAnimationFrame(fr);
    return () => { alive = false; cancelAnimationFrame(raf); };
  };

  /* ================= НАГРАДЫ ================= */
  const medalSVG = (col = '#E8B84A') => `<svg viewBox="0 0 80 110" class="medal-svg" aria-hidden="true"><path d="M22 0h14l8 34H30z" fill="#C4161C"/><path d="M44 0h14l-8 34H36z" fill="#7E0F14"/><path d="M28 0h4l7 30h-4zM48 0h4l-7 30h-4z" fill="#E8B84A" opacity=".8"/>
<circle cx="40" cy="70" r="30" fill="${col}" stroke="#7E0F14" stroke-width="2"/><circle cx="40" cy="70" r="23" fill="none" stroke="#7E0F14" stroke-width="1" stroke-dasharray="2 3"/><path d="M40 50l5.9 13.9 15 1.3-11.4 9.9 3.4 14.7L40 82l-12.9 7.8 3.4-14.7-11.4-9.9 15-1.3z" fill="#C4161C" stroke="#7E0F14" stroke-width="1.2"/></svg>`;
  FX.medalSVG = medalSVG;
  FX.medal = function (title, desc) {
    return FX.queue(async () => {
      P.snd.play('award');
      const d = document.createElement('div'); d.className = 'medal-pop' + (FX.on('awards') ? '' : ' plain'); d.innerHTML = `${medalSVG()}<div><div class="lbl">Новое достижение</div><b>${P.esc(title)}</b>${desc ? `<div class="small">${P.esc(desc)}</div>` : ''}</div>`;
      document.body.appendChild(d); d.onclick = () => d.classList.add('out');
      await sleep(2600); d.classList.add('out'); await sleep(400); d.remove();
    });
  };
  FX.ceremony = function (o) {
    return FX.queue(() => new Promise(res => {
      const d = document.createElement('div'); d.className = 'ceremony' + (FX.on('awards') ? '' : ' plain');
      d.innerHTML = `<div class="cer-rays"></div><div class="cer-in">
<div class="cer-k">Приказ по проекту 200</div><h1>Присвоено звание</h1>
<div class="cer-doc"><div class="cer-doc-h">Удостоверение № 001-${String(o.idx).padStart(2, '0')}</div><div class="cer-row">${o.insignia}<div><div class="cer-name">${P.esc(o.name)}</div><div class="cer-rank">${P.esc(o.rank)}</div><div class="cer-date">${o.date}</div></div></div><div class="cer-seal">${sealSVG('Проект 200', 'Присвоено')}</div></div>
<div class="cer-medal">${medalSVG()}</div><p class="small">Основание: подтверждённые учебные достижения.</p><button class="btn gold">Служу знанию!</button></div>`;
      document.body.appendChild(d); P.snd.play('rank');
      d.querySelector('button').onclick = () => { d.classList.add('out'); setTimeout(() => { d.remove(); res(); }, 400); };
    }));
  };
  function sealSVG(top, mid) {
    return `<svg viewBox="0 0 120 120" class="seal-svg" aria-hidden="true"><defs><path id="sgT${top.length}" d="M18 60a42 42 0 0 1 84 0"/><path id="sgB${top.length}" d="M14 60a46 46 0 0 0 92 0"/></defs>
<circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text font-size="10" fill="currentColor" font-family="VKHUTE,sans-serif" letter-spacing="1.5"><textPath href="#sgT${top.length}" startOffset="50%" text-anchor="middle">${P.esc(top.toUpperCase())}</textPath></text>
<text font-size="9" fill="currentColor" font-family="VKHUTE,sans-serif" letter-spacing="1.5"><textPath href="#sgB${top.length}" startOffset="50%" text-anchor="middle">★ ЕГЭ 2027 ★</textPath></text>
<path d="M60 36l5.6 13.2 14.3 1.2-10.9 9.4 3.3 14L60 66.4l-12.3 7.4 3.3-14-10.9-9.4 14.3-1.2z" fill="currentColor"/><text x="60" y="88" text-anchor="middle" font-size="9" fill="currentColor" font-family="VKHUTE,sans-serif" letter-spacing="1">${P.esc(mid.toUpperCase())}</text></svg>`;
  }
  FX.sealSVG = sealSVG;
  /* наградной документ с печатью (результат крупного испытания) */
  FX.sealDoc = function (box, o, animate) {
    box.innerHTML = `<div class="award-doc${animate && FX.on('awards') ? ' play' : ''}"><div class="ad-k">Научный совет «Проекта 200»</div><div class="ad-t">Наградной лист</div><p>Испытание «${P.esc(o.title)}» выдержано с результатом <b>${o.sum} из ${o.max}</b> первичных баллов (${o.pct}%).</p><div class="ad-sign"><span>Председатель комиссии</span><i></i></div><div class="ad-seal">${sealSVG('Экзаменационная комиссия', 'Утверждено')}</div></div>`;
    if (animate && FX.on('awards')) setTimeout(() => P.snd.play('stamp'), 650);
  };
})();
