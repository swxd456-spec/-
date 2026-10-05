/* 보석 블록 (1010! / Block Blast style block puzzle).
   8×8 board, a tray of 3 polyomino pieces dragged onto the board. Full rows / columns clear with a sweeping shine;
   multi-line clears and consecutive clearing turns build a combo multiplier. Stage goal: collect target gems that sit
   inside blocks (pre-placed and carried by pieces) or reach a target score, within a limited number of moves.
   Ice-locked cells need two clears. Tools: rotate a piece, reroll the tray, hammer one cell.
   Piece generator is weighted (small/helpful shapes early) and checks that a tray can be placed in some order. */
(function (root) {
  const { Base, util } = root.QuestGames;
  const U = root.U, A = root.SlotAudio;
  const { ease, lerp, cfg, rr } = util;
  const N = 8;
  const SEC = '보석블록';
  const DEFAULTS = {
    '입장료': 100,
    '클리어보상': 300,
    '남은수_보상': 6,
    '콤보_보상': 8,
    '회전_가격': 30,
    '새블록_가격': 60,
    '망치_가격': 50,
    '연장_가격': 150,
    '연장_수': 3,
    '연장_정리칸': 10,
    '난이도_간격': 30,
    '튜토리얼_판': 3,
    '이동수_시작': 30,
    '이동수_끝': 27,
    '보석목표_시작': 5,
    '보석목표_끝': 16,
    '보석종류_시작': 1,
    '보석종류_최대': 3,
    '보석종류증가_간격': 15,
    '보석블록_확률_시작': 50,
    '보석블록_확률_끝': 42,
    '초기보석_시작': 3,
    '초기보석_끝': 9,
    '초기블록_시작': 0,
    '초기블록_끝': 16,
    '얼음_시작판': 8,
    '얼음_최대': 8,
    '큰블록_비율_시작': 5,
    '큰블록_비율_끝': 60,
    '맞춤보장_시작': 100,
    '맞춤보장_끝': 90,
    '도움블록_확률_시작': 55,
    '도움블록_확률_끝': 15,
    '콤보_유지수': 3,
    '점수판_간격': 5,
    '점수목표_수당': 100,
    '남은수_점수': 150,
    '별2_수당': 125,
    '별3_수당': 165,
  };

  const GEMS = [
    { n: '루비', c: '#ff2d55', l: '#ffb3c4', d: '#8c0022', blk: 0 },
    { n: '사파이어', c: '#2f7bff', l: '#b5d3ff', d: '#0a2a8a', blk: 4 },
    { n: '에메랄드', c: '#16c964', l: '#a8f5c8', d: '#04602f', blk: 3 },
    { n: '토파즈', c: '#ffc21a', l: '#fff3b0', d: '#9a5a00', blk: 2 },
    { n: '자수정', c: '#a54bff', l: '#e2c2ff', d: '#4c0f99', blk: 5 },
  ];
  const BLK = ['#ff4d6d', '#ff9f1c', '#ffd23b', '#2ee59d', '#25b7ff', '#7c5cff', '#ff5ec8'];
  const HYPE = ['', 'GOOD!', 'GREAT!', 'AMAZING!', 'UNBELIEVABLE!'];
  const LINE_PTS = [0, 100, 300, 600, 1000, 1500];

  /* ---------- shapes ---------- */
  // [cells, weight when easy, weight when hard, allow mirror]
  const BASE = [
    [[[0, 0]], 5, 1.5],
    [[[0, 0], [0, 1]], 8, 2.5],
    [[[0, 0], [0, 1], [0, 2]], 7, 3.5],
    [[[0, 0], [1, 0], [1, 1]], 7, 3.5],
    [[[0, 0], [0, 1], [0, 2], [0, 3]], 4, 4.5],
    [[[0, 0], [0, 1], [1, 0], [1, 1]], 7, 4.5],
    [[[0, 0], [1, 0], [2, 0], [2, 1]], 2.5, 5, true],
    [[[0, 0], [0, 1], [0, 2], [1, 1]], 2.5, 5],
    [[[0, 1], [0, 2], [1, 0], [1, 1]], 1, 4, true],
    [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 0.8, 4],
    [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 0.8, 4],
    [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], 1, 3.5],
    [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], 0.4, 2.8],
  ];
  function norm(cells) {
    let mr = 99, mc = 99;
    for (const [r, c] of cells) { mr = Math.min(mr, r); mc = Math.min(mc, c); }
    const out = cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out;
  }
  const keyOf = (cells) => cells.map((p) => p.join(',')).join(';');
  const rot90 = (cells) => norm(cells.map(([r, c]) => [c, -r]));
  function dims(cells) { let h = 0, w = 0; for (const [r, c] of cells) { h = Math.max(h, r + 1); w = Math.max(w, c + 1); } return [w, h]; }
  const SHAPES = [];
  BASE.forEach(([cells, wE, wH, mir], fam) => {
    const seen = new Set(), list = [];
    const variants = mir ? [cells, cells.map(([r, c]) => [r, -c])] : [cells];
    for (let v of variants) {
      v = norm(v);
      for (let k = 0; k < 4; k++) { const ky = keyOf(v); if (!seen.has(ky)) { seen.add(ky); list.push(v); } v = rot90(v); }
    }
    list.forEach((cl) => { const [w, h] = dims(cl); SHAPES.push({ cells: cl, w, h, fam, wE: wE / list.length, wH: wH / list.length }); });
  });

  /* ---------- board helpers on occupancy arrays (0 empty, 1 block, 2 iced block) ---------- */
  function fits(occ, cells, r, c) {
    for (let i = 0; i < cells.length; i++) {
      const rr2 = r + cells[i][0], cc = c + cells[i][1];
      if (rr2 < 0 || cc < 0 || rr2 >= N || cc >= N || occ[rr2 * N + cc]) return false;
    }
    return true;
  }
  function fullLines(occ) {
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N; c++) if (!occ[r * N + c]) { f = false; break; } if (f) rows.push(r); }
    for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!occ[r * N + c]) { f = false; break; } if (f) cols.push(c); }
    return [rows, cols];
  }
  function anyFit(occ, pc) {
    for (let r = 0; r <= N - pc.h; r++) for (let c = 0; c <= N - pc.w; c++) if (fits(occ, pc.cells, r, c)) return true;
    return false;
  }
  // place + clear on a copy; returns { occ, lines }
  function simPlace(occ, cells, r, c) {
    const o = occ.slice();
    for (const [dr, dc] of cells) o[(r + dr) * N + c + dc] = 1;
    const [rows, cols] = fullLines(o);
    const kill = (i) => { o[i] = o[i] === 2 ? 1 : 0; };
    const hit = new Uint8Array(N * N);
    rows.forEach((y) => { for (let x = 0; x < N; x++) hit[y * N + x] = 1; });
    cols.forEach((x) => { for (let y = 0; y < N; y++) hit[y * N + x] = 1; });
    for (let i = 0; i < N * N; i++) if (hit[i]) kill(i);
    return { occ: o, lines: rows.length + cols.length };
  }
  function contact(occ, cells, r, c) {
    let s = 0;
    const own = (y, x) => cells.some(([dr, dc]) => r + dr === y && c + dc === x);
    for (const [dr, dc] of cells) {
      const y = r + dr, x = c + dc;
      for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const yy = y + a, xx = x + b;
        if (yy < 0 || xx < 0 || yy >= N || xx >= N) s++;
        else if (occ[yy * N + xx] && !own(yy, xx)) s++;
      }
    }
    return s;
  }
  // greedy best spot for one piece
  function bestSpot(occ, pc) {
    let best = null, bs = -1e9;
    for (let r = 0; r <= N - pc.h; r++) for (let c = 0; c <= N - pc.w; c++) {
      if (!fits(occ, pc.cells, r, c)) continue;
      const sim = simPlace(occ, pc.cells, r, c);
      const s = sim.lines * 30 + contact(occ, pc.cells, r, c);
      if (s > bs) { bs = s; best = { r, c, occ: sim.occ, lines: sim.lines }; }
    }
    return best;
  }
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  // can all given pieces be placed one after another (some order, greedy spots)?
  function placeable(occ, pieces) {
    const idx = pieces.map((p, i) => i);
    const perms = idx.length === 3 ? PERMS : idx.length === 2 ? [[0, 1], [1, 0]] : [[0]];
    for (const pm of perms) {
      let o = occ, ok = true;
      for (const i of pm) { const b = bestSpot(o, pieces[i]); if (!b) { ok = false; break; } o = b.occ; }
      if (ok) return true;
    }
    return false;
  }
  function canClear(occ, sh) {
    for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) {
      if (!fits(occ, sh.cells, r, c)) continue;
      const o = occ.slice();
      for (const [dr, dc] of sh.cells) o[(r + dr) * N + c + dc] = 1;
      const [a, b] = fullLines(o);
      if (a.length + b.length) return true;
    }
    return false;
  }

  /* ---------- sounds ---------- */
  const K = () => A && A.kit && A.kit.ok();
  const S = {
    pick() { if (!K()) return; const k = A.kit, t = k.now(); k.play('pluck', k.note(7, 1), t, 0.07, 0.22); k.tone('sine', 520, 980, t, 0.07, 0.1); },
    place(n) {
      if (!K()) return; const k = A.kit, t = k.now();
      k.tone('sine', 190, 70, t, 0.13, 0.45); k.noise(t, 0.05, 0.2, 'lowpass', 1300, 1);
      k.play('marimba', k.note(2 + (n % 5), 1), t + 0.01, 0.12, 0.32, k.rv(0.2));
    },
    clear(lines, combo) {
      if (!K()) return; const k = A.kit, t = k.now(); const b = Math.min(combo, 9);
      k.noise(t, 0.4, 0.28, 'bandpass', 1200, 1.2, { sweep: 9500 });
      for (let i = 0; i < 3 + Math.min(lines, 4); i++) k.play('celesta', k.note(b + i * 2 + 3, 1), t + i * 0.045, 0.25, 0.26, k.rv(0.5));
      k.play('bell', k.note(b + 8, 1), t + 0.06, 0.6, 0.26, k.rv(0.6));
      k.tone('sine', 130, 45, t, 0.28, 0.5);
    },
    gem(i) { if (!K()) return; const k = A.kit, t = k.now() + i * 0.05; k.play('bell', k.note(10 + i, 1), t, 0.3, 0.2, k.rv(0.6)); k.tone('sine', 2600, 3600, t, 0.08, 0.05); },
    hype(lv) {
      if (!K()) return; const k = A.kit, t = k.now() + 0.08;
      [0, 2, 4].forEach((d) => k.play('brass', k.note(d + lv * 2, 0), t, 0.45, 0.22, k.rv(0.4)));
      if (lv >= 3) [0, 2, 4, 7].forEach((d, i) => k.play('choir', k.note(d + 5, 1), t + 0.05 + i * 0.03, 0.8, 0.14, k.rv(0.7)));
      k.noise(t - 0.08, 0.5, 0.15, 'bandpass', 400, 1, { sweep: 6000, attack: 0.2 });
    },
    bad() { if (!K()) return; const k = A.kit, t = k.now(); k.tone('triangle', 320, 170, t, 0.16, 0.22); k.noise(t, 0.06, 0.1, 'lowpass', 600, 1); },
    tray() {
      if (!K()) return; const k = A.kit, t = k.now();
      k.noise(t, 0.28, 0.1, 'bandpass', 500, 1, { sweep: 3200 });
      for (let i = 0; i < 3; i++) k.play('pluck', k.note(4 + i * 2, 1), t + 0.08 + i * 0.07, 0.1, 0.18);
    },
    hammer() {
      if (!K()) return; const k = A.kit, t = k.now();
      k.tone('square', 240, 90, t, 0.08, 0.16); k.noise(t, 0.18, 0.4, 'highpass', 2600, 1); k.tone('sine', 140, 50, t, 0.2, 0.45);
      k.play('bell', k.note(0, 1), t + 0.02, 0.3, 0.15, k.rv(0.3));
    },
    rot() { if (!K()) return; const k = A.kit, t = k.now(); k.noise(t, 0.16, 0.18, 'bandpass', 700, 1.5, { sweep: 4500 }); k.play('pluck', k.note(9, 1), t + 0.06, 0.1, 0.2); },
    ice() { if (!K()) return; const k = A.kit, t = k.now(); k.noise(t, 0.14, 0.3, 'highpass', 5200, 1); k.tone('sine', 3300, 2300, t, 0.1, 0.08); k.tone('sine', 4100, 3900, t + 0.04, 0.08, 0.05); },
    goal() {
      if (!K()) return; const k = A.kit, t = k.now();
      [0, 2, 4, 5, 7, 9].forEach((d, i) => k.play('celesta', k.note(d + 5, 1), t + i * 0.06, 0.3, 0.25, k.rv(0.6)));
      [0, 2, 4].forEach((d) => k.play('bell', k.note(d + 10, 1), t + 0.4, 0.9, 0.2, k.rv(0.7)));
    },
    stuck() { if (!K()) return; const k = A.kit, t = k.now(); [6, 4, 2, 0].forEach((d, i) => k.play('epiano', k.note(d, 1), t + i * 0.12, 0.25, 0.25, k.rv(0.4))); k.tone('sine', 160, 60, t + 0.4, 0.5, 0.3); },
    tick(i) { if (!K()) return; const k = A.kit, t = k.now(); k.play('marimba', k.note(5 + (i % 10), 1), t, 0.08, 0.25); k.tone('sine', 1800 + i * 60, 2400 + i * 60, t, 0.05, 0.05); },
    perfect() {
      if (!K()) return; const k = A.kit, t = k.now();
      for (let i = 0; i < 10; i++) k.play('celesta', k.note(i + 5, 1), t + i * 0.035, 0.25, 0.22, k.rv(0.6));
      [0, 4, 7].forEach((d) => k.play('strings', k.note(d, 1), t, 1.2, 0.18, k.rv(0.6)));
    },
  };

  class Block extends Base {
    static info = { id: 'block', name: '보석 블록', icon: '💎', section: SEC, color: '#ff4d8d', desc: '블록으로 줄을 채워 터뜨리고 반짝이는 보석을 모아요!' };
    static howto = [
      '아래 블록을 끌어다 보드에 놓아요.',
      '가로·세로 한 줄을 꽉 채우면 펑! 줄이 사라져요.',
      '보석이 든 칸을 터뜨려 목표 보석을 모으세요.',
      '여러 줄을 한 번에, 연달아 터뜨리면 콤보 점수!',
    ];
    static params(stage, C) {
      const k = cfg(C, SEC, DEFAULTS);
      const d = ease(stage, k['난이도_간격']);
      const moves = Math.round(lerp(k['이동수_시작'], k['이동수_끝'], d));
      const scoreStage = k['점수판_간격'] > 0 && stage > k['튜토리얼_판'] && stage % k['점수판_간격'] === 0;
      const kinds = Math.max(1, Math.min(GEMS.length, k['보석종류_최대'], k['보석종류_시작'] + Math.floor((stage - 1) / Math.max(1, k['보석종류증가_간격']))));
      return {
        fee: k['입장료'], reward: k['클리어보상'], extendCost: k['연장_가격'], extendSec: 0, extendMoves: k['연장_수'],
        extendText: `+${k['연장_수']}수`, time: 0,
        star: [0, Math.round(moves * k['별2_수당'] / 50) * 50, Math.round(moves * k['별3_수당'] / 50) * 50],
        d, moves, scoreStage, kinds,
        gemGoal: Math.round(lerp(k['보석목표_시작'], k['보석목표_끝'], d)),
        scoreGoal: Math.round(moves * k['점수목표_수당'] * (0.8 + 0.5 * d) / 100) * 100,
        gemP: lerp(k['보석블록_확률_시작'], k['보석블록_확률_끝'], d) / 100,
        initGems: Math.round(lerp(k['초기보석_시작'], k['초기보석_끝'], d)),
        initBlocks: Math.round(lerp(k['초기블록_시작'], k['초기블록_끝'], d)),
        ice: stage >= k['얼음_시작판'] ? Math.round(k['얼음_최대'] * ease(stage - k['얼음_시작판'] + 2, k['난이도_간격'])) : 0,
        hard: lerp(k['큰블록_비율_시작'], k['큰블록_비율_끝'], d) / 100,
        guarantee: lerp(k['맞춤보장_시작'], k['맞춤보장_끝'], d) / 100,
        help: lerp(k['도움블록_확률_시작'], k['도움블록_확률_끝'], d) / 100,
        tutorial: stage <= k['튜토리얼_판'],
        comboKeep: Math.max(1, k['콤보_유지수']),
        leftPts: k['남은수_점수'], leftCoin: k['남은수_보상'], comboCoin: k['콤보_보상'],
        cost: { rot: k['회전_가격'], new: k['새블록_가격'], ham: k['망치_가격'] },
        relieve: k['연장_정리칸'],
      };
    }

    constructor(host, o) {
      super(host, o);
      const p = this.p;
      this.stage = o.stage || 1;
      this.hud({
        title: '보석 블록', sub: '', timer: false,
        tools: [
          { id: 'rot', ico: '🔄', label: '회전', cost: p.cost.rot },
          { id: 'new', ico: '🎲', label: '새 블록', cost: p.cost.new },
          { id: 'ham', ico: '🔨', label: '망치', cost: p.cost.ham },
        ],
      });
      this.ui.cv.style.touchAction = 'none';
      this.ui.tools.querySelectorAll('.mg-tool').forEach((b) => { b.style.whiteSpace = 'nowrap'; });
      this.ui.wrap.style.touchAction = 'none';
      this.cache = new Map();
      this.fxa = [];
      this.q = [];
      this.ct = 0; this.hs = 0;
      this.moves = p.moves; this.maxMoves = p.moves;
      this.combo = 0; this.maxCombo = 0; this.since = 0;
      this.idle = 0; this.hint = null; this.mode = null; this.drag = null; this.ghost = null;
      this.lock = false; this.outcome = null; this.placed = 0;
      this.board = new Array(N * N).fill(null);
      this.tray = [null, null, null];
      this.trayFit = [true, true, true];
      // goals
      const order = [0, 1, 2, 3, 4];
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      if (p.tutorial || this.stage < 6) { const z = order.indexOf(0); order.splice(z, 1); order.unshift(0); }
      this.goalTypes = order.slice(0, p.kinds);
      if (p.scoreStage) this.goals = [{ k: 'score', need: p.scoreGoal, got: 0, shown: 0 }];
      else {
        const per = Math.floor(p.gemGoal / p.kinds), extra = p.gemGoal - per * p.kinds;
        this.goals = this.goalTypes.map((t, i) => ({ k: 'gem', t, need: Math.max(2, per + (i < extra ? 1 : 0)), got: 0, shown: 0 }));
      }
      this.icons = GEMS.map((g, i) => this.gemIcon(i));
      this.ui.sub.textContent = `${this.stage}판 · ${p.scoreStage ? '점수 ' + U.fmt(p.scoreGoal) + '점' : this.goals.map((g) => GEMS[g.t].n + ' ' + g.need + '개').join(' · ')}`;
      this.buildBoard();
      this.newTray(true);
      const cv = this.ui.cv;
      cv.addEventListener('pointerdown', (e) => this.down(e));
      cv.addEventListener('pointermove', (e) => this.move(e));
      cv.addEventListener('pointerup', (e) => this.up(e));
      cv.addEventListener('pointercancel', (e) => this.up(e, true));
      this.refreshHud();
    }

    /* ---------- level ---------- */
    occ() { const o = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) { const b = this.board[i]; if (b) o[i] = b.ice ? 2 : 1; } return o; }
    pendingTypes() { return this.goals.filter((g) => g.k === 'gem' && g.got < g.need).map((g) => g.t); }
    buildBoard() {
      const p = this.p, R = this.rnd, B = this.board;
      const gemType = () => { const t = this.goalTypes; return t[Math.floor(R() * t.length)]; };
      const mk = (gem) => ({ c: gem >= 0 ? GEMS[gem].blk : Math.floor(R() * BLK.length), gem: gem >= 0 ? gem : -1, ice: 0, b: -1 });
      if (p.tutorial) {
        // one nearly full line with gems and a 2-cell gap, matched by the first piece
        const vertical = this.stage === 2;
        const line = this.stage === 3 ? 5 : 4;
        const gap = 1 + Math.floor(R() * 5);
        this.tut = { vertical, line, gap };
        let gi = 0;
        for (let k = 0; k < N; k++) {
          if (k === gap || k === gap + 1) continue;
          const i = vertical ? k * N + line : line * N + k;
          B[i] = mk(gi < 3 && (k % 2 === 0) ? (gi++, this.goalTypes[0]) : -1);
        }
      }
      let blocks = Math.max(p.initBlocks, p.initGems - (p.tutorial ? 3 : 0));
      let gems = p.tutorial ? 0 : p.initGems;
      const o = () => this.occ();
      let tries = 0;
      const placed = [];
      while (blocks > 0 && tries++ < 400) {
        let r, c;
        if (placed.length && R() < 0.6) {
          const [pr, pc] = placed[Math.floor(R() * placed.length)];
          const dd = [[-1, 0], [1, 0], [0, -1], [0, 1]][Math.floor(R() * 4)];
          r = pr + dd[0]; c = pc + dd[1];
        } else { r = 2 + Math.floor(R() * 6); c = Math.floor(R() * N); }
        if (r < 0 || c < 0 || r >= N || c >= N) continue;
        const cells = [[r, c]];
        if (c !== N - 1 - c && R() < 0.75) cells.push([r, N - 1 - c]);
        if (cells.some(([y, x]) => B[y * N + x])) continue;
        const test = o();
        cells.forEach(([y, x]) => { test[y * N + x] = 1; });
        const [fr, fc] = fullLines(test);
        if (fr.length || fc.length) continue;
        // keep rows from getting too full early (dead boards)
        let rowCnt = 0; for (let x = 0; x < N; x++) if (test[r * N + x]) rowCnt++;
        if (rowCnt > 6) continue;
        const colC = mk(-1).c;
        cells.forEach(([y, x]) => { B[y * N + x] = { c: colC, gem: -1, ice: 0, b: -1 }; placed.push([y, x]); });
        blocks -= cells.length;
      }
      const filled = [];
      for (let i = 0; i < N * N; i++) if (B[i] && B[i].gem < 0 && !(p.tutorial && this.isTutLine(i))) filled.push(i);
      for (let i = filled.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [filled[i], filled[j]] = [filled[j], filled[i]]; }
      while (gems > 0 && filled.length) { const i = filled.pop(); const t = gemType(); B[i].gem = t; B[i].c = GEMS[t].blk; gems--; }
      let ice = p.ice;
      while (ice > 0 && filled.length) { B[filled.pop()].ice = 1; ice--; }
      // intro: cells drop in
      for (let i = 0; i < N * N; i++) if (B[i]) B[i].in = 0.1 + ((i / N) | 0) * 0.04 + (i % N) * 0.015;
    }
    isTutLine(i) { const t = this.tut; if (!t) return false; return t.vertical ? i % N === t.line : ((i / N) | 0) === t.line; }

    makePiece(sh) {
      const p = this.p, R = this.rnd;
      const pc = { cells: sh.cells.map((x) => x.slice()), w: sh.w, h: sh.h, col: Math.floor(R() * BLK.length), gems: sh.cells.map(() => -1), in: 0, rot: -9 };
      if (R() < p.gemP) {
        const pend = this.pendingTypes();
        const t = pend.length && R() < 0.85 ? pend[Math.floor(R() * pend.length)] : this.goalTypes.length && R() < 0.5 ? this.goalTypes[Math.floor(R() * this.goalTypes.length)] : Math.floor(R() * GEMS.length);
        pc.gems[Math.floor(R() * pc.cells.length)] = t;
        if (R() < 0.15 && pc.cells.length >= 4) pc.gems[Math.floor(R() * pc.cells.length)] = t;
      }
      return pc;
    }
    pickShape(list) {
      const h = this.p.hard;
      const i = U.wpick(list, (s) => s.wE * (1 - h) + s.wH * h, this.rnd);
      return list[i];
    }
    // fill the empty tray slots (all of them when full=true)
    newTray(first, force) {
      const p = this.p, R = this.rnd;
      const slots = [];
      for (let i = 0; i < 3; i++) if (first || !this.tray[i]) slots.push(i);
      const occ = this.occ();
      const keep = this.tray.filter((x, i) => x && !slots.includes(i));
      const guarantee = force || first || R() < p.guarantee;
      let pieces = null;
      for (let att = 0; att < 40 && !pieces; att++) {
        const cand = [];
        for (let k = 0; k < slots.length; k++) {
          let sh = null;
          if (att < 30 && R() < p.help) {
            const helpers = SHAPES.filter((s) => canClear(occ, s));
            if (helpers.length) sh = this.pickShape(helpers);
          }
          if (!sh) sh = this.pickShape(att < 25 ? SHAPES : SHAPES.filter((s) => s.cells.length <= 3));
          cand.push(sh);
        }
        if (!guarantee || placeable(occ, cand.concat(keep))) pieces = cand;
      }
      if (!pieces) {
        // fallback: smallest pieces that fit
        pieces = slots.map(() => SHAPES[0]);
        for (const s of [SHAPES.filter((x) => x.cells.length === 2), [SHAPES[0]]]) {
          const pick = slots.map(() => s[Math.floor(R() * s.length)]);
          if (placeable(occ, pick)) { pieces = pick; break; }
        }
      }
      // tutorial: first piece fills the gap
      if (first && p.tutorial && this.tut) {
        const sh = SHAPES.find((s) => s.cells.length === 2 && (this.tut.vertical ? s.h === 2 : s.w === 2));
        pieces[1] = sh;
      }
      slots.forEach((si, k) => {
        const pc = this.makePiece(pieces[k]);
        if (first && p.tutorial && k === 1) pc.gems = [this.goalTypes[0], -1];
        pc.in = this.ct + (first ? 0.6 : 0.05) + k * 0.08;
        this.tray[si] = pc;
      });
      if (!first) S.tray();
      this.hint = null;
      this.calcFit();
    }
    calcFit() { const o = this.occ(); for (let i = 0; i < 3; i++) this.trayFit[i] = !!(this.tray[i] && anyFit(o, this.tray[i])); }

    /* ---------- layout ---------- */
    layout() {
      if (!this.fit()) return;
      const W = this.W, H = this.H;
      const land = W > H * 1.15;
      this.land = land;
      if (land) {
        const B = Math.min(H * 0.96, (W * 0.96) / 1.46);
        const pad = B * 0.035;
        const cs = Math.floor((B - pad * 2) / N);
        const tw = B * 0.42, gap = B * 0.04;
        const x0 = (W - (B + gap + tw)) / 2;
        this.cs = cs; this.pad = pad;
        this.bx = Math.round(x0 + (B - cs * N) / 2); this.by = Math.round((H - cs * N) / 2);
        const tx = x0 + B + gap, ty = this.by - pad, th = cs * N + pad * 2;
        this.trayR = [tx, ty, tw, th];
        this.slots = [0, 1, 2].map((i) => [tx, ty + (th / 3) * i, tw, th / 3]);
      } else {
        const B = Math.min(W * 0.97, H / 1.36);
        const pad = B * 0.035;
        const cs = Math.floor((B - pad * 2) / N);
        const thh = B * 0.31, gap = B * 0.035;
        const y0 = Math.max(0, (H - (B + gap + thh)) / 2);
        this.cs = cs; this.pad = pad;
        this.bx = Math.round((W - cs * N) / 2); this.by = Math.round(y0 + (B - cs * N) / 2);
        const tx = this.bx - pad, ty = y0 + B + gap, tw = cs * N + pad * 2;
        this.trayR = [tx, ty, tw, thh];
        this.slots = [0, 1, 2].map((i) => [tx + (tw / 3) * i, ty, tw / 3, thh]);
      }
      const sl = this.slots[0];
      this.ts = Math.floor(Math.min(this.cs * 0.62, sl[2] / 3.7, sl[3] / 3.7));
      this.cache.clear();
      this.panel = null;
    }

    /* ---------- sprites ---------- */
    spr(key, size, fn) {
      const k = key + '|' + size;
      let cv = this.cache.get(k);
      if (cv) return cv;
      cv = document.createElement('canvas');
      cv.width = cv.height = Math.max(4, size);
      fn(cv.getContext('2d'), size);
      this.cache.set(k, cv);
      return cv;
    }
    blockSpr(col, px) {
      return this.spr('b' + col, px, (g, s) => {
        const base = col === 'w' ? '#ffffff' : BLK[col];
        const m = s * 0.03, r = s * 0.17, x0 = m, x1 = s - m, w = x1 - x0;
        rr(g, x0, x0, w, w, r);
        g.save(); g.clip();
        const bg = g.createLinearGradient(0, 0, s, s);
        bg.addColorStop(0, U.shade(base, 0.25)); bg.addColorStop(1, U.shade(base, -0.3));
        g.fillStyle = bg; g.fillRect(0, 0, s, s);
        // bevel facets
        const i0 = s * 0.2, i1 = s - s * 0.2;
        const facet = (pts, c) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.closePath(); g.fillStyle = c; g.fill(); };
        facet([0, 0, s, 0, i1, i0, i0, i0], U.shade(base, 0.5));
        facet([0, 0, i0, i0, i0, i1, 0, s], U.shade(base, 0.22));
        facet([s, 0, s, s, i1, i1, i1, i0], U.shade(base, -0.18));
        facet([0, s, i0, i1, i1, i1, s, s], U.shade(base, -0.42));
        // table
        const tg = g.createLinearGradient(i0, i0, i1, i1);
        tg.addColorStop(0, U.shade(base, 0.18)); tg.addColorStop(0.6, base); tg.addColorStop(1, U.shade(base, -0.12));
        g.fillStyle = tg; g.fillRect(i0, i0, i1 - i0, i1 - i0);
        // gloss
        const gl = g.createLinearGradient(0, 0, 0, s * 0.55);
        gl.addColorStop(0, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.beginPath(); g.ellipse(s * 0.42, s * 0.2, s * 0.42, s * 0.22, -0.2, 0, Math.PI * 2); g.fillStyle = gl; g.fill();
        g.restore();
        rr(g, x0, x0, w, w, r); g.lineWidth = Math.max(1, s * 0.035); g.strokeStyle = U.shade(base, -0.55); g.stroke();
        rr(g, x0 + s * 0.04, x0 + s * 0.04, w - s * 0.08, w - s * 0.08, r * 0.8); g.lineWidth = Math.max(1, s * 0.02); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
        // sparkle
        this.star(g, s * 0.25, s * 0.24, s * 0.09, 'rgba(255,255,255,0.95)');
      });
    }
    star(g, x, y, r, c) {
      g.fillStyle = c; g.beginPath();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rad = k % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    }
    gemPath(g, t, s) {
      const cx = s / 2, cy = s / 2, R = s * 0.42;
      const pts = [];
      if (t === 0) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      else if (t === 1) { const a = R * 0.95, b = R * 0.45; pts.push([cx - b, cy - a], [cx + b, cy - a], [cx + a, cy - b], [cx + a, cy + b], [cx + b, cy + a], [cx - b, cy + a], [cx - a, cy + b], [cx - a, cy - b]); }
      else if (t === 2) { const a = R * 0.78, b = R, c2 = R * 0.3; pts.push([cx - a + c2, cy - b], [cx + a - c2, cy - b], [cx + a, cy - b + c2], [cx + a, cy + b - c2], [cx + a - c2, cy + b], [cx - a + c2, cy + b], [cx - a, cy + b - c2], [cx - a, cy - b + c2]); }
      else if (t === 3) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k / 3) * Math.PI * 2; pts.push([cx + Math.cos(a - 0.12) * R * 1.05, cy + 0.12 * R + Math.sin(a - 0.12) * R * 1.05]); pts.push([cx + Math.cos(a + 0.12) * R * 1.05, cy + 0.12 * R + Math.sin(a + 0.12) * R * 1.05]); }
      else for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([cx + hx * R / 16.5, cy - hy * R / 16.5 + R * 0.05]); }
      return pts;
    }
    gemSpr(t, px, face) {
      return this.spr('g' + t + (face ? 'f' : ''), px, (g, s) => {
        const G = GEMS[t];
        const pts = this.gemPath(g, t, s);
        const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.04;
        path(); g.fillStyle = G.d; g.fill(); g.restore();
        const fg = g.createRadialGradient(s * 0.4, s * 0.35, s * 0.03, s / 2, s / 2, s * 0.5);
        fg.addColorStop(0, G.l); fg.addColorStop(0.45, G.c); fg.addColorStop(1, G.d);
        path(); g.fillStyle = fg; g.fill();
        // facets
        g.save(); path(); g.clip();
        const cx = s / 2, cy = s / 2;
        const step = pts.length > 10 ? 4 : 1;
        for (let i = 0; i < pts.length; i += step) {
          const a = pts[i], b = pts[(i + step) % pts.length];
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath();
          g.fillStyle = i % (2 * step) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; g.fill();
        }
        g.beginPath(); pts.forEach(([x, y], i) => { const X = cx + (x - cx) * 0.5, Y = cy + (y - cy) * 0.5 - s * 0.03; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
        g.fillStyle = U.rgba(G.l, 0.45); g.fill();
        g.restore();
        path(); g.lineWidth = Math.max(1, s * 0.04); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
        g.lineWidth = Math.max(1, s * 0.02); g.strokeStyle = G.d; g.stroke();
        if (face && s >= 18) {
          // cute face
          const ey = s * 0.53, ex = s * 0.12, er = s * 0.065;
          [-1, 1].forEach((d) => {
            g.fillStyle = '#2a0b22'; g.beginPath(); g.ellipse(cx + d * ex, ey, er * 0.85, er * 1.15, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + d * ex - er * 0.25, ey - er * 0.45, er * 0.4, 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(255,120,170,0.55)'; g.beginPath(); g.ellipse(cx + d * ex * 2.1, ey + er * 1.4, er * 1.1, er * 0.6, 0, 0, Math.PI * 2); g.fill();
          });
          g.strokeStyle = '#2a0b22'; g.lineWidth = Math.max(1, s * 0.022); g.beginPath(); g.arc(cx, ey + er * 1.1, er * 0.7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        }
        this.star(g, s * 0.34, s * 0.28, s * 0.1, '#ffffff');
      });
    }
    iceSpr(px) {
      return this.spr('ice', px, (g, s) => {
        const m = s * 0.02;
        rr(g, m, m, s - 2 * m, s - 2 * m, s * 0.17);
        const ig = g.createLinearGradient(0, 0, s, s);
        ig.addColorStop(0, 'rgba(225,248,255,0.75)'); ig.addColorStop(0.5, 'rgba(150,215,255,0.45)'); ig.addColorStop(1, 'rgba(190,235,255,0.7)');
        g.fillStyle = ig; g.fill();
        g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = 'rgba(240,252,255,0.95)'; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1, s * 0.025);
        g.beginPath(); g.moveTo(s * 0.18, s * 0.7); g.lineTo(s * 0.4, s * 0.52); g.lineTo(s * 0.36, s * 0.34); g.moveTo(s * 0.4, s * 0.52); g.lineTo(s * 0.62, s * 0.58); g.lineTo(s * 0.82, s * 0.42); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(s * 0.12, s * 0.1); g.lineTo(s * 0.5, s * 0.1); g.lineTo(s * 0.12, s * 0.45); g.closePath(); g.fill();
        // tiny lock
        const lx = s * 0.78, ly = s * 0.2, lr = s * 0.09;
        g.strokeStyle = '#3a6f99'; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.arc(lx, ly, lr * 0.7, Math.PI, 0); g.stroke();
        g.fillStyle = '#ffd54a'; rr(g, lx - lr, ly, lr * 2, lr * 1.5, lr * 0.3); g.fill();
      });
    }
    panelSpr() {
      if (this.panel) return this.panel;
      const cs = this.cs, pad = this.pad, dpr = this.dpr;
      const W = cs * N + pad * 2, M = 24;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((W + M * 2) * dpr); cv.height = Math.ceil((W + M * 2) * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const acc = this.th.accent || '#ff4fd8', acc2 = this.th.accent2 || '#00e5ff';
      g.save(); g.shadowColor = U.rgba(acc, 0.55); g.shadowBlur = 22;
      rr(g, M, M, W, W, pad * 1.4);
      const pg = g.createLinearGradient(0, M, 0, M + W);
      pg.addColorStop(0, 'rgba(28,14,58,0.9)'); pg.addColorStop(1, 'rgba(8,5,22,0.94)');
      g.fillStyle = pg; g.fill(); g.restore();
      rr(g, M, M, W, W, pad * 1.4);
      const bg = g.createLinearGradient(M, M, M + W, M + W);
      bg.addColorStop(0, acc); bg.addColorStop(0.5, 'rgba(255,255,255,0.7)'); bg.addColorStop(1, acc2);
      g.lineWidth = 2.5; g.strokeStyle = bg; g.stroke();
      rr(g, M + 4, M + 4, W - 8, W - 8, pad * 1.1); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const x = M + pad + c * cs, y = M + pad + r * cs;
        rr(g, x + cs * 0.05, y + cs * 0.05, cs * 0.9, cs * 0.9, cs * 0.16);
        const sg = g.createLinearGradient(0, y, 0, y + cs);
        const alt = (r + c) % 2 ? 0.06 : 0.09;
        sg.addColorStop(0, `rgba(0,0,0,${0.35})`); sg.addColorStop(1, `rgba(255,255,255,${alt})`);
        g.fillStyle = sg; g.fill();
        g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.06)'; g.stroke();
      }
      this.panel = { cv, M, W };
      return this.panel;
    }
    gemIcon(t) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const save = this.cache; this.cache = new Map();
      const s = this.gemSpr(t, 64, true); this.cache = save;
      c.getContext('2d').drawImage(s, 0, 0);
      return c.toDataURL();
    }

    /* ---------- HUD ---------- */
    refreshHud() {
      this.meter(this.moves / this.maxMoves, `남은 수 ${this.moves}`, this.moves <= 3);
      const chip = (inner, done, i) => `<span data-goal="${i}" style="display:inline-flex;align-items:center;gap:3px;padding:1px 8px 1px 2px;border-radius:999px;background:${done ? 'rgba(40,200,120,.35)' : 'rgba(0,0,0,.38)'};border:1px solid ${done ? '#5dffb0' : 'rgba(255,255,255,.15)'}">${inner}</span>`;
      const html = this.goals.map((g, i) => g.k === 'gem'
        ? chip(`<img src="${this.icons[g.t]}" style="width:22px;height:22px;display:block">${g.shown >= g.need ? '✔' : `${g.shown}/${g.need}`}`, g.shown >= g.need, i)
        : chip(`<span style="padding-left:6px">⭐ ${U.fmt(Math.min(g.need, this.score))}/${U.fmt(g.need)}</span>`, this.score >= g.need, i)).join('')
        + (this.p.scoreStage ? '' : `<span style="opacity:.85">${U.fmt(this.score)}점</span>`)
        + (this.combo >= 2 ? `<span class="mg-combo">콤보 x${this.combo}</span>` : '');
      this.info(html);
    }
    flyGem(t, x, y, gi, delay) {
      const goal = this.goals[gi];
      const el = this.ui.info.querySelector(`[data-goal="${gi}"]`);
      const [px, py] = this.page(x, y);
      const done = () => { goal.shown = Math.min(goal.need, goal.shown + 1); this.refreshHud(); };
      if (!el || !document.body.animate) { setTimeout(done, 500); return; }
      const b = el.getBoundingClientRect();
      const im = document.createElement('img');
      im.src = this.icons[t];
      im.style.cssText = `position:fixed;left:0;top:0;width:34px;height:34px;pointer-events:none;z-index:70;filter:drop-shadow(0 0 6px ${GEMS[t].c})`;
      this.host.appendChild(im);
      const tx = b.left + 13, ty = b.top + b.height / 2;
      const mx = (px + tx) / 2 + (Math.random() - 0.5) * 120, my = Math.min(py, ty) - 60;
      const an = im.animate([
        { transform: `translate(${px - 17}px,${py - 17}px) scale(0.6)`, opacity: 1 },
        { transform: `translate(${px - 17}px,${py - 30}px) scale(1.3)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${mx - 17}px,${my - 17}px) scale(1.1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx - 17}px,${ty - 17}px) scale(0.7)`, opacity: 0.9 },
      ], { duration: 720, delay: delay * 1000, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
      an.onfinish = () => { im.remove(); done(); if (!this.dead) { el.animate && el.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260 }); } };
    }

    /* ---------- input ---------- */
    cellAt(x, y) { const c = Math.floor((x - this.bx) / this.cs), r = Math.floor((y - this.by) / this.cs); return r >= 0 && c >= 0 && r < N && c < N ? [r, c] : null; }
    slotAt(x, y) { for (let i = 0; i < 3; i++) { const [sx, sy, sw, sh] = this.slots[i]; if (x >= sx && x < sx + sw && y >= sy && y < sy + sh) return i; } return -1; }
    setMode(m) {
      this.mode = m;
      this.ui.tools.querySelectorAll('[data-tool]').forEach((b) => {
        const on = b.dataset.tool === m;
        b.style.outline = on ? '3px solid #fff' : '';
        b.style.boxShadow = on ? `0 0 18px ${this.th.accent}` : '';
      });
    }
    down(e) {
      if (!this.running || this.paused || this.lock || !this.cs) return;
      A.init && A.init();
      const [x, y] = this.local(e);
      this.idle = 0;
      if (this.mode === 'ham') {
        const cell = this.cellAt(x, y);
        if (cell && this.board[cell[0] * N + cell[1]]) { this.hammer(cell[0], cell[1]); return; }
        this.setMode(null);
      }
      const si = this.slotAt(x, y);
      if (this.mode === 'rot') {
        if (si >= 0 && this.tray[si]) { this.rotate(si); return; }
        this.setMode(null);
      }
      if (si < 0 || !this.tray[si] || this.drag) return;
      const pc = this.tray[si];
      const [cx, cy] = this.slotCenter(si);
      this.drag = { i: si, pc, x, y, touch: e.pointerType !== 'mouse', dx: cx, dy: cy, sc: this.tsOf(pc, si) / this.cs, t0: this.ct, id: e.pointerId };
      try { this.ui.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      S.pick();
      this.updGhost();
    }
    move(e) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const [x, y] = this.local(e);
      this.drag.x = x; this.drag.y = y;
      this.updGhost();
    }
    up(e, cancel) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      const gh = this.ghost; this.ghost = null;
      if (!cancel && gh && gh.ok && this.running && !this.lock) { this.place(d.i, gh.r, gh.c); return; }
      // return to tray
      this.fxa.push({ k: 'back', pc: d.pc, i: d.i, x: d.dx, y: d.dy, s: d.sc, t0: this.ct });
      d.pc.hide = true;
      if (gh && gh.inside) S.bad();
    }
    // top-left of the dragged piece (target, not smoothed) in canvas px
    dragTL(d) {
      const cs = this.cs, pw = d.pc.w * cs, ph = d.pc.h * cs;
      const lift = d.touch ? ph + cs * 1.1 : ph * 0.5 + cs * 0.35;
      return [d.x - pw / 2, d.y - lift];
    }
    updGhost() {
      const d = this.drag; if (!d) return;
      const [x, y] = this.dragTL(d);
      const r = Math.round((y - this.by) / this.cs), c = Math.round((x - this.bx) / this.cs);
      const inside = r > -2 && c > -2 && r + d.pc.h < N + 2 && c + d.pc.w < N + 2;
      const occ = this.occ();
      const ok = fits(occ, d.pc.cells, r, c);
      let hl = null;
      if (ok) {
        const o = occ.slice();
        for (const [dr, dc] of d.pc.cells) o[(r + dr) * N + c + dc] = 1;
        const [rows, cols] = fullLines(o);
        if (rows.length || cols.length) {
          hl = new Uint8Array(N * N);
          rows.forEach((yy) => { for (let xx = 0; xx < N; xx++) hl[yy * N + xx] = 1; });
          cols.forEach((xx) => { for (let yy = 0; yy < N; yy++) hl[yy * N + xx] = 1; });
        }
      }
      const prev = this.ghost;
      this.ghost = { r, c, ok, inside, hl, pc: d.pc };
      if (ok && (!prev || !prev.ok || prev.r !== r || prev.c !== c) && K()) { const k = A.kit; k.tone('sine', 1400, 1500, k.now(), 0.025, 0.04); }
    }
    // cell size of a piece shown in the tray (big pieces shrink to fit their slot)
    tsOf(pc, i) { const sl = this.slots[i]; return Math.min(this.ts, (sl[2] * 0.88) / pc.w, (sl[3] * 0.84) / pc.h); }
    slotCenter(i) { const [sx, sy, sw, sh] = this.slots[i]; return [sx + sw / 2, sy + sh / 2]; }

    /* ---------- actions ---------- */
    later(sec, fn) { this.q.push({ t: sec, fn }); }
    // public: place tray piece i with its top-left cell at (r, c)
    place(i, r, c) {
      const pc = this.tray[i];
      if (!pc || this.lock || !this.running) return false;
      const occ0 = this.occ();
      if (!fits(occ0, pc.cells, r, c)) return false;
      this.tray[i] = null;
      this.hint = null; this.idle = 0;
      this.moves--; this.placed++;
      const cs = this.cs;
      pc.cells.forEach(([dr, dc], k) => {
        this.board[(r + dr) * N + c + dc] = { c: pc.col, gem: pc.gems[k], ice: 0, b: this.ct, in: 0 };
      });
      this.score += pc.cells.length * 10;
      S.place(pc.cells.length);
      const cxp = this.bx + (c + pc.w / 2) * cs, cyp = this.by + (r + pc.h / 2) * cs;
      this.ring(cxp, cyp, U.rgba(BLK[pc.col], 0.8), cs * 1.6, 3);
      // clears
      const [rows, cols] = fullLines(this.occ());
      const lines = rows.length + cols.length;
      let gemsGot = 0;
      if (lines) {
        this.combo++; this.since = 0;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const hit = new Map();
        rows.forEach((y) => { for (let x = 0; x < N; x++) { const i2 = y * N + x; hit.set(i2, Math.min(hit.get(i2) ?? 9, Math.abs(x - (c + pc.w / 2 - 0.5)) * 0.035)); } });
        cols.forEach((x) => { for (let y = 0; y < N; y++) { const i2 = y * N + x; hit.set(i2, Math.min(hit.get(i2) ?? 9, Math.abs(y - (r + pc.h / 2 - 0.5)) * 0.035)); } });
        rows.forEach((y) => this.fxa.push({ k: 'sweep', row: y, from: c + pc.w / 2, t0: this.ct }));
        cols.forEach((x) => this.fxa.push({ k: 'sweep', col: x, from: r + pc.h / 2, t0: this.ct }));
        let gemN = 0;
        hit.forEach((delay, i2) => {
          const cell = this.board[i2];
          if (!cell) return;
          const y = (i2 / N) | 0, x = i2 % N;
          if (cell.ice) {
            cell.ice = 0; cell.b = this.ct + delay;
            this.fxa.push({ k: 'ice', r: y, c: x, t0: this.ct + delay });
            return;
          }
          this.board[i2] = null;
          this.fxa.push({ k: 'clr', r: y, c: x, cell, t0: this.ct + delay, done: false });
          if (cell.gem >= 0) { this.collect(cell.gem, x, y, delay + gemN * 0.06); gemN++; }
        });
        gemsGot = gemN;
        const mult = 1 + 0.5 * (this.combo - 1);
        const base = lines <= 5 ? LINE_PTS[lines] : 1500 + (lines - 5) * 500;
        const pts = Math.round(base * mult);
        this.score += pts;
        S.clear(lines, this.combo);
        this.pop(cxp, cyp - cs * 0.5, `+${pts}`, '#ffe27a', 24 + Math.min(lines, 4) * 5);
        if (this.combo >= 2) setTimeout(() => !this.dead && this.pop(cxp, cyp - cs * 1.4, `콤보 x${this.combo}`, '#ff9bf0', 26), 120);
        const lv = Math.max(lines >= 5 ? 4 : lines >= 4 ? 3 : lines >= 3 ? 2 : lines >= 2 ? 1 : 0,
          this.combo >= 10 ? 4 : this.combo >= 7 ? 3 : this.combo >= 5 ? 2 : this.combo >= 3 ? 1 : 0);
        if (lv) {
          this.banner(HYPE[lv], lv >= 3 ? 'good' : 'info', 1100);
          S.hype(lv);
          this.hs = 0.05 + lv * 0.025;
          if (lv >= 3) this.explode(cxp, cyp, 1.2 + lv * 0.5, [this.th.accent, '#ffffff', '#ffe27a']);
        }
        if (lines >= 2 || this.combo >= 3) this.shake(450);
        if (!this.board.some(Boolean)) {
          this.score += 1500;
          setTimeout(() => { if (this.dead) return; this.banner('PERFECT! +1500', 'good', 1500); S.perfect(); this.explode(this.bx + cs * 4, this.by + cs * 4, 3, ['#ffe27a', '#fff', this.th.accent2]); }, 350);
          this.o.onEvent('special', { kind: 'perfect' });
        }
        this.o.onEvent('clear', { lines });
        if (this.combo >= 2) this.o.onEvent('combo', { n: this.combo });
      } else {
        this.since++;
        if (this.since >= this.p.comboKeep) this.combo = 0;
      }
      this.o.onEvent('place', { cells: pc.cells.length, lines, gems: gemsGot });
      if (!this.tray.some(Boolean)) this.newTray(false);
      else this.calcFit();
      this.refreshHud();
      this.checkEnd();
      return true;
    }
    collect(t, x, y, delay) {
      this.score += 50;
      const gi = this.goals.findIndex((g) => g.k === 'gem' && g.t === t && g.got < g.need);
      const cx = this.bx + (x + 0.5) * this.cs, cy = this.by + (y + 0.5) * this.cs;
      setTimeout(() => { if (this.dead) return; this.burst(cx, cy, GEMS[t].c, 10, 0.8); S.gem(Math.min(6, (delay * 12) | 0)); }, delay * 1000);
      this.o.onEvent('gem', { type: t });
      if (gi < 0) { setTimeout(() => !this.dead && this.pop(cx, cy, '+50', GEMS[t].l, 18), delay * 1000); return; }
      this.goals[gi].got++;
      this.flyGem(t, cx, cy, gi, delay);
    }
    goalsDone() { return this.goals.every((g) => (g.k === 'score' ? this.score >= g.need : g.got >= g.need)); }
    checkEnd() {
      if (this.outcome) return;
      if (this.goalsDone()) { this.finish(); return; }
      if (this.moves <= 0) {
        this.outcome = 'moves'; this.lock = true;
        this.later(0.7, () => { this.banner('수를 다 썼어요!', 'bad', 1200); S.stuck(); });
        this.later(1.7, () => this.lose('moves'));
        return;
      }
      if (!this.trayFit.some(Boolean)) {
        this.outcome = 'full'; this.lock = true;
        this.later(0.6, () => { this.banner('놓을 곳이 없어요!', 'bad', 1200); S.stuck(); this.shake(400); });
        this.later(1.8, () => this.lose('full'));
      }
    }
    finish() {
      this.outcome = 'win'; this.lock = true; this.setMode(null);
      const left = this.moves;
      this.later(0.55, () => { this.banner('스테이지 클리어!', 'good', 1400); S.goal(); this.o.fx.confetti && this.o.fx.confetti(40); });
      const n = Math.min(left, 12);
      let tt = 1.5;
      for (let k = 0; k < n; k++) {
        this.later(tt, () => {
          const add = k === n - 1 ? this.moves : 1;
          this.moves -= add; this.score += this.p.leftPts * add;
          const x = this.bx + this.cs * (0.5 + this.rnd() * 7), y = this.by + this.cs * (0.5 + this.rnd() * 7);
          this.pop(x, y, `+${this.p.leftPts * add}`, '#9fffe0', 22);
          this.burst(x, y, this.th.accent2 || '#00e5ff', 8, 0.6);
          S.tick(k);
          this.refreshHud();
        });
        tt += 0.13;
      }
      this.later(tt + 0.2, () => {
        const rows = [];
        if (left) rows.push([`남은 수 ${left}`, left * this.p.leftCoin]);
        if (this.maxCombo >= 2) rows.push([`최고 콤보 x${this.maxCombo}`, this.maxCombo * this.p.comboCoin]);
        this.win({ rows, maxCombo: this.maxCombo });
      });
    }
    // fail screen paid: more moves + relieve the board
    resume() {
      this.running = true; this.paused = false;
      this.outcome = null; this.lock = false; this.q.length = 0;
      this.moves += this.p.extendMoves; this.maxMoves = Math.max(this.maxMoves, this.moves);
      const B = this.board;
      const rc = new Array(N).fill(0), cc = new Array(N).fill(0);
      for (let i = 0; i < N * N; i++) if (B[i]) { rc[(i / N) | 0]++; cc[i % N]++; }
      const cells = [];
      for (let i = 0; i < N * N; i++) if (B[i]) cells.push([i, rc[(i / N) | 0] + cc[i % N] + this.rnd()]);
      cells.sort((a, b) => b[1] - a[1]);
      let gemN = 0;
      cells.slice(0, this.p.relieve).forEach(([i], k) => {
        const cell = B[i]; B[i] = null;
        const y = (i / N) | 0, x = i % N;
        this.fxa.push({ k: 'clr', r: y, c: x, cell, t0: this.ct + k * 0.04, done: false });
        if (cell.gem >= 0) { this.collect(cell.gem, x, y, k * 0.04 + gemN * 0.05); gemN++; }
      });
      this.calcFit();
      if (!this.trayFit.some(Boolean)) { this.tray = [null, null, null]; this.newTray(false, true); }
      this.since = 0;
      this.banner(`+${this.p.extendMoves}수! 힘내요`, 'info', 1200);
      S.goal();
      this.refreshHud();
      this.checkEnd();
    }
    tool(id) {
      if (this.lock) return;
      if (id === 'rot' || id === 'ham') {
        if (this.mode === id) { this.setMode(null); return; }
        this.setMode(id);
        this.banner(id === 'rot' ? '돌릴 블록을 누르세요' : '부술 칸을 누르세요', 'info', 1000);
        return;
      }
      if (id === 'new') {
        this.setMode(null);
        if (!this.tray.some(Boolean)) return;
        if (!this.pay(this.p.cost.new, '새 블록에')) return;
        const cnt = this.tray.filter(Boolean).length;
        this.tray.forEach((pc, i) => { if (pc) { const [x, y] = this.slotCenter(i); this.burst(x, y, BLK[pc.col], 8, 0.6); } });
        this.tray = this.tray.map(() => null);
        // keep the same number of pieces (the move budget stays fair)
        this.newTray(false, true);
        for (let i = cnt; i < 3; i++) this.tray[i] = null;
        this.calcFit();
        this.o.onEvent('tool', { id });
        this.checkEndLater();
      }
    }
    checkEndLater() { if (!this.trayFit.some(Boolean) && this.tray.some(Boolean)) this.checkEnd(); }
    rotate(i) {
      const pc = this.tray[i];
      if (!pc || !this.pay(this.p.cost.rot, '회전에')) { this.setMode(null); return; }
      // rotate cells and gems together
      const idx = pc.cells.map((p, k) => k);
      const rot = pc.cells.map(([r, c]) => [c, -r]);
      let mr = 99, mc = 99; rot.forEach(([r, c]) => { mr = Math.min(mr, r); mc = Math.min(mc, c); });
      pc.cells = rot.map(([r, c]) => [r - mr, c - mc]);
      void idx;
      [pc.w, pc.h] = [pc.h, pc.w];
      pc.rot = this.ct;
      S.rot();
      this.calcFit();
      this.setMode(null);
      this.o.onEvent('tool', { id: 'rot' });
    }
    hammer(r, c) {
      const i = r * N + c, cell = this.board[i];
      if (!cell) return;
      if (!this.pay(this.p.cost.ham, '망치에')) { this.setMode(null); return; }
      this.board[i] = null;
      const x = this.bx + (c + 0.5) * this.cs, y = this.by + (r + 0.5) * this.cs;
      this.fxa.push({ k: 'ham', x, y, t0: this.ct });
      this.fxa.push({ k: 'clr', r, c, cell, t0: this.ct + 0.18, done: false });
      if (cell.gem >= 0) this.collect(cell.gem, c, r, 0.2);
      setTimeout(() => { if (!this.dead) { S.hammer(); this.shake(300); } }, 170);
      this.setMode(null);
      this.calcFit();
      this.refreshHud();
      this.o.onEvent('tool', { id: 'ham' });
      if (this.goalsDone()) this.checkEnd();
    }
    cheat() {
      this.goals.forEach((g) => { g.got = g.need; g.shown = g.need; });
      this.lock = true; this.outcome = 'win';
      this.refreshHud();
      this.win({ rows: [] });
    }

    /* ---------- loop ---------- */
    update(dt) {
      for (let k = 0; k < this.q.length; k++) {
        const it = this.q[k];
        it.t -= dt;
        if (it.t <= 0) { this.q.splice(k, 1); k--; it.fn(); if (this.dead) return; }
      }
      if (!this.drag && !this.lock) {
        this.idle += dt;
        if (this.p.tutorial && !this.hint && this.idle > (this.placed === 0 ? 0.9 : 6)) this.hint = this.findHint();
      }
    }
    findHint() {
      const occ = this.occ();
      let best = null, bs = -1e9;
      this.tray.forEach((pc, i) => {
        if (!pc) return;
        const b = bestSpot(occ, pc);
        if (!b) return;
        const s = b.lines * 30 + contact(occ, pc.cells, b.r, b.c);
        if (s > bs) { bs = s; best = { i, r: b.r, c: b.c }; }
      });
      if (best) best.t0 = this.ct;
      return best;
    }

    drawPiece(g, pc, x, y, size, alpha, dim) {
      const px = Math.max(4, Math.round(size * this.dpr));
      g.globalAlpha = alpha;
      for (let k = 0; k < pc.cells.length; k++) {
        const [r, c] = pc.cells[k];
        g.drawImage(this.blockSpr(dim ? 'w' : pc.col, px), x + c * size, y + r * size, size, size);
        if (pc.gems[k] >= 0) { const gs = size * 0.78; g.drawImage(this.gemSpr(pc.gems[k], Math.round(gs * this.dpr), true), x + c * size + (size - gs) / 2, y + r * size + (size - gs) / 2, gs, gs); }
      }
      g.globalAlpha = 1;
    }
    drawCell(g, cell, x, y, size, sx, sy, colOverride) {
      const px = Math.max(4, Math.round(this.cs * this.dpr));
      const w = size * sx, h = size * sy;
      const X = x + (size - w) / 2, Y = y + (size - h) / 2 + (size - h) * 0.4;
      g.drawImage(this.blockSpr(colOverride != null ? colOverride : cell.c, px), X, Y, w, h);
      if (cell.gem >= 0) { const gs = 0.8; g.drawImage(this.gemSpr(cell.gem, Math.round(this.cs * gs * this.dpr), true), X + w * (1 - gs) / 2, Y + h * (1 - gs) / 2, w * gs, h * gs); }
      if (cell.ice) g.drawImage(this.iceSpr(px), X, Y, w, h);
    }

    draw(t, dt) {
      const g = this.ctx;
      if (!this.W || !this.cs) return;
      // hit-stop: freeze animation time briefly on big moments
      if (this.hs > 0) this.hs -= dt; else this.ct += dt;
      const ct = this.ct, cs = this.cs, bx = this.bx, by = this.by;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      const P = this.panelSpr();
      g.drawImage(P.cv, bx - this.pad - P.M, by - this.pad - P.M, P.W + P.M * 2, P.W + P.M * 2);
      const gh = this.ghost;
      const acc = this.th.accent || '#ff4fd8', acc2 = this.th.accent2 || '#00e5ff';
      // line preview glow
      if (gh && gh.hl) {
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = U.rgba(BLK[gh.pc.col], 0.18 + 0.1 * Math.sin(ct * 12));
        for (let i = 0; i < N * N; i++) if (gh.hl[i]) g.fillRect(bx + (i % N) * cs, by + ((i / N) | 0) * cs, cs, cs);
        g.restore();
      }
      // blocks
      const B = this.board;
      for (let i = 0; i < N * N; i++) {
        const cell = B[i];
        if (!cell) continue;
        const r = (i / N) | 0, c = i % N;
        let x = bx + c * cs, y = by + r * cs, sx = 1, sy = 1, al = 1;
        if (cell.in) {
          const u = (ct - cell.in) / 0.4;
          if (u < 0) continue;
          if (u < 1) { y -= (1 - U.easeOutBack(u, 1.4)) * cs * 1.2; al = Math.min(1, u * 2.5); } else cell.in = 0;
        }
        if (cell.b >= 0) {
          const u = (ct - cell.b) / 0.32;
          if (u >= 0 && u < 1) { const s = Math.sin(u * Math.PI) * (1 - u); sx = 1 + 0.16 * s; sy = 1 - 0.16 * s; } else if (u >= 1) cell.b = -1;
        }
        g.globalAlpha = al;
        this.drawCell(g, cell, x, y, cs, sx, sy, gh && gh.hl && gh.hl[i] && !cell.ice ? gh.pc.col : null);
        g.globalAlpha = 1;
      }
      // hammer mode: pulse filled cells
      if (this.mode === 'ham') {
        g.strokeStyle = `rgba(255,255,255,${0.35 + 0.3 * Math.sin(ct * 8)})`; g.lineWidth = 2;
        for (let i = 0; i < N * N; i++) if (B[i]) { rr(g, bx + (i % N) * cs + 2, by + ((i / N) | 0) * cs + 2, cs - 4, cs - 4, cs * 0.16); g.stroke(); }
      }
      // ghost
      if (gh) {
        if (gh.ok) {
          this.drawPiece(g, gh.pc, bx + gh.c * cs, by + gh.r * cs, cs, 0.38);
          g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
          for (const [dr, dc] of gh.pc.cells) { rr(g, bx + (gh.c + dc) * cs + 2, by + (gh.r + dr) * cs + 2, cs - 4, cs - 4, cs * 0.16); g.stroke(); }
        } else if (gh.inside) {
          g.fillStyle = 'rgba(255,40,80,0.28)'; g.strokeStyle = 'rgba(255,80,110,0.85)'; g.lineWidth = 2;
          for (const [dr, dc] of gh.pc.cells) {
            const r = gh.r + dr, c = gh.c + dc;
            if (r < 0 || c < 0 || r >= N || c >= N) continue;
            rr(g, bx + c * cs + 3, by + r * cs + 3, cs - 6, cs - 6, cs * 0.16); g.fill(); g.stroke();
          }
        }
      }
      // tutorial hint
      const hn = this.hint;
      if (hn && !this.drag && this.tray[hn.i] && !this.lock) {
        const pc = this.tray[hn.i];
        const pulse = 0.35 + 0.25 * Math.sin(ct * 6);
        this.drawPiece(g, pc, bx + hn.c * cs, by + hn.r * cs, cs, pulse);
        g.strokeStyle = U.rgba(acc2, 0.6 + 0.4 * Math.sin(ct * 6)); g.lineWidth = 3;
        for (const [dr, dc] of pc.cells) { rr(g, bx + (hn.c + dc) * cs + 2, by + (hn.r + dr) * cs + 2, cs - 4, cs - 4, cs * 0.16); g.stroke(); }
        // hand moving from the tray to the target
        const u = ((ct - hn.t0) % 1.8) / 1.4;
        if (u <= 1) {
          const [sx2, sy2] = this.slotCenter(hn.i);
          const tx = bx + (hn.c + pc.w / 2) * cs, ty = by + (hn.r + pc.h / 2) * cs;
          const e2 = U.easeInOutCubic(Math.min(1, u));
          const hx = lerp(sx2, tx, e2), hy = lerp(sy2, ty, e2) - Math.sin(e2 * Math.PI) * cs;
          const hs2 = cs * 1.1;
          g.globalAlpha = Math.min(1, (1 - u) * 4, u * 6 + 0.2);
          g.drawImage(this.handSpr(Math.round(hs2 * this.dpr)), hx - hs2 * 0.3, hy - hs2 * 0.05, hs2, hs2);
          g.globalAlpha = 1;
        }
      }
      // effects on the board
      let w = 0;
      for (let k = 0; k < this.fxa.length; k++) {
        const a = this.fxa[k];
        if (this.drawFx(g, a, ct)) this.fxa[w++] = a;
      }
      this.fxa.length = w;
      // tray
      const [tx, ty, tw, th] = this.trayR;
      g.save();
      rr(g, tx, ty, tw, th, this.pad * 1.4);
      const tg = g.createLinearGradient(0, ty, 0, ty + th);
      tg.addColorStop(0, 'rgba(30,16,60,0.55)'); tg.addColorStop(1, 'rgba(10,6,26,0.7)');
      g.fillStyle = tg; g.fill();
      g.strokeStyle = U.rgba(acc, 0.45); g.lineWidth = 1.5; g.stroke();
      g.restore();
      const ts = this.ts;
      for (let i = 0; i < 3; i++) {
        const pc = this.tray[i];
        const [scx, scy] = this.slotCenter(i);
        if (this.mode === 'rot' && pc) {
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(ct * 7);
          const gs = ts * 5; g.drawImage(root.FxSprites.glow(acc2), scx - gs / 2, scy - gs / 2, gs, gs); g.restore();
        }
        if (!pc || pc.hide || (this.drag && this.drag.i === i)) continue;
        const pts = this.tsOf(pc, i);
        let s = pts, al = 1, ox = 0, ang = 0;
        if (pc.in) {
          const u = (ct - pc.in) / 0.45;
          if (u < 0) continue;
          if (u < 1) { const e2 = U.easeOutBack(u, 1.6); ox = (1 - e2) * (this.land ? tw * 0.8 : th * 1.2); s = pts * (0.6 + 0.4 * Math.min(1, e2)); al = Math.min(1, u * 3); } else pc.in = 0;
        }
        if (pc.rot > 0) { const u = (ct - pc.rot) / 0.3; if (u < 1) ang = -(1 - U.easeOutBack(u, 1.8)) * Math.PI / 2; else pc.rot = -9; }
        const fit = this.trayFit[i];
        const bob = fit && !this.lock ? Math.sin(ct * 2.4 + i * 1.7) * pts * 0.06 : 0;
        g.save();
        g.translate(scx + ox, scy + bob);
        if (ang) g.rotate(ang);
        this.drawPiece(g, pc, -pc.w * s / 2, -pc.h * s / 2, s, al * (fit ? 1 : 0.32), !fit);
        g.restore();
      }
      // dragged piece
      const d = this.drag;
      if (d) {
        const [tlx, tly] = this.dragTL(d);
        const pw = d.pc.w * cs, ph = d.pc.h * cs;
        const tcx = tlx + pw / 2, tcy = tly + ph / 2;
        const k = Math.min(1, dt * 28);
        d.dx += (tcx - d.dx) * k; d.dy += (tcy - d.dy) * k;
        d.sc += (1.06 - d.sc) * Math.min(1, dt * 18);
        const s = cs * d.sc;
        g.save(); g.globalAlpha = 0.35; g.fillStyle = '#000';
        for (const [r, c] of d.pc.cells) { rr(g, d.dx - d.pc.w * s / 2 + c * s + s * 0.12, d.dy - d.pc.h * s / 2 + r * s + s * 0.22, s * 0.9, s * 0.9, s * 0.16); g.fill(); }
        g.restore();
        this.drawPiece(g, d.pc, d.dx - d.pc.w * s / 2, d.dy - d.pc.h * s / 2, s, 1);
      }
    }
    handSpr(px) {
      return this.spr('hand', px, (g, s) => {
        g.font = `${Math.round(s * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = s * 0.1;
        g.fillText('👆', s / 2, s / 2);
      });
    }
    // returns false when the effect is finished
    drawFx(g, a, ct) {
      const cs = this.cs, bx = this.bx, by = this.by;
      const u = (ct - a.t0);
      if (a.k === 'clr') {
        if (u < 0) { this.drawCell(g, a.cell, bx + a.c * cs, by + a.r * cs, cs, 1, 1); return true; }
        const v = u / 0.32;
        if (!a.done) {
          a.done = true;
          const x = bx + (a.c + 0.5) * cs, y = by + (a.r + 0.5) * cs;
          this.shards(x, y, BLK[a.cell.c], 2, cs * 0.22);
        }
        if (v >= 1) return false;
        const s = 1 + 0.35 * U.easeOutCubic(v);
        g.globalAlpha = 1 - v;
        const x = bx + a.c * cs, y = by + a.r * cs;
        this.drawCell(g, a.cell, x - (s - 1) * cs / 2, y - (s - 1) * cs / 2, cs * s, 1, 1);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (1 - v) * 0.9;
        g.drawImage(this.blockSpr('w', Math.round(cs * this.dpr)), x - (s - 1) * cs / 2, y - (s - 1) * cs / 2, cs * s, cs * s);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        return true;
      }
      if (a.k === 'sweep') {
        const v = u / 0.5;
        if (v >= 1) return false;
        g.save(); g.globalCompositeOperation = 'lighter';
        const horiz = a.row != null;
        const x0 = horiz ? bx : bx + a.col * cs, y0 = horiz ? by + a.row * cs : by;
        const L = cs * N;
        // line flash
        g.globalAlpha = (1 - v) * 0.55;
        g.fillStyle = '#ffffff';
        if (horiz) g.fillRect(x0, y0 + cs * 0.1, L, cs * 0.8); else g.fillRect(x0 + cs * 0.1, y0, cs * 0.8, L);
        // two shine heads running outward from the drop point
        g.globalAlpha = 1 - v * 0.7;
        const from = a.from * cs, reach = U.easeOutCubic(Math.min(1, v * 1.6)) * L;
        const glow = root.FxSprites.glow(this.th.accent2 || '#00e5ff');
        for (const dir of [-1, 1]) {
          const p = U.clamp(from + dir * reach, 0, L);
          const gx = horiz ? x0 + p : x0 + cs / 2, gy = horiz ? y0 + cs / 2 : y0 + p;
          g.drawImage(glow, gx - cs * 1.3, gy - cs * 1.3, cs * 2.6, cs * 2.6);
          g.drawImage(root.FxSprites.glow('#ffffff'), gx - cs * 0.6, gy - cs * 0.6, cs * 1.2, cs * 1.2);
        }
        g.restore();
        return true;
      }
      if (a.k === 'ice') {
        const v = u / 0.4;
        if (v < 0) return true;
        if (v >= 1) return false;
        if (!a.done) { a.done = true; S.ice(); this.shards(bx + (a.c + 0.5) * cs, by + (a.r + 0.5) * cs, '#cdf3ff', 4, cs * 0.25); }
        g.globalAlpha = 1 - v;
        const s = 1 + v * 0.5;
        g.drawImage(this.iceSpr(Math.round(cs * this.dpr)), bx + a.c * cs - (s - 1) * cs / 2, by + a.r * cs - (s - 1) * cs / 2, cs * s, cs * s);
        g.globalAlpha = 1;
        return true;
      }
      if (a.k === 'ham') {
        const v = u / 0.35;
        if (v >= 1) return false;
        const hs2 = cs * 1.5;
        g.save(); g.translate(a.x + cs * 0.4, a.y - cs * 0.2); g.rotate(-1.1 + U.easeInCubic(Math.min(1, v * 1.8)) * 1.3);
        g.font = `${Math.round(hs2 * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = v > 0.8 ? (1 - v) * 5 : 1;
        g.fillText('🔨', 0, -hs2 * 0.3);
        g.restore();
        return true;
      }
      if (a.k === 'back') {
        const v = u / 0.22;
        const [scx, scy] = this.slotCenter(a.i);
        if (v >= 1 || this.tray[a.i] !== a.pc) { a.pc.hide = false; return false; }
        const e2 = U.easeOutCubic(v);
        const x = lerp(a.x, scx, e2), y = lerp(a.y, scy, e2), s = lerp(this.cs * a.s, this.tsOf(a.pc, a.i), e2);
        this.drawPiece(g, a.pc, x - a.pc.w * s / 2, y - a.pc.h * s / 2, s, 1);
        return true;
      }
      return false;
    }

    destroy() { super.destroy(); this.cache.clear(); }
  }

  root.QuestGames.block = Block;
})(window);
