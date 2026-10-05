/* 팡팡 프렌즈 (match3): time-attack match-3 in the style of the classic Anipang.
   7×7 board of hand-drawn animal faces. Swap by drag or tap-tap; 4-in-line → line blaster,
   L/T → bomb, 5-in-line → rainbow; special+special combos; combo timer & FEVER TIME.
   Reach the target score (and the optional collect mission) before the clock runs out. */
(function (root) {
  const { Base, util } = root.QuestGames; const U = root.U, A = root.SlotAudio;
  const SEC = '팡팡프렌즈';
  const DEF = {
    입장료: 100, 클리어보상: 300, 시간연장_가격: 150, 시간연장_초: 15,
    제한시간: 60,
    목표점수_시작: 3000, 목표점수_최대: 26000, 목표증가_완만도: 32,
    별2_배수: 1.4, 별3_배수: 1.9,
    동물종류_시작: 5, 동물6종_시작판: 4,
    수집미션_시작판: 5, 수집미션_확률: 50, 수집개수_시작: 10, 수집개수_최대: 30,
    콤보유지_초_시작: 3, 콤보유지_초_최소: 2,
    피버_필요개수_시작: 36, 피버_필요개수_최대: 60, 피버_시간: 7,
    힌트_가격: 40, 섞기_가격: 60, 자동힌트_초: 5,
    콤보_보상: 4, 피버_보상: 30, 보너스_최대: 250,
  };
  const N = 7;
  const FONT_KR = '"Black Han Sans","Noto Sans KR",sans-serif';
  const FONT_NUM = '"Oxanium","Bungee","Arial Black",sans-serif';
  const TAU = Math.PI * 2;
  const ANI = [
    { n: '여우', c: '#ff8f3a', hi: '#ffc58c', dk: '#e2601a', ol: '#7e3006' },
    { n: '판다', c: '#f4f5fb', hi: '#ffffff', dk: '#c9cddd', ol: '#24243a' },
    { n: '토끼', c: '#ffa3cd', hi: '#ffd9ec', dk: '#ee6fa6', ol: '#8f2a58' },
    { n: '병아리', c: '#ffe04a', hi: '#fff6b0', dk: '#f2b300', ol: '#8a5d00' },
    { n: '고양이', c: '#7cc2ff', hi: '#cde9ff', dk: '#4790e6', ol: '#1b4688' },
    { n: '개구리', c: '#78dc5c', hi: '#c8f8ad', dk: '#3daa38', ol: '#1a641c' },
  ];
  const SP_KR = { h: '가로 블래스터', v: '세로 블래스터', bomb: '폭탄', rainbow: '무지개' };
  const rr = util.rr;

  /* ---------- sprite painting ---------- */
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function tri(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.lineTo(p[4], p[5]); g.closePath(); }
  function paintAnimal(g, s, k, blink) {
    const a = ANI[k];
    let cx = s / 2, cy = s * 0.56, R = s * 0.35;
    if (k === 2) { cy = s * 0.6; R = s * 0.33; }
    if (k === 5) { cy = s * 0.6; }
    const lw = s * 0.026;
    g.lineJoin = 'round'; g.lineCap = 'round';
    // soft drop shadow
    ell(g, cx, cy + R * 0.98, R * 0.78, R * 0.16); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fill();
    const body = (path) => {
      const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.5, R * 0.08, cx, cy, R * 1.15);
      gr.addColorStop(0, a.hi); gr.addColorStop(0.5, a.c); gr.addColorStop(1, a.dk);
      path(); g.fillStyle = gr; g.fill(); g.strokeStyle = a.ol; g.lineWidth = lw; g.stroke();
    };
    // ---- ears / behind-head parts
    if (k === 0 || k === 4) {
      const up = k === 0 ? 1.45 : 1.32;
      for (const sd of [-1, 1]) {
        const p = [cx + sd * R * 0.98, cy - R * 0.18, cx + sd * R * 0.82, cy - R * up, cx + sd * R * 0.2, cy - R * 0.86];
        body(() => tri(g, p));
        const q = [cx + sd * R * 0.82, cy - R * 0.45, cx + sd * R * 0.78, cy - R * (up - 0.25), cx + sd * R * 0.42, cy - R * 0.85];
        tri(g, q); g.fillStyle = k === 0 ? '#5a2410' : '#ffb3cf'; g.fill();
      }
    } else if (k === 1) {
      for (const sd of [-1, 1]) { ell(g, cx + sd * R * 0.74, cy - R * 0.74, R * 0.34, R * 0.34); g.fillStyle = '#2a2a3e'; g.fill(); g.strokeStyle = a.ol; g.lineWidth = lw; g.stroke(); }
    } else if (k === 2) {
      for (const sd of [-1, 1]) {
        body(() => ell(g, cx + sd * R * 0.42, cy - R * 1.12, R * 0.26, R * 0.56, sd * 0.16));
        ell(g, cx + sd * R * 0.42, cy - R * 1.08, R * 0.12, R * 0.4, sd * 0.16); g.fillStyle = '#ff6fa6'; g.fill();
      }
    } else if (k === 3) {
      for (let i = -1; i <= 1; i++) body(() => ell(g, cx + i * R * 0.2, cy - R * 1.02 - (i ? 0 : R * 0.08), R * 0.11, R * 0.24, i * 0.5));
    } else if (k === 5) {
      for (const sd of [-1, 1]) body(() => ell(g, cx + sd * R * 0.5, cy - R * 0.62, R * 0.36, R * 0.34));
    }
    // ---- head
    if (k === 5) body(() => ell(g, cx, cy + R * 0.06, R * 1.06, R * 0.84));
    else body(() => ell(g, cx, cy, R, R * (k === 1 ? 0.95 : 0.97)));
    // ---- face markings
    g.save();
    if (k === 0) {
      ell(g, cx, cy, R - lw * 0.5, R * 0.97 - lw * 0.5); g.clip();
      for (const sd of [-1, 1]) { ell(g, cx + sd * R * 0.36, cy + R * 0.52, R * 0.52, R * 0.44); g.fillStyle = '#fff6ea'; g.fill(); }
    }
    g.restore();
    if (k === 1) for (const sd of [-1, 1]) { ell(g, cx + sd * R * 0.37, cy + R * 0.0, R * 0.25, R * 0.32, sd * -0.55); g.fillStyle = '#2a2a3e'; g.fill(); }
    // ---- blush
    for (const sd of [-1, 1]) { ell(g, cx + sd * R * 0.62, cy + R * 0.3, R * 0.19, R * 0.11); g.fillStyle = k === 2 ? 'rgba(255,60,120,0.45)' : 'rgba(255,92,140,0.5)'; g.fill(); }
    // ---- eyes
    const ey = k === 5 ? cy - R * 0.64 : cy - R * 0.02, ex = k === 5 ? R * 0.5 : R * 0.36;
    for (const sd of [-1, 1]) {
      const x = cx + sd * ex;
      if (k === 5 && !blink) { ell(g, x, ey, R * 0.25, R * 0.25); g.fillStyle = '#fff'; g.fill(); }
      if (blink) {
        g.beginPath(); g.arc(x, ey + R * 0.08, R * 0.14, Math.PI * 1.15, Math.PI * 1.85);
        g.strokeStyle = k === 1 ? '#fff' : '#2a1a2e'; g.lineWidth = R * 0.075; g.stroke();
      } else {
        const er = k === 5 ? 0.15 : 0.17;
        ell(g, x, ey, R * er, R * (er + 0.04)); g.fillStyle = '#21142a'; g.fill();
        if (k === 1) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = lw * 0.6; g.stroke(); }
        ell(g, x - R * 0.06, ey - R * 0.08, R * 0.075, R * 0.075); g.fillStyle = '#fff'; g.fill();
        ell(g, x + R * 0.06, ey + R * 0.07, R * 0.035, R * 0.035); g.fill();
      }
    }
    // ---- nose / mouth
    const my = cy + R * 0.3;
    g.strokeStyle = a.ol; g.lineWidth = lw * 1.05;
    if (k === 3) {
      g.beginPath(); g.moveTo(cx - R * 0.17, my - R * 0.06); g.lineTo(cx, my - R * 0.2); g.lineTo(cx + R * 0.17, my - R * 0.06); g.lineTo(cx, my + R * 0.1); g.closePath();
      g.fillStyle = '#ff8a1e'; g.fill(); g.strokeStyle = '#a24a00'; g.stroke();
      g.beginPath(); g.moveTo(cx - R * 0.17, my - R * 0.06); g.lineTo(cx + R * 0.17, my - R * 0.06); g.stroke();
    } else if (k === 5) {
      g.beginPath(); g.arc(cx, cy + R * 0.02, R * 0.48, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
    } else {
      ell(g, cx, my - R * 0.08, R * (k === 2 ? 0.07 : 0.09), R * 0.06); g.fillStyle = k === 2 || k === 4 ? '#ff5c95' : '#2a1a2e'; g.fill();
      g.beginPath(); g.arc(cx - R * 0.08, my, R * 0.08, 0.1 * Math.PI, 0.9 * Math.PI); g.arc(cx + R * 0.08, my, R * 0.08, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
      if (k === 4) {
        g.lineWidth = lw * 0.7; g.strokeStyle = 'rgba(30,60,120,0.75)';
        for (const sd of [-1, 1]) for (const d of [-0.07, 0.07]) { g.beginPath(); g.moveTo(cx + sd * R * 0.55, my - R * 0.06 + d * R); g.lineTo(cx + sd * R * 1.02, my - R * 0.1 + d * R * 2.2); g.stroke(); }
      }
    }
    // ---- gloss
    g.save(); g.globalAlpha = 0.55;
    ell(g, cx - R * 0.38, cy - R * 0.55, R * 0.3, R * 0.15, -0.55); g.fillStyle = '#fff'; g.fill();
    ell(g, cx - R * 0.66, cy - R * 0.25, R * 0.06, R * 0.06); g.fill();
    g.restore();
  }
  function paintRainbow(g, s) {
    const cx = s / 2, cy = s / 2, R = s * 0.38;
    ell(g, cx, cy + R * 0.98, R * 0.8, R * 0.16); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fill();
    let fill;
    if (g.createConicGradient) {
      fill = g.createConicGradient(0, cx, cy);
      ['#ff4d6d', '#ffa53a', '#ffe94a', '#57e36a', '#3ac8ff', '#7a6bff', '#ff5ce1', '#ff4d6d'].forEach((c, i, arr) => fill.addColorStop(i / (arr.length - 1), c));
    } else { fill = g.createLinearGradient(cx - R, cy, cx + R, cy); fill.addColorStop(0, '#ff4d6d'); fill.addColorStop(0.5, '#ffe94a'); fill.addColorStop(1, '#3ac8ff'); }
    ell(g, cx, cy, R, R); g.fillStyle = fill; g.fill();
    const sh = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R);
    sh.addColorStop(0, 'rgba(255,255,255,0.85)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.15)'); sh.addColorStop(1, 'rgba(40,0,80,0.45)');
    g.fillStyle = sh; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = s * 0.03; g.stroke();
    // star centre
    g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.22 : R * 0.52, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); }
    g.closePath(); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = s * 0.12; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,170,40,0.9)'; g.lineWidth = s * 0.02; g.stroke();
    // tiny face on the star
    for (const sd of [-1, 1]) { ell(g, cx + sd * R * 0.13, cy - R * 0.02, R * 0.045, R * 0.06); g.fillStyle = '#3a1a4a'; g.fill(); }
    g.beginPath(); g.arc(cx, cy + R * 0.08, R * 0.07, 0.1 * Math.PI, 0.9 * Math.PI); g.strokeStyle = '#3a1a4a'; g.lineWidth = s * 0.015; g.stroke();
  }
  function paintLine(g, s) { // horizontal blaster overlay
    const cx = s / 2, cy = s * 0.56, R = s * 0.35, h = R * 0.3;
    g.save();
    g.shadowColor = '#fff'; g.shadowBlur = s * 0.08;
    rr(g, cx - R * 0.95, cy + R * 0.42 - h / 2, R * 1.9, h, h / 2);
    const gr = g.createLinearGradient(0, cy + R * 0.42 - h / 2, 0, cy + R * 0.42 + h / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,240,170,0.9)');
    g.fillStyle = gr; g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,120,0,0.9)'; g.lineWidth = s * 0.015; g.stroke();
    for (const sd of [-1, 1]) {
      const x = cx + sd * R * 1.02, y = cy + R * 0.42;
      g.beginPath(); g.moveTo(x + sd * R * 0.32, y); g.lineTo(x - sd * R * 0.02, y - R * 0.26); g.lineTo(x - sd * R * 0.02, y + R * 0.26); g.closePath();
      g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#ff7a00'; g.lineWidth = s * 0.018; g.stroke();
    }
    // chevrons inside the band
    g.strokeStyle = '#ff8a00'; g.lineWidth = s * 0.02;
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      const x = cx + sd * R * (0.3 + i * 0.28), y = cy + R * 0.42;
      g.beginPath(); g.moveTo(x - sd * R * 0.07, y - R * 0.09); g.lineTo(x + sd * R * 0.04, y); g.lineTo(x - sd * R * 0.07, y + R * 0.09); g.stroke();
    }
  }
  function paintBomb(g, s) { // ring overlay drawn rotating behind/above the face
    const cx = s / 2, cy = s / 2, R = s * 0.47;
    g.lineWidth = s * 0.045; g.setLineDash([s * 0.08, s * 0.05]);
    g.strokeStyle = '#ffd23a'; g.shadowColor = '#ffb000'; g.shadowBlur = s * 0.1;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.setLineDash([]); g.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const an = i * TAU / 4 + 0.4, x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R;
      g.beginPath();
      for (let j = 0; j < 8; j++) { const r = j % 2 ? s * 0.025 : s * 0.075, a2 = j * Math.PI / 4; g.lineTo(x + Math.cos(a2) * r, y + Math.sin(a2) * r); }
      g.closePath(); g.fillStyle = '#fff6c0'; g.fill();
    }
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
    g.closePath();
  }

  /* ---------- sounds (A.kit) ---------- */
  const K = () => A.kit && A.kit.ok() ? A.kit : null;
  const S = {
    tap() { const k = K(); if (!k) return; const t = k.now(); k.tone('sine', 900, 1300, t, 0.05, 0.08); },
    swap() { const k = K(); if (!k) return; const t = k.now(); k.tone('sine', 480, 860, t, 0.1, 0.12); k.noise(t, 0.08, 0.06, 'bandpass', 2600, 1.4); },
    back() { const k = K(); if (!k) return; const t = k.now(); k.tone('sine', 420, 230, t, 0.11, 0.16); k.tone('sine', 230, 360, t + 0.1, 0.1, 0.12); k.play('pluck', k.note(0, 0), t + 0.02, 0.1, 0.12); },
    pop(c, fever) {
      const k = K(); if (!k) return; const t = k.now(); const n = Math.min(c, 10) + (fever ? 4 : 0);
      k.play('marimba', k.note(n + 2, 1), t, 0.14, 0.34, k.rv(0.25));
      k.play('celesta', k.note(n + 4, 1), t + 0.04, 0.16, 0.22, k.rv(0.4));
      k.tone('sine', 520 + n * 70, 1500 + n * 120, t, 0.07, 0.14);
      k.noise(t, 0.06, 0.08, 'highpass', 4500, 0.7);
    },
    land() { const k = K(); if (!k) return; const t = k.now(); k.tone('sine', 210, 120, t, 0.05, 0.05); },
    make(sp) {
      const k = K(); if (!k) return; const t = k.now(); const b = sp === 'rainbow' ? 7 : sp === 'bomb' ? 4 : 2;
      [0, 2, 4, 7].forEach((d, i) => k.play('bell', k.note(b + d, 1), t + i * 0.05, 0.3, 0.2, k.rv(0.5)));
    },
    line() { const k = K(); if (!k) return; const t = k.now(); k.noise(t, 0.32, 0.22, 'bandpass', 900, 1, { sweep: 7000, attack: 0.02 }); k.tone('sawtooth', 260, 1300, t, 0.22, 0.07); k.tone('sine', 900, 1800, t, 0.2, 0.1); },
    bomb() { const k = K(); if (!k) return; const t = k.now(); k.tone('sine', 150, 38, t, 0.45, 0.55); k.noise(t, 0.45, 0.4, 'lowpass', 1100, 0.8); k.noise(t, 0.15, 0.15, 'highpass', 3000, 0.7); },
    rainbow() { const k = K(); if (!k) return; const t = k.now(); for (let i = 0; i < 8; i++) k.play('celesta', k.note(i * 2 + 3, 1), t + i * 0.04, 0.25, 0.2, k.rv(0.6)); k.noise(t, 0.6, 0.18, 'bandpass', 500, 1, { sweep: 9000, attack: 0.15 }); k.tone('sine', 120, 50, t + 0.1, 0.4, 0.4); },
    combo(n) { const k = K(); if (!k) return; const t = k.now(); k.play('bell', k.note(Math.min(n, 14) + 4, 1), t, 0.35, 0.22, k.rv(0.5)); },
    fever() { const k = K(); if (!k) return; const t = k.now(); [0, 2, 4, 7].forEach((d) => k.play('brass', k.note(d + 7, 0), t, 0.5, 0.22, k.rv(0.4))); for (let i = 0; i < 6; i++) k.play('chip', k.note(i * 2 + 7, 1), t + 0.25 + i * 0.05, 0.08, 0.12); k.noise(t, 0.7, 0.2, 'bandpass', 400, 1, { sweep: 8000, attack: 0.3 }); },
    beat(i) { const k = K(); if (!k) return; const t = k.now(); if (i % 2 === 0) k.tone('sine', 140, 50, t, 0.12, 0.22); k.noise(t, 0.035, i % 2 ? 0.1 : 0.06, 'highpass', 7000, 0.8); if (i % 4 === 2) k.play('chip', k.note([0, 4, 2, 5][(i >> 2) & 3] + 7, 1), t, 0.07, 0.07); },
    goal() { const k = K(); if (!k) return; const t = k.now(); [0, 4, 7, 11].forEach((d, i) => k.play('bell', k.note(d, 1), t + i * 0.08, 0.4, 0.25, k.rv(0.5))); },
    ready() { const k = K(); if (!k) return; const t = k.now(); k.play('marimba', k.note(4, 1), t, 0.12, 0.25); k.play('marimba', k.note(7, 1), t + 0.12, 0.2, 0.3); },
  };

  class Match3 extends Base {
    static info = { id: 'match3', name: '팡팡 프렌즈', icon: '🐼', section: SEC, color: '#ff8f3a', desc: '같은 동물 3마리를 이어서 팡팡! 60초 안에 목표 점수를 넘기세요.' };
    static howto = ['동물을 끌어서 옆 칸과 바꾸면 같은 동물 3마리가 줄을 지어 팡!', '4개는 줄 블래스터, ㄱ·T자는 폭탄, 5개는 무지개가 돼요. 특수끼리 바꾸면 대폭발!', '빠르게 계속 맞추면 콤보, 게이지가 차면 FEVER TIME(점수 2배)!', '시간이 끝날 때 목표 점수를 넘기면 클리어!'];
    static params(stage, C) {
      const d = util.cfg(C, SEC, DEF);
      const e = util.ease(stage, d.목표증가_완만도);
      const target = Math.round(util.lerp(d.목표점수_시작, d.목표점수_최대, e) / 100) * 100;
      return {
        fee: d.입장료, reward: d.클리어보상, extendCost: d.시간연장_가격, extendSec: d.시간연장_초, extendText: `+${d.시간연장_초}초`,
        time: d.제한시간, timeBonus: 0,
        target, star: [target, Math.round(target * d.별2_배수 / 100) * 100, Math.round(target * d.별3_배수 / 100) * 100],
        kinds: stage >= d.동물6종_시작판 ? 6 : U.clamp(Math.round(d.동물종류_시작), 4, 6),
        collectFrom: d.수집미션_시작판, collectChance: d.수집미션_확률 / 100,
        collectN: Math.round(util.lerp(d.수집개수_시작, d.수집개수_최대, util.ease(Math.max(1, stage - d.수집미션_시작판 + 1), 40))),
        comboWin: util.lerp(d.콤보유지_초_시작, d.콤보유지_초_최소, util.ease(stage, 40)),
        feverNeed: Math.round(util.lerp(d.피버_필요개수_시작, d.피버_필요개수_최대, util.ease(stage, 40))), feverTime: d.피버_시간,
        hintCost: d.힌트_가격, shuffleCost: d.섞기_가격, autoHint: stage <= 3 ? Math.min(2.5, d.자동힌트_초) : d.자동힌트_초,
        comboBonus: d.콤보_보상, feverBonus: d.피버_보상, bonusMax: d.보너스_최대,
      };
    }

    constructor(host, o) {
      super(host, o);
      const p = this.p;
      this.stage = o.stage || 1;
      this.timed = false;              // the clock is run by update() (it waits for the intro and the last cascade)
      this.kinds = p.kinds;
      this.target = p.target;
      this.mission = null;
      if (this.stage >= p.collectFrom && (this.stage === p.collectFrom || this.rnd() < p.collectChance)) this.mission = { k: Math.floor(this.rnd() * this.kinds), n: p.collectN, got: 0, done: false };
      this.hud({
        title: '팡팡 프렌즈', sub: `${this.stage}판 · 목표 ${U.fmt(this.target)}점`, timer: true,
        tools: [{ id: 'hint', ico: '💡', label: '힌트', cost: p.hintCost }, { id: 'shuffle', ico: '🔀', label: '섞기', cost: p.shuffleCost }],
      });
      this.cache = new Map();
      this.gt = 0; this.hs = 0;
      this.state = 'fall'; this.started = false; this.ending = false; this.bonusRounds = 0;
      this.combo = 0; this.comboT = 0; this.maxCombo = 0; this.cascade = 0;
      this.fever = false; this.feverG = 0; this.feverEnd = 0; this.fevers = 0; this.beatI = 0; this.beatT = 0;
      this.dispScore = 0; this.goalShown = false;
      this.pops = []; this.beams = []; this.zaps = []; this.flashes = [];
      this.sel = null; this.drag = null; this.hint = null; this.idleT = 0; this.hintPaid = false;
      this.uid = 1;
      this.newBoard();
      // intro: everything drops in
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const pc = this.grid[r][c]; pc.y = r - N - 0.6 - c * 0.18 - (N - r) * 0.12; pc.vy = 0; }
      const cv = this.ui.cv;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', (e) => this.down(e));
      cv.addEventListener('pointermove', (e) => this.move(e));
      const up = () => { this.drag = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      this.layout();
      this.banner('준비~', 'info', 900);
    }

    /* ---------- board ---------- */
    piece(k) { return { k, sp: null, id: this.uid++, x: 0, y: 0, vy: 0, land: -9, tw: null, bl: Math.random() * 4, ph: Math.random() * TAU, made: -9 }; }
    newBoard() {
      for (let tries = 0; tries < 200; tries++) {
        this.grid = [];
        for (let r = 0; r < N; r++) {
          const row = [];
          for (let c = 0; c < N; c++) {
            let k;
            do { k = Math.floor(this.rnd() * this.kinds); }
            while ((c >= 2 && row[c - 1].k === k && row[c - 2].k === k) || (r >= 2 && this.grid[r - 1][c].k === k && this.grid[r - 2][c].k === k));
            const pc = this.piece(k); pc.x = c; pc.y = r; row.push(pc);
          }
          this.grid.push(row);
        }
        if (this.findMoves().length >= (this.stage <= 3 ? 6 : 3)) return;
      }
    }
    kindAt(r, c) { const p = this.grid[r] && this.grid[r][c]; return !p || p.sp === 'rainbow' ? -1 : p.k; }
    findGroups() {
      const runs = [], owner = new Map();
      for (let dir = 0; dir < 2; dir++) {
        for (let a = 0; a < N; a++) {
          let b = 0;
          while (b < N) {
            const k = dir ? this.kindAt(b, a) : this.kindAt(a, b);
            let len = 1;
            while (b + len < N && k >= 0 && (dir ? this.kindAt(b + len, a) : this.kindAt(a, b + len)) === k) len++;
            if (k >= 0 && len >= 3) {
              const cells = [];
              for (let i = 0; i < len; i++) cells.push(dir ? [b + i, a] : [a, b + i]);
              runs.push({ h: !dir, cells, len, k, g: runs.length });
            }
            b += len;
          }
        }
      }
      // union runs that share a cell (L / T / + shapes)
      const find = (i) => { while (runs[i].g !== i) i = runs[i].g = runs[runs[i].g].g; return i; };
      runs.forEach((run, i) => run.cells.forEach(([r, c]) => {
        const key = r * N + c;
        if (owner.has(key)) { const a = find(owner.get(key)), b = find(i); if (a !== b) runs[b].g = a; run.x = key; runs[owner.get(key)].x = key; }
        else owner.set(key, i);
      }));
      const groups = new Map();
      runs.forEach((run, i) => {
        const root = find(i);
        let G = groups.get(root);
        if (!G) { G = { cells: new Map(), k: run.k, maxLen: 0, h: false, v: false, longest: null, cross: null }; groups.set(root, G); }
        run.cells.forEach(([r, c]) => G.cells.set(r * N + c, [r, c]));
        if (run.len > G.maxLen) { G.maxLen = run.len; G.longest = run; }
        if (run.h) G.h = true; else G.v = true;
        if (run.x != null) G.cross = run.x;
      });
      return [...groups.values()];
    }
    swapGrid(a, b) { const g = this.grid, t = g[a[0]][a[1]]; g[a[0]][a[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = t; }
    isCombo(p, q) { return p && q && ((p.sp && q.sp) || p.sp === 'rainbow' || q.sp === 'rainbow'); }
    findMoves() {
      const out = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= N || c2 >= N) continue;
          const p = this.grid[r][c], q = this.grid[r2][c2];
          if (!p || !q) continue;
          if (this.isCombo(p, q)) { out.push({ a: [r, c], b: [r2, c2], v: 40 + (p.sp ? 10 : 0) + (q.sp ? 10 : 0) }); continue; }
          this.swapGrid([r, c], [r2, c2]);
          const gs = this.findGroups();
          this.swapGrid([r, c], [r2, c2]);
          if (gs.length) {
            let v = 0;
            gs.forEach((G) => { v += G.cells.size + (G.maxLen >= 5 ? 20 : G.h && G.v ? 10 : G.maxLen === 4 ? 6 : 0); G.cells.forEach(([rr2, cc]) => { if (this.grid[rr2][cc] && this.grid[rr2][cc].sp) v += 5; }); });
            if (this.mission && !this.mission.done && gs.some((G) => G.k === this.mission.k)) v += 2;
            out.push({ a: [r, c], b: [r2, c2], v });
          }
        }
      }
      return out;
    }

    /* ---------- layout ---------- */
    layout() {
      if (!this.fit()) return;
      const W = this.W, H = this.H, gap = 8;
      this.side = W > H * 1.2;
      if (this.side) {
        const sw = U.clamp(W * 0.24, 170, 270);
        const bs = Math.floor(Math.min(H - 16, W - sw - gap * 3) / 1.045);
        const tw = bs + gap + sw, x0 = (W - tw) / 2, y0 = (H - bs) / 2;
        this.bx = x0 + sw + gap; this.by = y0; this.bs = bs;
        const hs = [0.22, 0.19, 0.19, 0.075], tot = hs[0] + hs[1] + hs[3] + 0.04 + (this.mission ? hs[2] + 0.02 : 0);
        let y = y0 + (bs - bs * tot) / 2;
        this.rT = [x0, y, sw, bs * hs[0]]; y += bs * hs[0] + bs * 0.02;
        this.rC = [x0, y, sw, bs * hs[1]]; y += bs * hs[1] + bs * 0.02;
        if (this.mission) { this.rO = [x0, y, sw, bs * hs[2]]; y += bs * hs[2] + bs * 0.02; } else this.rO = null;
        this.rF = [x0, y, sw, bs * hs[3]];
      } else {
        const th0 = U.clamp(Math.min(W, H) * 0.15, 56, 92), fh = U.clamp(W * 0.065, 22, 34);
        const bs = Math.floor(Math.min(W - 8, H - th0 - fh - gap * 2 - 4) / 1.045);
        const tot = th0 + gap + bs + gap + fh, y0 = Math.max(0, (H - tot) / 2), x0 = (W - bs) / 2;
        this.bx = x0; this.by = y0 + th0 + gap; this.bs = bs;
        const cw = th0 * 1.25, ow = this.mission ? th0 * 1.45 : 0;
        this.rT = [x0, y0, bs - cw - ow - (this.mission ? 12 : 6), th0];
        this.rC = [x0 + this.rT[2] + 6, y0, cw, th0];
        this.rO = this.mission ? [this.rC[0] + cw + 6, y0, ow, th0] : null;
        this.rF = [x0, this.by + bs + gap, bs, fh];
      }
      this.cs = this.bs / N;
      this.cache.clear(); this.bgc = null;
    }
    spr(key, size, paint) {
      let cv = this.cache.get(key);
      if (cv) return cv;
      cv = document.createElement('canvas');
      const px = Math.ceil(size * this.dpr);
      cv.width = cv.height = px;
      const g = cv.getContext('2d');
      g.scale(px / size, px / size);
      paint(g, size);
      this.cache.set(key, cv);
      return cv;
    }
    animal(k, blink) { const s = Math.round(this.cs); return this.spr(`a${k}${blink ? 'b' : ''}|${s}`, s, (g, z) => paintAnimal(g, z, k, blink)); }
    cellAt(e) {
      const [x, y] = this.local(e);
      const c = Math.floor((x - this.bx) / this.cs), r = Math.floor((y - this.by) / this.cs);
      return r >= 0 && c >= 0 && r < N && c < N ? [r, c] : null;
    }
    cx(c) { return this.bx + (c + 0.5) * this.cs; }
    cy(r) { return this.by + (r + 0.5) * this.cs; }

    /* ---------- input ---------- */
    canPlay() { return this.running && !this.paused && this.started && !this.ending && this.state === 'idle'; }
    down(e) {
      A.init && A.init();
      if (!this.canPlay()) return;
      const cell = this.cellAt(e);
      if (!cell) { this.sel = null; return; }
      try { this.ui.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (this.sel && Math.abs(this.sel[0] - cell[0]) + Math.abs(this.sel[1] - cell[1]) === 1) { const a = this.sel; this.sel = null; this.trySwap(a, cell); return; }
      const [x, y] = this.local(e);
      this.drag = { cell, x, y };
      this.sel = (this.sel && this.sel[0] === cell[0] && this.sel[1] === cell[1]) ? null : cell;
      this.selT = this.gt;
      S.tap();
    }
    move(e) {
      if (!this.drag || !this.canPlay()) return;
      const [x, y] = this.local(e), dx = x - this.drag.x, dy = y - this.drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cs * 0.28) return;
      const [r, c] = this.drag.cell;
      const t = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      this.drag = null;
      if (t[0] < 0 || t[1] < 0 || t[0] >= N || t[1] >= N) return;
      this.sel = null;
      this.trySwap([r, c], t);
    }
    trySwap(a, b) {
      this.idleT = 0; this.hint = null;
      this.swapCells = [a, b];
      this.swapGrid(a, b);
      this.tween(this.grid[a[0]][a[1]], a, 0.13); this.tween(this.grid[b[0]][b[1]], b, 0.13);
      this.state = 'swap';
      S.swap();
    }
    tween(p, [r, c], dur) { p.tw = { x0: p.x, y0: p.y, x1: c, y1: r, t0: this.gt, d: dur }; }
    afterSwap() {
      const [a, b] = this.swapCells;
      const pa = this.grid[a[0]][a[1]], pb = this.grid[b[0]][b[1]];
      if (this.isCombo(pa, pb)) { this.cascade = 0; this.comboSwap(a, b); return; }
      const gs = this.findGroups();
      if (gs.length) { this.cascade = 0; this.step(gs); return; }
      this.swapGrid(a, b);
      this.tween(this.grid[a[0]][a[1]], a, 0.16); this.tween(this.grid[b[0]][b[1]], b, 0.16);
      this.grid[a[0]][a[1]].land = this.gt + 0.12; this.grid[b[0]][b[1]].land = this.gt + 0.12;
      this.state = 'swapback';
      S.back();
    }

    /* ---------- clearing ---------- */
    // fire every special inside the clear map (chain reactions), honouring `keep`
    blast(clear, keep, fired) {
      const q = [...clear.keys()];
      const add = (r, c, d) => {
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        const key = r * N + c;
        if (keep.has(key) || !this.grid[r][c]) return;
        if (!clear.has(key) || clear.get(key) > d) { if (!clear.has(key)) q.push(key); clear.set(key, d); }
      };
      while (q.length) {
        const key = q.shift(), r = Math.floor(key / N), c = key % N, p = this.grid[r][c];
        if (!p || !p.sp || fired.has(p)) continue;
        fired.add(p);
        const d0 = clear.get(key) || 0;
        this.fireFx(p, r, c, d0);
        if (p.sp === 'h') for (let cc = 0; cc < N; cc++) add(r, cc, d0 + Math.abs(cc - c) * 0.03);
        else if (p.sp === 'v') for (let rr2 = 0; rr2 < N; rr2++) add(rr2, c, d0 + Math.abs(rr2 - r) * 0.03);
        else if (p.sp === 'bomb') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(r + dr, c + dc, d0 + 0.05 * (Math.abs(dr) + Math.abs(dc)));
        else if (p.sp === 'rainbow') {
          const k = this.commonKind();
          const tg = [];
          for (let r2 = 0; r2 < N; r2++) for (let c2 = 0; c2 < N; c2++) { const o = this.grid[r2][c2]; if (o && o.k === k && o.sp !== 'rainbow') { add(r2, c2, d0 + 0.08 + Math.hypot(r2 - r, c2 - c) * 0.03); tg.push([r2, c2]); } }
          this.zaps.push({ r, c, tg, t0: this.gt + d0, col: ANI[k] ? ANI[k].c : '#fff' });
        }
      }
    }
    commonKind() {
      const cnt = new Array(6).fill(0);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const p = this.grid[r][c]; if (p && p.sp !== 'rainbow') cnt[p.k]++; }
      let best = 0; cnt.forEach((v, i) => { if (v > cnt[best]) best = i; });
      return best;
    }
    fireFx(p, r, c, d) {
      const x = this.cx(c), y = this.cy(r), t0 = this.gt + d;
      if (p.sp === 'h' || p.sp === 'v') { this.beams.push({ h: p.sp === 'h', r, c, t0, col: ANI[p.k].c, w: 1 }); this.later(d, () => { S.line(); this.shards(x, y, '#fff', 8, this.cs * 0.12); }); }
      else if (p.sp === 'bomb') this.later(d, () => { S.bomb(); this.explode(x, y, 1.4, [ANI[p.k].c, '#fff', '#ffe27a']); this.shake(250); this.flashes.push({ x, y, r: this.cs * 1.8, t0: this.gt, col: '#fff3b0' }); });
      else if (p.sp === 'rainbow') this.later(d, () => { S.rainbow(); this.explode(x, y, 2.2, ['#ff5ce1', '#3ac8ff', '#ffe94a', '#fff']); this.shake(350); this.hs = Math.max(this.hs, 0.06); });
      this.o.onEvent('special', { type: p.sp, fired: true });
    }
    later(d, fn) { if (d <= 0.001) fn(); else (this.timers = this.timers || []).push({ t: this.gt + d, fn }); }

    step(groups) {
      this.cascade++;
      const clear = new Map(), keep = new Set(), makes = [], fired = new Set();
      const sw = this.cascade === 1 && this.swapCells ? this.swapCells.map(([r, c]) => r * N + c) : [];
      for (const G of groups) {
        let sp = null;
        if (G.maxLen >= 5) sp = 'rainbow';
        else if (G.h && G.v) sp = 'bomb';
        else if (G.maxLen === 4) sp = G.longest.h ? 'h' : 'v';
        let place = null;
        if (sp) {
          const ok = (key) => G.cells.has(key) && !keep.has(key) && !this.grid[Math.floor(key / N)][key % N].sp;
          place = sw.find(ok);
          if (place == null && sp === 'bomb' && G.cross != null && ok(G.cross)) place = G.cross;
          if (place == null) { const L = G.longest.cells, mid = L[Math.floor((L.length - 1) / 2)]; const key = mid[0] * N + mid[1]; if (ok(key)) place = key; }
          if (place == null) place = [...G.cells.keys()].find(ok);
          if (place != null) { keep.add(place); makes.push({ key: place, sp, k: G.k }); }
        }
        let i = 0;
        G.cells.forEach((_, key) => { if (!keep.has(key)) clear.set(key, i++ * 0.025); });
        this.bumpCombo();
      }
      this.blast(clear, keep, fired);
      this.applyClear(clear, makes, groups);
    }
    comboSwap(a, b) {
      this.cascade = 1;
      const pa = this.grid[a[0]][a[1]], pb = this.grid[b[0]][b[1]];
      const clear = new Map(), keep = new Set(), fired = new Set();
      const [r, c] = b;
      const all = (fn) => { for (let r2 = 0; r2 < N; r2++) for (let c2 = 0; c2 < N; c2++) fn(r2, c2, this.grid[r2][c2]); };
      const sps = [pa.sp, pb.sp];
      const x = this.cx(c), y = this.cy(r);
      if (pa.sp === 'rainbow' && pb.sp === 'rainbow') {
        all((r2, c2) => clear.set(r2 * N + c2, 0.1 + Math.hypot(r2 - r, c2 - c) * 0.05));
        fired.add(pa); fired.add(pb);
        S.rainbow(); this.explode(x, y, 3.5, ['#ff5ce1', '#3ac8ff', '#ffe94a', '#fff']); this.shake(500); this.hs = 0.12;
        this.banner('대폭발!', 'good');
      } else if (pa.sp === 'rainbow' || pb.sp === 'rainbow') {
        const rb = pa.sp === 'rainbow' ? pa : pb, o = rb === pa ? pb : pa, rp = rb === pa ? a : b;
        const k = o.k, tg = [];
        fired.add(rb);
        clear.set(rp[0] * N + rp[1], 0);
        all((r2, c2, p) => {
          if (!p || p.k !== k || p.sp === 'rainbow') return;
          if (o.sp && !p.sp) { p.sp = o.sp === 'bomb' ? 'bomb' : (this.rnd() < 0.5 ? 'h' : 'v'); p.made = this.gt; }
          clear.set(r2 * N + c2, 0.12 + Math.hypot(r2 - rp[0], c2 - rp[1]) * 0.035);
          tg.push([r2, c2]);
        });
        this.zaps.push({ r: rp[0], c: rp[1], tg, t0: this.gt, col: ANI[k].c });
        S.rainbow(); this.explode(this.cx(rp[1]), this.cy(rp[0]), 2.4, ['#ff5ce1', '#3ac8ff', '#ffe94a', '#fff']); this.shake(400); this.hs = 0.08;
        if (o.sp) this.banner(o.sp === 'bomb' ? '폭탄 비!' : '블래스터 비!', 'good');
      } else {
        fired.add(pa); fired.add(pb);
        clear.set(a[0] * N + a[1], 0); clear.set(b[0] * N + b[1], 0);
        const lines = (rows, cols) => {
          rows.forEach((r2) => { if (r2 >= 0 && r2 < N) { for (let c2 = 0; c2 < N; c2++) clear.set(r2 * N + c2, Math.min(clear.get(r2 * N + c2) ?? 9, Math.abs(c2 - c) * 0.03)); this.beams.push({ h: true, r: r2, c, t0: this.gt, col: '#fff', w: rows.length > 1 ? 1.3 : 1 }); } });
          cols.forEach((c2) => { if (c2 >= 0 && c2 < N) { for (let r2 = 0; r2 < N; r2++) clear.set(r2 * N + c2, Math.min(clear.get(r2 * N + c2) ?? 9, Math.abs(r2 - r) * 0.03)); this.beams.push({ h: false, r, c: c2, t0: this.gt, col: '#fff', w: cols.length > 1 ? 1.3 : 1 }); } });
        };
        const nb = sps.filter((s) => s === 'bomb').length;
        if (nb === 2) {
          for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const r2 = r + dr, c2 = c + dc; if (r2 >= 0 && c2 >= 0 && r2 < N && c2 < N) clear.set(r2 * N + c2, 0.04 * (Math.abs(dr) + Math.abs(dc))); }
          S.bomb(); setTimeout(() => S.bomb(), 90); this.explode(x, y, 3, [ANI[pb.k].c, '#fff', '#ffe27a']); this.shake(450); this.hs = 0.09;
          this.flashes.push({ x, y, r: this.cs * 3, t0: this.gt, col: '#fff3b0' });
          this.banner('메가 폭탄!', 'good');
        } else if (nb === 1) {
          lines([r - 1, r, r + 1], [c - 1, c, c + 1]); S.bomb(); S.line(); this.explode(x, y, 2.4, ['#ffe27a', '#fff']); this.shake(400); this.hs = 0.08;
          this.banner('슈퍼 블래스터!', 'good');
        } else { lines([r], [c]); S.line(); this.explode(x, y, 1.6, ['#fff', '#7fe0ff']); this.shake(250); this.hs = 0.05; }
      }
      this.o.onEvent('special', { type: sps.join('+'), combo: true });
      this.bumpCombo();
      this.blast(clear, keep, fired);
      this.applyClear(clear, [], null);
    }
    bumpCombo() {
      this.combo++;
      this.comboT = this.p.comboWin;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.comboPop = this.gt;
      if (this.combo >= 2) {
        this.o.onEvent('combo', { n: this.combo });
        if (this.combo % 10 === 0) { this.banner(`${this.combo} COMBO!`, 'good'); S.combo(this.combo / 2); this.hs = Math.max(this.hs, 0.05); }
      }
      this.o.onEvent('match', { combo: this.combo });
    }
    mult() { return (1 + 0.1 * Math.min(this.combo - 1, 30)) * (1 + 0.5 * (this.cascade - 1)) * (this.fever ? 2 : 1); }
    applyClear(clear, makes, groups) {
      let n = 0, sx = 0, sy = 0, maxD = 0;
      const mi = this.mission;
      const nClear = clear.size;
      clear.forEach((d, key) => {
        const r = Math.floor(key / N), c = key % N, p = this.grid[r][c];
        if (!p) return;
        this.grid[r][c] = null;
        this.pops.push({ p, x: c, y: r, t0: this.gt + d, fx: false, big: nClear > 12 });
        n++; sx += c; sy += r; if (d > maxD) maxD = d;
        if (mi && !mi.done && p.k === mi.k && p.sp !== 'rainbow') { mi.got++; mi.bump = this.gt; if (mi.got >= mi.n) { mi.got = mi.n; mi.done = true; this.later(d + 0.1, () => { this.banner('미션 완료!', 'good'); S.goal(); }); } }
      });
      const m = this.mult();
      let pts = n * 30 * m;
      makes.forEach((mk) => {
        const r = Math.floor(mk.key / N), c = mk.key % N, p = this.grid[r][c];
        if (!p) return;
        p.sp = mk.sp; if (mk.sp === 'rainbow') p.k = -1; p.made = this.gt;
        pts += (mk.sp === 'rainbow' ? 300 : mk.sp === 'bomb' ? 200 : 120) * m;
        this.later(0.05, () => { S.make(mk.sp); this.ring(this.cx(c), this.cy(r), '#fff', this.cs * 1.2, 4); this.burst(this.cx(c), this.cy(r), '#ffe27a', 10, 0.7); });
        this.o.onEvent('special', { type: mk.sp });
        if (this.stage <= 3 && !this.taught) { this.taught = true; this.later(0.15, () => this.banner(SP_KR[mk.sp] + ' 생성!', 'info', 1100)); }
      });
      pts = Math.round(pts / 10) * 10;
      if (n) {
        this.score += pts;
        const x = this.cx(sx / n), y = this.cy(sy / n);
        this.later(Math.min(maxD, 0.25), () => this.pop(x, y - this.cs * 0.2, '+' + U.fmt(pts), this.fever ? '#ff7ae6' : '#ffe27a', Math.min(40, 18 + n * 1.2 + this.cascade * 2)));
        S.pop(this.cascade + Math.min(this.combo, 8) * 0.5 | 0, this.fever);
        if (this.cascade >= 3) this.later(0.1, () => this.pop(this.cx(3), this.cy(1), `연쇄 x${this.cascade}`, '#7fe0ff', 30));
        if (!this.fever) {
          this.feverG += (n / this.p.feverNeed) * (1 + Math.min(this.combo, 10) * 0.05);
          if (this.feverG >= 1) this.later(maxD + 0.1, () => this.startFever());
        }
      }
      if (!this.goalShown && this.score >= this.target) { this.goalShown = true; this.later(0.3, () => { this.banner(this.mission && !this.mission.done ? '목표 점수 달성!' : '목표 달성! 계속 팡팡!', 'good'); S.goal(); }); }
      this.state = 'pop';
      this.popEnd = this.gt + maxD + 0.2;
    }
    startFever() {
      if (this.fever || this.ending || !this.running) return;
      this.fever = true; this.feverEnd = this.gt + this.p.feverTime; this.fevers++; this.feverG = 1; this.beatT = 0;
      this.banner('FEVER TIME!', 'good', 1500); S.fever(); this.hs = 0.06;
      const [x, y] = [this.bx + this.bs / 2, this.by + this.bs / 2];
      this.explode(x, y, 2.5, ['#ff5ce1', '#ffe94a', '#3ac8ff', '#fff']);
      this.o.onEvent('fever', { n: this.fevers });
    }
    gravity() {
      for (let c = 0; c < N; c++) {
        let w = N - 1;
        for (let r = N - 1; r >= 0; r--) { const p = this.grid[r][c]; if (p) { if (w !== r) { this.grid[w][c] = p; this.grid[r][c] = null; } w--; } }
        let i = 0;
        for (let r = w; r >= 0; r--) {
          const p = this.piece(Math.floor(this.rnd() * this.kinds));
          p.x = c; p.y = -1 - i * 1.08 - 0.1; p.vy = 3;
          this.grid[r][c] = p; i++;
        }
      }
    }
    fallStep(dt) {
      let moving = false, landed = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const p = this.grid[r][c];
        if (!p || p.tw) continue;
        if (p.y < r) {
          p.vy = Math.min(22, p.vy + 70 * dt); p.y += p.vy * dt;
          if (p.y >= r) { p.y = r; p.vy = 0; p.land = this.gt; landed++; } else moving = true;
        } else p.y = r;
        p.x = c;
      }
      if (landed && this.started && this.gt - (this.lastLand || 0) > 0.06) { this.lastLand = this.gt; S.land(); }
      return !moving;
    }
    resolve() {
      const gs = this.findGroups();
      if (gs.length) { this.step(gs); return; }
      this.cascade = 0; this.swapCells = null;
      this.state = 'idle'; this.idleT = 0;
      if (!this.started) { this.started = true; this.banner('시작!', 'good', 900); S.ready(); }
      if (this.ending) return;
      if (!this.findMoves().length) { this.banner('움직일 곳이 없어요! 섞을게요', 'info'); this.shuffle(); }
    }
    shuffle() {
      const ps = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) ps.push(this.grid[r][c]);
      for (let tries = 0; tries < 300; tries++) {
        for (let i = ps.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [ps[i], ps[j]] = [ps[j], ps[i]]; }
        ps.forEach((p, i) => { this.grid[Math.floor(i / N)][i % N] = p; });
        if (!this.findGroups().length && this.findMoves().length) break;
        if (tries > 200) ps.forEach((p) => { if (!p.sp) p.k = Math.floor(this.rnd() * this.kinds); });
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const p = this.grid[r][c]; p.tw = { x0: p.x, y0: p.y, x1: c, y1: r, t0: this.gt + Math.random() * 0.12, d: 0.42, arc: 1 }; }
      this.sel = null; this.hint = null;
      this.state = 'shuffle';
      A.qShuffle && A.qShuffle();
    }

    /* ---------- tools ---------- */
    tool(id) {
      if (!this.canPlay()) return;
      if (id === 'hint') {
        const mv = this.bestMove();
        if (!mv) return;
        if (!this.pay(this.p.hintCost, '힌트에')) return;
        this.hint = mv; this.hintT = this.gt; this.hintPaid = true;
        A.qHint && A.qHint();
        this.o.onEvent('hint', {});
      } else if (id === 'shuffle') {
        if (!this.pay(this.p.shuffleCost, '섞기에')) return;
        this.o.onEvent('shuffle', {});
        this.shuffle();
      }
    }
    bestMove() { const ms = this.findMoves(); if (!ms.length) return null; ms.sort((a, b) => b.v - a.v); return ms[0]; }
    cheat() { this.score = Math.max(this.score, this.p.star[2]); if (this.mission) { this.mission.got = this.mission.n; this.mission.done = true; } this.finish(); }

    /* ---------- loop ---------- */
    resume() {
      super.resume();
      this.ending = false; this.bonusRounds = 0; this.state = 'idle'; this.idleT = 0;
      this.banner(this.p.extendText + '!', 'good');
      S.ready();
    }
    finish() {
      if (!this.running) return;
      const ok = this.score >= this.target && (!this.mission || this.mission.done);
      if (!ok) { this.lose('time'); return; }
      const rows = [];
      const cap = this.p.bonusMax;
      if (this.maxCombo >= 3) rows.push([`최고 콤보 x${this.maxCombo}`, Math.min(cap, this.maxCombo * this.p.comboBonus)]);
      if (this.fevers) rows.push([`피버 ${this.fevers}회`, Math.min(cap, this.fevers * this.p.feverBonus)]);
      if (this.mission) rows.push([`${ANI[this.mission.k].n} ${this.mission.n}마리 모으기`, 50]);
      let tot = 0;
      rows.forEach((r) => { r[1] = Math.max(0, Math.min(r[1], cap - tot)); tot += r[1]; });
      this.banner(this.stars() >= 3 ? '퍼펙트!' : '클리어!', 'good');
      this.win({ rows: rows.filter((r) => r[1] > 0), maxCombo: this.maxCombo });
    }
    update(dt) {
      if (this.hs > 0) { this.hs -= dt; return; }
      this.gt += dt;
      const gt = this.gt;
      if (this.timers && this.timers.length) {
        for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= gt) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
      }
      // clock
      if (this.started && !this.ending) {
        const before = this.time;
        this.time = Math.max(0, this.time - dt);
        if (Math.ceil(before) !== Math.ceil(this.time) && this.time <= 10 && this.time > 0) A.qTick && A.qTick(Math.ceil(this.time));
        if (this.time <= 0) { this.ending = true; this.sel = null; this.hint = null; this.drag = null; this.banner('TIME UP!', 'bad', 1100); this.endT = gt; }
      }
      this.meter(this.time / this.p.time, Math.ceil(this.time) + '초', this.time < 10);
      // tweens
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const p = this.grid[r][c];
        if (!p || !p.tw) continue;
        const u = U.clamp((gt - p.tw.t0) / p.tw.d, 0, 1), e = U.easeInOutCubic(u);
        p.x = U.lerp(p.tw.x0, p.tw.x1, e); p.y = U.lerp(p.tw.y0, p.tw.y1, e) - (p.tw.arc ? Math.sin(u * Math.PI) * 0.6 : 0);
        if (u >= 1) { p.tw = null; if (this.state === 'shuffle') p.land = gt; }
      }
      // pops start (particles)
      let fxN = 0;
      for (const pp of this.pops) if (!pp.fx && gt >= pp.t0) {
        pp.fx = true;
        if (fxN++ < 14) { const x = this.cx(pp.x), y = this.cy(pp.y), col = pp.p.k >= 0 ? ANI[pp.p.k].c : '#ffffff'; this.burst(x, y, col, pp.big ? 4 : 8, 0.7); if (!pp.big) this.shards(x, y, '#fff', 3, this.cs * 0.08); }
      }
      this.pops = this.pops.filter((pp) => gt < pp.t0 + 0.3);
      // combo & fever
      if (this.combo && (this.state === 'idle' || this.state === 'swapback')) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; this.comboT = 0; } }
      if (this.fever) {
        this.feverG = Math.max(0, (this.feverEnd - gt) / this.p.feverTime);
        this.beatT -= dt;
        if (this.beatT <= 0) { this.beatT += 0.22; S.beat(this.beatI++); }
        if (gt >= this.feverEnd && this.state === 'idle') { this.fever = false; this.feverG = 0; }
      } else if (this.state === 'idle' && this.feverG > 0) this.feverG = Math.max(0, this.feverG - dt * 0.012);
      this.dispScore += (this.score - this.dispScore) * Math.min(1, dt * 10);
      if (Math.abs(this.score - this.dispScore) < 1) this.dispScore = this.score;
      this.info(`<span>점수 <b style="font-size:15px;color:#ffe27a">${U.fmt(Math.round(this.dispScore))}</b></span>`);
      // state machine
      switch (this.state) {
        case 'swap': { const [a, b] = this.swapCells; if (!this.grid[a[0]][a[1]].tw && !this.grid[b[0]][b[1]].tw) this.afterSwap(); break; }
        case 'swapback': { const [a, b] = this.swapCells; if (!this.grid[a[0]][a[1]].tw && !this.grid[b[0]][b[1]].tw) { this.state = 'idle'; this.swapCells = null; } break; }
        case 'pop': if (gt >= this.popEnd) { this.gravity(); this.state = 'fall'; } break;
        case 'fall': if (this.fallStep(dt)) this.resolve(); break;
        case 'shuffle': { let busy = false; for (let r = 0; r < N && !busy; r++) for (let c = 0; c < N; c++) if (this.grid[r][c].tw) { busy = true; break; } if (!busy) this.resolve(); break; }
        case 'idle':
          if (this.ending) {
            if (gt - this.endT < 0.9) break;
            const sp = [];
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.grid[r][c].sp) sp.push(r * N + c);
            if (sp.length && this.bonusRounds < 4) {
              if (!this.bonusRounds) this.banner('마지막 보너스!', 'good', 1100);
              this.bonusRounds++;
              const clear = new Map(); sp.forEach((k, i) => clear.set(k, i * 0.12));
              this.cascade = 1; this.combo = Math.max(this.combo, 1);
              this.blast(clear, new Set(), new Set());
              this.applyClear(clear, [], null);
            } else if (gt - this.endT > 1.2) this.finish();
            break;
          }
          this.idleT += dt;
          if (!this.hint && this.idleT > (this.started ? this.p.autoHint : 99)) { this.hint = this.bestMove(); this.hintT = gt; this.hintPaid = false; }
          break;
      }
    }

    /* ---------- drawing ---------- */
    draw(t) {
      const g = this.ctx;
      if (!this.W || !this.cs) return;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      const { bx, by, bs, cs } = this, gt = this.gt;
      const accent = this.th.accent || '#ff4fd8', accent2 = this.th.accent2 || '#00e5ff';
      // fever aura
      if (this.fever) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 9);
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(bx + bs / 2, by + bs / 2, bs * 0.3, bx + bs / 2, by + bs / 2, bs * 0.85);
        const hue = (t * 120) % 360;
        gr.addColorStop(0, `hsla(${hue},100%,60%,0)`); gr.addColorStop(0.7, `hsla(${hue},100%,60%,${0.25 + pulse * 0.2})`); gr.addColorStop(1, `hsla(${(hue + 60) % 360},100%,60%,0)`);
        g.fillStyle = gr; g.fillRect(bx - bs * 0.4, by - bs * 0.4, bs * 1.8, bs * 1.8);
        g.restore();
      }
      // glass panel + cells + widget frames (static, cached)
      if (!this.bgc) this.bgc = this.buildBg();
      g.drawImage(this.bgc, 0, 0, this.W, this.H);
      const pad = cs * 0.14;
      if (this.fever) { g.strokeStyle = `hsl(${(t * 200) % 360},100%,65%)`; g.lineWidth = 4; rr(g, bx - pad, by - pad, bs + pad * 2, bs + pad * 2, cs * 0.35); g.stroke(); }
      // selection / hint glow
      const glowAt = (r, c, col, a, sc) => { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const s2 = cs * (sc || 1.7); g.drawImage(root.FxSprites.glow(col), this.cx(c) - s2 / 2, this.cy(r) - s2 / 2, s2, s2); g.restore(); };
      if (this.sel) { glowAt(this.sel[0], this.sel[1], accent2, 0.7); rr(g, bx + this.sel[1] * cs + 2, by + this.sel[0] * cs + 2, cs - 4, cs - 4, cs * 0.2); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke(); }
      const hint = this.hint && this.state === 'idle' ? this.hint : null;
      if (hint) { const a = 0.45 + 0.4 * Math.sin((gt - this.hintT) * 7); glowAt(hint.a[0], hint.a[1], '#7fffd4', a); glowAt(hint.b[0], hint.b[1], '#7fffd4', a); }
      // pieces (clipped to the board so new ones slide in from the top edge)
      g.save();
      rr(g, bx - pad, by - pad * 0.5, bs + pad * 2, bs + pad * 1.5, cs * 0.3); g.clip();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const p = this.grid[r][c];
        if (!p) continue;
        let sx = 1, sy = 1, ox = 0, oy = 0;
        sy += Math.sin(t * 3.2 + p.ph) * 0.025; sx -= Math.sin(t * 3.2 + p.ph) * 0.015;
        const lu = (gt - p.land) / 0.28;
        if (lu >= 0 && lu < 1) { const k = Math.sin(lu * Math.PI) * (1 - lu); sx += k * 0.28; sy -= k * 0.28; oy += k * cs * 0.12; }
        if (p.vy > 2) { sy += Math.min(0.15, p.vy * 0.008); sx -= Math.min(0.1, p.vy * 0.005); }
        if (this.sel && this.sel[0] === r && this.sel[1] === c) { const k = 1.1 + Math.sin(t * 10) * 0.04; sx *= k; sy *= k; }
        if (hint && ((hint.a[0] === r && hint.a[1] === c) || (hint.b[0] === r && hint.b[1] === c))) {
          const o2 = hint.a[0] === r && hint.a[1] === c ? hint.b : hint.a;
          const w = Math.max(0, Math.sin((gt - this.hintT) * 7)) * cs * 0.08;
          ox += (o2[1] - c) * w; oy += (o2[0] - r) * w;
        }
        const mu = (gt - p.made) / 0.4;
        if (mu >= 0 && mu < 1) { const k = 1 + Math.sin(mu * Math.PI) * 0.35; sx *= k; sy *= k; }
        this.drawPiece(g, p, this.bx + (p.x + 0.5) * cs + ox, this.by + (p.y + 0.5) * cs + oy, sx, sy, t, 1);
      }
      // pops
      for (const pp of this.pops) {
        const x = this.cx(pp.x), y = this.cy(pp.y);
        const u = (gt - pp.t0) / 0.3;
        if (u < 0) { this.drawPiece(g, pp.p, x + Math.sin(t * 60) * cs * 0.03, y, 1.05, 1.05, t, 1); continue; }
        let s1, s2, al = 1;
        if (u < 0.35) { const k = u / 0.35; s1 = 1 + k * 0.35; s2 = 1 + k * 0.1; }
        else { const k = (u - 0.35) / 0.65; s1 = s2 = 1.35 * (1 - U.easeInCubic(k)); al = 1 - k * 0.6; }
        this.drawPiece(g, pp.p, x, y, s1, s2, t, al);
        if (u < 0.5) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - u * 2) * 0.8; const s3 = cs * (1 + u * 1.6); g.drawImage(root.FxSprites.glow('#ffffff'), x - s3 / 2, y - s3 / 2, s3, s3); g.restore(); }
      }
      g.restore();
      // beams / zaps / flashes
      g.save(); g.globalCompositeOperation = 'lighter';
      this.beams = this.beams.filter((b) => {
        const u = (gt - b.t0) / 0.4;
        if (u >= 1) return false;
        if (u < 0) return true;
        const e = U.easeOutCubic(Math.min(1, u * 3)), a = 1 - u;
        const w = cs * (0.9 - u * 0.6) * b.w;
        if (b.h) {
          const y = this.cy(b.r), x0 = this.cx(b.c);
          const L = bs * e * 0.6 + cs;
          const gr = g.createLinearGradient(0, y - w / 2, 0, y + w / 2);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, U.rgba(b.col.startsWith('#') ? b.col : '#ffffff', a)); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(x0 - L, y - w / 2, L * 2, w);
          g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x0 - L, y - w * 0.08, L * 2, w * 0.16);
        } else {
          const x = this.cx(b.c), y0 = this.cy(b.r);
          const L = bs * e * 0.6 + cs;
          const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, U.rgba(b.col.startsWith('#') ? b.col : '#ffffff', a)); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(x - w / 2, y0 - L, w, L * 2);
          g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - w * 0.08, y0 - L, w * 0.16, L * 2);
        }
        return true;
      });
      this.zaps = this.zaps.filter((z) => {
        const u = (gt - z.t0) / 0.5;
        if (u >= 1) return false;
        if (u < 0) return true;
        const x0 = this.cx(z.c), y0 = this.cy(z.r);
        g.globalAlpha = 1 - u; g.lineCap = 'round';
        for (const [r2, c2] of z.tg) {
          const x1 = this.cx(c2), y1 = this.cy(r2);
          g.beginPath(); g.moveTo(x0, y0);
          for (let i = 1; i < 5; i++) { const f = i / 5; g.lineTo(U.lerp(x0, x1, f) + (Math.random() - 0.5) * cs * 0.35, U.lerp(y0, y1, f) + (Math.random() - 0.5) * cs * 0.35); }
          g.lineTo(x1, y1);
          g.strokeStyle = z.col; g.lineWidth = 5; g.stroke();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        }
        g.globalAlpha = 1;
        return true;
      });
      this.flashes = this.flashes.filter((f) => {
        const u = (gt - f.t0) / 0.35;
        if (u >= 1) return false;
        g.globalAlpha = 1 - u; const s = f.r * 2 * (0.6 + u);
        g.drawImage(root.FxSprites.glow(f.col), f.x - s / 2, f.y - s / 2, s, s);
        g.globalAlpha = 1;
        return true;
      });
      g.restore();
      // tutorial pointer
      if (hint && this.stage <= 3 && !this.hintPaid) this.drawFinger(g, hint, gt - this.hintT);
      this.drawWidgets(g, t);
    }
    buildBg() {
      const cv = document.createElement('canvas');
      cv.width = Math.round(this.W * this.dpr); cv.height = Math.round(this.H * this.dpr);
      const g = cv.getContext('2d');
      g.scale(this.dpr, this.dpr);
      const { bx, by, bs, cs } = this, pad = cs * 0.14, accent = this.th.accent || '#ff4fd8';
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
      rr(g, bx - pad, by - pad, bs + pad * 2, bs + pad * 2, cs * 0.35);
      const pg = g.createLinearGradient(0, by, 0, by + bs);
      pg.addColorStop(0, 'rgba(36,20,70,0.62)'); pg.addColorStop(1, 'rgba(12,6,30,0.72)');
      g.fillStyle = pg; g.fill();
      g.restore();
      g.lineWidth = 2.5; g.strokeStyle = U.rgba(accent, 0.6);
      rr(g, bx - pad, by - pad, bs + pad * 2, bs + pad * 2, cs * 0.35); g.stroke();
      rr(g, bx - pad + 4, by - pad + 4, bs + pad * 2 - 8, bs * 0.3, cs * 0.3);
      const gl = g.createLinearGradient(0, by - pad, 0, by + bs * 0.3);
      gl.addColorStop(0, 'rgba(255,255,255,0.1)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fill();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        rr(g, bx + c * cs + 2, by + r * cs + 2, cs - 4, cs - 4, cs * 0.2);
        g.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'; g.fill();
      }
      [this.rT, this.rC, this.rO].forEach((r) => { if (r) this.panelBg(g, ...r); });
      return cv;
    }
    panelBg(g, x, y, w, h) {
      g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
      rr(g, x, y, w, h, Math.min(16, h * 0.3));
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(44,24,84,0.78)'); gr.addColorStop(1, 'rgba(14,8,34,0.82)');
      g.fillStyle = gr; g.fill(); g.restore();
    }
    drawPiece(g, p, x, y, sx, sy, t, alpha) {
      const cs = this.cs;
      g.globalAlpha = alpha;
      if (p.sp === 'rainbow') {
        const spr = this.spr(`rb|${Math.round(cs)}`, Math.round(cs), paintRainbow);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.5 + 0.2 * Math.sin(t * 6));
        const s2 = cs * 1.6; g.drawImage(root.FxSprites.glow('#ffffff'), x - s2 / 2, y - s2 / 2, s2, s2); g.restore();
        g.save(); g.translate(x, y); g.rotate(t * 1.5); g.scale(sx, sy); g.globalAlpha = alpha; g.drawImage(spr, -cs / 2, -cs / 2, cs, cs); g.restore();
        g.globalAlpha = 1;
        return;
      }
      const blink = (t % 6) > p.bl + 1.6 && (t % 6) < p.bl + 1.75;
      const spr = this.animal(p.k, blink);
      if (p.sp) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.45 + 0.25 * Math.sin(t * 7 + p.ph));
        const s2 = cs * 1.5; g.drawImage(root.FxSprites.glow(p.sp === 'bomb' ? '#ffcf40' : ANI[p.k].c), x - s2 / 2, y - s2 / 2, s2, s2); g.restore();
        g.globalAlpha = alpha;
      }
      if (p.sp === 'bomb') {
        const ring = this.spr(`bo|${Math.round(cs)}`, Math.round(cs), paintBomb);
        g.save(); g.translate(x, y); g.rotate(t * 1.2); const s3 = cs * (1 + 0.05 * Math.sin(t * 8)); g.drawImage(ring, -s3 / 2, -s3 / 2, s3, s3); g.restore();
      }
      g.save(); g.translate(x, y + cs * 0.5 * (1 - sy)); g.scale(sx, sy);
      g.drawImage(spr, -cs / 2, -cs / 2, cs, cs);
      if (p.sp === 'h' || p.sp === 'v') {
        const ov = this.spr(`ln|${Math.round(cs)}`, Math.round(cs), paintLine);
        const wob = Math.sin(t * 8 + p.ph) * cs * 0.03;
        if (p.sp === 'v') { g.rotate(Math.PI / 2); g.drawImage(ov, -cs * 0.44 + wob, -cs * 0.707, cs, cs); }
        else g.drawImage(ov, -cs / 2 + wob, -cs / 2, cs, cs);
      }
      g.restore();
      g.globalAlpha = 1;
    }
    drawFinger(g, hint, u) {
      const cs = this.cs;
      const k = (u % 1.3) / 1.3;
      const m = k < 0.2 ? 0 : k < 0.7 ? U.easeInOutCubic((k - 0.2) / 0.5) : 1;
      const x = U.lerp(this.cx(hint.a[1]), this.cx(hint.b[1]), m), y = U.lerp(this.cy(hint.a[0]), this.cy(hint.b[0]), m);
      g.save(); g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      g.beginPath(); g.arc(x + cs * 0.12, y + cs * 0.18, cs * 0.2, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.shadowColor = '#7fffd4'; g.shadowBlur = 16; g.fill();
      g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#2bd9a8'; g.stroke();
      g.font = `${Math.round(cs * 0.5)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👆', x + cs * 0.2, y + cs * 0.35);
      g.restore();
    }
    panel(g, x, y, w, h, glowCol) {
      rr(g, x, y, w, h, Math.min(16, h * 0.3)); g.strokeStyle = glowCol || 'rgba(255,255,255,0.16)'; g.lineWidth = 1.5; g.stroke();
    }
    txt(g, s, x, y, size, col, font, align, stroke) {
      g.font = `${size}px ${font || FONT_KR}`; g.textAlign = align || 'left'; g.textBaseline = 'middle';
      if (stroke) { g.lineJoin = 'round'; g.lineWidth = size * 0.2; g.strokeStyle = 'rgba(20,6,30,0.85)'; g.strokeText(s, x, y); }
      g.fillStyle = col; g.fillText(s, x, y);
    }
    drawWidgets(g, t) {
      const gt = this.gt, accent = this.th.accent || '#ff4fd8';
      // ---- target / score
      {
        const [x, y, w, h] = this.rT;
        const done = this.score >= this.target;
        this.panel(g, x, y, w, h, done ? 'rgba(255,214,74,0.7)' : null);
        const m = h * 0.14, fs = U.clamp(h * 0.24, 11, 18);
        this.txt(g, done ? '목표 달성!' : '목표 ' + U.fmt(this.target), x + m, y + m + fs * 0.5, fs * 0.8, done ? '#ffe27a' : 'rgba(255,255,255,0.75)');
        this.txt(g, U.fmt(Math.round(this.dispScore)), x + w - m, y + m + fs * 0.6, fs * 1.35, '#fff', FONT_NUM, 'right', true);
        const bw = w - m * 2, bh = U.clamp(h * 0.2, 9, 16), byy = y + h - m - bh;
        const st = this.p.star, max = st[2];
        rr(g, x + m, byy, bw, bh, bh / 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
        const f = U.clamp(this.dispScore / max, 0, 1);
        if (f > 0) {
          rr(g, x + m, byy, Math.max(bh, bw * f), bh, bh / 2);
          const gr = g.createLinearGradient(x + m, 0, x + m + bw, 0);
          gr.addColorStop(0, '#ffb000'); gr.addColorStop(0.5, '#ffe94a'); gr.addColorStop(1, '#fff8c8');
          g.fillStyle = gr; g.fill();
          rr(g, x + m + 2, byy + 2, Math.max(bh, bw * f) - 4, bh * 0.35, bh * 0.2); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
        }
        st.forEach((v, i) => {
          const sx = x + m + bw * (v / max) - (i === 2 ? bh * 0.6 : 0), on = this.score >= v;
          const sr = bh * (i === 0 ? 0.95 : 0.85);
          star(g, sx, byy + bh / 2, sr);
          g.fillStyle = on ? '#ffd23a' : '#4a3a66'; g.fill(); g.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.stroke();
        });
      }
      // ---- combo
      {
        const [x, y, w, h] = this.rC;
        const on = this.combo >= 2;
        this.panel(g, x, y, w, h, on ? U.rgba(accent, 0.8) : null);
        const pu = (gt - (this.comboPop || -9)) / 0.3, sc = pu >= 0 && pu < 1 ? 1 + (1 - pu) * 0.4 : 1;
        this.txt(g, 'COMBO', x + w / 2, y + h * 0.24, U.clamp(h * 0.17, 9, 14), on ? '#ffe27a' : 'rgba(255,255,255,0.5)', FONT_NUM, 'center');
        g.save(); g.translate(x + w / 2, y + h * 0.58); g.scale(sc, sc);
        this.txt(g, on ? 'x' + this.combo : '-', 0, 0, U.clamp(h * 0.38, 14, 32), on ? '#fff' : 'rgba(255,255,255,0.4)', FONT_NUM, 'center', true);
        g.restore();
        if (this.combo) {
          const f = U.clamp(this.comboT / this.p.comboWin, 0, 1), bw = w * 0.7;
          rr(g, x + (w - bw) / 2, y + h * 0.84, bw, 4, 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
          rr(g, x + (w - bw) / 2, y + h * 0.84, bw * f, 4, 2); g.fillStyle = f < 0.3 ? '#ff5a6e' : '#7fffd4'; g.fill();
        }
      }
      // ---- mission
      if (this.rO && this.mission) {
        const [x, y, w, h] = this.rO, mi = this.mission;
        this.panel(g, x, y, w, h, mi.done ? 'rgba(127,255,212,0.8)' : null);
        const bu = (gt - (mi.bump || -9)) / 0.25, sc = bu >= 0 && bu < 1 ? 1 + (1 - bu) * 0.25 : 1;
        const s = Math.min(h * 0.62, w * 0.45);
        const spr = this.animal(mi.k, false);
        const ix = this.side ? x + w * 0.3 : x + w / 2, iy = this.side ? y + h / 2 : y + h * 0.4;
        g.drawImage(spr, ix - s * sc / 2, iy - s * sc / 2, s * sc, s * sc);
        const label = mi.done ? '완료!' : `${mi.got}/${mi.n}`;
        if (this.side) { this.txt(g, `${ANI[mi.k].n} 모으기`, x + w * 0.56, y + h * 0.32, U.clamp(h * 0.16, 10, 15), 'rgba(255,255,255,0.75)'); this.txt(g, label, x + w * 0.56, y + h * 0.64, U.clamp(h * 0.3, 14, 28), mi.done ? '#7fffd4' : '#fff', FONT_NUM, 'left', true); }
        else this.txt(g, label, x + w / 2, y + h * 0.84, U.clamp(h * 0.22, 11, 18), mi.done ? '#7fffd4' : '#fff', FONT_NUM, 'center', true);
        if (mi.done) { g.beginPath(); g.arc(ix + s * 0.35, iy - s * 0.3, s * 0.16, 0, TAU); g.fillStyle = '#2bd9a8'; g.fill(); this.txt(g, '✓', ix + s * 0.35, iy - s * 0.3, s * 0.22, '#fff', FONT_NUM, 'center'); }
      }
      // ---- fever gauge
      {
        const [x, y, w, h] = this.rF;
        rr(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
        g.strokeStyle = this.fever ? `hsl(${(t * 300) % 360},100%,70%)` : 'rgba(255,255,255,0.2)'; g.lineWidth = 1.5; g.stroke();
        const f = U.clamp(this.feverG, 0, 1);
        if (f > 0.01) {
          rr(g, x + 2, y + 2, Math.max(h - 4, (w - 4) * f), h - 4, (h - 4) / 2);
          const gr = g.createLinearGradient(x, 0, x + w, 0);
          if (this.fever) { const hu = (t * 240) % 360; for (let i = 0; i <= 4; i++) gr.addColorStop(i / 4, `hsl(${(hu + i * 70) % 360},100%,62%)`); }
          else { gr.addColorStop(0, '#ff3d7f'); gr.addColorStop(1, '#ffb13d'); }
          g.fillStyle = gr; g.fill();
          rr(g, x + 4, y + 3, Math.max(h - 8, (w - 8) * f), (h - 4) * 0.35, (h - 4) * 0.2); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
        }
        const fs = U.clamp(h * 0.62, 11, 20);
        const label = this.fever ? 'FEVER TIME! x2' : 'FEVER';
        const pul = this.fever ? 1 + 0.08 * Math.sin(t * 14) : 1;
        g.save(); g.translate(x + w / 2, y + h / 2); g.scale(pul, pul);
        this.txt(g, '🔥 ' + label, 0, 1, fs, '#fff', FONT_NUM, 'center', true);
        g.restore();
      }
    }
  }
  root.QuestGames.match3 = Match3;
})(window);
