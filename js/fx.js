/* Particle layers: ambient theme particles (behind UI) and celebration effects (above UI). */
(function (root) {
  const U = root.U;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const R = Math.random;
  const TAU = Math.PI * 2;

  /* ---------- sprite caches ---------- */
  const SPR = new Map();
  function sprite(key, size, draw) {
    let c = SPR.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    SPR.set(key, c);
    return c;
  }
  function glow(col) {
    return sprite('g' + col, 64, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.12, col); gr.addColorStop(0.4, U.rgba(col.startsWith('#') ? col : '#ffffff', 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function soft(col) {
    return sprite('s' + col, 64, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function emo(ch) {
    return sprite('e' + ch, 72, (g, s) => {
      g.font = `${s * 0.8}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, s / 2, s / 2 + s * 0.05);
    });
  }
  function starSpr(col) {
    return sprite('st' + col, 64, (g, s) => {
      const c = s / 2;
      g.drawImage(glow(col), 0, 0, s, s);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(c, 2); g.quadraticCurveTo(c, c, s - 2, c); g.quadraticCurveTo(c, c, c, s - 2); g.quadraticCurveTo(c, c, 2, c); g.quadraticCurveTo(c, c, c, 2);
      g.fill();
    });
  }
  const COIN_FRAMES = 16;
  function coinFrame(i) {
    return sprite('coin' + i, 64, (g, s) => {
      const a = (i / COIN_FRAMES) * TAU;
      const w = Math.max(0.08, Math.abs(Math.cos(a)));
      const c = s / 2, r = s * 0.44;
      g.save();
      g.translate(c, c);
      g.scale(w, 1);
      const face = Math.cos(a) > 0;
      // edge thickness
      g.fillStyle = '#8a5a00';
      g.beginPath(); g.ellipse(Math.sign(Math.cos(a)) * -2 / w * 0, 0, r, r, 0, 0, TAU); g.fill();
      const gr = g.createLinearGradient(-r, -r, r, r);
      gr.addColorStop(0, '#fff7c8'); gr.addColorStop(0.35, face ? '#ffd23f' : '#f0b400'); gr.addColorStop(0.7, '#c48a00'); gr.addColorStop(1, '#ffe27a');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, r * 0.94, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(140,90,0,0.8)'; g.lineWidth = r * 0.08;
      g.beginPath(); g.arc(0, 0, r * 0.74, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(140,90,0,0.85)';
      g.font = `900 ${r * 1.05}px Bungee, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', 0, r * 0.06);
      g.restore();
      // specular
      g.globalAlpha = 0.5 * w;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(c - r * 0.3 * w, c - r * 0.4, r * 0.25 * w, r * 0.12, -0.6, 0, TAU); g.fill();
    });
  }

  /* ---------- ambient particles (behind the UI) ---------- */
  const PRESETS = {
    embers: { n: 60, from: 'bottom', vy: [-70, -25], vx: [-12, 12], size: [2, 6], kind: 'glow', colors: ['#ff9a3c', '#ffcc33', '#ff5a1f'], sway: 20, twinkle: 1, add: 1 },
    sprinkles: { n: 55, from: 'top', vy: [25, 70], vx: [-10, 10], size: [3, 7], kind: 'rect', colors: ['#ff6fb5', '#7ad7ff', '#ffe066', '#9b8cff', '#7bf1a8', '#ffffff'], rot: 1, sway: 15 },
    bubbles: { n: 40, from: 'bottom', vy: [-55, -15], vx: [-5, 5], size: [3, 16], kind: 'bubble', sway: 18 },
    petals: { n: 40, from: 'top', vy: [20, 55], vx: [10, 40], size: [5, 10], kind: 'petal', colors: ['#ffc4dd', '#ffb0d0', '#ffe1ee', '#ff9ec6'], rot: 1, sway: 35 },
    dust: { n: 50, from: 'left', vy: [-5, 5], vx: [30, 90], size: [1.5, 3.5], kind: 'glow', colors: ['#ffd6a0', '#e6b478'], sway: 10, alpha: 0.5 },
    sand: { n: 60, from: 'left', vy: [-4, 8], vx: [50, 120], size: [1.2, 3], kind: 'glow', colors: ['#ffdc96', '#f0be6e'], sway: 6, alpha: 0.6 },
    leaves: { n: 26, from: 'top', vy: [25, 60], vx: [-20, 20], size: [7, 13], kind: 'leaf', colors: ['#3f9b3a', '#6cc04a', '#2e7d32', '#9ccc65'], rot: 1, sway: 40 },
    snow: { n: 110, from: 'top', vy: [20, 60], vx: [-10, 10], size: [1.5, 5], kind: 'glow', colors: ['#ffffff', '#e6f4ff'], sway: 25, alpha: 0.8 },
    snowlight: { n: 50, from: 'top', vy: [12, 35], vx: [-6, 6], size: [1.2, 3.5], kind: 'glow', colors: ['#ffffff', '#cfefff'], sway: 15, alpha: 0.7 },
    fireflies: { n: 45, from: 'any', vy: [-12, 12], vx: [-12, 12], size: [2, 5], kind: 'glow', colors: ['#d7ff6b', '#fff59d', '#f0a6ff'], twinkle: 1, sway: 20, add: 1 },
    golddust: { n: 60, from: 'top', vy: [10, 35], vx: [-6, 6], size: [1.5, 4], kind: 'star', colors: ['#ffd700', '#ffe680'], twinkle: 1, sway: 12, add: 1 },
    clovers: { n: 18, from: 'top', vy: [20, 45], vx: [-10, 10], size: [12, 20], kind: 'emoji', emoji: ['☘️', '🍀'], rot: 1, sway: 30, alpha: 0.55 },
    sparkles: { n: 70, from: 'any', vy: [-4, 4], vx: [-4, 4], size: [1.5, 4.5], kind: 'star', colors: ['#ffffff', '#bfe9ff', '#ffe9b0'], twinkle: 1, add: 1 },
    pixels: { n: 40, from: 'bottom', vy: [-45, -15], vx: [0, 0], size: [4, 10], kind: 'pixel', colors: ['#39ff14', '#ff3cac', '#00e5ff', '#ffe600'], alpha: 0.55 },
    bamboo: { n: 22, from: 'top', vy: [15, 40], vx: [-15, 15], size: [7, 12], kind: 'leaf', colors: ['#8fe388', '#5fae5a', '#b6e3a8'], rot: 1, sway: 35 },
    disco: { n: 45, from: 'any', vy: [-10, 10], vx: [-10, 10], size: [2, 5], kind: 'glow', colors: ['#ff2fa6', '#ffd319', '#38e1ff', '#9b5cff'], twinkle: 1, add: 1 },
    clouds: { n: 10, from: 'left', vy: [-2, 2], vx: [8, 20], size: [80, 160], kind: 'cloud', colors: ['rgba(255,255,255,0.10)'] },
    fog: { n: 8, from: 'left', vy: [-2, 2], vx: [10, 25], size: [120, 220], kind: 'cloud', colors: ['rgba(170,120,230,0.10)'], bats: true },
  };

  class Ambient {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = [];
      this.resize();
      root.addEventListener('resize', () => this.resize());
    }
    resize() {
      this.W = this.cv.width = root.innerWidth;
      this.H = this.cv.height = root.innerHeight;
    }
    setTheme(th) {
      this.pre = th.fx ? PRESETS[th.fx] : null;
      this.ps = [];
      this.bats = [];
      if (!this.pre) return;
      const n = Math.round(this.pre.n * Math.min(1.2, (this.W * this.H) / (1280 * 800) + 0.4));
      for (let i = 0; i < n; i++) this.ps.push(this.spawn(true));
    }
    spawn(init) {
      const p = this.pre, W = this.W, H = this.H;
      const o = {
        vx: U.lerp(p.vx[0], p.vx[1], R()), vy: U.lerp(p.vy[0], p.vy[1], R()), s: U.lerp(p.size[0], p.size[1], R()),
        c: p.colors ? p.colors[Math.floor(R() * p.colors.length)] : '#fff', rot: R() * TAU, vr: p.rot ? (R() - 0.5) * 2 : 0, ph: R() * TAU,
        e: p.emoji ? p.emoji[Math.floor(R() * p.emoji.length)] : null, z: 0.5 + R() * 0.8,
      };
      if (init || p.from === 'any') { o.x = R() * W; o.y = R() * H; } else if (p.from === 'top') { o.x = R() * W; o.y = -30; }
      else if (p.from === 'bottom') { o.x = R() * W; o.y = H + 30; } else { o.x = -o.s * 2; o.y = R() * H; }
      return o;
    }
    draw(tms, dt) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      const p = this.pre;
      if (!p) return;
      const t = tms / 1000;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      for (let i = 0; i < this.ps.length; i++) {
        const o = this.ps[i];
        o.x += (o.vx + (p.sway ? Math.sin(t * 1.3 + o.ph) * p.sway * 0.4 : 0)) * dt * o.z;
        o.y += o.vy * dt * o.z;
        o.rot += o.vr * dt;
        const m = p.kind === 'cloud' ? o.s * 2 : 40;
        if (o.y > this.H + m || o.y < -m || o.x > this.W + m || o.x < -m) {
          if (p.from === 'any') { o.x = (o.x + this.W) % this.W; o.y = (o.y + this.H) % this.H; } else this.ps[i] = this.spawn(false);
          continue;
        }
        let a = (p.alpha || 1) * Math.min(1, o.z);
        if (p.twinkle) a *= 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + o.ph));
        ctx.globalAlpha = a;
        const s = o.s * o.z;
        switch (p.kind) {
          case 'glow': ctx.drawImage(glow(o.c), o.x - s * 3, o.y - s * 3, s * 6, s * 6); break;
          case 'star': ctx.drawImage(starSpr(o.c), o.x - s * 3, o.y - s * 3, s * 6, s * 6); break;
          case 'rect': ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.fillStyle = o.c; ctx.fillRect(-s / 2, -s * 0.2, s, s * 0.4); ctx.restore(); break;
          case 'pixel': ctx.fillStyle = o.c; ctx.fillRect(Math.round(o.x / 4) * 4, Math.round(o.y / 4) * 4, s, s); break;
          case 'bubble':
            ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(o.x, o.y, s, 0, TAU); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(o.x - s * 0.35, o.y - s * 0.35, s * 0.25, 0, TAU); ctx.fill();
            break;
          case 'petal':
            ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(1, Math.abs(Math.cos(o.rot * 1.5)) * 0.6 + 0.4);
            ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, 0, s * 0.4, s * 0.2, 0, 0, TAU); ctx.fill();
            ctx.restore(); break;
          case 'leaf':
            ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(1, Math.abs(Math.cos(o.rot)) * 0.7 + 0.3); ctx.fillStyle = o.c;
            ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.6, s, 0); ctx.quadraticCurveTo(0, s * 0.6, -s, 0); ctx.fill();
            ctx.restore(); break;
          case 'emoji': ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.drawImage(emo(o.e), -s / 2, -s / 2, s, s); ctx.restore(); break;
          case 'cloud': ctx.drawImage(soft(o.c), o.x - s, o.y - s * 0.5, s * 2, s); break;
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (p.bats) {
        if (R() < dt * 0.25) this.bats.push({ x: -30, y: this.H * (0.08 + R() * 0.35), v: 90 + R() * 80, ph: R() * 6 });
        this.bats = this.bats.filter((b) => b.x < this.W + 40);
        ctx.globalAlpha = 0.75;
        this.bats.forEach((b) => { b.x += b.v * dt; ctx.drawImage(emo('🦇'), b.x, b.y + Math.sin(t * 6 + b.ph) * 12, 26, 26); });
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ---------- celebration layer (above UI) ---------- */
  const WIN_KIND = {
    spark: ['glow'], gold: ['star', 'glow'], coin: ['coin'], heart: ['emoji:💖', 'glow'], bubble: ['bubble'], star: ['star'],
    frost: ['emoji:❄️', 'star'], petal: ['emoji:🌸', 'glow'], flame: ['flame'], shard: ['shard', 'star'], pixel: ['pixel'],
    note: ['emoji:🎵', 'emoji:🎶', 'glow'], clover: ['emoji:☘️', 'star'], leaf: ['emoji:🍃', 'glow'], ghost: ['emoji:👻', 'glow'],
    bolt: ['star', 'glow'], snowflake: ['emoji:❄️', 'glow'],
  };

  class Fx {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = [];
      this.texts = [];
      this.rings = [];
      this.resize();
      root.addEventListener('resize', () => this.resize());
    }
    resize() {
      this.dpr = Math.min(2, root.devicePixelRatio || 1);
      this.W = root.innerWidth; this.H = root.innerHeight;
      this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    }
    add(p) { if (this.ps.length < 900) this.ps.push(p); }
    burst(x, y, color, n, power) {
      for (let i = 0; i < (n || 14); i++) {
        const a = R() * TAU, v = (90 + R() * 260) * (power || 1);
        this.add({ k: 'glow', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + R() * 0.5, age: 0, s: 3 + R() * 4, c: color, g: 260, drag: 2.2 });
      }
      this.ring(x, y, color, 70);
    }
    ring(x, y, color, maxR, width) { this.rings.push({ x, y, age: 0, life: 0.55, c: color, r: maxR || 70, w: width || 4 }); }
    winBurst(x, y, kind, color, n) {
      const kinds = WIN_KIND[kind] || WIN_KIND.spark;
      for (let i = 0; i < n; i++) {
        const k = kinds[i % kinds.length];
        const a = -Math.PI / 2 + (R() - 0.5) * Math.PI * 1.6, v = 120 + R() * 280;
        const p = { k, x: x + (R() - 0.5) * 20, y: y + (R() - 0.5) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + R() * 0.7, age: 0,
          s: k.startsWith('emoji') ? 14 + R() * 12 : k === 'coin' ? 10 + R() * 8 : 3 + R() * 5, c: color, g: k === 'bubble' || k === 'flame' ? -60 : 380,
          rot: R() * TAU, vr: (R() - 0.5) * 10, drag: 1.2, fr: Math.floor(R() * COIN_FRAMES) };
        if (k === 'flame') { p.vy = -60 - R() * 120; p.vx *= 0.3; }
        this.add(p);
      }
    }
    shards(x, y, color, n, size) {
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, v = 120 + R() * 320;
        this.add({ k: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.7 + R() * 0.5, age: 0, s: (size || 10) * (0.5 + R()), c: color, g: 700, rot: R() * TAU, vr: (R() - 0.5) * 16, drag: 0.6 });
      }
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU, v = 60 + R() * 120;
        this.add({ k: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, age: 0, s: 4 + R() * 4, c: color, g: 0, drag: 2 });
      }
    }
    coins(n, fromX, fromY, spread) {
      for (let i = 0; i < n; i++) {
        const up = fromY != null;
        this.add({ k: 'coin', x: fromX != null ? fromX + (R() - 0.5) * (spread || 40) : R() * this.W, y: up ? fromY : -20 - R() * 200,
          vx: (R() - 0.5) * (up ? 700 : 120), vy: up ? -450 - R() * 650 : 60 + R() * 150, life: 3.2, age: 0, s: 12 + R() * 12,
          fr: Math.floor(R() * COIN_FRAMES), spin: 18 + R() * 20, g: 1100, drag: 0.15 });
      }
    }
    confetti(n, colors) {
      const cs = colors || ['#ff3b5c', '#ffd23f', '#3bff7a', '#3bc8ff', '#c03bff', '#ff8a3b', '#ffffff'];
      for (let i = 0; i < n; i++) {
        this.add({ k: 'conf', x: R() * this.W, y: -20 - R() * 300, vx: (R() - 0.5) * 90, vy: 90 + R() * 140, life: 5, age: 0, s: 7 + R() * 7,
          rot: R() * TAU, vr: (R() - 0.5) * 12, c: cs[Math.floor(R() * cs.length)], g: 30, sway: R() * 6 });
      }
    }
    streaks(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, v = 700 + R() * 700;
        this.add({ k: 'streak', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45 + R() * 0.3, age: 0, s: 2 + R() * 2, c: color, g: 0, drag: 1.5 });
      }
    }
    text(x, y, str, color, size) { this.texts.push({ x, y, str, c: color || '#ffd700', s: size || 26, age: 0, life: 1.5 }); }
    draw(tms, dt) {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      if (!this.ps.length && !this.texts.length && !this.rings.length) return false;
      ctx.globalCompositeOperation = 'lighter';
      for (const r of this.rings) {
        r.age += dt;
        const u = r.age / r.life;
        const rad = 8 + U.easeOutCubic(u) * r.r;
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.strokeStyle = r.c; ctx.lineWidth = r.w * (1 - u) + 0.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
      }
      this.rings = this.rings.filter((r) => r.age < r.life);
      for (const p of this.ps) {
        p.age += dt;
        if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
        p.vy += p.g * dt;
        p.x += p.vx * dt + (p.sway ? Math.sin(p.age * 3 + p.sway) * 40 * dt : 0);
        p.y += p.vy * dt;
        if (p.rot != null) p.rot += (p.vr || 0) * dt;
        const life = 1 - p.age / p.life;
        const a = Math.min(1, life * 2.5);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        const k = p.k;
        if (k === 'glow' || k === 'flame') {
          ctx.globalCompositeOperation = 'lighter';
          const s = p.s * (k === 'flame' ? 1 + (1 - life) * 2 : life + 0.3);
          ctx.drawImage(glow(k === 'flame' ? (life > 0.5 ? '#ffcc33' : '#ff4400') : p.c), p.x - s * 3, p.y - s * 3, s * 6, s * 6);
        } else if (k === 'star') {
          ctx.globalCompositeOperation = 'lighter';
          const s = p.s * (0.6 + 0.4 * Math.sin(p.age * 20));
          ctx.drawImage(starSpr(p.c), p.x - s * 3, p.y - s * 3, s * 6, s * 6);
        } else if (k === 'streak') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          if (k === 'coin') {
            p.fr = (p.fr + (p.spin || 14) * dt) % COIN_FRAMES;
            ctx.drawImage(coinFrame(Math.floor(p.fr)), p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
          } else if (k === 'conf') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s * 0.25, p.s, p.s * 0.5 * Math.abs(Math.cos(p.rot * 2)) + 1);
            ctx.restore();
          } else if (k === 'shard') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.6, p.s * 0.5); ctx.lineTo(-p.s * 0.5, p.s * 0.3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.2, 0); ctx.lineTo(-p.s * 0.3, p.s * 0.1); ctx.closePath(); ctx.fill();
            ctx.restore();
          } else if (k === 'pixel') {
            ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s * 1.6, p.s * 1.6);
          } else if (k === 'bubble') {
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 2, 0, TAU); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(p.x - p.s * 0.7, p.y - p.s * 0.7, p.s * 0.5, 0, TAU); ctx.fill();
          } else if (k.startsWith('emoji')) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.3);
            ctx.drawImage(emo(k.slice(6)), -p.s / 2, -p.s / 2, p.s, p.s);
            ctx.restore();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this.ps = this.ps.filter((p) => p.age < p.life && p.y < this.H + 80 && p.y > -600);
      for (const t of this.texts) {
        t.age += dt;
        const u = t.age / t.life;
        const y = t.y - U.easeOutCubic(Math.min(1, u * 1.3)) * 50;
        const sc = u < 0.18 ? U.easeOutBack(u / 0.18, 2.2) : 1;
        ctx.globalAlpha = 1 - Math.max(0, (u - 0.65) / 0.35);
        const fs = t.s * sc;
        ctx.font = `700 ${fs}px "Oxanium","Bungee","Arial Black",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = fs * 0.22; ctx.strokeStyle = 'rgba(20,8,0,0.85)';
        ctx.strokeText(t.str, t.x, y);
        const gr = ctx.createLinearGradient(0, y - fs / 2, 0, y + fs / 2);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, t.c); gr.addColorStop(1, U.shade(t.c.startsWith('#') ? t.c : '#ffd700', -0.35));
        ctx.fillStyle = gr; ctx.fillText(t.str, t.x, y);
      }
      ctx.globalAlpha = 1;
      this.texts = this.texts.filter((t) => t.age < t.life);
      return true;
    }
  }

  root.SlotAmbient = Ambient;
  root.SlotFx = Fx;
  root.FxSprites = { glow, starSpr, soft, emo };
})(window);
