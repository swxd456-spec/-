/* Shared base for the mini-games.
   Every game registers itself as window.QuestGames[id] = class extends QuestGames.Base { ... }.

   Contract used by main.js (and dev/game.html):
     static info   = { id, name, icon, section, color, desc }
     static howto  = ['한 줄 설명', ...]                  (shown the first time the game appears)
     static params(stage, C) → { ...game values, fee, reward, extendCost, extendText, mode }
     new Game(host, o)   o = { params, stage, seed, m, theme, fx, machineId, spend(cost, what) → bool, onEvent(type, data), onEnd(result) }
     .layout() .start() .resume() .destroy()  .paused (set by main while panels are open)
     onEnd({ cleared: true, score, stars: 1..3, timeLeft?, rows?: [[label, coins], ...] }) or onEnd({ cleared: false, reason })
*/
(function (root) {
  const U = root.U, A = root.SlotAudio;

  // gentle difficulty: 0 at stage 1, ~0.63 at stage 1+n, → 1 later
  const ease = (stage, n) => 1 - Math.exp(-Math.max(0, stage - 1) / Math.max(1, n));
  const lerp = (a, b, u) => a + (b - a) * u;

  class Base {
    constructor(host, o) {
      this.host = host; this.o = o; this.p = o.params;
      this.th = o.theme || (o.m && o.m.theme) || { accent: '#ff4fd8', accent2: '#00e5ff' };
      this.rnd = U.mulberry32(o.seed >>> 0 || 1);
      this.paused = false; this.running = false; this.dead = false;
      this.score = 0; this.time = this.p.time || 0;
      this.anims = [];
    }

    /* ---------- DOM ---------- */
    // opts: { title, sub, timer: true|false, tools: [{ id, ico, label, cost }] }
    hud(opts) {
      const h = this.host;
      h.innerHTML = `<div class="mg-hud">
          <div class="mg-stage"><b>${opts.title}</b> <span class="js-sub">${opts.sub || ''}</span></div>
          <div class="mg-timer ${opts.timer === false ? 'mg-meter' : ''}"><div class="mg-timer-fill js-tfill"></div><span class="js-tnum"></span></div>
          <div class="mg-info js-info"></div>
        </div>
        <div class="mg-board js-wrap"><canvas class="js-cv"></canvas><div class="mg-banner js-banner"></div></div>
        <div class="mg-tools js-tools">${(opts.tools || []).map((t) => `<button class="mg-tool" data-tool="${t.id}"><span class="ico">${t.ico}</span><span>${t.label}</span>${t.cost != null ? `<em>${t.cost}</em>` : ''}</button>`).join('')}</div>`;
      const q = (s) => h.querySelector(s);
      this.ui = { sub: q('.js-sub'), tfill: q('.js-tfill'), tnum: q('.js-tnum'), info: q('.js-info'), wrap: q('.js-wrap'), cv: q('.js-cv'), banner: q('.js-banner'), tools: q('.js-tools') };
      this.ctx = this.ui.cv.getContext('2d');
      this.ui.tools.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (this.running && !this.paused) this.tool(b.dataset.tool, b); }));
      this.onResize = () => this.layout();
      addEventListener('resize', this.onResize);
      return this.ui;
    }
    tool() {}
    // charge coins for a tool; opens the shop through main when short
    pay(cost, what) { return cost <= 0 || this.o.spend(cost, what); }
    // fraction 0..1 and label; warn turns the bar red
    meter(frac, label, warn) {
      this.ui.tfill.style.transform = `scaleX(${U.clamp(frac, 0, 1)})`;
      this.ui.tfill.classList.toggle('warn', !!warn);
      this.ui.tnum.textContent = label;
    }
    info(html) { if (this.ui.info.innerHTML !== html) this.ui.info.innerHTML = html; }
    banner(text, cls, ms) {
      const b = this.ui.banner;
      b.textContent = text; b.className = 'mg-banner'; void b.offsetWidth; b.className = 'mg-banner show ' + (cls || '');
      clearTimeout(this.bannerT); this.bannerT = setTimeout(() => { b.className = 'mg-banner'; }, ms || 1300);
    }

    /* ---------- canvas ---------- */
    // sizes the canvas to its wrapper; returns false when the wrapper has no size yet
    fit() {
      const W = this.ui.wrap.clientWidth, H = this.ui.wrap.clientHeight;
      if (!W || !H) return false;
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.dpr = dpr; this.W = W; this.H = H;
      this.ui.cv.width = Math.round(W * dpr); this.ui.cv.height = Math.round(H * dpr);
      this.ui.cv.style.width = W + 'px'; this.ui.cv.style.height = H + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    // pointer → canvas css px
    local(e) { const b = this.ui.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    // canvas css px → page px (for SlotFx which draws on a fixed full-screen canvas)
    page(x, y) { const b = this.ui.cv.getBoundingClientRect(); return [b.left + x, b.top + y]; }
    pop(x, y, str, color, size) { const [px, py] = this.page(x, y); this.o.fx.text(px, py, str, color || '#ffe27a', size || 24); }
    burst(x, y, color, n, power) { const [px, py] = this.page(x, y); this.o.fx.burst(px, py, color, n || 16, power || 1); }
    ring(x, y, color, r, w) { const [px, py] = this.page(x, y); this.o.fx.ring(px, py, color, r || 60, w || 4); }
    shards(x, y, color, n, size) { const [px, py] = this.page(x, y); this.o.fx.shards(px, py, color, n || 10, size || 8); }
    explode(x, y, power, colors) { const [px, py] = this.page(x, y); this.o.fx.explode(px, py, power || 1.5, colors); }
    shake(ms) { const w = this.ui.wrap; w.classList.remove('mg-shake'); void w.offsetWidth; w.classList.add('mg-shake'); if (ms) setTimeout(() => w.classList.remove('mg-shake'), ms); }

    /* ---------- loop ---------- */
    start() {
      this.running = true;
      let last = performance.now();
      const loop = (tms) => {
        if (this.dead) return;
        const dt = Math.min(0.05, (tms - last) / 1000); last = tms;
        if (this.running && !this.paused) {
          if (this.p.time && this.timed !== false) {
            const before = this.time;
            this.time = Math.max(0, this.time - dt);
            if (Math.ceil(before) !== Math.ceil(this.time) && this.time <= 10 && this.time > 0) A.qTick && A.qTick(Math.ceil(this.time));
            if (this.time <= 0) { this.lose('time'); }
          }
          this.update(dt, tms / 1000);
        }
        this.draw(tms / 1000, this.paused ? 0 : dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    update() {}
    draw() {}
    // main calls this after the player buys more time / moves on the fail screen
    resume() { this.time += this.p.extendSec || 0; this.running = true; this.paused = false; }
    win(extra) {
      if (!this.running) return;
      this.running = false;
      const r = Object.assign({ cleared: true, score: Math.round(this.score), stars: this.stars(), timeLeft: this.time }, extra || {});
      setTimeout(() => { if (!this.dead) this.o.onEnd(r); }, 900);
    }
    lose(reason) {
      if (!this.running) return;
      this.running = false;
      this.o.onEnd({ cleared: false, reason: reason || 'fail', score: Math.round(this.score) });
    }
    // default: score thresholds p.star = [one, two, three]
    stars() { const s = this.p.star || [0, 0, 0]; return this.score >= s[2] ? 3 : this.score >= s[1] ? 2 : 1; }
    destroy() { this.dead = true; this.running = false; removeEventListener('resize', this.onResize); clearTimeout(this.bannerT); this.host.innerHTML = ''; }
  }

  // read a config section with defaults (numbers parsed)
  function cfg(C, section, defaults) {
    const out = {};
    for (const k in defaults) {
      const v = C && C.get ? C.get(section, k) : undefined;
      out[k] = v === undefined ? defaults[k] : typeof defaults[k] === 'number' ? (typeof v === 'number' ? v : parseFloat(v) || 0) : v;
    }
    return out;
  }

  // rounded rect path helper
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  root.QuestGames = root.QuestGames || {};
  root.QuestGames.Base = Base;
  root.QuestGames.util = { ease, lerp, cfg, rr };
})(window);
