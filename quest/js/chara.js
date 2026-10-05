/* Vector character rig: cute chibi animals drawn as SVG with expressions, blinking, bobbing and talking.
   Chara.svg(id, expr, opts) → SVG string.   expr: smile | happy | joy | wink | surprised | sad | angry | smug | sleepy
   Chara.el(id, expr, opts) → a <div class="chara"> element (animated through CSS in quest.css). */
(function (root) {
  const CH = {
    lumi:     { name: '루미', sp: 'fox', fur: '#ff8a3d', fur2: '#ffb46b', light: '#fff4e6', dark: '#4a220c', eye: '#2a1206', outfit: '#6c3dff', outfit2: '#9b7bff', acc: 'scarf', accC: '#ffd23f', tail: true },
    toto:     { name: '토토', sp: 'bunny', fur: '#fff1f5', fur2: '#ffd5e3', light: '#ffffff', dark: '#d77b9c', eye: '#3b1a2a', outfit: '#ff7eb6', outfit2: '#ffc1dc', acc: 'chef', accC: '#ffffff' },
    pingu:    { name: '핑구 선장', sp: 'penguin', fur: '#243b6b', fur2: '#34508a', light: '#ffffff', dark: '#0e1a33', eye: '#0b1020', outfit: '#1e88e5', outfit2: '#90caf9', acc: 'captain', accC: '#ffffff', beak: '#ffb300' },
    hana:     { name: '하나', sp: 'redpanda', fur: '#d9531e', fur2: '#ef7a3c', light: '#fff3e8', dark: '#3a1608', eye: '#1e0c04', outfit: '#2b2b44', outfit2: '#e53950', acc: 'headband', accC: '#e53950', tail: true, tailRing: true },
    nyank:    { name: '냥크 파라오', sp: 'cat', fur: '#f2c46d', fur2: '#ffd98e', light: '#fff6dd', dark: '#6b4512', eye: '#173b2a', iris: '#2fd38a', outfit: '#1f4fa0', outfit2: '#ffd23f', acc: 'nemes', accC: '#ffd23f', acc2: '#1f4fa0' },
    hoya:     { name: '호야 박사', sp: 'owl', fur: '#e8eef8', fur2: '#c7d3e8', light: '#ffffff', dark: '#5b6a86', eye: '#141b2b', iris: '#62c6ff', outfit: '#5d7cff', outfit2: '#c8d6ff', acc: 'glasses', accC: '#3d4a66', beak: '#ffb84d' },
    bana:     { name: '바나', sp: 'monkey', fur: '#8a5a3a', fur2: '#a8714b', light: '#ffd9b5', dark: '#3b2112', eye: '#1c0f06', outfit: '#3e8e41', outfit2: '#a5d6a7', acc: 'explorer', accC: '#d8b77a', tail: true },
    robo:     { name: '로보', sp: 'robot', fur: '#b8c6db', fur2: '#e3ebf6', light: '#ffffff', dark: '#4a5a73', eye: '#00e5ff', outfit: '#4a5a73', outfit2: '#00e5ff', acc: 'none' },
    boya:     { name: '뽀야', sp: 'ghost', fur: '#f4f0ff', fur2: '#ded5ff', light: '#ffffff', dark: '#8d7bd6', eye: '#1b1240', outfit: '#f4f0ff', outfit2: '#ffb3e6', acc: 'bow', accC: '#ff6fb5' },
    draco:    { name: '드라코', sp: 'dragon', fur: '#46c37b', fur2: '#7be0a4', light: '#fff7d6', dark: '#1d5a37', eye: '#2a1206', iris: '#ffb300', outfit: '#ff7043', outfit2: '#ffd23f', acc: 'none', tail: true },
    nocturne: { name: '녹턴', sp: 'magician', fur: '#2a1748', fur2: '#4b2a80', light: '#f2ecff', dark: '#120826', eye: '#ffe14d', outfit: '#1a0d33', outfit2: '#8a5cff', acc: 'tophat', accC: '#120826' },
    mirror:   { name: '탐욕의 거울', sp: 'mirror', fur: '#ffd23f', fur2: '#fff0a0', light: '#e9f6ff', dark: '#7a4a00', eye: '#ff2a4f', outfit: '#3b0a3e', outfit2: '#ff4fd8', acc: 'none' },
    minion:   { name: '그림자 졸개', sp: 'blob', fur: '#3a2266', fur2: '#5a3a99', light: '#f2ecff', dark: '#1a0d33', eye: '#ffe14d', outfit: '#3a2266', outfit2: '#8a5cff', acc: 'mask', accC: '#ffffff' },
  };
  // each episode's boss is a shadowed copy of a species wearing a crown and a mask
  function shadowOf(id, name, crownC) {
    const b = CH[id];
    return Object.assign({}, b, { name, fur: '#2e1c52', fur2: '#4a2f80', light: '#7d68b8', dark: '#120826', eye: '#ffe14d', iris: null, outfit: '#1a0d33', outfit2: crownC || '#ffd23f', acc: 'crown', accC: crownC || '#ffd23f', shadow: true });
  }
  CH.boss_neon = shadowOf('cat', '스페이드 잭', '#00e5ff');
  CH.boss_candy = shadowOf('bunny', '사탕 마녀 쇼콜라', '#ff7eb6');
  CH.boss_sea = shadowOf('penguin', '심해의 클럽 킹', '#36f1cd');
  CH.boss_sakura = shadowOf('redpanda', '꽃잎 닌자 카게', '#ff9ec7');
  CH.boss_desert = shadowOf('cat', '모래 군주 세트', '#ffd23f');
  CH.boss_ice = shadowOf('owl', '눈보라 백작', '#9be7ff');
  CH.boss_jungle = shadowOf('monkey', '정글 폭군 콩가', '#7bff8a');
  CH.boss_space = shadowOf('robot', '블랙홀 X-9', '#b14aff');
  CH.boss_ghost = shadowOf('ghost', '자정의 백작부인', '#ff4fd8');
  CH.boss_sky = shadowOf('owl', '번개의 하피', '#fff176');
  CH.boss_volcano = shadowOf('dragon', '마그마 드레이크', '#ff7043');
  // lookups for species that the shadow copies borrowed (cat/owl …) are by sp, so this works

  const P = (d, f, extra) => `<path d="${d}" fill="${f}" ${extra || ''}/>`;
  const E = (cx, cy, rx, ry, f, extra) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${extra || ''}/>`;
  const C = (cx, cy, r, f, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${extra || ''}/>`;

  function ears(c) {
    switch (c.sp) {
      case 'fox': return P('M46 70 L34 6 Q38 2 44 6 L92 44 Z', c.fur, 'stroke="' + c.fur + '" stroke-width="6" stroke-linejoin="round"') + P('M154 70 L166 6 Q162 2 156 6 L108 44 Z', c.fur, 'stroke="' + c.fur + '" stroke-width="6" stroke-linejoin="round"')
        + P('M52 58 L44 20 L80 46 Z', c.light) + P('M148 58 L156 20 L120 46 Z', c.light) + P('M36 10 L42 30 L54 20 Z', c.dark, 'opacity=".85"') + P('M164 10 L158 30 L146 20 Z', c.dark, 'opacity=".85"');
      case 'cat': return P('M44 66 L44 14 Q46 8 52 12 L90 44 Z', c.fur, 'stroke="' + c.fur + '" stroke-width="6" stroke-linejoin="round"') + P('M156 66 L156 14 Q154 8 148 12 L110 44 Z', c.fur, 'stroke="' + c.fur + '" stroke-width="6" stroke-linejoin="round"')
        + P('M52 56 L52 26 L78 46 Z', c.fur2 === c.fur ? c.light : '#ffb3c7') + P('M148 56 L148 26 L122 46 Z', c.fur2 === c.fur ? c.light : '#ffb3c7');
      case 'bunny': return E(72, 22, 15, 46, c.fur, 'transform="rotate(-14 72 60)"') + E(128, 22, 15, 46, c.fur, 'transform="rotate(14 128 60)"')
        + E(72, 24, 7, 34, '#ffb3cd', 'transform="rotate(-14 72 60)"') + E(128, 24, 7, 34, '#ffb3cd', 'transform="rotate(14 128 60)"');
      case 'redpanda': case 'monkey': {
        const y = c.sp === 'monkey' ? 86 : 44, x = c.sp === 'monkey' ? 30 : 46;
        return C(x, y, 22, c.fur) + C(200 - x, y, 22, c.fur) + C(x, y, 12, c.sp === 'monkey' ? c.light : c.light) + C(200 - x, y, 12, c.light);
      }
      case 'owl': return P('M44 50 L40 12 L76 38 Z', c.fur2) + P('M156 50 L160 12 L124 38 Z', c.fur2);
      case 'dragon': return P('M58 44 Q40 18 52 2 Q60 22 76 34 Z', c.light, 'stroke="' + c.dark + '" stroke-width="2"') + P('M142 44 Q160 18 148 2 Q140 22 124 34 Z', c.light, 'stroke="' + c.dark + '" stroke-width="2"')
        + P('M26 92 Q6 80 12 62 Q26 72 40 78 Z', c.fur2) + P('M174 92 Q194 80 188 62 Q174 72 160 78 Z', c.fur2);
      case 'robot': return `<rect x="96" y="2" width="8" height="26" rx="4" fill="${c.dark}"/>` + C(100, 6, 8, c.eye, 'class="ch-glow"');
      default: return '';
    }
  }

  function headShape(c) {
    if (c.sp === 'robot') return `<rect x="28" y="28" width="144" height="122" rx="34" fill="url(#gF-${c.k})" stroke="${c.dark}" stroke-width="3"/>` + `<rect x="42" y="50" width="116" height="82" rx="22" fill="#0b1426"/>`;
    if (c.sp === 'ghost' || c.sp === 'blob') return '';
    if (c.sp === 'mirror') return `<ellipse cx="100" cy="96" rx="78" ry="88" fill="url(#gF-${c.k})" stroke="${c.dark}" stroke-width="4"/>` + `<ellipse cx="100" cy="96" rx="62" ry="72" fill="url(#gM-${c.k})"/>`
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return C(100 + Math.cos(a) * 72, 96 + Math.sin(a) * 82, 7, i % 2 ? c.outfit2 : '#fff', 'opacity=".9"'); }).join('');
    if (c.sp === 'magician') return E(100, 96, 62, 60, c.fur);
    return E(100, 92, 72, 63, `url(#gF-${c.k})`);
  }

  function faceMask(c) {
    switch (c.sp) {
      case 'fox': return P('M30 100 Q60 92 100 112 Q140 92 170 100 Q160 150 100 154 Q40 150 30 100 Z', c.light);
      case 'cat': return E(100, 120, 34, 22, c.light);
      case 'redpanda': return E(70, 70, 14, 8, c.light) + E(130, 70, 14, 8, c.light) + P('M36 104 Q60 96 100 114 Q140 96 164 104 Q156 148 100 152 Q44 148 36 104 Z', c.light)
        + P('M66 104 Q60 126 70 140', 'none', `stroke="${c.dark}" stroke-width="6" stroke-linecap="round" opacity=".35"`) + P('M134 104 Q140 126 130 140', 'none', `stroke="${c.dark}" stroke-width="6" stroke-linecap="round" opacity=".35"`);
      case 'penguin': return C(74, 92, 32, c.light) + C(126, 92, 32, c.light) + E(100, 122, 50, 30, c.light);
      case 'monkey': return P('M100 64 Q122 52 144 72 Q160 96 148 124 Q132 152 100 152 Q68 152 52 124 Q40 96 56 72 Q78 52 100 64 Z', c.light);
      case 'owl': return C(72, 92, 30, c.light) + C(128, 92, 30, c.light) + P('M54 70 Q72 56 96 74', 'none', `stroke="${c.dark}" stroke-width="5" stroke-linecap="round" opacity=".5"`) + P('M146 70 Q128 56 104 74', 'none', `stroke="${c.dark}" stroke-width="5" stroke-linecap="round" opacity=".5"`);
      case 'bunny': return E(100, 122, 30, 20, c.light);
      case 'dragon': return E(100, 124, 46, 28, c.light) + C(84, 118, 3, c.dark, 'opacity=".5"') + C(116, 118, 3, c.dark, 'opacity=".5"');
      case 'magician': return P('M44 72 Q100 52 156 72 Q160 108 136 112 Q118 100 100 112 Q82 100 64 112 Q40 108 44 72 Z', c.light, 'opacity=".96"');
      default: return '';
    }
  }

  function eyes(c, expr) {
    const ey = c.sp === 'robot' ? 86 : c.sp === 'mirror' ? 86 : 92, lx = c.sp === 'mirror' ? 76 : 72, rx = 200 - lx;
    const rr = c.sp === 'owl' ? 15 : 12, ry = c.sp === 'owl' ? 15 : 15;
    const ink = c.eye;
    if (c.sp === 'robot') {
      if (expr === 'joy' || expr === 'happy') return `<g class="ch-eyes">${P(`M${lx - 14} ${ey + 4} Q${lx} ${ey - 14} ${lx + 14} ${ey + 4}`, 'none', `stroke="${ink}" stroke-width="7" stroke-linecap="round" class="ch-glow"`)}${P(`M${rx - 14} ${ey + 4} Q${rx} ${ey - 14} ${rx + 14} ${ey + 4}`, 'none', `stroke="${ink}" stroke-width="7" stroke-linecap="round" class="ch-glow"`)}</g>`;
      return `<g class="ch-eyes"><rect x="${lx - 12}" y="${ey - 14}" width="24" height="${expr === 'sleepy' ? 6 : 28}" rx="8" fill="${ink}" class="ch-glow"/><rect x="${rx - 12}" y="${ey - 14}" width="24" height="${expr === 'sleepy' ? 6 : 28}" rx="8" fill="${ink}" class="ch-glow"/></g>`;
    }
    if (c.shadow || c.sp === 'magician' || c.sp === 'blob' || c.sp === 'mirror') {
      // glowing slit eyes for villains
      const tilt = expr === 'sad' ? -1 : 1;
      const one = (x, s) => P(`M${x - 16} ${ey - 4 * s * tilt} Q${x} ${ey - 16} ${x + 16} ${ey + 4 * s * tilt} Q${x} ${ey + 8} ${x - 16} ${ey - 4 * s * tilt} Z`, ink, 'class="ch-glow"');
      return `<g class="ch-eyes">${one(lx, 1)}${one(rx, -1)}</g>`;
    }
    const closedArc = (x, up) => P(up ? `M${x - 12} ${ey + 2} Q${x} ${ey - 12} ${x + 12} ${ey + 2}` : `M${x - 12} ${ey - 2} Q${x} ${ey + 8} ${x + 12} ${ey - 2}`, 'none', `stroke="${ink}" stroke-width="5" stroke-linecap="round"`);
    const open = (x, s) => {
      const r2 = rr * (s || 1), h = ry * (s || 1);
      return E(x, ey, r2, h, ink) + (c.iris ? E(x, ey + 3, r2 * 0.72, h * 0.62, c.iris, 'opacity=".9"') + E(x, ey + 4, r2 * 0.36, h * 0.36, ink) : '')
        + C(x + r2 * 0.36, ey - h * 0.38, r2 * 0.42, '#fff') + C(x - r2 * 0.36, ey + h * 0.42, r2 * 0.2, '#fff', 'opacity=".9"');
    };
    let L, R;
    if (expr === 'joy' || expr === 'happy') { L = closedArc(lx, true); R = closedArc(rx, true); }
    else if (expr === 'wink') { L = open(lx); R = closedArc(rx, true); }
    else if (expr === 'sleepy') { L = closedArc(lx, false); R = closedArc(rx, false); }
    else if (expr === 'surprised') { L = open(lx, 1.12); R = open(rx, 1.12); }
    else { L = open(lx); R = open(rx); }
    let brows = '';
    if (expr === 'angry') brows = P(`M${lx - 16} ${ey - 26} L${lx + 12} ${ey - 18}`, 'none', `stroke="${c.dark}" stroke-width="6" stroke-linecap="round"`) + P(`M${rx + 16} ${ey - 26} L${rx - 12} ${ey - 18}`, 'none', `stroke="${c.dark}" stroke-width="6" stroke-linecap="round"`);
    if (expr === 'sad') brows = P(`M${lx - 14} ${ey - 20} L${lx + 12} ${ey - 27}`, 'none', `stroke="${c.dark}" stroke-width="5" stroke-linecap="round"`) + P(`M${rx + 14} ${ey - 20} L${rx - 12} ${ey - 27}`, 'none', `stroke="${c.dark}" stroke-width="5" stroke-linecap="round"`);
    if (expr === 'smug') brows = P(`M${lx - 14} ${ey - 24} Q${lx} ${ey - 30} ${lx + 12} ${ey - 24}`, 'none', `stroke="${c.dark}" stroke-width="5" stroke-linecap="round"`);
    return `<g class="ch-eyes">${L}${R}</g>${brows}`;
  }

  function mouth(c, expr) {
    const my = c.sp === 'robot' ? 118 : c.sp === 'mirror' ? 128 : c.sp === 'magician' ? 128 : 118;
    const st = (d, w) => P(d, 'none', `stroke="${c.sp === 'robot' ? c.eye : c.dark}" stroke-width="${w || 4}" stroke-linecap="round" stroke-linejoin="round"`);
    const openM = (w, h) => P(`M${100 - w} ${my} Q100 ${my + h * 2} ${100 + w} ${my} Z`, '#5a1020') + P(`M${100 - w * 0.5} ${my + h * 0.9} Q100 ${my + h * 0.4} ${100 + w * 0.5} ${my + h * 0.9} Q100 ${my + h * 1.5} ${100 - w * 0.5} ${my + h * 0.9} Z`, '#ff6b8a');
    let closed;
    if (c.beak) {
      const b = P(`M86 ${my - 12} Q100 ${my - 18} 114 ${my - 12} Q100 ${my + 6} 86 ${my - 12} Z`, c.beak);
      closed = expr === 'surprised' || expr === 'joy' ? b + P(`M90 ${my - 6} Q100 ${my + 10} 110 ${my - 6} Z`, '#5a1020') : b;
      return `<g class="ch-mouth">${closed}</g>`;
    }
    if (expr === 'sad') closed = st(`M88 ${my + 8} Q100 ${my - 2} 112 ${my + 8}`);
    else if (expr === 'angry') closed = st(`M88 ${my + 6} Q100 ${my} 112 ${my + 6}`, 5);
    else if (expr === 'surprised') closed = E(100, my + 6, 7, 9, '#5a1020');
    else if (expr === 'joy') closed = openM(15, 9);
    else if (expr === 'smug') closed = st(`M88 ${my + 2} Q104 ${my + 10} 114 ${my - 2}`);
    else if (c.sp === 'fox' || c.sp === 'cat') closed = st(`M88 ${my} Q94 ${my + 7} 100 ${my + 1} Q106 ${my + 7} 112 ${my}`);
    else closed = st(`M88 ${my} Q100 ${my + 12} 112 ${my}`);
    // a second, open mouth that blinks on while talking
    return `<g class="ch-mouth">${closed}</g><g class="ch-mouth-open">${openM(11, 7)}</g>`;
  }

  function nose(c) {
    if (['robot', 'ghost', 'blob', 'mirror', 'magician', 'penguin', 'owl'].includes(c.sp)) return '';
    return P('M93 104 Q100 100 107 104 Q104 112 100 112 Q96 112 93 104 Z', c.sp === 'bunny' ? '#ff8fb4' : c.dark);
  }
  const blush = (c) => (c.sp === 'robot' || c.sp === 'mirror' || c.shadow || c.sp === 'magician') ? (c.sp === 'robot' ? `<rect x="50" y="112" width="18" height="6" rx="3" fill="#ff6fb5" opacity=".8"/><rect x="132" y="112" width="18" height="6" rx="3" fill="#ff6fb5" opacity=".8"/>` : '')
    : E(54, 114, 13, 7, '#ff6f91', 'opacity=".45"') + E(146, 114, 13, 7, '#ff6f91', 'opacity=".45"');

  function accessory(c) {
    const a = c.accC;
    switch (c.acc) {
      case 'scarf': return P('M60 156 Q100 172 140 156 Q144 168 138 176 Q100 188 62 176 Q56 168 60 156 Z', a) + P('M124 170 L142 206 L126 204 L118 176 Z', a) + P('M66 164 Q100 176 134 164', 'none', 'stroke="#fff" stroke-width="3" opacity=".5"');
      case 'chef': return `<rect x="66" y="16" width="68" height="26" rx="6" fill="${a}" stroke="#e6dfe8" stroke-width="2"/>` + C(78, 14, 18, a) + C(100, 6, 20, a) + C(122, 14, 18, a);
      case 'captain': return P('M48 44 Q100 4 152 44 Q100 34 48 44 Z', '#16213e') + `<rect x="46" y="40" width="108" height="12" rx="6" fill="#0d1428"/>` + C(100, 32, 8, '#ffd23f');
      case 'headband': return P('M30 64 Q100 40 170 64 L168 76 Q100 54 32 76 Z', a) + P('M160 66 L190 56 L184 74 Z', a) + P('M160 72 L188 86 L176 92 Z', a) + C(100, 54, 6, '#fff');
      case 'nemes': return P('M30 74 Q34 10 100 6 Q166 10 170 74 L188 150 L150 142 L156 80 Q100 40 44 80 L50 142 L12 150 Z', a) + [0, 1, 2, 3, 4].map((i) => P(`M${36 + i * 6} ${84 + i * 14} L${18 + i * 2} ${96 + i * 12}`, 'none', `stroke="${c.acc2}" stroke-width="5"`) + P(`M${164 - i * 6} ${84 + i * 14} L${182 - i * 2} ${96 + i * 12}`, 'none', `stroke="${c.acc2}" stroke-width="5"`)).join('') + P('M92 12 L100 0 L108 12 Q100 22 92 12 Z', '#ff3d5a');
      case 'glasses': return C(72, 92, 22, 'none', `stroke="${a}" stroke-width="5"`) + C(128, 92, 22, 'none', `stroke="${a}" stroke-width="5"`) + P('M94 92 Q100 86 106 92', 'none', `stroke="${a}" stroke-width="5"`) + C(72, 92, 22, '#bfe7ff', 'opacity=".18"') + C(128, 92, 22, '#bfe7ff', 'opacity=".18"');
      case 'explorer': return E(100, 40, 80, 12, a) + P('M58 40 Q60 2 100 2 Q140 2 142 40 Z', a) + `<rect x="58" y="28" width="84" height="10" fill="#7a4a1e"/>`;
      case 'bow': return P('M120 30 Q144 10 150 34 Q144 52 122 40 Z', a) + P('M120 30 Q100 8 92 30 Q100 50 120 40 Z', a) + C(120, 35, 7, '#ff9fd0');
      case 'tophat': return E(100, 44, 74, 10, a) + `<rect x="58" y="-30" width="84" height="74" rx="8" fill="${a}"/>` + `<rect x="58" y="24" width="84" height="12" fill="${c.outfit2}"/>` + P('M126 22 L138 6 L146 22 Z', '#ffe14d', 'class="ch-glow"');
      case 'crown': return P('M68 34 L70 -8 L86 10 L100 -18 L114 10 L130 -8 L132 34 Z', a, `stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"`) + C(100, 14, 6, '#ff3d5a') + C(80, 22, 4, '#fff') + C(120, 22, 4, '#fff');
      case 'mask': return P('M50 80 Q100 60 150 80 Q150 104 128 106 Q100 96 72 106 Q50 104 50 80 Z', a, 'opacity=".95"');
      default: return '';
    }
  }

  function body(c) {
    if (c.sp === 'ghost') {
      return `<path d="M30 110 Q28 30 100 26 Q172 30 170 110 L170 196 Q156 214 142 196 Q128 214 114 196 Q100 214 86 196 Q72 214 58 196 Q44 214 30 196 Z" fill="url(#gF-${c.k})" stroke="${c.fur2}" stroke-width="3"/>`
        + E(36, 150, 12, 18, c.fur2, 'transform="rotate(30 36 150)"') + E(164, 150, 12, 18, c.fur2, 'transform="rotate(-30 164 150)"');
    }
    if (c.sp === 'blob') {
      return `<path d="M24 200 Q14 120 50 70 Q100 20 150 70 Q186 120 176 200 Z" fill="url(#gF-${c.k})"/>` + E(100, 204, 80, 10, '#000', 'opacity=".25"');
    }
    if (c.sp === 'mirror') return `<rect x="88" y="176" width="24" height="30" fill="${c.dark}"/>` + E(100, 210, 50, 10, c.fur);
    if (c.sp === 'magician') {
      return P('M30 216 Q40 130 100 140 Q160 130 170 216 Z', c.outfit, `stroke="${c.outfit2}" stroke-width="3"`) + P('M70 150 L100 196 L130 150', 'none', `stroke="${c.outfit2}" stroke-width="4"`) + E(100, 150, 22, 8, '#fff');
    }
    const tail = c.tail ? (c.sp === 'fox'
      ? P('M138 196 Q206 182 190 116 Q184 96 168 106 Q182 152 132 176 Z', c.fur, `stroke="${c.fur}" stroke-width="4" stroke-linejoin="round"`) + P('M176 112 Q184 96 190 116 Q192 128 186 138 Q178 124 176 112 Z', c.light)
      : c.sp === 'dragon' ? P('M132 196 Q190 196 196 150 L182 158 Q176 182 130 180 Z', c.fur) + P('M196 150 L204 136 L188 146 Z', c.light)
        : P('M136 198 Q200 196 190 140 Q186 124 174 132 Q184 176 132 184 Z', c.fur) + (c.tailRing ? P('M182 150 Q190 152 192 160', 'none', `stroke="${c.dark}" stroke-width="8" opacity=".4"`) + P('M178 172 Q186 176 186 184', 'none', `stroke="${c.dark}" stroke-width="8" opacity=".4"`) : '')) : '';
    const wings = c.sp === 'owl' || c.sp === 'penguin' ? E(50, 186, 14, 28, c.fur, 'transform="rotate(18 50 186)"') + E(150, 186, 14, 28, c.fur, 'transform="rotate(-18 150 186)"') : '';
    const arms = c.sp === 'owl' || c.sp === 'penguin' ? '' : E(56, 184, 12, 17, c.fur, 'transform="rotate(26 56 184)"') + E(144, 184, 12, 17, c.fur, 'transform="rotate(-26 144 184)"');
    const legs = c.sp === 'robot' ? `<rect x="72" y="204" width="18" height="14" rx="5" fill="${c.dark}"/><rect x="110" y="204" width="18" height="14" rx="5" fill="${c.dark}"/>` : E(78, 212, 16, 9, c.sp === 'penguin' || c.sp === 'owl' ? (c.beak || c.fur) : c.fur) + E(122, 212, 16, 9, c.sp === 'penguin' || c.sp === 'owl' ? (c.beak || c.fur) : c.fur);
    const torso = c.sp === 'robot'
      ? `<rect x="56" y="150" width="88" height="60" rx="18" fill="url(#gO-${c.k})" stroke="${c.dark}" stroke-width="3"/>` + C(100, 178, 9, c.outfit2, 'class="ch-glow"')
      : E(100, 186, 46, 32, `url(#gO-${c.k})`) + E(100, 192, 26, 20, c.sp === 'penguin' || c.sp === 'owl' ? c.light : c.outfit2, 'opacity=".9"');
    return tail + legs + wings + torso + arms;
  }

  function defs(c) {
    const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    return `<defs>${g('gF-' + c.k, c.fur2, c.fur)}${g('gO-' + c.k, c.outfit2 === c.light ? c.outfit : lighten(c.outfit), c.outfit)}
      <radialGradient id="gM-${c.k}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${c.light}"/><stop offset="1" stop-color="#7aa7d8"/></radialGradient></defs>`;
  }
  function lighten(hex) { return root.U && root.U.shade ? root.U.shade(hex, 0.25) : hex; }

  let uid = 0;
  function svg(id, expr, opts) {
    const base = CH[id] || CH.lumi;
    const c = Object.assign({}, base, { k: 'c' + (++uid) });
    expr = expr || 'smile';
    const flip = opts && opts.flip ? ' transform="translate(200 0) scale(-1 1)"' : '';
    const head = c.sp === 'ghost' || c.sp === 'blob' ? '' : ears(c) + headShape(c);
    const hatBehind = c.acc === 'nemes' ? accessory(c) : '';
    const hatFront = c.acc === 'nemes' ? '' : accessory(c);
    const shine = c.sp === 'robot' || c.sp === 'mirror' ? '' : E(74, 56, 22, 10, '#fff', 'opacity=".22" transform="rotate(-20 74 56)"');
    return `<svg class="ch-svg" viewBox="-10 -34 220 260" xmlns="http://www.w3.org/2000/svg">${defs(c)}<g${flip}><g class="ch-root">
      <ellipse cx="100" cy="218" rx="60" ry="9" fill="#000" opacity=".28" class="ch-shadow"/>
      ${body(c)}<g class="ch-head">${hatBehind}${head}${faceMask(c)}${shine}${eyes(c, expr)}${blush(c)}${nose(c)}${mouth(c, expr)}${hatFront}</g></g></g></svg>`;
  }

  function el(id, expr, opts) {
    const d = document.createElement('div');
    d.className = 'chara' + (opts && opts.cls ? ' ' + opts.cls : '') + ((CH[id] || {}).shadow || id === 'nocturne' || id === 'mirror' || id === 'minion' ? ' villain' : '');
    d.dataset.id = id;
    d.innerHTML = svg(id, expr, opts);
    return d;
  }
  function set(d, expr) { d.innerHTML = svg(d.dataset.id, expr, { flip: d.classList.contains('flip') }); }

  root.Chara = { CH, svg, el, set, name: (id) => (CH[id] || {}).name || id };
})(window);
