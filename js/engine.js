/* Slot math engine: grid generation, win evaluation, cascades and bonus features.
   Pure logic (no DOM) so it can run in node for RTP calibration (tools/simulate.js). */
(function (root) {
  const U = root.U || require('./util.js');

  const CLUSTER_F = { 5: 0.25, 6: 0.4, 7: 0.6, 8: 0.8, 9: 1, 10: 1.5, 11: 2, 12: 3, 13: 4, 14: 6, 15: 10 };
  const SCATTERPAY_F = [[12, 6], [10, 2], [8, 0.6]];

  /* ---------- paylines ---------- */
  function genPaylines(reels, rows, count) {
    if (rows === 1) return [new Array(reels).fill(0)];
    const all = [];
    const rec = (seq) => {
      if (seq.length === reels) { all.push(seq.slice()); return; }
      for (let r = 0; r < rows; r++) {
        if (seq.length && Math.abs(seq[seq.length - 1] - r) > 1) continue;
        seq.push(r); rec(seq); seq.pop();
      }
    };
    rec([]);
    const mid = (rows - 1) / 2;
    const score = (s) => {
      const straight = s.every((v) => v === s[0]);
      let sym = true;
      for (let i = 0; i < reels; i++) if (s[i] !== s[reels - 1 - i]) sym = false;
      let changes = 0;
      for (let i = 1; i < reels; i++) if (s[i] !== s[i - 1]) changes++;
      const centre = Math.abs(s[0] - mid);
      return (straight ? 0 : 1000) + (sym ? 0 : 100) + changes * 10 + centre;
    };
    all.sort((a, b) => score(a) - score(b) || a.join('').localeCompare(b.join('')));
    // order straight rows middle-first
    return all.slice(0, Math.min(count, all.length));
  }

  /* ---------- machine preparation ---------- */
  function payLadder(mech, reels, b) {
    if (mech === 'cluster') {
      const p = {};
      for (const k in CLUSTER_F) p[k] = +(CLUSTER_F[k] * b).toFixed(3);
      return p;
    }
    if (mech === 'scatter') {
      const p = {};
      for (const [c, f] of SCATTERPAY_F) p[c] = +(f * b).toFixed(3);
      return p;
    }
    if (reels === 3) return { 3: Math.round(10 * b) };
    if (reels === 4) return { 3: Math.round(5 * b), 4: Math.round(25 * b) };
    if (reels === 5) return { 3: Math.round(5 * b), 4: Math.round(15 * b), 5: Math.round(50 * b) };
    return { 3: Math.round(4 * b), 4: Math.round(10 * b), 5: Math.round(25 * b), 6: Math.round(75 * b) };
  }

  function prepare(cfg, calib) {
    const m = Object.assign({}, cfg);
    m.feat = cfg.feat || {};
    m.scale = (calib && calib[cfg.id]) || cfg.scale || 1;
    const syms = [];
    const nT = cfg.syms.length;
    const isTumble = cfg.mech === 'cluster' || cfg.mech === 'scatter';
    cfg.syms.forEach((s, i) => {
      const tier = i;
      const b = Math.pow(cfg.mech === 'cluster' || cfg.mech === 'scatter' ? 1.45 : 1.35, tier);
      syms.push({
        e: s[0], name: s[1] || '', type: 'normal', tier,
        w: (cfg.wBase || 7) + (nT - 1 - tier) * (cfg.wStep || 1.6),
        pays: payLadder(cfg.mech, cfg.reels, b),
      });
      // classic 3-reel machines: lowest symbol (cherry) also pays for two
      if (cfg.reels === 3 && tier === 0) syms[0].pays[2] = 2;
    });
    const topB = Math.pow(1.35, nT) * 1.2;
    const add = (o, type, defW) => {
      if (!o) return -1;
      syms.push(Object.assign({ type, tier: nT, w: defW, pays: null }, o));
      return syms.length - 1;
    };
    m.wildIdx = add(cfg.wild, 'wild', isTumble ? 1.2 : 2.6);
    if (m.wildIdx >= 0 && cfg.wild.pays) syms[m.wildIdx].pays = payLadder(cfg.mech, cfg.reels, topB);
    m.scatterIdx = add(cfg.scatter, 'scatter', 1.6);
    if (m.scatterIdx >= 0 && cfg.scatter.pays) syms[m.scatterIdx].spays = { 3: 2, 4: 10, 5: 50, 6: 100 };
    m.coinIdx = add(cfg.coin, 'coin', 3);
    m.bonusIdx = add(cfg.bonus, 'bonus', 1.6);
    m.bombIdx = add(cfg.bomb, 'bomb', 0.6);
    m.symbols = syms;
    m.normalCount = nT;
    m.rowsMax = cfg.mech === 'megaways' ? cfg.maxRows : cfg.rows;
    if (cfg.mech === 'lines') m.paylines = genPaylines(cfg.reels, cfg.rows, cfg.lines);
    m.reelWeights = [];
    for (let r = 0; r < cfg.reels; r++) {
      m.reelWeights.push(syms.map((s) => (s.reels && s.reels.indexOf(r) < 0 ? 0 : s.w)));
    }
    return m;
  }

  /* ---------- generation ---------- */
  function cellExtras(m, c, ctx) {
    const s = m.symbols[c.s];
    if (s.type === 'wild' && s.mult) {
      c.m = s.mult[U.wpick(s.mult, (x) => x[1])][0];
    } else if (s.type === 'coin') {
      Object.assign(c, coinValue(m, ctx.bet));
    } else if (s.type === 'bomb') {
      c.m = s.values[U.wpick(s.values, (x) => x[1])][0];
    }
    return c;
  }

  function genCell(m, r, ctx, exclude) {
    const w = m.reelWeights[r].slice();
    if (ctx.fs) {
      const fsf = m.feat.fs || {};
      if (m.wildIdx >= 0 && fsf.wildBoost) w[m.wildIdx] *= fsf.wildBoost;
      if (m.bombIdx >= 0 && fsf.bombBoost) w[m.bombIdx] *= fsf.bombBoost;
      if (m.bonusIdx >= 0) w[m.bonusIdx] = 0;
      if (m.coinIdx >= 0) w[m.coinIdx] = 0;
    }
    if (ctx.noFeatures) {
      if (m.bonusIdx >= 0) w[m.bonusIdx] = 0;
      if (m.coinIdx >= 0) w[m.coinIdx] = 0;
    }
    if (exclude) for (const i of exclude) if (i >= 0) w[i] = 0;
    const s = U.wpick(w);
    return cellExtras(m, { s }, ctx);
  }

  const MEGA_W = [1, 2, 3, 3, 2, 1.2, 0.8, 0.5];
  function genGrid(m, ctx) {
    const grid = [];
    const onePerReel = m.mech !== 'cluster' && m.mech !== 'scatter';
    for (let r = 0; r < m.reels; r++) {
      let rows = m.rows;
      if (m.mech === 'megaways') {
        const opts = [];
        for (let k = m.minRows; k <= m.maxRows; k++) opts.push(k);
        rows = opts[U.wpick(opts, (k, i) => MEGA_W[i] || 0.5)];
      }
      const col = [];
      const excl = [];
      for (let row = 0; row < rows; row++) {
        const c = genCell(m, r, ctx, excl);
        if (onePerReel && (c.s === m.scatterIdx || c.s === m.bonusIdx)) excl.push(c.s);
        col.push(c);
      }
      grid.push(col);
    }
    return grid;
  }

  function cloneGrid(g) { return g.map((col) => col.map((c) => Object.assign({}, c))); }

  function coinValue(m, bet) {
    const hw = m.feat.holdWin;
    const i = U.wpick(hw.values, (x) => x[1]);
    const [mult, , label] = hw.values[i];
    return { v: coins(mult * bet * m.scale, bet), label: label || null };
  }

  // in-game bets (>=10) pay whole coins; the simulator uses bet=1 and keeps exact values
  function coins(x, bet) { return bet >= 10 ? Math.max(1, Math.round(x)) : x; }

  /* ---------- evaluation ---------- */
  function isWild(m, c) { return c.s === m.wildIdx; }
  function isNormal(m, s) { return m.symbols[s].type === 'normal'; }

  function evalLines(m, grid, bet, mult) {
    const lineBet = bet / m.paylines.length;
    const wins = [];
    m.paylines.forEach((line, li) => {
      const cells = line.map((row, r) => grid[r][row]);
      let first = -1, count = 0, wildRun = 0;
      for (let r = 0; r < cells.length; r++) {
        const c = cells[r];
        if (isWild(m, c)) { count++; if (first < 0) wildRun++; continue; }
        if (first < 0) {
          if (isNormal(m, c.s)) { first = c.s; count++; continue; }
          break;
        }
        if (c.s === first) count++; else break;
      }
      if (first < 0) count = wildRun;
      const sp = first >= 0 ? m.symbols[first].pays[count] || 0 : 0;
      const wpays = m.wildIdx >= 0 ? m.symbols[m.wildIdx].pays : null;
      const wp = wpays ? wpays[wildRun] || 0 : 0;
      let pay = sp, n = count, sym = first;
      if (wp > sp) { pay = wp; n = wildRun; sym = m.wildIdx; }
      if (pay > 0) {
        let wm = 1;
        const positions = [];
        for (let r = 0; r < n; r++) {
          positions.push([r, line[r]]);
          if (cells[r].m && isWild(m, cells[r])) wm *= cells[r].m;
        }
        wins.push({ kind: 'line', line: li, sym, count: n, positions, wildMult: wm,
          amount: pay * lineBet * m.scale * mult * wm });
      }
    });
    return wins;
  }

  function evalWays(m, grid, bet, mult) {
    const unit = bet / 20;
    const wins = [];
    for (let s = 0; s < m.normalCount; s++) {
      let ways = 1, len = 0;
      const positions = [];
      for (let r = 0; r < grid.length; r++) {
        let cnt = 0;
        grid[r].forEach((c, row) => {
          if (c.s === s || isWild(m, c)) { cnt++; positions.push([r, row]); }
        });
        if (!cnt) break;
        ways *= cnt; len++;
      }
      const pay = m.symbols[s].pays[len] || 0;
      if (pay > 0) {
        const pos = positions.filter((p) => p[0] < len);
        wins.push({ kind: 'ways', sym: s, count: len, ways, positions: pos, amount: pay * ways * unit * m.scale * mult });
      }
    }
    return wins;
  }

  function evalCluster(m, grid, bet, mult) {
    const wins = [];
    const R = grid.length;
    for (let s = 0; s < m.normalCount; s++) {
      const seen = new Set();
      for (let r = 0; r < R; r++) {
        for (let row = 0; row < grid[r].length; row++) {
          const key = r + ',' + row;
          if (grid[r][row].s !== s || seen.has(key)) continue;
          const q = [[r, row]];
          const inCl = new Set([key]);
          const positions = [];
          while (q.length) {
            const [cr, crow] = q.pop();
            positions.push([cr, crow]);
            if (grid[cr][crow].s === s) seen.add(cr + ',' + crow);
            for (const [dr, dw] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = cr + dr, nw = crow + dw;
              if (nr < 0 || nr >= R || nw < 0 || nw >= grid[nr].length) continue;
              const k = nr + ',' + nw;
              if (inCl.has(k)) continue;
              const c = grid[nr][nw];
              if (c.s === s || isWild(m, c)) { inCl.add(k); q.push([nr, nw]); }
            }
          }
          if (positions.length >= 5) {
            const size = Math.min(15, positions.length);
            const pay = m.symbols[s].pays[size];
            wins.push({ kind: 'cluster', sym: s, count: positions.length, positions, amount: pay * bet * m.scale * mult });
          }
        }
      }
    }
    return wins;
  }

  function evalScatterPays(m, grid, bet, mult) {
    const wins = [];
    for (let s = 0; s < m.normalCount; s++) {
      const positions = [];
      grid.forEach((col, r) => col.forEach((c, row) => { if (c.s === s) positions.push([r, row]); }));
      const n = positions.length;
      if (n < 8) continue;
      const p = m.symbols[s].pays;
      const pay = n >= 12 ? p[12] : n >= 10 ? p[10] : p[8];
      wins.push({ kind: 'any', sym: s, count: n, positions, amount: pay * bet * m.scale * mult });
    }
    return wins;
  }

  function evaluate(m, grid, bet, mult) {
    let wins;
    switch (m.mech) {
      case 'lines': wins = evalLines(m, grid, bet, mult); break;
      case 'ways': case 'megaways': wins = evalWays(m, grid, bet, mult); break;
      case 'cluster': wins = evalCluster(m, grid, bet, mult); break;
      case 'scatter': wins = evalScatterPays(m, grid, bet, mult); break;
    }
    let total = 0;
    for (const w of wins) { w.amount = coins(w.amount, bet); total += w.amount; }
    return { wins, total };
  }

  function countSym(grid, s) {
    let n = 0;
    const positions = [];
    grid.forEach((col, r) => col.forEach((c, row) => { if (c.s === s) { n++; positions.push([r, row]); } }));
    return { n, positions };
  }

  function waysCount(grid) { return grid.reduce((a, c) => a * c.length, 1); }

  function cascadeFill(m, grid, removed, ctx) {
    const rm = new Set(removed.map((p) => p[0] + ',' + p[1]));
    const out = [];
    for (let r = 0; r < grid.length; r++) {
      const kept = grid[r].filter((c, row) => !rm.has(r + ',' + row));
      const need = grid[r].length - kept.length;
      const fresh = [];
      for (let i = 0; i < need; i++) fresh.push(genCell(m, r, Object.assign({}, ctx, { noFeatures: true })));
      out.push(fresh.concat(kept.map((c) => Object.assign({}, c))));
    }
    return out;
  }

  /* ---------- a full spin (incl. cascades) ---------- */
  function newFs(m, spins) {
    const f = m.feat.fs || {};
    return { left: spins, total: spins, played: 0, mult: f.mult || 1, sticky: [], accMult: 0, prog: 1, win: 0 };
  }

  function playSpin(m, opts) {
    const bet = opts.bet;
    const fs = opts.fs || null;
    const ctx = { bet, fs };
    let grid = genGrid(m, ctx);
    const out = { bet, wildReels: [], expanded: [], steps: [], total: 0, bombSum: 0, bombs: [], trigger: {} };

    if (fs && m.feat.sticky) {
      for (const [r, row] of fs.sticky) if (grid[r] && grid[r][row]) grid[r][row] = { s: m.wildIdx, sticky: true };
    }
    out.landGrid = cloneGrid(grid);

    if (!fs && m.feat.wildReels && Math.random() < m.feat.wildReels.chance) {
      const n = U.ri(1, m.feat.wildReels.max || 2);
      const pool = [];
      for (let r = 1; r < m.reels; r++) pool.push(r);
      for (let i = 0; i < n && pool.length; i++) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        out.wildReels.push(r);
        grid[r] = grid[r].map(() => ({ s: m.wildIdx }));
      }
    }
    const exp = m.feat.expanding;
    if (exp === 'always' || (exp === 'fs' && fs)) {
      for (let r = 0; r < grid.length; r++) {
        if (out.wildReels.indexOf(r) >= 0) continue;
        if (grid[r].some((c) => isWild(m, c)) && !grid[r].every((c) => isWild(m, c))) {
          out.expanded.push(r);
          grid[r] = grid[r].map(() => ({ s: m.wildIdx, exp: true }));
        }
      }
    }

    const cas = m.feat.cascade;
    let idx = 0;
    for (;;) {
      let mult = fs ? fs.mult : 1;
      if (cas) {
        if (cas.mults) {
          const arr = fs && cas.fsMults ? cas.fsMults : cas.mults;
          mult *= arr[Math.min(idx, arr.length - 1)];
        } else if (cas.step) {
          mult *= (fs ? fs.prog : 1) + idx * cas.step;
        }
      }
      const ev = evaluate(m, grid, bet, mult);
      const step = { grid: cloneGrid(grid), wins: ev.wins, win: ev.total, mult, removed: null };
      out.steps.push(step);
      out.total += ev.total;
      if (!cas || ev.total === 0 || idx > 40) break;
      const rm = new Map();
      for (const w of ev.wins) for (const p of w.positions) {
        const c = grid[p[0]][p[1]];
        if (c.sticky) continue;
        rm.set(p[0] + ',' + p[1], p);
      }
      step.removed = Array.from(rm.values());
      grid = cascadeFill(m, grid, step.removed, ctx);
      idx++;
    }
    out.cascades = idx;
    out.finalGrid = grid;
    if (fs && cas && cas.step && cas.persist) fs.prog += idx * cas.step;

    // multiplier bombs
    if (m.bombIdx >= 0) {
      grid.forEach((col, r) => col.forEach((c, row) => {
        if (c.s === m.bombIdx) { out.bombSum += c.m; out.bombs.push({ r, row, m: c.m }); }
      }));
      if (out.total > 0 && out.bombSum > 0) {
        out.preBombTotal = out.total;
        if (fs) {
          fs.accMult += out.bombSum;
          out.appliedMult = fs.accMult;
        } else out.appliedMult = out.bombSum;
        out.total = coins(out.total * out.appliedMult, bet);
      }
    }

    // scatters
    if (m.scatterIdx >= 0) {
      const sc = countSym(grid, m.scatterIdx);
      out.scatter = sc;
      const S = m.symbols[m.scatterIdx];
      if (S.spays && sc.n >= 3) {
        out.scatterWin = coins((S.spays[Math.min(sc.n, 6)] || 0) * bet * m.scale * (fs ? fs.mult : 1), bet);
        out.total += out.scatterWin;
      }
      if (sc.n >= S.trigger) {
        const extra = (sc.n - S.trigger) * (S.extra || 0);
        out.trigger.fs = fs ? (S.retrigger || Math.ceil(S.spins / 2)) + extra : S.spins + extra;
      }
    }
    if (!fs && m.coinIdx >= 0) {
      const c = countSym(out.landGrid, m.coinIdx);
      if (c.n >= m.symbols[m.coinIdx].trigger) out.trigger.holdWin = true;
    }
    if (!fs && m.bonusIdx >= 0) {
      const c = countSym(out.landGrid, m.bonusIdx);
      out.bonus = c;
      if (c.n >= m.symbols[m.bonusIdx].trigger) out.trigger.wheel = true;
    }
    if (fs && m.feat.sticky) {
      const keys = new Set(fs.sticky.map((p) => p.join(',')));
      out.landGrid.forEach((col, r) => col.forEach((c, row) => {
        if (isWild(m, c) && !keys.has(r + ',' + row)) { fs.sticky.push([r, row]); keys.add(r + ',' + row); }
      }));
    }
    return out;
  }

  /* ---------- hold & win ---------- */
  function holdWinStart(m, landGrid) {
    const cells = landGrid.map((col) => col.map((c) => (c.s === m.coinIdx ? { v: c.v, label: c.label } : null)));
    return { cells, respins: 3, done: false, grand: 0 };
  }
  function holdWinRespin(m, st, bet) {
    const p = m.feat.holdWin.p;
    const landed = [];
    st.cells.forEach((col, r) => col.forEach((c, row) => {
      if (!c && Math.random() < p) {
        col[row] = coinValue(m, bet);
        landed.push([r, row]);
      }
    }));
    if (landed.length) st.respins = 3; else st.respins--;
    const full = st.cells.every((col) => col.every((c) => c));
    if (full) { st.grand = coins(m.feat.holdWin.grand * bet * m.scale, bet); }
    if (full || st.respins <= 0) st.done = true;
    return landed;
  }
  function holdWinTotal(st) {
    let t = st.grand;
    st.cells.forEach((col) => col.forEach((c) => { if (c) t += c.v; }));
    return t;
  }

  /* ---------- wheel ---------- */
  function wheelSpin(m) {
    const seg = m.feat.wheel.segments;
    return U.wpick(seg, (s) => s.w);
  }

  /* ---------- headless round (simulation) ---------- */
  function simRound(m, bet) {
    const out = playSpin(m, { bet });
    let win = out.total;
    const stats = { fs: 0, hw: 0, wheel: 0, base: out.total };
    if (out.trigger.fs) {
      stats.fs = 1;
      const fs = newFs(m, out.trigger.fs);
      while (fs.left > 0 && fs.played < 200) {
        fs.left--; fs.played++;
        const o = playSpin(m, { bet, fs });
        win += o.total;
        if (o.trigger.fs) { fs.left += o.trigger.fs; fs.total += o.trigger.fs; }
      }
    }
    if (out.trigger.holdWin) {
      stats.hw = 1;
      const st = holdWinStart(m, out.landGrid);
      while (!st.done) holdWinRespin(m, st, bet);
      win += holdWinTotal(st);
    }
    if (out.trigger.wheel) {
      stats.wheel = 1;
      const i = wheelSpin(m);
      win += m.feat.wheel.segments[i].v * bet * m.scale;
    }
    stats.win = win;
    return stats;
  }

  const E = {
    genPaylines, prepare, genGrid, evaluate, playSpin, newFs, cloneGrid, waysCount, countSym,
    holdWinStart, holdWinRespin, holdWinTotal, wheelSpin, simRound, isWild, coins,
  };
  root.SlotEngine = E;
  if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
