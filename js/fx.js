/* Animated themed backgrounds + celebration particles (coins, confetti, bursts, floating text). */
(function (root) {
  const U = root.U;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const R = Math.random;

  const PRESETS = {
    embers: { n: 70, from: 'bottom', vy: [-60, -20], vx: [-10, 10], size: [1.5, 4], shape: 'glow', colors: ['#ff9a3c', '#ffcc33', '#ff5a1f'], sway: 20, twinkle: 1 },
    lava: { n: 80, from: 'bottom', vy: [-90, -30], vx: [-15, 15], size: [1.5, 5], shape: 'glow', colors: ['#ff4500', '#ffae00', '#ff2200'], sway: 25, twinkle: 1 },
    sprinkles: { n: 70, from: 'top', vy: [25, 70], vx: [-10, 10], size: [3, 7], shape: 'rect', colors: ['#ff6fb5', '#7ad7ff', '#ffe066', '#9b8cff', '#7bf1a8', '#ffffff'], rot: 1, sway: 15 },
    bubbles: { n: 45, from: 'bottom', vy: [-50, -15], vx: [-5, 5], size: [3, 16], shape: 'bubble', colors: ['#ffffff'], sway: 18 },
    stars: { n: 160, from: 'any', vy: [2, 6], vx: [-2, 2], size: [0.5, 2.2], shape: 'star4', colors: ['#ffffff', '#cfe3ff', '#ffe9c9', '#d5c9ff'], twinkle: 1, shooting: true },
    petals: { n: 45, from: 'top', vy: [20, 55], vx: [10, 40], size: [5, 10], shape: 'petal', colors: ['#ffc4dd', '#ffb0d0', '#ffe1ee', '#ff9ec6'], rot: 1, sway: 35 },
    dust: { n: 60, from: 'left', vy: [-5, 5], vx: [30, 90], size: [1, 3], shape: 'circle', colors: ['rgba(255,214,160,0.6)', 'rgba(230,180,120,0.5)'], sway: 10 },
    sand: { n: 60, from: 'left', vy: [-4, 8], vx: [40, 110], size: [1, 2.5], shape: 'circle', colors: ['rgba(255,220,150,0.7)', 'rgba(240,190,110,0.5)'], sway: 6, rays: true },
    leaves: { n: 35, from: 'top', vy: [25, 60], vx: [-20, 20], size: [7, 13], shape: 'leaf', colors: ['#3f9b3a', '#6cc04a', '#2e7d32', '#9ccc65'], rot: 1, sway: 40 },
    jungle: { n: 30, from: 'top', vy: [20, 50], vx: [-15, 15], size: [7, 13], shape: 'leaf', colors: ['#3f7a2a', '#5a8f2e', '#2e5d1f'], rot: 1, sway: 30, fireflies: true },
    snow: { n: 110, from: 'top', vy: [20, 60], vx: [-10, 10], size: [1, 4], shape: 'glow', colors: ['#ffffff', '#e6f4ff'], sway: 25 },
    fireflies: { n: 50, from: 'any', vy: [-12, 12], vx: [-12, 12], size: [1.5, 3.5], shape: 'glow', colors: ['#d7ff6b', '#fff59d', '#f0a6ff'], twinkle: 1, sway: 20 },
    golddust: { n: 70, from: 'top', vy: [10, 35], vx: [-6, 6], size: [0.8, 2.6], shape: 'star4', colors: ['#ffd700', '#ffe680', '#fff3b0'], twinkle: 1, sway: 12 },
    clovers: { n: 22, from: 'top', vy: [20, 45], vx: [-10, 10], size: [12, 20], shape: 'emoji', emoji: ['☘️', '🍀'], rot: 1, sway: 30, alpha: 0.5 },
    sparkles: { n: 80, from: 'any', vy: [-4, 4], vx: [-4, 4], size: [1, 3.2], shape: 'star4', colors: ['#ffffff', '#bfe9ff', '#e2d4ff'], twinkle: 1 },
    pixels: { n: 45, from: 'bottom', vy: [-45, -15], vx: [0, 0], size: [4, 10], shape: 'pixel', colors: ['#39ff14', '#ff3cac', '#00e5ff', '#ffe600', '#784ba0'], alpha: 0.55 },
    felt: { n: 18, from: 'top', vy: [10, 25], vx: [-5, 5], size: [14, 26], shape: 'glyph', glyph: ['♠', '♥', '♦', '♣'], colors: ['rgba(255,215,0,0.18)', 'rgba(255,255,255,0.1)'], rot: 1, sway: 15 },
    bamboo: { n: 25, from: 'top', vy: [15, 40], vx: [-15, 15], size: [7, 12], shape: 'leaf', colors: ['#8fe388', '#5fae5a', '#b6e3a8'], rot: 1, sway: 35 },
    matrix: { n: 0 }, neongrid: { n: 0 }, rays: { n: 40, from: 'any', vy: [-6, 6], vx: [-6, 6], size: [1, 3], shape: 'star4', colors: ['#fff3b0', '#ffffff'], twinkle: 1 },
    aurora: { n: 90, from: 'any', vy: [1, 3], vx: [0, 0], size: [0.5, 1.8], shape: 'star4', colors: ['#ffffff', '#cdf'], twinkle: 1 },
    disco: { n: 40, from: 'any', vy: [-8, 8], vx: [-8, 8], size: [2, 5], shape: 'glow', colors: ['#ff2fa6', '#ffd319', '#38e1ff', '#9b5cff'], twinkle: 1 },
    waves: { n: 30, from: 'any', vy: [-3, 3], vx: [-3, 3], size: [0.5, 1.8], shape: 'star4', colors: ['#ffffff'], twinkle: 1 },
    clouds: { n: 30, from: 'any', vy: [-6, 6], vx: [-6, 6], size: [1, 3], shape: 'star4', colors: ['#fff3b0'], twinkle: 1 },
    fog: { n: 25, from: 'any', vy: [-10, 10], vx: [-10, 10], size: [1.5, 3], shape: 'glow', colors: ['#9cff3a', '#ff7a00'], twinkle: 1 },
  };

  const GLOW = new Map();
  function glowSprite(c) {
    let cv = GLOW.get(c);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = cv.height = 48;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, c); gr.addColorStop(0.3, U.rgba(c.startsWith('#') ? c : '#ffffff', 0.5)); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    GLOW.set(c, cv);
    return cv;
  }

  class Background {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = [];
      this.theme = null;
      this.resize();
      root.addEventListener('resize', () => this.resize());
    }
    resize() {
      this.W = this.cv.width = root.innerWidth;
      this.H = this.cv.height = root.innerHeight;
      this.cols = null;
    }
    setTheme(th) {
      this.theme = th;
      this.pre = PRESETS[th.fx] || PRESETS.sparkles;
      this.ps = [];
      const n = Math.round((this.pre.n || 0) * Math.min(1.2, (this.W * this.H) / (1280 * 800) + 0.35));
      for (let i = 0; i < n; i++) this.ps.push(this.spawn(true));
      this.cols = null;
      this.shoot = null;
      this.bats = [];
    }
    spawn(init) {
      const p = this.pre;
      const W = this.W, H = this.H;
      const o = {
        vx: U.lerp(p.vx[0], p.vx[1], R()), vy: U.lerp(p.vy[0], p.vy[1], R()),
        s: U.lerp(p.size[0], p.size[1], R()), c: p.colors ? p.colors[Math.floor(R() * p.colors.length)] : '#fff',
        rot: R() * 6.28, vr: p.rot ? (R() - 0.5) * 2 : 0, ph: R() * 6.28,
        e: p.emoji ? p.emoji[Math.floor(R() * p.emoji.length)] : p.glyph ? p.glyph[Math.floor(R() * p.glyph.length)] : null,
      };
      if (init || p.from === 'any') { o.x = R() * W; o.y = R() * H; }
      else if (p.from === 'top') { o.x = R() * W; o.y = -20; }
      else if (p.from === 'bottom') { o.x = R() * W; o.y = H + 20; }
      else if (p.from === 'left') { o.x = -20; o.y = R() * H; }
      return o;
    }
    draw(tms, dt) {
      const th = this.theme;
      if (!th) return;
      const ctx = this.ctx, W = this.W, H = this.H, t = tms / 1000;
      const bg = th.bg;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, bg[0]); g.addColorStop(0.65, bg[1]); g.addColorStop(1, bg[2] || bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const fx = th.fx;
      if (fx === 'neongrid') this.neonGrid(ctx, t);
      if (fx === 'rays' || fx === 'sand' || fx === 'clouds') this.rays(ctx, t, fx === 'clouds' ? '#fff6d0' : th.accent);
      if (fx === 'aurora') this.aurora(ctx, t);
      if (fx === 'matrix') this.matrix(ctx, t, dt);
      if (fx === 'disco') this.disco(ctx, t);
      if (fx === 'waves') this.waves(ctx, t);
      if (fx === 'clouds') this.clouds(ctx, t);
      if (fx === 'fog') this.fog(ctx, t, dt);
      if (fx === 'lava') this.lava(ctx, t);
      if (fx === 'bamboo') this.bamboo(ctx, t);
      if (fx === 'felt') this.felt(ctx);
      this.particles(ctx, t, dt);
      if (this.pre.shooting) this.shooting(ctx, dt);
      if (this.pre.fireflies) this.fireflies(ctx, t);
      // vignette
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    particles(ctx, t, dt) {
      const p = this.pre, W = this.W, H = this.H;
      for (let i = 0; i < this.ps.length; i++) {
        const o = this.ps[i];
        o.x += (o.vx + (p.sway ? Math.sin(t * 1.3 + o.ph) * p.sway * 0.4 : 0)) * dt;
        o.y += o.vy * dt;
        o.rot += o.vr * dt;
        if (o.y > H + 30 || o.y < -30 || o.x > W + 30 || o.x < -30) {
          if (p.from === 'any') { o.x = (o.x + W) % W; o.y = (o.y + H) % H; } else this.ps[i] = this.spawn(false);
          continue;
        }
        let a = p.alpha || 1;
        if (p.twinkle) a *= 0.45 + 0.55 * Math.abs(Math.sin(t * 1.7 + o.ph));
        ctx.globalAlpha = a;
        this.shape(ctx, p.shape, o);
      }
      ctx.globalAlpha = 1;
    }
    shape(ctx, sh, o) {
      const s = o.s;
      switch (sh) {
        case 'glow':
          ctx.drawImage(glowSprite(o.c), o.x - s * 3, o.y - s * 3, s * 6, s * 6);
          break;
        case 'circle': ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(o.x, o.y, s, 0, 6.28); ctx.fill(); break;
        case 'rect': ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.fillStyle = o.c; ctx.fillRect(-s / 2, -s * 0.2, s, s * 0.4); ctx.restore(); break;
        case 'pixel': ctx.fillStyle = o.c; ctx.fillRect(Math.round(o.x / 4) * 4, Math.round(o.y / 4) * 4, s, s); break;
        case 'bubble':
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(o.x, o.y, s, 0, 6.28); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(o.x - s * 0.35, o.y - s * 0.35, s * 0.25, 0, 6.28); ctx.fill();
          break;
        case 'star4':
          ctx.fillStyle = o.c;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y - s * 2); ctx.lineTo(o.x + s * 0.4, o.y - s * 0.4); ctx.lineTo(o.x + s * 2, o.y);
          ctx.lineTo(o.x + s * 0.4, o.y + s * 0.4); ctx.lineTo(o.x, o.y + s * 2); ctx.lineTo(o.x - s * 0.4, o.y + s * 0.4);
          ctx.lineTo(o.x - s * 2, o.y); ctx.lineTo(o.x - s * 0.4, o.y - s * 0.4); ctx.closePath(); ctx.fill();
          break;
        case 'petal':
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.fillStyle = o.c;
          ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, 6.28); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, 0, s * 0.4, s * 0.2, 0, 0, 6.28); ctx.fill();
          ctx.restore(); break;
        case 'leaf':
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.fillStyle = o.c;
          ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.6, s, 0); ctx.quadraticCurveTo(0, s * 0.6, -s, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
          ctx.restore(); break;
        case 'emoji':
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.font = `${s}px ${EMOJI_FONT}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.e, 0, 0); ctx.restore(); break;
        case 'glyph':
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot * 0.3); ctx.font = `${s}px serif`; ctx.fillStyle = o.c;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.e, 0, 0); ctx.restore(); break;
      }
    }
    neonGrid(ctx, t) {
      const W = this.W, H = this.H, hz = H * 0.58;
      // sun
      const sr = Math.min(W, H) * 0.22;
      const sg = ctx.createLinearGradient(0, hz - sr, 0, hz);
      sg.addColorStop(0, '#ffe600'); sg.addColorStop(1, '#ff2bd6');
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, hz, sr, Math.PI, 0); ctx.closePath(); ctx.clip();
      ctx.fillStyle = sg; ctx.fillRect(W / 2 - sr, hz - sr, sr * 2, sr);
      ctx.fillStyle = this.theme.bg[1];
      for (let i = 0; i < 7; i++) { const y = hz - sr * 0.5 + i * sr * 0.08 + i * i * 0.6; ctx.fillRect(W / 2 - sr, y, sr * 2, 2 + i * 1.2); }
      ctx.restore();
      ctx.fillStyle = '#0b0018'; ctx.fillRect(0, hz, W, H - hz);
      ctx.strokeStyle = 'rgba(255,43,214,0.65)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 8;
      for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 20, hz); ctx.lineTo(W / 2 + i * W * 0.12, H); ctx.stroke(); }
      const off = (t * 0.6) % 1;
      for (let i = 0; i < 14; i++) {
        const z = (i + off) / 14;
        const y = hz + (H - hz) * z * z;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    rays(ctx, t, color) {
      const W = this.W, H = this.H;
      ctx.save();
      ctx.translate(W / 2, H * 0.35);
      ctx.rotate(t * 0.05);
      const n = 18, L = Math.max(W, H) * 1.2;
      for (let i = 0; i < n; i++) {
        ctx.rotate((Math.PI * 2) / n);
        const g = ctx.createLinearGradient(0, 0, L, 0);
        g.addColorStop(0, U.rgba(color, 0.18)); g.addColorStop(1, U.rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -L * 0.08); ctx.lineTo(L, L * 0.08); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    aurora(ctx, t) {
      const W = this.W, H = this.H;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cols = ['rgba(60,255,170,0.10)', 'rgba(80,160,255,0.09)', 'rgba(190,90,255,0.07)'];
      cols.forEach((c, k) => {
        for (let band = 0; band < 3; band++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 20) {
            const y = H * (0.18 + k * 0.07) + Math.sin(x * 0.004 + t * (0.3 + k * 0.1) + band) * 40 + Math.sin(x * 0.011 - t * 0.5) * 18;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
          ctx.fillStyle = c; ctx.fill();
        }
      });
      ctx.restore();
    }
    matrix(ctx, t, dt) {
      const W = this.W, H = this.H, fs = 16;
      if (!this.cols) { this.cols = []; for (let i = 0; i < W / fs; i++) this.cols.push({ y: R() * H, v: 40 + R() * 120 }); }
      ctx.font = `${fs}px monospace`;
      const chars = 'アカサタナハマヤラワ0123456789ABCDEF$¥₩';
      this.cols.forEach((c, i) => {
        c.y += c.v * dt;
        if (c.y > H + 200) { c.y = -R() * 200; c.v = 40 + R() * 120; }
        for (let k = 0; k < 14; k++) {
          const y = c.y - k * fs;
          if (y < -fs || y > H) continue;
          ctx.fillStyle = k === 0 ? 'rgba(200,255,220,0.9)' : `rgba(0,255,136,${0.5 * (1 - k / 14)})`;
          ctx.fillText(chars[(i * 7 + k * 3 + Math.floor(t * 4)) % chars.length], i * fs, y);
        }
      });
    }
    disco(ctx, t) {
      const W = this.W, H = this.H;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cols = ['#ff2fa6', '#ffd319', '#38e1ff', '#9b5cff'];
      cols.forEach((c, i) => {
        const a = Math.sin(t * 0.7 + i * 1.7) * 0.6;
        ctx.save();
        ctx.translate(W * (0.2 + i * 0.2), -20);
        ctx.rotate(a);
        const g = ctx.createLinearGradient(0, 0, 0, H * 1.1);
        g.addColorStop(0, U.rgba(c, 0.3)); g.addColorStop(1, U.rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(H * 0.25, H * 1.1); ctx.lineTo(-H * 0.25, H * 1.1); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      // mirror-ball dots
      for (let i = 0; i < 40; i++) {
        const x = (i * 97.3 + t * 40 * ((i % 3) - 1)) % W;
        const y = (i * 53.7) % H;
        ctx.fillStyle = U.rgba(cols[i % 4], 0.25 + 0.25 * Math.sin(t * 3 + i));
        ctx.beginPath(); ctx.arc((x + W) % W, y, 3, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
    waves(ctx, t) {
      const W = this.W, H = this.H;
      const cols = ['rgba(15,76,117,0.7)', 'rgba(27,110,150,0.6)', 'rgba(50,150,180,0.5)', 'rgba(10,50,80,0.9)'];
      cols.forEach((c, k) => {
        ctx.beginPath();
        const base = H * (0.72 + k * 0.07);
        for (let x = 0; x <= W; x += 15) {
          const y = base + Math.sin(x * 0.012 + t * (0.8 + k * 0.2) + k) * (12 + k * 4);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = c; ctx.fill();
      });
      // moon
      ctx.fillStyle = 'rgba(255,245,200,0.85)';
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.16, Math.min(W, H) * 0.05, 0, 6.28); ctx.fill();
    }
    clouds(ctx, t) {
      const W = this.W, H = this.H;
      for (let i = 0; i < 9; i++) {
        const x = ((i * 211 + t * (8 + i * 3)) % (W + 400)) - 200;
        const y = H * (0.1 + (i % 5) * 0.17);
        const s = 60 + (i % 4) * 30;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + k * s * 0.5, y + Math.sin(k) * s * 0.15, s * (0.5 + (k % 2) * 0.2), 0, 6.28); ctx.fill(); }
      }
    }
    fog(ctx, t, dt) {
      const W = this.W, H = this.H;
      for (let i = 0; i < 7; i++) {
        const x = ((i * 300 + t * (12 + i * 4)) % (W + 600)) - 300;
        const y = H * (0.55 + (i % 3) * 0.15);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
        g.addColorStop(0, 'rgba(160,120,220,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
      }
      // moon + bats
      ctx.fillStyle = 'rgba(255,220,150,0.8)';
      ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, Math.min(W, H) * 0.06, 0, 6.28); ctx.fill();
      if (R() < dt * 0.3) this.bats.push({ x: -30, y: H * (0.1 + R() * 0.4), v: 80 + R() * 80, ph: R() * 6 });
      ctx.font = `22px ${EMOJI_FONT}`;
      this.bats = this.bats.filter((b) => b.x < W + 40);
      this.bats.forEach((b) => { b.x += b.v * dt; ctx.globalAlpha = 0.7; ctx.fillText('🦇', b.x, b.y + Math.sin(t * 6 + b.ph) * 12); });
      ctx.globalAlpha = 1;
    }
    lava(ctx, t) {
      const W = this.W, H = this.H;
      const g = ctx.createLinearGradient(0, H * 0.7, 0, H);
      g.addColorStop(0, 'rgba(255,60,0,0)'); g.addColorStop(1, `rgba(255,${90 + Math.sin(t * 2) * 30},0,0.55)`);
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.7, W, H * 0.3);
      ctx.fillStyle = 'rgba(20,4,0,0.85)';
      ctx.beginPath(); ctx.moveTo(W * 0.25, H); ctx.lineTo(W * 0.45, H * 0.55); ctx.lineTo(W * 0.55, H * 0.55); ctx.lineTo(W * 0.75, H); ctx.closePath(); ctx.fill();
      const gg = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.25);
      gg.addColorStop(0, `rgba(255,120,0,${0.35 + Math.sin(t * 3) * 0.1})`); gg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    }
    bamboo(ctx, t) {
      const W = this.W, H = this.H;
      for (let i = 0; i < 9; i++) {
        const x = (i / 9) * W + 30 + Math.sin(t * 0.5 + i) * 6;
        const w = 14 + (i % 3) * 6;
        ctx.fillStyle = i % 2 ? 'rgba(60,120,60,0.35)' : 'rgba(90,160,80,0.25)';
        ctx.fillRect(x, 0, w, H);
        ctx.fillStyle = 'rgba(20,60,20,0.4)';
        for (let y = (i * 70) % 140; y < H; y += 140) ctx.fillRect(x - 2, y, w + 4, 4);
      }
    }
    felt(ctx) {
      const W = this.W, H = this.H;
      ctx.strokeStyle = 'rgba(255,215,0,0.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W / 2, H * 1.1, W * 0.6, H * 0.6, 0, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W / 2, H * 1.1, W * 0.5, H * 0.5, 0, Math.PI, 0); ctx.stroke();
    }
    shooting(ctx, dt) {
      if (!this.shoot && R() < dt * 0.25) this.shoot = { x: R() * this.W, y: R() * this.H * 0.5, vx: 600 + R() * 300, vy: 250, life: 0.9 };
      const s = this.shoot;
      if (!s) return;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15); ctx.stroke();
      if (s.life <= 0) this.shoot = null;
    }
    fireflies(ctx, t) {
      for (let i = 0; i < 25; i++) {
        const x = (Math.sin(t * 0.3 + i * 12.1) * 0.5 + 0.5) * this.W;
        const y = (Math.cos(t * 0.23 + i * 7.7) * 0.5 + 0.5) * this.H;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, `rgba(230,255,120,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 8, y - 8, 16, 16);
      }
    }
  }

  /* ---------- celebration particles (top layer) ---------- */
  class Fx {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = [];
      this.texts = [];
      this.rings = [];
      this.shake = 0;
      this.resize();
      root.addEventListener('resize', () => this.resize());
    }
    resize() {
      this.dpr = Math.min(2, root.devicePixelRatio || 1);
      this.W = root.innerWidth; this.H = root.innerHeight;
      this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    }
    burst(x, y, color, n, power) {
      for (let i = 0; i < (n || 14); i++) {
        const a = R() * Math.PI * 2, v = (80 + R() * 220) * (power || 1);
        this.ps.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + R() * 0.4, age: 0, s: 2 + R() * 3, c: color, g: 300 });
      }
      this.rings.push({ x, y, age: 0, life: 0.45, c: color, r: 10 });
    }
    coins(n, fromX, fromY) {
      for (let i = 0; i < n; i++) {
        const x = fromX != null ? fromX : R() * this.W;
        const y = fromY != null ? fromY : -20 - R() * 200;
        const up = fromY != null;
        this.ps.push({ k: 'coin', x, y, vx: (R() - 0.5) * (up ? 500 : 120), vy: up ? -300 - R() * 500 : 50 + R() * 150, life: 3.5, age: 0, s: 9 + R() * 8, rot: R() * 6, vr: 6 + R() * 8, g: 600 });
      }
    }
    confetti(n, colors) {
      const cs = colors || ['#ff3b3b', '#ffd23f', '#3bff7a', '#3bc8ff', '#c03bff', '#ff8a3b'];
      for (let i = 0; i < n; i++) {
        this.ps.push({ k: 'conf', x: R() * this.W, y: -20 - R() * 300, vx: (R() - 0.5) * 80, vy: 80 + R() * 120, life: 5, age: 0, s: 6 + R() * 6, rot: R() * 6, vr: (R() - 0.5) * 10, c: cs[Math.floor(R() * cs.length)], g: 40, sway: R() * 6 });
      }
    }
    text(x, y, str, color, size) {
      this.texts.push({ x, y, str, c: color || '#ffd700', s: size || 26, age: 0, life: 1.4 });
    }
    draw(tms, dt) {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      if (!this.ps.length && !this.texts.length && !this.rings.length) return false;
      for (const r of this.rings) {
        r.age += dt;
        const u = r.age / r.life;
        ctx.strokeStyle = U.rgba(r.c.startsWith('#') ? r.c : '#ffffff', 1 - u);
        ctx.lineWidth = 3 * (1 - u) + 0.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r + u * 60, 0, 6.28); ctx.stroke();
      }
      this.rings = this.rings.filter((r) => r.age < r.life);
      for (const p of this.ps) {
        p.age += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt + (p.sway ? Math.sin(p.age * 3 + p.sway) * 40 * dt : 0);
        p.y += p.vy * dt;
        if (p.rot != null) p.rot += p.vr * dt;
        const a = Math.min(1, (p.life - p.age) * 2);
        ctx.globalAlpha = Math.max(0, a);
        if (p.k === 'spark') {
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - p.age / p.life) + 0.5, 0, 6.28); ctx.fill();
        } else if (p.k === 'coin') {
          const w = Math.abs(Math.cos(p.rot)) * p.s;
          const g = ctx.createLinearGradient(p.x - p.s, p.y, p.x + p.s, p.y);
          g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffc400'); g.addColorStop(1, '#b07800');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, w), p.s, 0, 0, 6.28); ctx.fill();
          ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.2; ctx.stroke();
          if (w > p.s * 0.5) { ctx.fillStyle = '#8a5a00'; ctx.font = `bold ${p.s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', p.x, p.y + 1); }
        } else if (p.k === 'conf') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s * 0.25, p.s, p.s * 0.5 * Math.abs(Math.cos(p.rot * 2)) + 1);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      this.ps = this.ps.filter((p) => p.age < p.life && p.y < this.H + 50);
      for (const t of this.texts) {
        t.age += dt;
        const u = t.age / t.life;
        const y = t.y - u * 60;
        const sc = u < 0.15 ? U.easeOutBack(u / 0.15, 2) : 1;
        ctx.globalAlpha = 1 - Math.max(0, (u - 0.6) / 0.4);
        ctx.font = `900 ${t.s * sc}px "Bungee","Arial Black",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(t.str, t.x, y);
        ctx.fillStyle = t.c; ctx.fillText(t.str, t.x, y);
      }
      ctx.globalAlpha = 1;
      this.texts = this.texts.filter((t) => t.age < t.life);
      return true;
    }
  }

  root.SlotBackground = Background;
  root.SlotFx = Fx;
})(window);
