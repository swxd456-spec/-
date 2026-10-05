/* 사천성 (Shisen-sho): connect identical tiles with a path of at most two turns.
   Boards are built in reverse so every board has a solution; gravity variants,
   gold/clock special tiles, combos, hints and shuffles. Canvas rendered. */
(function (root) {
  const U = root.U, Art = root.SlotArt, A = root.SlotAudio;
  const EXTRA = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍍', '🥝', '🌸', '🌻', '🍀', '🍄', '🐱', '🐶', '🐼', '🐸', '🦊', '🐰', '🐻', '🐯',
    '🦁', '🐵', '⭐', '🌙', '⚡', '🔥', '💧', '❄️', '🎈', '🎁', '🎀', '👑', '🔔', '🎵', '🍩', '🧁', '🍭', '🐳', '🦋', '🐞'];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const GRAV = ['down', 'up', 'left', 'right', 'split'];
  const GRAV_KR = { down: '아래로', up: '위로', left: '왼쪽으로', right: '오른쪽으로', split: '가운데서 위아래로' };

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- board logic ---------- */
  class Board {
    constructor(R, C) { this.R = R; this.C = C; this.g = []; for (let r = 0; r < R + 2; r++) this.g.push(new Array(C + 2).fill(null)); }
    at(r, c) { return r < 0 || c < 0 || r > this.R + 1 || c > this.C + 1 ? undefined : this.g[r][c]; }
    inner(r, c) { return r >= 1 && c >= 1 && r <= this.R && c <= this.C; }
    // cells strictly between p and q (same row or col) are empty; endpoints may be ignored
    clear(p, q, ends) {
      const free = (r, c) => { const v = this.at(r, c); if (v === undefined) return false; return v === null || ends.some((e) => e[0] === r && e[1] === c); };
      if (!free(p[0], p[1]) || !free(q[0], q[1])) return false;
      if (p[0] === q[0]) { const [a, b] = [Math.min(p[1], q[1]), Math.max(p[1], q[1])]; for (let c = a + 1; c < b; c++) if (this.g[p[0]][c] !== null) return false; return true; }
      if (p[1] === q[1]) { const [a, b] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])]; for (let r = a + 1; r < b; r++) if (this.g[r][p[1]] !== null) return false; return true; }
      return false;
    }
    // shortest path with <= 2 turns as a list of corner points, or null
    path(a, b) {
      const ends = [a, b];
      const ok = (...pts) => { for (let i = 1; i < pts.length; i++) if (!this.clear(pts[i - 1], pts[i], ends)) return false; return true; };
      const len = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); return s; };
      if ((a[0] === b[0] || a[1] === b[1]) && ok(a, b)) return [a, b];
      let best = null;
      const consider = (pts) => { if (ok(...pts) && (!best || len(pts) < len(best))) best = pts; };
      consider([a, [a[0], b[1]], b]);
      consider([a, [b[0], a[1]], b]);
      if (best) return best;
      for (let r = 0; r <= this.R + 1; r++) if (r !== a[0] || r !== b[0]) consider([a, [r, a[1]], [r, b[1]], b]);
      for (let c = 0; c <= this.C + 1; c++) consider([a, [a[0], c], [b[0], c], b]);
      return best;
    }
    // all cells reachable from a with <= 2 turns through empty cells (used for generation)
    reach(a) {
      const seen = new Set();
      const out = [];
      const walk = (p, dirs, depth) => {
        for (const [dr, dc] of dirs) {
          let r = p[0] + dr, c = p[1] + dc;
          while (this.at(r, c) === null) {
            const k = r * 100 + c;
            if (!seen.has(k)) { seen.add(k); if (this.inner(r, c)) out.push([r, c]); }
            if (depth < 2) walk([r, c], dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]], depth + 1);
            r += dr; c += dc;
          }
        }
      };
      walk(a, DIRS, 0);
      return out;
    }
    tiles() { const t = []; for (let r = 1; r <= this.R; r++) for (let c = 1; c <= this.C; c++) if (this.g[r][c]) t.push([r, c]); return t; }
    findMove() {
      const t = this.tiles();
      const byKind = {};
      t.forEach((p) => { const k = this.g[p[0]][p[1]].k; (byKind[k] = byKind[k] || []).push(p); });
      for (const k in byKind) {
        const L = byKind[k];
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const p = this.path(L[i], L[j]); if (p) return [L[i], L[j], p]; }
      }
      return null;
    }
  }

  function generate(R, C, kinds, specialP, rnd) {
    const pairs = (R * C) / 2;
    for (let attempt = 0; attempt < 80; attempt++) {
      const b = new Board(R, C);
      const order = [];
      for (let i = 0; i < pairs; i++) order.push(i % kinds);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      let ok = true;
      for (const k of order) {
        const empties = [];
        for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) if (b.g[r][c] === null) empties.push([r, c]);
        let placed = false;
        for (let tries = 0; tries < 12 && !placed; tries++) {
          const a = empties[Math.floor(rnd() * empties.length)];
          const cand = b.reach(a).filter((p) => p[0] !== a[0] || p[1] !== a[1]);
          if (!cand.length) continue;
          const q = cand[Math.floor(rnd() * cand.length)];
          const sp = rnd() < specialP ? (rnd() < 0.55 ? 'gold' : 'clock') : null;
          b.g[a[0]][a[1]] = { k, sp };
          b.g[q[0]][q[1]] = { k, sp };
          placed = true;
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return b;
    }
    // fallback: random fill (shuffle helper keeps it playable)
    const b = new Board(R, C);
    const cells = [];
    for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) cells.push([r, c]);
    cells.sort(() => rnd() - 0.5);
    for (let i = 0; i < cells.length; i += 2) { const k = (i / 2) % kinds; b.g[cells[i][0]][cells[i][1]] = { k, sp: null }; b.g[cells[i + 1][0]][cells[i + 1][1]] = { k, sp: null }; }
    return b;
  }

  /* ---------- game ---------- */
  class Shisen {
    constructor(host, o) {
      this.host = host;
      this.o = o; // { params, m (prepared machine), seed, fx, onEvent(type,data), onEnd(result), stage }
      this.p = o.params;
      this.m = o.m;
      this.th = o.m.theme;
      this.rnd = U.mulberry32(o.seed || 1);
      this.cache = new Map();
      this.anims = [];
      this.beams = [];
      this.sel = null;
      this.hintPair = null;
      this.combo = 0;
      this.maxCombo = 0;
      this.lastMatch = 0;
      this.gold = 0;
      this.freeShuffle = 1;
      this.running = false;
      this.time = this.p.time;
      this.build();
    }

    build() {
      const h = this.host;
      h.innerHTML = `<div class="mg-hud">
          <div class="mg-stage"><b>사천성</b> <span class="js-sub"></span></div>
          <div class="mg-timer"><div class="mg-timer-fill js-tfill"></div><span class="js-tnum"></span></div>
          <div class="mg-info"><span class="js-left"></span><span class="mg-combo js-combo"></span></div>
        </div>
        <div class="mg-board js-wrap"><canvas class="js-cv"></canvas><div class="mg-banner js-banner"></div></div>
        <div class="mg-tools">
          <button class="mg-tool js-hint"><span class="ico">💡</span><span>힌트</span><em class="js-hint-cost"></em></button>
          <button class="mg-tool js-shuffle"><span class="ico">🔀</span><span>셔플</span><em class="js-shuf-cost"></em></button>
        </div>`;
      const q = (s) => h.querySelector(s);
      this.ui = { sub: q('.js-sub'), tfill: q('.js-tfill'), tnum: q('.js-tnum'), left: q('.js-left'), combo: q('.js-combo'), wrap: q('.js-wrap'), cv: q('.js-cv'), banner: q('.js-banner'), hint: q('.js-hint'), shuffle: q('.js-shuffle'), hintCost: q('.js-hint-cost'), shufCost: q('.js-shuf-cost') };
      this.ctx = this.ui.cv.getContext('2d');
      // orientation: long side of the board follows the long side of the screen
      let R = this.p.rows, C = this.p.cols;
      const portrait = innerHeight > innerWidth;
      if ((portrait && C > R) || (!portrait && R > C)) [R, C] = [C, R];
      this.R = R; this.C = C;
      // faces: this hall's symbols first, then extra illustrations
      const faces = [];
      for (let i = this.m.normalCount - 1; i >= 0; i--) faces.push({ t: 'sym', s: i });
      const ex = EXTRA.slice().sort(() => this.rnd() - 0.5);
      ex.forEach((e) => faces.push({ t: 'emo', e }));
      this.kinds = Math.min(this.p.kinds, faces.length, (R * C) / 2);
      this.faces = faces.slice(0, this.kinds);
      this.board = generate(R, C, this.kinds, this.p.special, this.rnd);
      this.gravity = this.p.gravity ? GRAV[Math.floor(this.rnd() * GRAV.length)] : null;
      this.ui.sub.textContent = `${this.o.stage}판 · ${R * C}타일${this.gravity ? ' · 중력 ' + GRAV_KR[this.gravity] : ''}`;
      this.ui.hintCost.textContent = this.p.hint;
      this.ui.shufCost.textContent = this.freeShuffle ? '무료' : this.p.shuffle;
      this.ui.hint.addEventListener('click', () => this.useHint());
      this.ui.shuffle.addEventListener('click', () => this.useShuffle());
      this.ui.cv.addEventListener('pointerdown', (e) => this.tap(e));
      this.onResize = () => this.layout();
      addEventListener('resize', this.onResize);
      this.layout();
      this.updateHud();
      // intro: tiles drop in
      const t0 = performance.now() / 1000;
      this.board.tiles().forEach(([r, c]) => { this.board.g[r][c].in = t0 + (r + c) * 0.025 + this.rnd() * 0.1; });
    }

    layout() {
      const W = this.ui.wrap.clientWidth, H = this.ui.wrap.clientHeight;
      if (!W || !H) return;
      const asp = 0.8;
      // half a tile of margin on every side for paths that go around the board
      const cw = Math.min(W / (this.C + 0.9), (H / (this.R + 0.9)) * asp);
      this.cw = Math.floor(cw); this.ch = Math.floor(cw / asp);
      this.depth = Math.max(2, Math.round(this.cw * 0.1));
      const bw = this.C * this.cw, bh = this.R * this.ch;
      this.ox = Math.round((W - bw) / 2) - this.depth / 2;
      this.oy = Math.round((H - bh) / 2) - this.depth / 2;
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.dpr = dpr;
      this.W = W; this.H = H;
      this.ui.cv.width = Math.round(W * dpr); this.ui.cv.height = Math.round(H * dpr);
      this.ui.cv.style.width = W + 'px'; this.ui.cv.style.height = H + 'px';
      this.cache.clear();
    }
    // centre of grid cell (r,c) in canvas px (border ring cells sit half outside)
    pos(r, c) { return [this.ox + (c - 0.5) * this.cw, this.oy + (r - 0.5) * this.ch]; }
    page(r, c) { const b = this.ui.cv.getBoundingClientRect(); const [x, y] = this.pos(r, c); return [b.left + x, b.top + y]; }

    sprite(t, state) {
      const key = t.k + '|' + (t.sp || '') + '|' + state + '|' + this.cw;
      let cv = this.cache.get(key);
      if (cv) return cv;
      const w = this.cw - 2, h = this.ch - 2, d = this.depth;
      const dpr = this.dpr;
      cv = document.createElement('canvas');
      cv.width = Math.ceil((w + d) * dpr); cv.height = Math.ceil((h + d) * dpr);
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      const rad = w * 0.16;
      // thickness (jade back like a real mahjong tile)
      const side = U.shade(this.th.accent, -0.35);
      rr(g, d, d, w, h, rad);
      const sg = g.createLinearGradient(0, d, 0, h + d);
      sg.addColorStop(0, side); sg.addColorStop(1, U.shade(this.th.accent, -0.7));
      g.fillStyle = sg; g.fill();
      for (let i = d - 1; i > 0; i--) { rr(g, i, i, w, h, rad); g.fillStyle = i > d * 0.5 ? '#d8cfbb' : '#ebe3d2'; g.fill(); }
      // face
      rr(g, 0, 0, w, h, rad);
      const fg = g.createLinearGradient(0, 0, w, h);
      if (state === 'dim') { fg.addColorStop(0, '#9c968a'); fg.addColorStop(1, '#7c776d'); }
      else { fg.addColorStop(0, '#fffdf6'); fg.addColorStop(0.55, '#f6efdf'); fg.addColorStop(1, '#e6dcc6'); }
      g.fillStyle = fg; g.fill();
      g.strokeStyle = 'rgba(120,100,70,0.45)'; g.lineWidth = 1; g.stroke();
      rr(g, w * 0.07, h * 0.06, w * 0.86, h * 0.88, rad * 0.7);
      g.strokeStyle = t.sp === 'gold' ? 'rgba(212,160,23,0.9)' : t.sp === 'clock' ? 'rgba(40,160,255,0.8)' : 'rgba(150,130,100,0.25)';
      g.lineWidth = t.sp ? 2 : 1; g.stroke();
      // symbol
      const f = this.faces[t.k];
      const sz = Math.min(w, h) * 0.86;
      g.save();
      g.translate((w - sz) / 2, (h - sz) / 2 - h * 0.02);
      if (f.t === 'sym') Art.draw(g, this.m, f.s, sz, sz);
      else Art.emojiArt(g, f.e, sz / 2, sz / 2, sz * 0.62, { outline: 'rgba(60,40,20,0.85)', ow: 0.03 });
      g.restore();
      // gloss
      const gl = g.createLinearGradient(0, 0, 0, h * 0.5);
      gl.addColorStop(0, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      rr(g, w * 0.04, h * 0.03, w * 0.92, h * 0.4, rad * 0.8); g.fillStyle = gl; g.fill();
      if (t.sp) {
        g.font = `${Math.max(10, w * 0.3)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(t.sp === 'gold' ? '🪙' : '⏱️', w - w * 0.16, h * 0.14);
      }
      if (state === 'dim') { rr(g, 0, 0, w, h, rad); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); }
      this.cache.set(key, cv);
      return cv;
    }

    start() {
      this.running = true;
      this.last = performance.now();
      this.loop = (tms) => {
        if (this.dead) return;
        const dt = Math.min(0.1, (tms - this.last) / 1000);
        this.last = tms;
        if (this.running && !this.paused) {
          this.time -= dt;
          if (this.time <= 10 && Math.floor(this.time) !== this.lastTick && this.time > 0) { this.lastTick = Math.floor(this.time); A.qTick && A.qTick(this.time); }
          if (this.time <= 0) { this.time = 0; this.running = false; this.o.onEnd({ cleared: false, reason: 'time' }); }
          this.updateHud();
        }
        this.draw(tms / 1000);
        requestAnimationFrame(this.loop);
      };
      requestAnimationFrame(this.loop);
    }
    resume(extraSec) { this.time += extraSec; this.running = true; this.paused = false; }
    destroy() { this.dead = true; removeEventListener('resize', this.onResize); this.host.innerHTML = ''; }

    updateHud() {
      const u = Math.max(0, this.time / this.p.time);
      this.ui.tfill.style.transform = `scaleX(${Math.min(1, u)})`;
      this.ui.tfill.classList.toggle('warn', this.time < 15);
      this.ui.tnum.textContent = Math.ceil(this.time) + 's';
      this.ui.left.textContent = `남은 타일 ${this.board.tiles().length}`;
    }

    banner(text, cls) {
      const b = this.ui.banner;
      b.textContent = text;
      b.className = 'mg-banner show ' + (cls || '');
      clearTimeout(this.bannerT);
      this.bannerT = setTimeout(() => { b.className = 'mg-banner'; }, 1300);
    }

    tap(e) {
      if (!this.running || this.paused || this.busy) return;
      const b = this.ui.cv.getBoundingClientRect();
      const x = e.clientX - b.left, y = e.clientY - b.top;
      const c = Math.floor((x - this.ox) / this.cw) + 1, r = Math.floor((y - this.oy) / this.ch) + 1;
      if (!this.board.inner(r, c) || !this.board.g[r][c]) return;
      A.init && A.init();
      const t = this.board.g[r][c];
      if (!this.sel) { this.sel = [r, c]; A.qTile && A.qTile(0); return; }
      const [sr, sc] = this.sel;
      if (sr === r && sc === c) { this.sel = null; A.qTile && A.qTile(1); return; }
      const s = this.board.g[sr][sc];
      if (s.k !== t.k) { this.sel = [r, c]; A.qTile && A.qTile(0); return; }
      const path = this.board.path([sr, sc], [r, c]);
      if (!path) {
        A.qBad && A.qBad();
        this.anims.push({ type: 'shake', cells: [[sr, sc], [r, c]], t0: performance.now() / 1000 });
        this.sel = [r, c];
        this.banner('연결할 수 없어요', 'bad');
        return;
      }
      this.match([sr, sc], [r, c], path);
    }

    match(a, b, path) {
      const now = performance.now() / 1000;
      const ta = this.board.g[a[0]][a[1]];
      this.combo = now - this.lastMatch < 3 ? this.combo + 1 : 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.lastMatch = now;
      this.sel = null;
      this.hintPair = null;
      this.beams.push({ pts: path, t0: now, col: this.th.accent });
      const fx = this.o.fx;
      [a, b].forEach(([r, c]) => {
        const [x, y] = this.page(r, c);
        fx.shards(x, y, '#f4ecd8', 6, this.cw * 0.18);
        fx.burst(x, y, this.th.accent, 14, 0.9);
        this.anims.push({ type: 'pop', tile: this.board.g[r][c], r, c, t0: now });
        this.board.g[r][c] = null;
      });
      A.qMatch && A.qMatch(this.combo);
      if (ta.sp === 'gold') { this.gold += 30; const [x, y] = this.page(a[0], a[1]); fx.coins(10, x, y, 40); fx.text(x, y - 20, '+30', '#ffd54a', 26); A.coinLand && A.coinLand(2); }
      if (ta.sp === 'clock') { this.time += 10; const [x, y] = this.page(a[0], a[1]); fx.text(x, y - 20, '+10초', '#7fd0ff', 26); }
      if (this.combo >= 2) {
        this.ui.combo.textContent = `COMBO x${this.combo}`;
        this.ui.combo.classList.remove('pop'); void this.ui.combo.offsetWidth; this.ui.combo.classList.add('pop');
        if (this.combo % 5 === 0) { this.banner(`${this.combo} COMBO!`, 'good'); const [x, y] = this.page(b[0], b[1]); fx.explode(x, y, 2, [this.th.accent, '#fff', '#ffe27a']); }
      }
      this.o.onEvent('match', { combo: this.combo });
      this.updateHud();
      if (this.gravity) { this.busy = true; setTimeout(() => { this.applyGravity(); this.busy = false; this.afterMove(); }, 260); } else this.afterMove();
    }

    afterMove() {
      if (!this.board.tiles().length) {
        this.running = false;
        setTimeout(() => this.o.onEnd({ cleared: true, timeLeft: this.time, maxCombo: this.maxCombo, gold: this.gold }), 700);
        return;
      }
      if (!this.board.findMove()) {
        if (this.freeShuffle > 0) { this.banner('막혔어요! 자동 셔플', 'info'); setTimeout(() => this.shuffle(true), 600); }
        else this.banner('막혔어요! 셔플을 사용하세요', 'bad');
      }
    }

    applyGravity() {
      const B = this.board, R = this.R, C = this.C;
      const now = performance.now() / 1000;
      const moveLine = (cells) => {
        // cells: ordered list of [r,c] from the "floor" side; compact tiles towards the floor
        const tiles = cells.map(([r, c]) => B.g[r][c]).filter(Boolean);
        const from = cells.filter(([r, c]) => B.g[r][c]).map((p) => p.slice());
        cells.forEach(([r, c]) => { B.g[r][c] = null; });
        tiles.forEach((t, i) => {
          const [r, c] = cells[i];
          B.g[r][c] = t;
          const [fr, fc] = from[i];
          if (fr !== r || fc !== c) t.slide = { fr, fc, t0: now };
        });
      };
      const g = this.gravity;
      if (g === 'down' || g === 'up' || g === 'split') {
        for (let c = 1; c <= C; c++) {
          if (g === 'split') {
            const mid = Math.floor(R / 2);
            const top = []; for (let r = 1; r <= mid; r++) top.push([r, c]);
            const bot = []; for (let r = R; r > mid; r--) bot.push([r, c]);
            moveLine(top); moveLine(bot);
          } else {
            const col = []; for (let r = 1; r <= R; r++) col.push([r, c]);
            moveLine(g === 'down' ? col.reverse() : col);
          }
        }
      } else {
        for (let r = 1; r <= R; r++) {
          const row = []; for (let c = 1; c <= C; c++) row.push([r, c]);
          moveLine(g === 'right' ? row.reverse() : row);
        }
      }
      A.drop && A.drop();
    }

    useHint() {
      if (!this.running || this.paused) return;
      const mv = this.board.findMove();
      if (!mv) { this.banner('지금은 이을 수 있는 짝이 없어요', 'bad'); return; }
      if (!this.o.spend(this.p.hint, '힌트')) return;
      this.hintPair = [mv[0], mv[1]];
      this.hintT = performance.now() / 1000;
      A.qHint && A.qHint();
      this.o.onEvent('hint', {});
    }
    useShuffle() {
      if (!this.running || this.paused) return;
      if (this.freeShuffle > 0) { this.freeShuffle--; this.shuffle(false); }
      else if (this.o.spend(this.p.shuffle, '셔플')) this.shuffle(false);
      this.ui.shufCost.textContent = this.freeShuffle ? '무료' : this.p.shuffle;
    }
    shuffle(auto) {
      if (auto) this.freeShuffle = Math.max(0, this.freeShuffle - 1);
      const B = this.board;
      const now = performance.now() / 1000;
      for (let tries = 0; tries < 60; tries++) {
        const cells = B.tiles();
        const tiles = cells.map(([r, c]) => B.g[r][c]);
        for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
        cells.forEach(([r, c], i) => { B.g[r][c] = tiles[i]; });
        if (B.findMove()) break;
      }
      B.tiles().forEach(([r, c]) => { B.g[r][c].in = now + Math.random() * 0.25; });
      this.sel = null; this.hintPair = null;
      A.qShuffle && A.qShuffle();
      this.ui.shufCost.textContent = this.freeShuffle ? '무료' : this.p.shuffle;
    }

    draw(t) {
      const g = this.ctx;
      if (!this.W) return;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      // felt mat under the board
      const bx = this.ox - this.cw * 0.35, by = this.oy - this.ch * 0.3, bw = this.C * this.cw + this.cw * 0.7 + this.depth, bh = this.R * this.ch + this.ch * 0.6 + this.depth;
      rr(g, bx, by, bw, bh, 18);
      const mg = g.createLinearGradient(0, by, 0, by + bh);
      mg.addColorStop(0, 'rgba(10,6,24,0.55)'); mg.addColorStop(1, 'rgba(10,6,24,0.75)');
      g.fillStyle = mg; g.fill();
      g.strokeStyle = U.rgba(this.th.accent, 0.35); g.lineWidth = 2; g.stroke();
      const B = this.board;
      const hp = this.hintPair;
      // draw back-to-front so tile thickness overlaps correctly
      for (let r = 1; r <= this.R; r++) {
        for (let c = 1; c <= this.C; c++) {
          const tile = B.g[r][c];
          if (!tile) continue;
          let [x, y] = this.pos(r, c);
          let sc = 1, alpha = 1, lift = 0;
          if (tile.in && t < tile.in + 0.45) {
            const u = Math.max(0, (t - tile.in) / 0.45);
            y -= (1 - U.easeOutBack(u, 1.6)) * this.ch * 0.8; alpha = Math.min(1, u * 2);
          } else tile.in = 0;
          if (tile.slide) {
            const u = Math.min(1, (t - tile.slide.t0) / 0.28);
            const [fx, fy] = this.pos(tile.slide.fr, tile.slide.fc);
            x = U.lerp(fx, x, U.easeOutBack(u, 0.9)); y = U.lerp(fy, y, U.easeOutBack(u, 0.9));
            if (u >= 1) tile.slide = null;
          }
          const isSel = this.sel && this.sel[0] === r && this.sel[1] === c;
          const isHint = hp && ((hp[0][0] === r && hp[0][1] === c) || (hp[1][0] === r && hp[1][1] === c));
          if (isSel) { lift = this.ch * 0.12; sc = 1.06 + Math.sin(t * 8) * 0.02; }
          for (const an of this.anims) if (an.type === 'shake' && an.cells.some((p) => p[0] === r && p[1] === c)) { const u = t - an.t0; if (u < 0.35) x += Math.sin(u * 60) * 4 * (1 - u / 0.35); }
          const spr = this.sprite(tile, 'n');
          const w = (this.cw - 2 + this.depth) * sc, h = (this.ch - 2 + this.depth) * sc;
          if (isSel || isHint) {
            g.save(); g.globalCompositeOperation = 'lighter';
            g.globalAlpha = isHint ? 0.55 + 0.35 * Math.sin(t * 7) : 0.75;
            const gs = Math.max(w, h) * 1.6;
            g.drawImage(root.FxSprites.glow(isHint ? '#7fffd4' : this.th.accent), x - gs / 2, y - lift - gs / 2, gs, gs);
            g.restore();
          }
          g.globalAlpha = alpha;
          g.drawImage(spr, x - w / 2, y - h / 2 - lift, w, h);
          g.globalAlpha = 1;
          if (isSel || isHint) {
            rr(g, x - w / 2, y - h / 2 - lift, w - this.depth * sc, h - this.depth * sc, this.cw * 0.16);
            g.strokeStyle = isHint ? '#7fffd4' : this.th.accent; g.lineWidth = 3; g.stroke();
          }
        }
      }
      // popping tiles
      this.anims = this.anims.filter((an) => {
        const u = (t - an.t0) / (an.type === 'pop' ? 0.35 : 0.4);
        if (u >= 1) return false;
        if (an.type === 'pop') {
          const [x, y] = this.pos(an.r, an.c);
          const spr = this.sprite(an.tile, 'n');
          const s = 1 + u * 0.4;
          g.globalAlpha = 1 - u;
          g.drawImage(spr, x - (spr.width / this.dpr) * s / 2, y - (spr.height / this.dpr) * s / 2 - u * 20, (spr.width / this.dpr) * s, (spr.height / this.dpr) * s);
          g.globalAlpha = 1;
        }
        return true;
      });
      // connection beams
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      this.beams = this.beams.filter((bm) => {
        const u = (t - bm.t0) / 0.55;
        if (u >= 1) return false;
        const pts = bm.pts.map(([r, c]) => this.pos(r, c));
        const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 1 - u;
        g.strokeStyle = U.rgba(bm.col, 0.35); g.lineWidth = 16; path(); g.stroke();
        g.strokeStyle = bm.col; g.lineWidth = 6; path(); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 2.2; path(); g.stroke();
        // travelling spark
        let total = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(L); total += L; }
        let d = Math.min(1, u * 2.2) * total, i = 0;
        while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const f = seg[i] ? d / seg[i] : 0;
        const px = U.lerp(pts[i][0], pts[i + 1][0], f), py = U.lerp(pts[i][1], pts[i + 1][1], f);
        g.drawImage(root.FxSprites.glow('#ffffff'), px - 22, py - 22, 44, 44);
        return true;
      });
      g.restore();
    }
  }

  root.ShisenGame = Shisen;
  root.ShisenBoard = { Board, generate };
})(window);
