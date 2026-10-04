/* Symbol art engine: draws every symbol procedurally at any size.
   Kinds: emoji (premium aura), royal letters (metallic), cut gems, glossy orbs,
   classic BAR / 7, wild & scatter badges, jackpot coins, multiplier orbs. */
(function (root) {
  const U = root.U;
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  const ROYAL = { '9': '#ff8a3d', '10': '#3ab0ff', J: '#2fe08a', Q: '#c264ff', K: '#ff4d63', A: '#ffc93c', '7': '#ff2337' };
  const RIMS = {
    gold: ['#fff7d1', '#e7b53a', '#8a5c00', '#ffe490'],
    silver: ['#ffffff', '#b8c4d0', '#5c6a78', '#e8eef5'],
    neon: ['#ffffff', '#ff7ae6', '#7a00ff', '#7af6ff'],
    stone: ['#e6dcc4', '#9b8a6a', '#4a3f2c', '#cbbd9c'],
    ice: ['#ffffff', '#a8e4ff', '#3a7bbf', '#e9f8ff'],
    rose: ['#fff0f6', '#ff9cc7', '#a8325f', '#ffd6e8'],
    jade: ['#eaffef', '#79d68f', '#1f6b38', '#c8f5d2'],
    copper: ['#ffe2c4', '#d4874a', '#6b3510', '#ffc79a'],
  };

  function parse(e) {
    if (e[0] === '@') return { kind: e.startsWith('@BAR') ? 'bar' : 'royal', v: e.slice(1) };
    if (e.startsWith('gem:')) { const [, c, sh] = e.split(':'); return { kind: 'gem', c, sh: sh || 'round' }; }
    if (e.startsWith('orb:')) return { kind: 'orb', c: e.slice(4) };
    return { kind: 'emoji', v: e };
  }

  function grad(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    return gr;
  }
  function aura(g, cx, cy, r, col, a) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, U.rgba(col, a));
    gr.addColorStop(0.45, U.rgba(col, a * 0.45));
    gr.addColorStop(1, U.rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  function star4(g, x, y, r, a) {
    g.save();
    g.globalAlpha *= a == null ? 1 : a;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 0.6);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.6, 0, 6.283); g.fill();
    g.restore();
  }
  let tmp = null;
  function tmpCanvas(w, h) {
    if (!tmp) tmp = document.createElement('canvas');
    if (tmp.width < w || tmp.height < h) { tmp.width = Math.max(tmp.width, w); tmp.height = Math.max(tmp.height, h); }
    const t = tmp.getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.clearRect(0, 0, tmp.width, tmp.height);
    return t;
  }

  /* ---------- primitives ---------- */
  function emoji(g, e, cx, cy, size, shadow) {
    g.save();
    g.font = `${size}px ${EMOJI}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (shadow !== false) { g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = size * 0.12; g.shadowOffsetY = size * 0.06; }
    g.fillText(e, cx, cy + size * 0.05);
    g.restore();
  }

  function royal(g, L, cx, cy, size, col, th) {
    const font = th.royalFont || 'Bungee';
    const fs = size * (L.length > 1 ? 0.74 : 0.95);
    const rim = RIMS[th.rim || 'gold'];
    g.save();
    g.font = `900 ${fs}px '${font}', 'Arial Black', sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const y = cy + fs * 0.04;
    // shadow + dark outline
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size * 0.14; g.shadowOffsetY = size * 0.07;
    g.strokeStyle = U.shade(col, -0.82); g.lineWidth = size * 0.17;
    g.strokeText(L, cx, y);
    g.shadowColor = 'transparent';
    // metallic rim
    g.strokeStyle = grad(g, 0, y - fs / 2, 0, y + fs / 2, [rim[0], [0.35, rim[1]], [0.7, rim[2]], rim[3]]);
    g.lineWidth = size * 0.085;
    g.strokeText(L, cx, y);
    // body
    g.fillStyle = grad(g, 0, y - fs / 2, 0, y + fs / 2, [U.shade(col, 0.72), [0.38, U.shade(col, 0.15)], [0.55, col], U.shade(col, -0.5)]);
    g.fillText(L, cx, y);
    g.restore();
    // gloss on upper half (masked to the glyph)
    const dpr = g.getTransform().a || 1;
    const W = Math.ceil(size * 2 * dpr), H = Math.ceil(size * 1.4 * dpr);
    const t = tmpCanvas(W, H);
    t.scale(dpr, dpr);
    t.font = g.font = `900 ${fs}px '${font}', 'Arial Black', sans-serif`;
    t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillStyle = '#fff';
    t.fillText(L, size, size * 0.7 + fs * 0.04);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = grad(t, 0, size * 0.7 - fs * 0.5, 0, size * 0.7, ['rgba(255,255,255,0.75)', [0.5, 'rgba(255,255,255,0.25)'], 'rgba(255,255,255,0)']);
    t.fillRect(0, 0, size * 2, size * 1.4);
    g.drawImage(tmp, 0, 0, W, H, cx - size, cy - size * 0.7, size * 2, size * 1.4);
    star4(g, cx + fs * 0.32, cy - fs * 0.38, size * 0.09, 0.9);
  }

  function bar(g, n, cx, cy, size) {
    const w = size * 0.95, h = Math.min(size * 0.28, (size * 0.9) / n - size * 0.04);
    const gap = size * 0.05;
    const total = n * h + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const y = cy - total / 2 + i * (h + gap);
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = size * 0.08; g.shadowOffsetY = size * 0.03;
      rr(g, cx - w / 2, y, w, h, h * 0.25);
      g.fillStyle = grad(g, 0, y, 0, y + h, ['#3b3b44', '#0c0c10']);
      g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = grad(g, 0, y, 0, y + h, RIMS.gold); g.lineWidth = size * 0.035; g.stroke();
      g.font = `900 ${h * 0.72}px 'Bungee', 'Arial Black', sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = grad(g, 0, y, 0, y + h, ['#ffffff', '#c9d4e0']);
      g.fillText('BAR', cx, y + h * 0.55, w * 0.85);
      g.restore();
    }
  }

  const SHAPES = {
    round: () => poly(10, 1, 1, -Math.PI / 2),
    hex: () => poly(6, 0.95, 1, -Math.PI / 2),
    tri: () => [[0, -1], [0.95, 0.75], [-0.95, 0.75]],
    square: () => [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]],
    emerald: () => [[-0.55, -0.9], [0.55, -0.9], [0.85, -0.6], [0.85, 0.6], [0.55, 0.9], [-0.55, 0.9], [-0.85, 0.6], [-0.85, -0.6]],
    oval: () => poly(12, 0.75, 1, -Math.PI / 2),
    marquise: () => [[0, -1], [0.5, -0.55], [0.62, 0], [0.5, 0.55], [0, 1], [-0.5, 0.55], [-0.62, 0], [-0.5, -0.55]],
    heart: () => [[0, -0.45], [0.35, -0.9], [0.85, -0.75], [0.95, -0.2], [0.55, 0.4], [0, 0.95], [-0.55, 0.4], [-0.95, -0.2], [-0.85, -0.75], [-0.35, -0.9]],
    diamond: () => [[0, -1], [0.85, 0], [0, 1], [-0.85, 0]],
  };
  function poly(n, sx, sy, a0) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; p.push([Math.cos(a) * sx, Math.sin(a) * sy]); }
    return p;
  }
  function gem(g, shape, col, cx, cy, size) {
    const r = size * 0.46;
    const P = (SHAPES[shape] || SHAPES.round)().map(([x, y]) => [cx + x * r, cy + y * r]);
    const T = P.map(([x, y]) => [cx + (x - cx) * 0.52, cy - r * 0.06 + (y - cy) * 0.52]);
    aura(g, cx, cy, size * 0.62, col, 0.55);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = size * 0.12; g.shadowOffsetY = size * 0.06;
    g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = U.shade(col, -0.4); g.fill();
    g.restore();
    const L = [-0.55, -0.83];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], c = T[(i + 1) % P.length], d = T[i];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      const ln = Math.hypot(mx, my) || 1;
      const lit = (mx / ln) * L[0] + (my / ln) * L[1];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
      g.fillStyle = U.shade(col, lit * 0.62 + (i % 2 ? -0.08 : 0.06));
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(0.6, size * 0.008); g.stroke();
    }
    g.beginPath(); T.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    const tg = g.createLinearGradient(cx - r * 0.5, cy - r * 0.6, cx + r * 0.5, cy + r * 0.5);
    tg.addColorStop(0, U.shade(col, 0.75)); tg.addColorStop(0.45, U.shade(col, 0.25)); tg.addColorStop(1, U.shade(col, -0.2));
    g.fillStyle = tg; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(0.8, size * 0.012); g.stroke();
    g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.strokeStyle = U.shade(col, -0.7); g.lineWidth = Math.max(1, size * 0.025); g.stroke();
    // specular
    g.save();
    g.globalAlpha = 0.55;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.22, r * 0.09, -0.6, 0, 6.283); g.fill();
    g.restore();
    star4(g, cx + r * 0.42, cy - r * 0.5, size * 0.1, 1);
  }

  function orb(g, col, cx, cy, size) {
    const r = size * 0.44;
    const rainbow = col === 'rainbow';
    const base = rainbow ? '#ff4fd8' : col;
    aura(g, cx, cy, size * 0.62, base, 0.5);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = size * 0.1; g.shadowOffsetY = size * 0.05;
    g.beginPath(); g.arc(cx, cy, r, 0, 6.283);
    if (rainbow) {
      const lg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ['#ff3b5c', '#ffb020', '#ffe24d', '#2ee06a', '#3aa0ff', '#b45bff'].forEach((c, i) => lg.addColorStop(i / 5, c));
      g.fillStyle = lg;
    } else {
      const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
      gr.addColorStop(0, U.shade(col, 0.75)); gr.addColorStop(0.5, col); gr.addColorStop(1, U.shade(col, -0.65));
      g.fillStyle = gr;
    }
    g.fill();
    g.restore();
    if (rainbow) {
      const sh = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      sh.addColorStop(0, 'rgba(255,255,255,0.5)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
    }
    // rim light
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = r * 0.06;
    g.beginPath(); g.arc(cx, cy, r * 0.9, 0.3, 1.9); g.stroke();
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.ellipse(cx - r * 0.33, cy - r * 0.45, r * 0.32, r * 0.17, -0.55, 0, 6.283); g.fill();
    g.globalAlpha = 0.9;
    g.beginPath(); g.arc(cx + r * 0.35, cy + r * 0.35, r * 0.07, 0, 6.283); g.fill();
    g.restore();
  }

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function banner(g, text, cx, cy, w, h, col, th) {
    const x0 = cx - w / 2, x1 = cx + w / 2, k = h * 0.42;
    const path = () => {
      g.beginPath();
      g.moveTo(x0 + k, cy - h / 2); g.lineTo(x1 - k, cy - h / 2); g.lineTo(x1, cy); g.lineTo(x1 - k, cy + h / 2);
      g.lineTo(x0 + k, cy + h / 2); g.lineTo(x0, cy); g.closePath();
    };
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = h * 0.4; g.shadowOffsetY = h * 0.12;
    path();
    g.fillStyle = grad(g, 0, cy - h / 2, 0, cy + h / 2, [U.shade(col, 0.45), [0.5, col], U.shade(col, -0.55)]);
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = grad(g, 0, cy - h / 2, 0, cy + h / 2, RIMS[th.rim || 'gold']);
    g.lineWidth = Math.max(1.5, h * 0.11); g.stroke();
    g.font = `900 ${h * 0.64}px '${th.labelFont || 'Bungee'}', 'Arial Black', sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = h * 0.16;
    g.strokeText(text, cx, cy + h * 0.05, w - k * 2);
    g.fillStyle = grad(g, 0, cy - h * 0.3, 0, cy + h * 0.3, ['#ffffff', '#fff3c4', '#ffd25e']);
    g.fillText(text, cx, cy + h * 0.05, w - k * 2);
    g.restore();
  }

  function coin(g, cx, cy, size, emblem, label) {
    const r = size * 0.44;
    const tint = { MINI: '#3ddc84', MINOR: '#3ab0ff', MAJOR: '#c264ff' }[label];
    aura(g, cx, cy, size * 0.62, tint || '#ffcc33', 0.6);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.1; g.shadowOffsetY = size * 0.05;
    g.beginPath(); g.arc(cx, cy, r, 0, 6.283);
    g.fillStyle = grad(g, cx - r, cy - r, cx + r, cy + r, ['#fff6c8', '#ffcc33', '#b8860b', '#ffe27a']);
    g.fill();
    g.restore();
    g.beginPath(); g.arc(cx, cy, r * 0.8, 0, 6.283);
    const ig = g.createRadialGradient(cx - r * 0.2, cy - r * 0.3, r * 0.1, cx, cy, r * 0.8);
    ig.addColorStop(0, tint ? U.shade(tint, 0.4) : '#ffe9a0');
    ig.addColorStop(1, tint ? U.shade(tint, -0.45) : '#c48a00');
    g.fillStyle = ig; g.fill();
    g.strokeStyle = 'rgba(120,70,0,0.8)'; g.lineWidth = r * 0.05; g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.283;
      g.fillStyle = 'rgba(255,240,180,0.7)';
      g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, r * 0.025, 0, 6.283); g.fill();
    }
    if (emblem) { g.save(); g.globalAlpha = 0.5; emoji(g, emblem, cx, cy - r * 0.05, r * 0.95, false); g.restore(); }
    g.save();
    g.globalAlpha = 0.6; g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.3, r * 0.12, -0.6, 0, 6.283); g.fill();
    g.restore();
  }

  /* ---------- symbol ---------- */
  function tierColor(m, s) {
    const sym = m.symbols[s];
    const th = m.theme;
    const k = parse(sym.e);
    if (sym.type === 'wild') return th.accent;
    if (sym.type === 'scatter') return th.accent2;
    if (sym.type === 'coin' || sym.type === 'bonus') return '#ffcc33';
    if (sym.type === 'bomb') return '#c264ff';
    if (k.kind === 'royal') return ROYAL[k.v] || th.accent;
    if (k.kind === 'gem' || k.kind === 'orb') return k.c === 'rainbow' ? '#ff4fd8' : k.c;
    const t = th.tiers || [];
    return t[sym.tier % (t.length || 1)] || th.accent;
  }

  function drawCore(g, m, s, cx, cy, size) {
    const sym = m.symbols[s];
    const th = m.theme;
    const k = parse(sym.e);
    const col = tierColor(m, s);
    switch (k.kind) {
      case 'royal': royal(g, k.v, cx, cy, size * 0.78, col, th); break;
      case 'bar': bar(g, +k.v.slice(3) || 1, cx, cy, size * 0.82); break;
      case 'gem': gem(g, k.sh, k.c, cx, cy, size * 0.95); break;
      case 'orb': orb(g, k.c, cx, cy, size * 0.95); break;
      default:
        if (th.symAura !== false) aura(g, cx, cy, size * 0.58, col, sym.tier >= m.normalCount - 3 ? 0.55 : 0.35);
        emoji(g, k.v, cx, cy, size * 0.66);
    }
  }

  const Art = {
    parse, tierColor, RIMS,
    draw(g, m, s, w, h) {
      const sym = m.symbols[s];
      const th = m.theme;
      const size = Math.min(w, h);
      const cx = w / 2, cy = h / 2;
      if (sym.type === 'wild' || sym.type === 'scatter' || sym.type === 'bonus') {
        const col = sym.type === 'wild' ? th.accent : sym.type === 'scatter' ? th.accent2 : '#ffb000';
        const label = sym.type === 'wild' ? 'WILD' : sym.type === 'bonus' ? 'BONUS' : (th.scatterLabel || (m.mech === 'cluster' || m.mech === 'scatter' ? 'FREE' : 'SCATTER'));
        aura(g, cx, cy - size * 0.06, size * 0.62, col, 0.75);
        const k = parse(sym.e);
        if (k.kind === 'emoji') emoji(g, k.v, cx, cy - size * 0.1, size * 0.58);
        else drawCore(g, m, s, cx, cy - size * 0.1, size * 0.8);
        const bh = Math.max(10, size * 0.24);
        banner(g, label, cx, cy + size * 0.3, Math.min(w * 0.98, size * 1.02), bh, col, th);
        return;
      }
      if (sym.type === 'coin') { coin(g, cx, cy, size * 0.96, sym.e, null); return; }
      if (sym.type === 'bomb') { orb(g, '#b14aff', cx, cy, size * 0.92); emoji(g, sym.e, cx, cy, size * 0.4, false); return; }
      drawCore(g, m, s, cx, cy, size);
    },
    coin,
    // tall expanding-wild art for a whole reel
    tallWild(g, m, w, h) {
      const th = m.theme;
      const sym = m.symbols[m.wildIdx];
      const ag = g.createLinearGradient(0, 0, 0, h);
      ag.addColorStop(0, U.rgba(th.accent, 0.15)); ag.addColorStop(0.5, U.rgba(th.accent, 0.5)); ag.addColorStop(1, U.rgba(th.accent, 0.15));
      rr(g, w * 0.05, h * 0.01, w * 0.9, h * 0.98, w * 0.16);
      g.fillStyle = ag; g.fill();
      g.strokeStyle = grad(g, 0, 0, 0, h, RIMS[th.rim || 'gold']); g.lineWidth = Math.max(2, w * 0.03); g.stroke();
      aura(g, w / 2, h * 0.42, Math.max(w, h * 0.5) * 0.7, th.accent, 0.8);
      const k = parse(sym.e);
      if (k.kind === 'emoji') emoji(g, k.v, w / 2, h * 0.42, Math.min(w * 0.85, h * 0.4));
      else drawCore(g, m, m.wildIdx, w / 2, h * 0.42, Math.min(w * 1.1, h * 0.45));
      banner(g, 'WILD', w / 2, h * 0.78, w * 0.95, Math.max(14, Math.min(w * 0.3, h * 0.09)), th.accent, th);
      for (let i = 0; i < 6; i++) star4(g, w * (0.15 + Math.random() * 0.7), h * (0.1 + Math.random() * 0.8), w * 0.05, 0.8);
    },
    icon(m, s, px) {
      const c = document.createElement('canvas');
      c.width = c.height = px * 2;
      const g = c.getContext('2d');
      g.scale(2, 2);
      Art.draw(g, m, s, px, px);
      return c.toDataURL();
    },
    // lobby poster
    poster(m, W, H) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const th = m.theme;
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, th.bg[0]); bg.addColorStop(0.55, th.bg[1]); bg.addColorStop(1, th.bg[0]);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // rays
      g.save();
      g.translate(W / 2, H * 0.4);
      for (let i = 0; i < 18; i++) {
        g.rotate((Math.PI * 2) / 18);
        const rg = g.createLinearGradient(0, 0, H, 0);
        rg.addColorStop(0, U.rgba(th.accent2, 0.22)); rg.addColorStop(1, U.rgba(th.accent2, 0));
        g.fillStyle = rg;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(H, -H * 0.07); g.lineTo(H, H * 0.07); g.closePath(); g.fill();
      }
      g.restore();
      aura(g, W / 2, H * 0.4, W * 0.7, th.accent, 0.55);
      const rnd = U.mulberry32(U.hashStr(m.id));
      for (let i = 0; i < 22; i++) {
        const x = rnd() * W, y = rnd() * H * 0.8, r = 3 + rnd() * 16;
        g.fillStyle = U.rgba(rnd() < 0.5 ? th.accent : th.accent2, 0.08 + rnd() * 0.15);
        g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      }
      const top = m.normalCount - 1;
      const side = [top - 1, top - 2];
      const S = W * 0.4;
      g.save(); g.translate(W * 0.02, H * 0.36); g.rotate(-0.2); g.globalAlpha = 0.9; Art.draw(g, m, side[0], S, S); g.restore();
      g.save(); g.translate(W * 0.98 - S, H * 0.34); g.rotate(0.2); g.globalAlpha = 0.9; Art.draw(g, m, side[1], S, S); g.restore();
      g.save(); g.translate(W / 2 - W * 0.34, H * 0.08); Art.draw(g, m, top, W * 0.68, W * 0.68); g.restore();
      for (let i = 0; i < 7; i++) star4(g, rnd() * W, rnd() * H * 0.7, 4 + rnd() * 8, 0.9);
      const fade = g.createLinearGradient(0, H * 0.58, 0, H);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = fade; g.fillRect(0, H * 0.58, W, H * 0.42);
      // logo
      const lg = th.logo || ['#ffffff', th.accent, U.shade(th.accent, -0.4)];
      let fs = W * 0.15;
      g.font = `900 ${fs}px '${th.font}', 'Bungee', sans-serif`;
      const words = m.en.split(' ');
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && g.measureText(m.en).width > W * 0.88 ? words : [m.en];
      const maxW = Math.max(...lines.map((l) => g.measureText(l).width));
      if (maxW > W * 0.88) fs *= (W * 0.88) / maxW;
      g.font = `900 ${fs}px '${th.font}', 'Bungee', sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      lines.forEach((l, i) => {
        const y = H * 0.8 + (i - (lines.length - 1) / 2) * fs * 1.02;
        g.shadowColor = th.accent; g.shadowBlur = fs * 0.5;
        g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = fs * 0.16; g.strokeText(l, W / 2, y);
        g.shadowBlur = 0;
        g.fillStyle = grad(g, 0, y - fs / 2, 0, y + fs / 2, [lg[0], [0.55, lg[1]], lg[2]]);
        g.fillText(l, W / 2, y);
      });
      return c.toDataURL('image/jpeg', 0.88);
    },
  };

  root.SlotArt = Art;
})(window);
