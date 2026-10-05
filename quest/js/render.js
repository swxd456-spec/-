/* Canvas reel renderer: glass / chrome reel window, motion-blurred spins with bounce,
   symbol landing pops, energy-beam paylines, glowing winners with shine sweeps,
   shattering tumbles, lightning wild reels, tall expanding wilds and the hold & win board. */
(function (root) {
  const U = root.U, Art = root.SlotArt;
  const LINE_COLORS = ['#ff3b5c', '#ffd23f', '#3bff9a', '#3bc8ff', '#c46bff', '#ff8a3b', '#ff5ec8', '#3bffe8', '#b6ff3b', '#ffffff'];
  const TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  class Reels {
    constructor(canvas, m) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.m = m;
      this.th = m.theme;
      this.cache = new Map();
      this.reels = [];
      this.hl = null;
      this.hold = null;
      this.time = 0;
      this.flash = [];
      this.stopFx = [];
      for (let r = 0; r < m.reels; r++) {
        this.reels.push({ mode: 'static', cells: [], rows: m.mech === 'megaways' ? 4 : m.rows, filler: [], big: null });
      }
      this.reels.forEach((rl, r) => {
        for (let i = 0; i < 40; i++) {
          const w = m.reelWeights[r].slice();
          [m.bombIdx, m.coinIdx].forEach((x) => { if (x >= 0) w[x] *= 0.4; });
          rl.filler.push({ s: U.wpick(w) });
        }
      });
      this.tmp = document.createElement('canvas');
    }

    resize() {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const w = this.cv.clientWidth, h = this.cv.clientHeight;
      if (!w || !h) return;
      this.dpr = dpr;
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
      this.W = w; this.H = h;
      const R = this.m.reels;
      this.pad = Math.max(4, Math.min(w, h) * 0.02);
      this.gap = this.th.classic ? Math.max(6, w * 0.02) : R > 6 ? 1 : Math.max(2, w * 0.006);
      this.rw = (w - this.pad * 2 - this.gap * (R - 1)) / R;
      this.rh = h - this.pad * 2;
      this.cache.clear();
    }

    reelX(r) { return this.pad + r * (this.rw + this.gap); }
    cellH(r) { return this.rh / this.reels[r].rows; }
    cellCenter(r, row) { const ch = this.cellH(r); return [this.reelX(r) + this.rw / 2, this.pad + row * ch + ch / 2]; }
    pageXY(r, row) {
      const b = this.cv.getBoundingClientRect();
      const [x, y] = this.cellCenter(r, row);
      return [b.left + x * (b.width / this.W), b.top + y * (b.height / this.H)];
    }
    tierColor(s) { return Art.tierColor(this.m, s); }

    /* ---------- sprites ---------- */
    tile(s, w, h) {
      const key = 't' + s + '|' + Math.round(w) + '|' + Math.round(h);
      let c = this.cache.get(key);
      if (c) return c;
      const dpr = this.dpr || 1;
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      Art.draw(g, this.m, s, w, h);
      this.cache.set(key, c);
      return c;
    }
    blurTile(s, w, h) {
      const key = 'b' + s + '|' + Math.round(w) + '|' + Math.round(h);
      let c = this.cache.get(key);
      if (c) return c;
      const src = this.tile(s, w, h);
      c = document.createElement('canvas');
      c.width = src.width; c.height = Math.round(src.height * 1.5);
      const g = c.getContext('2d');
      const off = src.height * 0.25;
      const N = 7;
      for (let i = 0; i < N; i++) {
        g.globalAlpha = i === (N - 1) / 2 ? 0.45 : 0.16;
        g.drawImage(src, 0, off + ((i - (N - 1) / 2) / N) * src.height * 0.55);
      }
      this.cache.set(key, c);
      return c;
    }
    tall(w, h) {
      const key = 'tall|' + Math.round(w) + '|' + Math.round(h);
      let c = this.cache.get(key);
      if (c) return c;
      const dpr = this.dpr || 1;
      c = document.createElement('canvas');
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      Art.tallWild(g, this.m, w, h);
      this.cache.set(key, c);
      return c;
    }
    windowBg() {
      const key = 'win|' + this.W + '|' + this.H;
      let c = this.cache.get(key);
      if (c) return c;
      const dpr = this.dpr || 1;
      c = document.createElement('canvas');
      c.width = Math.round(this.W * dpr); c.height = Math.round(this.H * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const th = this.th;
      for (let r = 0; r < this.reels.length; r++) {
        const x = this.reelX(r), y = this.pad, w = this.rw, h = this.rh;
        if (th.classic) {
          const gr = g.createLinearGradient(0, y, 0, y + h);
          gr.addColorStop(0, '#8c939b'); gr.addColorStop(0.18, '#f4f6f8'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.82, '#f4f6f8'); gr.addColorStop(1, '#8c939b');
          rr(g, x, y, w, h, Math.min(12, w * 0.06)); g.fillStyle = gr; g.fill();
          const sg = g.createLinearGradient(x, 0, x + w, 0);
          sg.addColorStop(0, 'rgba(0,0,0,0.25)'); sg.addColorStop(0.12, 'rgba(0,0,0,0)'); sg.addColorStop(0.88, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.25)');
          g.fillStyle = sg; g.fill();
        } else {
          const base = th.glass || '#0a0a14';
          const gr = g.createLinearGradient(0, y, 0, y + h);
          gr.addColorStop(0, U.rgba(base, 0.92)); gr.addColorStop(0.5, U.rgba(U.hexToRgb(base).map((v) => Math.min(255, v + 18)).reduce((a, v) => a + v.toString(16).padStart(2, '0'), '#'), 0.85)); gr.addColorStop(1, U.rgba(base, 0.92));
          g.fillStyle = gr;
          g.fillRect(x, y, w, h);
          const cg = g.createLinearGradient(x, 0, x + w, 0);
          cg.addColorStop(0, 'rgba(0,0,0,0.25)'); cg.addColorStop(0.5, U.rgba(th.accent, 0.05)); cg.addColorStop(1, 'rgba(0,0,0,0.25)');
          g.fillStyle = cg; g.fillRect(x, y, w, h);
          if (r > 0) {
            const lg = g.createLinearGradient(0, y, 0, y + h);
            lg.addColorStop(0, U.rgba(th.frame[0], 0)); lg.addColorStop(0.5, U.rgba(th.frame[0], 0.35)); lg.addColorStop(1, U.rgba(th.frame[0], 0));
            g.fillStyle = lg; g.fillRect(x - this.gap / 2 - 0.5, y, 1, h);
          }
        }
      }
      this.cache.set(key, c);
      return c;
    }

    /* ---------- grid state ---------- */
    setGrid(grid) {
      grid.forEach((col, r) => {
        const rl = this.reels[r];
        rl.mode = 'static';
        rl.rows = col.length;
        rl.big = null;
        rl.cells = col.map((c, row) => ({ c, y: row, scale: 1, alpha: 1 }));
      });
    }

    startSpin(finalGrid, opts) {
      const now = performance.now() / 1000;
      this.hl = null;
      this.reels.forEach((rl, r) => {
        const tape = new Map();
        rl.cells.forEach((d) => tape.set(-Math.round(d.y), d.c));
        rl.tape = tape;
        rl.mode = 'spin';
        rl.big = null;
        rl.rows = finalGrid[r].length;
        rl.cells = [];
        rl.final = finalGrid[r];
        rl.t0 = now + r * (opts.stagger || 0.045);
        rl.v = opts.speed || 22;
        rl.stopAt = null;
        rl.stopReq = null;
        rl.glow = false;
      });
    }
    reelP(rl, t) {
      const ta = 0.18, tr = 0.16;
      const u = t - rl.t0;
      if (u < 0) return 0;
      if (u < ta) return -0.32 * Math.sin(Math.PI * u / ta);
      const w = u - ta;
      return w < tr ? rl.v * w * w / (2 * tr) : rl.v * (w - tr / 2);
    }
    requestStop(r, at, cb) { const rl = this.reels[r]; rl.stopReq = at; rl.onStop = cb; }
    updateSpin(t) {
      for (let r = 0; r < this.reels.length; r++) {
        const rl = this.reels[r];
        if (rl.mode !== 'spin') continue;
        if (rl.stopReq != null && rl.stopAt == null && t >= rl.stopReq && t > rl.t0 + 0.32) {
          const ps = this.reelP(rl, t);
          const P = Math.ceil(ps) + rl.rows + 2;
          rl.final.forEach((c, j) => rl.tape.set(P - j, c));
          rl.stopAt = t; rl.ps = ps; rl.P = P;
          rl.D = Math.max(0.2, (P - ps) * 4.0 / rl.v);
        }
        if (rl.stopAt != null) {
          const u = (t - rl.stopAt) / rl.D;
          if (u >= 1) {
            rl.mode = 'static';
            rl.cells = rl.final.map((c, row) => {
              const special = this.m.symbols[c.s].type !== 'normal';
              return { c, y: row, scale: 1, alpha: 1, pop: special ? t : 0 };
            });
            rl.glow = false;
            this.stopFx.push({ r, t0: t });
            const cb = rl.onStop; rl.onStop = null; rl.stopReq = null;
            if (cb) cb(r);
          } else rl.p = rl.ps + (rl.P - rl.ps) * U.easeOutBack(u, 1.15);
        } else rl.p = this.reelP(rl, t);
      }
    }
    tapeCell(rl, k) {
      if (rl.tape.has(k)) return rl.tape.get(k);
      const f = rl.filler;
      return f[((k % f.length) + f.length) % f.length];
    }

    /* ---------- drawing ---------- */
    drawValue(ctx, text, cx, cy, size, c1, c2) {
      ctx.save();
      ctx.font = `700 ${size}px "Oxanium","Bungee","Arial Black",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.24; ctx.strokeStyle = 'rgba(30,10,0,0.9)';
      ctx.strokeText(text, cx, cy);
      const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
      g.addColorStop(0, c1 || '#ffffff'); g.addColorStop(0.5, c2 || '#ffe27a'); g.addColorStop(1, U.shade(c2 || '#ffe27a', -0.3));
      ctx.fillStyle = g; ctx.fillText(text, cx, cy);
      ctx.restore();
    }
    drawExtras(ctx, c, cx, cy, w, h, t) {
      const m = Math.min(w, h);
      if (c.v != null) {
        const lab = c.label;
        this.drawValue(ctx, lab || U.fmt(c.v), cx, cy + (lab ? 0 : m * 0.04), Math.max(10, m * (lab ? 0.2 : 0.24)), '#ffffff', lab ? { MINI: '#7dffb0', MINOR: '#7fd0ff', MAJOR: '#ff9cf0' }[lab] : '#ffe27a');
      } else if (c.s === this.m.wildIdx && c.m > 1) {
        const r = Math.max(9, m * 0.16), x = cx + w * 0.3, y = cy - h * 0.3;
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
        g.addColorStop(0, '#ff9aa8'); g.addColorStop(1, '#c4002a');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        this.drawValue(ctx, 'x' + c.m, x, y + 1, r * 1.05, '#ffffff', '#ffffff');
      } else if (c.s === this.m.bombIdx && c.m) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba('#e9b6ff', 0.7); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, m * 0.42, t * 3, t * 3 + 4); ctx.stroke();
        ctx.restore();
        this.drawValue(ctx, 'x' + c.m, cx, cy + m * 0.02, Math.max(11, m * 0.3), '#ffffff', '#f0c8ff');
      }
    }
    drawRays(ctx, cx, cy, r, col, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.8);
      for (let i = 0; i < 10; i++) {
        ctx.rotate(TAU / 10);
        const g = ctx.createLinearGradient(0, 0, r, 0);
        g.addColorStop(0, U.rgba(col, 0.35)); g.addColorStop(1, U.rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.12); ctx.lineTo(r, r * 0.12); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    drawSymbol(ctx, d, r, row, x, ch, t, win, dim) {
      const rw = this.rw;
      const y = this.pad + d.y * ch;
      const cx = x + rw / 2, cy = y + ch / 2;
      const sym = this.m.symbols[d.c.s];
      let sc = d.scale;
      if (d.pop) {
        const u = (t - d.pop) / 0.5;
        if (u < 1) sc *= 1 + 0.3 * Math.sin(u * Math.PI) * (1 - u); else d.pop = 0;
      }
      if (win) {
        const u = t - this.hl.t0;
        sc *= (u < 0.4 ? 1 + 0.38 * Math.sin((u / 0.4) * Math.PI) : 1) + 0.07 * Math.sin(u * 7);
        const tc = this.tierColor(d.c.s);
        this.drawRays(ctx, cx, cy, Math.min(rw, ch) * 0.95, tc, t * 1.5 + r);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(u * 7);
        const gs = Math.min(rw, ch) * 1.9;
        ctx.drawImage(root.FxSprites.glow(tc), cx - gs / 2, cy - gs / 2, gs, gs);
        if (u < 0.5) {
          ctx.globalAlpha = (1 - u / 0.5) * 0.9;
          const ws = Math.min(rw, ch) * (1.2 + u * 2.5);
          ctx.drawImage(root.FxSprites.glow('#ffffff'), cx - ws / 2, cy - ws / 2, ws, ws);
        }
        ctx.restore();
      } else if (sym.type === 'scatter' || sym.type === 'bonus') {
        this.drawRays(ctx, cx, cy, Math.min(rw, ch) * 0.75, sym.type === 'bonus' ? '#ffcc33' : this.th.accent2, t);
      }
      const img = this.tile(d.c.s, rw, ch);
      let alpha = d.alpha * (dim ? 0.28 : 1);
      if (sym.type !== 'normal' && !win && !dim) sc *= 1 + 0.03 * Math.sin(t * 3 + r + row);
      ctx.globalAlpha = alpha;
      if (d.rot) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.rot);
        ctx.drawImage(img, -rw * sc / 2, -ch * sc / 2, rw * sc, ch * sc);
        ctx.restore();
      } else ctx.drawImage(img, cx - rw * sc / 2, cy - ch * sc / 2, rw * sc, ch * sc);
      if (win) this.shine(ctx, img, cx, cy, rw * sc, ch * sc, t - this.hl.t0 + r * 0.08);
      if (d.flash) {
        const f = Math.max(0, 1 - (t - d.flash) / 0.5);
        if (f > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f;
          const gs = Math.min(rw, ch) * 1.6;
          ctx.drawImage(root.FxSprites.glow('#ffffff'), cx - gs / 2, cy - gs / 2, gs, gs);
          ctx.restore();
        } else d.flash = 0;
      }
      ctx.globalAlpha = alpha;
      this.drawExtras(ctx, d.c, cx, cy, rw * sc, ch * sc, t);
      ctx.globalAlpha = 1;
    }
    // diagonal light sweep masked to the symbol's own pixels
    shine(ctx, img, cx, cy, w, h, u) {
      const period = 1.6;
      const ph = (u % period) / period;
      if (ph > 0.55) return;
      const k = ph / 0.55;
      const tc = this.tmp;
      if (tc.width !== img.width || tc.height !== img.height) { tc.width = img.width; tc.height = img.height; }
      const g = tc.getContext('2d');
      g.globalCompositeOperation = 'copy';
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      const W = tc.width, H = tc.height;
      const x = -W + k * W * 3;
      const gr = g.createLinearGradient(x, 0, x + W * 0.6, H);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tc, 0, 0, W, H, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
    }

    draw(tms) {
      const t = tms / 1000;
      this.time = t;
      const ctx = this.ctx;
      if (!this.W) this.resize();
      if (!this.W) return;
      this.updateSpin(t);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.drawImage(this.windowBg(), 0, 0, this.W, this.H);
      const hl = this.hl && this.hl.cells;
      for (let r = 0; r < this.reels.length; r++) {
        const rl = this.reels[r];
        const x = this.reelX(r);
        const ch = this.rh / rl.rows;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, this.pad - 2, this.rw, this.rh + 4); ctx.clip();
        if (rl.mode === 'spin') {
          const speed = rl.stopAt != null ? Math.max(0, 1 - (t - rl.stopAt) / (rl.D * 0.7)) : (t - rl.t0 > 0.2 ? 1 : 0);
          const kMin = Math.floor(rl.p - rl.rows) - 1, kMax = Math.ceil(rl.p) + 1;
          for (let k = kMin; k <= kMax; k++) {
            const j = rl.p - k;
            const y = this.pad + j * ch;
            if (y > this.pad + this.rh || y + ch < this.pad) continue;
            const c = this.tapeCell(rl, k);
            if (speed > 0.3) {
              const b = this.blurTile(c.s, this.rw, ch);
              ctx.drawImage(b, x, y - ch * 0.25, this.rw, ch * 1.5);
            } else {
              ctx.drawImage(this.tile(c.s, this.rw, ch), x, y, this.rw, ch);
              this.drawExtras(ctx, c, x + this.rw / 2, y + ch / 2, this.rw, ch, t);
            }
          }
        } else if (this.hold && r < this.hold.cells.length) {
          this.drawHoldReel(ctx, r, x, ch, t);
        } else if (rl.big) {
          const win = hl && rl.cells.some((d, row) => hl.has(r + ',' + row));
          const u = Math.min(1, (t - rl.big.t0) / 0.45);
          const e = U.easeOutBack(u, 1.4);
          const cy = this.pad + (rl.big.row + 0.5) * ch;
          const hh = ch + (this.rh - ch) * e;
          const top = U.lerp(cy - ch / 2, this.pad, e);
          if (win) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin((t - this.hl.t0) * 7);
            ctx.drawImage(root.FxSprites.glow(this.th.accent), x - this.rw * 0.5, this.pad, this.rw * 2, this.rh);
            ctx.restore();
          }
          ctx.globalAlpha = hl && !win ? 0.3 : 1;
          const img = this.tall(this.rw, this.rh);
          ctx.drawImage(img, x, top, this.rw, hh);
          ctx.globalAlpha = 1;
          if (win) this.shine(ctx, img, x + this.rw / 2, this.pad + this.rh / 2, this.rw, this.rh, t - this.hl.t0);
        } else {
          for (let row = 0; row < rl.cells.length; row++) {
            const d = rl.cells[row];
            if (!d || d.alpha <= 0) continue;
            const win = hl && hl.has(r + ',' + row);
            this.drawSymbol(ctx, d, r, row, x, ch, t, win, hl && !win);
          }
        }
        ctx.restore();
        if (rl.glow) this.drawAnticipation(ctx, r, t);
      }
      // depth shading at top/bottom of the window
      if (!this.th.classic) {
        const sh = ctx.createLinearGradient(0, this.pad, 0, this.pad + this.rh);
        sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(0.1, 'rgba(0,0,0,0)');
        sh.addColorStop(0.9, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = sh; ctx.fillRect(this.pad, this.pad, this.W - this.pad * 2, this.rh);
      } else if (this.m.rows === 1 || this.m.rows === 3) {
        // classic pay window guide
        const y = this.pad + this.rh / 2;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#d4001a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.pad * 0.4, y); ctx.lineTo(this.W - this.pad * 0.4, y); ctx.stroke();
        ctx.restore();
      }
      this.drawStopFx(ctx, t);
      if (this.hl && this.hl.lines) this.drawLines(ctx, t);
      if (this.hl && this.hl.cells && this.hl.frames) this.drawFrames(ctx, t);
      this.drawFlashes(ctx, t);
    }

    // reel-stop flash: a light band blooming from the middle of the reel
    drawStopFx(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.stopFx) {
        const u = (t - f.t0) / 0.45;
        if (u > 1) continue;
        const x = this.reelX(f.r), cx = x + this.rw / 2, cy = this.pad + this.rh / 2;
        const a = (1 - u);
        const gl = root.FxSprites.glow(this.th.accent);
        ctx.globalAlpha = a * 0.75;
        const gw = this.rw * (1.1 + u * 0.6), gh = this.rh * (0.35 + u * 0.75);
        ctx.drawImage(gl, cx - gw / 2, cy - gh / 2, gw, gh);
        ctx.globalAlpha = a * 0.9;
        const lg = ctx.createLinearGradient(x, 0, x + this.rw, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x - this.rw * 0.2, cy - 1.5 - u * 2, this.rw * 1.4, 3 + u * 4);
      }
      ctx.restore();
      this.stopFx = this.stopFx.filter((f) => t - f.t0 < 0.45);
    }

    drawAnticipation(ctx, r, t) {
      const x = this.reelX(r), y = this.pad, w = this.rw, h = this.rh;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const c = this.th.accent2;
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 12);
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, U.rgba(c, 0.5)); g.addColorStop(0.5, U.rgba(c, 0.05)); g.addColorStop(1, U.rgba(c, 0.5));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      // flowing energy border
      const per = (w + h) * 2;
      ctx.lineWidth = 4;
      ctx.strokeStyle = c;
      ctx.shadowColor = c; ctx.shadowBlur = 18;
      ctx.setLineDash([per * 0.18, per * 0.07]);
      ctx.lineDashOffset = -t * per * 0.9;
      rr(ctx, x + 2, y + 2, w - 4, h - 4, Math.min(14, w * 0.1));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawLines(ctx, t) {
      const pl = this.m.paylines;
      const u = t - this.hl.t0;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      this.hl.lines.forEach((li, n) => {
        const line = pl[li];
        const col = this.hl.single ? this.hl.color : LINE_COLORS[li % LINE_COLORS.length];
        const pts = [[this.pad * 0.2, this.cellCenter(0, line[0])[1]]].concat(line.map((row, r) => this.cellCenter(r, row)), [[this.W - this.pad * 0.2, this.cellCenter(line.length - 1, line[line.length - 1])[1]]]);
        // draw-in progress
        const prog = Math.min(1, u * 3 - n * 0.08);
        if (prog <= 0) return;
        const segs = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(L); total += L; }
        const path = (upto) => {
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          let acc = 0;
          for (let i = 1; i < pts.length; i++) {
            if (acc + segs[i - 1] <= upto) { ctx.lineTo(pts[i][0], pts[i][1]); acc += segs[i - 1]; } else {
              const k = (upto - acc) / segs[i - 1];
              ctx.lineTo(U.lerp(pts[i - 1][0], pts[i][0], k), U.lerp(pts[i - 1][1], pts[i][1], k)); break;
            }
          }
        };
        const upto = total * prog;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 9; path(upto); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba(col, 0.28); ctx.lineWidth = 20; path(upto); ctx.stroke();
        ctx.strokeStyle = U.rgba(col, 0.5); ctx.lineWidth = 10; path(upto); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 5; path(upto); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; path(upto); ctx.stroke();
        // travelling energy pulses
        if (prog >= 1) {
          for (let k = 0; k < 3; k++) {
            let d = ((u * 0.55 + k / 3) % 1) * total;
            let i = 0;
            while (i < segs.length && d > segs[i]) { d -= segs[i]; i++; }
            if (i >= segs.length) continue;
            const f = d / segs[i];
            const px = U.lerp(pts[i][0], pts[i + 1][0], f), py = U.lerp(pts[i][1], pts[i + 1][1], f);
            ctx.drawImage(root.FxSprites.glow(col), px - 26, py - 26, 52, 52);
            ctx.drawImage(root.FxSprites.glow('#ffffff'), px - 10, py - 10, 20, 20);
          }
        }
      });
      ctx.restore();
    }

    drawFrames(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const col = this.hl.color || this.th.accent;
      ctx.strokeStyle = U.rgba(col, 0.55 + 0.25 * Math.sin((t - this.hl.t0) * 7));
      ctx.lineWidth = 2;
      this.hl.cells.forEach((k) => {
        const [r, row] = k.split(',').map(Number);
        const rl = this.reels[r];
        if (!rl || row >= rl.rows) return;
        const ch = this.cellH(r);
        rr(ctx, this.reelX(r) + 2, this.pad + row * ch + 2, this.rw - 4, ch - 4, Math.min(this.rw, ch) * 0.18);
        ctx.stroke();
      });
      ctx.restore();
    }

    drawFlashes(ctx, t) {
      for (const f of this.flash) {
        const u = (t - f.t0) / f.dur;
        if (u < 0 || u > 1) continue;
        const x = this.reelX(f.r);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.sin(u * Math.PI);
        const gr = ctx.createLinearGradient(x - this.rw * 0.4, 0, x + this.rw * 1.4, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, f.color); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x - this.rw * 0.4, this.pad, this.rw * 1.8, this.rh);
        if (f.bolt) this.drawBolt(ctx, x + this.rw / 2, f.seed, u);
        ctx.restore();
      }
      this.flash = this.flash.filter((f) => t - f.t0 < f.dur);
    }

    drawBolt(ctx, cx, seed, u) {
      const rnd = U.mulberry32(seed + Math.floor(u * 6));
      for (let b = 0; b < 2; b++) {
        ctx.strokeStyle = b ? U.rgba(this.th.accent, 0.8) : '#ffffff';
        ctx.lineWidth = b ? 8 : 3;
        ctx.beginPath();
        let x = cx, y = -10;
        ctx.moveTo(x, y);
        while (y < this.H) {
          y += 14 + rnd() * 22; x = cx + (rnd() - 0.5) * this.rw * 0.7; ctx.lineTo(x, y);
          if (rnd() < 0.15) { ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * this.rw, y + 30); ctx.moveTo(x, y); }
        }
        ctx.stroke();
      }
    }

    drawHoldReel(ctx, r, x, ch, t) {
      const H = this.hold;
      for (let row = 0; row < H.cells[r].length; row++) {
        const y = this.pad + row * ch;
        const c = H.cells[r][row];
        const key = r + ',' + row;
        const m = Math.min(this.rw, ch);
        const cx = x + this.rw / 2, cy = y + ch / 2;
        if (c) {
          const pop = H.pop && H.pop[key] ? Math.max(0, 1 - (t - H.pop[key]) / 0.6) : 0;
          const sc = 1 + pop * 0.4 * Math.sin(pop * Math.PI) + 0.03 * Math.sin(t * 3 + r + row);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 + pop * 0.6;
          ctx.drawImage(root.FxSprites.glow(c.label ? '#ff7ad9' : '#ffcc33'), cx - m * 0.8, cy - m * 0.8, m * 1.6, m * 1.6);
          ctx.restore();
          if (H.collected && H.collected.has(key)) ctx.globalAlpha = 0.35;
          const img = this.tile(this.m.coinIdx, this.rw, ch);
          ctx.drawImage(img, cx - this.rw * sc / 2, cy - ch * sc / 2, this.rw * sc, ch * sc);
          this.drawExtras(ctx, { v: c.v, label: c.label }, cx, cy, this.rw * sc, ch * sc, t);
          ctx.globalAlpha = 1;
        } else {
          rr(ctx, x + 4, y + 4, this.rw - 8, ch - 8, m * 0.14);
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = U.rgba(this.th.accent, H.spinning ? 0.45 + 0.35 * Math.sin(t * 18 + r + row) : 0.25);
          ctx.lineWidth = 1.5; ctx.stroke();
          if (H.spinning) {
            const ph = (t * 3 + r * 0.17 + row * 0.31) % 1;
            const g = ctx.createLinearGradient(0, y, 0, y + ch);
            g.addColorStop(Math.max(0, ph - 0.15), 'rgba(255,220,120,0)'); g.addColorStop(ph, 'rgba(255,220,120,0.22)'); g.addColorStop(Math.min(1, ph + 0.15), 'rgba(255,220,120,0)');
            ctx.fillStyle = g; ctx.fillRect(x + 4, y + 4, this.rw - 8, ch - 8);
          }
          ctx.restore();
        }
      }
    }

    /* ---------- animations ---------- */
    animate(dur, fn) {
      return new Promise((res) => {
        const t0 = performance.now();
        const step = () => {
          const u = Math.min(1, (performance.now() - t0) / dur);
          fn(u);
          if (u < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    }
    setHighlight(cells, lines, color, opts) {
      this.hl = cells ? { cells: new Set(cells.map((p) => p[0] + ',' + p[1])), lines, color, t0: this.time, single: opts && opts.single, frames: opts && opts.frames } : null;
    }
    async explode(positions, onBurst) {
      const ds = [];
      positions.forEach(([r, row]) => {
        const d = this.reels[r].cells[row];
        if (d) { ds.push(d); d.flash = this.time; }
      });
      await this.animate(120, () => {});
      positions.forEach(([r, row]) => onBurst && onBurst(r, row, this.reels[r].cells[row]));
      await this.animate(200, (u) => { ds.forEach((d) => { d.scale = 1 + 0.15 * u; d.alpha = 1 - u; }); });
    }
    async dropIn(newGrid, removed) {
      const rmSet = new Set(removed.map((p) => p[0] + ',' + p[1]));
      const moves = [];
      newGrid.forEach((col, r) => {
        const rl = this.reels[r];
        const kept = [];
        rl.cells.forEach((d, row) => { if (!rmSet.has(r + ',' + row)) kept.push(row); });
        const need = col.length - kept.length;
        const cells = [];
        for (let row = 0; row < col.length; row++) {
          const fromY = row < need ? row - need - 0.4 : kept[row - need];
          const d = { c: col[row], y: fromY, scale: 1, alpha: 1 };
          cells.push(d);
          if (fromY !== row) moves.push({ d, from: fromY, to: row, delay: r * 0.035 + (col.length - row) * 0.02 });
        }
        rl.cells = cells;
      });
      this.hl = null;
      await this.animate(480, (u) => {
        moves.forEach((mv) => {
          const k = U.clamp((u - mv.delay) / Math.max(0.3, 1 - mv.delay), 0, 1);
          // gravity fall then a small settle bounce
          const e = k < 0.75 ? Math.pow(k / 0.75, 2) : 1 - Math.sin(((k - 0.75) / 0.25) * Math.PI) * 0.06;
          mv.d.y = mv.from + (mv.to - mv.from) * e;
        });
      });
    }
    async transformReels(reels, toGrid, bolt) {
      const t0 = this.time;
      reels.forEach((r, i) => this.flash.push({ r, t0: t0 + i * 0.15, dur: 0.75, color: U.rgba(this.th.accent, 0.85), bolt, seed: (Math.random() * 1e9) | 0 }));
      await U.wait(320);
      reels.forEach((r) => {
        this.reels[r].cells = toGrid[r].map((c, row) => ({ c, y: row, scale: 1, alpha: 1, flash: this.time }));
        this.reels[r].big = { t0: this.time - 1, row: 0 };
      });
      await U.wait(520);
    }
    async expandReels(reels, toGrid, fromGrid) {
      reels.forEach((r) => {
        const row = Math.max(0, fromGrid[r].findIndex((c) => c.s === this.m.wildIdx));
        this.reels[r].cells = toGrid[r].map((c, rw) => ({ c, y: rw, scale: 1, alpha: 1 }));
        this.reels[r].big = { t0: this.time, row };
        this.flash.push({ r, t0: this.time, dur: 0.6, color: U.rgba(this.th.accent, 0.6), bolt: false, seed: 1 });
      });
      await U.wait(650);
    }
    setReelGlow(r, on) { if (this.reels[r]) this.reels[r].glow = on; }
  }

  root.ReelRenderer = Reels;
  root.LINE_COLORS = LINE_COLORS;
})(window);
