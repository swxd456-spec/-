/* 틀린그림찾기 (spot the difference). Scenes are generated from a seed: layered procedural
   backgrounds + illustrated props. The mirror copy changes N props (remove / recolour / swap /
   flip / resize / move / add). Custom image pairs from config.txt are also supported. */
(function (root) {
  const U = root.U, Art = root.SlotArt, A = root.SlotAudio;

  const SCENES = {
    meadow: { sky: ['#5ec8ff', '#bdeaff'], props: ['🐄', '🐑', '🐰', '🦋', '🐝', '🌷', '🌻', '🌼', '🐞', '🐿️', '🦆', '🐓', '🍎', '🧺', '🪁', '🐕'], shapes: ['tree', 'tree', 'house', 'cloud', 'cloud', 'fence', 'flowerbed'] },
    beach: { sky: ['#3fb7ff', '#ffe6b0'], props: ['🦀', '🐚', '⭐', '⛵', '🏖️', '⛱️', '🐬', '🕊️', '🍉', '🏐', '🩴', '🦩', '🐢', '🍹', '🪣', '🌊'], shapes: ['palm', 'palm', 'cloud', 'boat', 'umbrella'] },
    city: { sky: ['#0b1030', '#3a2a6a'], props: ['🚗', '🚕', '🚌', '🐈', '🛵', '🚲', '🎈', '🌙', '🦉', '🚦', '🎸', '🍕', '☕', '🎁', '🚓', '🛴'], shapes: ['building', 'building', 'building', 'lamp', 'lamp', 'star'] },
    snow: { sky: ['#9fc8ff', '#f0f7ff'], props: ['⛄', '🦌', '🎄', '🐧', '🦊', '🛷', '🧣', '🎁', '🐻‍❄️', '❄️', '🔔', '🍪', '🧤', '🐇', '🦉', '🕯️'], shapes: ['pine', 'pine', 'pine', 'cabin', 'cloud'] },
    sea: { sky: ['#0a5d8a', '#0b2a4a'], props: ['🐠', '🐟', '🐡', '🐙', '🦀', '🐚', '🦑', '🐢', '🐳', '🦈', '🪸', '⭐', '🦞', '🐬', '💎', '🧜‍♀️'], shapes: ['weed', 'weed', 'weed', 'coral', 'coral', 'bubbles'] },
    space: { sky: ['#05021a', '#1a0b3a'], props: ['🚀', '🛸', '👽', '🛰️', '☄️', '🌍', '⭐', '🌙', '👾', '🔭', '🪐', '🌟', '🤖', '🧑‍🚀', '💫', '🌠'], shapes: ['planet', 'planet', 'planet', 'star', 'star'] },
    candy: { sky: ['#ffb3e0', '#fff0c4'], props: ['🍭', '🍬', '🍩', '🧁', '🍰', '🍪', '🍫', '🍓', '🍒', '🦄', '🎂', '🍦', '🧸', '🎀', '🍮', '🍡'], shapes: ['lolly', 'lolly', 'lolly', 'cloud', 'cloud'] },
    desert: { sky: ['#ff9a3c', '#ffe3a8'], props: ['🐫', '🌵', '🦂', '🐍', '🏺', '💰', '🦅', '🐪', '🌞', '🗿', '🦎', '🪨', '🐆', '🔑', '💎', '📜'], shapes: ['pyramid', 'pyramid', 'palm', 'cactus', 'cactus'] },
    forest: { sky: ['#1b4a2c', '#86c46a'], props: ['🍄', '🦊', '🦉', '🐿️', '🦔', '🐸', '🦌', '🐻', '🌰', '🐌', '🦋', '🧚', '🐞', '🍓', '🪵', '🐇'], shapes: ['tree', 'tree', 'pine', 'pine', 'tree', 'flowerbed'] },
    room: { sky: ['#f4e3c8', '#e6c9a0'], props: ['📚', '🪴', '🕰️', '🧸', '⚽', '🎸', '☕', '💡', '🎮', '🧦', '🎧', '🪀', '🍎', '🖍️', '📷', '🐱'], shapes: ['window', 'shelf', 'shelf', 'frame', 'rug'] },
  };
  // hall theme -> preferred scene
  const BY_MACHINE = {
    'neon-nights': 'city', 'classic-777': 'room', pharaoh: 'desert', 'dragon-fortune': 'forest', 'sweet-candy': 'candy', 'ocean-deep': 'sea',
    'galaxy-ways': 'space', 'viking-raid': 'snow', 'sakura-dream': 'meadow', 'wild-west': 'desert', 'jungle-gems': 'forest', 'hot-chilli': 'desert',
    'ice-queen': 'snow', 'pirate-gold': 'beach', 'fairy-forest': 'forest', 'monster-party': 'city', 'gold-rush': 'desert', 'lucky-clover': 'meadow',
    'cyber-matrix': 'space', 'diamond-deluxe': 'room', olympus: 'meadow', 'aztec-gold': 'forest', 'disco-fever': 'city', 'bubble-pop': 'sea',
    'royal-casino': 'room', 'panda-bamboo': 'forest', 'jurassic-jackpot': 'forest', 'retro-arcade': 'room', 'santa-gifts': 'snow', 'volcano-rush': 'desert',
  };
  const PALETTE = ['#ff4d6d', '#ffb703', '#3a86ff', '#8338ec', '#06d6a0', '#fb5607', '#ff006e', '#2ec4b6', '#e9c46a', '#9b5de5'];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- scene generation ---------- */
  function makeScene(kind, seed, nObjects) {
    const rnd = U.mulberry32(seed);
    const S = SCENES[kind];
    const items = [];
    const ground = kind === 'space' || kind === 'sea' ? 1 : kind === 'room' ? 0.62 : 0.58;
    // shapes first (background props)
    const nShapes = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < nShapes; i++) {
      const t = S.shapes[Math.floor(rnd() * S.shapes.length)];
      const sky = t === 'cloud' || t === 'planet' || t === 'star' || t === 'window' || t === 'frame';
      const it = {
        id: items.length, k: 'shape', t, x: 0.08 + rnd() * 0.84,
        y: sky ? 0.08 + rnd() * (ground - 0.2) : ground + 0.02 + rnd() * (0.95 - ground - 0.08),
        s: sky ? 0.12 + rnd() * 0.1 : 0.16 + rnd() * 0.14, c: PALETTE[Math.floor(rnd() * PALETTE.length)], v: Math.floor(rnd() * 1000), flip: rnd() < 0.5,
      };
      if (t === 'building') { it.y = ground + 0.02; it.s = 0.18 + rnd() * 0.12; }
      if (t === 'shelf') { it.y = 0.18 + rnd() * 0.3; }
      if (t === 'rug') { it.y = 0.82; it.s = 0.3; }
      if (kind === 'space' || kind === 'sea') it.y = 0.1 + rnd() * 0.85;
      if (t === 'weed' || t === 'coral') it.y = 0.82 + rnd() * 0.12;
      items.push(it);
    }
    // illustrated props on a loose grid so they rarely overlap
    const cols = Math.ceil(Math.sqrt(nObjects * 1.6)), rows = Math.ceil(nObjects / cols);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
    cells.sort(() => rnd() - 0.5);
    const top = kind === 'space' || kind === 'sea' ? 0.08 : kind === 'room' ? 0.12 : ground - 0.1;
    for (let i = 0; i < nObjects && i < cells.length; i++) {
      const [r, c] = cells[i];
      const fx = (c + 0.2 + rnd() * 0.6) / cols, fy = (r + 0.2 + rnd() * 0.6) / rows;
      const skyItem = rnd() < 0.18 && kind !== 'room';
      items.push({
        id: items.length, k: 'emo', e: S.props[Math.floor(rnd() * S.props.length)],
        x: 0.05 + fx * 0.9, y: skyItem ? 0.06 + fy * (ground - 0.15) : top + fy * (0.95 - top),
        s: 0.065 + rnd() * 0.06, flip: rnd() < 0.4, rot: (rnd() - 0.5) * 0.3,
      });
    }
    return { kind, seed, ground, items, palette: S };
  }

  // choose props to change; spread them out and keep them away from the edges
  function makeDiffs(scene, n, subtle, seed) {
    const rnd = U.mulberry32(seed ^ 0x9e3779b9);
    const B = JSON.parse(JSON.stringify(scene));
    const pool = B.items.filter((it) => it.x > 0.06 && it.x < 0.94 && it.y > 0.06 && it.y < 0.94);
    pool.sort(() => rnd() - 0.5);
    // at high subtlety prefer smaller props
    if (subtle > 0.5) pool.sort((a, b) => (a.s - b.s) * subtle + (rnd() - 0.5) * 0.05);
    const spots = [];
    const S = SCENES[scene.kind];
    const kinds = ['remove', 'color', 'swap', 'flip', 'scale', 'move', 'add'];
    for (const it of pool) {
      if (spots.length >= n) break;
      const r = Math.max(0.05, it.s * (it.k === 'shape' ? 0.55 : 0.75));
      if (spots.some((s) => Math.hypot(s.x - it.x, (s.y - it.y) * 0.75) < s.r + r + 0.03)) continue;
      let mode = kinds[Math.floor(rnd() * kinds.length)];
      if (it.k === 'shape' && (mode === 'swap' || mode === 'flip')) mode = 'color';
      if (it.k === 'emo' && mode === 'color' && subtle < 0.3) mode = 'swap';
      const spot = { x: it.x, y: it.y, r, mode };
      switch (mode) {
        case 'remove': B.items = B.items.filter((x) => x.id !== it.id); break;
        case 'color': {
          const b = B.items.find((x) => x.id === it.id);
          if (b.k === 'shape') b.c = PALETTE[(PALETTE.indexOf(b.c) + 3 + Math.floor(rnd() * 5)) % PALETTE.length];
          else { b.tint = PALETTE[Math.floor(rnd() * PALETTE.length)]; b.tintA = U.lerp(0.62, 0.3, subtle); }
          break;
        }
        case 'swap': { const b = B.items.find((x) => x.id === it.id); let e; do { e = S.props[Math.floor(rnd() * S.props.length)]; } while (e === b.e); b.e = e; break; }
        case 'flip': { const b = B.items.find((x) => x.id === it.id); b.flip = !b.flip; break; }
        case 'scale': { const b = B.items.find((x) => x.id === it.id); const k = U.lerp(0.55, 0.25, subtle); b.s *= rnd() < 0.5 ? 1 + k : 1 - k * 0.7; break; }
        case 'move': {
          const b = B.items.find((x) => x.id === it.id);
          const d = U.lerp(0.11, 0.05, subtle), a = rnd() * Math.PI * 2;
          b.x = U.clamp(b.x + Math.cos(a) * d, 0.06, 0.94); b.y = U.clamp(b.y + Math.sin(a) * d, 0.06, 0.94);
          spot.x = (it.x + b.x) / 2; spot.y = (it.y + b.y) / 2; spot.r = r + d / 2;
          break;
        }
        case 'add': {
          // a new prop next to this one
          const nx = U.clamp(it.x + (rnd() < 0.5 ? -1 : 1) * (it.s + 0.06), 0.07, 0.93), ny = U.clamp(it.y + (rnd() - 0.5) * 0.08, 0.08, 0.92);
          if (spots.some((s) => Math.hypot(s.x - nx, s.y - ny) < s.r + 0.08)) continue;
          B.items.push({ id: 9000 + spots.length, k: 'emo', e: S.props[Math.floor(rnd() * S.props.length)], x: nx, y: ny, s: U.lerp(0.09, 0.06, subtle), flip: false, rot: 0 });
          spot.x = nx; spot.y = ny; spot.r = 0.06;
          break;
        }
      }
      spots.push(spot);
    }
    return { B, spots };
  }

  /* ---------- painting ---------- */
  const emoCache = new Map();
  function emoSprite(e, px) {
    const key = e + '|' + px;
    let c = emoCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * 1.7);
    const g = c.getContext('2d');
    Art.emojiArt(g, e, c.width / 2, c.height / 2, px, { outline: 'rgba(20,10,30,0.88)', ow: 0.035 });
    if (emoCache.size > 400) emoCache.clear();
    emoCache.set(key, c);
    return c;
  }
  function tinted(spr, col, a) {
    const c = document.createElement('canvas');
    c.width = spr.width; c.height = spr.height;
    const g = c.getContext('2d');
    g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function paintBackground(g, sc, W, H) {
    const rnd = U.mulberry32(sc.seed * 7 + 1);
    const S = sc.palette, k = sc.kind;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, S.sky[0]); sky.addColorStop(1, S.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (k === 'space' || k === 'city') {
      for (let i = 0; i < 160; i++) { g.globalAlpha = 0.3 + rnd() * 0.7; g.fillStyle = '#fff'; g.fillRect(rnd() * W, rnd() * H * (k === 'city' ? 0.6 : 1), 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
      g.globalAlpha = 1;
    }
    if (k === 'space') {
      const neb = g.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.5);
      neb.addColorStop(0, 'rgba(180,80,255,0.35)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, W, H);
      return;
    }
    if (k === 'sea') {
      for (let i = 0; i < 6; i++) {
        const x = rnd() * W;
        const lg = g.createLinearGradient(x, 0, x + W * 0.1, H);
        lg.addColorStop(0, 'rgba(255,255,255,0.22)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W * 0.06, 0); g.lineTo(x + W * 0.2, H); g.lineTo(x + W * 0.1, H); g.fill();
      }
      g.fillStyle = '#c9a66b'; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 20) g.lineTo(x, H * 0.9 + Math.sin(x * 0.02 + rnd()) * H * 0.03);
      g.lineTo(W, H); g.fill();
      return;
    }
    if (k === 'room') {
      g.fillStyle = '#e9d3b0'; g.fillRect(0, 0, W, H * sc.ground);
      for (let x = 0; x < W; x += W / 14) { g.fillStyle = 'rgba(160,120,80,0.08)'; g.fillRect(x, 0, W / 28, H * sc.ground); }
      const fl = g.createLinearGradient(0, H * sc.ground, 0, H);
      fl.addColorStop(0, '#9b6a3e'); fl.addColorStop(1, '#6e4626');
      g.fillStyle = fl; g.fillRect(0, H * sc.ground, W, H);
      g.strokeStyle = 'rgba(0,0,0,0.15)';
      for (let y = H * sc.ground; y < H; y += H * 0.06) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      return;
    }
    // sun / moon
    const night = k === 'city';
    g.fillStyle = night ? '#fff6d0' : k === 'desert' ? '#fff3b0' : '#fff7c2';
    g.shadowColor = g.fillStyle; g.shadowBlur = W * 0.06;
    g.beginPath(); g.arc(W * (0.15 + rnd() * 0.2), H * 0.16, W * 0.055, 0, 6.283); g.fill();
    g.shadowBlur = 0;
    // layered hills / dunes / sea
    const hillCols = {
      meadow: ['#7cc96a', '#5aae4f', '#3f8f3a'], beach: ['#3fa9e0', '#2b88c7', '#f4d9a0'], city: ['#1a1440', '#120e30', '#2a2a3a'],
      snow: ['#e8f2ff', '#d4e6fb', '#ffffff'], desert: ['#f2c27a', '#e6a65a', '#f7d49a'], forest: ['#2f6b35', '#25552b', '#3d7d3c'], candy: ['#ffc4e6', '#ff9fd2', '#fff1c9'],
    }[k] || ['#7cc96a', '#5aae4f', '#3f8f3a'];
    for (let L = 0; L < 3; L++) {
      const base = H * (sc.ground - 0.12 + L * 0.09);
      g.fillStyle = hillCols[L];
      g.beginPath(); g.moveTo(0, H);
      const ph = rnd() * 10, amp = H * (0.05 - L * 0.012);
      for (let x = 0; x <= W; x += W / 30) g.lineTo(x, base + Math.sin(x / W * 6 + ph) * amp + Math.sin(x / W * 13 + ph * 2) * amp * 0.4);
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    if (k === 'beach') {
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const y = H * (sc.ground - 0.05 + i * 0.03); g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2); g.stroke(); }
    }
  }

  function paintShape(g, it, W, H, rnd) {
    const x = it.x * W, y = it.y * H, s = it.s * W;
    g.save();
    g.translate(x, y);
    if (it.flip) g.scale(-1, 1);
    const shadow = () => { g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.04; };
    switch (it.t) {
      case 'tree': {
        g.fillStyle = '#7a4a22'; g.fillRect(-s * 0.07, -s * 0.1, s * 0.14, s * 0.45);
        shadow();
        [[0, -0.35, 0.32], [-0.22, -0.2, 0.25], [0.22, -0.2, 0.25], [0, -0.12, 0.28]].forEach(([dx, dy, r], i) => {
          const gr = g.createRadialGradient(dx * s - r * s * 0.3, dy * s - r * s * 0.3, 1, dx * s, dy * s, r * s);
          gr.addColorStop(0, '#9be36f'); gr.addColorStop(1, i ? '#3c8f34' : '#2f7a2b');
          g.fillStyle = gr; g.beginPath(); g.arc(dx * s, dy * s, r * s, 0, 6.283); g.fill();
        });
        g.shadowColor = 'transparent';
        g.fillStyle = it.c;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc((((it.v >> i) % 7) / 7 - 0.4) * s * 0.6, -s * (0.15 + ((it.v >> (i + 2)) % 5) / 18), s * 0.035, 0, 6.283); g.fill(); }
        break;
      }
      case 'pine': {
        g.fillStyle = '#6b4020'; g.fillRect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.25);
        shadow();
        for (let i = 0; i < 3; i++) {
          g.fillStyle = i % 2 ? '#2f7a45' : '#24683a';
          g.beginPath(); g.moveTo(0, -s * (0.75 - i * 0.18)); g.lineTo(s * (0.22 + i * 0.07), -s * (0.25 - i * 0.12)); g.lineTo(-s * (0.22 + i * 0.07), -s * (0.25 - i * 0.12)); g.closePath(); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.beginPath(); g.moveTo(0, -s * 0.75); g.lineTo(s * 0.08, -s * 0.6); g.lineTo(-s * 0.08, -s * 0.6); g.fill();
        g.fillStyle = it.c; g.beginPath(); g.arc(s * 0.08, -s * 0.35, s * 0.03, 0, 6.283); g.fill();
        break;
      }
      case 'palm': {
        g.strokeStyle = '#8a5a2b'; g.lineWidth = s * 0.07; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, s * 0.3); g.quadraticCurveTo(s * 0.12, -s * 0.1, s * 0.05, -s * 0.5); g.stroke();
        shadow();
        g.fillStyle = '#2f9a45';
        for (let i = 0; i < 6; i++) { g.save(); g.translate(s * 0.05, -s * 0.5); g.rotate(i * 1.05); g.beginPath(); g.ellipse(s * 0.18, 0, s * 0.2, s * 0.05, 0.3, 0, 6.283); g.fill(); g.restore(); }
        g.fillStyle = '#6b3d14'; g.beginPath(); g.arc(s * 0.05, -s * 0.47, s * 0.04, 0, 6.283); g.fill();
        break;
      }
      case 'cactus': {
        shadow(); g.fillStyle = '#3e9a4a';
        rr(g, -s * 0.07, -s * 0.5, s * 0.14, s * 0.6, s * 0.07); g.fill();
        rr(g, -s * 0.25, -s * 0.3, s * 0.1, s * 0.22, s * 0.05); g.fill(); g.fillRect(-s * 0.2, -s * 0.12, s * 0.15, s * 0.07);
        rr(g, s * 0.15, -s * 0.4, s * 0.1, s * 0.22, s * 0.05); g.fill(); g.fillRect(s * 0.05, -s * 0.22, s * 0.15, s * 0.07);
        g.fillStyle = it.c; g.beginPath(); g.arc(0, -s * 0.52, s * 0.04, 0, 6.283); g.fill();
        break;
      }
      case 'house': case 'cabin': {
        shadow();
        g.fillStyle = it.t === 'cabin' ? '#8a5a2b' : '#fff1dc';
        g.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.4);
        g.fillStyle = it.c; g.beginPath(); g.moveTo(-s * 0.38, -s * 0.28); g.lineTo(0, -s * 0.6); g.lineTo(s * 0.38, -s * 0.28); g.closePath(); g.fill();
        g.shadowColor = 'transparent';
        if (it.t === 'cabin') { g.fillStyle = '#fff'; g.fillRect(-s * 0.38, -s * 0.33, s * 0.76, s * 0.05); }
        g.fillStyle = '#6b3d14'; g.fillRect(-s * 0.06, -s * 0.12, s * 0.12, s * 0.22);
        g.fillStyle = it.v % 2 ? '#ffe27a' : '#7fc8ff';
        g.fillRect(-s * 0.24, -s * 0.22, s * 0.12, s * 0.1); g.fillRect(s * 0.12, -s * 0.22, s * 0.12, s * 0.1);
        break;
      }
      case 'building': {
        const w = s * 0.45, h = s * (1.2 + (it.v % 5) * 0.2);
        g.fillStyle = it.c; g.globalAlpha = 0.35; g.fillRect(-w / 2, -h, w, h); g.globalAlpha = 1;
        g.fillStyle = '#1c1838'; g.fillRect(-w / 2 + 2, -h + 2, w - 4, h);
        const wr = U.mulberry32(it.v);
        for (let yy = -h + s * 0.08; yy < -s * 0.06; yy += s * 0.1) for (let xx = -w / 2 + s * 0.06; xx < w / 2 - s * 0.06; xx += s * 0.1) {
          g.fillStyle = wr() < 0.55 ? '#ffd86b' : '#2c2850'; g.fillRect(xx, yy, s * 0.05, s * 0.06);
        }
        break;
      }
      case 'lamp': {
        g.fillStyle = '#3a3a4a'; g.fillRect(-s * 0.02, -s * 0.6, s * 0.04, s * 0.7);
        g.fillStyle = it.c; g.shadowColor = it.c; g.shadowBlur = s * 0.3;
        g.beginPath(); g.arc(0, -s * 0.62, s * 0.06, 0, 6.283); g.fill();
        break;
      }
      case 'star': {
        g.fillStyle = it.c; g.shadowColor = it.c; g.shadowBlur = s * 0.2;
        g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.08 : s * 0.2, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        g.closePath(); g.fill();
        break;
      }
      case 'cloud': {
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.shadowColor = 'rgba(0,0,0,0.12)'; g.shadowBlur = s * 0.1; g.shadowOffsetY = s * 0.03;
        [[-0.25, 0, 0.18], [0, -0.08, 0.24], [0.25, 0, 0.18], [0.05, 0.05, 0.2]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(dx * s, dy * s, r * s, 0, 6.283); g.fill(); });
        break;
      }
      case 'planet': {
        const r = s * 0.3;
        const gr = g.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
        gr.addColorStop(0, U.shade(it.c, 0.5)); gr.addColorStop(1, U.shade(it.c, -0.5));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        if (it.v % 2) { g.strokeStyle = U.rgba('#ffe9b0', 0.8); g.lineWidth = s * 0.03; g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.4, -0.3, 0, 6.283); g.stroke(); }
        break;
      }
      case 'weed': {
        g.strokeStyle = '#2fae6a'; g.lineWidth = s * 0.05; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo((i - 1) * s * 0.08, s * 0.1); g.bezierCurveTo((i - 1) * s * 0.1 + s * 0.1, -s * 0.3, (i - 1) * s * 0.1 - s * 0.1, -s * 0.5, (i - 1) * s * 0.05, -s * 0.8); g.stroke(); }
        break;
      }
      case 'coral': {
        g.strokeStyle = it.c; g.lineWidth = s * 0.06; g.lineCap = 'round';
        const br = (x0, y0, a, l, d) => { if (d > 3) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); br(x1, y1, a - 0.5, l * 0.7, d + 1); br(x1, y1, a + 0.5, l * 0.7, d + 1); };
        br(0, s * 0.1, -Math.PI / 2, s * 0.25, 0);
        break;
      }
      case 'bubbles': {
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(Math.sin(i * 2.1) * s * 0.1, -i * s * 0.12, s * (0.025 + (i % 3) * 0.012), 0, 6.283); g.stroke(); }
        break;
      }
      case 'lolly': {
        g.fillStyle = '#f6f0e6'; g.fillRect(-s * 0.02, -s * 0.2, s * 0.04, s * 0.5);
        shadow();
        g.fillStyle = it.c; g.beginPath(); g.arc(0, -s * 0.32, s * 0.18, 0, 6.283); g.fill();
        g.shadowColor = 'transparent';
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = s * 0.03;
        g.beginPath(); for (let a = 0; a < 12; a += 0.2) g.lineTo(Math.cos(a) * a * s * 0.014, -s * 0.32 + Math.sin(a) * a * s * 0.014); g.stroke();
        break;
      }
      case 'pyramid': {
        shadow();
        g.fillStyle = '#e8b866'; g.beginPath(); g.moveTo(-s * 0.45, s * 0.1); g.lineTo(0, -s * 0.45); g.lineTo(s * 0.45, s * 0.1); g.closePath(); g.fill();
        g.shadowColor = 'transparent';
        g.fillStyle = '#c99245'; g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(s * 0.45, s * 0.1); g.lineTo(s * 0.1, s * 0.1); g.closePath(); g.fill();
        g.fillStyle = it.c; g.fillRect(-s * 0.04, -s * 0.05, s * 0.08, s * 0.15);
        break;
      }
      case 'boat': {
        shadow(); g.fillStyle = '#8a4a20';
        g.beginPath(); g.moveTo(-s * 0.3, 0); g.lineTo(s * 0.3, 0); g.lineTo(s * 0.2, s * 0.12); g.lineTo(-s * 0.2, s * 0.12); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -s * 0.4); g.lineTo(s * 0.2, -s * 0.02); g.lineTo(0, -s * 0.02); g.closePath(); g.fill();
        g.fillStyle = it.c; g.beginPath(); g.moveTo(0, -s * 0.35); g.lineTo(-s * 0.16, -s * 0.02); g.lineTo(0, -s * 0.02); g.closePath(); g.fill();
        break;
      }
      case 'umbrella': {
        g.fillStyle = '#ddd'; g.fillRect(-s * 0.015, -s * 0.3, s * 0.03, s * 0.45);
        shadow(); g.fillStyle = it.c; g.beginPath(); g.arc(0, -s * 0.3, s * 0.28, Math.PI, 0); g.fill();
        g.shadowColor = 'transparent'; g.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, -s * 0.3); g.arc(0, -s * 0.3, s * 0.28, Math.PI + i * 1.05, Math.PI + i * 1.05 + 0.5); g.fill(); }
        break;
      }
      case 'fence': {
        g.fillStyle = '#f2e3c8';
        for (let i = -3; i <= 3; i++) { g.fillRect(i * s * 0.1 - s * 0.025, -s * 0.2, s * 0.05, s * 0.25); }
        g.fillRect(-s * 0.33, -s * 0.15, s * 0.66, s * 0.04); g.fillRect(-s * 0.33, -s * 0.05, s * 0.66, s * 0.04);
        break;
      }
      case 'flowerbed': {
        for (let i = 0; i < 7; i++) { const fx = (i - 3) * s * 0.09, fy = Math.sin(i * 1.7) * s * 0.03; g.fillStyle = '#2f8a3a'; g.fillRect(fx - 1, fy, 2, s * 0.08); g.fillStyle = i === it.v % 7 ? it.c : PALETTE[(i + it.v) % PALETTE.length]; g.beginPath(); g.arc(fx, fy, s * 0.035, 0, 6.283); g.fill(); }
        break;
      }
      case 'window': {
        shadow(); g.fillStyle = '#fff'; g.fillRect(-s * 0.3, -s * 0.25, s * 0.6, s * 0.5);
        g.shadowColor = 'transparent';
        const sky = g.createLinearGradient(0, -s * 0.22, 0, s * 0.22); sky.addColorStop(0, '#7fd0ff'); sky.addColorStop(1, '#d6f0ff');
        g.fillStyle = sky; g.fillRect(-s * 0.27, -s * 0.22, s * 0.54, s * 0.44);
        g.fillStyle = '#fff'; g.fillRect(-s * 0.01, -s * 0.22, s * 0.02, s * 0.44); g.fillRect(-s * 0.27, -s * 0.01, s * 0.54, s * 0.02);
        g.fillStyle = it.c; g.fillRect(-s * 0.34, -s * 0.28, s * 0.1, s * 0.56); g.fillRect(s * 0.24, -s * 0.28, s * 0.1, s * 0.56);
        break;
      }
      case 'shelf': {
        g.fillStyle = '#8a5a2b'; g.fillRect(-s * 0.4, 0, s * 0.8, s * 0.04);
        for (let i = 0; i < 6; i++) { g.fillStyle = PALETTE[(i * 3 + it.v) % PALETTE.length]; g.fillRect(-s * 0.36 + i * s * 0.07, -s * (0.14 + (i % 3) * 0.02), s * 0.055, s * (0.14 + (i % 3) * 0.02)); }
        g.fillStyle = it.c; g.fillRect(s * 0.12, -s * 0.12, s * 0.2, s * 0.12);
        break;
      }
      case 'frame': {
        shadow(); g.fillStyle = '#c9a24a'; g.fillRect(-s * 0.22, -s * 0.18, s * 0.44, s * 0.36);
        g.shadowColor = 'transparent';
        g.fillStyle = it.c; g.fillRect(-s * 0.18, -s * 0.14, s * 0.36, s * 0.28);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-s * 0.05, -s * 0.03, s * 0.06, 0, 6.283); g.fill();
        break;
      }
      case 'rug': {
        g.fillStyle = it.c; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.12, 0, 0, 6.283); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.09, 0, 0, 6.283); g.stroke();
        break;
      }
    }
    g.restore();
  }

  function paintScene(sc, W, H, dpr) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    paintBackground(g, sc, W, H);
    const items = sc.items.slice().sort((a, b) => (a.k === 'shape' ? 0 : 1) - (b.k === 'shape' ? 0 : 1) || a.y - b.y);
    for (const it of items) {
      if (it.k === 'shape') { paintShape(g, it, W, H); continue; }
      const px = Math.max(10, Math.round(it.s * W * dpr));
      let spr = emoSprite(it.e, px);
      if (it.tint) spr = tinted(spr, it.tint, it.tintA);
      const w = spr.width / dpr;
      g.save();
      g.translate(it.x * W, it.y * H);
      g.rotate(it.rot || 0);
      if (it.flip) g.scale(-1, 1);
      g.drawImage(spr, -w / 2, -w / 2, w, w);
      g.restore();
    }
    // soft vignette + film light
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  /* ---------- game ---------- */
  class SpotDiff {
    constructor(host, o) {
      this.host = host;
      this.o = o; // { params, machineId, stage, seed, custom, fx, onEvent, onEnd, spend }
      this.p = o.params;
      this.time = this.p.time;
      this.found = [];
      this.marks = [];
      this.misses = 0;
      this.hints = 0;
      this.build();
    }
    build() {
      const h = this.host;
      h.innerHTML = `<div class="mg-hud">
          <div class="mg-stage"><b>틀린그림찾기</b> <span class="js-sub"></span></div>
          <div class="mg-timer"><div class="mg-timer-fill js-tfill"></div><span class="js-tnum"></span></div>
          <div class="mg-info"><span class="sd-dots js-dots"></span></div>
        </div>
        <div class="sd-area js-area">
          <div class="sd-pic"><span class="sd-tag">원래 세계</span><canvas class="js-a"></canvas></div>
          <div class="sd-pic"><span class="sd-tag mirror">거울 세계</span><canvas class="js-b"></canvas></div>
          <div class="mg-banner js-banner"></div>
        </div>
        <div class="mg-tools">
          <button class="mg-tool js-hint"><span class="ico">🔍</span><span>힌트</span><em>${this.p.hint}</em></button>
        </div>`;
      const q = (s) => h.querySelector(s);
      this.ui = { sub: q('.js-sub'), tfill: q('.js-tfill'), tnum: q('.js-tnum'), dots: q('.js-dots'), area: q('.js-area'), a: q('.js-a'), b: q('.js-b'), banner: q('.js-banner'), hint: q('.js-hint') };
      this.ui.hint.addEventListener('click', () => this.useHint());
      [this.ui.a, this.ui.b].forEach((cv) => cv.addEventListener('pointerdown', (e) => this.tap(e, cv)));
      this.onResize = () => this.layout();
      addEventListener('resize', this.onResize);
      // puzzle
      if (this.o.custom) {
        this.custom = this.o.custom;
        this.spots = this.custom.spots.map((s) => ({ x: s.x, y: s.y, r: s.r, mode: 'custom' }));
        this.aspect = 4 / 3;
        this.imgs = [new Image(), new Image()];
        this.imgs[0].src = this.custom.a; this.imgs[1].src = this.custom.b;
        this.imgs[0].onload = () => { this.aspect = this.imgs[0].naturalWidth / this.imgs[0].naturalHeight || 4 / 3; this.layout(); };
        this.imgs[1].onload = () => this.layout();
        this.ui.sub.textContent = `${this.o.stage}판 · 사용자 그림`;
      } else {
        const kinds = Object.keys(SCENES);
        const pref = BY_MACHINE[this.o.machineId];
        const kind = this.o.stage % 3 === 0 || !pref ? kinds[this.o.seed % kinds.length] : pref;
        this.sceneA = makeScene(kind, this.o.seed, this.p.objects);
        const d = makeDiffs(this.sceneA, this.p.count, this.p.subtle, this.o.seed);
        this.sceneB = d.B;
        this.spots = d.spots;
        this.aspect = 4 / 3;
        this.ui.sub.textContent = `${this.o.stage}판 · 틀린 곳 ${this.spots.length}개`;
      }
      this.renderDots();
      this.layout();
    }
    layout() {
      const area = this.ui.area;
      const W = area.clientWidth, H = area.clientHeight;
      if (!W || !H) return;
      const portrait = H > W * 0.9;
      area.classList.toggle('stack', portrait);
      const gap = 10;
      let w, h;
      if (portrait) { h = Math.min((H - gap) / 2, W / this.aspect); w = h * this.aspect; } else { w = Math.min((W - gap) / 2, H * this.aspect); h = w / this.aspect; }
      this.cw = Math.floor(w); this.chh = Math.floor(h);
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.dpr = dpr;
      [this.ui.a, this.ui.b].forEach((cv) => {
        cv.width = Math.round(this.cw * dpr); cv.height = Math.round(this.chh * dpr);
        cv.style.width = this.cw + 'px'; cv.style.height = this.chh + 'px';
      });
      if (this.custom) this.base = null;
      else this.base = [paintScene(this.sceneA, this.cw, this.chh, dpr), paintScene(this.sceneB, this.cw, this.chh, dpr)];
    }
    renderDots() {
      this.ui.dots.innerHTML = this.spots.map((s, i) => `<i class="${this.found.includes(i) ? 'on' : ''}"></i>`).join('') + `<b>${this.found.length}/${this.spots.length}</b>`;
    }
    start() {
      this.running = true;
      this.last = performance.now();
      const loop = (tms) => {
        if (this.dead) return;
        const dt = Math.min(0.1, (tms - this.last) / 1000);
        this.last = tms;
        if (this.running && !this.paused) {
          this.time -= dt;
          if (this.time <= 10 && Math.floor(this.time) !== this.lastTick && this.time > 0) { this.lastTick = Math.floor(this.time); A.qTick && A.qTick(this.time); }
          if (this.time <= 0) { this.time = 0; this.running = false; this.o.onEnd({ cleared: false, reason: 'time' }); }
          const u = Math.max(0, this.time / this.p.time);
          this.ui.tfill.style.transform = `scaleX(${Math.min(1, u)})`;
          this.ui.tfill.classList.toggle('warn', this.time < 15);
          this.ui.tnum.textContent = Math.ceil(this.time) + 's';
        }
        this.draw(tms / 1000);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    resume(extra) { this.time += extra; this.running = true; this.paused = false; }
    destroy() { this.dead = true; removeEventListener('resize', this.onResize); this.host.innerHTML = ''; }
    banner(text, cls) {
      const b = this.ui.banner;
      b.textContent = text; b.className = 'mg-banner show ' + (cls || '');
      clearTimeout(this.bt); this.bt = setTimeout(() => { b.className = 'mg-banner'; }, 1200);
    }
    tap(e, cv) {
      if (!this.running || this.paused) return;
      A.init && A.init();
      const b = cv.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      const asp = this.aspect;
      let hit = -1, best = 9;
      this.spots.forEach((s, i) => {
        if (this.found.includes(i)) return;
        const d = Math.hypot(x - s.x, (y - s.y) / asp);
        const tol = Math.max(s.r * 1.15, 0.05);
        if (d < tol && d < best) { best = d; hit = i; }
      });
      const t = performance.now() / 1000;
      if (hit >= 0) {
        this.found.push(hit);
        this.marks.push({ i: hit, t0: t, ok: true });
        const s = this.spots[hit];
        [this.ui.a, this.ui.b].forEach((c) => {
          const r = c.getBoundingClientRect();
          const px = r.left + s.x * r.width, py = r.top + s.y * r.height;
          this.o.fx.burst(px, py, '#7fffd4', 18, 1);
          this.o.fx.ring(px, py, '#ffffff', 70, 5);
        });
        A.qFound && A.qFound(this.found.length);
        this.o.onEvent('found', {});
        this.renderDots();
        if (this.found.length === this.spots.length) {
          this.running = false;
          this.banner('모두 찾았어요!', 'good');
          setTimeout(() => this.o.onEnd({ cleared: true, timeLeft: this.time, misses: this.misses, hints: this.hints }), 900);
        } else if (this.found.length === this.spots.length - 1) this.banner('마지막 하나!', 'info');
      } else {
        this.misses++;
        this.time = Math.max(0, this.time - this.p.penalty);
        this.marks.push({ x, y, cv: cv === this.ui.a ? 0 : 1, t0: t, ok: false });
        A.qBad && A.qBad();
        this.banner(`-${this.p.penalty}초`, 'bad');
        cv.parentElement.classList.remove('shake'); void cv.offsetWidth; cv.parentElement.classList.add('shake');
        this.o.onEvent('miss', {});
      }
    }
    useHint() {
      if (!this.running || this.paused) return;
      const left = this.spots.map((s, i) => i).filter((i) => !this.found.includes(i));
      if (!left.length) return;
      if (!this.o.spend(this.p.hint, '힌트')) return;
      this.hints++;
      this.hintI = left[Math.floor(Math.random() * left.length)];
      this.hintT = performance.now() / 1000;
      A.qHint && A.qHint();
      this.o.onEvent('hint', {});
    }
    draw(t) {
      [this.ui.a, this.ui.b].forEach((cv, ci) => {
        const g = cv.getContext('2d');
        g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const W = this.cw, H = this.chh;
        if (this.custom) {
          const img = this.imgs[ci];
          if (img.complete && img.naturalWidth) g.drawImage(img, 0, 0, W, H); else { g.fillStyle = '#222'; g.fillRect(0, 0, W, H); }
        } else if (this.base) g.drawImage(this.base[ci], 0, 0, W, H);
        // found circles
        for (const i of this.found) {
          const s = this.spots[i];
          const m = this.marks.find((mk) => mk.ok && mk.i === i);
          const u = m ? U.clamp((t - m.t0) / 0.4, 0, 1) : 1;
          const r = Math.max(0.1, Math.max(14, s.r * W * 1.05) * (u < 1 ? U.easeOutBack(u, 2) : 1));
          g.save();
          g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.shadowColor = '#00ffc8'; g.shadowBlur = 14;
          g.beginPath(); g.arc(s.x * W, s.y * H, r, 0, Math.PI * 2 * Math.min(1, u * 1.4)); g.stroke();
          g.lineWidth = 2; g.strokeStyle = '#00e0b0'; g.stroke();
          g.restore();
        }
        // wrong taps
        this.marks.forEach((mk) => {
          if (mk.ok || mk.cv !== ci) return;
          const u = Math.max(0, (t - mk.t0) / 0.8);
          if (u > 1) return;
          g.save(); g.globalAlpha = 1 - u; g.strokeStyle = '#ff3b5c'; g.lineWidth = 5; g.lineCap = 'round';
          const x = mk.x * W, y = mk.y * H, s = 14 + u * 6;
          g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke();
          g.restore();
        });
        // hint pulse
        if (this.hintI != null && !this.found.includes(this.hintI)) {
          const s = this.spots[this.hintI];
          const r = Math.max(20, s.r * W * 1.6) * (1 + 0.12 * Math.sin(t * 6));
          g.save(); g.globalCompositeOperation = 'lighter';
          g.drawImage(root.FxSprites.glow('#ffe27a'), s.x * W - r, s.y * H - r, r * 2, r * 2);
          g.restore();
        }
      });
    }
  }

  root.SpotDiffGame = SpotDiff;
  root.SpotDiffGen = { makeScene, makeDiffs, SCENES };
})(window);
