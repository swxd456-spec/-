/* 슈팅 스타 새총 (sling): Angry-Birds style slingshot game.
   Contains its own compact 2D rigid-body engine (circles + rotated boxes, SAT/clipping contacts,
   sequential impulses with warm starting, friction, restitution, speculative contacts, sleeping),
   seeded procedural levels (towers / bunkers / pyramids / stacks on optional rock pedestals),
   materials that crack and shatter, and three special critters (split, dash, bomb). */
(function (root) {
  const { Base, util } = root.QuestGames; const U = root.U, A = root.SlotAudio;
  const TAU = Math.PI * 2;

  /* ============================== config ============================== */
  const DEFAULTS = {
    입장료: 100, 클리어보상: 300, 발추가_가격: 120, 발추가_수: 2, 조준선_가격: 60,
    남은발_보상: 30, 연쇄_보상: 8,
    난이도_간격: 32,
    구조물_시작: 1, 구조물_최대: 4,
    층수_시작: 1, 층수_최대: 4,
    미니언_시작: 2, 미니언_최대: 8,
    미니언당_발_시작: 1.0, 미니언당_발_최소: 0.7,
    여유발_시작: 2, 여유발_최소: 1,
    유리_확률_시작: 45, 유리_확률_끝: 20,
    돌_확률_시작: 0, 돌_확률_끝: 30,
    받침대_확률_끝: 50,
    미니언_체력_시작: 1, 미니언_체력_끝: 2,
    큰미니언_확률_끝: 35,
    조준선_무료판: 3,
    분열새_시작판: 3, 돌진새_시작판: 6, 폭탄새_시작판: 10,
    별2_파괴율: 30, 별3_파괴율: 55,
  };

  /* ============================== physics ============================== */
  const GRAV = 20, DT = 1 / 120, ITER = 7, SLOP = 0.008, BAUM = 0.22;
  const MAT = {
    wood: { d: 1.0, hp: 8.5, f: 0.65, e: 0.06, pts: 400 },
    glass: { d: 0.8, hp: 3.2, f: 0.3, e: 0.08, pts: 250 },
    stone: { d: 2.4, hp: 24, f: 0.8, e: 0.04, pts: 700 },
    rock: { d: 0, hp: 1e9, f: 0.9, e: 0.04, pts: 0 },
    minion: { d: 0.8, hp: 2.4, f: 0.7, e: 0.15, pts: 5000 },
    bird: { d: 4, hp: 1e9, f: 0.55, e: 0.28, pts: 0 },
  };
  const BIRDS = {
    normal: { r: 0.45, d: 4, col: '#ff4f7b', name: '별똥새', mul: { glass: 1.25, wood: 1, stone: 0.7, minion: 1.7 } },
    split: { r: 0.42, d: 4, col: '#3fb6ff', name: '삼둥이별', mul: { glass: 2.6, wood: 0.75, stone: 0.45, minion: 1.7 } },
    dash: { r: 0.43, d: 4.4, col: '#ffc21f', name: '번개별', mul: { glass: 1.1, wood: 2.4, stone: 0.85, minion: 1.7 } },
    bomb: { r: 0.55, d: 4, col: '#7a5cff', name: '펑펑별', mul: { glass: 1, wood: 1, stone: 1.1, minion: 1.7 } },
  };
  const REST_X = 0, REST_Y = -2.35, MAX_PULL = 1.9, VMAX = 26;

  let BID = 1;
  function mkBody(o) {
    const b = {
      id: BID++, shape: o.shape, x: o.x, y: o.y, a: o.a || 0, vx: 0, vy: 0, w: 0, hw: o.hw || 0, hh: o.hh || 0, r: o.r || 0,
      mat: o.mat, kind: o.kind, dead: false, sleep: false, st: 0, touch: 0, hp: 1, maxHp: 1, c: 1, s: 0, hurtT: -9,
    };
    const d = o.d != null ? o.d : MAT[o.mat].d;
    if (b.shape === 'b') { b.bound = Math.hypot(b.hw, b.hh); b.mass = 4 * b.hw * b.hh * d; b.I = (b.mass * (4 * b.hw * b.hw + 4 * b.hh * b.hh)) / 12; }
    else { b.bound = b.r; b.mass = Math.PI * b.r * b.r * d; b.I = 0.5 * b.mass * b.r * b.r; }
    b.im0 = b.mass > 0 ? 1 / b.mass : 0; b.iI0 = b.I > 0 ? 1 / b.I : 0; b.im = b.im0; b.iI = b.iI0;
    b.f = MAT[o.mat].f; b.e = MAT[o.mat].e;
    b.c = Math.cos(b.a); b.s = Math.sin(b.a);
    return b;
  }
  const mkC = () => ({ x: 0, y: 0, nx: 0, ny: 0, sep: 0, Pn: 0, Pt: 0, mn: 0, mt: 0, bias: 0, r1x: 0, r1y: 0, r2x: 0, r2y: 0, vn: 0 });
  const T = [mkC(), mkC(), mkC(), mkC()];
  const CL1 = [0, 0, 0, 0], CL2 = [0, 0, 0, 0], IE = [0, 0, 0, 0];

  // circle vs circle
  function ccc(A, B, out, m) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6, sep = d - A.r - B.r;
    if (sep > m) return 0;
    const o = out[0]; o.nx = dx / d; o.ny = dy / d; o.x = A.x + o.nx * A.r; o.y = A.y + o.ny * A.r; o.sep = sep;
    return 1;
  }
  // box A vs circle B, normal A→B
  function cbc(A, B, out, m) {
    const dx = B.x - A.x, dy = B.y - A.y;
    const lx = A.c * dx + A.s * dy, ly = -A.s * dx + A.c * dy, hx = A.hw, hy = A.hh;
    let qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, nlx, nly, sep;
    if (qx === lx && qy === ly) {
      const px = hx - Math.abs(lx), py = hy - Math.abs(ly);
      if (px < py) { nlx = lx < 0 ? -1 : 1; nly = 0; sep = -px - B.r; qx = nlx * hx; } else { nlx = 0; nly = ly < 0 ? -1 : 1; sep = -py - B.r; qy = nly * hy; }
    } else {
      const ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey) || 1e-6;
      sep = d - B.r; if (sep > m) return 0;
      nlx = ex / d; nly = ey / d;
    }
    const o = out[0];
    o.nx = A.c * nlx - A.s * nly; o.ny = A.s * nlx + A.c * nly;
    o.x = A.x + A.c * qx - A.s * qy; o.y = A.y + A.s * qx + A.c * qy; o.sep = sep;
    return 1;
  }
  function clipSeg(o, i, nx, ny, off) {
    let n = 0;
    const d0 = nx * i[0] + ny * i[1] - off, d1 = nx * i[2] + ny * i[3] - off;
    if (d0 <= 0) { o[0] = i[0]; o[1] = i[1]; n = 1; }
    if (d1 <= 0) { o[n * 2] = i[2]; o[n * 2 + 1] = i[3]; n++; }
    if (d0 * d1 < 0 && n < 2) { const u = d0 / (d0 - d1); o[n * 2] = i[0] + u * (i[2] - i[0]); o[n * 2 + 1] = i[1] + u * (i[3] - i[1]); n++; }
    return n;
  }
  function incident(B, fnx, fny) {
    const nlx = -(B.c * fnx + B.s * fny), nly = -(-B.s * fnx + B.c * fny), hx = B.hw, hy = B.hh;
    let ax, ay, bx, by;
    if (Math.abs(nlx) > Math.abs(nly)) { if (nlx > 0) { ax = hx; ay = -hy; bx = hx; by = hy; } else { ax = -hx; ay = hy; bx = -hx; by = -hy; } }
    else if (nly > 0) { ax = hx; ay = hy; bx = -hx; by = hy; } else { ax = -hx; ay = -hy; bx = hx; by = -hy; }
    IE[0] = B.x + B.c * ax - B.s * ay; IE[1] = B.y + B.s * ax + B.c * ay;
    IE[2] = B.x + B.c * bx - B.s * by; IE[3] = B.y + B.s * bx + B.c * by;
  }
  // box vs box (Box2D-lite style SAT + clipping), normal A→B
  function cbb(A, B, out, m) {
    const hAx = A.hw, hAy = A.hh, hBx = B.hw, hBy = B.hh;
    const a1x = A.c, a1y = A.s, a2x = -A.s, a2y = A.c, b1x = B.c, b1y = B.s, b2x = -B.s, b2y = B.c;
    const dpx = B.x - A.x, dpy = B.y - A.y;
    const dAx = a1x * dpx + a1y * dpy, dAy = a2x * dpx + a2y * dpy, dBx = b1x * dpx + b1y * dpy, dBy = b2x * dpx + b2y * dpy;
    const c11 = Math.abs(a1x * b1x + a1y * b1y), c12 = Math.abs(a1x * b2x + a1y * b2y), c21 = Math.abs(a2x * b1x + a2y * b1y), c22 = Math.abs(a2x * b2x + a2y * b2y);
    const fAx = Math.abs(dAx) - hAx - (c11 * hBx + c12 * hBy), fAy = Math.abs(dAy) - hAy - (c21 * hBx + c22 * hBy);
    if (fAx > m || fAy > m) return 0;
    const fBx = Math.abs(dBx) - (c11 * hAx + c21 * hAy) - hBx, fBy = Math.abs(dBy) - (c12 * hAx + c22 * hAy) - hBy;
    if (fBx > m || fBy > m) return 0;
    let axis = 0, sep = fAx, nx = dAx > 0 ? a1x : -a1x, ny = dAx > 0 ? a1y : -a1y;
    if (fAy > 0.95 * sep + 0.01 * hAy) { axis = 1; sep = fAy; nx = dAy > 0 ? a2x : -a2x; ny = dAy > 0 ? a2y : -a2y; }
    if (fBx > 0.95 * sep + 0.01 * hBx) { axis = 2; sep = fBx; nx = dBx > 0 ? b1x : -b1x; ny = dBx > 0 ? b1y : -b1y; }
    if (fBy > 0.95 * sep + 0.01 * hBy) { axis = 3; sep = fBy; nx = dBy > 0 ? b2x : -b2x; ny = dBy > 0 ? b2y : -b2y; }
    let fnx, fny, front, snx, sny, side, neg, pos;
    if (axis === 0) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAx; snx = a2x; sny = a2y; side = A.x * snx + A.y * sny; neg = -side + hAy; pos = side + hAy; incident(B, fnx, fny); }
    else if (axis === 1) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAy; snx = a1x; sny = a1y; side = A.x * snx + A.y * sny; neg = -side + hAx; pos = side + hAx; incident(B, fnx, fny); }
    else if (axis === 2) { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBx; snx = b2x; sny = b2y; side = B.x * snx + B.y * sny; neg = -side + hBy; pos = side + hBy; incident(A, fnx, fny); }
    else { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBy; snx = b1x; sny = b1y; side = B.x * snx + B.y * sny; neg = -side + hBx; pos = side + hBx; incident(A, fnx, fny); }
    if (clipSeg(CL1, IE, -snx, -sny, neg) < 2) return 0;
    if (clipSeg(CL2, CL1, snx, sny, pos) < 2) return 0;
    let n = 0;
    for (let i = 0; i < 2; i++) {
      const px = CL2[i * 2], py = CL2[i * 2 + 1], s = fnx * px + fny * py - front;
      if (s <= m) { const o = out[n++]; o.sep = s; o.nx = nx; o.ny = ny; o.x = px - s * fnx; o.y = py - s * fny; }
    }
    return n;
  }
  // body vs ground plane y = 0 (y grows downward), normal body→ground = (0,1)
  function cbg(A, out, m) {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1;
      const x = A.x + A.c * sx * A.hw - A.s * sy * A.hh, y = A.y + A.s * sx * A.hw + A.c * sy * A.hh, sep = -y;
      if (sep > m) continue;
      if (n < 2) { const o = out[n++]; o.x = x; o.y = y; o.sep = sep; o.nx = 0; o.ny = 1; }
      else { const k = out[0].sep > out[1].sep ? 0 : 1; if (sep < out[k].sep) { const o = out[k]; o.x = x; o.y = y; o.sep = sep; } }
    }
    return n;
  }
  function ccg(A, out, m) {
    const sep = -(A.y + A.r);
    if (sep > m) return 0;
    const o = out[0]; o.x = A.x; o.y = A.y + A.r; o.sep = sep; o.nx = 0; o.ny = 1;
    return 1;
  }

  class World {
    constructor() {
      this.bodies = []; this.arb = new Map(); this.act = []; this.stamp = 0; this.onHit = null;
      this.ground = { id: 0, shape: 'g', kind: 'ground', mat: 'rock', x: 0, y: 0, vx: 0, vy: 0, w: 0, im: 0, iI: 0, im0: 0, f: 0.85, e: 0.05, c: 1, s: 0, dead: false };
      this.pnTmp = [0, 0, 0, 0]; this.ptTmp = [0, 0, 0, 0];
    }
    add(b) { this.bodies.push(b); return b; }
    wake(b) { if (b.sleep) { b.sleep = false; b.st = 0; b.im = b.im0; b.iI = b.iI0; } }
    sleepB(b) { b.sleep = true; b.vx = b.vy = b.w = 0; b.im = 0; b.iI = 0; b.st = 0; }
    upd(a, b, key, k, st) {
      let ar = this.arb.get(key);
      if (!ar) { ar = { a, b, n: 0, cs: [mkC(), mkC()], f: Math.sqrt(a.f * b.f), e: Math.max(a.e, b.e), stamp: st }; this.arb.set(key, ar); }
      for (let q = 0; q < k; q++) {
        const t = T[q]; let pn = 0, pt = 0;
        for (let r = 0; r < ar.n; r++) { const c = ar.cs[r]; const dx = c.x - t.x, dy = c.y - t.y; if (dx * dx + dy * dy < 0.03) { pn = c.Pn; pt = c.Pt; break; } }
        this.pnTmp[q] = pn; this.ptTmp[q] = pt;
      }
      for (let q = 0; q < k; q++) { const t = T[q], c = ar.cs[q]; c.x = t.x; c.y = t.y; c.nx = t.nx; c.ny = t.ny; c.sep = t.sep; c.Pn = this.pnTmp[q]; c.Pt = this.ptTmp[q]; }
      ar.n = k; ar.stamp = st; this.act.push(ar);
    }
    step(dt) {
      const B = this.bodies, inv = 1 / dt, st = ++this.stamp, n = B.length;
      this.act.length = 0;
      for (let i = 0; i < n; i++) { const b = B[i]; b.touch = 0; if (!b.dead && b.im > 0) b.vy += GRAV * dt; }
      for (let i = 0; i < n; i++) {
        const a = B[i]; if (a.dead) continue;
        const va = a.im > 0 ? Math.abs(a.vx) + Math.abs(a.vy) + Math.abs(a.w) * a.bound : 0;
        if (a.im > 0) {
          const m = 0.02 + va * dt;
          if (a.y + a.bound > -m) { const k = a.shape === 'c' ? ccg(a, T, m) : cbg(a, T, m); if (k) this.upd(a, this.ground, a.id * 4096, k, st); }
        } else if (a.sleep) { const ar = this.arb.get(a.id * 4096); if (ar) ar.stamp = st; }
        for (let j = i + 1; j < n; j++) {
          const b = B[j]; if (b.dead) continue;
          const key = a.id < b.id ? a.id * 4096 + b.id : b.id * 4096 + a.id;
          if (a.im === 0 && b.im === 0) { const ar = this.arb.get(key); if (ar) ar.stamp = st; continue; }
          const vb = b.im > 0 ? Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.w) * b.bound : 0;
          const m = 0.02 + (va + vb) * dt;
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.bound + b.bound + m;
          if (dx * dx + dy * dy > rr * rr) continue;
          let k;
          if (a.shape === 'b') k = b.shape === 'b' ? cbb(a, b, T, m) : cbc(a, b, T, m);
          else if (b.shape === 'b') { k = cbc(b, a, T, m); for (let q = 0; q < k; q++) { T[q].nx = -T[q].nx; T[q].ny = -T[q].ny; } }
          else k = ccc(a, b, T, m);
          if (!k) continue;
          if (a.sleep && vb > 0.3) this.wake(a);
          if (b.sleep && va > 0.3) this.wake(b);
          if (a.im === 0 && b.im === 0) continue;
          this.upd(a, b, key, k, st);
        }
      }
      for (const [key, ar] of this.arb) if (ar.stamp !== st || ar.a.dead || ar.b.dead) this.arb.delete(key);
      // pre-step: masses, bias, impact detection, warm start
      const act = this.act;
      for (let q = 0; q < act.length; q++) {
        const ar = act[q], a = ar.a, b = ar.b;
        if (a.dead || b.dead) { ar.n = 0; continue; }
        let minVn = 0, maxImp = 0;
        for (let i = 0; i < ar.n; i++) {
          const c = ar.cs[i];
          c.r1x = c.x - a.x; c.r1y = c.y - a.y; c.r2x = c.x - b.x; c.r2y = c.y - b.y;
          const nx = c.nx, ny = c.ny, tx = ny, ty = -nx;
          const rn1 = c.r1x * nx + c.r1y * ny, rn2 = c.r2x * nx + c.r2y * ny;
          const kN = a.im + b.im + a.iI * (c.r1x * c.r1x + c.r1y * c.r1y - rn1 * rn1) + b.iI * (c.r2x * c.r2x + c.r2y * c.r2y - rn2 * rn2);
          const rt1 = c.r1x * tx + c.r1y * ty, rt2 = c.r2x * tx + c.r2y * ty;
          const kT = a.im + b.im + a.iI * (c.r1x * c.r1x + c.r1y * c.r1y - rt1 * rt1) + b.iI * (c.r2x * c.r2x + c.r2y * c.r2y - rt2 * rt2);
          c.mn = kN > 0 ? 1 / kN : 0; c.mt = kT > 0 ? 1 / kT : 0;
          const dvx = b.vx - b.w * c.r2y - a.vx + a.w * c.r1y, dvy = b.vy + b.w * c.r2x - a.vy - a.w * c.r1x;
          c.vn = dvx * nx + dvy * ny;
          if (c.vn < minVn && c.sep < 0.06) { minVn = c.vn; maxImp = Math.max(maxImp, c.mn * -c.vn); }
        }
        if (minVn < -1.3 && this.onHit) { this.onHit(ar, maxImp, -minVn); if (a.dead || b.dead) { ar.n = 0; continue; } }
        a.touch = 1; b.touch = 1;
        for (let i = 0; i < ar.n; i++) {
          const c = ar.cs[i];
          c.bias = c.sep > 0 ? -c.sep * inv : BAUM * inv * Math.max(0, -c.sep - SLOP);
          if (c.vn < -1.5) c.bias = Math.max(c.bias, -ar.e * c.vn);
          const Px = c.Pn * c.nx + c.Pt * c.ny, Py = c.Pn * c.ny - c.Pt * c.nx;
          a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (c.r1x * Py - c.r1y * Px);
          b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (c.r2x * Py - c.r2y * Px);
        }
      }
      // sequential impulses
      for (let it = 0; it < ITER; it++) {
        for (let q = 0; q < act.length; q++) {
          const ar = act[q]; if (!ar.n) continue;
          const a = ar.a, b = ar.b;
          for (let i = 0; i < ar.n; i++) {
            const c = ar.cs[i], nx = c.nx, ny = c.ny;
            let dvx = b.vx - b.w * c.r2y - a.vx + a.w * c.r1y, dvy = b.vy + b.w * c.r2x - a.vy - a.w * c.r1x;
            const vn = dvx * nx + dvy * ny;
            let dPn = c.mn * (-vn + c.bias);
            const Pn0 = c.Pn; c.Pn = Math.max(Pn0 + dPn, 0); dPn = c.Pn - Pn0;
            let Px = dPn * nx, Py = dPn * ny;
            a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (c.r1x * Py - c.r1y * Px);
            b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (c.r2x * Py - c.r2y * Px);
            dvx = b.vx - b.w * c.r2y - a.vx + a.w * c.r1y; dvy = b.vy + b.w * c.r2x - a.vy - a.w * c.r1x;
            const tx = ny, ty = -nx, vt = dvx * tx + dvy * ty;
            let dPt = c.mt * -vt;
            const maxPt = ar.f * c.Pn, Pt0 = c.Pt;
            c.Pt = Math.max(-maxPt, Math.min(maxPt, Pt0 + dPt)); dPt = c.Pt - Pt0;
            Px = dPt * tx; Py = dPt * ty;
            a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (c.r1x * Py - c.r1y * Px);
            b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (c.r2x * Py - c.r2y * Px);
          }
        }
      }
      // integrate + sleep
      for (let i = 0; i < n; i++) {
        const b = B[i];
        if (b.dead || b.im === 0) continue;
        if (b.shape === 'c' && b.touch) { b.w *= 1 - 2.2 * dt; b.vx *= 1 - 0.9 * dt; }
        b.w *= 1 - 0.2 * dt;
        const sp = b.vx * b.vx + b.vy * b.vy;
        if (sp > 3600) { const k = 60 / Math.sqrt(sp); b.vx *= k; b.vy *= k; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; b.c = Math.cos(b.a); b.s = Math.sin(b.a);
        if (b.kind !== 'bird') {
          if (sp < 0.025 && b.w * b.w < 0.035) { b.st += dt; if (b.st > 0.5) this.sleepB(b); } else b.st = 0;
        }
      }
    }
  }

  /* ============================== sprites ============================== */
  const SPR = new Map();
  function sprite(key, w, h, fn) {
    let c = SPR.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h));
    fn(c.getContext('2d'), c.width, c.height); SPR.set(key, c);
    return c;
  }
  function lcg(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function rrect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const PPU = 60, BPAD = 0.06;
  // block sprite: material look + crack stage
  function blockSprite(mat, w, h, stage, accent) {
    const key = `b${mat}${w}x${h}s${stage}${mat === 'rock' ? accent : ''}`;
    return sprite(key, (w + BPAD * 2) * PPU, (h + BPAD * 2) * PPU, (g) => {
      g.scale(PPU, PPU); g.translate(BPAD, BPAD);
      const R = lcg(U.hashStr(key)), r = Math.min(0.12, w * 0.22, h * 0.22);
      const along = w >= h;
      if (mat === 'wood') {
        const gr = along ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, '#f2b766'); gr.addColorStop(0.45, '#cf8640'); gr.addColorStop(1, '#93511f');
        rrect(g, 0, 0, w, h, r); g.fillStyle = gr; g.fill();
        g.save(); rrect(g, 0, 0, w, h, r); g.clip();
        g.strokeStyle = 'rgba(110,52,14,0.45)'; g.lineWidth = 0.025;
        const L = along ? w : h, S = along ? h : w, lines = Math.max(2, Math.round(S / 0.14));
        for (let i = 1; i < lines; i++) {
          const o = (i / lines) * S + (R() - 0.5) * 0.04; g.beginPath();
          for (let u = 0; u <= L + 0.01; u += 0.2) { const wv = Math.sin(u * 3 + i * 1.7) * 0.02; if (along) g.lineTo(u, o + wv); else g.lineTo(o + wv, u); }
          g.stroke();
        }
        for (let k = 0; k < Math.max(1, Math.round(L / 1.2)); k++) {
          const u = 0.25 + R() * (L - 0.5), v = S * (0.3 + R() * 0.4);
          g.fillStyle = 'rgba(100,45,10,0.55)'; g.beginPath(); if (along) g.ellipse(u, v, 0.09, 0.045, 0, 0, TAU); else g.ellipse(v, u, 0.045, 0.09, 0, 0, TAU); g.fill();
        }
        const hl = along ? g.createLinearGradient(0, 0, 0, h * 0.45) : g.createLinearGradient(0, 0, w * 0.45, 0);
        hl.addColorStop(0, 'rgba(255,240,200,0.5)'); hl.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = hl; g.fillRect(0, 0, along ? w : w * 0.45, along ? h * 0.45 : h);
        g.restore();
        rrect(g, 0.015, 0.015, w - 0.03, h - 0.03, r); g.strokeStyle = '#5c2c0b'; g.lineWidth = 0.045; g.stroke();
        // nails
        g.fillStyle = '#ffe6a8';
        const nl = along ? [[0.12, h / 2], [w - 0.12, h / 2]] : [[w / 2, 0.12], [w / 2, h - 0.12]];
        nl.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 0.035, 0, TAU); g.fill(); });
      } else if (mat === 'glass') {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, 'rgba(200,250,255,0.78)'); gr.addColorStop(0.5, 'rgba(120,215,255,0.5)'); gr.addColorStop(1, 'rgba(80,150,255,0.62)');
        rrect(g, 0, 0, w, h, r); g.fillStyle = gr; g.fill();
        g.save(); rrect(g, 0, 0, w, h, r); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        const d = Math.min(w, h);
        g.beginPath(); g.moveTo(w * 0.1, 0); g.lineTo(w * 0.1 + d * 0.35, 0); g.lineTo(w * 0.1 - d * 0.2 + d * 0.35, h); g.lineTo(w * 0.1 - d * 0.2, h); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.beginPath(); g.moveTo(w * 0.1 + d * 0.5, 0); g.lineTo(w * 0.1 + d * 0.6, 0); g.lineTo(w * 0.1 + d * 0.4, h); g.lineTo(w * 0.1 + d * 0.3, h); g.closePath(); g.fill();
        g.restore();
        rrect(g, 0.02, 0.02, w - 0.04, h - 0.04, r); g.strokeStyle = 'rgba(235,255,255,0.95)'; g.lineWidth = 0.04; g.stroke();
        rrect(g, 0.07, 0.07, w - 0.14, h - 0.14, r * 0.6); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.02; g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w - 0.13, 0.12, 0.035, 0, TAU); g.fill();
      } else {
        const rock = mat === 'rock';
        const gr = g.createLinearGradient(0, 0, w * 0.3, h);
        if (rock) { gr.addColorStop(0, '#4a4266'); gr.addColorStop(1, '#221d36'); } else { gr.addColorStop(0, '#c4c0d6'); gr.addColorStop(0.5, '#9a95b0'); gr.addColorStop(1, '#6a6584'); }
        rrect(g, 0, 0, w, h, r); g.fillStyle = gr; g.fill();
        g.save(); rrect(g, 0, 0, w, h, r); g.clip();
        for (let k = 0; k < w * h * 30; k++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(30,20,50,0.25)'; g.beginPath(); g.arc(R() * w, R() * h, 0.015 + R() * 0.03, 0, TAU); g.fill(); }
        if (rock) {
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.03;
          for (let yy = 0.5; yy < h; yy += 0.5) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); const off = (yy * 2) % 2 ? 0.5 : 0; for (let xx = off; xx < w; xx += 1) { g.beginPath(); g.moveTo(xx, yy - 0.5); g.lineTo(xx, yy); g.stroke(); } }
        }
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 0, w, Math.min(0.08, h * 0.2));
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, h - Math.min(0.08, h * 0.2), w, 0.1);
        g.restore();
        rrect(g, 0.015, 0.015, w - 0.03, h - 0.03, r); g.strokeStyle = rock ? '#140f24' : '#3f3a56'; g.lineWidth = 0.045; g.stroke();
        if (rock) { g.fillStyle = accent; g.globalAlpha = 0.85; g.fillRect(0.04, 0.02, w - 0.08, 0.05); g.globalAlpha = 1; }
      }
      // cracks
      if (stage > 0) {
        const col = mat === 'glass' ? 'rgba(255,255,255,0.95)' : mat === 'wood' ? 'rgba(60,24,4,0.9)' : 'rgba(30,24,50,0.9)';
        g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
        const cnt = stage === 1 ? 2 : 5;
        for (let k = 0; k < cnt; k++) {
          let x = R() * w, y = R() * h; g.lineWidth = 0.03 + R() * 0.02;
          g.beginPath(); g.moveTo(x, y);
          const ang = R() * TAU, segs = 3 + Math.floor(R() * 3);
          for (let s = 0; s < segs; s++) { x += Math.cos(ang + (R() - 0.5) * 1.6) * 0.18; y += Math.sin(ang + (R() - 0.5) * 1.6) * 0.18; g.lineTo(x, y); }
          g.stroke();
        }
        if (stage === 2) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(R() * w, R() * h, 0.04 + R() * 0.04, 0, TAU); g.fill(); } }
      }
    });
  }
  const SPU = 64, SW = 2.8; // character sprites: unit radius, 2.8 units square
  function birdSprite(type, face) {
    const B = BIRDS[type], col = B.col;
    return sprite(`bird${type}${face}`, SW * SPU, SW * SPU, (g, cw) => {
      g.translate(cw / 2, cw / 2); g.scale(SPU, SPU);
      const dark = U.shade(col, -0.45), light = U.shade(col, 0.5);
      // tail
      g.fillStyle = dark;
      [[-1.05, -0.25, -0.5], [-1.1, 0.05, 0], [-1.0, 0.32, 0.5]].forEach(([x, y, a]) => { g.beginPath(); g.ellipse(x, y, 0.32, 0.12, a, 0, TAU); g.fill(); });
      // crest
      if (type === 'normal') {
        g.save(); g.translate(0.05, -1.02); g.rotate(-0.2);
        const st = g.createRadialGradient(0, 0, 0, 0, 0, 0.42); st.addColorStop(0, '#fffbd0'); st.addColorStop(1, '#ffc21f');
        g.fillStyle = st; g.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? 0.17 : 0.4, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.strokeStyle = '#c47a00'; g.lineWidth = 0.05; g.stroke(); g.restore();
      } else if (type === 'split') {
        g.fillStyle = light;
        [[-0.3, -1.0, -0.4], [0.05, -1.12, 0], [0.4, -1.0, 0.4]].forEach(([x, y, a]) => { g.beginPath(); g.ellipse(x, y, 0.13, 0.26, a, 0, TAU); g.fill(); });
      } else if (type === 'dash') {
        g.fillStyle = '#fff4b0'; g.strokeStyle = '#c98a00'; g.lineWidth = 0.05;
        g.beginPath(); g.moveTo(0.2, -0.85); g.lineTo(-0.15, -1.35); g.lineTo(-0.02, -1.08); g.lineTo(-0.55, -1.25); g.lineTo(-0.2, -0.82); g.closePath(); g.fill(); g.stroke();
      } else if (type === 'bomb') {
        g.strokeStyle = '#d9c6a0'; g.lineWidth = 0.09; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0.1, -0.95); g.quadraticCurveTo(0.25, -1.3, 0.55, -1.2); g.stroke();
        const sp = g.createRadialGradient(0.58, -1.22, 0, 0.58, -1.22, 0.3); sp.addColorStop(0, '#ffffff'); sp.addColorStop(0.3, '#ffd23f'); sp.addColorStop(1, 'rgba(255,90,0,0)');
        g.fillStyle = sp; g.beginPath(); g.arc(0.58, -1.22, 0.3, 0, TAU); g.fill();
      }
      // body
      const bg = g.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1.05);
      bg.addColorStop(0, light); bg.addColorStop(0.55, col); bg.addColorStop(1, dark);
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
      g.strokeStyle = U.shade(col, -0.6); g.lineWidth = 0.06; g.stroke();
      // belly
      g.fillStyle = 'rgba(255,246,228,0.85)'; g.beginPath(); g.ellipse(0.12, 0.5, 0.6, 0.38, 0, 0, TAU); g.fill();
      if (type === 'bomb') { g.fillStyle = 'rgba(255,220,120,0.8)'; g.font = '900 0.45px sans-serif'; g.textAlign = 'center'; g.fillText('★', 0.12, 0.66); }
      // eyes
      const eyes = [[0.12, -0.2, 0.27], [0.56, -0.17, 0.24]];
      eyes.forEach(([x, y, r], i) => {
        if (face === 'blink') { g.strokeStyle = '#2a0a18'; g.lineWidth = 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(x, y - 0.02, r * 0.7, 0.2, Math.PI - 0.2); g.stroke(); return; }
        if (face === 'dizzy') {
          g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          g.strokeStyle = '#2a0a18'; g.lineWidth = 0.06; g.beginPath();
          for (let a = 0; a < 9; a += 0.4) { const rr = (a / 9) * r * 0.85; g.lineTo(x + Math.cos(a + i) * rr, y + Math.sin(a + i) * rr); }
          g.stroke(); return;
        }
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, r, r * 1.1, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(60,10,30,0.35)'; g.lineWidth = 0.03; g.stroke();
        g.fillStyle = '#1b0818'; g.beginPath(); g.arc(x + r * 0.32, y + 0.03, r * 0.55, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + r * 0.15, y - r * 0.25, r * 0.22, 0, TAU); g.fill();
        g.beginPath(); g.arc(x + r * 0.55, y + r * 0.25, r * 0.1, 0, TAU); g.fill();
      });
      // brows (determined)
      if (face !== 'dizzy') {
        g.strokeStyle = U.shade(col, -0.7); g.lineWidth = 0.08; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-0.12, -0.55); g.lineTo(0.28, -0.46); g.stroke();
        g.beginPath(); g.moveTo(0.45, -0.46); g.lineTo(0.78, -0.55); g.stroke();
      }
      // blush
      g.fillStyle = 'rgba(255,120,160,0.55)';
      g.beginPath(); g.ellipse(-0.05, 0.18, 0.15, 0.08, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0.74, 0.2, 0.12, 0.07, 0, 0, TAU); g.fill();
      // beak
      const bk = g.createLinearGradient(0.6, 0, 1.15, 0.2); bk.addColorStop(0, '#ffb43a'); bk.addColorStop(1, '#ff7a1a');
      g.fillStyle = bk; g.beginPath(); g.moveTo(0.62, -0.02); g.lineTo(1.18, 0.12); g.lineTo(0.62, 0.3); g.closePath(); g.fill();
      g.strokeStyle = '#a84400'; g.lineWidth = 0.035; g.stroke();
      // gloss
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-0.42, -0.55, 0.26, 0.14, -0.6, 0, TAU); g.fill();
    });
  }
  function minionSprite(face, helmet, accent, accent2) {
    return sprite(`min${face}${helmet}${accent}`, SW * SPU, SW * SPU, (g, cw) => {
      g.translate(cw / 2, cw / 2); g.scale(SPU, SPU);
      // horns
      g.fillStyle = '#2a1645';
      [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(s * 0.35, -0.85); g.quadraticCurveTo(s * 0.75, -1.15, s * 0.78, -1.32); g.quadraticCurveTo(s * 0.8, -0.95, s * 0.68, -0.62); g.closePath(); g.fill(); });
      g.fillStyle = accent; [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * 0.77, -1.28, 0.06, 0, TAU); g.fill(); });
      // body
      const bg = g.createRadialGradient(-0.3, -0.4, 0.1, 0, 0, 1.05);
      bg.addColorStop(0, '#9b78e0'); bg.addColorStop(0.5, '#56339a'); bg.addColorStop(1, '#1f0f3d');
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
      g.strokeStyle = '#12061f'; g.lineWidth = 0.06; g.stroke();
      // rim light
      g.strokeStyle = accent2; g.globalAlpha = 0.65; g.lineWidth = 0.08; g.beginPath(); g.arc(0, 0, 0.93, 0.2, 1.4); g.stroke(); g.globalAlpha = 1;
      // goo drips
      g.fillStyle = '#2a1650';
      [[-0.45, 0.88], [0.2, 0.96]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 0.12, 0.09, 0, 0, TAU); g.fill(); });
      if (helmet) {
        const hg = g.createLinearGradient(0, -1.1, 0, -0.35); hg.addColorStop(0, '#e2e0ee'); hg.addColorStop(1, '#7a7694');
        g.fillStyle = hg; g.beginPath(); g.arc(0, -0.25, 0.92, Math.PI + 0.25, -0.25); g.closePath(); g.fill();
        g.strokeStyle = '#3a3652'; g.lineWidth = 0.05; g.stroke();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-0.1, -1.12); g.lineTo(0, -1.45); g.lineTo(0.1, -1.12); g.closePath(); g.fill();
        g.fillStyle = '#4b4766'; [-0.55, 0, 0.55].forEach((x) => { g.beginPath(); g.arc(x, -0.5 - (x === 0 ? 0.28 : 0.08), 0.05, 0, TAU); g.fill(); });
      }
      // mask
      const mg = g.createLinearGradient(0, -0.55, 0, 0.1); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#d6c6ff');
      g.fillStyle = mg; g.beginPath();
      g.moveTo(-0.88, -0.3); g.quadraticCurveTo(-0.6, -0.62, -0.18, -0.45); g.quadraticCurveTo(0, -0.38, 0.18, -0.45); g.quadraticCurveTo(0.6, -0.62, 0.88, -0.3);
      g.quadraticCurveTo(0.8, 0.06, 0.38, 0.06); g.quadraticCurveTo(0.12, 0.05, 0, -0.08); g.quadraticCurveTo(-0.12, 0.05, -0.38, 0.06); g.quadraticCurveTo(-0.8, 0.06, -0.88, -0.3);
      g.closePath(); g.fill(); g.strokeStyle = '#2a1645'; g.lineWidth = 0.045; g.stroke();
      g.fillStyle = accent; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0.08, -0.4); g.lineTo(0, -0.3); g.lineTo(-0.08, -0.4); g.closePath(); g.fill();
      // eyes
      [-1, 1].forEach((s) => {
        const x = s * 0.4, y = -0.2;
        if (face === 'blink' || (face === 'hurt' && s < 0)) {
          g.strokeStyle = '#1a0a2a'; g.lineWidth = 0.07; g.lineCap = 'round';
          if (face === 'hurt') { g.beginPath(); g.moveTo(x - 0.12, y - 0.1); g.lineTo(x + 0.12, y + 0.06); g.moveTo(x + 0.12, y - 0.1); g.lineTo(x - 0.12, y + 0.06); g.stroke(); }
          else { g.beginPath(); g.moveTo(x - 0.15, y); g.lineTo(x + 0.15, y); g.stroke(); }
          return;
        }
        g.save(); g.translate(x, y); g.rotate(s * 0.28);
        const eg = g.createRadialGradient(0, 0, 0, 0, 0, 0.18); eg.addColorStop(0, '#fffbd0'); eg.addColorStop(1, '#ffc414');
        g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, 0.18, face === 'hurt' ? 0.08 : 0.12, 0, 0, TAU); g.fill();
        g.fillStyle = '#1a0a2a'; g.beginPath(); g.arc(-s * 0.03, 0.01, 0.06, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.05, -0.03, 0.022, 0, TAU); g.fill();
        g.restore();
        // grumpy brow
        g.strokeStyle = '#1a0a2a'; g.lineWidth = 0.08; g.lineCap = 'round';
        g.beginPath(); g.moveTo(s * 0.62, -0.5); g.lineTo(s * 0.18, -0.36); g.stroke();
      });
      // blush
      g.fillStyle = 'rgba(255,110,170,0.45)';
      [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(s * 0.55, 0.22, 0.14, 0.07, 0, 0, TAU); g.fill(); });
      // mouth
      g.strokeStyle = '#12061f'; g.lineWidth = 0.065; g.lineCap = 'round';
      g.beginPath();
      if (face === 'hurt') g.ellipse(0, 0.42, 0.12, 0.09, 0, 0, TAU); else { g.moveTo(-0.22, 0.46); g.quadraticCurveTo(0, 0.3, 0.22, 0.46); }
      g.stroke();
      if (face !== 'hurt') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0.06, 0.37); g.lineTo(0.14, 0.38); g.lineTo(0.1, 0.48); g.closePath(); g.fill(); }
      if (face === 'hurt') {
        g.save(); g.translate(0.55, -0.72); g.rotate(0.6); g.fillStyle = '#ffe2c0'; rrect(g, -0.22, -0.07, 0.44, 0.14, 0.05); g.fill();
        g.rotate(-1.2); rrect(g, -0.22, -0.07, 0.44, 0.14, 0.05); g.fill(); g.restore();
      }
      // gloss
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-0.45, -0.62, 0.2, 0.1, -0.6, 0, TAU); g.fill();
    });
  }

  /* ============================== game ============================== */
  class Sling extends Base {
    static info = { id: 'sling', name: '슈팅 스타 새총', icon: '🌠', section: '새총', color: '#ff4f7b', desc: '새총으로 별새를 날려 그림자 미니언의 탑을 무너뜨려요!' };
    static howto = ['별새를 뒤로 당겼다가 놓으면 발사돼요.', '미니언을 모두 쓰러뜨리면 클리어! 남은 새는 보너스 점수.', '특별한 새는 날아가는 중에 화면을 탭하면 능력을 써요.'];
    static params(stage, C) {
      const c = util.cfg(C, '새총', DEFAULTS), e = util.ease(stage, c.난이도_간격), L = util.lerp;
      const minions = Math.max(1, Math.round(L(c.미니언_시작, c.미니언_최대, e)));
      const per = L(c.미니언당_발_시작, c.미니언당_발_최소, e), spare = Math.max(0, Math.round(L(c.여유발_시작, c.여유발_최소, e)));
      const types = ['normal'];
      if (stage >= c.분열새_시작판) types.push('split');
      if (stage >= c.돌진새_시작판) types.push('dash');
      if (stage >= c.폭탄새_시작판) types.push('bomb');
      return {
        fee: c.입장료, reward: c.클리어보상, extendCost: c.발추가_가격, extendShots: Math.max(1, Math.round(c.발추가_수)), extendSec: 0,
        extendText: `+${Math.max(1, Math.round(c.발추가_수))}발`, time: 0, star: [0, 0, 0],
        structs: Math.max(1, Math.round(L(c.구조물_시작, c.구조물_최대, e))),
        floors: Math.max(1, Math.round(L(c.층수_시작, c.층수_최대, e))),
        minions, shots: Math.max(2, Math.ceil(minions * per - 0.05) + spare),
        glassP: L(c.유리_확률_시작, c.유리_확률_끝, e) / 100, stoneP: L(c.돌_확률_시작, c.돌_확률_끝, e) / 100,
        pedP: stage < 4 ? 0 : L(0, c.받침대_확률_끝, e) / 100, hpMul: L(c.미니언_체력_시작, c.미니언_체력_끝, e), bigP: stage < 5 ? 0 : L(0, c.큰미니언_확률_끝, e) / 100,
        aimFree: stage <= c.조준선_무료판, aimCost: c.조준선_가격, spareCoin: c.남은발_보상, comboCoin: c.연쇄_보상,
        types, newType: [[c.분열새_시작판, 'split'], [c.돌진새_시작판, 'dash'], [c.폭탄새_시작판, 'bomb']].filter((a) => a[0] === stage).map((a) => a[1])[0] || null,
        star2: c.별2_파괴율 / 100, star3: c.별3_파괴율 / 100,
      };
    }

    constructor(host, o) {
      super(host, o);
      const p = this.p;
      this.hud({ title: '슈팅 스타 새총', sub: `${o.stage}판`, timer: false, tools: [{ id: 'aim', ico: '🎯', label: p.aimFree ? '조준선 ON' : '조준선', cost: p.aimFree ? null : p.aimCost }] });
      this.aimBtn = this.ui.tools.querySelector('[data-tool="aim"]');
      this.aimOn = !!p.aimFree; if (this.aimOn) this.aimBtn.disabled = true;
      this.ui.cv.style.touchAction = 'none';
      const th = this.th;
      this.acc1 = (th.accent && th.accent[0] === '#') ? th.accent : '#ff4fd8';
      this.acc2 = (th.accent2 && th.accent2[0] === '#') ? th.accent2 : '#00e5ff';
      this.sc = th.sc && th.sc.length >= 3 ? th.sc : ['#14002e', this.acc1, this.acc2];
      this.world = new World();
      this.world.onHit = (ar, imp, sp) => this.onHit(ar, imp, sp);
      this.parts = []; this.trail = []; this.flying = [];
      this.simT = 0; this.acc = 0; this.hitStop = 0; this.camShake = 0; this.sndN = 0;
      this.combo = 0; this.comboT = -9; this.maxCombo = 0; this.blockPts = 0; this.minionKills = 0;
      this.state = 'intro'; this.stT = 0; this.cur = null; this.pull = null; this.panX = 0; this.drag = null; this.fired = 0;
      this.gen();
      // critter queue (seeded)
      this.queue = [];
      for (let i = 0; i < p.shots; i++) this.queue.push(this.pickType(i));
      this.camX = this.levelR - 10; this.camS = 30;
      const cv = this.ui.cv;
      cv.addEventListener('pointerdown', (e) => this.down(e));
      cv.addEventListener('pointermove', (e) => this.move(e));
      cv.addEventListener('pointerup', (e) => this.up(e));
      cv.addEventListener('pointercancel', (e) => this.up(e, true));
      this.layout();
      this.camX = this.focusX(); this.camS = this.sFollow || 30;
      this.hudUpd();
    }

    pickType(i) {
      const T = this.p.types;
      if (i === 0 || T.length === 1) return 'normal';
      if (this.p.newType && i === 1) return this.p.newType;
      const w = T.map((t) => (t === 'normal' ? 1.2 : 1));
      return T[U.wpick(w, null, this.rnd)];
    }

    /* ---------------- level generation ---------------- */
    gen() {
      const p = this.p, R = this.rnd, W = this.world;
      BID = 1;
      const cap = 60 - p.minions - 4;
      const pickMat = () => { const r = R(); return r < p.stoneP ? 'stone' : r < p.stoneP + p.glassP ? 'glass' : 'wood'; };
      const stage = this.o.stage;
      let x = 11 + R() * 1.2, blocks = 0;
      const allSlots = [], groundSlots = [];
      this.levelTop = -3; this.blockTotal = 0;
      for (let si = 0; si < p.structs; si++) {
        let type = 'tower';
        if (stage > 1) {
          const ws = [['tower', 5], ['stack', stage >= 3 ? 1.5 : 0], ['bunker', stage >= 4 ? 2.2 : 0], ['pyramid', stage >= 7 ? 1.6 : 0]];
          type = ws[U.wpick(ws, (a) => a[1], R)][0];
        }
        let f = stage === 1 ? 1 : Math.max(1, Math.min(p.floors, Math.round(p.floors * (0.55 + R() * 0.6))));
        let s = this.build(type, f, pickMat, R);
        while (blocks + s.blocks.length > cap && f > 1) { f--; s = this.build(type, f, pickMat, R); }
        if (blocks + s.blocks.length > cap) { if (si > 0) break; s = this.build('stack', 1, pickMat, R); }
        const ped = R() < p.pedP ? (R() < 0.5 ? 1 : 2) : 0;
        const cx = x + s.w / 2 + (ped ? 0.3 : 0);
        if (ped) {
          const rk = W.add(mkBody({ shape: 'b', x: cx, y: -ped / 2, hw: s.w / 2 + 0.3, hh: ped / 2, mat: 'rock', kind: 'rock' }));
          rk.spr = blockSprite('rock', s.w + 0.6, ped, 0, this.acc1);
        }
        for (const b of s.blocks) {
          const body = W.add(mkBody({ shape: 'b', x: cx + b.x, y: b.y - ped, hw: b.hw, hh: b.hh, mat: b.mat, kind: 'block' }));
          body.maxHp = body.hp = MAT[b.mat].hp * (0.55 + 0.45 * 4 * b.hw * b.hh);
          this.blockTotal += MAT[b.mat].pts;
          this.levelTop = Math.min(this.levelTop, b.y - b.hh - ped);
        }
        blocks += s.blocks.length;
        const slots = s.slots.map((q) => ({ x: cx + q.x, y: q.y - ped, maxR: q.maxR, used: false }));
        allSlots.push(slots);
        x += s.w + (ped ? 0.6 : 0);
        const gap = 1.6 + R() * 2.4;
        if (gap >= 2.2) groundSlots.push({ x: x + gap / 2, y: 0, maxR: 0.55, used: false });
        x += gap;
      }
      this.levelR = x;
      groundSlots.push({ x: x + 0.2, y: 0, maxR: 0.6, used: false }, { x: x + 1.6, y: 0, maxR: 0.6, used: false });
      // minions: spread across structures first, then any free slot, then ground
      const order = allSlots.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      this.minions = [];
      let placed = 0, guard = 0;
      while (placed < p.minions && guard++ < 200) {
        let slot = null;
        const si = order[placed % order.length];
        const free = allSlots[si].filter((q) => !q.used);
        if (free.length) slot = free[Math.floor(R() * free.length)];
        else { const any = [].concat(...allSlots).filter((q) => !q.used); slot = any.length ? any[Math.floor(R() * any.length)] : groundSlots.find((q) => !q.used); }
        if (!slot) break;
        slot.used = true;
        let r = 0.42, helmet = false;
        if (slot.maxR >= 0.72 && R() < p.bigP) { r = 0.7; helmet = true; } else if (slot.maxR >= 0.55 && R() < 0.55) r = 0.53;
        if (stage === 1) r = 0.53;
        const m = W.add(mkBody({ shape: 'c', x: slot.x, y: slot.y - r, r, mat: 'minion', kind: 'minion' }));
        m.helmet = helmet; m.maxHp = m.hp = (r > 0.6 ? 4.2 : r > 0.5 ? 2.5 : 1.7) * p.hpMul;
        m.ph = R() * TAU;
        this.minions.push(m);
        if (slot.x > this.levelR - 1) this.levelR = slot.x + 1;
        placed++;
      }
      this.minionTotal = this.minions.length;
      this.levelR += 1.5;
      for (const b of W.bodies) if (b.im0 > 0) W.sleepB(b);
      // star thresholds: clearing = 1 star, + destruction share and spare shots for 2/3
      const mp = this.minionTotal * 5000;
      this.starT = [mp, mp + this.blockTotal * p.star2 + 10000, mp + this.blockTotal * p.star3 + 20000];
    }
    // returns { w, blocks:[{x,y,hw,hh,mat}], slots:[{x,y,maxR}] } in local coords (x centred, y=0 ground, up negative)
    build(type, f, pickMat, R) {
      const blocks = [], slots = [];
      const add = (x, y, hw, hh, mat) => blocks.push({ x, y, hw, hh, mat });
      let w = 2.4, y = 0;
      const floor = (y0, wide, pm, lm) => {
        const sx = wide ? 1.6 : 1.0, ph = wide ? 1.8 : 1.2;
        add(-sx, y0 - 1.0, 0.2, 1.0, pm); add(sx, y0 - 1.0, 0.2, 1.0, pm);
        add(0, y0 - 2.2, ph, 0.2, lm);
        slots.push({ x: 0, y: y0, maxR: wide ? 0.75 : 0.6 });
        return y0 - 2.4;
      };
      if (type === 'tower') {
        const wide = R() < 0.45;
        w = wide ? 3.6 : 2.4;
        for (let k = 0; k < f; k++) y = floor(y, wide && k < 2 ? true : wide && k >= 2 ? false : false, pickMat(), pickMat());
        if (f > 1 && R() < 0.35) { const m = pickMat(); add(-0.7, y - 0.3, 0.3, 0.3, m); add(0.7, y - 0.3, 0.3, 0.3, m); slots.push({ x: 0, y, maxR: 0.45 }); }
        else slots.push({ x: 0, y, maxR: 0.75 });
      } else if (type === 'bunker') {
        w = 3.6;
        const m = pickMat();
        add(-1.3, -0.5, 0.5, 0.5, m); add(1.3, -0.5, 0.5, 0.5, m); add(-1.3, -1.5, 0.5, 0.5, m); add(1.3, -1.5, 0.5, 0.5, m);
        add(0, -2.2, 1.8, 0.2, pickMat());
        slots.push({ x: 0, y: 0, maxR: 0.75 });
        y = -2.4;
        if (f > 1) y = floor(y, false, pickMat(), pickMat());
        if (f > 2) y = floor(y, false, pickMat(), pickMat());
        slots.push({ x: 0, y, maxR: 0.75 });
      } else if (type === 'pyramid') {
        const n = Math.min(4, f + 1); w = n;
        const m = pickMat();
        for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) add((i - (n - r - 1) / 2) * 1.0, -(r + 0.5), 0.5, 0.5, r === n - 1 ? pickMat() : m);
        slots.push({ x: 0, y: -n, maxR: 0.75 });
      } else {
        const n = Math.min(3, f + 1); w = 1.2;
        for (let r = 0; r < n; r++) add(0, -(r + 0.5), 0.5, 0.5, pickMat());
        slots.push({ x: 0, y: -n, maxR: 0.75 });
      }
      return { w, blocks, slots };
    }

    /* ---------------- layout & camera ---------------- */
    layout() {
      if (!this.fit()) return;
      const W = this.W, H = this.H;
      this.gy = Math.round(H * (H > W * 1.1 ? 0.8 : 0.86));
      const left = -4.6, right = this.levelR + 1.5, top = this.levelTop - 2.2;
      this.left = left; this.right = right;
      const full = Math.min(W / (right - left), (this.gy - 16) / -top);
      this.sAim = Math.max(full, W / 32);
      this.sFollow = Math.max(this.sAim, Math.min(W / 17, (this.gy - 16) / Math.max(9, -top)));
      this.skyline = null;
      if (this.camS === 30 || !this.camS) { this.camS = this.sAim; this.camX = this.readyX(); }
    }
    readyX() {
      const vis = this.W / this.camS, span = this.right - this.left;
      if (vis >= span) return this.left - (vis - span) / 2;
      return Math.max(this.left, Math.min(this.right - vis, this.left + this.panX));
    }
    focusX() { const vis = this.W / (this.sFollow || 30); return Math.max(this.left, this.right - vis); }
    camTarget() {
      const st = this.state;
      let s = this.sAim, x;
      if (st === 'fly' || st === 'settle') {
        s = this.sFollow;
        const vis = this.W / s, lead = this.flying.find((b) => !b.dead);
        if (lead) this.followX = lead.x - vis * 0.38 + Math.max(0, lead.vx) * 0.12;
        const fx = this.followX != null ? this.followX : this.camX;
        x = Math.max(this.left, Math.min(Math.max(this.left, this.right - vis), fx));
      } else if (st === 'intro') {
        const u = Math.min(1, this.stT / 1.9), e = u < 0.35 ? 0 : U.easeInOutCubic((u - 0.35) / 0.65);
        s = U.lerp(this.sFollow, this.sAim, e);
        const vis = this.W / s;
        const fx = Math.max(this.left, this.right - vis);
        x = U.lerp(fx, this.readyXFor(s), e);
        return [x, s, true];
      } else x = this.readyXFor(s);
      return [x, s, false];
    }
    readyXFor(s) {
      const vis = this.W / s, span = this.right - this.left;
      if (vis >= span) return this.left - (vis - span) / 2;
      return Math.max(this.left, Math.min(this.right - vis, this.left + this.panX));
    }
    updCam(dt) {
      const [tx, ts, snap] = this.camTarget();
      if (snap) { this.camX = tx; this.camS = ts; }
      else {
        const k = 1 - Math.exp(-dt * (this.state === 'fly' ? 5 : 3.2));
        this.camS += (ts - this.camS) * k;
        this.camX += (tx - this.camX) * (this.drag && this.drag.pan ? 1 : k);
      }
      this.camShake = Math.max(0, this.camShake - dt * 3);
    }
    toScreen(x, y) { return [(x - this.camX) * this.camS, this.gy + y * this.camS]; }
    toWorld(sx, sy) { return [sx / this.camS + this.camX, (sy - this.gy) / this.camS]; }

    /* ---------------- input ---------------- */
    down(e) {
      if (!this.running || this.paused) return;
      A.init && A.init();
      const [sx, sy] = this.local(e);
      if (this.state === 'intro') { this.stT = 9; return; }
      if (this.state === 'fly') { this.ability(); return; }
      if (this.state !== 'ready') return;
      const [wx, wy] = this.toWorld(sx, sy);
      const d = Math.hypot(wx - REST_X, wy - REST_Y), reach = Math.max(1.7, 46 / this.camS);
      try { this.ui.cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      if (d < reach) { this.drag = { aim: true, id: e.pointerId }; this.state = 'aim'; this.pull = { x: REST_X, y: REST_Y }; this.panX = 0; this.aimMove(wx, wy); this.sndStretch(0); }
      else this.drag = { pan: true, id: e.pointerId, sx, p0: this.panX };
    }
    move(e) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const [sx, sy] = this.local(e);
      if (this.drag.pan) {
        const span = this.right - this.left, vis = this.W / this.camS;
        this.panX = Math.max(0, Math.min(Math.max(0, span - vis), this.drag.p0 - (sx - this.drag.sx) / this.camS));
        return;
      }
      if (this.state === 'aim') { const [wx, wy] = this.toWorld(sx, sy); this.aimMove(wx, wy); }
    }
    up(e, cancel) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const d = this.drag; this.drag = null;
      if (d.aim && this.state === 'aim') {
        const dx = this.pull.x - REST_X, dy = this.pull.y - REST_Y, L = Math.hypot(dx, dy);
        if (cancel || L < 0.4) { this.state = 'ready'; this.pull = null; this.springT = this.simT; return; }
        this.fire();
      }
    }
    aimMove(wx, wy) {
      let dx = wx - REST_X, dy = wy - REST_Y;
      const L = Math.hypot(dx, dy);
      if (L > MAX_PULL) { dx *= MAX_PULL / L; dy *= MAX_PULL / L; }
      if (REST_Y + dy > -0.45) dy = -0.45 - REST_Y;
      const before = this.pull ? Math.hypot(this.pull.x - REST_X, this.pull.y - REST_Y) : 0;
      this.pull = { x: REST_X + dx, y: REST_Y + dy };
      const after = Math.hypot(dx, dy);
      if (Math.abs(after - before) > 0.12 || (after > before && Math.floor(after * 4) !== Math.floor(before * 4))) this.sndStretch(after / MAX_PULL);
    }
    launchVel(px, py) { const k = VMAX / MAX_PULL; return [(REST_X - px) * k, (REST_Y - py) * k]; }
    // ballistic preview (no collisions): fills out with [x,y,...]
    traj(px, py, maxT, out) {
      const [vx, vy] = this.launchVel(px, py);
      out = out || [];
      out.length = 0;
      for (let t = 0.04; t < (maxT || 2.6); t += 1 / 24) {
        const x = px + vx * t, y = py + vy * t + 0.5 * GRAV * t * t;
        out.push(x, y);
        if (y > 0 || x > this.right + 4) break;
      }
      return out;
    }

    fire() {
      const type = this.cur.type, B = BIRDS[type], p = this.pull;
      const [vx, vy] = this.launchVel(p.x, p.y);
      const b = this.world.add(mkBody({ shape: 'c', x: p.x, y: p.y, r: B.r, mat: 'bird', kind: 'bird', d: B.d }));
      b.vx = vx; b.vy = vy; b.type = type; b.born = this.simT; b.hitT = null; b.slowT = 0; b.used = type === 'normal';
      this.flying = [b]; this.cur = null; this.pull = null; this.followX = null;
      this.state = 'fly'; this.stT = 0; this.fired++;
      this.trail.length = 0; this.trailT = 0; this.combo = 0;
      this.bandT = this.simT;
      this.sndLaunch();
      this.o.onEvent('shot', { type });
      this.hudUpd();
    }
    ability() {
      const lead = this.flying.find((b) => !b.dead);
      if (!lead || lead.used) return;
      const t = lead.type;
      if ((t === 'split' || t === 'dash') && lead.hitT != null) return;
      lead.used = true;
      this.o.onEvent('special', { type: t });
      const [sx, sy] = this.toScreen(lead.x, lead.y);
      if (t === 'split') {
        const sp = Math.hypot(lead.vx, lead.vy), a0 = Math.atan2(lead.vy, lead.vx);
        lead.dead = true; this.world.dirty = true;
        const nb = [];
        [-0.16, 0, 0.16].forEach((da, i) => {
          const a = a0 + da, nxp = -Math.sin(a0) * (i - 1) * 0.5, nyp = Math.cos(a0) * (i - 1) * 0.5;
          const b = this.world.add(mkBody({ shape: 'c', x: lead.x + nxp, y: lead.y + nyp, r: 0.3, mat: 'bird', kind: 'bird', d: 5 }));
          b.vx = Math.cos(a) * sp * 1.05; b.vy = Math.sin(a) * sp * 1.05; b.type = 'split'; b.mini = true; b.used = true; b.born = this.simT; b.hitT = null; b.slowT = 0;
          nb.push(b);
        });
        this.flying = [nb[1], nb[0], nb[2]];
        this.ring(sx, sy, this.acc2, 50, 3); this.burst(sx, sy, '#3fb6ff', 12, 0.7);
        this.sndSplit();
      } else if (t === 'dash') {
        const sp = Math.hypot(lead.vx, lead.vy) || 1;
        const k = Math.max(32, sp * 1.7) / sp;
        lead.vx *= k; lead.vy *= k; lead.dashT = this.simT;
        this.ring(sx, sy, '#ffc21f', 60, 5); this.camShake = 0.4;
        this.sndDash();
      } else if (t === 'bomb') {
        this.boom(lead);
      }
    }
    boom(b) {
      if (b.exploded) return;
      b.exploded = true; b.used = true; b.dead = true; this.world.dirty = true;
      const R = 3.4;
      const [sx, sy] = this.toScreen(b.x, b.y);
      this.explodeFx(b.x, b.y);
      this.o.fx && this.explode2(sx, sy);
      for (const o of this.world.bodies) {
        if (o.dead || o.im0 === 0 || o === b) continue;
        const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) - o.bound * 0.5;
        if (d > R) continue;
        const u = 1 - Math.max(0, d) / R;
        this.world.wake(o);
        const imp = 26 * u * u + 4 * u, nx = dx / (Math.hypot(dx, dy) || 1), ny = dy / (Math.hypot(dx, dy) || 1);
        o.vx += nx * imp * o.im0 * 0.9; o.vy += (ny - 0.35) * imp * o.im0 * 0.9; o.w += (Math.random() - 0.5) * imp * o.iI0 * 0.3;
        if (o.kind === 'block' || o.kind === 'minion') {
          const dmg = (o.kind === 'minion' ? 9 : o.mat === 'stone' ? 30 : 16) * u;
          this.applyDmg(o, dmg, b);
        }
      }
      this.hitStop = 0.09; this.camShake = 1; this.shake(400);
      this.sndBoom();
    }
    explode2(sx, sy) { this.explode(sx, sy, 2.2, ['#ffb43a', '#ffffff', this.acc1]); }

    /* ---------------- damage / hits ---------------- */
    onHit(ar, imp, sp) {
      const a = ar.a, b = ar.b, c = ar.cs[0];
      // impact effects
      if (imp > 2.2 && this.sndN < 3) {
        const tgt = a.kind === 'bird' ? b : a.kind === 'ground' ? b : a;
        const mat = (tgt.kind === 'block' || tgt.kind === 'rock') ? tgt.mat : b.kind === 'block' ? b.mat : null;
        this.sndN++;
        this.sndHit(mat || 'thud', Math.min(1, imp / 16));
        if (imp > 5) this.dust(c.x, c.y, Math.min(6, 2 + imp / 6));
      }
      if (a.kind === 'bird') this.birdHit(a, imp); if (b.kind === 'bird') this.birdHit(b, imp);
      const ka = this.dmgFrom(a, b, imp), kb = this.dmgFrom(b, a, imp);
      if (ka && b.kind === 'bird') this.plow(b, a);
      if (kb && a.kind === 'bird') this.plow(a, b);
    }
    birdHit(bird, imp) {
      if (bird.hitT == null) { bird.hitT = this.simT; if (bird.type === 'bomb' && !bird.used) bird.fuse = this.simT; }
      if (imp > 4) { bird.squash = this.simT; bird.face = 'dizzy'; }
    }
    plow(bird, broke) {
      const k = broke.kind === 'minion' ? 0.85 : broke.mat === 'glass' ? (bird.type === 'split' ? 0.9 : 0.8) : broke.mat === 'wood' ? (bird.type === 'dash' ? 0.8 : 0.6) : 0.45;
      bird.vx *= k; bird.vy *= k;
    }
    dmgFrom(tgt, att, imp) {
      if (tgt.dead || (tgt.kind !== 'block' && tgt.kind !== 'minion')) return false;
      let m = 1;
      const tk = tgt.kind === 'minion' ? 'minion' : tgt.mat;
      if (att.kind === 'bird') { m = BIRDS[att.type].mul[tk]; if (att.dashT != null && this.simT - att.dashT < 1.5) m *= 1.25; }
      else if (att.kind === 'ground' || att.kind === 'rock') m = tgt.kind === 'minion' ? 0.9 : 0.5;
      else if (tgt.kind === 'minion') m = 1.4;
      const d = imp * m - (tgt.kind === 'minion' ? 0.35 : 0.9);
      if (d <= 0) return false;
      return this.applyDmg(tgt, d, att);
    }
    applyDmg(tgt, d, att) {
      if (tgt.dead) return false;
      const before = tgt.hp;
      tgt.hp -= d; tgt.hurtT = this.simT;
      if (tgt.kind === 'block') { const pts = Math.round(Math.min(before, d) * 8) * 5; this.score += pts; }
      else if (tgt.kind === 'minion' && tgt.hp > 0 && d > 0.4) { tgt.face = 'hurt'; this.sndOuch(); }
      if (tgt.hp <= 0) { this.kill(tgt); return true; }
      return false;
    }
    kill(b) {
      if (b.dead) return;
      b.dead = true; this.world.dirty = true;
      for (const o of this.world.bodies) {
        if (o.dead || !o.sleep) continue;
        const dx = o.x - b.x, dy = o.y - b.y, rr = o.bound + b.bound + 0.5;
        if (dx * dx + dy * dy < rr * rr) this.world.wake(o);
      }
      const [sx, sy] = this.toScreen(b.x, b.y);
      const now = this.simT;
      this.combo = now - this.comboT < 1.1 ? this.combo + 1 : 1; this.comboT = now;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (b.kind === 'block') {
        const pts = MAT[b.mat].pts; this.score += pts; this.blockPts += pts;
        this.debris(b);
        if (b.mat === 'glass') this.shards(sx, sy, '#bff4ff', 6, 6);
        this.sndBreak(b.mat);
        this.pop(sx, sy - 8, '+' + pts, b.mat === 'glass' ? '#9fefff' : b.mat === 'wood' ? '#ffcf7a' : '#d8d4ec', 15);
        this.o.onEvent('break', { mat: b.mat });
      } else if (b.kind === 'minion') {
        this.score += 5000; this.minionKills++;
        this.poof(b);
        this.burst(sx, sy, this.acc1, 16, 0.9); this.ring(sx, sy, '#c9a6ff', 60, 4);
        this.pop(sx, sy - 14, '+5000', '#ffe27a', 24);
        this.hitStop = Math.max(this.hitStop, 0.07); this.camShake = Math.max(this.camShake, 0.5);
        this.sndPop(this.combo);
        this.o.onEvent('minion', { left: this.minionsLeft() });
        if (this.minionsLeft() === 0) { this.banner('미니언 전멸!', 'good', 1500); this.sndAllClear(); this.shake(350); }
      }
      if (this.combo >= 3) {
        this.ui.info.querySelector('.mg-combo') && this.ui.info.querySelector('.mg-combo').classList.add('pop');
        if (this.combo === 3 || this.combo % 3 === 0) { this.pop(sx, sy - 40, `${this.combo} 연쇄!`, '#ff8ad8', 20 + Math.min(14, this.combo)); this.o.onEvent('combo', { n: this.combo }); }
        if (this.combo === 8) this.banner('대붕괴!', 'good');
      }
      this.hudUpd();
    }
    minionsLeft() { let n = 0; for (const m of this.minions) if (!m.dead) n++; return n; }

    /* ---------------- world particles ---------------- */
    part(o) { if (this.parts.length < 260) this.parts.push(o); }
    debris(b) {
      const cols = b.mat === 'wood' ? ['#e7a458', '#b8692b', '#8a4a1a'] : b.mat === 'glass' ? ['#c8f6ff', '#8fdcff', '#ffffff'] : ['#b8b4cc', '#8a85a2', '#5d5876'];
      const n = Math.min(12, 5 + Math.round(b.hw * b.hh * 10));
      for (let i = 0; i < n; i++) {
        const lx = (Math.random() * 2 - 1) * b.hw, ly = (Math.random() * 2 - 1) * b.hh;
        this.part({ k: 'chip', x: b.x + b.c * lx - b.s * ly, y: b.y + b.s * lx + b.c * ly, vx: b.vx * 0.5 + (Math.random() - 0.5) * 7, vy: b.vy * 0.5 - Math.random() * 6, life: 0.9 + Math.random() * 0.6, age: 0,
          s: 0.1 + Math.random() * 0.18, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, c: cols[i % 3], g: 1, tri: b.mat === 'glass' });
      }
      for (let i = 0; i < 3; i++) this.part({ k: 'smoke', x: b.x + (Math.random() - 0.5) * b.hw, y: b.y + (Math.random() - 0.5) * b.hh, vx: (Math.random() - 0.5) * 1.5, vy: -0.6 - Math.random(), life: 0.7, age: 0, s: 0.5 + Math.random() * 0.4, c: 'rgba(230,220,255,0.35)' });
    }
    dust(x, y, n) { for (let i = 0; i < n; i++) this.part({ k: 'smoke', x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.5, life: 0.5 + Math.random() * 0.3, age: 0, s: 0.25 + Math.random() * 0.25, c: 'rgba(255,240,220,0.4)' }); }
    poof(b) {
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; this.part({ k: 'smoke', x: b.x + Math.cos(a) * b.r * 0.6, y: b.y + Math.sin(a) * b.r * 0.6, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2 - 0.6, life: 0.8, age: 0, s: b.r * 1.1, c: 'rgba(150,100,230,0.55)' }); }
      for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; this.part({ k: 'star', x: b.x, y: b.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5 - 2, life: 0.8, age: 0, s: 0.22, c: '#ffe27a', g: 0.4 }); }
      this.part({ k: 'mask', x: b.x, y: b.y - b.r * 0.2, vx: (Math.random() - 0.3) * 3, vy: -7, life: 1.4, age: 0, s: b.r, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * 8, g: 1 });
    }
    feathers(b) {
      const col = BIRDS[b.type].col;
      for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; this.part({ k: 'feather', x: b.x, y: b.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2, life: 1.2, age: 0, s: 0.2, rot: a, vr: (Math.random() - 0.5) * 6, c: col, g: 0.15 }); }
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; this.part({ k: 'smoke', x: b.x, y: b.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 0.6, age: 0, s: b.r * 1.2, c: 'rgba(255,255,255,0.5)' }); }
    }
    explodeFx(x, y) {
      for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, v = 3 + Math.random() * 6; this.part({ k: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0.9, age: 0, s: 0.6 + Math.random() * 0.6, c: i % 2 ? 'rgba(255,170,60,0.6)' : 'rgba(120,90,160,0.5)' }); }
      this.part({ k: 'flash', x, y, vx: 0, vy: 0, life: 0.35, age: 0, s: 4.2, c: '#fff' });
    }

    /* ---------------- tools / end ---------------- */
    tool(id) {
      if (id !== 'aim') return;
      if (this.aimOn) { this.banner('조준선이 이미 켜져 있어요', 'info'); return; }
      if (!this.pay(this.p.aimCost, '조준선에')) return;
      this.aimOn = true; this.aimBtn.disabled = true;
      this.banner('🎯 조준선 ON!', 'info');
      A.qHint && A.qHint();
      this.o.onEvent('tool', { id: 'aim' });
    }
    resume() {
      for (let i = 0; i < this.p.extendShots; i++) this.queue.push(this.p.types[Math.floor(this.rnd() * this.p.types.length)]);
      this.running = true; this.paused = false;
      this.banner(`${this.p.extendText} 추가!`, 'good');
      this.loadNext();
      this.hudUpd();
    }
    cheat() { for (const m of this.minions) if (!m.dead) { m.dead = true; this.score += 5000; } this.win({ rows: [] }); }
    stars() { const s = this.starT; return this.score >= s[2] ? 3 : this.score >= s[1] ? 2 : 1; }
    loadNext() {
      if (!this.queue.length) return;
      this.cur = { type: this.queue.shift(), t0: this.simT };
      this.state = 'load'; this.stT = 0; this.panX = 0;
      this.hudUpd();
    }
    finish() {
      const n = this.spareN || 0, rows = [];
      if (n) rows.push([`남은 새 ${n}마리`, n * this.p.spareCoin]);
      if (this.maxCombo >= 3) rows.push([`최대 ${this.maxCombo} 연쇄`, Math.min(120, this.maxCombo * this.p.comboCoin)]);
      this.state = 'done';
      this.o.onEvent('clear', { stars: this.stars(), spare: n });
      this.win({ rows, maxCombo: this.maxCombo });
    }

    hudUpd() {
      const left = this.minionsLeft(), tot = this.minionTotal;
      const shots = this.queue.length + (this.cur ? 1 : 0);
      this.meter(tot ? (tot - left) / tot : 0, `미니언 ${left} / ${tot}`, false);
      this.ui.sub.textContent = `${this.o.stage}판`;
      this.info(`<span>🐦 ${shots}</span><span>⭐ ${U.fmt(this.score)}</span><span class="mg-combo">${this.combo >= 3 ? 'x' + this.combo : ''}</span>`);
    }

    /* ---------------- update ---------------- */
    update(dt) {
      this.sndN = 0;
      let sdt = dt;
      if (this.hitStop > 0) { this.hitStop -= dt; sdt = dt * 0.2; }
      this.acc += sdt;
      let n = 0;
      while (this.acc >= DT && n < 4) { this.world.step(DT); this.simT += DT; this.post(DT); this.acc -= DT; n++; }
      if (n === 4) this.acc = 0;
      this.stT += dt;
      this.tickParts(sdt);
      switch (this.state) {
        case 'intro':
          if (!this.introB) { this.introB = true; this.banner(`미니언 ${this.minionTotal}마리를 물리쳐요!`, 'info', 1600); }
          if (this.stT > 2.0) this.loadNext();
          break;
        case 'load':
          if (this.stT > 0.45) {
            this.state = 'ready'; this.sndChirp();
            if (this.cur && this.cur.type !== 'normal' && !this.taught) { this.taught = true; this.banner(`${BIRDS[this.cur.type].name}: 날 때 탭!`, 'info', 1700); }
          }
          break;
        case 'fly': {
          if (!this.flying.some((b) => !b.dead)) { this.state = 'settle'; this.stT = 0; this.quietT = 0; }
          break;
        }
        case 'settle': {
          let moving = false;
          for (const b of this.world.bodies) if (!b.dead && b.im > 0 && (b.vx * b.vx + b.vy * b.vy > 0.12 || b.w * b.w > 0.12)) { moving = true; break; }
          this.quietT = moving ? 0 : this.quietT + dt;
          const left = this.minionsLeft();
          if (this.quietT > 0.45 || this.stT > (left ? 5 : 2.5)) {
            if (!left) { this.state = 'bonus'; this.stT = 0; this.spareN = 0; this.bonusI = 0; }
            else if (this.queue.length) this.loadNext();
            else { this.state = 'lost'; this.lose('moves'); }
          }
          break;
        }
        case 'bonus':
          if (this.stT > 0.5 && this.queue.length) {
            this.stT = 0.15;
            const i = this.bonusI++;
            const [qx, qy] = this.queuePos(0);
            const [sx, sy] = this.toScreen(qx, qy);
            this.queue.shift(); this.spareN++;
            this.score += 10000;
            this.pop(sx, sy - 20, '+10000', '#ffe27a', 22); this.burst(sx, sy, '#ffe27a', 14, 0.8);
            this.sndBonus(i); this.hudUpd();
          } else if (this.stT > 0.9 && !this.queue.length) this.finish();
          break;
      }
      this.updCam(dt);
    }
    post(dt) {
      const W = this.world;
      // birds: trail, fuse, spent detection
      for (const b of this.flying) {
        if (b.dead) continue;
        if (b.hitT == null && b === this.flying[0]) {
          this.trailT = (this.trailT || 0) + dt;
          if (this.trailT > 0.045 && this.trail.length < 160) { this.trailT = 0; this.trail.push(b.x, b.y, this.trail.length % 4 ? 0.09 : 0.15); }
        }
        if (b.type === 'bomb' && b.fuse != null && !b.exploded && this.simT - b.fuse > 1.1) { this.boom(b); continue; }
        const sp = b.vx * b.vx + b.vy * b.vy;
        if (b.hitT != null) { b.slowT = sp < 0.5 ? b.slowT + dt : 0; }
        const age = this.simT - b.born;
        const done = (b.hitT != null && (b.slowT > 0.6 || this.simT - b.hitT > (this.minionsLeft() ? 3.5 : 1.5))) || age > 8 || b.x > this.right + 12 || b.x < -12;
        if (done) {
          if (b.type === 'bomb' && !b.exploded && b.hitT != null) { this.boom(b); continue; }
          b.dead = true; W.dirty = true; this.feathers(b); this.sndPoof();
        }
      }
      // out of world
      for (const b of W.bodies) {
        if (b.dead || b.im0 === 0) continue;
        if (b.x < this.left - 10 || b.x > this.right + 18 || b.y < -60) {
          if (b.kind === 'minion') this.kill(b); else { b.dead = true; W.dirty = true; }
        }
      }
      if (W.dirty) { W.bodies = W.bodies.filter((b) => !b.dead); W.dirty = false; }
    }
    tickParts(dt) {
      const P = this.parts;
      let j = 0;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        p.age += dt;
        if (p.age >= p.life) continue;
        if (p.g) p.vy += GRAV * p.g * dt;
        if (p.k === 'smoke') { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += (p.vr || 0) * dt;
        if (p.k === 'chip' && p.y > -p.s * 0.5) { p.y = -p.s * 0.5; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
        P[j++] = p;
      }
      P.length = j;
    }
    queuePos(i) { const r = 0.45; return [-1.3 - i * 1.05, -r]; }

    /* ---------------- draw ---------------- */
    draw(t, dt) {
      const g = this.ctx, W = this.W, H = this.H;
      if (!W) return;
      const dpr = this.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const shx = this.camShake > 0 ? (Math.random() - 0.5) * this.camShake * 8 : 0, shy = this.camShake > 0 ? (Math.random() - 0.5) * this.camShake * 8 : 0;
      this.ox = -this.camX * this.camS + shx; this.oy = this.gy + shy;
      g.save();
      rrect(g, 0, 0, W, H, 18); g.clip();
      this.drawBack(g, t);
      // world
      const s = this.camS;
      g.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.ox, dpr * this.oy);
      this.drawTrail(g);
      this.drawSlingBack(g, t);
      this.drawQueue(g, t);
      for (const b of this.world.bodies) if (b.kind === 'rock') this.drawBlock(g, b);
      for (const b of this.world.bodies) if (b.kind === 'block') this.drawBlock(g, b);
      for (const b of this.world.bodies) if (b.kind === 'minion') this.drawMinion(g, b, t);
      for (const b of this.world.bodies) if (b.kind === 'bird') this.drawBird(g, b, t);
      this.drawLoaded(g, t);
      this.drawSlingFront(g, t);
      this.drawParts(g);
      this.drawAim(g, t);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawOverlay(g, t);
      g.restore();
      // glass frame
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      rrect(g, 1, 1, W - 2, H - 2, 18);
      g.strokeStyle = U.rgba(this.acc1, 0.55); g.lineWidth = 2; g.stroke();
      rrect(g, 4, 4, W - 8, H - 8, 15); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.stroke();
    }
    drawBack(g, t) {
      const W = this.W, H = this.H, gy = this.oy;
      const sky = g.createLinearGradient(0, 0, 0, gy);
      sky.addColorStop(0, U.rgba(this.sc[0], 0.55)); sky.addColorStop(0.7, U.rgba(this.sc[0], 0.25)); sky.addColorStop(1, U.rgba(this.sc[1], 0.22));
      g.fillStyle = sky; g.fillRect(0, 0, W, gy);
      // moon
      const mx = W * 0.82 - this.camX * this.camS * 0.03, my = Math.min(gy * 0.28, 90);
      const glow = root.FxSprites && root.FxSprites.glow(this.acc2);
      if (glow) { g.globalAlpha = 0.35; g.drawImage(glow, mx - 90, my - 90, 180, 180); g.globalAlpha = 1; }
      const mg = g.createRadialGradient(mx - 8, my - 8, 2, mx, my, 26); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, U.rgba(this.acc2, 0.6));
      g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 24, 0, TAU); g.fill();
      // twinkles
      for (let i = 0; i < 18; i++) {
        const x = ((i * 137.5 + 40) % 997) / 997 * W, y = ((i * 71.3 + 13) % 613) / 613 * gy * 0.6;
        const a = 0.25 + 0.5 * Math.max(0, Math.sin(t * 1.7 + i * 1.3));
        g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, 2, 2);
      }
      // skyline parallax
      if (!this.skyline || this.skyline.height !== Math.ceil(gy * this.dpr)) this.makeSkyline(gy);
      const sk = this.skyline, tw = sk.width / this.dpr;
      [[0.12, 0.55, 0], [0.3, 1, 1]].forEach(([par, alpha, layer]) => {
        let off = (-(this.camX * this.camS * par) - layer * 230) % tw; if (off > 0) off -= tw;
        g.globalAlpha = alpha;
        for (let x = off; x < W; x += tw) g.drawImage(sk, 0, layer ? 0 : 0, sk.width, sk.height, x, layer ? 0 : -gy * 0.12, tw, gy);
        g.globalAlpha = 1;
      });
      // ground
      const gg = g.createLinearGradient(0, gy, 0, H);
      gg.addColorStop(0, U.shade(this.sc[1], -0.55)); gg.addColorStop(0.12, U.shade(this.sc[0], -0.1)); gg.addColorStop(1, 'rgba(5,2,12,0.95)');
      g.fillStyle = gg; g.fillRect(0, gy, W, H - gy);
      // marble seams
      const s = this.camS;
      g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
      const x0 = Math.floor(this.camX / 2) * 2;
      for (let x = x0; x < this.camX + W / s + 2; x += 2) {
        const sx = this.ox + x * s;
        g.beginPath(); g.moveTo(sx, gy + 6); g.lineTo(sx - (H - gy) * 0.5, H); g.stroke();
      }
      const gl = g.createLinearGradient(0, gy - 14, 0, gy + 4);
      gl.addColorStop(0, U.rgba(this.acc1, 0)); gl.addColorStop(1, U.rgba(this.acc1, 0.35));
      g.fillStyle = gl; g.fillRect(0, gy - 14, W, 18);
      g.fillStyle = U.rgba(this.acc1, 0.9); g.fillRect(0, gy, W, 2);
      g.fillStyle = 'rgba(255,230,160,0.55)'; g.fillRect(0, gy + 4, W, 1);
    }
    makeSkyline(gy) {
      const dpr = this.dpr, tw = 760, c = document.createElement('canvas');
      c.width = Math.ceil(tw * dpr); c.height = Math.ceil(gy * dpr);
      const g = c.getContext('2d'); g.scale(dpr, dpr);
      const R = lcg(77), col = U.shade(this.sc[1], -0.55);
      g.fillStyle = U.rgba(this.sc[0], 0.0);
      const base = gy;
      const grad = g.createLinearGradient(0, base * 0.35, 0, base);
      grad.addColorStop(0, U.rgba(this.acc1, 0.22)); grad.addColorStop(1, U.rgba(this.sc[0], 0.5));
      g.fillStyle = grad;
      let x = 0;
      while (x < tw) {
        const w = 40 + R() * 70, h = base * (0.12 + R() * 0.28), kind = R();
        g.beginPath();
        g.rect(x, base - h, w, h);
        if (kind < 0.4) { g.moveTo(x, base - h); g.arc(x + w / 2, base - h, w / 2, Math.PI, 0); }
        else if (kind < 0.7) { g.moveTo(x + w * 0.3, base - h); g.lineTo(x + w / 2, base - h - w * 0.9); g.lineTo(x + w * 0.7, base - h); }
        g.fill();
        g.save(); g.fillStyle = U.rgba(this.acc2, 0.35);
        for (let k = 0; k < 3; k++) { const wx = x + 8 + R() * (w - 16), wy = base - h + 10 + R() * (h - 20); g.fillRect(wx, wy, 3, 5); }
        g.restore();
        x += w + R() * 18;
      }
      g.fillStyle = U.rgba(col.startsWith('#') ? col : this.sc[0], 0.0);
      this.skyline = c;
    }
    xf(g, x, y, a, k) {
      const s = this.camS * this.dpr * (k || 1), c = Math.cos(a), sn = Math.sin(a);
      g.setTransform(s * c, s * sn, -s * sn, s * c, this.dpr * (this.ox + x * this.camS), this.dpr * (this.oy + y * this.camS));
    }
    resetW(g) { const s = this.camS * this.dpr; g.setTransform(s, 0, 0, s, this.dpr * this.ox, this.dpr * this.oy); }
    drawBlock(g, b) {
      const fr = b.hp / b.maxHp, stage = b.kind === 'rock' ? 0 : fr < 0.4 ? 2 : fr < 0.75 ? 1 : 0;
      const spr = b.kind === 'rock' ? b.spr : blockSprite(b.mat, +(b.hw * 2).toFixed(2), +(b.hh * 2).toFixed(2), stage);
      let x = b.x, y = b.y;
      const ht = this.simT - b.hurtT; if (ht < 0.15) x += Math.sin(ht * 90) * 0.04 * (1 - ht / 0.15);
      // soft shadow on ground
      this.xf(g, x, y, b.a);
      const w = b.hw * 2 + BPAD * 2, h = b.hh * 2 + BPAD * 2;
      g.drawImage(spr, -w / 2, -h / 2, w, h);
    }
    drawMinion(g, b, t) {
      const blink = ((t * 0.7 + b.ph) % 3.2) < 0.12;
      const face = b.face === 'hurt' ? 'hurt' : blink ? 'blink' : 'n';
      const spr = minionSprite(face, !!b.helmet, this.acc1, this.acc2);
      const ht = this.simT - b.hurtT;
      const bob = b.sleep ? Math.sin(t * 3 + b.ph) * 0.035 : 0;
      const sq = ht < 0.25 ? Math.sin(ht * 40) * 0.12 * (1 - ht / 0.25) : 0;
      // keep upright-ish: rolling minions wobble but faces stay readable
      const ang = Math.sin(b.a) * 0.6;
      this.xf(g, b.x, b.y, ang, 1);
      g.transform(1 + sq, 0, 0, 1 - sq + bob, 0, 0);
      const S = SW * b.r;
      g.drawImage(spr, -S / 2, -S / 2 - bob * b.r, S, S);
    }
    drawBird(g, b, t) {
      const blink = ((t + b.id) % 2.6) < 0.1;
      const face = b.face === 'dizzy' ? 'dizzy' : blink ? 'blink' : 'n';
      const spr = birdSprite(b.type, face);
      const sp = Math.hypot(b.vx, b.vy);
      let ang = b.hitT == null ? Math.atan2(b.vy, b.vx) : b.a;
      const st = b.hitT == null ? Math.min(0.25, sp / 120) : 0;
      // dash streak
      if (b.dashT != null && this.simT - b.dashT < 0.8 && sp > 1) {
        this.resetW(g);
        const ux = b.vx / sp, uy = b.vy / sp;
        g.strokeStyle = 'rgba(255,220,80,0.55)'; g.lineWidth = b.r * 0.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(b.x - ux * 2.4, b.y - uy * 2.4); g.lineTo(b.x - ux * 0.4, b.y - uy * 0.4); g.stroke();
      }
      if (b.type === 'bomb' && b.fuse != null && !b.exploded) {
        const u = (this.simT - b.fuse) / 1.1;
        if (Math.sin(u * u * 60) > 0) { this.resetW(g); g.fillStyle = 'rgba(255,80,60,0.45)'; g.beginPath(); g.arc(b.x, b.y, b.r * 1.35, 0, TAU); g.fill(); }
      }
      this.xf(g, b.x, b.y, ang);
      const sqT = b.squash != null ? this.simT - b.squash : 9;
      const sq = sqT < 0.2 ? Math.sin((sqT / 0.2) * Math.PI) * 0.25 : 0;
      g.transform(1 + st - sq, 0, 0, 1 - st + sq, 0, 0);
      const S = SW * b.r;
      g.drawImage(spr, -S / 2, -S / 2, S, S);
    }
    drawQueue(g, t) {
      const n = Math.min(6, this.queue.length);
      for (let i = 0; i < n; i++) {
        const type = this.queue[i], B = BIRDS[type];
        const [x] = this.queuePos(i);
        const hop = Math.max(0, Math.sin(t * 4 - i * 0.9)) * 0.18 * (this.state === 'bonus' ? 2 : 1);
        this.xf(g, x, -B.r * 0.92 - hop, 0);
        const S = SW * B.r * 0.92;
        g.drawImage(birdSprite(type, ((t + i * 0.7) % 3) < 0.1 ? 'blink' : 'n'), -S / 2, -S / 2, S, S);
      }
      if (this.queue.length > 6) {
        const [x] = this.queuePos(6);
        this.resetW(g);
        g.fillStyle = '#fff'; g.font = '700 0.55px Oxanium, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('+' + (this.queue.length - 6), x + 0.3, -0.45);
      }
    }
    pouchPos() {
      if (this.state === 'aim' && this.pull) return [this.pull.x, this.pull.y];
      if (this.bandT != null) {
        const u = (this.simT - this.bandT);
        if (u < 0.5) { const k = Math.exp(-u * 8) * Math.cos(u * 30); return [REST_X - 0.9 * k, REST_Y + 0.3 * k]; }
      }
      if (this.springT != null) { const u = this.simT - this.springT; if (u < 0.5) { const k = Math.exp(-u * 8) * Math.cos(u * 30) * 0.3; return [REST_X - k, REST_Y + k * 0.3]; } }
      return [REST_X, REST_Y];
    }
    drawSlingBack(g) {
      this.resetW(g);
      // back arm
      this.slingArm(g, -0.32, -2.55, true);
      const [px, py] = this.pouchPos();
      g.strokeStyle = '#4a1530'; g.lineWidth = 0.16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-0.3, -2.4); g.lineTo(px - 0.1, py); g.stroke();
    }
    slingArm(g, tx, ty, back) {
      const wood = g.createLinearGradient(-0.3, 0, 0.3, 0);
      wood.addColorStop(0, back ? '#6d3a1a' : '#8a4a20'); wood.addColorStop(0.5, back ? '#a2622c' : '#d08a44'); wood.addColorStop(1, back ? '#5a2f12' : '#7a3e18');
      g.strokeStyle = wood; g.lineCap = 'round'; g.lineWidth = 0.32;
      if (!back) { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -1.45); g.stroke(); }
      g.lineWidth = 0.26;
      g.beginPath(); g.moveTo(0, -1.4); g.quadraticCurveTo(tx * 0.3, -1.9, tx, ty); g.stroke();
      // gold bands
      g.strokeStyle = '#ffd23f'; g.lineWidth = 0.08;
      g.beginPath(); g.moveTo(tx - 0.13, ty + 0.25); g.lineTo(tx + 0.13, ty + 0.25); g.stroke();
      if (!back) {
        g.beginPath(); g.moveTo(-0.17, -0.5); g.lineTo(0.17, -0.5); g.stroke();
        // star gem at the fork
        const sg = g.createRadialGradient(0, -1.45, 0, 0, -1.45, 0.24); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, this.acc2); sg.addColorStop(1, U.shade(this.acc2, -0.4));
        g.fillStyle = sg; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.1 : 0.24, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * r, -1.45 + Math.sin(a) * r); }
        g.closePath(); g.fill();
      }
    }
    drawLoaded(g, t) {
      if (!this.cur) return;
      const B = BIRDS[this.cur.type];
      let x, y, a = 0;
      if (this.state === 'load') {
        const u = Math.min(1, this.stT / 0.45), [qx, qy] = this.queuePos(0);
        x = U.lerp(qx, REST_X, u); y = U.lerp(qy, REST_Y, u) - Math.sin(u * Math.PI) * 1.4; a = -u * TAU;
      } else {
        [x, y] = this.pouchPos();
        if (this.state === 'aim') a = Math.atan2(REST_Y - y, REST_X - x);
        else y += Math.sin(t * 5) * 0.03;
      }
      this.xf(g, x, y, a);
      const S = SW * B.r;
      const stretch = this.state === 'aim' && this.pull ? Math.hypot(this.pull.x - REST_X, this.pull.y - REST_Y) / MAX_PULL : 0;
      g.transform(1 - stretch * 0.12, 0, 0, 1 + stretch * 0.08, 0, 0);
      g.drawImage(birdSprite(this.cur.type, ((t * 1.3) % 3) < 0.1 ? 'blink' : 'n'), -S / 2, -S / 2, S, S);
      // pouch leather
      this.resetW(g);
      const [px, py] = this.state === 'load' ? [REST_X, REST_Y] : this.pouchPos();
      g.fillStyle = '#3a1226';
      g.save(); g.translate(px, py); g.rotate(this.state === 'aim' ? a : 0);
      rrect(g, -B.r - 0.12, -0.28, 0.24, 0.56, 0.1); g.fill(); g.restore();
    }
    drawSlingFront(g) {
      this.resetW(g);
      const [px, py] = this.pouchPos();
      g.strokeStyle = '#5c1c3c'; g.lineWidth = 0.18; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.32, -2.4); g.lineTo(px - 0.15, py + 0.05); g.stroke();
      this.slingArm(g, 0.32, -2.55, false);
    }
    drawTrail(g) {
      const T = this.trail;
      if (!T.length) return;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < T.length; i += 3) { g.beginPath(); g.arc(T[i], T[i + 1], T[i + 2], 0, TAU); g.fill(); }
    }
    drawAim(g, t) {
      if (this.state !== 'aim' || !this.pull) {
        // tutorial hint: ghost drag arrow
        if (this.state === 'ready' && this.fired === 0 && this.o.stage <= 2) {
          const u = (t * 0.8) % 1, e = U.easeInOutCubic(Math.min(1, u * 1.4));
          const hx = REST_X - e * 1.5, hy = REST_Y + e * 0.9;
          this.resetW(g);
          g.globalAlpha = 0.85 * (1 - Math.max(0, u - 0.8) * 5);
          g.font = '1.1px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('👆', hx + 0.2, hy + 0.65);
          g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 0.06; g.setLineDash([0.15, 0.15]);
          g.beginPath(); g.moveTo(REST_X, REST_Y); g.lineTo(REST_X - 1.5, REST_Y + 0.9); g.stroke(); g.setLineDash([]);
          g.globalAlpha = 1;
        }
        return;
      }
      const L = Math.hypot(this.pull.x - REST_X, this.pull.y - REST_Y) / MAX_PULL;
      this.resetW(g);
      // power ring
      g.strokeStyle = U.rgba(this.acc1, 0.25); g.lineWidth = 0.05;
      g.beginPath(); g.arc(REST_X, REST_Y, MAX_PULL, 0, TAU); g.stroke();
      g.strokeStyle = L > 0.95 ? '#ffe27a' : U.rgba(this.acc2, 0.8); g.lineWidth = 0.09;
      g.beginPath(); g.arc(REST_X, REST_Y, MAX_PULL, -Math.PI / 2, -Math.PI / 2 + L * TAU); g.stroke();
      const pts = this.traj(this.pull.x, this.pull.y, this.aimOn ? 2.6 : 0.32, this.trajBuf || (this.trajBuf = []));
      for (let i = 0, k = 0; i < pts.length; i += 2, k++) {
        const u = k / (pts.length / 2), r = this.aimOn ? 0.13 * (1 - u * 0.5) : 0.1;
        const ph = ((t * 3 + k * 0.25) % 1);
        g.fillStyle = this.aimOn ? `rgba(255,255,255,${0.9 - u * 0.5})` : `rgba(255,255,255,${0.6 - u})`;
        g.beginPath(); g.arc(pts[i], pts[i + 1], r * (0.85 + ph * 0.3), 0, TAU); g.fill();
      }
    }
    drawParts(g) {
      const P = this.parts;
      for (let i = 0; i < P.length; i++) {
        const p = P[i], u = p.age / p.life;
        if (p.k === 'chip') {
          this.xf(g, p.x, p.y, p.rot); g.globalAlpha = 1 - Math.max(0, u - 0.7) / 0.3;
          g.fillStyle = p.c;
          if (p.tri) { g.beginPath(); g.moveTo(0, -p.s); g.lineTo(p.s * 0.8, p.s * 0.6); g.lineTo(-p.s * 0.7, p.s * 0.4); g.closePath(); g.fill(); }
          else g.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9);
        } else if (p.k === 'smoke') {
          this.resetW(g); g.globalAlpha = (1 - u) * 0.9; g.fillStyle = p.c;
          g.beginPath(); g.arc(p.x, p.y, p.s * (0.6 + u * 0.9), 0, TAU); g.fill();
        } else if (p.k === 'star') {
          this.xf(g, p.x, p.y, p.age * 6); g.globalAlpha = 1 - u; g.fillStyle = p.c;
          g.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? p.s * 0.35 : p.s, a = (k * Math.PI) / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        } else if (p.k === 'feather') {
          this.xf(g, p.x, p.y, p.rot); g.globalAlpha = 1 - u; g.fillStyle = p.c;
          g.beginPath(); g.ellipse(0, 0, p.s * 1.4, p.s * 0.5, 0, 0, TAU); g.fill();
        } else if (p.k === 'mask') {
          this.xf(g, p.x, p.y, p.rot); g.globalAlpha = 1 - Math.max(0, u - 0.6) / 0.4;
          g.fillStyle = '#f2ecff'; g.strokeStyle = '#2a1645'; g.lineWidth = 0.05;
          const s = p.s; g.beginPath(); g.ellipse(-s * 0.4, 0, s * 0.42, s * 0.26, 0.2, 0, TAU); g.ellipse(s * 0.4, 0, s * 0.42, s * 0.26, -0.2, 0, TAU); g.fill(); g.stroke();
        } else if (p.k === 'flash') {
          this.resetW(g); g.globalAlpha = (1 - u) * 0.85;
          const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * (0.5 + u));
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, 'rgba(255,200,90,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.s * (0.5 + u), 0, TAU); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    drawOverlay(g, t) {
      // off-screen bird indicator
      const lead = this.flying.find((b) => !b.dead);
      if (lead) {
        const [sx, sy] = this.toScreen(lead.x, lead.y);
        if (sy < -10) {
          const x = Math.max(20, Math.min(this.W - 20, sx));
          g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(x, 22, 15, 0, TAU); g.fill();
          g.strokeStyle = BIRDS[lead.type].col; g.lineWidth = 2; g.stroke();
          g.drawImage(birdSprite(lead.type, 'n'), x - 14, 8, 28, 28);
          g.fillStyle = '#fff'; g.font = '700 10px Oxanium, sans-serif'; g.textAlign = 'center';
          g.fillText(Math.round(-lead.y) + 'm', x, 48);
        }
      }
      // tap hint for specials
      if (this.state === 'fly' && lead && !lead.used && lead.hitT == null) {
        const a = 0.6 + 0.4 * Math.sin(t * 10);
        g.globalAlpha = a; g.fillStyle = '#fff'; g.font = '400 18px "Black Han Sans", sans-serif'; g.textAlign = 'center';
        g.fillText('탭!', this.W / 2, 34); g.globalAlpha = 1;
      }
      // pan hint
      if (this.state === 'ready' && this.panX > 0.5) {
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '700 12px "Noto Sans KR", sans-serif'; g.textAlign = 'center';
        g.fillText('새를 당기면 돌아와요', this.W / 2, this.H - 10);
      }
    }

    /* ---------------- sounds (A.kit) ---------------- */
    k() { return A.kit && A.kit.ok() ? A.kit : null; }
    sndStretch(u) {
      const k = this.k(); if (!k) return; const now = performance.now();
      if (now - (this.lastStr || 0) < 60) return; this.lastStr = now;
      const t = k.now(); k.tone('triangle', 160 + u * 280, 200 + u * 320, t, 0.07, 0.05);
    }
    sndLaunch() {
      const k = this.k(); if (!k) return; const t = k.now();
      k.noise(t, 0.3, 0.3, 'bandpass', 500, 1.2, { sweep: 4000 });
      k.tone('sine', 260, 900, t, 0.18, 0.18);
      k.play('pluck', k.note(4, 0), t, 0.2, 0.35);
      k.tone('sine', 1400, 2200, t + 0.05, 0.08, 0.06);
    }
    sndChirp() {
      const k = this.k(); if (!k) return; const t = k.now();
      k.tone('sine', 1500, 2300, t, 0.06, 0.08); k.tone('sine', 2100, 1600, t + 0.07, 0.07, 0.07);
    }
    sndHit(mat, v) {
      const k = this.k(); if (!k) return; const t = k.now();
      if (mat === 'glass') { k.play('celesta', k.note(7 + Math.floor(Math.random() * 4), 2), t, 0.15, 0.2 * v + 0.05); k.noise(t, 0.05, 0.15 * v, 'highpass', 5000, 1); }
      else if (mat === 'stone' || mat === 'rock') { k.tone('sine', 140, 60, t, 0.14, 0.35 * v + 0.05); k.noise(t, 0.08, 0.2 * v, 'lowpass', 700, 1); }
      else if (mat === 'wood') { k.play('marimba', k.note(Math.floor(Math.random() * 3), 0), t, 0.1, 0.3 * v + 0.08); k.noise(t, 0.05, 0.15 * v, 'bandpass', 900, 2); }
      else { k.tone('sine', 200, 80, t, 0.1, 0.3 * v); k.noise(t, 0.06, 0.12 * v, 'lowpass', 600, 1); }
    }
    sndBreak(mat) {
      const k = this.k(); if (!k) return; const t = k.now();
      if (mat === 'glass') {
        k.noise(t, 0.35, 0.3, 'highpass', 3500, 0.8);
        for (let i = 0; i < 4; i++) k.tone('sine', 2600 + Math.random() * 3000, 2400 + Math.random() * 2500, t + i * 0.025, 0.12, 0.05, { prio: 0 });
      } else if (mat === 'wood') {
        k.noise(t, 0.2, 0.35, 'bandpass', 1500, 1.5, { sweep: 500 });
        k.tone('square', 170, 70, t, 0.09, 0.05);
        k.noise(t + 0.05, 0.08, 0.2, 'bandpass', 2500, 3);
      } else {
        k.noise(t, 0.4, 0.4, 'lowpass', 1400, 1, { sweep: 220 });
        k.tone('sine', 110, 40, t, 0.3, 0.4);
      }
    }
    sndPop(combo) {
      const k = this.k(); if (!k) return; const t = k.now(), c = Math.min(combo || 1, 10);
      k.tone('sine', 420, 1500, t, 0.09, 0.3);
      k.noise(t, 0.08, 0.2, 'bandpass', 2400, 2);
      k.play('bell', k.note(c + 3, 1), t + 0.03, 0.3, 0.3);
      k.play('celesta', k.note(c + 7, 1), t + 0.08, 0.3, 0.22);
    }
    sndOuch() { const k = this.k(); if (!k) return; const t = k.now(); k.tone('sine', 700, 380, t, 0.12, 0.12); }
    sndPoof() { const k = this.k(); if (!k) return; const t = k.now(); k.noise(t, 0.25, 0.15, 'bandpass', 900, 1, { sweep: 300 }); }
    sndSplit() {
      const k = this.k(); if (!k) return; const t = k.now();
      [0, 2, 4].forEach((d, i) => k.play('celesta', k.note(d + 7, 1), t + i * 0.04, 0.2, 0.3));
      k.noise(t, 0.2, 0.2, 'highpass', 3000, 1);
    }
    sndDash() {
      const k = this.k(); if (!k) return; const t = k.now();
      k.noise(t, 0.4, 0.35, 'bandpass', 600, 1.4, { sweep: 6000 });
      k.tone('sawtooth', 300, 1800, t, 0.25, 0.08);
    }
    sndBoom() {
      if (A.bomb) { A.bomb(1); return; }
      const k = this.k(); if (!k) return; const t = k.now();
      k.tone('sine', 110, 30, t, 0.5, 0.6); k.noise(t, 0.5, 0.45, 'lowpass', 2600, 1, { sweep: 180 });
    }
    sndBonus(i) {
      const k = this.k(); if (!k) return; const t = k.now();
      k.play('bell', k.note(i * 2 + 5, 1), t, 0.4, 0.35); k.play('celesta', k.note(i * 2 + 9, 1), t + 0.06, 0.3, 0.25);
      k.tone('sine', 2400, 3200, t, 0.06, 0.05);
    }
    sndAllClear() {
      const k = this.k(); if (!k) return; const t = k.now();
      [0, 2, 4, 7, 9].forEach((d, i) => k.play('marimba', k.note(d + 5, 1), t + 0.15 + i * 0.07, 0.25, 0.32));
      k.play('bell', k.note(14, 1), t + 0.55, 0.8, 0.3);
    }
  }

  root.QuestGames.sling = Sling;
})(window);
