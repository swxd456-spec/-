/* 버블 팡팡 — hex-grid bubble shooter.
   Goal (always the same): rescue every critter trapped in a bubble near the ceiling.
   A critter is freed when its bubble pops or falls. Limited shots; the ceiling may press down on later stages.
   Specials: ice (thaws when a neighbour pops), stone (never pops, only falls), star (shoot it → clears that colour),
   bomb (explodes when a neighbour pops), rainbow shooter bubble (matches any colour). Tools: bomb bubble, long aim. */
(function (root) {
  const { Base, util } = root.QuestGames;
  const U = root.U, A = root.SlotAudio;
  const SEC = '버블팡팡';
  const DEF = {
    입장료: 100, 클리어보상: 250, 발추가_가격: 120, 발추가_수: 5,
    폭탄버블_가격: 80, 조준연장_가격: 60,
    난이도_속도: 32,
    색수_시작: 3, 색수_최대: 6,
    줄수_시작: 5, 줄수_최대: 9,
    가로_칸수: 9, 위험선_줄: 13,
    발수_시작: 40, 발수_끝: 30, 초반_추가발: 8,
    구출친구_시작: 2, 구출친구_최대: 5,
    뭉침_시작: 70, 뭉침_끝: 42,
    도움색_시작: 70, 도움색_끝: 38,
    조준선_시작: 40, 조준선_끝: 7,
    도움조준_판수: 3,
    천장하강_시작판: 12, 천장하강_간격_시작: 14, 천장하강_간격_최소: 8,
    특수_비율_시작: 4, 특수_비율_최대: 12,
    얼음_시작판: 4, 돌_시작판: 7, 별_시작판: 10, 폭탄_시작판: 14, 무지개_시작판: 3, 무지개_확률: 7,
    불꽃_점수: 120, 남은발_코인: 6, 구출_코인: 15,
    별2_비율: 60, 별3_비율: 90,
  };
  // candy palette: base, highlight, dark, symbol
  const COL = [
    { b: '#ff4d6d', h: '#ffc2cf', d: '#a3123a', s: 'heart', n: '딸기' },
    { b: '#ffcc33', h: '#fff4b8', d: '#c27a00', s: 'star', n: '레몬' },
    { b: '#38a8ff', h: '#c6ecff', d: '#0b4fb3', s: 'drop', n: '소다' },
    { b: '#4ddb7a', h: '#d0ffd9', d: '#13863e', s: 'leaf', n: '라임' },
    { b: '#b46bff', h: '#ead2ff', d: '#5b1fa8', s: 'moon', n: '포도' },
    { b: '#ff9a3c', h: '#ffe0bd', d: '#b5480a', s: 'diamond', n: '오렌지' },
  ];
  const CRIT_N = 5;
  const TAU = Math.PI * 2;
  const MIN_A = 0.13;

  function starPath(g, x, y, R, r, n) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function symbol(g, s, r) {
    g.beginPath();
    if (s === 'heart') {
      g.moveTo(0, r * 0.75);
      g.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.55, -r * 1.05, 0, -r * 0.35);
      g.bezierCurveTo(r * 0.55, -r * 1.05, r * 1.3, -r * 0.1, 0, r * 0.75);
    } else if (s === 'star') { starPath(g, 0, 0, r, r * 0.45, 5); return; }
    else if (s === 'drop') { g.moveTo(0, -r); g.bezierCurveTo(r * 0.9, -r * 0.05, r * 0.8, r * 0.85, 0, r * 0.85); g.bezierCurveTo(-r * 0.8, r * 0.85, -r * 0.9, -r * 0.05, 0, -r); }
    else if (s === 'leaf') { g.moveTo(-r * 0.8, r * 0.8); g.quadraticCurveTo(-r * 0.9, -r * 0.9, r * 0.85, -r * 0.85); g.quadraticCurveTo(r * 0.9, r * 0.9, -r * 0.8, r * 0.8); }
    else if (s === 'moon') { g.arc(0, 0, r * 0.9, Math.PI * 0.3, Math.PI * 1.7); g.arc(r * 0.45, -r * 0.05, r * 0.68, Math.PI * 1.55, Math.PI * 0.45, true); }
    else { g.moveTo(0, -r); g.lineTo(r * 0.8, 0); g.lineTo(0, r); g.lineTo(-r * 0.8, 0); }
    g.closePath();
  }
  // cute critter centred at 0,0 with radius r
  function critter(g, k, r, blink) {
    const body = ['#ffe45c', '#fff1f6', '#ffb35c', '#c58b5a', '#8ee06a'][k];
    const dark = ['#e0a800', '#f0a9c3', '#d9771c', '#8a5a33', '#3f9a2c'][k];
    g.save();
    // ears / extras behind
    g.fillStyle = body; g.strokeStyle = dark; g.lineWidth = r * 0.08;
    if (k === 1) { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.38, -r * 0.95, r * 0.2, r * 0.5, s * 0.2, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ff9ec0'; g.beginPath(); g.ellipse(s * r * 0.38, -r * 0.95, r * 0.09, r * 0.34, s * 0.2, 0, TAU); g.fill(); g.fillStyle = body; } }
    if (k === 2) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.75, -r * 0.2); g.lineTo(s * r * 0.62, -r * 1.0); g.lineTo(s * r * 0.15, -r * 0.62); g.closePath(); g.fill(); g.stroke(); } }
    if (k === 3) { for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.6, -r * 0.62, r * 0.28, 0, TAU); g.fill(); g.stroke(); } }
    if (k === 4) { for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.42, -r * 0.62, r * 0.3, 0, TAU); g.fill(); g.stroke(); } }
    if (k === 0) { g.beginPath(); g.moveTo(-r * 0.1, -r * 0.8); g.quadraticCurveTo(0, -r * 1.25, r * 0.22, -r * 1.05); g.quadraticCurveTo(r * 0.05, -r * 0.95, r * 0.1, -r * 0.8); g.fill(); g.stroke(); }
    // body
    const bg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, body); bg.addColorStop(1, dark);
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, r * 0.88, r * 0.8, 0, 0, TAU); g.fill(); g.stroke();
    if (k === 3) { g.fillStyle = '#f3dcc0'; g.beginPath(); g.ellipse(0, r * 0.25, r * 0.38, r * 0.28, 0, 0, TAU); g.fill(); }
    // eyes
    const ey = k === 4 ? -r * 0.6 : -r * 0.08, ex = k === 4 ? r * 0.42 : r * 0.33;
    for (const s of [-1, 1]) {
      if (k === 4) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex, ey, r * 0.22, 0, TAU); g.fill(); }
      if (blink) { g.strokeStyle = '#2a1430'; g.lineWidth = r * 0.09; g.beginPath(); g.arc(s * ex, ey, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); continue; }
      g.fillStyle = '#2a1430'; g.beginPath(); g.ellipse(s * ex, ey, r * 0.15, r * 0.19, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - r * 0.05, ey - r * 0.07, r * 0.065, 0, TAU); g.fill();
      g.beginPath(); g.arc(s * ex + r * 0.05, ey + r * 0.06, r * 0.03, 0, TAU); g.fill();
    }
    // blush
    g.fillStyle = 'rgba(255,100,140,0.55)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.55, r * 0.18, r * 0.14, r * 0.08, 0, 0, TAU); g.fill(); }
    // mouth / beak
    if (k === 0) { g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(-r * 0.12, r * 0.12); g.lineTo(r * 0.12, r * 0.12); g.lineTo(0, r * 0.3); g.closePath(); g.fill(); }
    else { g.strokeStyle = '#2a1430'; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(-r * 0.07, r * 0.16, r * 0.08, 0.1, Math.PI - 0.3); g.stroke(); g.beginPath(); g.arc(r * 0.07, r * 0.16, r * 0.08, 0.3, Math.PI - 0.1); g.stroke(); }
    if (k === 2) { g.strokeStyle = 'rgba(80,40,10,0.6)'; g.lineWidth = r * 0.04; for (const s of [-1, 1]) for (const o of [-0.06, 0.08]) { g.beginPath(); g.moveTo(s * r * 0.5, r * (0.12 + o)); g.lineTo(s * r * 0.95, r * (0.06 + o * 2)); g.stroke(); } }
    g.restore();
  }

  class Bubble extends Base {
    static info = { id: 'bubble', name: '버블 팡팡', icon: '🫧', section: SEC, color: '#ff6fb5', desc: '말랑 버블을 쏴서 갇힌 친구들을 구출해요!' };
    static howto = [
      '화면을 드래그해서 조준하고, 손을 떼면 버블이 날아가요.',
      '같은 색 3개 이상이 붙으면 팡! 매달린 버블은 우수수 떨어져요.',
      '버블 속에 갇힌 친구를 모두 구출하면 클리어! 남은 발은 불꽃놀이 보너스.',
      '용을 누르면 지금 버블과 다음 버블을 바꿀 수 있어요.',
    ];
    static params(stage, C) {
      const P = util.cfg(C, SEC, DEF);
      const e = util.ease(stage, P.난이도_속도), L = (a, b) => util.lerp(a, b, e);
      const on = (k) => stage >= P[k];
      const early = stage <= P.도움조준_판수;
      return {
        fee: P.입장료, reward: P.클리어보상, extendCost: P.발추가_가격, extendSec: 0, extendShots: P.발추가_수, extendText: `+${P.발추가_수}발`, time: 0,
        colors: U.clamp(Math.round(L(P.색수_시작, P.색수_최대 + 0.4)), 2, 6),
        rows: Math.max(2, Math.round(L(P.줄수_시작, P.줄수_최대 + 0.4))),
        cols: U.clamp(Math.round(P.가로_칸수), 6, 13), danger: Math.max(8, Math.round(P.위험선_줄)),
        shots: Math.round(L(P.발수_시작, P.발수_끝)) + (early ? P.초반_추가발 : 0),
        critters: Math.max(1, Math.round(L(P.구출친구_시작, P.구출친구_최대 + 0.4))),
        cluster: L(P.뭉침_시작, P.뭉침_끝) / 100,
        help: L(P.도움색_시작, P.도움색_끝) / 100,
        aim: L(P.조준선_시작, P.조준선_끝),
        hintAim: early,
        dropEvery: on('천장하강_시작판') ? Math.round(util.lerp(P.천장하강_간격_시작, P.천장하강_간격_최소, util.ease(stage - P.천장하강_시작판 + 1, P.난이도_속도))) : 0,
        special: L(P.특수_비율_시작, P.특수_비율_최대) / 100,
        sp: { ice: on('얼음_시작판'), stone: on('돌_시작판'), star: on('별_시작판'), bomb: on('폭탄_시작판') },
        rainbow: on('무지개_시작판') ? P.무지개_확률 / 100 : 0,
        bombCost: P.폭탄버블_가격, aimCost: P.조준연장_가격,
        fwScore: P.불꽃_점수, shotCoin: P.남은발_코인, critCoin: P.구출_코인,
        starPct: [P.별2_비율 / 100, P.별3_비율 / 100], star: [0, 0, 0],
      };
    }

    constructor(host, o) {
      super(host, o);
      const p = this.p;
      this.COLS = p.cols; this.DANGER = p.danger;
      this.shots = p.shots; this.fired = 0; this.drop = 0; this.dropV = 0; this.sinceDrop = 0;
      this.combo = 0; this.maxCombo = 0; this.tm = 0; this.state = 'aim';
      this.longAim = false; this.cache = new Map();
      this.pops = []; this.fallers = []; this.flyers = []; this.rockets = []; this.jig = [];
      this.aim = null; this.idle = 0; this.hint = null; this.recoil = 0; this.blink = 0; this.swapT = -1;
      this.lastPopSfx = 0; this.chain = 0;
      this.qr = U.mulberry32(((o.seed >>> 0) ^ 0x9e3779b9) >>> 0 || 7);
      this.generate();
      this.cur = this.makeShot(); this.next = this.makeShot();
      this.hud({
        title: '버블 팡팡', sub: `${o.stage}판 · 친구 ${this.critTotal}마리 구출`, timer: false,
        tools: [{ id: 'bomb', ico: '💣', label: '폭탄 버블', cost: p.bombCost }, { id: 'aim', ico: '🎯', label: '조준 연장', cost: p.aimCost }],
      });
      const cv = this.ui.cv;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', (e) => this.pDown(e));
      cv.addEventListener('pointermove', (e) => this.pMove(e));
      cv.addEventListener('pointerup', (e) => this.pUp(e));
      cv.addEventListener('pointercancel', () => { this.aim = null; this.aimPath = null; this.aiming = false; this.tapSwap = false; });
      this.layout();
      this.hudUpdate();
    }

    /* ---------- grid helpers ---------- */
    rowLen(r) { return r % 2 ? this.COLS - 1 : this.COLS; }
    at(r, c) { return r < 0 || r >= this.g.length || c < 0 || c >= this.rowLen(r) ? undefined : this.g[r][c]; }
    nb(r, c) {
      const o = r % 2 ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
      const out = [];
      for (const [dr, dc] of o) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < this.g.length && cc >= 0 && cc < this.rowLen(rr)) out.push([rr, cc]); }
      return out;
    }
    each(fn) { for (let r = 0; r < this.g.length; r++) for (let c = 0; c < this.g[r].length; c++) if (this.g[r][c]) fn(this.g[r][c], r, c); }
    matchable(b) { return b && (b.t === 'n'); }

    generate() {
      const p = this.p, rnd = this.rnd, R = Math.min(p.rows, this.DANGER - 3);
      this.g = [];
      for (let r = 0; r < this.DANGER + 2; r++) this.g.push(new Array(this.rowLen(r)).fill(null));
      // layout pattern
      const pats = this.o.stage <= 2 ? ['full'] : ['full', 'full', 'wave', 'vee', 'pillars', 'diamond'];
      const pat = pats[Math.floor(rnd() * pats.length)];
      this.pattern = pat;
      const C = this.COLS;
      const inMask = (r, c) => {
        const x = c + (r % 2 ? 0.5 : 0), mid = (C - 1) / 2;
        if (pat === 'wave') return r < R - 1 || Math.sin(x * 0.9) > -0.3;
        if (pat === 'vee') return r <= R - 1 - Math.round((mid - Math.abs(x - mid)) * 0.45);
        if (pat === 'pillars') return r < 2 || Math.floor(x / 2) % 2 === 0 || r < R - 2;
        if (pat === 'diamond') return r < R - Math.round(Math.abs(x - mid) * 0.5) + 1 && r < R + 1;
        return true;
      };
      const rows = pat === 'diamond' ? Math.min(R + 1, this.DANGER - 3) : R;
      const nc = p.colors, cnt = new Array(nc).fill(0), maxG = 3 + Math.round(p.cluster * 4);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < this.rowLen(r); c++) {
          if (!inMask(r, c)) continue;
          let col = -1;
          if (rnd() < p.cluster) {
            const cand = this.nb(r, c).filter(([rr, cc]) => (rr < r || (rr === r && cc < c)) && this.g[rr][cc] && this.flood(rr, cc).length < maxG).map(([rr, cc]) => this.g[rr][cc].c);
            if (cand.length) col = cand[Math.floor(rnd() * cand.length)];
          }
          if (col < 0) col = U.wpick(cnt, (n) => 1 / (1 + n * n), rnd);
          cnt[col]++;
          this.g[r][c] = this.mk(col, 'n');
        }
      }
      // make sure everything hangs from the ceiling
      this.dropFloating(true);
      // critters near the ceiling, spread across the width
      const want = Math.min(p.critters, 6);
      const top = Math.min(2, rows - 1);
      const cells = [];
      for (let r = 0; r <= top; r++) for (let c = 0; c < this.rowLen(r); c++) if (this.g[r][c]) cells.push([r, c]);
      this.critTotal = 0;
      for (let i = 0; i < want && cells.length; i++) {
        const lo = (i / want) * C, hi = ((i + 1) / want) * C;
        let pool = cells.filter(([r, c]) => { const x = c + (r % 2 ? 0.5 : 0); return x >= lo - 0.01 && x < hi && !this.g[r][c].cr0; });
        if (!pool.length) pool = cells.filter(([r, c]) => !this.g[r][c].cr0);
        if (!pool.length) break;
        // mostly in the very top row (they must be popped there), sometimes one row lower
        const top0 = pool.filter(([r]) => r === 0), low = pool.filter(([r]) => r === 1);
        const src = (this.rnd() < 0.7 || !low.length) && top0.length ? top0 : low.length ? low : pool;
        const pick = src[Math.floor(this.rnd() * src.length)];
        const b = this.g[pick[0]][pick[1]];
        b.cr = (i + Math.floor(this.rnd() * CRIT_N)) % CRIT_N; b.cr0 = true;
        this.critTotal++;
      }
      // specials
      const kinds = Object.keys(p.sp).filter((k) => p.sp[k]);
      let stars = 0;
      if (kinds.length) {
        this.each((b, r, c) => {
          if (b.cr >= 0 || r === 0 && rnd() < 0.5) return;
          if (rnd() >= p.special) return;
          let k = kinds[Math.floor(rnd() * kinds.length)];
          if (k === 'star' && stars >= 2) k = 'ice';
          if (k === 'ice' && !p.sp.ice) return;
          if (k === 'star') stars++;
          b.t = k;
          if (k === 'stone' || k === 'bomb' || k === 'star') b.c = -1;
        });
      }
      // each colour on the board at least a few times
      this.critLeft = this.critTotal; this.rescued = 0;
      let n = 0; this.each(() => n++);
      this.startCount = n;
      this.par = n * 18 + Math.min(this.p.shots * 0.3, 10) * this.p.fwScore + this.critTotal * 100;
    }
    mk(c, t) { return { c, t, cr: -1, ph: this.rnd() * TAU, jx: 0, jy: 0, vx: 0, vy: 0, born: 0 }; }

    colorsOnBoard(frontierOnly) {
      const set = new Set();
      this.each((b, r, c) => {
        if (b.c < 0 || (b.t !== 'n' && b.t !== 'ice')) return;
        if (frontierOnly && !this.nb(r, c).some(([rr, cc]) => !this.g[rr][cc] && rr > r - 1)) return;
        set.add(b.c);
      });
      return [...set];
    }
    makeShot() {
      const p = this.p;
      if (p.rainbow && this.fired > 1 && this.qr() < p.rainbow) return { c: 0, k: 'rainbow' };
      let pool = this.qr() < p.help ? this.colorsOnBoard(true) : [];
      if (!pool.length) pool = this.colorsOnBoard(false);
      if (!pool.length) pool = [0, 1, 2].slice(0, p.colors);
      return { c: pool[Math.floor(this.qr() * pool.length)], k: 'n' };
    }
    // when a colour disappears from the board, fix the queued bubbles
    refreshQueue() {
      const cols = this.colorsOnBoard(false);
      if (!cols.length) return;
      for (const s of [this.cur, this.next]) if (s && s.k === 'n' && !cols.includes(s.c)) s.c = cols[Math.floor(this.qr() * cols.length)];
    }

    /* ---------- layout ---------- */
    layout() {
      if (!this.fit()) return;
      const W = this.W, H = this.H, C = this.COLS;
      const need = 0.95 + 0.25 + (this.DANGER - 1) * 0.866 + 1.0 + 1.2 + 2.05;
      const d = Math.floor(Math.min((W - 14) / C, (H - 6) / need));
      this.d = d; this.rh = d * 0.8660254;
      this.bw = C * d; this.bx = Math.round((W - this.bw) / 2);
      const total = need * d;
      const y0 = Math.max(3, Math.round((H - total) * 0.35));
      this.trayY = y0; this.trayH = d * 0.95;
      this.oy = y0 + this.trayH + d * 0.25;
      this.lineY = this.oy + (this.DANGER - 1) * this.rh + d * 1.0;
      this.sx = this.bx + this.bw / 2; this.sy = this.lineY + d * 1.2;
      this.botY = Math.min(H - 2, this.sy + d * 2.05);
      this.cache.clear();
      this.aimPath = null;
    }
    cx(r, c) { return this.bx + this.d / 2 + c * this.d + (r % 2 ? this.d / 2 : 0); }
    cy(r, drop) { return this.oy + this.d / 2 + (r + (drop == null ? this.drop : drop)) * this.rh; }

    /* ---------- sprites ---------- */
    spr(key, draw) {
      let cv = this.cache.get(key);
      if (cv) return cv;
      const d = this.d, S = Math.ceil(d * 1.2 * this.dpr);
      cv = document.createElement('canvas'); cv.width = cv.height = S;
      const g = cv.getContext('2d');
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.translate(d * 0.6, d * 0.6);
      draw(g, d * 0.48);
      this.cache.set(key, cv);
      return cv;
    }
    ball(g, r, base, hi, dk, alpha) {
      g.save();
      g.globalAlpha = alpha == null ? 1 : alpha;
      const bg = g.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, 0, 0, r);
      bg.addColorStop(0, hi); bg.addColorStop(0.42, base); bg.addColorStop(1, dk);
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.restore();
      // jelly inner glow (bottom)
      const ig = g.createRadialGradient(0, r * 0.55, 0, 0, r * 0.45, r * 0.75);
      ig.addColorStop(0, U.rgba(hi.startsWith('#') ? hi : '#ffffff', 0.55)); ig.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = ig; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    }
    gloss(g, r) {
      g.save();
      g.rotate(-0.55);
      const gl = g.createLinearGradient(0, -r * 0.75, 0, -r * 0.2);
      gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(1, 'rgba(255,255,255,0.05)');
      g.fillStyle = gl; g.beginPath(); g.ellipse(0, -r * 0.48, r * 0.5, r * 0.27, 0, 0, TAU); g.fill();
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(r * 0.45, r * 0.38, r * 0.08, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(0, 0, r * 0.9, 0.2 * Math.PI, 0.6 * Math.PI); g.stroke();
    }
    bubbleSpr(b) {
      const t = b.t, c = b.c, cr = b.cr;
      return this.spr(`${t}|${c}|${cr}`, (g, r) => {
        if (t === 'stone') {
          const sg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
          sg.addColorStop(0, '#d9d4e3'); sg.addColorStop(0.5, '#8f88a3'); sg.addColorStop(1, '#4a4459');
          g.fillStyle = sg; g.beginPath();
          for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, rr = r * (0.92 + ((i * 7) % 3) * 0.04); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(40,30,60,0.55)'; g.lineWidth = r * 0.07; g.stroke();
          g.strokeStyle = 'rgba(40,30,60,0.45)'; g.lineWidth = r * 0.05;
          g.beginPath(); g.moveTo(-r * 0.5, -r * 0.2); g.lineTo(-r * 0.2, 0); g.lineTo(-r * 0.3, r * 0.3); g.stroke();
          g.beginPath(); g.moveTo(r * 0.3, -r * 0.55); g.lineTo(r * 0.45, -r * 0.2); g.stroke();
          // sleepy face
          g.strokeStyle = '#2b2238'; g.lineWidth = r * 0.07; g.lineCap = 'round';
          for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.38 - r * 0.12, r * 0.1); g.lineTo(s * r * 0.38 + r * 0.12, r * 0.1); g.stroke(); }
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.13, -0.5, 0, TAU); g.fill();
          return;
        }
        if (t === 'bomb') {
          this.ball(g, r, '#3b3357', '#8c84b8', '#0e0a1c');
          g.fillStyle = '#ffcf40'; g.font = `900 ${r * 0.8}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
          starPath(g, 0, r * 0.08, r * 0.42, r * 0.18, 8); g.fill();
          g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(0, r * 0.08, r * 0.14, 0, TAU); g.fill();
          g.fillStyle = '#c9a36a'; g.fillRect(-r * 0.16, -r * 1.02, r * 0.32, r * 0.22);
          this.gloss(g, r);
          return;
        }
        if (t === 'star') {
          this.ball(g, r, '#ffc93c', '#fff7c2', '#c07000');
          const sg = g.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
          sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#ffe27a');
          g.fillStyle = sg; starPath(g, 0, r * 0.05, r * 0.66, r * 0.3, 5); g.fill();
          g.strokeStyle = '#d98a00'; g.lineWidth = r * 0.06; g.stroke();
          this.gloss(g, r);
          return;
        }
        if (t === 'rainbow') {
          if (g.createConicGradient) {
            const cg = g.createConicGradient(0, 0, 0);
            COL.forEach((k, i) => cg.addColorStop(i / COL.length, k.b)); cg.addColorStop(1, COL[0].b);
            g.fillStyle = cg;
          } else g.fillStyle = '#ff6fd0';
          g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
          const wg = g.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r);
          wg.addColorStop(0, 'rgba(255,255,255,0.9)'); wg.addColorStop(0.45, 'rgba(255,255,255,0.25)'); wg.addColorStop(1, 'rgba(60,0,80,0.35)');
          g.fillStyle = wg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
          this.gloss(g, r);
          return;
        }
        const k = COL[c];
        if (cr >= 0) {
          this.ball(g, r, k.b, k.h, k.d, 0.78);
          g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.arc(0, 0, r * 0.68, 0, TAU); g.fill();
          critter(g, cr, r * 0.64, false);
          g.strokeStyle = U.rgba(k.d, 0.8); g.lineWidth = r * 0.09; g.beginPath(); g.arc(0, 0, r * 0.95, 0, TAU); g.stroke();
          this.gloss(g, r);
          return;
        }
        this.ball(g, r, k.b, k.h, k.d);
        // embossed symbol
        g.save(); g.translate(0, r * 0.06);
        symbol(g, k.s, r * 0.36); g.fillStyle = U.rgba(k.d, 0.45); g.save(); g.translate(0, r * 0.05); g.fill(); g.restore();
        symbol(g, k.s, r * 0.36); g.fillStyle = 'rgba(255,255,255,0.42)'; g.fill();
        g.restore();
        g.strokeStyle = U.rgba(k.d, 0.5); g.lineWidth = r * 0.05; g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.stroke();
        this.gloss(g, r);
        if (t === 'ice') {
          const ig = g.createLinearGradient(-r, -r, r, r);
          ig.addColorStop(0, 'rgba(230,250,255,0.75)'); ig.addColorStop(0.5, 'rgba(160,220,255,0.45)'); ig.addColorStop(1, 'rgba(210,240,255,0.7)');
          g.fillStyle = ig; g.beginPath();
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; g.lineTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02); }
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = r * 0.07; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = r * 0.04;
          g.beginPath(); g.moveTo(-r * 0.6, -r * 0.1); g.lineTo(-r * 0.1, -r * 0.5); g.moveTo(r * 0.1, r * 0.55); g.lineTo(r * 0.55, r * 0.1); g.stroke();
        }
      });
    }
    shotSpr(s) { return this.bubbleSpr(s.k === 'n' ? { t: 'n', c: s.c, cr: -1 } : { t: s.k, c: -1, cr: -1 }); }
    shotCol(s) { return s.k === 'n' ? COL[s.c].b : s.k === 'bomb' ? '#ffcf40' : '#ffffff'; }

    /* ---------- aiming ---------- */
    angleTo(x, y) {
      const dx = x - this.sx, dy = this.sy - y;
      if (dy < this.d * 0.2) return null;
      return U.clamp(Math.atan2(dy, dx), MIN_A, Math.PI - MIN_A);
    }
    // ray-march with wall bounces; returns { pts, cell, len }
    trace(a, maxB) {
      const d = this.d, step = d / 5, hit2 = (d * 0.8) * (d * 0.8);
      const L = this.bx + d / 2, Rw = this.bx + this.bw - d / 2;
      let x = this.sx, y = this.sy, vx = Math.cos(a), vy = -Math.sin(a);
      const pts = [[x, y]];
      let bounces = 0, len = 0;
      const top = this.cy(0) - d / 2;
      for (let i = 0; i < 4000; i++) {
        x += vx * step; y += vy * step; len += step;
        if (x < L) { x = 2 * L - x; vx = -vx; pts.push([L, y]); bounces++; }
        else if (x > Rw) { x = 2 * Rw - x; vx = -vx; pts.push([Rw, y]); bounces++; }
        if (y - d / 2 <= top) { y = top + d / 2; pts.push([x, y]); return { pts, cell: this.snap(x, y), len, bounces }; }
        const rr = Math.round((y - this.cy(0)) / this.rh);
        for (let r = Math.max(0, rr - 1); r <= Math.min(this.g.length - 1, rr + 1); r++) {
          const row = this.g[r];
          const yy = this.cy(r);
          for (let c = 0; c < row.length; c++) {
            if (!row[c]) continue;
            const dx = this.cx(r, c) - x, dy = yy - y;
            if (dx * dx + dy * dy < hit2) { pts.push([x, y]); return { pts, cell: this.snap(x, y), len, bounces }; }
          }
        }
        if (maxB != null && bounces > maxB) break;
      }
      pts.push([x, y]);
      return { pts, cell: null, len, bounces };
    }
    snap(x, y) {
      const rr = Math.round((y - this.cy(0)) / this.rh);
      let best = null, bd = 1e9;
      const tryRows = (r0, r1) => {
        for (let r = Math.max(0, r0); r <= Math.min(this.g.length - 1, r1); r++) {
          for (let c = 0; c < this.rowLen(r); c++) {
            if (this.g[r][c]) continue;
            if (r > 0 && !this.nb(r, c).some(([a, b]) => this.g[a][b])) continue;
            const dx = this.cx(r, c) - x, dy = this.cy(r) - y, dd = dx * dx + dy * dy;
            if (dd < bd) { bd = dd; best = [r, c]; }
          }
        }
      };
      tryRows(rr - 1, rr + 1);
      if (!best) tryRows(0, this.g.length - 1);
      return best;
    }

    pDown(e) {
      if (!this.running || this.paused) return;
      A.init && A.init();
      const [x, y] = this.local(e);
      try { this.ui.cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      // a tap on the dragon / next bubble swaps (decided on release, so dragging from there still aims)
      this.down = [x, y];
      this.tapSwap = y > this.sy - this.d * 0.6 && Math.abs(x - this.sx) < this.d * 2.7;
      if (this.state !== 'aim') return;
      this.aiming = true;
      if (!this.tapSwap) this.setAim(x, y);
    }
    pMove(e) {
      if (!this.aiming) return;
      const [x, y] = this.local(e);
      if (this.tapSwap && Math.hypot(x - this.down[0], y - this.down[1]) > this.d * 0.4) this.tapSwap = false;
      if (!this.tapSwap) this.setAim(x, y);
    }
    pUp(e) {
      if (this.tapSwap) { this.tapSwap = false; this.aiming = false; this.aim = null; this.aimPath = null; this.swap(); return; }
      if (!this.aiming) return;
      this.aiming = false;
      const [x, y] = this.local(e);
      this.setAim(x, y);
      if (this.aim != null && this.state === 'aim' && this.running && !this.paused) this.fire(this.aim);
      this.aim = null; this.aimPath = null;
    }
    setAim(x, y) {
      const a = this.angleTo(x, y);
      this.idle = 0; this.hint = null;
      if (a == null) { this.aim = null; this.aimPath = null; return; }
      if (this.aim !== a) { this.aim = a; this.aimPath = this.trace(a); }
    }

    swap() {
      if (this.state !== 'aim' || !this.next) return;
      [this.cur, this.next] = [this.next, this.cur];
      this.swapT = this.tm;
      this.sfx('swap');
      this.aimPath = this.aim != null ? this.trace(this.aim) : null;
    }

    fire(a) {
      const tr = this.trace(a);
      if (!tr.cell) return;
      this.state = 'fly';
      this.shots--; this.fired++; this.sinceDrop++;
      this.idle = 0; this.hint = null;
      this.fly = { s: this.cur, tr, dist: 0, seg: 0 };
      this.cur = this.next; this.next = this.makeShot();
      this.swapT = this.tm - 0.5;
      this.recoil = 1;
      this.sfx('shoot');
      this.hudUpdate();
    }

    /* ---------- resolution ---------- */
    land(s, cell) {
      const [r, c] = cell;
      const b = this.mk(s.k === 'n' ? s.c : 0, s.k === 'n' ? 'n' : s.k);
      b.born = this.tm;
      this.g[r][c] = b;
      const x = this.cx(r, c), y = this.cy(r);
      // jiggle the neighbours
      for (const [rr, cc] of this.nb(r, c)) {
        const nbb = this.g[rr][cc]; if (!nbb) continue;
        const dx = this.cx(rr, cc) - x, dy = this.cy(rr) - y, L = Math.hypot(dx, dy) || 1;
        nbb.vx += (dx / L) * this.d * 4; nbb.vy += (dy / L) * this.d * 4;
        if (!this.jig.includes(nbb)) this.jig.push(nbb);
      }
      b.vy = -this.d * 2; this.jig.push(b);
      const popped = [];
      const seen = new Set();
      const key = (rr, cc) => rr * 64 + cc;
      const add = (rr, cc, why) => { const k = key(rr, cc); if (seen.has(k) || !this.g[rr][cc]) return; seen.add(k); popped.push([rr, cc, why]); };
      let special = null;
      if (s.k === 'bomb') {
        special = 'bomb';
        this.blast(r, c, 2, add);
      } else {
        if (s.k === 'rainbow') {
          special = 'rainbow';
          let best = -1, bestN = 0;
          const cands = new Set(this.nb(r, c).map(([rr, cc]) => this.g[rr][cc]).filter((q) => this.matchable(q)).map((q) => q.c));
          for (const col of cands) { b.c = col; b.t = 'n'; const n = this.flood(r, c).length; if (n > bestN) { bestN = n; best = col; } }
          b.c = best >= 0 ? best : Math.floor(this.qr() * this.p.colors); b.t = 'n';
        }
        // star next to the landing spot clears every bubble of the shot colour
        const stars = this.nb(r, c).filter(([rr, cc]) => this.g[rr][cc] && this.g[rr][cc].t === 'star');
        if (stars.length) {
          special = 'star';
          stars.forEach(([rr, cc]) => add(rr, cc, 'star'));
          const col = b.c;
          add(r, c, 'star');
          this.each((q, rr, cc) => { if (q.c === col && (q.t === 'n' || q.t === 'ice')) add(rr, cc, 'star'); });
        } else {
          const grp = this.flood(r, c);
          if (grp.length >= 3) grp.forEach(([rr, cc]) => add(rr, cc, 'match'));
        }
      }
      // ripple effects: thaw ice, trigger bombs
      for (let i = 0; i < popped.length; i++) {
        const [pr, pc] = popped[i];
        for (const [rr, cc] of this.nb(pr, pc)) {
          const q = this.g[rr][cc];
          if (!q || seen.has(key(rr, cc))) continue;
          if (q.t === 'ice') { q.t = 'n'; q.thaw = this.tm; this.shards(this.cx(rr, cc), this.cy(rr), '#d8f6ff', 6, this.d * 0.18); this.sfx('ice'); special = special || 'ice'; }
          else if (q.t === 'bomb') { add(rr, cc, 'bomb'); this.blast(rr, cc, 1, add); special = 'bomb'; }
        }
      }
      // pop in BFS order from the landing point
      const now = this.tm;
      popped.forEach(([pr, pc, why], i) => {
        const q = this.g[pr][pc];
        this.g[pr][pc] = null;
        const delay = 0.06 + i * (popped.length > 14 ? 0.022 : 0.04);
        this.pops.push({ b: q, x: this.cx(pr, pc), y: this.cy(pr), t0: now + delay, why, i, done: false });
      });
      const fell = this.dropFloating(false, now + 0.06 + popped.length * 0.03);
      // scoring
      if (popped.length) {
        this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
        const mult = 1 + Math.min(this.combo - 1, 8) * 0.25;
        const pts = Math.round(popped.length * 10 * mult);
        const fpts = Math.round(fell * 20 * (1 + fell / 8));
        this.score += pts + fpts;
        this.o.onEvent('pop', { n: popped.length });
        if (this.combo >= 2) { this.o.onEvent('combo', { n: this.combo }); this.sfx('combo', this.combo); }
        if (this.combo >= 2) this.pop(this.sx, this.sy - this.d * 1.5, `${this.combo} 콤보!`, '#ffe27a', 22 + Math.min(this.combo, 8) * 2);
        const tot = popped.length + fell;
        setTimeout(() => {
          if (this.dead) return;
          this.pop(x, y - this.d * 0.6, '+' + (pts + fpts), COL[Math.max(0, b.c)] ? '#fff3a8' : '#fff', 22 + Math.min(tot, 20));
          if (tot >= 10) { this.banner(tot >= 18 ? '대박 팡팡!' : '멋져요!', 'good'); this.shake(400); }
        }, 250);
        if (fell >= 6) setTimeout(() => !this.dead && this.banner(`우수수 ${fell}개!`, 'good'), 600);
      } else {
        this.combo = 0;
        this.sfx('land');
      }
      if (special) { this.o.onEvent('special', { kind: special }); this.sfx(special); }
      if (special === 'bomb') { this.explode(x, y, 2.2, ['#ffcf40', '#ff5a3c', '#fff']); this.shake(450); this.hitstop = 0.08; }
      if (special === 'star') { this.explode(x, y, 2.6, ['#ffe27a', COL[Math.max(0, b.c)].b, '#fff']); this.banner('별 버블! 한 색 싹쓸이', 'good'); this.hitstop = 0.1; }
      if (popped.length + fell === 0) this.ring(x, y, 'rgba(255,255,255,0.6)', this.d * 0.9, 2);
      // ceiling press
      const settle = Math.max(0.35, 0.1 + popped.length * 0.04 + (fell ? 0.5 : 0));
      this.wait = settle;
      this.state = 'resolve';
    }
    blast(r, c, rad, add) {
      let ring = [[r, c]]; const seen = new Set([r * 64 + c]);
      add(r, c, 'bomb');
      for (let k = 0; k < rad; k++) {
        const nx = [];
        for (const [a, b] of ring) for (const [rr, cc] of this.nb(a, b)) { const kk = rr * 64 + cc; if (seen.has(kk)) continue; seen.add(kk); nx.push([rr, cc]); add(rr, cc, 'bomb'); }
        ring = nx;
      }
    }
    flood(r, c) {
      const b = this.g[r][c]; if (!this.matchable(b)) return [[r, c]];
      const out = [[r, c]], seen = new Set([r * 64 + c]);
      for (let i = 0; i < out.length; i++) {
        for (const [rr, cc] of this.nb(out[i][0], out[i][1])) {
          const k = rr * 64 + cc; if (seen.has(k)) continue;
          const q = this.g[rr][cc];
          if (this.matchable(q) && q.c === b.c) { seen.add(k); out.push([rr, cc]); }
        }
      }
      return out;
    }
    // removes everything not connected to the ceiling; returns the count
    dropFloating(silent, t0) {
      const seen = new Set(), q = [];
      for (let c = 0; c < this.rowLen(0); c++) if (this.g[0][c]) { seen.add(c); q.push([0, c]); }
      for (let i = 0; i < q.length; i++) for (const [rr, cc] of this.nb(q[i][0], q[i][1])) { const k = rr * 64 + cc; if (!seen.has(k) && this.g[rr][cc]) { seen.add(k); q.push([rr, cc]); } }
      let n = 0;
      this.each((b, r, c) => {
        if (seen.has(r * 64 + c)) return;
        this.g[r][c] = null; n++;
        if (silent) return;
        this.fallers.push({ b, x: this.cx(r, c), y: this.cy(r), vx: (Math.random() - 0.5) * this.d * 3, vy: -this.d * (1 + Math.random() * 2.5), rot: 0, vr: (Math.random() - 0.5) * 6, t0: (t0 || this.tm) + Math.random() * 0.12, bounced: 0 });
      });
      if (n && !silent) { this.o.onEvent('drop', { n }); setTimeout(() => !this.dead && this.sfx('fall', n), 120); }
      return n;
    }
    rescue(b, x, y) {
      if (b.cr < 0 || b.saved) return;
      b.saved = true;
      this.critLeft--;
      const slot = this.critTotal - this.critLeft - 1;
      const [tx, ty] = this.slotPos(slot);
      this.flyers.push({ k: b.cr, x0: x, y0: y, x1: tx, y1: ty, t0: this.tm, slot });
      this.o.onEvent('rescue', { n: this.critTotal - this.critLeft });
      this.sfx('rescue', this.critTotal - this.critLeft);
      this.pop(x, y - this.d * 0.4, '구출!', '#9dffcf', 26);
      this.score += 100;
      this.hudUpdate();
    }
    slotPos(i) {
      const n = this.critTotal, sz = this.trayH * 0.82, gap = sz * 1.08;
      const x0 = this.bx + this.d * 0.25 + this.trayH * 2.1;
      return [x0 + i * gap + sz / 2, this.trayY + this.trayH / 2];
    }

    afterResolve() {
      this.hudUpdate();
      this.refreshQueue();
      if (this.critLeft <= 0) { this.finale(); return; }
      // ceiling press
      if (this.p.dropEvery && this.sinceDrop >= this.p.dropEvery) {
        this.sinceDrop = 0; this.drop++;
        this.sfx('press'); this.shake(300); this.banner('천장이 내려와요!', 'bad', 1000);
      }
      if (this.lowest() + this.drop >= this.DANGER) { this.state = 'over'; setTimeout(() => !this.dead && this.lose('danger'), 500); this.banner('버블이 선을 넘었어요!', 'bad'); return; }
      if (this.shots <= 0) { this.state = 'over'; setTimeout(() => !this.dead && this.lose('moves'), 450); return; }
      if (this.shots === 5) this.banner('5발 남았어요!', 'info', 1000);
      this.state = 'aim';
      if (this.aiming && this.aim != null) this.aimPath = this.trace(this.aim);
    }
    lowest() { let m = -1; this.each((b, r) => { if (r > m) m = r; }); return m; }

    finale() {
      this.state = 'finale';
      this.sfx('clear');
      this.banner('모두 구출! 🎉', 'good', 1600);
      this.o.fx.confetti && this.o.fx.confetti(40);
      // everything left rains down as bonus
      let n = 0;
      this.each((b, r, c) => {
        this.g[r][c] = null; n++;
        this.fallers.push({ b, x: this.cx(r, c), y: this.cy(r), vx: (Math.random() - 0.5) * this.d * 3, vy: -this.d * Math.random() * 2, rot: 0, vr: (Math.random() - 0.5) * 6, t0: this.tm + 0.3 + r * 0.05 + Math.random() * 0.2, bounced: 0, bonus: 1 });
      });
      if (n) this.score += n * 10;
      this.fwLeft = this.shots; this.fwNext = this.tm + 1.2; this.fwShots = this.shots;
      this.hudUpdate();
    }
    finish() {
      if (!this.running) return;
      const rows = [];
      if (this.fwShots > 0) rows.push([`남은 ${this.fwShots}발 불꽃놀이`, this.fwShots * this.p.shotCoin]);
      rows.push([`친구 ${this.critTotal}마리 구출`, this.critTotal * this.p.critCoin]);
      this.o.onEvent('clear', { stars: this.stars(), shotsLeft: this.fwShots });
      this.win({ rows, shotsLeft: this.fwShots, maxCombo: this.maxCombo });
    }
    stars() { const par = this.par; return this.score >= par * this.p.starPct[1] ? 3 : this.score >= par * this.p.starPct[0] ? 2 : 1; }

    resume() {
      const why = this.lostWhy;
      this.shots += this.p.extendShots || 5;
      if (this.lowest() + this.drop >= this.DANGER - 1) {
        // push the ceiling back up and clear the lowest rows
        this.drop = Math.max(0, this.drop - 2);
        const lim = this.DANGER - 3 - this.drop;
        this.each((b, r, c) => { if (r > lim) { this.g[r][c] = null; this.pops.push({ b, x: this.cx(r, c), y: this.cy(r), t0: this.tm + 0.1 + c * 0.03, why: 'save', i: 0, done: false }); } });
        this.dropFloating(false, this.tm + 0.2);
      }
      void why;
      this.state = 'aim';
      this.running = true; this.paused = false;
      this.refreshQueue();
      this.banner(`+${this.p.extendShots || 5}발 계속!`, 'good');
      this.hudUpdate();
    }
    lose(reason) { this.lostWhy = reason; super.lose(reason); }

    cheat() {
      if (!this.running) return;
      this.each((b, r, c) => { if (b.cr >= 0 && !b.saved) this.rescue(b, this.cx(r, c), this.cy(r)); });
      this.fwShots = this.shots;
      this.score += this.shots * this.p.fwScore;
      this.finish();
    }

    tool(id, btn) {
      if (this.state !== 'aim' && this.state !== 'fly' && this.state !== 'resolve') return;
      if (id === 'bomb') {
        if (this.cur.k === 'bomb') { this.banner('이미 폭탄 버블이에요', 'info'); return; }
        if (!this.pay(this.p.bombCost, '폭탄 버블에')) return;
        this.cur = { c: 0, k: 'bomb' };
        this.swapT = this.tm;
        this.sfx('tool');
        this.banner('폭탄 버블 장전!', 'good');
        this.o.onEvent('tool', { id });
      } else if (id === 'aim') {
        if (this.longAim) { this.banner('이미 조준선이 길어요', 'info'); return; }
        if (!this.pay(this.p.aimCost, '조준 연장에')) return;
        this.longAim = true;
        if (btn) btn.disabled = true;
        this.sfx('tool');
        this.banner('조준선 연장!', 'good');
        this.o.onEvent('tool', { id });
      }
      if (this.aim != null) this.aimPath = this.trace(this.aim);
    }

    hudUpdate() {
      const s = this.shots;
      this.meter(s / Math.max(this.p.shots, 1), `남은 ${s}발`, s <= 5);
      this.info(`<span>🐥 ${this.critTotal - this.critLeft}/${this.critTotal}</span><span>⭐ ${U.fmt(Math.round(this.score))}</span>`);
    }

    /* ---------- greedy suggestion (used for the beginner hint) ---------- */
    evalAngle(a, shot) {
      const tr = this.trace(a);
      if (!tr.cell) return { v: -1, tr };
      const [r, c] = tr.cell;
      const s = shot || this.cur;
      if (s.k !== 'n') return { v: 1, tr };
      this.g[r][c] = this.mk(s.c, 'n');
      const grp = this.flood(r, c);
      let v = 0;
      if (grp.length >= 3) {
        const rm = new Set(grp.map(([a1, b1]) => a1 * 64 + b1));
        v = grp.length * 2;
        grp.forEach(([a1, b1]) => { if (this.g[a1][b1].cr >= 0) v += 40; });
        // floating after removal
        const seen = new Set(), q = [];
        for (let cc = 0; cc < this.rowLen(0); cc++) if (this.g[0][cc] && !rm.has(cc)) { seen.add(cc); q.push([0, cc]); }
        for (let i = 0; i < q.length; i++) for (const [rr, cc] of this.nb(q[i][0], q[i][1])) { const k = rr * 64 + cc; if (!seen.has(k) && !rm.has(k) && this.g[rr][cc]) { seen.add(k); q.push([rr, cc]); } }
        this.each((b, rr, cc) => { const k = rr * 64 + cc; if (!seen.has(k) && !rm.has(k)) { v += 3; if (b.cr >= 0) v += 40; } });
      } else {
        v = grp.length * 0.6 - r * 0.02;
      }
      this.g[r][c] = null;
      return { v, tr };
    }
    bestAngle() {
      let best = null;
      for (let i = 0; i <= 90; i++) {
        const a = MIN_A + (Math.PI - 2 * MIN_A) * (i / 90);
        const e = this.evalAngle(a);
        if (!best || e.v > best.v) best = { v: e.v, a, cell: e.tr.cell };
      }
      return best;
    }

    /* ---------- loop ---------- */
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.15; }
      this.tm += dt;
      const d = this.d;
      if (!d) return;
      this.dropV += (this.drop - this.dropV) * Math.min(1, dt * 8);
      this.recoil = Math.max(0, this.recoil - dt * 4);
      if (this.state === 'aim') {
        this.idle += dt;
        if (this.p.hintAim && this.idle > 3.5 && !this.hint && !this.aiming) this.hint = this.bestAngle();
      }
      // flying shot
      if (this.state === 'fly' && this.fly) {
        const f = this.fly, pts = f.tr.pts;
        f.dist += dt * d * 24;
        let rem = f.dist, i = 0;
        for (; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (rem <= L) break; rem -= L; }
        if (i >= pts.length - 1) {
          const cell = f.tr.cell; this.fly = null;
          if (this.g[cell[0]][cell[1]]) { const s2 = this.snap(pts[pts.length - 1][0], pts[pts.length - 1][1]); this.land(f.s, s2 || cell); } else this.land(f.s, cell);
        } else {
          const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) || 1, u = rem / L;
          if (f.seg !== i && i > 0) { f.seg = i; this.sfx('bounce'); }
          f.x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; f.y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
        }
      }
      if (this.state === 'resolve') { this.wait -= dt; if (this.wait <= 0 && !this.pops.some((p) => !p.done)) this.afterResolve(); }
      // pops
      for (const p of this.pops) {
        if (!p.done && this.tm >= p.t0) {
          p.done = true;
          const col = p.b.t === 'stone' ? '#b8b0cc' : p.b.c >= 0 && COL[p.b.c] ? COL[p.b.c].b : '#ffcf40';
          this.burst(p.x, p.y, col, p.why === 'match' ? 10 : 14, 0.8);
          this.shards(p.x, p.y, col, 4, d * 0.16);
          this.chain = p.i;
          if (this.tm - this.lastPopSfx > 0.035) { this.lastPopSfx = this.tm; this.sfx('pop', p.i + this.combo); }
          if (p.b.cr >= 0) this.rescue(p.b, p.x, p.y);
        }
      }
      this.pops = this.pops.filter((p) => !p.done || this.tm - p.t0 < 0.18);
      // fallers
      const floor = this.botY - d * 0.3;
      for (const f of this.fallers) {
        if (this.tm < f.t0) continue;
        f.vy += d * 30 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
        if (f.x < this.bx + d / 2) { f.x = this.bx + d / 2; f.vx = Math.abs(f.vx) * 0.6; }
        if (f.x > this.bx + this.bw - d / 2) { f.x = this.bx + this.bw - d / 2; f.vx = -Math.abs(f.vx) * 0.6; }
        if (f.b.cr >= 0 && !f.b.saved && f.y > this.lineY - d) this.rescue(f.b, f.x, f.y);
        if (f.y > floor) {
          f.gone = true;
          const col = f.b.c >= 0 && COL[f.b.c] ? COL[f.b.c].b : '#c8c0da';
          this.burst(f.x, floor, col, 8, 0.7);
          if (f.b.cr >= 0 && !f.b.saved) this.rescue(f.b, f.x, f.y);
          this.pop(f.x, floor - d * 0.3, f.bonus ? '+10' : '+20', '#ffe9a8', 15);
          if (this.tm - this.lastPopSfx > 0.05) { this.lastPopSfx = this.tm; this.sfx('plop'); }
        }
      }
      this.fallers = this.fallers.filter((f) => !f.gone);
      // jiggle springs
      for (const b of this.jig) {
        b.vx += (-b.jx * 260 - b.vx * 14) * dt; b.vy += (-b.jy * 260 - b.vy * 14) * dt;
        b.jx += b.vx * dt; b.jy += b.vy * dt;
        if (Math.abs(b.jx) + Math.abs(b.jy) + (Math.abs(b.vx) + Math.abs(b.vy)) * 0.02 < 0.05) { b.jx = b.jy = b.vx = b.vy = 0; b.still = true; } else b.still = false;
      }
      this.jig = this.jig.filter((b) => !b.still);
      // rescued critters
      for (const f of this.flyers) if (!f.landed && this.tm - f.t0 > 0.9) { f.landed = true; this.burst(f.x1, f.y1, '#9dffcf', 12, 0.6); this.sfx('slot'); }
      // finale fireworks
      if (this.state === 'finale') {
        if (this.fwLeft > 0 && this.tm >= this.fwNext) {
          const batch = this.fwLeft > 16 ? Math.ceil(this.fwLeft / 12) : 1;
          for (let k = 0; k < batch; k++) {
            this.fwLeft--;
            const ci = Math.floor(Math.random() * COL.length);
            this.rockets.push({ x: this.sx, y: this.sy, vx: (Math.random() - 0.5) * d * 8, vy: -d * (16 + Math.random() * 5), ty: this.oy + d * (1 + Math.random() * 6), c: ci });
          }
          this.shots = this.fwLeft;
          this.fwNext = this.tm + 0.2;
          this.sfx('launch');
          this.hudUpdate();
        }
        for (const r of this.rockets) {
          r.x += r.vx * dt; r.y += r.vy * dt; r.vy += d * 6 * dt;
          if (r.y <= r.ty || r.vy > 0) {
            r.gone = true;
            const [px, py] = this.page(r.x, r.y);
            this.o.fx.firework ? this.o.fx.firework(px, py, COL[r.c].b) : this.burst(r.x, r.y, COL[r.c].b, 30, 1.2);
            this.score += this.p.fwScore;
            this.pop(r.x, r.y, '+' + this.p.fwScore, COL[r.c].h, 20);
            this.sfx('boom');
            this.hudUpdate();
          }
        }
        this.rockets = this.rockets.filter((r) => !r.gone);
        if (this.fwLeft <= 0 && !this.rockets.length && !this.fallers.length && !this.flyers.some((f) => !f.landed)) { this.state = 'done'; this.finish(); }
      }
    }

    /* ---------- drawing ---------- */
    draw(t) {
      const g = this.ctx, d = this.d;
      if (!this.W || !d) return;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      const th = this.th, bx = this.bx, bw = this.bw;
      const drop = this.dropV;
      // glass panel
      const px = bx - d * 0.22, py = this.trayY - 2, pw = bw + d * 0.44, ph = this.botY - py;
      util.rr(g, px, py, pw, ph, d * 0.45);
      const pg = g.createLinearGradient(0, py, 0, py + ph);
      pg.addColorStop(0, 'rgba(20,8,44,0.84)'); pg.addColorStop(0.7, 'rgba(12,5,30,0.86)'); pg.addColorStop(1, 'rgba(36,10,56,0.9)');
      g.fillStyle = pg; g.fill();
      g.strokeStyle = U.rgba(th.accent, 0.55); g.lineWidth = 2; g.stroke();
      util.rr(g, px + 3, py + 3, pw - 6, ph - 6, d * 0.4); g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1; g.stroke();
      // tray (rescue progress + score stars)
      this.drawTray(g, t);
      // ceiling press plate
      const cyTop = this.oy + drop * this.rh;
      if (drop > 0.01) {
        const pg2 = g.createLinearGradient(0, this.oy, 0, cyTop);
        pg2.addColorStop(0, 'rgba(60,30,90,0.9)'); pg2.addColorStop(1, 'rgba(110,60,150,0.95)');
        g.fillStyle = pg2; g.fillRect(bx, this.oy - 2, bw, cyTop - this.oy + 2);
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
        for (let x = bx - (cyTop % 16); x < bx + bw; x += 16) { g.beginPath(); g.moveTo(x, this.oy); g.lineTo(x + 10, cyTop); g.stroke(); }
      }
      // ceiling rail
      const rg = g.createLinearGradient(0, cyTop - 7, 0, cyTop + 3);
      rg.addColorStop(0, '#fff6c8'); rg.addColorStop(0.5, th.accent); rg.addColorStop(1, U.shade(th.accent, -0.5));
      util.rr(g, bx - 4, cyTop - 7, bw + 8, 9, 4); g.fillStyle = rg; g.fill();
      // danger line
      const nearDanger = this.lowest() + this.drop >= this.DANGER - 2;
      g.save();
      g.setLineDash([d * 0.22, d * 0.16]); g.lineDashOffset = -t * 20;
      g.strokeStyle = nearDanger ? `rgba(255,70,100,${0.6 + 0.4 * Math.sin(t * 8)})` : 'rgba(255,120,150,0.35)';
      g.lineWidth = nearDanger ? 3 : 2;
      g.beginPath(); g.moveTo(bx, this.lineY); g.lineTo(bx + bw, this.lineY); g.stroke();
      g.restore();
      // grid
      const hl = this.o.stage <= 3;
      for (let r = 0; r < this.g.length; r++) {
        const row = this.g[r]; const y = this.cy(r, drop);
        for (let c = 0; c < row.length; c++) {
          const b = row[c]; if (!b) continue;
          let x = this.cx(r, c) + b.jx, yy = y + b.jy;
          let s = 1 + Math.sin(t * 2.2 + b.ph) * 0.018;
          if (b.born) { const u = (this.tm - b.born) / 0.25; if (u < 1) s *= 0.85 + 0.15 * U.easeOutBack(Math.max(0, u), 2.5); else b.born = 0; }
          if (b.cr >= 0) {
            // rescue target glow
            g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4 + b.ph);
            const gs = d * (hl ? 2.2 : 1.7); g.drawImage(root.FxSprites.glow('#9dffcf'), x - gs / 2, yy - gs / 2, gs, gs); g.restore();
          }
          if (b.t === 'star') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); const gs = d * 1.8; g.drawImage(root.FxSprites.glow('#ffd23f'), x - gs / 2, yy - gs / 2, gs, gs); g.restore(); }
          this.blit(g, this.bubbleSpr(b), x, yy, s, b.cr >= 0 ? Math.sin(t * 3 + b.ph) * 0.08 : 0);
          if (b.t === 'bomb') this.spark(g, x, yy - d * 0.5, t);
          if (b.thaw && this.tm - b.thaw < 0.4) { g.globalAlpha = 1 - (this.tm - b.thaw) / 0.4; this.blit(g, this.bubbleSpr({ t: 'ice', c: b.c, cr: b.cr }), x, yy, 1 + (this.tm - b.thaw)); g.globalAlpha = 1; }
        }
      }
      // help bubble on the first critter (early stages)
      if (hl && this.fired < 3 && this.state === 'aim') {
        let tgt = null; this.each((b, r, c) => { if (!tgt && b.cr >= 0) tgt = [this.cx(r, c), this.cy(r, drop)]; });
        if (tgt) this.speech(g, tgt[0], tgt[1] - d * 0.55, '구해줘!', t);
      }
      // popping bubbles
      for (const p of this.pops) {
        if (!p.done) { this.blit(g, this.bubbleSpr(p.b), p.x, p.y + (this.dropV - this.drop) * this.rh, 1 + Math.sin(t * 40) * 0.04); continue; }
        const u = (this.tm - p.t0) / 0.18;
        g.globalAlpha = Math.max(0, 1 - u);
        this.blit(g, this.bubbleSpr(p.b), p.x, p.y, 1 + u * 0.5);
        g.globalAlpha = 1;
      }
      // aim line / hint
      if (this.state === 'aim') {
        if (this.aim != null && this.aimPath) this.drawAim(g, this.aimPath, t, this.cur);
        else if (this.hint && this.hint.cell) this.drawHint(g, t);
      }
      // falling bubbles
      for (const f of this.fallers) {
        this.blit(g, this.bubbleSpr(f.b), f.x, f.y, 1, f.rot);
      }
      // flying shot
      if (this.fly && this.fly.x != null) {
        const f = this.fly;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6;
        const gs = d * 1.6; g.drawImage(root.FxSprites.glow(this.shotCol(f.s)), f.x - gs / 2, f.y - gs / 2, gs, gs); g.restore();
        this.blit(g, this.shotSpr(f.s), f.x, f.y, 1);
      }
      // rockets
      for (const r of this.rockets) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const gs = d * 1.2; g.drawImage(root.FxSprites.glow(COL[r.c].b), r.x - gs / 2, r.y - gs / 2, gs, gs);
        g.strokeStyle = U.rgba(COL[r.c].h, 0.7); g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x - r.vx * 0.05, r.y - r.vy * 0.05); g.stroke();
        g.restore();
        this.blit(g, this.bubbleSpr({ t: 'n', c: r.c, cr: -1 }), r.x, r.y, 0.45);
      }
      // launcher
      this.drawLauncher(g, t);
      // rescued critters flying to the tray
      for (const f of this.flyers) {
        if (f.landed) continue;
        const u = U.clamp((this.tm - f.t0) / 0.9, 0, 1), e = U.easeInOutCubic(u);
        const x = U.lerp(f.x0, f.x1, e), y = U.lerp(f.y0, f.y1, e) - Math.sin(u * Math.PI) * d * 2;
        g.save(); g.translate(x, y); g.rotate(Math.sin(u * 12) * 0.3); critter(g, f.k, d * (0.42 - u * 0.1), false); g.restore();
      }
    }
    blit(g, cv, x, y, s, rot) {
      const w = (cv.width / this.dpr) * s;
      if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(cv, -w / 2, -w / 2, w, w); g.restore(); }
      else g.drawImage(cv, x - w / 2, y - w / 2, w, w);
    }
    spark(g, x, y, t) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const s = this.d * (0.45 + 0.15 * Math.sin(t * 30));
      g.drawImage(root.FxSprites.glow('#ffb43c'), x - s / 2, y - s / 2, s, s);
      g.restore();
    }
    speech(g, x, y, txt, t) {
      const d = this.d, bob = Math.sin(t * 4) * 3;
      g.save();
      g.font = `900 ${Math.round(d * 0.32)}px "Noto Sans KR", sans-serif`;
      const w = g.measureText(txt).width + d * 0.4, h = d * 0.5;
      const yy = y - h - d * 0.1 + bob;
      util.rr(g, x - w / 2, yy, w, h, h / 2); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.moveTo(x - 5, yy + h - 1); g.lineTo(x + 5, yy + h - 1); g.lineTo(x, yy + h + 7); g.fill();
      g.fillStyle = '#e0306a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, yy + h / 2 + 1);
      g.restore();
    }
    drawAim(g, tr, t, shot) {
      const d = this.d;
      const maxLen = this.longAim ? 99 * d : this.p.aim * d;
      const col = shot.k === 'n' ? COL[shot.c].h : shot.k === 'bomb' ? '#ffd27a' : '#ffffff';
      const gap = d * 0.42;
      let off = (t * d * 1.6) % gap, acc = 0, shown = 0, bounces = 0;
      const pts = tr.pts;
      let reached = true;
      g.save();
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const L = Math.hypot(x1 - x0, y1 - y0);
        if (i > 0) bounces++;
        if (bounces > 1 && !this.longAim) { reached = false; break; }
        for (let s = off; s < L; s += gap) {
          const tot = acc + s;
          if (tot > maxLen) { reached = false; break; }
          if (tot < d * 0.6) continue;
          const fade = 1 - (tot / maxLen) * 0.6;
          const x = x0 + ((x1 - x0) * s) / L, y = y0 + ((y1 - y0) * s) / L;
          g.globalAlpha = fade;
          g.fillStyle = col; g.beginPath(); g.arc(x, y, d * 0.1, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - d * 0.025, y - d * 0.025, d * 0.04, 0, TAU); g.fill();
          shown++;
        }
        if (!reached) break;
        off = (off - L % gap + gap) % gap; if (off === 0) off = gap;
        acc += L;
        if (acc > maxLen) { reached = false; break; }
      }
      g.globalAlpha = 1;
      if (reached && tr.cell) {
        const [r, c] = tr.cell, x = this.cx(r, c), y = this.cy(r);
        g.setLineDash([d * 0.14, d * 0.1]); g.lineDashOffset = -t * 30;
        g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, d * 0.44, 0, TAU); g.stroke();
        g.setLineDash([]);
        g.globalAlpha = 0.35; this.blit(g, this.shotSpr(shot), x, y, 0.9); g.globalAlpha = 1;
      }
      g.restore();
      void shown;
    }
    drawHint(g, t) {
      const h = this.hint, d = this.d;
      const [r, c] = h.cell, x = this.cx(r, c), y = this.cy(r);
      const u = (t * 0.7) % 1;
      g.save();
      g.strokeStyle = `rgba(157,255,207,${1 - u})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, d * (0.45 + u * 0.5), 0, TAU); g.stroke();
      // finger swiping from the launcher toward the target direction
      const a = h.a, k = U.easeInOutCubic((t * 0.6) % 1);
      const fx = this.sx + Math.cos(a) * d * (1.2 + k * 2.2), fy = this.sy - Math.sin(a) * d * (1.2 + k * 2.2);
      g.globalAlpha = 0.9;
      g.font = `${Math.round(d * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('👆', fx, fy);
      g.restore();
      g.save();
      g.font = `800 ${Math.round(d * 0.3)}px "Noto Sans KR", sans-serif`; g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.shadowColor = '#000'; g.shadowBlur = 6;
      g.fillText('드래그해서 조준 · 손을 떼면 발사!', this.sx, this.lineY - d * 0.25);
      g.restore();
    }
    drawTray(g, t) {
      const d = this.d, y = this.trayY, h = this.trayH, x0 = this.bx + d * 0.1;
      // label
      g.save();
      g.font = `900 ${Math.round(h * 0.34)}px "Noto Sans KR", sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#9dffcf'; g.fillText('구출', x0, y + h * 0.33);
      g.fillStyle = '#fff'; g.font = `800 ${Math.round(h * 0.32)}px Oxanium, sans-serif`;
      g.fillText(`${this.critTotal - this.critLeft}/${this.critTotal}`, x0, y + h * 0.72);
      // slots
      const landed = this.flyers.filter((f) => f.landed).length;
      for (let i = 0; i < this.critTotal; i++) {
        const [sx, sy] = this.slotPos(i), r = h * 0.4;
        g.beginPath(); g.arc(sx, sy, r, 0, TAU);
        g.fillStyle = i < landed ? 'rgba(157,255,207,0.22)' : 'rgba(0,0,0,0.35)'; g.fill();
        g.strokeStyle = i < landed ? '#9dffcf' : 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.stroke();
        if (i < landed) {
          const f = this.flyers.find((q) => q.slot === i);
          g.save(); g.translate(sx, sy + Math.sin(t * 5 + i) * 1.5); critter(g, f ? f.k : 0, r * 0.8, Math.sin(t * 1.3 + i * 2) > 0.97); g.restore();
        } else {
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.font = `900 ${Math.round(r)}px sans-serif`; g.textAlign = 'center'; g.fillText('?', sx, sy + 1);
        }
      }
      // score + stars progress
      const bw = Math.min(d * 2.6, this.bw * 0.32), bx2 = this.bx + this.bw - bw - d * 0.1, by = y + h * 0.62;
      g.textAlign = 'right'; g.fillStyle = '#ffe27a'; g.font = `800 ${Math.round(h * 0.36)}px Oxanium, sans-serif`;
      g.fillText(U.fmt(Math.round(this.score)), bx2 + bw, y + h * 0.27);
      util.rr(g, bx2, by - 4, bw, 8, 4); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
      const s3 = this.par * this.p.starPct[1], fr = U.clamp(this.score / s3, 0, 1);
      if (fr > 0) { util.rr(g, bx2, by - 4, Math.max(8, bw * fr), 8, 4); const sg = g.createLinearGradient(bx2, 0, bx2 + bw, 0); sg.addColorStop(0, this.th.accent); sg.addColorStop(1, '#ffe27a'); g.fillStyle = sg; g.fill(); }
      const marks = [this.p.starPct[0] / this.p.starPct[1], 1];
      g.font = `${Math.round(h * 0.34)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center';
      marks.forEach((m, i) => { g.globalAlpha = fr >= m ? 1 : 0.35; g.fillText('⭐', bx2 + bw * m - (i ? h * 0.15 : 0), by + 1); });
      g.globalAlpha = 1;
      g.restore();
    }
    drawLauncher(g, t) {
      const d = this.d, sx = this.sx, sy = this.sy;
      const aim = this.aim != null ? this.aim : this.hint ? this.hint.a : Math.PI / 2;
      const ax = Math.cos(aim), ay = -Math.sin(aim);
      // launcher ring
      g.save();
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 + 0.15 * Math.sin(t * 3);
      const gs = d * 1.9; g.drawImage(root.FxSprites.glow(this.shotCol(this.cur)), sx - gs / 2, sy - gs / 2, gs, gs);
      g.restore();
      // dragon body
      const rec = this.recoil, sq = 1 + rec * 0.12, by = sy + d * 1.12 + rec * d * 0.12;
      const sad = this.shots <= 3 && this.state === 'aim';
      g.save(); g.translate(sx, by); g.scale(sq, 1 / sq);
      // tail
      g.fillStyle = '#4fcf98'; g.beginPath(); g.moveTo(d * 0.6, d * 0.45); g.quadraticCurveTo(d * 1.5, d * 0.5, d * 1.35, -d * 0.1 + Math.sin(t * 3) * d * 0.08); g.quadraticCurveTo(d * 1.2, d * 0.3, d * 0.55, d * 0.2); g.fill();
      g.fillStyle = '#ff8fc0'; starPath(g, d * 1.36, -d * 0.12 + Math.sin(t * 3) * d * 0.08, d * 0.16, d * 0.07, 4); g.fill();
      // wings
      const wf = Math.sin(t * (this.state === 'finale' ? 18 : 5)) * 0.25;
      for (const s of [-1, 1]) {
        g.save(); g.translate(s * d * 0.7, -d * 0.15); g.rotate(s * (0.4 + wf)); g.scale(s, 1);
        g.fillStyle = '#ffb3d6'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 0.55, -d * 0.6, d * 0.6, -d * 0.05); g.quadraticCurveTo(d * 0.35, -d * 0.1, d * 0.3, d * 0.15); g.closePath(); g.fill();
        g.strokeStyle = '#e86aa6'; g.lineWidth = 1.5; g.stroke();
        g.restore();
      }
      // body
      const bgr = g.createRadialGradient(-d * 0.3, -d * 0.4, d * 0.1, 0, 0, d * 1.0);
      bgr.addColorStop(0, '#c9ffe6'); bgr.addColorStop(0.45, '#6fe0ad'); bgr.addColorStop(1, '#249f6c');
      g.fillStyle = bgr; g.beginPath(); g.ellipse(0, 0, d * 0.88, d * 0.78, 0, 0, TAU); g.fill();
      g.strokeStyle = '#1d7d55'; g.lineWidth = 2; g.stroke();
      // belly
      g.fillStyle = '#fff4d6'; g.beginPath(); g.ellipse(0, d * 0.38, d * 0.5, d * 0.32, 0, 0, TAU); g.fill();
      // horns
      for (const s of [-1, 1]) { g.fillStyle = '#ffe9a0'; g.beginPath(); g.moveTo(s * d * 0.35, -d * 0.66); g.quadraticCurveTo(s * d * 0.52, -d * 1.05, s * d * 0.6, -d * 0.95); g.quadraticCurveTo(s * d * 0.55, -d * 0.7, s * d * 0.58, -d * 0.55); g.fill(); }
      // eyes looking at the aim
      const blink = (t % 3.7) < 0.12;
      for (const s of [-1, 1]) {
        const ex = s * d * 0.32, ey = -d * 0.18;
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, d * 0.2, d * 0.23, 0, 0, TAU); g.fill();
        if (blink) { g.strokeStyle = '#1b2a3a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ex - d * 0.14, ey); g.lineTo(ex + d * 0.14, ey); g.stroke(); continue; }
        const pxo = ax * d * 0.07, pyo = ay * d * 0.07;
        g.fillStyle = '#1b2a3a'; g.beginPath(); g.ellipse(ex + pxo, ey + pyo, d * 0.13, d * 0.16, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + pxo - d * 0.04, ey + pyo - d * 0.06, d * 0.055, 0, TAU); g.fill();
        g.beginPath(); g.arc(ex + pxo + d * 0.04, ey + pyo + d * 0.05, d * 0.025, 0, TAU); g.fill();
        if (sad) { g.strokeStyle = '#1b2a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - s * d * 0.18, ey - d * 0.32); g.lineTo(ex + s * d * 0.05, ey - d * 0.25); g.stroke(); }
      }
      g.fillStyle = 'rgba(255,110,150,0.55)';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * d * 0.56, d * 0.06, d * 0.13, d * 0.07, 0, 0, TAU); g.fill(); }
      // mouth
      g.strokeStyle = '#1b2a3a'; g.lineWidth = 2; g.lineCap = 'round';
      if (rec > 0.2 || this.state === 'finale') { g.fillStyle = '#c2365f'; g.beginPath(); g.ellipse(0, d * 0.1, d * 0.1, d * 0.09 + rec * d * 0.05, 0, 0, TAU); g.fill(); }
      else if (sad) { g.beginPath(); g.arc(0, d * 0.2, d * 0.08, Math.PI + 0.4, -0.4); g.stroke(); }
      else { g.beginPath(); g.arc(-d * 0.06, d * 0.05, d * 0.06, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(d * 0.06, d * 0.05, d * 0.06, 0.2, Math.PI - 0.2); g.stroke(); }
      // nostrils
      g.fillStyle = '#1d7d55'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * d * 0.05, -d * 0.02, d * 0.02, 0, TAU); g.fill(); }
      g.restore();
      // little hands holding the bubble
      for (const s of [-1, 1]) { g.fillStyle = '#6fe0ad'; g.strokeStyle = '#1d7d55'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx + s * d * 0.46, sy + d * 0.3 + rec * d * 0.1, d * 0.14, 0, TAU); g.fill(); g.stroke(); }
      // current bubble
      if (this.state !== 'over' && this.state !== 'done' && this.cur) {
        const su = U.clamp((this.tm - this.swapT) / 0.3, 0, 1);
        const sc = 0.6 + 0.4 * U.easeOutBack(su, 2), yb = sy + Math.sin(t * 3) * 2 + rec * d * 0.25;
        this.blit(g, this.shotSpr(this.cur), sx, yb, sc);
        if (this.cur.k === 'bomb') this.spark(g, sx, yb - d * 0.5, t);
      }
      // next bubble
      const nx = sx - d * 2.0, ny = sy + d * 0.95;
      g.save();
      g.beginPath(); g.ellipse(nx, ny + d * 0.32, d * 0.48, d * 0.14, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
      g.font = `800 ${Math.round(d * 0.24)}px "Noto Sans KR", sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillText('다음', nx, ny + d * 0.72);
      g.restore();
      if (this.next && this.state !== 'done') this.blit(g, this.shotSpr(this.next), nx, ny + Math.sin(t * 2.4 + 1) * 1.5, 0.72);
      // swap arrow
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2; g.beginPath(); g.arc(sx - d * 1.0, sy + d * 0.45, d * 0.45, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
      g.restore();
      // shots badge
      const bxx = sx + d * 2.0, byy = sy + d * 0.95, warn = this.shots <= 5;
      g.save();
      const R = d * 0.5;
      const bg2 = g.createRadialGradient(bxx - R * 0.3, byy - R * 0.4, R * 0.1, bxx, byy, R);
      bg2.addColorStop(0, warn ? '#ffb3b3' : '#fff2b0'); bg2.addColorStop(1, warn ? '#d0203f' : '#e58a00');
      g.fillStyle = bg2; g.beginPath(); g.arc(bxx, byy, R * (warn ? 1 + Math.sin(t * 8) * 0.05 : 1), 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = `900 ${Math.round(d * 0.46)}px Oxanium, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 4;
      g.fillText(String(Math.max(0, this.shots)), bxx, byy + 1);
      g.shadowBlur = 0;
      g.font = `800 ${Math.round(d * 0.24)}px "Noto Sans KR", sans-serif`; g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillText('남은 발', bxx, byy + d * 0.78);
      g.restore();
    }

    /* ---------- sound ---------- */
    sfx(k, n) {
      const K = A && A.kit;
      if (!K || !K.ok()) return;
      const t = K.now();
      n = n || 0;
      switch (k) {
        case 'shoot': K.tone('sine', 300, 900, t, 0.12, 0.25); K.noise(t, 0.12, 0.12, 'bandpass', 1200, 1.5, { sweep: 4000 }); K.play('pluck', K.note(4, 1), t, 0.08, 0.2); break;
        case 'bounce': K.tone('sine', 900, 700, t, 0.05, 0.12); break;
        case 'land': K.play('marimba', K.note(0, 0), t, 0.12, 0.3); K.tone('sine', 220, 120, t, 0.1, 0.25); break;
        case 'pop': { const i = Math.min(n, 14); K.tone('sine', 500 + i * 60, 1400 + i * 120, t, 0.06, 0.22); K.play('celesta', K.note(i + 2, 1), t + 0.01, 0.12, 0.22); K.noise(t, 0.04, 0.1, 'highpass', 4000, 0.7); break; }
        case 'plop': K.tone('sine', 700, 260, t, 0.08, 0.16); break;
        case 'fall': K.tone('sine', 1200, 300, t, 0.35, 0.12); for (let i = 0; i < Math.min(4, n); i++) K.play('marimba', K.note(7 - i, 1), t + i * 0.06, 0.1, 0.18); break;
        case 'combo': for (let i = 0; i < 3; i++) K.play('bell', K.note(Math.min(n, 10) + i * 2, 1), t + i * 0.06, 0.3, 0.2, K.rv(0.4)); break;
        case 'bomb': K.noise(t, 0.5, 0.5, 'lowpass', 900, 0.8); K.tone('sine', 140, 35, t, 0.45, 0.55); K.tone('square', 90, 40, t, 0.2, 0.08); break;
        case 'star': for (let i = 0; i < 8; i++) K.play('celesta', K.note(i * 2, 1), t + i * 0.04, 0.2, 0.22); K.noise(t, 0.5, 0.12, 'bandpass', 2000, 1, { sweep: 9000 }); break;
        case 'rainbow': for (let i = 0; i < 6; i++) K.play('harp', K.note(i * 2 + 1, 1), t + i * 0.035, 0.25, 0.22); break;
        case 'ice': K.noise(t, 0.12, 0.25, 'highpass', 5000, 1); K.play('bell', K.note(9, 1), t, 0.2, 0.15); break;
        case 'rescue': [0, 2, 4, 7].forEach((s, i) => K.play('musicbox', K.note(s + n, 1), t + i * 0.07, 0.3, 0.28)); K.tone('sine', 1800, 2600, t + 0.3, 0.12, 0.08); break;
        case 'slot': K.play('bell', K.note(7, 1), t, 0.25, 0.2); break;
        case 'swap': K.play('pluck', K.note(2, 1), t, 0.06, 0.2); K.play('pluck', K.note(4, 1), t + 0.06, 0.06, 0.2); break;
        case 'press': K.tone('sine', 110, 55, t, 0.4, 0.5); K.noise(t, 0.4, 0.25, 'lowpass', 400, 1); break;
        case 'tool': [0, 4, 7, 11].forEach((s, i) => K.play('celesta', K.note(s, 1), t + i * 0.05, 0.2, 0.25)); break;
        case 'clear': [0, 2, 4, 7, 9, 11].forEach((s, i) => K.play('bell', K.note(s, 1), t + i * 0.07, 0.4, 0.25, K.rv(0.5))); break;
        case 'launch': K.noise(t, 0.3, 0.12, 'bandpass', 600, 1, { sweep: 4000, attack: 0.1 }); break;
        case 'boom': K.noise(t, 0.4, 0.22, 'lowpass', 1800, 0.8); K.tone('sine', 120, 50, t, 0.3, 0.3); K.play('celesta', K.note(5 + Math.floor(Math.random() * 6), 2), t + 0.05, 0.3, 0.15); break;
      }
    }
  }

  root.QuestGames.bubble = Bubble;
})(window);
