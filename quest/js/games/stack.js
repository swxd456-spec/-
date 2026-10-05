/* 하늘 궁전 쌓기 (Stack): one-tap timing game.
   A palace floor slides back and forth above the tower (alternating x / z axis); tap to drop it.
   The overhang is sliced off and tumbles away, so the tower narrows. Perfect drops chain combos,
   raise the pitch and, after a streak, grow the floor back. Gold floors pay coins, wind floors gust.
   Isometric boxes are drawn with gradients; landed floors are cached as sprites. */
(function (root) {
  const { Base, util } = root.QuestGames;
  const U = root.U, A = root.SlotAudio;

  const SECTION = '탑쌓기';
  const DEFAULTS = {
    입장료: 60,
    클리어보상: 250,
    기회_가격: 100,
    퍼펙트_보상: 5,
    콤보_보상: 8,
    슬로우_가격: 60,
    슬로우_개수: 5,
    슬로우_배율: 50,
    난이도_간격: 30,
    목표층_시작: 8,
    목표층_최대: 30,
    속도_시작: 0.5,
    속도_최대: 1.35,
    층당_가속: 1,
    퍼펙트_허용_시작: 10,
    퍼펙트_허용_최소: 4,
    성장_연속: 3,
    성장량: 8,
    가이드_판까지: 3,
    특수층_시작판: 3,
    황금층_확률: 12,
    황금층_코인: 15,
    바람층_시작판: 8,
    바람층_확률: 12,
    바람_세기: 45,
    별2_퍼펙트: 30,
    별3_퍼펙트: 60,
  };

  // world units
  const B = 100;        // full floor width
  const FH = 17;        // floor height
  const RANGE = 125;    // slide distance from the centre
  const CO = Math.cos(Math.PI / 6), SI = 0.5;
  const TAU = Math.PI * 2;

  /* ---------- colour helpers ---------- */
  const hex = (h) => U.hexToRgb(h);
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const css = (c, a) => a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const WHITE = [255, 255, 255], BLACK = [8, 4, 20];
  const GOLD = [255, 196, 64];

  function palette(col, kind) {
    let c = col;
    if (kind === 'gold') c = [255, 186, 40];
    else if (kind === 'wind') c = [90, 220, 255];
    else c = mix(c, WHITE, 0.1);
    const trimC = kind === 'gold' ? [255, 248, 200] : mix(GOLD, WHITE, 0.15);
    return {
      top: css(mix(c, WHITE, 0.2)), topHi: css(mix(c, WHITE, 0.55)),
      left: css(mix(c, BLACK, 0.08)), leftLo: css(mix(c, BLACK, 0.5)),
      right: css(mix(c, BLACK, 0.38)), rightLo: css(mix(c, BLACK, 0.68)),
      trim: css(trimC), trimLo: css(mix(trimC, BLACK, 0.35)),
      win: kind === 'wind' ? 'rgba(220,250,255,0.95)' : 'rgba(255,232,160,0.96)',
      winHi: '#fffdf0', frame: css(mix(c, BLACK, 0.75), 0.75), kind,
    };
  }

  function facePath(g, x0, y0, x1, y1, x2, y2, x3, y3) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); }

  // windows / ornaments on one side face, drawn in face space (u along the face, v down, world units)
  function faceDeco(g, W, h, pal, style, shade) {
    // top trim and bottom shadow band
    g.fillStyle = pal.trim; g.fillRect(0, 0, W, 1.6);
    g.fillStyle = pal.trimLo; g.fillRect(0, 1.6, W, 0.8);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, h - 2.2, W, 2.2);
    if (W < 7) return;
    const n = Math.max(1, Math.floor((W - 3) / 12.5));
    const step = W / n;
    g.globalAlpha = shade;
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * step;
      if (style === 1) {
        // round lantern windows with a gold rim
        const r = Math.min(3.6, step * 0.28);
        g.fillStyle = pal.trimLo; g.beginPath(); g.arc(cx, h * 0.55, r + 0.9, 0, TAU); g.fill();
        g.fillStyle = pal.win; g.beginPath(); g.arc(cx, h * 0.55, r, 0, TAU); g.fill();
        g.fillStyle = pal.winHi; g.beginPath(); g.arc(cx - r * 0.3, h * 0.55 - r * 0.3, r * 0.38, 0, TAU); g.fill();
      } else if (style === 2) {
        // gold coins on the gold floor
        const r = Math.min(3.4, step * 0.28);
        g.fillStyle = '#b86a00'; g.beginPath(); g.arc(cx, h * 0.56 + 0.6, r, 0, TAU); g.fill();
        g.fillStyle = '#ffe680'; g.beginPath(); g.arc(cx, h * 0.56, r, 0, TAU); g.fill();
        g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(cx - r * 0.3, h * 0.56 - r * 0.35, r * 0.35, 0, TAU); g.fill();
      } else {
        // arched windows between pillars
        const ww = Math.min(5.2, step * 0.42), top = h * 0.34, bot = h * 0.82;
        g.fillStyle = pal.frame;
        g.beginPath(); g.moveTo(cx - ww / 2 - 0.8, bot + 0.6); g.lineTo(cx - ww / 2 - 0.8, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2 + 0.8, Math.PI, 0); g.lineTo(cx + ww / 2 + 0.8, bot + 0.6); g.closePath(); g.fill();
        g.fillStyle = pal.win;
        g.beginPath(); g.moveTo(cx - ww / 2, bot); g.lineTo(cx - ww / 2, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, bot); g.closePath(); g.fill();
        g.fillStyle = pal.winHi; g.fillRect(cx - ww / 2 + 0.6, top + ww / 2, ww * 0.28, (bot - top) * 0.45);
        // pillar
        if (i > 0) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(i * step - 0.7, 3, 1.4, h - 5.5); }
      }
    }
    g.globalAlpha = 1;
  }

  // isometric box, origin (ox, oy) = screen point of the top-face centre
  function drawBox(g, w, d, h, k, pal, style, ox, oy, glow) {
    const c = CO * k, s = SI * k, hk = h * k;
    const bx = ox + (-w / 2 + d / 2) * c, by = oy + (-w / 2 - d / 2) * s;
    const rx = ox + (w / 2 + d / 2) * c, ry = oy + (w / 2 - d / 2) * s;
    const fx = ox + (w / 2 - d / 2) * c, fy = oy + (w / 2 + d / 2) * s;
    const lx = ox + (-w / 2 - d / 2) * c, ly = oy + (-w / 2 + d / 2) * s;
    // left face (+z)
    let gr = g.createLinearGradient(0, ly, 0, fy + hk);
    gr.addColorStop(0, pal.left); gr.addColorStop(1, pal.leftLo);
    g.fillStyle = gr; facePath(g, lx, ly, fx, fy, fx, fy + hk, lx, ly + hk); g.fill();
    // right face (+x)
    gr = g.createLinearGradient(0, ry, 0, fy + hk);
    gr.addColorStop(0, pal.right); gr.addColorStop(1, pal.rightLo);
    g.fillStyle = gr; facePath(g, fx, fy, rx, ry, rx, ry + hk, fx, fy + hk); g.fill();
    if (style >= 0) {
      g.save(); g.transform(c, s, 0, k, lx, ly); faceDeco(g, w, h, pal, style, 1); g.restore();
      g.save(); g.transform(c, -s, 0, k, fx, fy); faceDeco(g, d, h, pal, style, 0.72); g.restore();
    }
    // top face
    gr = g.createLinearGradient(bx, by, fx, fy);
    gr.addColorStop(0, pal.topHi); gr.addColorStop(1, pal.top);
    g.fillStyle = gr; facePath(g, bx, by, rx, ry, fx, fy, lx, ly); g.fill();
    // inlay
    const q = 0.74;
    g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = Math.max(0.8, k * 0.7);
    facePath(g, ox + (bx - ox) * q, oy + (by - oy) * q, ox + (rx - ox) * q, oy + (ry - oy) * q, ox + (fx - ox) * q, oy + (fy - oy) * q, ox + (lx - ox) * q, oy + (ly - oy) * q); g.stroke();
    if (pal.kind === 'gold') {
      const r = Math.min(w, d) * 0.22 * k;
      if (r > 3) {
        g.save(); g.translate(ox, oy); g.scale(1, 0.58);
        g.fillStyle = '#c47a00'; g.beginPath(); g.arc(0, 2, r, 0, TAU); g.fill();
        g.fillStyle = '#ffe36a'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.strokeStyle = '#fff6c8'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.7, 0, TAU); g.stroke();
        g.restore();
      }
    } else if (pal.kind === 'wind') {
      const r = Math.min(w, d) * 0.2 * k;
      if (r > 3) {
        g.save(); g.translate(ox, oy); g.scale(1, 0.58);
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, r, 0.3, 4.6); g.stroke();
        g.beginPath(); g.arc(0, 0, r * 0.55, 3.4, 7.6); g.stroke();
        g.restore();
      }
    }
    // edge light
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1, k * 0.9);
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(fx, fy); g.lineTo(rx, ry); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(bx, by); g.lineTo(rx, ry); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + hk); g.stroke();
    if (glow) {
      g.save(); g.globalAlpha = glow; g.strokeStyle = '#fffbe0'; g.lineWidth = 2.5 * k; g.shadowColor = '#fff2a0'; g.shadowBlur = 14;
      facePath(g, bx, by, rx, ry, fx, fy, lx, ly); g.stroke(); g.restore();
    }
  }

  // pagoda roof placed on the finished tower
  function drawRoof(g, w, d, k, ox, oy, t) {
    const c = CO * k, s = SI * k;
    const e = 1.22, W2 = w * e / 2, D2 = d * e / 2;
    const bx = ox + (-W2 + D2) * c, by = oy + (-W2 - D2) * s;
    const rx = ox + (W2 + D2) * c, ry = oy + (W2 - D2) * s;
    const fx = ox + (W2 - D2) * c, fy = oy + (W2 + D2) * s;
    const lx = ox + (-W2 - D2) * c, ly = oy + (-W2 + D2) * s;
    const hgt = Math.max(w, d) * 0.55 * k, ax = ox, ay = oy - hgt;
    const sag = 5 * k;
    // back slopes (seen from above)
    g.fillStyle = '#ff8a8a';
    g.beginPath(); g.moveTo(lx, ly - sag); g.quadraticCurveTo((lx + bx) / 2, (ly + by) / 2 - sag * 0.5, bx, by - sag * 0.6); g.lineTo(ax, ay); g.closePath(); g.fill();
    g.fillStyle = '#e0506a';
    g.beginPath(); g.moveTo(bx, by - sag * 0.6); g.quadraticCurveTo((rx + bx) / 2, (ry + by) / 2 - sag * 0.5, rx, ry - sag); g.lineTo(ax, ay); g.closePath(); g.fill();
    g.strokeStyle = '#ffd86b'; g.lineWidth = 1.5 * k;
    g.beginPath(); g.moveTo(lx, ly - sag); g.quadraticCurveTo((lx + bx) / 2, (ly + by) / 2 - sag * 0.5, bx, by - sag * 0.6); g.quadraticCurveTo((rx + bx) / 2, (ry + by) / 2 - sag * 0.5, rx, ry - sag); g.stroke();
    let gr = g.createLinearGradient(lx, ay, fx, fy);
    gr.addColorStop(0, '#ff6b6b'); gr.addColorStop(1, '#9b1030');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(lx, ly - sag); g.quadraticCurveTo((lx + ax) / 2, (ly + ay) / 2 + sag, ax, ay); g.quadraticCurveTo((fx + ax) / 2, (fy + ay) / 2 + sag, fx, fy); g.quadraticCurveTo((lx + fx) / 2, (ly + fy) / 2 + sag * 0.5, lx, ly - sag); g.fill();
    gr = g.createLinearGradient(fx, ay, rx, fy);
    gr.addColorStop(0, '#c41a44'); gr.addColorStop(1, '#5c0620');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo((fx + ax) / 2, (fy + ay) / 2 + sag, ax, ay); g.quadraticCurveTo((rx + ax) / 2, (ry + ay) / 2 + sag, rx, ry - sag); g.quadraticCurveTo((fx + rx) / 2, (fy + ry) / 2 + sag * 0.5, fx, fy); g.fill();
    g.strokeStyle = '#ffd86b'; g.lineWidth = 2 * k; g.lineCap = 'round';
    g.beginPath(); g.moveTo(lx, ly - sag); g.quadraticCurveTo((lx + fx) / 2, (ly + fy) / 2 + sag * 0.5, fx, fy); g.quadraticCurveTo((fx + rx) / 2, (fy + ry) / 2 + sag * 0.5, rx, ry - sag); g.stroke();
    g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo((fx + ax) / 2, (fy + ay) / 2 + sag, ax, ay); g.stroke();
    // spire orb
    const r = 6 * k, pulse = 1 + Math.sin(t * 5) * 0.08;
    g.fillStyle = '#ffd86b'; g.fillRect(ax - 1 * k, ay - 8 * k, 2 * k, 8 * k);
    const og = g.createRadialGradient(ax - r * 0.3, ay - 10 * k - r * 0.3, 1, ax, ay - 10 * k, r * pulse);
    og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, '#ffe680'); og.addColorStop(1, '#ff9a00');
    g.save(); g.shadowColor = '#ffd23f'; g.shadowBlur = 20;
    g.fillStyle = og; g.beginPath(); g.arc(ax, ay - 10 * k, r * pulse, 0, TAU); g.fill(); g.restore();
  }

  /* ---------- sounds ---------- */
  const ok = () => A && A.kit && A.kit.ok();
  const S = {
    drop(m) {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.tone('sine', 200, 55, t, 0.2, 0.55);
      k.noise(t, 0.06, 0.28, 'lowpass', 1200, 1);
      k.play('marimba', k.note(m || 0, 1), t, 0.14, 0.28, k.rv(0.2));
    },
    perfect(c) {
      if (!ok()) return; const k = A.kit, t = k.now(), i = Math.min(c, 11);
      k.tone('sine', 180, 70, t, 0.14, 0.4);
      k.play('bell', k.note(i + 2, 1), t, 0.5, 0.36, k.rv(0.5));
      k.play('celesta', k.note(i + 4, 1), t + 0.05, 0.35, 0.26, k.rv(0.5));
      if (c >= 3) k.play('celesta', k.note(i + 7, 1), t + 0.1, 0.3, 0.2, k.rv(0.6));
      k.noise(t, 0.2, 0.12, 'highpass', 6000, 0.7, k.rv(0.3));
    },
    cut(big) {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.noise(t, 0.16, 0.3, 'bandpass', 1800, 1.4, { sweep: 500 });
      k.tone('triangle', 520, 140, t, 0.16, 0.18);
      k.tone('sine', 160, 50, t, 0.2, 0.45 + (big ? 0.15 : 0));
    },
    grow() {
      if (!ok()) return; const k = A.kit, t = k.now();
      for (let i = 0; i < 5; i++) k.play('harp', k.note(5 + i * 2, 1), t + i * 0.045, 0.3, 0.24, k.rv(0.5));
      k.tone('sine', 300, 1200, t, 0.3, 0.06, { attack: 0.1 });
    },
    gold() {
      if (!ok()) return; const k = A.kit, t = k.now();
      for (let i = 0; i < 5; i++) { const f = 3200 + i * 380; k.tone('sine', f, f * 0.98, t + i * 0.05, 0.12, 0.08, { prio: 0 }); }
      k.play('bell', k.note(9, 1), t, 0.4, 0.28, k.rv(0.5));
    },
    wind() {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.noise(t, 0.9, 0.22, 'bandpass', 300, 1.5, { sweep: 2400, attack: 0.3 });
      k.noise(t + 0.3, 0.7, 0.14, 'bandpass', 2000, 2, { sweep: 500, attack: 0.2 });
    },
    miss() {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.tone('sawtooth', 420, 70, t, 0.6, 0.12);
      k.tone('sine', 300, 45, t, 0.7, 0.45);
      k.noise(t + 0.45, 0.35, 0.25, 'lowpass', 600, 1);
    },
    slow() {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.tone('sine', 1400, 180, t, 0.7, 0.12, { attack: 0.02 });
      k.play('pad', k.note(0, 1), t, 0.8, 0.2, k.rv(0.6));
      k.play('celesta', k.note(7, 1), t + 0.05, 0.4, 0.2, k.rv(0.6));
    },
    roof() {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.tone('sine', 140, 40, t, 0.5, 0.6);
      [0, 2, 4, 7].forEach((d, i) => k.play('bell', k.note(d + 5, 1), t + 0.05 + i * 0.07, 0.6, 0.28, k.rv(0.6)));
    },
    spawn() {
      if (!ok()) return; const k = A.kit, t = k.now();
      k.noise(t, 0.12, 0.06, 'bandpass', 900, 1, { sweep: 2400, prio: 0 });
    },
  };

  class Stack extends Base {
    static info = { id: 'stack', name: '하늘 궁전 쌓기', icon: '🏯', section: SECTION, color: '#7b61ff', desc: '타이밍 맞춰 탭! 궁전 층을 하늘 높이 쌓아요.' };
    static howto = ['층이 좌우로 움직여요. 아래층과 딱 맞을 때 탭!', '삐져나온 부분은 잘려 나가요. 정확할수록 넓게 쌓아요.', '퍼펙트를 이어가면 층이 다시 넓어져요.', '목표 층수까지 쌓으면 클리어!'];

    static params(stage, C) {
      const c = util.cfg(C, SECTION, DEFAULTS);
      const u = util.ease(stage, c.난이도_간격);
      const L = util.lerp;
      return {
        fee: c.입장료, reward: c.클리어보상,
        extendCost: c.기회_가격, extendSec: 0, extendText: '+1 기회',
        time: 0,
        target: Math.round(L(c.목표층_시작, Math.max(c.목표층_시작, c.목표층_최대), u)),
        speed: L(c.속도_시작, c.속도_최대, u),
        accel: c.층당_가속 / 100,
        tol: L(c.퍼펙트_허용_시작, c.퍼펙트_허용_최소, u),
        growN: Math.max(1, c.성장_연속), grow: c.성장량,
        guide: stage <= c.가이드_판까지,
        goldP: stage >= c.특수층_시작판 ? c.황금층_확률 / 100 : 0, goldCoins: c.황금층_코인,
        windP: stage >= c.바람층_시작판 ? c.바람층_확률 / 100 : 0, wind: c.바람_세기 / 100,
        slowCost: c.슬로우_가격, slowN: c.슬로우_개수, slowMul: U.clamp(c.슬로우_배율 / 100, 0.15, 1),
        perfectCoin: c.퍼펙트_보상, comboCoin: c.콤보_보상,
        star: [0, c.별2_퍼펙트, c.별3_퍼펙트],
      };
    }

    constructor(host, o) {
      super(host, o);
      const p = this.p;
      this.hud({ title: '하늘 궁전 쌓기', sub: `${o.stage || 1}단계 · 목표 ${p.target}층`, timer: false, tools: [{ id: 'slow', ico: '🐢', label: '슬로우', cost: p.slowCost }] });
      const tiers = (this.th.tiers && this.th.tiers.length ? this.th.tiers : ['#ff4fd8', '#7b61ff', '#00e5ff', '#36f1cd', '#ffb000']).map(hex);
      this.tiers = tiers;
      this.acc = hex(this.th.accent || '#ff4fd8'); this.acc2 = hex(this.th.accent2 || '#00e5ff');
      this.floors = [{ x: 0, z: 0, w: B, d: B, y: -FH, kind: 'base', col: mix(tiers[0], WHITE, 0.15), spr: null, land: 0 }];
      this.pieces = []; this.rings = [];
      this.combo = 0; this.maxCombo = 0; this.perfects = 0; this.goldCoins = 0;
      this.placed = 0; this.camY = 0; this.bob = 0; this.bobV = 0;
      this.slowLeft = 0; this.grace = 0; this.freeze = 0;
      this.state = 'play'; this.endT = 0; this.roofT = -1; this.clock = 0; this.windT = 0; this.sway = 0;
      this.cur = null;
      // visual-only randomness (sky decor), level layout uses this.rnd
      const vr = U.mulberry32((o.seed >>> 0) ^ 0x5bd1e995);
      this.starsBg = []; for (let i = 0; i < 70; i++) this.starsBg.push({ x: vr(), y: vr(), r: 0.6 + vr() * 1.5, ph: vr() * TAU });
      this.clouds = [];
      const top = (p.target + 8) * FH;
      for (let y = -FH * 5; y < top; y += FH * (2.2 + vr() * 1.8)) this.clouds.push({ wy: y, x: vr(), s: 0.6 + vr() * 0.8, v: (vr() < 0.5 ? -1 : 1) * (0.006 + vr() * 0.012), a: 0.5 + vr() * 0.4 });
      this.streaks = []; for (let i = 0; i < 14; i++) this.streaks.push({ x: vr(), y: vr(), l: 0.08 + vr() * 0.14, v: 0.6 + vr() * 0.8 });
      this.ui.wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(); });
      this.onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.tap(); } };
      addEventListener('keydown', this.onKey);
      this.spawn();
      this.refresh();
    }

    /* ---------- layout & sprites ---------- */
    layout() {
      if (!this.fit()) return;
      const k = Math.min(this.W / 380, this.H / 370);
      if (k !== this.k) { this.k = k; this.floors.forEach((f) => { f.spr = null; }); this.plinth = null; this.cloudSpr = null; }
      this.cx = this.W / 2;
      this.Y0 = this.H * 0.6;
    }

    sprite(w, d, h, pal, style) {
      const k = this.k, dpr = this.dpr, c = CO * k, s = SI * k, pad = 6;
      const cw = (w + d) * c + pad * 2, ch = (w + d) * s + h * k + pad * 2;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(cw * dpr); cv.height = Math.ceil(ch * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const ox = pad + (w + d) / 2 * c, oy = pad + (w + d) / 2 * s;
      drawBox(g, w, d, h, k, pal, style, ox, oy);
      return { cv, ox, oy, w: cw, h: ch };
    }
    floorSprite(f, i) {
      if (!f.spr) {
        if (!f.pal) f.pal = palette(f.col, f.kind);
        f.spr = this.sprite(f.w, f.d, FH, f.pal, f.kind === 'gold' ? 2 : i % 4 === 3 ? 1 : 0);
      }
      return f.spr;
    }
    plinthSprite() {
      if (this.plinth) return this.plinth;
      const k = this.k, dpr = this.dpr, c = CO * k, s = SI * k, pad = 8;
      const w1 = B * 1.3, h1 = FH * 1.1, w2 = B * 1.65, h2 = FH * 1.5;
      const cw = 2 * w2 * c + pad * 2, ch = 2 * w2 * s + (h1 + h2) * k + pad * 2 + 20 * k;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(cw * dpr); cv.height = Math.ceil(ch * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const ox = cw / 2, oy = pad + w2 * s;
      const stone = mix(hex((this.th.sc && this.th.sc[1]) || '#5a3a8a'), [200, 190, 230], 0.35);
      const p2 = palette(mix(stone, BLACK, 0.2), 'base');
      const p1 = palette(stone, 'base');
      // lower step sits below the upper one
      const oy2 = oy + h1 * k;
      // glow pool under the palace
      const gl = g.createRadialGradient(ox, oy2 + (w2 * s) + h2 * k, 4, ox, oy2 + w2 * s + h2 * k, w2 * c * 1.05);
      gl.addColorStop(0, css(this.acc2, 0.45)); gl.addColorStop(1, css(this.acc2, 0));
      g.fillStyle = gl; g.fillRect(0, 0, cw, ch);
      drawBox(g, w2, w2, h2, k, p2, 1, ox, oy2);
      drawBox(g, w1, w1, h1, k, p1, 0, ox, oy);
      this.plinth = { cv, ox, oy, w: cw, h: ch };
      return this.plinth;
    }
    cloudSprite() {
      if (this.cloudSpr) return this.cloudSpr;
      const dpr = this.dpr, w = 150, h = 60;
      const cv = document.createElement('canvas'); cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const blobs = [[40, 38, 22], [70, 30, 28], [100, 36, 22], [120, 42, 15], [24, 44, 14], [75, 44, 22]];
      for (const [x, y, r] of blobs) {
        const gr = g.createRadialGradient(x, y - r * 0.4, 2, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(235,225,255,0.75)'); gr.addColorStop(1, 'rgba(220,210,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      this.cloudSpr = { cv, w, h };
      return this.cloudSpr;
    }

    /* ---------- projection ---------- */
    sx(x, z) { return this.cx + (x - z) * CO * this.k; }
    sy(x, z, y) { return this.Y0 + (x + z) * SI * this.k - (y - this.camY) * this.k + this.bob; }

    /* ---------- game flow ---------- */
    top() { return this.floors[this.floors.length - 1]; }
    colorFor(i) {
      const T = this.tiers, n = T.length, a = Math.floor(i / 3), u = (i % 3) / 3;
      return mix(T[a % n], T[(a + 1) % n], u);
    }
    spawn() {
      const prev = this.top(), i = this.floors.length; // index of the new floor
      let kind = 'normal';
      if (i >= 2 && i < this.p.target) {
        const r = this.rnd();
        if (r < this.p.goldP) kind = 'gold';
        else if (r < this.p.goldP + this.p.windP) kind = 'wind';
      }
      const axis = i % 2 ? 'x' : 'z';
      this.cur = { x: prev.x, z: prev.z, w: prev.w, d: prev.d, y: prev.y + FH, axis, s: 0, off: -RANGE, dir: 1, kind, col: this.colorFor(i), pal: null, drop: 1 };
      this.cur.pal = palette(this.cur.col, kind);
      this.cur.style = kind === 'gold' ? 2 : i % 4 === 3 ? 1 : 0;
      this.setOff();
      if (kind === 'gold') { this.banner('황금층! 🪙', 'good', 900); this.o.onEvent('special', { kind: 'gold' }); }
      else if (kind === 'wind') { this.banner('바람층! 🌬️', 'info', 900); S.wind(); this.o.onEvent('special', { kind: 'wind' }); }
      else S.spawn();
    }
    setOff() { const c = this.cur; if (c.axis === 'x') c.x = this.top().x + c.off; else c.z = this.top().z + c.off; }
    speedNow() {
      const c = this.cur, p = this.p;
      let v = p.speed * B * (1 + p.accel * this.placed);
      if (this.slowLeft > 0) v *= p.slowMul;
      if (this.grace > 0) v *= 0.7;
      if (c && c.kind === 'wind') v *= Math.max(0.35, 1 + p.wind * (Math.sin(this.windT * 2.3) * 0.7 + Math.sin(this.windT * 5.1 + 1) * 0.3) * 1.4);
      return v;
    }
    // signed slab offset from the tower along its axis and the current velocity (units/s); used by the test bot too
    probe() {
      const c = this.cur; if (!c) return null;
      const t = this.top();
      return { delta: c.axis === 'x' ? c.x - t.x : c.z - t.z, vel: this.speedNow() * c.dir, tol: this.p.tol, size: c.axis === 'x' ? c.w : c.d, state: this.state };
    }

    tap() {
      if (!this.running || this.paused || this.state !== 'play' || !this.cur || this.cur.drop > 0.6) return;
      const c = this.cur, t = this.top(), ax = c.axis;
      const delta = ax === 'x' ? c.x - t.x : c.z - t.z;
      const size = ax === 'x' ? c.w : c.d;
      const ad = Math.abs(delta);
      const topY = c.y + FH;
      if (ad >= size - 0.5) return this.miss();
      const perfect = ad <= this.p.tol;
      if (this.slowLeft > 0) this.slowLeft--;
      if (this.grace > 0) this.grace--;
      const midX = this.sx(c.x, c.z), midY = this.sy(c.x, c.z, topY);
      if (perfect) {
        if (ax === 'x') c.x = t.x; else c.z = t.z;
        this.combo++; this.perfects++; this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 10 + 10 * Math.min(this.combo, 10);
        if (this.combo >= this.p.growN && (c.w < B || c.d < B)) {
          const g = this.p.grow;
          c.w = Math.min(B, c.w + g); c.d = Math.min(B, c.d + g);
          setTimeout(() => S.grow(), 120);
          this.pop(midX, midY - 50, '확장! ↔', '#9ff7ff', 22);
          this.o.onEvent('grow', { n: this.combo });
        }
        S.perfect(this.combo);
        this.rings.push({ x: c.x, z: c.z, y: topY, w: c.w, d: c.d, age: 0 });
        if (this.combo >= 3) this.rings.push({ x: c.x, z: c.z, y: topY, w: c.w, d: c.d, age: -0.12 });
        this.burst(midX, midY, '#fff3b0', 14 + Math.min(this.combo, 8) * 2, 0.9);
        this.ring(midX, midY, '#ffffff', 80 + this.combo * 6, 4);
        this.pop(midX, midY - 24, this.combo >= 2 ? `PERFECT ×${this.combo}` : 'PERFECT!', '#fff6a0', 24 + Math.min(this.combo, 8) * 1.5);
        if (this.combo >= 2) this.o.onEvent('combo', { n: this.combo });
        this.o.onEvent('perfect', { n: this.combo });
        if (this.combo >= 5 && this.combo % 5 === 0) { this.freeze = 0.09; this.banner(`${this.combo} 콤보!`, 'good', 900); this.shake(300); }
      } else {
        this.combo = 0;
        const newSize = size - ad, sign = Math.sign(delta);
        const pc = { x: c.x, z: c.z, w: c.w, d: c.d };
        if (ax === 'x') {
          const nx = t.x + delta / 2;
          c.x = nx; c.w = newSize; pc.w = ad; pc.x = nx + sign * (newSize / 2 + ad / 2);
        } else {
          const nz = t.z + delta / 2;
          c.z = nz; c.d = newSize; pc.d = ad; pc.z = nz + sign * (newSize / 2 + ad / 2);
        }
        this.addPiece(pc, c.y, ax, sign, c.pal, c.style);
        this.score += 10;
        S.cut(ad > size * 0.3);
        S.drop(2);
        const qx = this.sx(pc.x, pc.z), qy = this.sy(pc.x, pc.z, topY);
        this.shards(qx, qy, css(c.col), 6, 6);
        if (ad > size * 0.35) this.shake(250);
      }
      if (c.kind === 'gold') {
        const coins = Math.round(this.p.goldCoins * (perfect ? 2 : 1));
        this.goldCoins += coins;
        this.pop(midX, midY - 60, `+${coins} 🪙`, '#ffd23f', 24);
        const [px, py] = this.page(midX, midY); this.o.fx.coins && this.o.fx.coins(perfect ? 8 : 4, px, py, 40);
        S.gold();
      }
      const f = { x: c.x, z: c.z, w: c.w, d: c.d, y: c.y, kind: c.kind, col: c.col, spr: null, land: this.clock };
      this.floors.push(f);
      this.placed++;
      this.bobV = 70 + (perfect ? 40 : 0);
      this.cur = null;
      this.o.onEvent('floor', { n: this.placed, perfect });
      this.refresh();
      if (this.placed >= this.p.target) { this.finish(); return; }
      this.spawnT = 0.14;
    }

    addPiece(pc, y, ax, sign, pal, style) {
      if (this.pieces.length > 8) this.pieces.shift();
      const v = 35 + this.rnd() * 25;
      this.pieces.push({ x: pc.x, z: pc.z, w: pc.w, d: pc.d, y, vx: ax === 'x' ? sign * v : 0, vz: ax === 'z' ? sign * v : 0, vy: 20, rot: 0,
        vr: (ax === 'x' ? 1 : -1) * sign * (1.6 + this.rnd() * 1.6), pal, style, front: sign > 0 });
    }

    miss() {
      const c = this.cur;
      this.combo = 0;
      this.addPiece({ x: c.x, z: c.z, w: c.w, d: c.d }, c.y, c.axis, Math.sign(c.axis === 'x' ? c.x - this.top().x : c.z - this.top().z) || 1, c.pal, c.style);
      this.cur = null;
      this.state = 'fall'; this.endT = 1.0;
      S.miss(); this.shake(400);
      this.banner('놓쳤어요!', 'bad', 1000);
      this.o.onEvent('miss', { n: this.placed });
      this.refresh();
    }

    finish() {
      this.state = 'done';
      this.roofT = 0;
      this.o.onEvent('tower', { n: this.placed, perfects: this.perfects });
      setTimeout(() => {
        if (this.dead) return;
        S.roof();
        const t = this.top(), x = this.sx(t.x, t.z), y = this.sy(t.x, t.z, t.y + FH);
        this.explode(x, y - 20, 2.5, ['#ffe27a', css(this.acc2), '#ffffff']);
        this.o.fx.fireworks && this.o.fx.fireworks(4);
        this.banner('궁전 완성!', 'good', 1500);
        this.shake(350);
      }, 380);
      setTimeout(() => { if (!this.dead) this.win({ rows: this.rows() }); }, 1300);
    }
    rows() {
      const r = [];
      if (this.perfects) r.push([`퍼펙트 ×${this.perfects}`, this.perfects * this.p.perfectCoin]);
      if (this.maxCombo >= 2) r.push([`최대 콤보 ${this.maxCombo}`, this.maxCombo * this.p.comboCoin]);
      if (this.goldCoins) r.push(['황금층', this.goldCoins]);
      return r;
    }
    stars() {
      const n = Math.max(1, this.placed), pct = (this.perfects / n) * 100, s = this.p.star;
      return pct >= s[2] ? 3 : pct >= s[1] ? 2 : 1;
    }

    tool(id) {
      if (id !== 'slow' || this.state !== 'play') return;
      if (this.slowLeft > 0) { this.banner('이미 슬로우 중!', 'info', 800); return; }
      if (!this.pay(this.p.slowCost, '슬로우에')) return;
      this.slowLeft = this.p.slowN;
      S.slow();
      this.banner(`슬로우 ×${this.p.slowN}`, 'info', 900);
      this.o.onEvent('tool', { id: 'slow' });
      this.refresh();
    }

    resume() {
      this.running = true; this.paused = false;
      if (this.state === 'fall') {
        this.state = 'play'; this.grace = 1;
        this.banner('한 번 더!', 'good', 900);
        this.spawn();
      }
    }

    cheat() {
      this.placed = this.p.target; this.perfects = Math.max(this.perfects, this.placed);
      this.state = 'done';
      this.win({ rows: this.rows() });
    }

    refresh() {
      const p = this.p;
      this.meter(this.placed / p.target, `${this.placed} / ${p.target}층`, false);
      const slow = this.slowLeft > 0 ? `<span>🐢${this.slowLeft}</span>` : '';
      this.info(`<span>✨ ${this.perfects}</span>${slow}<span class="mg-combo">${this.combo >= 2 ? this.combo + ' 콤보' : ''}</span>`);
      if (this.combo >= 2) { const el = this.ui.info.querySelector('.mg-combo'); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
    }

    /* ---------- update ---------- */
    update(dt) {
      if (this.freeze > 0) { this.freeze -= dt; return; }
      this.clock += dt;
      const c = this.cur;
      if (!c && this.state === 'play' && this.spawnT != null) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) { this.spawnT = null; this.spawn(); }
      }
      if (c && this.state === 'play') {
        c.drop = Math.max(0, c.drop - dt * 4);
        if (c.kind === 'wind') this.windT += dt;
        c.off += this.speedNow() * c.dir * dt;
        if (c.off > RANGE) { c.off = RANGE - (c.off - RANGE); c.dir = -1; }
        else if (c.off < -RANGE) { c.off = -RANGE + (-RANGE - c.off); c.dir = 1; }
        this.setOff();
      }
      // wind sway
      const windy = c && c.kind === 'wind';
      this.sway += ((windy ? 1 : 0) - this.sway) * Math.min(1, dt * 2);
      // camera + landing bounce
      const goal = this.top().y + FH;
      this.camY += (goal - this.camY) * Math.min(1, dt * 3.5);
      this.bobV -= this.bob * 400 * dt; this.bobV *= Math.exp(-dt * 10); this.bob += this.bobV * dt;
      // falling pieces
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const q = this.pieces[i];
        q.vy -= 420 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.rot += q.vr * dt;
        if (this.k && this.sy(q.x, q.z, q.y) > this.H + 400) this.pieces.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].age += dt; if (this.rings[i].age > 0.7) this.rings.splice(i, 1); }
      if (this.roofT >= 0) this.roofT += dt;
      if (this.state === 'fall') { this.endT -= dt; if (this.endT <= 0) { this.state = 'lost'; this.lose('miss'); } }
      // drop sprites far below the camera to save memory
      for (let i = 0; i < this.floors.length - 40; i++) this.floors[i].spr = null;
    }

    /* ---------- draw ---------- */
    draw(t) {
      const g = this.ctx, W = this.W, H = this.H, k = this.k;
      if (!W || !k) return;
      g.clearRect(0, 0, W, H);
      g.save();
      util.rr(g, 1, 1, W - 2, H - 2, 22); g.clip();
      this.drawSky(g, t);
      this.drawGoal(g, t);
      this.drawPieces(g, false);
      // plinth
      const pl = this.plinthSprite();
      const px = this.sx(0, 0), py = this.sy(0, 0, -FH);
      if (py - pl.oy < H) g.drawImage(pl.cv, px - pl.ox, py - pl.oy, pl.w, pl.h);
      // floors
      const n = this.floors.length;
      const swayA = this.sway * 3.2 * Math.sin(this.clock * 3.1);
      for (let i = 0; i < n; i++) {
        const f = this.floors[i];
        const ty = this.sy(f.x, f.z, f.y + FH);
        if (ty - (f.w + f.d) * SI * k > H + 10) continue;
        if (ty + (FH + 120) * k < 0) continue;
        const sp = this.floorSprite(f, i);
        const sw = swayA * Math.max(0, 1 - (n - 1 - i) / 7);
        const age = this.clock - f.land;
        if (i === n - 1 && age < 0.35 && i > 0) {
          // landing squash
          const a = age / 0.35, sq = 1 - 0.12 * Math.sin(a * Math.PI) * (1 - a);
          const tx = this.sx(f.x, f.z) + sw;
          g.save(); g.translate(tx, ty + FH * k); g.scale(2 - sq, sq); g.drawImage(sp.cv, -sp.ox, -sp.oy - FH * k, sp.w, sp.h); g.restore();
        } else g.drawImage(sp.cv, this.sx(f.x, f.z) + sw - sp.ox, ty - sp.oy, sp.w, sp.h);
      }
      // guide ghost: where the floor should land
      const c = this.cur, tp = this.top();
      if (c && this.state === 'play') {
        const pb = this.probe(), inTol = Math.abs(pb.delta) <= this.p.tol;
        if (this.p.guide) this.drawGhost(g, tp, c.y + FH, inTol, t);
        const ox = this.sx(c.x, c.z) + swayA, oy = this.sy(c.x, c.z, c.y + FH) - c.drop * c.drop * 60 * k;
        g.globalAlpha = 1 - c.drop * 0.8;
        drawBox(g, c.w, c.d, FH, k, c.pal, c.style, ox, oy, this.p.guide && inTol ? 0.9 : 0.25 + 0.15 * Math.sin(t * 6));
        g.globalAlpha = 1;
        if (this.p.guide && this.placed < 3) {
          g.font = `900 ${Math.round(15 + 3 * k)}px "Black Han Sans", sans-serif`;
          g.textAlign = 'center';
          g.fillStyle = `rgba(255,255,255,${0.65 + 0.35 * Math.sin(t * 6)})`;
          g.fillText(inTol ? '지금 탭!' : '딱 맞을 때 탭!', W / 2, Math.min(H - 16, this.sy(0, 0, -FH) + 120 * k));
        }
      }
      if (this.roofT >= 0) {
        const a = U.clamp(this.roofT / 0.4, 0, 1);
        const drop = (1 - U.easeOutBack(a, 1.6)) * 120 * k;
        g.globalAlpha = a < 0.05 ? 0 : 1;
        drawRoof(g, tp.w, tp.d, k, this.sx(tp.x, tp.z), this.sy(tp.x, tp.z, tp.y + FH) - drop, t);
        g.globalAlpha = 1;
      }
      this.drawPieces(g, true);
      this.drawRings(g);
      if (this.sway > 0.02) this.drawWind(g, t);
      if (this.slowLeft > 0) {
        g.fillStyle = 'rgba(120,200,255,0.10)'; g.fillRect(0, 0, W, H);
      }
      g.restore();
      // glass rim
      g.strokeStyle = css(this.acc, 0.55); g.lineWidth = 2;
      util.rr(g, 1, 1, W - 2, H - 2, 22); g.stroke();
    }

    drawSky(g, t) {
      const W = this.W, H = this.H, k = this.k;
      const hf = U.clamp(this.camY / (Math.max(24, this.p.target) * FH), 0, 1.15);
      const lowTop = mix([40, 24, 96], this.acc, 0.25), lowBot = mix([255, 150, 170], this.acc, 0.35);
      const midTop = [14, 14, 60], midBot = mix([70, 50, 150], this.acc2, 0.35);
      const hiTop = [2, 2, 14], hiBot = [26, 14, 70];
      const u = Math.min(1, hf);
      const top = u < 0.5 ? mix(lowTop, midTop, u * 2) : mix(midTop, hiTop, (u - 0.5) * 2);
      const bot = u < 0.5 ? mix(lowBot, midBot, u * 2) : mix(midBot, hiBot, (u - 0.5) * 2);
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, css(top, 0.86)); gr.addColorStop(1, css(bot, 0.8));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // stars fade in with height
      const sa = U.clamp((hf - 0.25) / 0.5, 0, 1);
      if (sa > 0) {
        g.fillStyle = '#fff';
        for (const s of this.starsBg) {
          const a = sa * (0.45 + 0.55 * Math.sin(t * 2 + s.ph));
          if (a <= 0.03) continue;
          g.globalAlpha = a;
          const y = ((s.y * H + this.camY * k * 0.08) % H);
          g.fillRect(s.x * W, y, s.r, s.r);
        }
        g.globalAlpha = 1;
      }
      // moon glow up high
      if (hf > 0.5) {
        const a = U.clamp((hf - 0.5) * 2, 0, 1), mx = W * 0.82, my = H * 0.16, r = 22 * Math.max(0.8, k * 0.7);
        const mg = g.createRadialGradient(mx, my, r * 0.4, mx, my, r * 3);
        mg.addColorStop(0, `rgba(255,250,220,${0.5 * a})`); mg.addColorStop(1, 'rgba(255,250,220,0)');
        g.fillStyle = mg; g.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);
        g.fillStyle = `rgba(255,248,215,${a})`; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
      }
      // clouds (parallax)
      const cs = this.cloudSprite();
      const ca = U.clamp(1.15 - hf * 0.9, 0.2, 1);
      for (const cl of this.clouds) {
        const y = this.Y0 - (cl.wy - this.camY) * k * 0.55;
        const w = cs.w * cl.s * Math.max(0.9, k * 0.8), h = cs.h * cl.s * Math.max(0.9, k * 0.8);
        if (y < -h || y > H + h) continue;
        cl.x += cl.v * 0.016;
        if (cl.x > 1.25) cl.x = -0.25; else if (cl.x < -0.25) cl.x = 1.25;
        g.globalAlpha = cl.a * ca;
        g.drawImage(cs.cv, cl.x * W - w / 2, y - h / 2, w, h);
      }
      g.globalAlpha = 1;
    }

    drawGoal(g, t) {
      const y = this.sy(0, 0, this.p.target * FH);
      if (y < -20 || y > this.H + 20 || this.state === 'done') return;
      const k = this.k;
      g.save();
      g.strokeStyle = `rgba(255,220,110,${0.55 + 0.25 * Math.sin(t * 4)})`; g.lineWidth = 2; g.setLineDash([8, 8]); g.lineDashOffset = -t * 30;
      g.beginPath(); g.moveTo(10, y); g.lineTo(this.W - 10, y); g.stroke();
      g.setLineDash([]);
      const label = `🏁 목표 ${this.p.target}층`;
      g.font = `900 ${Math.round(12 + 2 * k)}px "Noto Sans KR", sans-serif`;
      const tw = g.measureText(label).width + 18, bx = this.W - tw - 12, bh = 22 + k * 2;
      g.fillStyle = 'rgba(40,20,0,0.75)'; util.rr(g, bx, y - bh / 2, tw, bh, bh / 2); g.fill();
      g.strokeStyle = '#ffd86b'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ffe9a0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, bx + tw / 2, y + 1);
      g.restore();
    }

    drawGhost(g, tp, y, hot, t) {
      const k = this.k, c = CO * k, s = SI * k;
      const ox = this.sx(tp.x, tp.z), oy = this.sy(tp.x, tp.z, y), w = tp.w, d = tp.d;
      g.save();
      g.setLineDash([6, 5]); g.lineDashOffset = -t * 20;
      g.strokeStyle = hot ? 'rgba(255,250,190,0.95)' : `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 5)})`;
      g.lineWidth = hot ? 3 : 2;
      facePath(g, ox + (-w / 2 + d / 2) * c, oy + (-w / 2 - d / 2) * s, ox + (w / 2 + d / 2) * c, oy + (w / 2 - d / 2) * s,
        ox + (w / 2 - d / 2) * c, oy + (w / 2 + d / 2) * s, ox + (-w / 2 - d / 2) * c, oy + (-w / 2 + d / 2) * s);
      g.stroke();
      g.restore();
    }

    drawPieces(g, front) {
      const k = this.k;
      for (const q of this.pieces) {
        if (q.front !== front) continue;
        const ox = this.sx(q.x, q.z), oy = this.sy(q.x, q.z, q.y + FH);
        if (oy > this.H + 200) continue;
        g.save(); g.translate(ox, oy + FH * k / 2); g.rotate(q.rot * 0.35);
        drawBox(g, q.w, q.d, FH, k, q.pal, q.style, 0, -FH * k / 2);
        g.restore();
      }
    }

    drawRings(g) {
      const k = this.k, c = CO * k, s = SI * k;
      for (const r of this.rings) {
        if (r.age < 0) continue;
        const a = r.age / 0.7, sc = 1 + a * 0.9;
        const ox = this.sx(r.x, r.z), oy = this.sy(r.x, r.z, r.y), w = r.w * sc, d = r.d * sc;
        g.save();
        g.globalAlpha = (1 - a) * 0.95;
        g.strokeStyle = '#fffbe0'; g.lineWidth = (5 - a * 4) * Math.max(0.8, k * 0.6); g.shadowColor = '#ffe680'; g.shadowBlur = 12;
        facePath(g, ox + (-w / 2 + d / 2) * c, oy + (-w / 2 - d / 2) * s, ox + (w / 2 + d / 2) * c, oy + (w / 2 - d / 2) * s,
          ox + (w / 2 - d / 2) * c, oy + (w / 2 + d / 2) * s, ox + (-w / 2 - d / 2) * c, oy + (-w / 2 + d / 2) * s);
        g.stroke(); g.restore();
      }
    }

    drawWind(g, t) {
      const W = this.W, H = this.H;
      g.save(); g.strokeStyle = 'rgba(200,245,255,0.5)'; g.lineCap = 'round'; g.lineWidth = 2;
      g.globalAlpha = this.sway;
      g.beginPath();
      for (const s of this.streaks) {
        const x = ((s.x + t * s.v * 0.5) % 1.3 - 0.15) * W, y = s.y * H + Math.sin(t * 3 + s.x * 9) * 8;
        g.moveTo(x, y); g.lineTo(x + s.l * W, y);
      }
      g.stroke(); g.restore();
    }

    destroy() { removeEventListener('keydown', this.onKey); super.destroy(); }
  }

  root.QuestGames.stack = Stack;
})(window);
