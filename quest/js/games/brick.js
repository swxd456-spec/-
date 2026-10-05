/* 보석 벽돌깨기 (Arkanoid style).
   Glossy gem / jelly bricks arranged in seeded pixel-art shapes (heart, fox, crown, palace, words …).
   Swept sub-step circle physics (no tunnelling), multi-hit gems with cracks, steel, chain bombs,
   seven power-up capsules, combo multiplier with rising pitch, lives + fail extension. */
(function (root) {
  const { Base, util } = root.QuestGames; const U = root.U, A = root.SlotAudio;
  const { rr, lerp } = util;
  const SEC = '벽돌깨기';
  const DEFAULTS = {
    입장료: 100, 클리어보상: 300,
    생명연장_가격: 150, 연장_생명: 1,
    멀티볼_가격: 80, 넓은패들_가격: 60,
    남은생명_보상: 20, 콤보_보상: 2,
    난이도_간격: 30,
    생명_시작: 5, 생명_최소: 3,
    공속도_시작: 46, 공속도_최대: 82, 판중_가속: 2, 판중_가속_최대: 20,
    패들폭_시작: 32, 패들폭_최소: 19,
    모양크기_시작: 7, 모양크기_최대: 13,
    단단한벽돌_시작: 0, 단단한벽돌_최대: 45, 최대내구: 3,
    강철_시작판: 8, 강철_확률_최대: 10,
    폭탄_확률: 5,
    아이템_확률_시작: 28, 아이템_확률_최소: 14,
    아이템_지속초: 12,
    안전망_판수: 3, 안전망_횟수: 3,
  };

  /* ---------- palette & shapes ---------- */
  const PAL = { R: '#ff3b5c', O: '#ff8a2b', Y: '#ffd23f', G: '#3ddc6a', M: '#2ff0c8', C: '#2ec8ff', B: '#4a6bff', P: '#a64dff', K: '#ff6fcf', W: '#eef0ff', N: '#c07a45', D: '#4a3878' };
  const SHAPES = [
    { n: '하트', p: ['.RR.RR.', 'RKRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'] },
    { n: '별', p: ['...Y...', '..YYY..', 'YYYYYYY', '.YYOYY.', '..YYY..', '.YY.YY.', 'YY...YY'] },
    { n: '다이아', p: ['..CCC..', '.CWCCC.', 'CCCCCCC', '.BCCCB.', '..BCB..', '...B...'] },
    { n: '버섯', p: ['..RRR..', '.RWRRR.', 'RRRRWRR', 'RWRRRRR', '..WWW..', '..WWW..'] },
    { n: '유령', p: ['..PPP..', '.PPPPP.', 'PWDPWDP', 'PPPPPPP', 'PPKPKPP', 'P.P.P.P'] },
    { n: '슬라임', p: ['...G...', '.GGGGG.', 'GGGGGGG', 'GDGGGDG', 'GKGGGKG', 'GGDDDGG', '.GGGGG.'] },
    { n: '여우', p: ['O.........O', 'OO.......OO', 'OKO.....OKO', 'OOOOOOOOOOO', 'OODOOOOODOO', 'WOOOOOOOOOW', 'WWOOODOOOWW', '.WWWWWWWWW.', '...WWWWW...'] },
    { n: '왕관', p: ['R....C....R', 'Y...YYY...Y', 'YY.YYYYY.YY', 'YYYYYYYYYYY', 'YRYYYCYYYRY', 'YYYYYYYYYYY', 'OOOOOOOOOOO'] },
    { n: '고양이', p: ['P.........P', 'PP.......PP', 'PKP.....PKP', 'PPPPPPPPPPP', 'PPDPPPPPDPP', 'PKPPPPPPPKP', 'PPPPPDPPPPP', 'PPPPDPDPPPP', '.PPPPPPPPP.'] },
    { n: '외계인', p: ['..G.....G..', '...G...G...', '..GGGGGGG..', '.GGDGGGDGG.', 'GGGGGGGGGGG', 'G.GGGGGGG.G', 'G.G.....G.G', '...GG.GG...'] },
    { n: '꽃', p: ['.KK...KK.', 'KKKK.KKKK', 'KKKYYYKKK', '.KYYOYYK.', 'KKKYYYKKK', 'KKKK.KKKK', '.KK.G.KK.', '...GGG...', '....G....'] },
    { n: '컵케이크', p: ['....R....', '...WWW...', '..KKKKK..', '.KKWKKKK.', 'KKKKKKWKK', 'BBBBBBBBB', '.BCBCBCB.', '..BCBCB..'] },
    { n: '궁전', p: ['......Y......', '......R......', '.....RRR.....', '..Y.RRRRR.Y..', '..R.WWWWW.R..', '.RRRWDWDWRRR.', '.WWWWWWWWWWW.', 'RRRRRRRRRRRRR', 'WDWWWDDDWWWDW', 'WWWWWDDDWWWWW'] },
    { n: '성', p: ['B.B.B.B.B.B', 'BBBBBBBBBBB', '.BWBBBBBWB.', '.BBBBBBBBB.', '.BBBYYYBBB.', '.BBYDDDYBB.', '.BBYDDDYBB.'] },
    { n: '로켓', p: ['....R....', '...RRR...', '...WWW...', '..WWCWW..', '..WCCCW..', '..WWCWW..', '..WWWWW..', '.RWWWWWR.', 'RRWWWWWRR', 'R..OYO..R'] },
    { n: '나무', p: ['....Y....', '...GGG...', '..GGRGG..', '..GGGGG..', '.GGYGGGG.', '.GGGGGRG.', 'GGRGGGGGG', 'GGGGGYGGG', '...NNN...'] },
    { n: '판다', p: ['DD.......DD', 'DDWWWWWWWDD', '.WWWWWWWWW.', 'WWDDWWWDDWW', 'WWDWWWWWDWW', 'WKWWWDWWWKW', 'WWWWDWDWWWW', '.WWWWWWWWW.', '..WWWWWWW..'] },
    { n: '토끼', p: ['.WW...WW.', '.WK...KW.', '.WK...KW.', '.WWWWWWW.', 'WWWWWWWWW', 'WWDWWWDWW', 'WKWWDWWKW', 'WWWWWWWWW', '.WWWWWWW.'] },
    { n: '물고기', p: ['...BBBB....', '.BBCCCCB..B', 'BCWDCCCCBBB', 'BCCCCCCCCB.', 'BCCCCCCCBBB', '.BBCCCCB..B', '...BBBB....'] },
    { n: '무지개', p: ['...RRRRRRR...', '.RROOOOOOORR.', 'RROOYYYYYOORR', 'ROOYYGGGYYOOR', 'ROYYGBBBGYYOR', 'ROYGB...BGYOR', 'WWWW.....WWWW'] },
    { n: '보석', p: ['...CCWCC...', '..CWCCCCC..', '.CCCCCCCCC.', 'BBBBBBBBBBB', '.BCBCBCBCB.', '..BCBCBCB..', '...BCBCB...', '....BCB....', '.....B.....'] },
  ];
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['###', '#..', '#..', '#..', '###'], E: ['###', '#..', '###', '#..', '###'],
    G: ['###', '#..', '#.#', '#.#', '###'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['#', '#', '#', '#', '#'],
    J: ['###', '..#', '..#', '#.#', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    O: ['###', '#.#', '#.#', '#.#', '###'], P: ['###', '#.#', '###', '#..', '#..'], S: ['###', '#..', '###', '..#', '###'],
    T: ['###', '.#.', '.#.', '.#.', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], Y: ['#.#', '#.#', '###', '.#.', '.#.'],
    7: ['###', '..#', '.#.', '.#.', '.#.'], '!': ['#', '#', '#', '.', '#'],
  };
  const WORDS = ['JOY', 'GEM', 'WIN', '777', 'ACE', 'YES', 'TOP', 'HI!', 'POP', 'WOW!'];
  const WCOL = 'RYCKGPOB';
  function wordShape(word, rnd) {
    const rows = ['', '', '', '', ''];
    const off = Math.floor(rnd() * 8);
    [...word].forEach((ch, i) => {
      const f = FONT[ch]; if (!f) return;
      const col = WCOL[(i + off) % WCOL.length];
      for (let r = 0; r < 5; r++) rows[r] += (i ? '.' : '') + f[r].replace(/#/g, col);
    });
    const w = rows[0].length;
    let under = '';
    for (let c = 0; c < w; c++) under += WCOL[(c + off) % WCOL.length];
    return { n: `글자 ${word}`, p: rows.concat(['.'.repeat(w), under]) };
  }
  function symShape(w, h, rnd) {
    const cols = Object.keys(PAL).filter((k) => k !== 'D' && k !== 'N');
    const pick = [0, 1, 2].map(() => cols[Math.floor(rnd() * cols.length)]);
    const half = Math.ceil(w / 2);
    const rows = [];
    for (let r = 0; r < h; r++) {
      let left = '';
      for (let c = 0; c < half; c++) {
        const centre = c / (half - 1 || 1);
        const fill = rnd() < 0.42 + centre * 0.45;
        left += fill ? pick[(r + (c % 2)) % 3 === 0 ? 0 : r % 3] : '.';
      }
      const right = left.slice(0, w - half).split('').reverse().join('');
      rows.push(left + right);
    }
    return { n: '보석 무늬', p: rows };
  }
  function norm(sh) {
    const w = Math.max(...sh.p.map((r) => r.length));
    return { n: sh.n, w, h: sh.p.length, p: sh.p.map((r) => r.padEnd(w, '.')) };
  }

  const POWERS = {
    multi: { name: '멀티볼', ico: '×3', emo: 0, col: '#38b6ff', w: 22 },
    wide: { name: '넓은 패들', ico: '⟷', emo: 0, col: '#3ddc6a', w: 18 },
    laser: { name: '레이저', ico: '⚡', emo: 1, col: '#ff3b5c', w: 12 },
    fire: { name: '불꽃공', ico: '🔥', emo: 1, col: '#ff8a2b', w: 9 },
    magnet: { name: '자석', ico: '🧲', emo: 1, col: '#a64dff', w: 12 },
    slow: { name: '느린 공', ico: '🐢', emo: 1, col: '#2ff0c8', w: 14 },
    life: { name: '생명 +1', ico: '♥', emo: 0, col: '#ff6fcf', w: 5 },
  };
  const PKEYS = Object.keys(POWERS);
  const TIMED = ['wide', 'laser', 'fire', 'magnet', 'slow'];

  /* ---------- sounds (A.kit) ---------- */
  const S = {
    last: {},
    ok(id, ms) {
      const k = A && A.kit; if (!k || !k.ok()) return null;
      const t = performance.now(); if (this.last[id] && t - this.last[id] < ms) return null;
      this.last[id] = t; return k;
    },
    hit(combo) { const k = this.ok('hit', 40); if (!k) return; const t = k.now(); const i = Math.min(combo, 14);
      k.play('marimba', k.note(i + 2, 1), t, 0.12, 0.34, k.rv(0.2)); k.tone('sine', 2200 + i * 80, 1700, t, 0.035, 0.05); },
    brk(combo) { const k = this.ok('brk', 30); if (!k) return; const t = k.now(); const i = Math.min(combo, 16);
      k.play('celesta', k.note(i + 4, 1), t, 0.18, 0.32, k.rv(0.35));
      k.noise(t, 0.09, 0.14, 'highpass', 5200, 0.8);
      k.tone('sine', 220, 90, t, 0.08, 0.16);
      if (i >= 8) k.play('bell', k.note(i + 6, 1), t + 0.04, 0.3, 0.14, k.rv(0.5)); },
    crack() { const k = this.ok('crk', 40); if (!k) return; const t = k.now();
      k.noise(t, 0.07, 0.22, 'bandpass', 2600, 3); k.tone('triangle', 900, 500, t, 0.07, 0.12); },
    steel() { const k = this.ok('stl', 50); if (!k) return; const t = k.now();
      k.tone('square', 1900, 1750, t, 0.04, 0.04); k.tone('triangle', 640, 620, t, 0.3, 0.12); k.noise(t, 0.05, 0.12, 'bandpass', 5000, 4); },
    paddle() { const k = this.ok('pad', 40); if (!k) return; const t = k.now();
      k.tone('sine', 240, 460, t, 0.1, 0.28); k.play('pluck', k.note(0, 1), t, 0.1, 0.18); },
    wall() { const k = this.ok('wall', 60); if (!k) return; const t = k.now(); k.tone('sine', 1100, 800, t, 0.03, 0.05); },
    bomb() { const k = this.ok('bomb', 70); if (!k) return; const t = k.now();
      k.noise(t, 0.55, 0.5, 'lowpass', 1400, 1, { sweep: 120 }); k.tone('sine', 150, 38, t, 0.5, 0.55); k.tone('square', 90, 50, t, 0.15, 0.06); },
    power() { const k = this.ok('pw', 80); if (!k) return; const t = k.now();
      [0, 2, 4, 7].forEach((d, i) => k.play('celesta', k.note(d + 5, 1), t + i * 0.055, 0.2, 0.3, k.rv(0.4)));
      k.noise(t, 0.35, 0.1, 'bandpass', 900, 1, { sweep: 8000, attack: 0.1 }); },
    laser() { const k = this.ok('lz', 90); if (!k) return; const t = k.now(); k.tone('square', 1900, 500, t, 0.08, 0.035); },
    launch() { const k = this.ok('ln', 100); if (!k) return; const t = k.now();
      k.tone('sine', 300, 1000, t, 0.16, 0.14); k.noise(t, 0.18, 0.08, 'bandpass', 600, 1, { sweep: 5000 }); },
    lose() { const k = this.ok('die', 300); if (!k) return; const t = k.now();
      k.tone('sawtooth', 520, 110, t, 0.55, 0.08); [4, 2, 0].forEach((d, i) => k.play('bell', k.note(d, 1), t + i * 0.12, 0.3, 0.2, k.rv(0.4))); },
    net() { const k = this.ok('net', 60); if (!k) return; const t = k.now(); k.tone('sine', 500, 1200, t, 0.12, 0.2); k.play('celesta', k.note(7, 1), t, 0.2, 0.2); },
  };

  const BR = 0.24;      // ball radius (cells)
  const PH = 0.48;      // paddle height
  const FONTK = '"Black Han Sans","Noto Sans KR",sans-serif';
  const EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  class Brick extends Base {
    static info = { id: 'brick', name: '보석 벽돌깨기', icon: '💎', section: SEC, color: '#38b6ff', desc: '반짝이는 보석 벽돌을 공으로 모두 깨뜨려요!' };
    static howto = ['화면을 좌우로 드래그해 패들을 움직이고, 탭하면 공이 발사돼요.', '패들 가장자리에 맞히면 공이 더 비스듬히 튀어요.', '떨어지는 캡슐을 받으면 멀티볼·레이저·불꽃공 같은 능력이 생겨요!', '패들에 닿지 않고 연속으로 깨면 콤보 점수가 올라가요.'];

    static params(stage, C) {
      const c = util.cfg(C, SEC, DEFAULTS);
      const n = Math.max(1, c.난이도_간격);
      const e = util.ease(stage, n);
      const steelOn = stage >= c.강철_시작판;
      return {
        fee: c.입장료, reward: c.클리어보상, extendCost: c.생명연장_가격, extendSec: 0,
        extendLives: Math.max(1, Math.round(c.연장_생명)), extendText: `+${Math.max(1, Math.round(c.연장_생명))} 생명`,
        time: 0, star: [0, 0, 0],
        lives: Math.max(1, Math.round(lerp(c.생명_시작, c.생명_최소, e))),
        speed: lerp(c.공속도_시작, c.공속도_최대, e) / 100,
        ramp: c.판중_가속 / 100, rampMax: c.판중_가속_최대 / 100,
        paddle: lerp(c.패들폭_시작, c.패들폭_최소, e) / 100,
        size: Math.round(lerp(c.모양크기_시작, c.모양크기_최대, e)),
        hard: lerp(c.단단한벽돌_시작, c.단단한벽돌_최대, e) / 100,
        maxHp: Math.max(1, Math.round(c.최대내구)), hp3: e * 0.6,
        steel: steelOn ? (c.강철_확률_최대 / 100) * (0.35 + 0.65 * util.ease(stage - c.강철_시작판 + 2, n)) : 0,
        bomb: c.폭탄_확률 / 100,
        item: lerp(c.아이템_확률_시작, c.아이템_확률_최소, e) / 100,
        itemSec: c.아이템_지속초,
        net: stage <= c.안전망_판수 ? Math.round(c.안전망_횟수) : 0,
        multiCost: c.멀티볼_가격, wideCost: c.넓은패들_가격,
        lifeBonus: c.남은생명_보상, comboBonus: c.콤보_보상,
      };
    }

    constructor(host, o) {
      super(host, o);
      this.stage = o.stage || 1;
      this.build();
      this.hud({
        title: '보석 벽돌깨기', sub: `${this.stage}판 · ${this.shapeName}`, timer: false,
        tools: [{ id: 'multi', ico: '🔮', label: '멀티볼', cost: this.p.multiCost }, { id: 'wide', ico: '↔️', label: '넓은 패들', cost: this.p.wideCost }],
      });
      this.ui.wrap.style.touchAction = 'none';
      this.bindInput();
      this.cache = new Map();
      this.layout();
      this.newBall();
      this.refresh();
    }

    /* ---------- level ---------- */
    build() {
      const p = this.p, rnd = this.rnd;
      const size = Math.max(5, p.size);
      let pool = SHAPES.map(norm);
      WORDS.forEach((w) => pool.push(norm(wordShape(w, rnd))));
      for (let i = 0; i < 4; i++) { const w = 7 + 2 * Math.floor(rnd() * 4); pool.push(norm(symShape(w, 5 + Math.floor(rnd() * 4), rnd))); }
      let cand = pool.filter((s) => s.w <= size && s.w >= size - 3);
      if (!cand.length) cand = pool.filter((s) => s.w <= size);
      if (!cand.length) cand = [pool[0]];
      const sh = this.stage === 1 ? pool[0] : cand[Math.floor(rnd() * cand.length)];
      this.shapeName = sh.n;
      // world: square cells; the board is tall (portrait)
      const ratio = innerHeight >= innerWidth ? 1.5 : 1.28;   // tall board on phones, a bit wider in landscape
      const WW = Math.max(11, sh.w + 2, Math.ceil((sh.h + 2.5) / 0.55 / ratio));
      this.WW = WW; this.WH = WW * ratio;
      this.PY = this.WH - 1.9;
      this.gx = Math.floor((WW - sh.w) / 2); this.gy = 1.6;
      this.gc = sh.w; this.gr = sh.h;
      this.grid = [];
      this.bricks = [];
      const steelAt = (r, c) => { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const row = this.grid[r + dr]; if (row && row[c + dc] && row[c + dc].kind === 's') return true; } return false; };
      const wsum = PKEYS.reduce((a, k) => a + POWERS[k].w, 0);
      let cells = 0;
      for (let r = 0; r < sh.h; r++) {
        this.grid.push(new Array(sh.w).fill(null));
        for (let c = 0; c < sh.w; c++) {
          const ch = sh.p[r][c];
          if (ch === '.' || !PAL[ch]) continue;
          cells++;
          const b = { r, c, col: PAL[ch], ch, kind: 'n', hp: 1, max: 1, drop: null, hit: 0, born: 0.15 + r * 0.06 + c * 0.018 + rnd() * 0.08, ph: rnd() * 6.28 };
          const a = rnd(), bb = rnd(), hh = rnd(), h3 = rnd(), it = rnd(), wpick = rnd() * wsum;
          if (p.steel > 0 && a < p.steel && !steelAt(r, c)) { b.kind = 's'; b.hp = b.max = Infinity; }
          else if (bb < p.bomb && ch !== 'D') { b.kind = 'b'; }
          else if (hh < p.hard && p.maxHp >= 2) { b.kind = 'g'; b.hp = b.max = p.maxHp >= 3 && h3 < p.hp3 ? 3 : 2; }
          if (b.kind !== 's' && it < p.item) {
            let acc = 0;
            for (const k of PKEYS) { acc += POWERS[k].w; if (wpick < acc) { b.drop = k; break; } }
          }
          this.grid[r][c] = b; this.bricks.push(b);
        }
      }
      // never more than ~15% steel
      const steel = this.bricks.filter((b) => b.kind === 's');
      for (let i = Math.floor(cells * 0.15); i < steel.length; i++) { steel[i].kind = 'n'; steel[i].hp = steel[i].max = 1; }
      this.total = this.bricks.filter((b) => b.kind !== 's').length;
      this.left = this.total;
      // run state
      this.lives = p.lives; this.livesLost = 0;
      this.basePW = Math.max(1.6, this.WW * p.paddle);
      this.pwid = this.basePW; this.px = this.WW / 2; this.tx = this.px; this.pvx = 0;
      this.balls = []; this.caps = []; this.bolts = []; this.bq = [];
      this.pw = { wide: 0, laser: 0, fire: 0, magnet: 0, slow: 0 };
      this.slowF = 1; this.clock = 0; this.hs = 0; this.ending = 0; this.respawn = 0;
      this.combo = 0; this.maxCombo = 0; this.comboT = 0; this.noHit = 0;
      this.net = p.net; this.netFlash = 0; this.laserCd = 0; this.psq = 0; this.blink = 2;
      this.launched = 0; this.shakeT = 0;
    }

    layout() {
      if (!this.fit()) return;
      const W = this.W, H = this.H;
      const s = Math.min((W - 12) / this.WW, (H - 10) / this.WH);
      this.s = s;
      this.ox = Math.round((W - this.WW * s) / 2);
      this.oy = Math.round((H - this.WH * s) / 2);
      this.cache.clear();
      this.bg = null;
    }

    /* ---------- input ---------- */
    bindInput() {
      const wrap = this.ui.wrap;
      const wx = (x) => (x - this.ox) / this.s;
      wrap.addEventListener('pointerdown', (e) => {
        A && A.init && A.init();
        const [x, y] = this.local(e);
        const touch = e.pointerType !== 'mouse';
        this.drag = { id: e.pointerId, x0: x, y0: y, p0: this.tx, t0: performance.now(), moved: 0, touch };
        if (!touch) this.tx = wx(x);
        try { wrap.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      });
      wrap.addEventListener('pointermove', (e) => {
        const [x, y] = this.local(e);
        const d = this.drag;
        if (!d || d.id !== e.pointerId) { if (e.pointerType === 'mouse') this.tx = wx(x); return; }
        d.moved = Math.max(d.moved, Math.hypot(x - d.x0, y - d.y0));
        this.tx = d.touch ? d.p0 + ((x - d.x0) / this.s) * 1.3 : wx(x);
        this.tx = U.clamp(this.tx, 0, this.WW);
      });
      const up = (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        this.drag = null;
        if (d.moved < 14 && performance.now() - d.t0 < 400) this.launch();
      };
      wrap.addEventListener('pointerup', up);
      wrap.addEventListener('pointercancel', (e) => { if (this.drag && this.drag.id === e.pointerId) this.drag = null; });
      this.onKey = (e) => {
        if (!this.running || this.paused) return;
        if (e.key === 'ArrowLeft') this.tx = Math.max(0, this.px - 1.2);
        else if (e.key === 'ArrowRight') this.tx = Math.min(this.WW, this.px + 1.2);
        else if (e.key === ' ' || e.key === 'ArrowUp') { this.launch(); e.preventDefault(); }
      };
      addEventListener('keydown', this.onKey);
    }
    destroy() { removeEventListener('keydown', this.onKey); super.destroy(); }

    /* ---------- balls ---------- */
    newBall() {
      const side = this.px < this.WW / 2 ? 1 : -1;
      this.balls.push(this.mkBall(this.px, this.PY - BR, 0, -1, true, this.pwid * 0.14 * side));
    }
    mkBall(x, y, dx, dy, held, off) {
      return { x, y, dx, dy, held: !!held, off: off || 0, holdT: 0, mag: false, dead: false, tr: new Float32Array(20), ti: 0, tn: 0 };
    }
    launch() {
      if (!this.running || this.paused || this.ending) return;
      let any = false;
      for (const b of this.balls) {
        if (!b.held) continue;
        const u = U.clamp(b.off / (this.pwid / 2), -1, 1);
        const a = U.clamp(u * 1.05, -1.0, 1.0) || 0.2;
        b.dx = Math.sin(a); b.dy = -Math.cos(a); b.held = false; b.mag = false; b.y = this.PY - BR - 0.01;
        any = true;
      }
      if (any) { this.launched++; S.launch(); this.psq = 0.7; }
    }
    speed() { return this.p.speed * this.WH * (1 + Math.min(this.p.rampMax, (this.p.ramp * this.clock) / 10)) * this.slowF; }
    fixAngle(b) {
      const m = 0.24;
      if (Math.abs(b.dy) < m) { const sy = b.dy < 0 ? -1 : 1, sx = b.dx < 0 ? -1 : 1; b.dy = sy * m; b.dx = sx * Math.sqrt(1 - m * m); }
      const l = Math.hypot(b.dx, b.dy) || 1; b.dx /= l; b.dy /= l;
    }

    step(b, dt, sp) {
      const n = Math.max(1, Math.ceil((sp * dt) / (BR * 0.45)));
      const h = (dt * sp) / n;
      const WW = this.WW;
      for (let i = 0; i < n; i++) {
        b.x += b.dx * h; b.y += b.dy * h;
        if (b.x < BR) { b.x = BR; if (b.dx < 0) { b.dx = -b.dx; this.fixAngle(b); S.wall(); } }
        else if (b.x > WW - BR) { b.x = WW - BR; if (b.dx > 0) { b.dx = -b.dx; this.fixAngle(b); S.wall(); } }
        if (b.y < BR) { b.y = BR; if (b.dy < 0) { b.dy = -b.dy; S.wall(); } }
        this.collideBricks(b);
        if (b.dy > 0 && this.collidePaddle(b)) return;
        if (this.net > 0 && b.dy > 0 && b.y + BR >= this.WH - 0.35) {
          b.y = this.WH - 0.35 - BR; b.dy = -Math.abs(b.dy); this.fixAngle(b);
          this.net--; this.netFlash = 1; S.net();
          this.ring(this.ox + b.x * this.s, this.oy + (this.WH - 0.35) * this.s, '#7fffd4', 50, 4);
          if (this.net === 0) this.banner('안전망이 사라졌어요!', 'info');
        }
        if (b.y > this.WH + 1) { b.dead = true; return; }
      }
    }
    collideBricks(b) {
      const fire = this.pw.fire > 0;
      const gx = this.gx, gy = this.gy, R2 = BR * BR;
      const c0 = Math.floor(b.x - BR - gx), c1 = Math.floor(b.x + BR - gx);
      const r0 = Math.floor(b.y - BR - gy), r1 = Math.floor(b.y + BR - gy);
      let best = null, bp = -1, bcx = 0, bcy = 0;
      for (let r = Math.max(0, r0); r <= Math.min(this.gr - 1, r1); r++) {
        const row = this.grid[r];
        for (let c = Math.max(0, c0); c <= Math.min(this.gc - 1, c1); c++) {
          const k = row[c]; if (!k) continue;
          const L = gx + c, T = gy + r;
          const cx = b.x < L ? L : b.x > L + 1 ? L + 1 : b.x, cy = b.y < T ? T : b.y > T + 1 ? T + 1 : b.y;
          const ddx = b.x - cx, ddy = b.y - cy, d2 = ddx * ddx + ddy * ddy;
          if (d2 >= R2) continue;
          if (fire && k.kind !== 's') { this.kill(k, b.x, b.y); continue; }
          const pen = BR - Math.sqrt(d2);
          if (pen > bp) { bp = pen; best = k; bcx = cx; bcy = cy; }
        }
      }
      if (!best) return;
      let nx = b.x - bcx, ny = b.y - bcy;
      const d = Math.hypot(nx, ny);
      if (d < 1e-6) {
        // centre inside the brick: push out along the shallowest side
        const L = gx + best.c, T = gy + best.r;
        const opts = [[b.x - L, -1, 0], [L + 1 - b.x, 1, 0], [b.y - T, 0, -1], [T + 1 - b.y, 0, 1]];
        opts.sort((p, q) => p[0] - q[0]);
        nx = opts[0][1]; ny = opts[0][2];
        b.x = nx ? (nx < 0 ? L - BR : L + 1 + BR) : b.x; b.y = ny ? (ny < 0 ? T - BR : T + 1 + BR) : b.y;
      } else {
        nx /= d; ny /= d;
        b.x = bcx + nx * BR; b.y = bcy + ny * BR;
      }
      const dot = b.dx * nx + b.dy * ny;
      if (dot < 0) { b.dx -= 2 * dot * nx; b.dy -= 2 * dot * ny; }
      this.fixAngle(b);
      this.damage(best, b.x, b.y);
    }
    collidePaddle(b) {
      const top = this.PY, half = this.pwid / 2, L = this.px - half, Rr = this.px + half;
      if (b.y + BR < top || b.y > top + PH * 0.6 || b.x < L - BR || b.x > Rr + BR) return false;
      const cx = U.clamp(b.x, L, Rr), cy = U.clamp(b.y, top, top + PH);
      if ((b.x - cx) ** 2 + (b.y - cy) ** 2 >= BR * BR) return false;
      const u = U.clamp((b.x - this.px) / half, -1, 1);
      let a = u * 1.1;
      // anti-frustration: after a long time without hitting anything, aim at a remaining brick
      if (this.noHit > 9) {
        const live = this.bricks.filter((k) => k.hp > 0 && k.kind !== 's' && this.grid[k.r][k.c] === k);
        if (live.length) {
          const k = live[Math.floor(Math.random() * live.length)];
          const aa = Math.atan2(this.gx + k.c + 0.5 - b.x, b.y - (this.gy + k.r + 0.5));
          if (Math.abs(aa) < 1.15) a = aa;
          this.noHit = 4;
        }
      }
      b.dx = Math.sin(a); b.dy = -Math.cos(a);
      b.y = top - BR;
      this.psq = 1;
      S.paddle();
      if (this.combo >= 5) this.pop(this.ox + b.x * this.s, this.oy + top * this.s - 20, `콤보 ${this.combo}`, '#9ff', 18);
      this.combo = 0; this.refresh();
      if (this.pw.magnet > 0) { b.held = true; b.mag = true; b.holdT = 0; b.off = b.x - this.px; }
      return true;
    }

    /* ---------- bricks ---------- */
    damage(k, x, y) {
      this.noHit = 0;
      const s = this.s, X = this.ox + (this.gx + k.c + 0.5) * s, Y = this.oy + (this.gy + k.r + 0.5) * s;
      k.hit = 1;
      if (k.kind === 's') { S.steel(); this.burst(X, Y, '#dfe8ff', 5, 0.4); return; }
      k.hp--;
      if (k.hp <= 0) { this.kill(k, x, y); return; }
      S.crack();
      this.shards(X, Y, k.col, 4, s * 0.12);
    }
    kill(k, x, y, chain) {
      if (this.grid[k.r][k.c] !== k) return;
      this.grid[k.r][k.c] = null;
      k.hp = 0;
      this.left--;
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboT = 1;
      const mult = this.mult();
      const pts = Math.round((k.kind === 'b' ? 15 : 10 * k.max) * mult);
      this.score += pts;
      const s = this.s, X = this.ox + (this.gx + k.c + 0.5) * s, Y = this.oy + (this.gy + k.r + 0.5) * s;
      const busy = this.o.fx.ps && this.o.fx.ps.length > 700;
      this.shards(X, Y, k.col, busy ? 3 : 7, s * 0.2);
      if (!busy) this.burst(X, Y, k.col, 8, 0.6);
      if (!chain || Math.random() < 0.3) this.pop(X, Y - s * 0.3, '+' + pts, mult > 1 ? '#ffe27a' : '#ffffff', mult > 1 ? 20 : 16);
      if (this.anims.length < 60) this.anims.push({ k, t0: this.clock });
      S.brk(this.combo);
      if (this.combo % 10 === 0) {
        this.banner(`${this.combo} 콤보! ×${mult}`, 'good', 1000);
        A.qMatch && A.qMatch(Math.min(12, this.combo / 5));
        this.o.onEvent('combo', { n: this.combo });
      }
      if (k.drop) this.caps.push({ type: k.drop, x: this.gx + k.c + 0.5, y: this.gy + k.r + 0.5, vy: 0, rot: 0 });
      if (k.kind === 'b') this.bq.push({ r: k.r, c: k.c, t: 0.12 });
      this.refresh();
      if (this.left <= 0 && !this.ending) this.startEnding(X, Y);
    }
    mult() { return Math.min(5, 1 + Math.floor(this.combo / 5) * 0.5); }
    blast(q) {
      const s = this.s, X = this.ox + (this.gx + q.c + 0.5) * s, Y = this.oy + (this.gy + q.r + 0.5) * s;
      S.bomb();
      this.explode_fx(X, Y);
      this.shake(300);
      this.hs = Math.max(this.hs, 0.05);
      this.o.onEvent('special', { kind: 'bomb' });
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const row = this.grid[q.r + dr]; if (!row) continue;
        const k = row[q.c + dc]; if (!k || k.kind === 's') continue;
        this.kill(k, 0, 0, true);
      }
    }
    explode_fx(X, Y) { this.explode(X, Y, 1.4, ['#ffb000', '#ff3b5c', '#ffffff']); }

    /* ---------- power-ups ---------- */
    takePower(type, X, Y) {
      const P = POWERS[type];
      S.power();
      this.banner(P.name + '!', 'good', 900);
      this.burst(X, Y, P.col, 14, 0.8);
      this.ring(X, Y, P.col, 60, 4);
      this.o.onEvent('power', { type });
      const dur = this.p.itemSec;
      if (type === 'multi') this.multi();
      else if (type === 'life') { this.lives = Math.min(9, this.lives + 1); this.pop(X, Y - 30, '♥ +1', '#ff8fd0', 26); }
      else if (type === 'slow') this.pw.slow = Math.max(this.pw.slow, dur);
      else this.pw[type] = Math.max(this.pw[type], type === 'fire' ? dur * 0.7 : dur);
      this.refresh();
    }
    multi() {
      if (this.balls.some((b) => b.held)) this.launch();
      const src = this.balls.filter((b) => !b.dead && !b.held);
      if (!src.length) return;
      const add = [];
      for (const b of src) {
        if (this.balls.length + add.length >= 14) break;
        for (const da of [-0.42, 0.42]) {
          const c = Math.cos(da), s = Math.sin(da);
          const nb = this.mkBall(b.x, b.y, b.dx * c - b.dy * s, b.dx * s + b.dy * c);
          if (nb.dy > -0.2 && nb.dy < 0.2) nb.dy = -0.4;
          this.fixAngle(nb);
          add.push(nb);
        }
      }
      this.balls.push(...add);
    }
    tool(id) {
      if (this.ending) return;
      if (id === 'multi') {
        if (!this.pay(this.p.multiCost, '멀티볼에')) return;
        S.power(); this.banner('멀티볼!', 'good', 900); this.multi();
        this.o.onEvent('tool', { id });
      } else if (id === 'wide') {
        if (!this.pay(this.p.wideCost, '넓은 패들에')) return;
        S.power(); this.banner('넓은 패들!', 'good', 900);
        this.pw.wide = Math.max(this.pw.wide, this.p.itemSec * 1.6);
        this.o.onEvent('tool', { id });
      }
    }

    /* ---------- flow ---------- */
    loseBall() {
      this.lives--; this.livesLost++;
      this.combo = 0;
      for (const k of TIMED) this.pw[k] = 0;
      this.caps.length = 0; this.bolts.length = 0;
      S.lose(); this.shake(400);
      const [X, Y] = [this.ox + this.px * this.s, this.oy + this.PY * this.s];
      this.burst(X, Y, '#ff3b5c', 16, 1);
      this.refresh();
      if (this.lives <= 0) { A.qFail && A.qFail(); this.lose('lives'); return; }
      this.banner(`생명 -1 · 남은 생명 ${this.lives}`, 'bad', 1100);
      this.respawn = 0.7;
    }
    resume() {
      this.lives += this.p.extendLives;
      this.balls.length = 0;
      this.respawn = 0;
      this.newBall();
      this.running = true; this.paused = false;
      this.banner(`+${this.p.extendLives} 생명! 다시 도전!`, 'good');
      this.refresh();
    }
    startEnding(X, Y) {
      this.ending = 1.1;
      this.hs = 0.12;
      this.banner('클리어!', 'good', 1400);
      A.qClear && A.qClear();
      this.explode(X, Y, 3, [this.th.accent, '#ffe27a', '#ffffff']);
      this.o.fx.fireworks && this.o.fx.fireworks(5);
      this.o.fx.confetti && this.o.fx.confetti(60);
    }
    finish() {
      const rows = [];
      if (this.lives > 0 && this.p.lifeBonus) rows.push([`남은 생명 ${this.lives}개`, Math.min(150, this.lives * this.p.lifeBonus)]);
      if (this.maxCombo >= 5 && this.p.comboBonus) rows.push([`최대 콤보 ${this.maxCombo}`, Math.min(120, Math.round(this.maxCombo * this.p.comboBonus))]);
      this.win({ rows });
    }
    cheat() {
      for (const k of this.bricks) if (k.kind !== 's' && this.grid[k.r][k.c] === k) { this.grid[k.r][k.c] = null; this.left--; }
      this.left = 0;
      this.finish();
    }
    stars() { return this.livesLost === 0 ? 3 : this.livesLost <= 2 ? 2 : 1; }

    refresh() {
      const hearts = this.lives <= 6 ? '<span style="color:#ff5c93;text-shadow:0 0 8px #ff2b6a">' + '♥'.repeat(Math.max(0, this.lives)) + '</span>' : `<span style="color:#ff5c93">♥</span>×${this.lives}`;
      this.info(`${hearts}<span>${this.score.toLocaleString('ko-KR')}점</span>`);
      this.meter(1 - this.left / Math.max(1, this.total), `남은 보석 ${Math.max(0, this.left)}`);
    }

    /* ---------- update ---------- */
    update(dt) {
      if (this.hs > 0) { this.hs -= dt; return; }
      if (this.ending > 0) {
        this.ending -= dt;
        dt *= 0.35;
        if (this.ending <= 0) { this.finish(); return; }
      }
      this.clock += dt;
      this.noHit += dt;
      for (const k of TIMED) if (this.pw[k] > 0) { this.pw[k] -= dt; if (this.pw[k] <= 0) this.pw[k] = 0; }
      this.slowF += ((this.pw.slow > 0 ? 0.66 : 1) - this.slowF) * Math.min(1, dt * 3);
      const tw = this.basePW * (this.pw.wide > 0 ? 1.55 : 1);
      this.pwid += (tw - this.pwid) * Math.min(1, dt * 9);
      const half = this.pwid / 2;
      const nx = U.clamp(this.tx, half, this.WW - half);
      this.pvx = (nx - this.px) / Math.max(dt, 1e-3);
      this.px = nx;
      this.psq = Math.max(0, this.psq - dt * 5);
      this.netFlash = Math.max(0, this.netFlash - dt * 2);
      this.comboT = Math.max(0, this.comboT - dt * 3);
      this.blink -= dt; if (this.blink < -0.12) this.blink = 2 + Math.random() * 3;
      for (const k of this.bricks) if (k.hit > 0) k.hit = Math.max(0, k.hit - dt * 6);

      const sp = this.speed();
      for (const b of this.balls) {
        if (b.held) {
          b.x = U.clamp(this.px + b.off, BR, this.WW - BR); b.y = this.PY - BR;
          b.holdT += dt;
          if (b.mag && b.holdT > 2.5) this.launch();
          continue;
        }
        this.step(b, dt, sp);
        b.tr[b.ti * 2] = b.x; b.tr[b.ti * 2 + 1] = b.y; b.ti = (b.ti + 1) % 10; b.tn = Math.min(10, b.tn + 1);
      }
      if (this.balls.some((b) => b.dead)) this.balls = this.balls.filter((b) => !b.dead);
      if (!this.balls.length && !this.ending && this.running) {
        if (this.respawn > 0) { this.respawn -= dt; if (this.respawn <= 0) this.newBall(); }
        else this.loseBall();
        if (!this.running) return;
      }

      // capsules
      const capV = this.WH * 0.24;
      for (let i = this.caps.length - 1; i >= 0; i--) {
        const c = this.caps[i];
        c.vy = Math.min(capV, c.vy + capV * dt * 3); c.y += c.vy * dt; c.rot += dt;
        if (c.y + 0.3 >= this.PY && c.y - 0.3 <= this.PY + PH && Math.abs(c.x - this.px) <= this.pwid / 2 + 0.55) {
          this.caps.splice(i, 1);
          this.takePower(c.type, this.ox + c.x * this.s, this.oy + this.PY * this.s);
        } else if (c.y > this.WH + 1) this.caps.splice(i, 1);
      }
      // lasers
      if (this.pw.laser > 0 && !this.ending) {
        this.laserCd -= dt;
        if (this.laserCd <= 0 && this.bolts.length < 24) {
          this.laserCd = 0.32;
          const o = this.pwid / 2 - 0.25;
          this.bolts.push({ x: this.px - o, y: this.PY }, { x: this.px + o, y: this.PY });
          S.laser();
        }
      }
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const z = this.bolts[i];
        z.y -= this.WH * 1.6 * dt;
        const c = Math.floor(z.x - this.gx), r = Math.floor(z.y - this.gy);
        const k = r >= 0 && r < this.gr && c >= 0 && c < this.gc ? this.grid[r][c] : null;
        if (k) { this.damage(k, z.x, z.y); this.bolts.splice(i, 1); }
        else if (z.y < 0) this.bolts.splice(i, 1);
      }
      // bombs
      for (let i = this.bq.length - 1; i >= 0; i--) {
        const q = this.bq[i]; q.t -= dt;
        if (q.t <= 0) { this.bq.splice(i, 1); this.blast(q); }
      }
      if (this.anims.length) { let j = 0; for (const a of this.anims) if (this.clock - a.t0 < 0.3) this.anims[j++] = a; this.anims.length = j; }
    }

    /* ---------- sprites ---------- */
    sprite(key, w, h, paint) {
      let cv = this.cache.get(key);
      if (cv) return cv;
      cv = document.createElement('canvas');
      const d = this.dpr || 1;
      cv.width = Math.max(1, Math.ceil(w * d)); cv.height = Math.max(1, Math.ceil(h * d));
      const g = cv.getContext('2d'); g.scale(d, d);
      paint(g, w, h);
      this.cache.set(key, cv);
      return cv;
    }
    brickSpr(k) {
      const S0 = this.s, kind = k.kind;
      const crack = kind === 'g' ? k.max - k.hp : 0;
      return this.sprite(`b${k.col}${kind}${k.max}${crack}`, S0, S0 * 1.08, (g) => {
        const m = S0 * 0.05, w = S0 - 2 * m, r = w * 0.26, x = m, y = m;
        g.fillStyle = 'rgba(0,0,0,0.38)'; rr(g, x, y + w * 0.08, w, w, r); g.fill();
        if (kind === 's') {
          const gr = g.createLinearGradient(x, y, x + w, y + w);
          gr.addColorStop(0, '#f4f8ff'); gr.addColorStop(0.35, '#a9b4c8'); gr.addColorStop(0.55, '#e3e9f4'); gr.addColorStop(1, '#5a647a');
          rr(g, x, y, w, w, r * 0.6); g.fillStyle = gr; g.fill();
          g.lineWidth = Math.max(1, S0 * 0.05); g.strokeStyle = '#3a4256'; g.stroke();
          rr(g, x + w * 0.14, y + w * 0.14, w * 0.72, w * 0.72, r * 0.4); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(1, S0 * 0.03); g.stroke();
          g.fillStyle = '#4b5468';
          for (const [a, b] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) { g.beginPath(); g.arc(x + w * a, y + w * b, w * 0.06, 0, 6.3); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.7)';
          for (const [a, b] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) { g.beginPath(); g.arc(x + w * a - w * 0.02, y + w * b - w * 0.02, w * 0.025, 0, 6.3); g.fill(); }
          return;
        }
        const col = k.col;
        const gr = g.createLinearGradient(0, y, 0, y + w);
        gr.addColorStop(0, U.shade(col, 0.5)); gr.addColorStop(0.45, col); gr.addColorStop(1, U.shade(col, -0.45));
        rr(g, x, y, w, w, r); g.fillStyle = gr; g.fill();
        g.save(); rr(g, x, y, w, w, r); g.clip();
        if (kind === 'g') {
          // cut gem: table + four facets
          const t = w * 0.27, X0 = x + t, Y0 = y + t, X1 = x + w - t, Y1 = y + w - t;
          const face = (pts, fill) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fillStyle = fill; g.fill(); };
          face([x, y, x + w, y, X1, Y0, X0, Y0], 'rgba(255,255,255,0.38)');
          face([x, y, X0, Y0, X0, Y1, x, y + w], 'rgba(255,255,255,0.14)');
          face([x + w, y, x + w, y + w, X1, Y1, X1, Y0], 'rgba(0,0,0,0.16)');
          face([x, y + w, X0, Y1, X1, Y1, x + w, y + w], 'rgba(0,0,0,0.3)');
          const tg = g.createLinearGradient(X0, Y0, X1, Y1);
          tg.addColorStop(0, U.shade(col, 0.6)); tg.addColorStop(1, U.shade(col, 0.05));
          g.fillStyle = tg; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
          g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.6, S0 * 0.025); g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
          g.strokeStyle = 'rgba(255,255,255,0.3)';
          g.beginPath(); g.moveTo(x, y); g.lineTo(X0, Y0); g.moveTo(x + w, y); g.lineTo(X1, Y0); g.moveTo(x, y + w); g.lineTo(X0, Y1); g.moveTo(x + w, y + w); g.lineTo(X1, Y1); g.stroke();
          g.fillStyle = '#ffffff'; this.star(g, X1 - (X1 - X0) * 0.2, Y0 + (Y1 - Y0) * 0.25, w * 0.14);
        } else {
          // jelly: soft inner glow + bottom rim light
          const rg = g.createRadialGradient(x + w * 0.5, y + w * 0.75, w * 0.05, x + w * 0.5, y + w * 0.75, w * 0.55);
          rg.addColorStop(0, 'rgba(255,255,255,0.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.fillRect(x, y, w, w);
        }
        // gloss
        const gl = g.createLinearGradient(0, y, 0, y + w * 0.45);
        gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0.05)');
        g.beginPath(); g.ellipse(x + w * 0.42, y + w * 0.2, w * 0.36, w * 0.15, -0.15, 0, 6.3); g.fillStyle = gl; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath(); g.arc(x + w * 0.2, y + w * 0.2, w * 0.055, 0, 6.3); g.fill();
        g.restore();
        rr(g, x, y, w, w, r); g.lineWidth = Math.max(1, S0 * 0.045); g.strokeStyle = U.shade(col, -0.55); g.stroke();
        rr(g, x + w * 0.06, y + w * 0.06, w * 0.88, w * 0.88, r * 0.8); g.lineWidth = Math.max(0.6, S0 * 0.02); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
        if (kind === 'g' && k.max >= 3) { rr(g, x + 1, y + 1, w - 2, w - 2, r); g.strokeStyle = '#ffd54a'; g.lineWidth = Math.max(1.2, S0 * 0.06); g.stroke(); }
        if (kind === 'b') {
          const cx = x + w * 0.5, cy = y + w * 0.56, br = w * 0.25;
          g.strokeStyle = '#3a2410'; g.lineWidth = Math.max(1.2, S0 * 0.06); g.lineCap = 'round';
          g.beginPath(); g.moveTo(cx + br * 0.5, cy - br * 0.8); g.quadraticCurveTo(cx + br * 0.9, cy - br * 1.6, cx + br * 1.3, cy - br * 1.3); g.stroke();
          const bg = g.createRadialGradient(cx - br * 0.35, cy - br * 0.35, br * 0.1, cx, cy, br);
          bg.addColorStop(0, '#6a6a7a'); bg.addColorStop(1, '#14141c');
          g.beginPath(); g.arc(cx, cy, br, 0, 6.3); g.fillStyle = bg; g.fill();
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(cx - br * 0.38, cy - br * 0.38, br * 0.2, 0, 6.3); g.fill();
        }
        if (crack > 0) this.cracks(g, x, y, w, crack);
      });
    }
    cracks(g, x, y, w, lvl) {
      let seed = 7 + lvl * 13;
      const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const paths = [];
      const n = lvl === 1 ? 3 : 6;
      const cx = x + w * (0.4 + R() * 0.2), cy = y + w * (0.4 + R() * 0.2);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * 6.28 + R() * 0.6;
        const pts = [cx, cy]; let px = cx, py = cy;
        const steps = 3;
        for (let s = 0; s < steps; s++) { const a = a0 + (R() - 0.5) * 0.9, l = w * (0.12 + R() * 0.12); px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push(px, py); }
        paths.push(pts);
      }
      for (const pass of [0, 1]) {
        g.strokeStyle = pass ? 'rgba(255,255,255,0.9)' : 'rgba(30,10,40,0.6)';
        g.lineWidth = Math.max(0.8, w * (pass ? 0.03 : 0.07)); g.lineJoin = 'round';
        for (const p of paths) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); }
      }
    }
    ballSpr(fire) {
      const D = BR * this.s * 5;
      return this.sprite('ball' + fire, D, D, (g) => {
        const c = D / 2, r = BR * this.s;
        const glow = fire ? '#ff7a1a' : this.th.accent2 || '#00e5ff';
        const rg = g.createRadialGradient(c, c, r * 0.6, c, c, c);
        rg.addColorStop(0, U.rgba(glow.startsWith('#') ? glow : '#00e5ff', 0.6)); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, D, D);
        const bg = g.createRadialGradient(c - r * 0.35, c - r * 0.35, r * 0.1, c, c, r);
        if (fire) { bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.5, '#ffd040'); bg.addColorStop(1, '#ff5a1a'); }
        else { bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, '#e6f4ff'); bg.addColorStop(1, '#8fc8ff'); }
        g.beginPath(); g.arc(c, c, r, 0, 6.3); g.fillStyle = bg; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(c - r * 0.35, c - r * 0.38, r * 0.28, 0, 6.3); g.fill();
      });
    }
    capSpr(type) {
      const P = POWERS[type], w = this.s * 1.3, h = this.s * 0.66;
      return this.sprite('cap' + type, w + 4, h + 4, (g) => {
        const x = 2, y = 2;
        const gr = g.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, U.shade(P.col, 0.55)); gr.addColorStop(0.5, P.col); gr.addColorStop(1, U.shade(P.col, -0.45));
        rr(g, x, y, w, h, h / 2); g.fillStyle = gr; g.fill();
        g.lineWidth = Math.max(1.2, h * 0.08); g.strokeStyle = '#ffffff'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, x + h * 0.3, y + h * 0.1, w - h * 0.6, h * 0.3, h * 0.15); g.fill();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const emo = P.emo;
        g.font = emo ? `${h * 0.62}px ${EMO}` : `900 ${h * 0.66}px ${FONTK}`;
        g.lineWidth = Math.max(1.5, h * 0.12); g.strokeStyle = U.shade(P.col, -0.6);
        if (!emo) g.strokeText(P.ico, x + w / 2, y + h / 2 + 1);
        g.fillStyle = '#ffffff'; g.fillText(P.ico, x + w / 2, y + h / 2 + 1);
      });
    }
    panel() {
      if (this.bg) return this.bg;
      const W = this.W, H = this.H, s = this.s;
      this.bg = this.sprite('panel' + W + 'x' + H, W, H, (g) => {
        const x = this.ox - 4, y = this.oy - 4, w = this.WW * s + 8, h = this.WH * s + 8;
        g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
        const bg = g.createLinearGradient(0, y, 0, y + h);
        bg.addColorStop(0, 'rgba(12,6,34,0.88)'); bg.addColorStop(1, 'rgba(24,8,48,0.84)');
        rr(g, x, y, w, h, 18); g.fillStyle = bg; g.fill();
        g.shadowColor = 'transparent';
        g.save(); rr(g, x, y, w, h, 18); g.clip();
        // faint diamond lattice
        g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
        for (let i = -this.WH; i < this.WW + this.WH; i += 1.5) {
          g.beginPath(); g.moveTo(this.ox + i * s, this.oy); g.lineTo(this.ox + (i + this.WH) * s, this.oy + this.WH * s); g.stroke();
          g.beginPath(); g.moveTo(this.ox + i * s, this.oy); g.lineTo(this.ox + (i - this.WH) * s, this.oy + this.WH * s); g.stroke();
        }
        const tg = g.createRadialGradient(x + w / 2, y, 10, x + w / 2, y, w * 0.9);
        tg.addColorStop(0, U.rgba(this.th.accent2 && this.th.accent2[0] === '#' ? this.th.accent2 : '#00e5ff', 0.16)); tg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = tg; g.fillRect(x, y, w, h);
        const dg = g.createLinearGradient(0, y + h - s * 1.2, 0, y + h);
        dg.addColorStop(0, 'rgba(255,40,90,0)'); dg.addColorStop(1, 'rgba(255,40,90,0.28)');
        g.fillStyle = dg; g.fillRect(x, y + h - s * 1.2, w, s * 1.2);
        g.restore();
        const acc = this.th.accent && this.th.accent[0] === '#' ? this.th.accent : '#ff4fd8', acc2 = this.th.accent2 && this.th.accent2[0] === '#' ? this.th.accent2 : '#00e5ff';
        const sg = g.createLinearGradient(x, y, x + w, y + h);
        sg.addColorStop(0, acc); sg.addColorStop(0.5, acc2); sg.addColorStop(1, acc);
        g.shadowColor = acc; g.shadowBlur = 14;
        rr(g, x, y, w, h, 18); g.strokeStyle = sg; g.lineWidth = 2.5; g.stroke();
        g.shadowBlur = 0;
        rr(g, x + 4, y + 4, w - 8, h - 8, 14); g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1; g.stroke();
      });
      return this.bg;
    }

    /* ---------- draw ---------- */
    draw(t) {
      const g = this.ctx; if (!g || !this.s) return;
      const s = this.s, ox = this.ox, oy = this.oy;
      g.clearRect(0, 0, this.W, this.H);
      g.drawImage(this.panel(), 0, 0, this.W, this.H);
      const clock = this.clock;

      // bricks
      const gx = ox + this.gx * s, gy = oy + this.gy * s;
      const sweep = (t * 0.45) % 3.2;
      for (const k of this.bricks) {
        if (this.grid[k.r][k.c] !== k) continue;
        const spr = this.brickSpr(k);
        let x = gx + k.c * s, y = gy + k.r * s, a = 1, sc = 1;
        const u = (clock - k.born) / 0.45;
        if (u < 1) { if (u <= 0) continue; const e = U.easeOutBack(Math.max(0, u)); y -= (1 - e) * s * 2.5; a = Math.min(1, u * 2.5); }
        if (k.hit > 0) sc = 1 + 0.16 * k.hit;
        g.globalAlpha = a;
        if (sc !== 1) { const w = s * sc, h = s * 1.08 * (2 - sc); g.drawImage(spr, x - (w - s) / 2, y - (h - s * 1.08) / 2, w, h); }
        else g.drawImage(spr, x, y, s, s * 1.08);
        if (k.hit > 0.05) { g.globalAlpha = k.hit * 0.55; g.fillStyle = '#ffffff'; rr(g, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.22); g.fill(); }
        // diagonal shine sweep
        const ds = sweep - (k.c + k.r) * 0.09;
        if (ds > 0 && ds < 0.25 && k.kind !== 's') { g.globalAlpha = Math.sin((ds / 0.25) * Math.PI) * 0.45; g.fillStyle = '#ffffff'; rr(g, x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.22); g.fill(); }
        if (k.kind === 'b') { // fuse spark
          g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 14 + k.ph);
          g.fillStyle = '#ffe27a';
          g.beginPath(); g.arc(x + s * 0.83, y + s * 0.2, s * (0.07 + 0.03 * Math.sin(t * 20 + k.ph)), 0, 6.3); g.fill();
        }
        if (k.drop) { const tw = Math.sin(t * 3 + k.ph); if (tw > 0.6) { g.globalAlpha = (tw - 0.6) * 2.5; this.star(g, x + s * 0.78, y + s * 0.78, s * 0.16); } }
        g.globalAlpha = 1;
      }
      // pop-out of destroyed bricks
      for (const an of this.anims) {
        const u = (clock - an.t0) / 0.3; if (u < 0 || u > 1) continue;
        const k = an.k, spr = this.brickSpr(k), sc = 1 + u * 0.5;
        g.globalAlpha = 1 - u;
        g.drawImage(spr, gx + (k.c + 0.5) * s - (s * sc) / 2, gy + (k.r + 0.5) * s - (s * sc) / 2, s * sc, s * 1.08 * sc);
      }
      g.globalAlpha = 1;

      // capsules
      for (const c of this.caps) {
        const spr = this.capSpr(c.type), w = spr.width / (this.dpr || 1), h = spr.height / (this.dpr || 1);
        g.save(); g.translate(ox + c.x * s, oy + c.y * s); g.rotate(Math.sin(c.rot * 5) * 0.15);
        g.drawImage(spr, -w / 2, -h / 2, w, h); g.restore();
      }
      // lasers
      if (this.bolts.length) {
        g.strokeStyle = '#ff6b8a'; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.12);
        g.shadowColor = '#ff3b5c'; g.shadowBlur = 10;
        g.beginPath();
        for (const z of this.bolts) { g.moveTo(ox + z.x * s, oy + z.y * s); g.lineTo(ox + z.x * s, oy + (z.y + 0.7) * s); }
        g.stroke(); g.shadowBlur = 0;
      }
      // safety net
      if (this.net > 0) {
        const y = oy + (this.WH - 0.35) * s;
        g.globalAlpha = 0.55 + 0.3 * Math.sin(t * 4) + this.netFlash * 0.4;
        g.strokeStyle = '#7fffd4'; g.lineWidth = 3; g.setLineDash([s * 0.4, s * 0.25]); g.shadowColor = '#7fffd4'; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(ox + 4, y); g.lineTo(ox + this.WW * s - 4, y); g.stroke();
        g.setLineDash([]); g.shadowBlur = 0; g.globalAlpha = 1;
        g.font = `${Math.max(10, s * 0.38)}px ${FONTK}`; g.fillStyle = '#bffff0'; g.textAlign = 'right'; g.textBaseline = 'bottom';
        g.fillText(`안전망 ×${this.net}`, ox + this.WW * s - 8, y - 3);
      }
      this.drawPaddle(g, t);
      // balls
      const fire = this.pw.fire > 0;
      const bs = this.ballSpr(fire), D = BR * s * 5;
      for (const b of this.balls) {
        if (!b.held && b.tn > 1) {
          g.fillStyle = fire ? '#ff9a3a' : '#bfe6ff';
          for (let i = 1; i < b.tn; i++) {
            const j = (b.ti - 1 - i + 20) % 10;
            g.globalAlpha = (1 - i / 10) * (fire ? 0.5 : 0.3);
            g.beginPath(); g.arc(ox + b.tr[j * 2] * s, oy + b.tr[j * 2 + 1] * s, BR * s * (1 - i / 12), 0, 6.3); g.fill();
          }
          g.globalAlpha = 1;
        }
        g.drawImage(bs, ox + b.x * s - D / 2, oy + b.y * s - D / 2, D, D);
      }
      // aim guide + tutorial
      const held = this.balls.find((b) => b.held);
      if (held && this.running && !this.ending) {
        const u = U.clamp(held.off / (this.pwid / 2), -1, 1), a = U.clamp(u * 1.05, -1, 1) || 0.2;
        g.fillStyle = '#ffffff';
        for (let i = 1; i <= 7; i++) {
          const d = i * 0.62 + ((t * 2) % 0.62);
          g.globalAlpha = 0.65 * (1 - i / 8);
          g.beginPath(); g.arc(ox + (held.x + Math.sin(a) * d) * s, oy + (held.y - Math.cos(a) * d) * s, Math.max(1.5, s * 0.07), 0, 6.3); g.fill();
        }
        g.globalAlpha = 1;
        if (this.stage <= 3 || this.launched === 0 || held.mag) {
          const pulse = 1 + 0.06 * Math.sin(t * 6);
          g.save(); g.translate(ox + (this.WW / 2) * s, oy + (this.PY - 3.2) * s); g.scale(pulse, pulse);
          g.font = `${Math.max(16, s * 0.7)}px ${FONTK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 5; g.strokeStyle = 'rgba(20,0,40,0.85)'; g.fillStyle = '#ffffff';
          const msg = held.mag ? '탭하면 발사!' : '탭해서 발사!';
          g.strokeText(msg, 0, 0); g.fillText(msg, 0, 0);
          if (this.stage <= 3 && !held.mag) {
            g.font = `${Math.max(12, s * 0.45)}px ${FONTK}`; g.fillStyle = '#bfefff';
            g.strokeText('◀ 드래그로 패들 이동 ▶', 0, s * 0.85); g.fillText('◀ 드래그로 패들 이동 ▶', 0, s * 0.85);
          }
          g.restore();
        }
      }
      // active power chips (top-left) & combo (top-right)
      let cx = ox + 8;
      const cy = oy + 6, ch = Math.max(18, s * 0.62);
      for (const k of TIMED) {
        const left = this.pw[k]; if (left <= 0) continue;
        const P = POWERS[k], cw = ch * 3.3;
        g.globalAlpha = left < 2 ? 0.5 + 0.5 * Math.sin(t * 16) : 1;
        rr(g, cx, cy, cw, ch, ch / 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
        g.strokeStyle = P.col; g.lineWidth = 1.5; g.stroke();
        const full = k === 'wide' ? this.p.itemSec * 1.6 : k === 'fire' ? this.p.itemSec * 0.7 : this.p.itemSec;
        rr(g, cx + ch * 0.95, cy + ch * 0.62, (cw - ch * 1.2) * U.clamp(left / full, 0, 1), ch * 0.18, ch * 0.09); g.fillStyle = P.col; g.fill();
        const emo = P.emo;
        g.font = emo ? `${ch * 0.6}px ${EMO}` : `900 ${ch * 0.6}px ${FONTK}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
        g.fillText(P.ico, cx + ch * 0.5, cy + ch * 0.53);
        g.font = `${ch * 0.36}px ${FONTK}`; g.textAlign = 'left';
        g.fillText(P.name, cx + ch * 0.95, cy + ch * 0.36);
        g.globalAlpha = 1;
        cx += cw + 5;
      }
      if (this.combo >= 3) {
        const sc = 1 + this.comboT * 0.35;
        g.save(); g.translate(ox + this.WW * s - 10, oy + ch * 0.75); g.scale(sc, sc);
        g.font = `${Math.max(16, s * 0.62)}px ${FONTK}`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.lineWidth = 4; g.strokeStyle = 'rgba(40,0,30,0.85)';
        const txt = `${this.combo} 콤보 ×${this.mult()}`;
        g.strokeText(txt, 0, 0);
        g.fillStyle = `hsl(${(45 + this.combo * 12) % 360},100%,70%)`; g.fillText(txt, 0, 0);
        g.restore();
      }
      // stage intro title
      if (clock < 1.8 && this.running) {
        const u = clock / 1.8, a = u < 0.15 ? u / 0.15 : u > 0.7 ? (1 - u) / 0.3 : 1;
        g.globalAlpha = Math.max(0, a);
        g.font = `${Math.max(22, s * 1.05)}px ${FONTK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 6; g.strokeStyle = 'rgba(20,0,40,0.9)';
        const y = oy + (this.WH * 0.62) * s;
        g.strokeText(this.shapeName, ox + (this.WW / 2) * s, y);
        g.fillStyle = '#ffe27a'; g.fillText(this.shapeName, ox + (this.WW / 2) * s, y);
        g.globalAlpha = 1;
      }
    }
    star(g, x, y, r) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, l = i % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
      g.closePath(); g.fill();
    }
    drawPaddle(g, t) {
      const s = this.s, w = this.pwid * s, h = PH * s;
      const cx = this.ox + this.px * s, cy = this.oy + (this.PY + PH / 2) * s;
      const acc = this.th.accent && this.th.accent[0] === '#' ? this.th.accent : '#ff4fd8';
      const acc2 = this.th.accent2 && this.th.accent2[0] === '#' ? this.th.accent2 : '#00e5ff';
      const sq = this.psq;
      g.save();
      g.translate(cx, cy + h * 0.1 * sq);
      g.scale(1 + 0.06 * sq, 1 - 0.28 * sq);
      g.rotate(U.clamp(this.pvx * 0.002, -0.06, 0.06));
      // shadow & glow
      g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, -w / 2 + 2, -h / 2 + h * 0.35, w, h, h / 2); g.fill();
      if (this.pw.magnet > 0) {
        g.strokeStyle = U.rgba('#b07bff', 0.5 + 0.3 * Math.sin(t * 8)); g.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const yy = -h / 2 - 4 - i * 5 - ((t * 20) % 5); g.beginPath(); g.ellipse(0, yy, w * 0.35 - i * 4, 3, 0, Math.PI, 0); g.stroke(); }
      }
      if (this.pw.laser > 0) {
        g.fillStyle = '#c0203c';
        for (const sx of [-1, 1]) { rr(g, sx * (w / 2 - 0.25 * s) - s * 0.1, -h / 2 - s * 0.28, s * 0.2, s * 0.4, s * 0.06); g.fill(); }
      }
      const bg = g.createLinearGradient(0, -h / 2, 0, h / 2);
      bg.addColorStop(0, U.shade(acc, 0.55)); bg.addColorStop(0.5, acc); bg.addColorStop(1, U.shade(acc, -0.45));
      rr(g, -w / 2, -h / 2, w, h, h / 2); g.fillStyle = bg; g.fill();
      // end caps
      const cg = g.createLinearGradient(0, -h / 2, 0, h / 2);
      cg.addColorStop(0, U.shade(acc2, 0.6)); cg.addColorStop(1, U.shade(acc2, -0.35));
      g.fillStyle = cg;
      rr(g, -w / 2, -h / 2, h * 1.15, h, h / 2); g.fill();
      rr(g, w / 2 - h * 1.15, -h / 2, h * 1.15, h, h / 2); g.fill();
      rr(g, -w / 2, -h / 2, w, h, h / 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)'; rr(g, -w / 2 + h * 0.4, -h / 2 + h * 0.12, w - h * 0.8, h * 0.3, h * 0.15); g.fill();
      // cute face looking at the nearest ball
      let tx = 0, ty = -1;
      if (this.balls.length) { const b = this.balls[0]; tx = b.x - this.px; ty = b.y - this.PY; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; }
      const er = h * 0.27, ex = h * 0.62;
      const blink = this.blink < 0;
      for (const sx of [-1, 1]) {
        const x = sx * ex, y = -h * 0.02;
        if (blink) { g.strokeStyle = '#2a1030'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - er, y); g.lineTo(x + er, y); g.stroke(); continue; }
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, er, er * 1.1, 0, 0, 6.3); g.fill();
        g.fillStyle = '#2a1030'; g.beginPath(); g.arc(x + tx * er * 0.4, y + ty * er * 0.4, er * 0.62, 0, 6.3); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + tx * er * 0.4 - er * 0.2, y + ty * er * 0.4 - er * 0.25, er * 0.22, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(255,120,170,0.55)'; g.beginPath(); g.ellipse(x + sx * er * 1.7, y + er * 0.8, er * 0.6, er * 0.35, 0, 0, 6.3); g.fill();
      }
      g.strokeStyle = '#2a1030'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, h * 0.08, h * 0.16, 0.2, Math.PI - 0.2); g.stroke();
      g.restore();
    }
  }

  root.QuestGames.brick = Brick;
})(window);
