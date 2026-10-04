/* Canvas reel renderer: symbol tiles, spinning reels with blur & bounce, cascades,
   win highlights, paylines, hold & win board. */
(function (root) {
  const U = root.U;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  const LINE_COLORS = ['#ff3b3b', '#ffd23f', '#3bff7a', '#3bc8ff', '#c03bff', '#ff8a3b', '#ff3bc0', '#3bffe8', '#a3ff3b', '#ffffff'];

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
      this.labels = { wild: 'WILD', scatter: m.mech === 'scatter' || m.mech === 'cluster' ? 'FREE' : 'SCATTER', bonus: 'BONUS' };
      for (let r = 0; r < m.reels; r++) {
        this.reels.push({ mode: 'static', cells: [], rows: m.mech === 'megaways' ? 4 : m.rows, filler: [] });
      }
      this.genFillers();
    }

    genFillers() {
      const E = root.SlotEngine;
      this.reels.forEach((rl, r) => {
        rl.filler = [];
        for (let i = 0; i < 40; i++) {
          const w = this.m.reelWeights[r].slice();
          [this.m.bombIdx, this.m.coinIdx].forEach((x) => { if (x >= 0) w[x] *= 0.4; });
          rl.filler.push({ s: U.wpick(w) });
        }
      });
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
      this.pad = Math.max(4, Math.min(w, h) * 0.018);
      this.gap = R > 6 ? 2 : Math.max(3, w * 0.008);
      this.rw = (w - this.pad * 2 - this.gap * (R - 1)) / R;
      this.rh = h - this.pad * 2;
      this.cache.clear();
    }

    reelX(r) { return this.pad + r * (this.rw + this.gap); }
    cellH(r) { return this.rh / this.reels[r].rows; }
    cellCenter(r, row) {
      const ch = this.cellH(r);
      return [this.reelX(r) + this.rw / 2, this.pad + row * ch + ch / 2];
    }
    // page coordinates (for particles)
    pageXY(r, row) {
      const b = this.cv.getBoundingClientRect();
      const [x, y] = this.cellCenter(r, row);
      return [b.left + x * (b.width / this.W), b.top + y * (b.height / this.H)];
    }

    setGrid(grid) {
      grid.forEach((col, r) => {
        const rl = this.reels[r];
        rl.mode = 'static';
        rl.rows = col.length;
        rl.cells = col.map((c, row) => ({ c, y: row, scale: 1, alpha: 1 }));
      });
    }

    gridFromDisplay() { return this.reels.map((rl) => rl.cells.map((d) => d.c)); }

    /* ---------- spinning ---------- */
    startSpin(finalGrid, opts) {
      const now = performance.now() / 1000;
      this.hl = null;
      this.reels.forEach((rl, r) => {
        const tape = new Map();
        rl.cells.forEach((d) => tape.set(-Math.round(d.y), d.c));
        rl.tape = tape;
        rl.mode = 'spin';
        rl.rows = finalGrid[r].length;
        rl.cells = [];
        rl.final = finalGrid[r];
        rl.t0 = now + r * (opts.stagger || 0);
        rl.v = opts.speed || 22;
        rl.p = 0;
        rl.stopAt = null;
        rl.stopped = false;
        rl.glow = false;
      });
    }

    reelP(rl, t) {
      const ta = 0.16, tr = 0.14;
      const u = t - rl.t0;
      if (u < 0) return 0;
      if (u < ta) return -0.28 * Math.sin(Math.PI * u / ta);
      const w = u - ta;
      return w < tr ? rl.v * w * w / (2 * tr) : rl.v * (w - tr / 2);
    }

    requestStop(r, at, cb) {
      const rl = this.reels[r];
      rl.stopReq = at; // absolute seconds
      rl.onStop = cb;
    }

    updateSpin(t) {
      for (let r = 0; r < this.reels.length; r++) {
        const rl = this.reels[r];
        if (rl.mode !== 'spin') continue;
        if (rl.stopReq != null && rl.stopAt == null && t >= rl.stopReq && t > rl.t0 + 0.3) {
          const ps = this.reelP(rl, t);
          const P = Math.ceil(ps) + rl.rows + 2;
          rl.final.forEach((c, j) => rl.tape.set(P - j, c));
          rl.stopAt = t; rl.ps = ps; rl.P = P;
          rl.D = Math.max(0.18, (P - ps) * 4.2 / rl.v);
        }
        if (rl.stopAt != null) {
          const u = (t - rl.stopAt) / rl.D;
          if (u >= 1) {
            rl.mode = 'static';
            rl.cells = rl.final.map((c, row) => ({ c, y: row, scale: 1, alpha: 1 }));
            rl.stopped = true;
            rl.glow = false;
            const cb = rl.onStop; rl.onStop = null; rl.stopReq = null;
            if (cb) cb(r);
          } else rl.p = rl.ps + (rl.P - rl.ps) * U.easeOutBack(u, 1.2);
        } else rl.p = this.reelP(rl, t);
      }
    }

    tapeCell(rl, k) {
      if (rl.tape.has(k)) return rl.tape.get(k);
      const f = rl.filler;
      return f[((k % f.length) + f.length) % f.length];
    }

    /* ---------- symbol tiles ---------- */
    tierColor(s) {
      const sym = this.m.symbols[s];
      const t = this.th.tiers || [];
      if (sym.type === 'wild') return this.th.accent;
      if (sym.type === 'scatter') return this.th.accent2;
      if (sym.type === 'coin') return '#ffcc33';
      if (sym.type === 'bonus') return '#ffcc33';
      if (sym.type === 'bomb') return '#c084fc';
      return t[sym.tier % (t.length || 1)] || '#888888';
    }

    tile(s, w, h) {
      const key = s + '|' + Math.round(w) + '|' + Math.round(h);
      let c = this.cache.get(key);
      if (c) return c;
      const dpr = this.dpr || 1;
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      this.drawTile(g, s, w, h);
      this.cache.set(key, c);
      return c;
    }

    drawTile(g, s, w, h) {
      const sym = this.m.symbols[s];
      const col = this.tierColor(s);
      const style = this.th.tile;
      const inset = Math.min(w, h) * 0.05;
      const x = inset, y = inset, tw = w - inset * 2, thh = h - inset * 2;
      const m = Math.min(tw, thh);
      const special = sym.type !== 'normal';
      g.save();
      const grad = (a, b) => { const gr = g.createLinearGradient(0, y, 0, y + thh); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
      switch (style) {
        case 'neon':
          rr(g, x, y, tw, thh, m * 0.18);
          g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
          g.shadowColor = col; g.shadowBlur = m * 0.12;
          g.strokeStyle = col; g.lineWidth = Math.max(1.5, m * 0.035); g.stroke();
          g.shadowBlur = 0;
          break;
        case 'classic':
          if (special) { rr(g, x, y, tw, thh, m * 0.12); g.fillStyle = U.rgba(col, 0.18); g.fill(); }
          break;
        case 'gold': case 'marble': {
          rr(g, x, y, tw, thh, m * 0.14);
          g.fillStyle = style === 'marble' ? grad('#f7f3ea', '#d9d2c3') : grad(U.shade(col, -0.55), U.shade(col, -0.8));
          g.fill();
          const bg = g.createLinearGradient(x, y, x + tw, y + thh);
          bg.addColorStop(0, '#fff3b0'); bg.addColorStop(0.4, '#d4a017'); bg.addColorStop(0.6, '#8a6508'); bg.addColorStop(1, '#ffe27a');
          g.strokeStyle = bg; g.lineWidth = Math.max(2, m * 0.05); g.stroke();
          break;
        }
        case 'lacquer':
          rr(g, x, y, tw, thh, m * 0.12);
          g.fillStyle = grad('#5a0a0a', '#200202'); g.fill();
          g.strokeStyle = '#d4a017'; g.lineWidth = Math.max(1.5, m * 0.03); g.stroke();
          break;
        case 'candy': {
          rr(g, x, y, tw, thh, m * 0.3);
          g.fillStyle = grad(U.shade(col, 0.65), U.shade(col, 0.3)); g.fill();
          g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, m * 0.05); g.stroke();
          rr(g, x + tw * 0.15, y + thh * 0.06, tw * 0.7, thh * 0.22, m * 0.1);
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
          break;
        }
        case 'glass': case 'ice':
          rr(g, x, y, tw, thh, m * 0.2);
          g.fillStyle = style === 'ice' ? grad('rgba(220,240,255,0.25)', 'rgba(120,180,255,0.08)') : grad(U.rgba(col, 0.28), U.rgba(col, 0.06));
          g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, m * 0.025); g.stroke();
          rr(g, x + tw * 0.1, y + thh * 0.05, tw * 0.8, thh * 0.25, m * 0.15);
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
          break;
        case 'metal': {
          rr(g, x, y, tw, thh, m * 0.1);
          g.fillStyle = grad('#2a3640', '#10181e'); g.fill();
          const bg = g.createLinearGradient(x, y, x + tw, y + thh);
          bg.addColorStop(0, '#e6eef5'); bg.addColorStop(0.5, '#6b7680'); bg.addColorStop(1, '#cfd8e0');
          g.strokeStyle = bg; g.lineWidth = Math.max(2, m * 0.045); g.stroke();
          break;
        }
        case 'paper':
          g.beginPath(); g.arc(w / 2, h / 2, m * 0.42, 0, Math.PI * 2);
          g.fillStyle = U.rgba(col, 0.22); g.fill();
          break;
        case 'wood': {
          rr(g, x, y, tw, thh, m * 0.12);
          g.fillStyle = grad('#7a4a22', '#4a2a10'); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
          for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x + 4, y + thh * i / 5); g.bezierCurveTo(x + tw * 0.3, y + thh * i / 5 + 3, x + tw * 0.7, y + thh * i / 5 - 3, x + tw - 4, y + thh * i / 5); g.stroke(); }
          rr(g, x, y, tw, thh, m * 0.12);
          g.strokeStyle = U.shade(col, -0.2); g.lineWidth = Math.max(1.5, m * 0.04); g.stroke();
          break;
        }
        case 'gem': {
          const gr = g.createRadialGradient(w / 2, h * 0.4, m * 0.05, w / 2, h / 2, m * 0.6);
          gr.addColorStop(0, U.shade(col, 0.4)); gr.addColorStop(1, U.shade(col, -0.55));
          rr(g, x, y, tw, thh, m * 0.22); g.fillStyle = gr; g.fill();
          g.strokeStyle = U.rgba('#ffffff', 0.35); g.lineWidth = Math.max(1, m * 0.03); g.stroke();
          break;
        }
        case 'flat':
          rr(g, x, y, tw, thh, m * 0.22);
          g.fillStyle = U.rgba(col, this.th.lightReel ? 0.22 : 0.3); g.fill();
          break;
        case 'stone': {
          rr(g, x, y, tw, thh, m * 0.1);
          g.fillStyle = grad('#5b5346', '#2e2a22'); g.fill();
          g.strokeStyle = U.rgba(col, 0.8); g.lineWidth = Math.max(1.5, m * 0.035); g.stroke();
          break;
        }
        case 'pixel': {
          const px = Math.max(2, Math.round(m * 0.05));
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + px, y + px, tw, thh);
          g.fillStyle = U.rgba(col, 0.35); g.fillRect(x, y, tw - px, thh - px);
          g.strokeStyle = col; g.lineWidth = px; g.strokeRect(x + px / 2, y + px / 2, tw - px * 2, thh - px * 2);
          break;
        }
        case 'bubble': {
          const gr = g.createRadialGradient(w * 0.38, h * 0.35, m * 0.05, w / 2, h / 2, m * 0.48);
          gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.35, U.rgba(col, 0.55)); gr.addColorStop(1, U.rgba(col, 0.15));
          g.beginPath(); g.arc(w / 2, h / 2, m * 0.46, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.stroke();
          break;
        }
        case 'glitter': {
          rr(g, x, y, tw, thh, m * 0.16);
          g.fillStyle = grad(U.rgba(col, 0.35), 'rgba(0,0,0,0.5)'); g.fill();
          g.strokeStyle = col; g.lineWidth = Math.max(1.5, m * 0.03); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.7)';
          for (let i = 0; i < 10; i++) g.fillRect(x + Math.random() * tw, y + Math.random() * thh, 1.5, 1.5);
          break;
        }
      }
      if (special && style !== 'classic') {
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, m * 0.55);
        gr.addColorStop(0, U.rgba(col, 0.45)); gr.addColorStop(1, U.rgba(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
      // emoji
      const label = sym.type === 'wild' ? this.labels.wild : sym.type === 'scatter' ? this.labels.scatter : sym.type === 'bonus' ? this.labels.bonus : null;
      const fs = m * (label ? 0.56 : 0.66);
      g.font = `${fs}px ${EMOJI_FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = m * 0.06; g.shadowOffsetY = m * 0.025;
      g.fillText(sym.e, w / 2, h / 2 - (label ? m * 0.08 : 0) + fs * 0.04);
      g.shadowColor = 'transparent';
      if (label) {
        const lh = Math.max(9, m * 0.2);
        const lw = Math.min(tw * 0.92, m * 1.0);
        rr(g, w / 2 - lw / 2, h / 2 + m * 0.22, lw, lh, lh * 0.3);
        const lg = g.createLinearGradient(0, h / 2 + m * 0.22, 0, h / 2 + m * 0.22 + lh);
        lg.addColorStop(0, U.shade(col, 0.2)); lg.addColorStop(1, U.shade(col, -0.35));
        g.fillStyle = lg; g.fill();
        g.font = `900 ${lh * 0.72}px "Bungee", "Arial Black", sans-serif`;
        g.fillStyle = '#ffffff';
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2;
        g.strokeText(label, w / 2, h / 2 + m * 0.22 + lh * 0.55, lw * 0.92);
        g.fillText(label, w / 2, h / 2 + m * 0.22 + lh * 0.55, lw * 0.92);
      }
      g.restore();
    }

    drawBadge(ctx, text, cx, cy, size, bg, fg) {
      ctx.save();
      ctx.font = `900 ${size}px "Bungee", "Arial Black", sans-serif`;
      const tw = ctx.measureText(text).width + size * 0.7;
      rr(ctx, cx - tw / 2, cy - size * 0.65, tw, size * 1.3, size * 0.4);
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = fg || '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + size * 0.05);
      ctx.restore();
    }

    drawCellExtras(ctx, c, cx, cy, w, h) {
      const m = Math.min(w, h);
      if (c.v != null) {
        const txt = c.label || U.fmt(c.v);
        const size = Math.max(9, m * (c.label ? 0.2 : 0.22));
        this.drawBadge(ctx, txt, cx, cy + h * 0.3, size, c.label ? '#d61f69' : 'rgba(20,10,0,0.85)', '#ffd84a');
      } else if (c.m && c.s === this.m.wildIdx && c.m > 1) {
        this.drawBadge(ctx, 'x' + c.m, cx + w * 0.28, cy - h * 0.3, Math.max(9, m * 0.2), '#e11d48');
      } else if (c.m && c.s === this.m.bombIdx) {
        this.drawBadge(ctx, 'x' + c.m, cx, cy + h * 0.02, Math.max(10, m * 0.26), 'rgba(80,0,120,0.85)', '#fff');
      }
    }

    /* ---------- drawing ---------- */
    draw(tms) {
      const t = tms / 1000;
      this.time = t;
      const ctx = this.ctx;
      if (!this.W) this.resize();
      if (!this.W) return;
      this.updateSpin(t);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      // reel backgrounds
      for (let r = 0; r < this.reels.length; r++) {
        const x = this.reelX(r);
        const gr = ctx.createLinearGradient(0, this.pad, 0, this.pad + this.rh);
        const bg = this.th.reelBg || '#111';
        gr.addColorStop(0, U.shade(bg, this.th.lightReel ? -0.08 : -0.3));
        gr.addColorStop(0.5, bg);
        gr.addColorStop(1, U.shade(bg, this.th.lightReel ? -0.08 : -0.3));
        ctx.fillStyle = gr;
        rr(ctx, x, this.pad, this.rw, this.rh, Math.min(10, this.rw * 0.06));
        ctx.fill();
        if (this.reels[r].glow) {
          ctx.save();
          ctx.shadowColor = this.th.accent2; ctx.shadowBlur = 25;
          ctx.strokeStyle = this.th.accent2; ctx.lineWidth = 3 + Math.sin(t * 20) * 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      const showHl = this.hl && this.hl.cells;
      for (let r = 0; r < this.reels.length; r++) {
        const rl = this.reels[r];
        const x = this.reelX(r);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, this.pad, this.rw, this.rh);
        ctx.clip();
        const ch = this.rh / rl.rows;
        if (rl.mode === 'spin') {
          const speed = rl.stopAt != null ? Math.max(0, 1 - (t - rl.stopAt) / rl.D) : (t - rl.t0 > 0.16 ? 1 : 0);
          const kMin = Math.floor(rl.p - rl.rows) - 1, kMax = Math.ceil(rl.p) + 1;
          for (let k = kMin; k <= kMax; k++) {
            const j = rl.p - k;
            const y = this.pad + j * ch;
            if (y > this.pad + this.rh || y + ch < this.pad) continue;
            const c = this.tapeCell(rl, k);
            const img = this.tile(c.s, this.rw, ch);
            if (speed > 0.35) {
              ctx.globalAlpha = 0.55;
              ctx.drawImage(img, x, y - ch * 0.12 * speed, this.rw, ch * (1 + 0.24 * speed));
              ctx.globalAlpha = 0.35;
              ctx.drawImage(img, x, y + ch * 0.1 * speed, this.rw, ch);
              ctx.globalAlpha = 1;
            } else {
              ctx.drawImage(img, x, y, this.rw, ch);
              this.drawCellExtras(ctx, c, x + this.rw / 2, y + ch / 2, this.rw, ch);
            }
          }
        } else if (this.hold && r < this.hold.cells.length) {
          this.drawHoldReel(ctx, r, x, ch, t);
        } else {
          for (let row = 0; row < rl.cells.length; row++) {
            const d = rl.cells[row];
            if (!d || d.alpha <= 0) continue;
            const y = this.pad + d.y * ch;
            const key = r + ',' + row;
            const win = showHl && this.hl.cells.has(key);
            let sc = d.scale;
            let alpha = d.alpha;
            if (showHl) {
              if (win) sc *= 1 + 0.07 * Math.sin((t - this.hl.t0) * 8);
              else alpha *= 0.32;
            }
            const img = this.tile(d.c.s, this.rw, ch);
            ctx.globalAlpha = alpha;
            const cx = x + this.rw / 2, cy = y + ch / 2;
            if (win) {
              ctx.save();
              ctx.shadowColor = this.hl.color || this.th.accent;
              ctx.shadowBlur = 22;
              rr(ctx, x + 3, y + 3, this.rw - 6, ch - 6, Math.min(this.rw, ch) * 0.16);
              ctx.strokeStyle = this.hl.color || this.th.accent;
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.restore();
            }
            if (d.rot) {
              ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.rot);
              ctx.drawImage(img, -this.rw * sc / 2, -ch * sc / 2, this.rw * sc, ch * sc);
              ctx.restore();
            } else ctx.drawImage(img, cx - this.rw * sc / 2, cy - ch * sc / 2, this.rw * sc, ch * sc);
            if (d.flash) {
              const f = Math.max(0, 1 - (t - d.flash) / 0.5);
              if (f > 0) {
                ctx.fillStyle = `rgba(255,255,255,${f * 0.8})`;
                rr(ctx, x + 2, y + 2, this.rw - 4, ch - 4, 8); ctx.fill();
              } else d.flash = 0;
            }
            this.drawCellExtras(ctx, d.c, cx, cy, this.rw * sc, ch * sc);
            ctx.globalAlpha = 1;
          }
        }
        ctx.restore();
      }
      // top/bottom shading for depth
      const sh = ctx.createLinearGradient(0, this.pad, 0, this.pad + this.rh);
      sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(0.12, 'rgba(0,0,0,0)');
      sh.addColorStop(0.88, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = sh; ctx.fillRect(this.pad, this.pad, this.W - this.pad * 2, this.rh);
      // paylines
      if (this.hl && this.hl.lines) this.drawLines(ctx, t);
      // reel transform flashes
      for (const f of this.flash) {
        const u = (t - f.t0) / f.dur;
        if (u > 1) continue;
        const x = this.reelX(f.r);
        ctx.save();
        ctx.globalAlpha = Math.sin(u * Math.PI);
        const gr = ctx.createLinearGradient(x, 0, x + this.rw, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, f.color); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x - this.rw * 0.3, this.pad, this.rw * 1.6, this.rh);
        if (f.bolt) this.drawBolt(ctx, x + this.rw / 2, f.seed);
        ctx.restore();
      }
      this.flash = this.flash.filter((f) => t - f.t0 < f.dur);
    }

    drawBolt(ctx, cx, seed) {
      const rnd = U.mulberry32(seed);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.shadowColor = this.th.accent; ctx.shadowBlur = 20;
      ctx.beginPath();
      let x = cx, y = 0;
      ctx.moveTo(x, y);
      while (y < this.H) { y += 12 + rnd() * 20; x = cx + (rnd() - 0.5) * this.rw * 0.6; ctx.lineTo(x, y); }
      ctx.stroke();
    }

    drawLines(ctx, t) {
      const pl = this.m.paylines;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      this.hl.lines.forEach((li) => {
        const line = pl[li];
        const col = LINE_COLORS[li % LINE_COLORS.length];
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 7;
        const pts = line.map((row, r) => this.cellCenter(r, row));
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(this.pad * 0.3, pts[0][1]);
          pts.forEach((p) => ctx.lineTo(p[0], p[1]));
          ctx.lineTo(this.W - this.pad * 0.3, pts[pts.length - 1][1]);
        };
        path(); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 3.5;
        path(); ctx.stroke();
      });
      ctx.restore();
    }

    drawHoldReel(ctx, r, x, ch, t) {
      const H = this.hold;
      for (let row = 0; row < H.cells[r].length; row++) {
        const y = this.pad + row * ch;
        const c = H.cells[r][row];
        const key = r + ',' + row;
        const m = Math.min(this.rw, ch);
        if (c) {
          const pop = H.pop && H.pop[key] ? Math.max(0, 1 - (t - H.pop[key]) / 0.5) : 0;
          const sc = 1 + pop * 0.35;
          ctx.save();
          ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 14 + pop * 30;
          const img = this.tile(this.m.coinIdx, this.rw, ch);
          ctx.drawImage(img, x + this.rw / 2 - this.rw * sc / 2, y + ch / 2 - ch * sc / 2, this.rw * sc, ch * sc);
          ctx.restore();
          const cell = { v: c.v, label: c.label };
          if (H.collected && H.collected.has(key)) ctx.globalAlpha = 0.35;
          this.drawCellExtras(ctx, cell, x + this.rw / 2, y + ch / 2, this.rw, ch);
          ctx.globalAlpha = 1;
        } else {
          rr(ctx, x + 4, y + 4, this.rw - 8, ch - 8, m * 0.12);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
          if (H.spinning) {
            // flicker of passing coins
            const ph = (t * 14 + r * 1.7 + row * 2.3) % 1;
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.font = `${m * 0.5}px ${EMOJI_FONT}`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.m.symbols[this.m.coinIdx].e, x + this.rw / 2, y + ch * ph);
            ctx.restore();
          }
          ctx.strokeStyle = U.rgba(this.th.accent, 0.35); ctx.lineWidth = 1.5;
          rr(ctx, x + 4, y + 4, this.rw - 8, ch - 8, m * 0.12); ctx.stroke();
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

    setHighlight(cells, lines, color) {
      this.hl = cells ? { cells: new Set(cells.map((p) => p[0] + ',' + p[1])), lines, color, t0: this.time } : null;
    }

    async explode(positions, onBurst) {
      const ds = positions.map(([r, row]) => this.reels[r].cells[row]).filter(Boolean);
      positions.forEach(([r, row]) => onBurst && onBurst(r, row, this.reels[r].cells[row]));
      await this.animate(260, (u) => {
        ds.forEach((d) => { d.scale = 1 + 0.25 * Math.sin(u * Math.PI) - u * 0.9; d.alpha = 1 - u; d.rot = u * 0.6; });
      });
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
          let fromY;
          if (row < need) fromY = row - need - 0.6;
          else fromY = kept[row - need];
          const d = { c: col[row], y: fromY, scale: 1, alpha: 1 };
          cells.push(d);
          if (fromY !== row) moves.push({ d, from: fromY, to: row, delay: r * 0.03 + (need - row) * 0.0 });
        }
        rl.cells = cells;
      });
      this.hl = null;
      await this.animate(380, (u) => {
        moves.forEach((mv) => {
          const k = U.clamp((u - mv.delay) / (1 - mv.delay), 0, 1);
          mv.d.y = mv.from + (mv.to - mv.from) * U.easeOutBack(k, 0.8);
        });
      });
    }

    async transformReels(reels, toGrid, bolt) {
      const t0 = this.time;
      reels.forEach((r, i) => this.flash.push({ r, t0: t0 + i * 0.12, dur: 0.7, color: U.rgba(this.th.accent, 0.8), bolt, seed: Math.random() * 1e9 | 0 }));
      await U.wait(300);
      reels.forEach((r) => {
        this.reels[r].cells = toGrid[r].map((c, row) => ({ c, y: row, scale: 1, alpha: 1, flash: this.time }));
      });
      await U.wait(450);
    }

    setReelGlow(r, on) { if (this.reels[r]) this.reels[r].glow = on; }
  }

  root.ReelRenderer = Reels;
  root.LINE_COLORS = LINE_COLORS;
})(window);
