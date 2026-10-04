/* Game controller: one slot machine session (UI, spin flow, features, overlays). */
(function (root) {
  const U = root.U, E = root.SlotEngine, A = root.SlotAudio;
  const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const BIG = [[12, 'BIG WIN', '', 1], [35, 'MEGA WIN', 'mega', 2], [100, 'EPIC WIN', 'epic', 3]];
  const TIPS = ['행운을 빌어요! 🍀', '스페이스바로 스핀할 수 있어요', '스핀 중에 다시 누르면 즉시 정지!', 'ℹ 버튼에서 배당표를 확인하세요', '터보 ⚡ 로 더 빠르게 즐겨보세요'];
  const DEAD = new Error('game closed');

  function mechLabel(m) {
    switch (m.mech) {
      case 'lines': return m.lines + (m.lines === 1 ? ' LINE' : ' LINES');
      case 'ways': return U.fmt(Math.pow(m.rows, m.reels)) + ' WAYS';
      case 'megaways': return 'MEGAWAYS';
      case 'cluster': return 'CLUSTER PAYS';
      case 'scatter': return 'PAY ANYWHERE';
    }
    return '';
  }

  function featureList(m) {
    const f = m.feat, out = [];
    const S = m.symbols;
    if (m.scatterIdx >= 0) {
      const s = S[m.scatterIdx];
      let t = `${s.e} 스캐터 ${s.trigger}개 이상 → 프리스핀 ${s.spins}회`;
      if (s.extra) t += ` (추가 스캐터 1개당 +${s.extra}회)`;
      if (f.fs && f.fs.mult > 1) t += `, 모든 당첨 x${f.fs.mult}`;
      if (f.fs && f.fs.wildBoost) t += ', 와일드 출현 증가';
      if (f.fs && f.fs.bombBoost) t += ', 배수 심볼 출현 증가 & 배수 누적';
      out.push(t + '. 프리스핀 중 재트리거 가능.');
    }
    if (m.wildIdx >= 0) {
      const w = S[m.wildIdx];
      let t = `${w.e} 와일드는 스캐터·보너스를 제외한 모든 심볼을 대체합니다.`;
      if (w.mult) t += ` 와일드에 x${w.mult.map((x) => x[0]).filter((v) => v > 1).join('/x')} 배수가 붙어 라인 당첨에 곱해집니다.`;
      out.push(t);
    }
    if (f.expanding === 'always') out.push('확장 와일드: 와일드가 착지하면 릴 전체로 확장됩니다.');
    if (f.expanding === 'fs') out.push('프리스핀 동안 와일드가 릴 전체로 확장됩니다.');
    if (f.sticky) out.push('스티키 와일드: 프리스핀 중 착지한 와일드는 보너스가 끝날 때까지 제자리에 고정됩니다.');
    if (f.wildReels) out.push(`와일드 릴: 일반 스핀 중 무작위로 최대 ${f.wildReels.max}개의 릴이 통째로 와일드로 변합니다.`);
    if (f.cascade) {
      if (f.cascade.mults && f.cascade.mults.length > 1) out.push(`캐스케이드: 당첨 심볼이 사라지고 새 심볼이 떨어집니다. 연쇄 배수 ${f.cascade.mults.map((x) => 'x' + x).join(' → ')}` + (f.cascade.fsMults ? ` (프리스핀: ${f.cascade.fsMults.map((x) => 'x' + x).join(' → ')})` : '') + '.');
      else if (f.cascade.step) out.push('캐스케이드 + 무한 배수: 연쇄가 일어날 때마다 배수가 +1 증가합니다. 프리스핀에서는 배수가 리셋되지 않습니다.');
      else out.push('텀블: 당첨 심볼이 사라지고 새 심볼이 떨어져 연쇄 당첨이 이어집니다.');
    }
    if (m.bombIdx >= 0) out.push(`${S[m.bombIdx].e} 배수 심볼(x2~x${S[m.bombIdx].values[S[m.bombIdx].values.length - 1][0]})이 텀블 종료 시 합산되어 총 당첨금에 곱해집니다.`);
    if (m.coinIdx >= 0) out.push(`${S[m.coinIdx].e} ${S[m.coinIdx].trigger}개 이상 → 홀드 앤 윈! 금화가 고정되고 리스핀 3회. 새 금화가 나올 때마다 3회로 초기화. MINI·MINOR·MAJOR 잭팟 금화, 모든 칸을 채우면 GRAND 잭팟 (베팅의 ${f.holdWin.grand}배).`);
    if (m.bonusIdx >= 0) out.push(`${S[m.bonusIdx].e} 보너스 ${S[m.bonusIdx].trigger}개 → 보너스 휠! 최대 베팅의 ${Math.max(...f.wheel.segments.map((s) => s.v))}배.`);
    return out;
  }

  class Game {
    constructor(app, cfg) {
      this.app = app;
      this.cfg = cfg;
      this.m = E.prepare(cfg, root.SLOT_CALIBRATION);
      this.el = document.getElementById('game');
      this.betIdx = U.clamp(U.store.get('bet.' + cfg.id, 3), 0, BETS.length - 1);
      this.turbo = U.store.get('turbo', false);
      this.auto = 0;
      this.busy = false;
      this.fs = null;
      this.hw = null;
      this.cas = { idx: 0, mult: 1 };
      this.cycleTimer = null;
      this.lastWins = [];
      this.dead = false;
      this.fast = false;
    }

    get bet() { return BETS[this.betIdx]; }

    /* ---------- setup ---------- */
    mount() {
      const el = this.el, m = this.m, th = m.theme;
      const q = (s) => el.querySelector(s);
      this.ui = {
        name: q('.js-name'), en: q('.js-en'), info: q('.js-info'), frame: q('.js-frame'), cv: q('.js-reels'),
        msg: q('.js-msg'), bet: q('.js-bet'), win: q('.js-win'), winBox: q('.win-box'), spin: q('.js-spin'),
        spinLabel: q('.js-spin-label'), turbo: q('.js-turbo'), auto: q('.js-auto'), autoLabel: q('.js-auto-label'),
        autoMenu: q('.js-auto-menu'), betUp: q('.js-bet-up'), betDown: q('.js-bet-down'), stage: q('.g-stage'),
      };
      const st = el.style;
      st.setProperty('--accent', th.accent);
      st.setProperty('--accent2', th.accent2);
      st.setProperty('--frame1', th.frame[0]);
      st.setProperty('--frame2', th.frame[1]);
      st.setProperty('--title-font', `'${th.font}', 'Bungee', sans-serif`);
      document.documentElement.style.setProperty('--accent', th.accent);
      document.documentElement.style.setProperty('--accent2', th.accent2);
      this.ui.name.textContent = m.name;
      this.ui.en.textContent = m.en;
      el.classList.remove('hidden');

      this.R = new root.ReelRenderer(this.ui.cv, m);
      const first = E.genGrid(m, { bet: this.bet, noFeatures: true });
      this.R.setGrid(first);
      this.ways = E.waysCount(first);

      const ac = (this.ac = new AbortController());
      const on = (t, ev, fn) => t.addEventListener(ev, fn, { signal: ac.signal });
      on(this.ui.spin, 'click', () => this.spin(true));
      on(this.ui.betUp, 'click', () => this.changeBet(1));
      on(this.ui.betDown, 'click', () => this.changeBet(-1));
      on(this.ui.turbo, 'click', () => { this.turbo = !this.turbo; U.store.set('turbo', this.turbo); A.click(); this.refreshUi(); });
      on(this.ui.auto, 'click', (e) => {
        A.click();
        if (this.auto > 0) { this.auto = 0; this.refreshUi(); return; }
        const menu = this.ui.autoMenu;
        menu.classList.toggle('hidden');
        const b = this.ui.auto.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, b.left + b.width / 2 - menu.offsetWidth / 2)) + 'px';
        menu.style.top = (b.top - menu.offsetHeight - 10) + 'px';
        e.stopPropagation();
      });
      on(this.ui.autoMenu, 'click', (e) => {
        const n = +e.target.dataset.n;
        if (!n) return;
        this.ui.autoMenu.classList.add('hidden');
        this.auto = n;
        this.refreshUi();
        if (!this.busy) { this.auto--; this.spin(); }
      });
      on(document, 'click', () => this.ui.autoMenu.classList.add('hidden'));
      on(el.querySelector('.js-pay'), 'click', () => { A.click(); this.paytable(); });
      on(el.querySelector('.js-back'), 'click', () => this.app.goLobby());
      on(window, 'resize', () => this.layout());
      on(document, 'keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          if (document.querySelector('#overlays .ov')) return;
          e.preventDefault();
          if (!e.repeat) this.spin(true);
        }
      });
      on(this.ui.cv, 'click', () => { if (this.busy) this.hurry(); });

      A.setMachine(m);
      A.playMusic(m);
      this.app.bg.setTheme(th);
      this.layout();
      requestAnimationFrame(() => this.layout());
      this.refreshUi();
      this.setMsg(`<span class="sub">${m.desc}</span>`);
    }

    destroy() {
      this.dead = true;
      this.ac && this.ac.abort();
      clearTimeout(this.nextTimer);
      this.stopCycle();
      A.spinLoop(false);
      A.anticipation(false);
      A.duck(false);
      document.getElementById('overlays').innerHTML = '';
      this.el.classList.add('hidden');
      this.ui.autoMenu.classList.add('hidden');
    }

    layout() {
      if (this.dead) return;
      const m = this.m, ui = this.ui;
      const availW = ui.stage.clientWidth - 24 - 20;
      const availH = ui.stage.clientHeight - ui.info.offsetHeight - ui.msg.offsetHeight - 16 - 20 - 8;
      const rows = m.mech === 'megaways' ? m.maxRows * 0.62 : m.rows === 1 ? 1.25 : m.rows;
      const aspect = m.reels / rows;
      let w = Math.min(availW, availH * aspect, 1100);
      w = Math.max(200, w);
      const h = w / aspect;
      ui.cv.style.width = Math.floor(w) + 'px';
      ui.cv.style.height = Math.floor(h) + 'px';
      this.R.resize();
    }

    /* ---------- ui helpers ---------- */
    refreshUi() {
      const ui = this.ui;
      ui.bet.textContent = U.fmt(this.bet);
      ui.turbo.classList.toggle('on', this.turbo);
      ui.auto.classList.toggle('on', this.auto > 0);
      ui.autoLabel.textContent = this.auto > 0 ? (this.auto > 999 ? '∞' : String(this.auto)) : 'AUTO';
      ui.spin.classList.toggle('free', !!this.fs);
      ui.spinLabel.textContent = this.fs ? 'FREE' : this.busy ? 'STOP' : 'SPIN';
      ui.betUp.disabled = ui.betDown.disabled = !!this.fs || this.busy;
      this.updateInfo();
    }

    updateInfo() {
      const m = this.m, f = m.feat;
      const pills = [];
      let label = mechLabel(m);
      if (m.mech === 'megaways') label = U.fmt(this.ways) + ' WAYS';
      pills.push(`<span class="pill">${label}</span>`);
      if (f.cascade && f.cascade.mults && f.cascade.mults.length > 1) {
        const arr = this.fs && f.cascade.fsMults ? f.cascade.fsMults : f.cascade.mults;
        const idx = Math.min(this.cas.idx, arr.length - 1);
        pills.push(`<span class="pill"><span class="ladder">${arr.map((v, i) => `<b class="${i === idx ? 'on' : ''}">x${v}</b>`).join('')}</span></span>`);
      } else if (f.cascade && f.cascade.step) {
        pills.push(`<span class="pill ${this.cas.mult > 1 ? 'hot' : ''}">MULTI x${this.cas.mult}</span>`);
      }
      if (this.fs) {
        pills.push(`<span class="pill hot">FREE SPINS ${this.fs.left}</span>`);
        if (this.fs.mult > 1) pills.push(`<span class="pill">ALL WINS x${this.fs.mult}</span>`);
        if (this.fs.accMult > 0) pills.push(`<span class="pill hot">TOTAL x${this.fs.accMult}</span>`);
        if (m.feat.sticky && this.fs.sticky.length) pills.push(`<span class="pill">STICKY ${this.fs.sticky.length}</span>`);
        pills.push(`<span class="pill">BONUS WIN ${U.fmt(this.fs.win)}</span>`);
      }
      if (this.hw) pills.push(`<span class="pill hot">RESPINS ${'●'.repeat(Math.max(0, this.hw.respins))}${'○'.repeat(3 - Math.max(0, this.hw.respins))}</span>`);
      this.ui.info.innerHTML = pills.join('');
    }

    setMsg(html) { this.ui.msg.innerHTML = html; }
    setWin(v, hot) {
      this.ui.win.textContent = U.fmt(v);
      if (hot) { this.ui.winBox.classList.remove('hot'); void this.ui.winBox.offsetWidth; this.ui.winBox.classList.add('hot'); }
    }
    countWin(from, to, ms) {
      const t0 = performance.now();
      return new Promise((res) => {
        const st = () => {
          if (this.dead) return res();
          const u = Math.min(1, (performance.now() - t0) / ms);
          const v = from + (to - from) * U.easeOutCubic(u);
          this.setWin(Number.isInteger(to) ? Math.round(v) : v);
          if (u < 1) requestAnimationFrame(st); else { this.setWin(to, true); res(); }
        };
        st();
      });
    }
    async wait(ms) {
      await U.wait(this.fast ? ms * 0.2 : this.turbo ? ms * 0.6 : ms);
      if (this.dead) throw DEAD;
    }
    toast(text) {
      const d = document.createElement('div');
      d.className = 'toast';
      d.textContent = text;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1900);
    }

    changeBet(d) {
      if (this.busy || this.fs) return;
      const n = U.clamp(this.betIdx + d, 0, BETS.length - 1);
      if (n === this.betIdx) { A.buzz(); return; }
      this.betIdx = n;
      U.store.set('bet.' + this.m.id, n);
      A.bet(d > 0);
      this.refreshUi();
    }

    /* ---------- spin flow ---------- */
    hurry() {
      if (!this.busy) return;
      this.fast = true;
      if (this.spinning) {
        const now = performance.now() / 1000;
        this.R.reels.forEach((rl, r) => {
          if (rl.mode === 'spin' && rl.stopAt == null) this.R.requestStop(r, now + r * 0.04, rl.onStop);
        });
      }
    }

    async spin(user) {
      if (this.dead) return;
      if (this.busy) { if (user) this.hurry(); return; }
      if (document.querySelector('#overlays .ov')) return;
      if (user && this.auto > 0 && !this.fs) { this.auto = 0; this.refreshUi(); }
      clearTimeout(this.nextTimer);
      const m = this.m, bet = this.bet;
      if (!this.fs) {
        if (this.app.balance < bet) {
          this.auto = 0; this.refreshUi(); A.buzz(); this.app.lowBalance(); return;
        }
        this.app.credit(-bet);
        this.app.refresh();
      } else {
        this.fs.left--;
        this.fs.played++;
      }
      this.busy = true;
      this.fast = false;
      this.stopCycle();
      this.lastWins = [];
      this.R.setHighlight(null);
      this.ui.frame.classList.remove('win');
      this.ui.spin.classList.add('spinning');
      this.cas = { idx: 0, mult: this.fs && m.feat.cascade && m.feat.cascade.step ? this.fs.prog : 1 };
      if (!this.fs) this.setWin(0);
      this.setMsg(this.fs ? `FREE SPIN ${this.fs.played} / ${this.fs.total}` : '');
      this.refreshUi();
      try {
        await this.runSpin(bet);
      } catch (e) {
        if (e !== DEAD) { console.error(e); this.busy = false; }
        return;
      }
      if (this.dead) return;
      this.busy = false;
      this.ui.spin.classList.remove('spinning');
      this.refreshUi();
      if (this.lastWins.length) this.startCycle();
      if (this.fs) this.nextTimer = setTimeout(() => this.spin(), this.turbo ? 350 : 800);
      else if (this.auto > 0) {
        this.auto--;
        this.refreshUi();
        this.nextTimer = setTimeout(() => this.spin(), this.turbo ? 250 : 650);
      }
    }

    async runSpin(bet) {
      const m = this.m;
      const out = E.playSpin(m, { bet, fs: this.fs });
      // credit immediately (so leaving mid-animation never loses a win); display catches up later
      this.app.credit(out.total);
      if (this.fs) this.fs.win += out.total;
      A.spinStart();
      A.spinLoop(true, this.turbo);
      this.spinning = true;
      await this.spinReels(out);
      this.spinning = false;
      A.spinLoop(false);
      A.anticipation(false);
      if (this.dead) throw DEAD;
      if (m.mech === 'megaways') { this.ways = E.waysCount(out.landGrid); this.updateInfo(); }

      if (out.wildReels.length) {
        A.thunder();
        this.ui.frame.classList.add('shake');
        setTimeout(() => this.ui.frame.classList.remove('shake'), 600);
        A.wildTransform();
        await this.R.transformReels(out.wildReels, out.steps[0].grid, true);
      }
      if (out.expanded.length) {
        A.wildTransform();
        await this.R.transformReels(out.expanded, out.steps[0].grid, false);
      }
      if (this.dead) throw DEAD;

      let shown = 0;
      for (let i = 0; i < out.steps.length; i++) {
        const st = out.steps[i];
        if (st.win <= 0) break;
        this.cas.idx = i;
        if (m.feat.cascade && m.feat.cascade.step) this.cas.mult = st.mult / (this.fs ? this.fs.mult : 1);
        this.updateInfo();
        await this.presentWins(st, shown, bet);
        shown += st.win;
        if (st.removed && out.steps[i + 1]) {
          A.cascadePop(i);
          this.R.setHighlight(null);
          await this.R.explode(st.removed, (r, row, d) => {
            if (!d) return;
            const [x, y] = this.R.pageXY(r, row);
            this.app.fx.burst(x, y, this.R.tierColor(d.c.s), 8, 0.7);
          });
          await this.R.dropIn(out.steps[i + 1].grid, st.removed);
          A.drop();
          await this.wait(120);
        }
      }
      if (out.appliedMult) {
        let k = 0;
        for (const b of out.bombs) {
          const [x, y] = this.R.pageXY(b.r, b.row);
          this.app.fx.burst(x, y, '#c084fc', 18, 1.1);
          this.app.fx.text(x, y, 'x' + b.m, '#e9d5ff', 30);
          A.bomb(k++);
          await this.wait(260);
        }
        A.powerUp();
        this.toast(`${U.fmt(out.preBombTotal)} × ${out.appliedMult}`);
        await this.wait(700);
        await this.countWin(shown, out.total - (out.scatterWin || 0), 600);
        shown = out.total - (out.scatterWin || 0);
      }
      if (out.scatterWin) {
        this.R.setHighlight(out.scatter.positions, null, m.theme.accent2);
        A.win(out.scatterWin / bet);
        this.floatAt(out.scatter.positions, out.scatterWin);
        await this.countWin(shown, shown + out.scatterWin, 500);
        shown += out.scatterWin;
        await this.wait(700);
      }
      if (m.feat.cascade && m.feat.cascade.step && this.fs && m.feat.cascade.persist) this.cas.mult = this.fs.prog;

      if (out.total > 0) {
        this.ui.frame.classList.add('win');
        const ratio = out.total / bet;
        this.setWin(this.fs ? this.fs.win : out.total, true);
        if (ratio >= BIG[0][0]) await this.bigWin(out.total, bet);
        this.app.refresh(true);
        this.setMsg(`<span class="big">WIN ${U.fmt(out.total)}</span>`);
        // cycle through individual wins afterwards (not for tumbling grids - the board has changed)
        this.lastWins = m.feat.cascade ? [] : out.steps[0].wins.slice();
      } else {
        this.app.refresh();
        if (!this.fs) this.setMsg(Math.random() < 0.3 ? TIPS[Math.floor(Math.random() * TIPS.length)] : '');
      }
      this.updateInfo();

      // features
      if (out.trigger.fs) {
        const n = out.trigger.fs;
        this.R.setHighlight(out.scatter.positions, null, m.theme.accent2);
        A.featureTrigger();
        if (this.fs) {
          this.fs.left += n; this.fs.total += n;
          this.toast(`+${n} FREE SPINS!`);
          await this.wait(1400);
        } else {
          this.auto = 0;
          await this.wait(1200);
          await this.intro('FREE SPINS', `${n}회 무료 스핀!`, featureList(m)[0], '시작!');
          this.fs = E.newFs(m, n);
          this.cas.mult = 1;
          this.setWin(0);
          this.fsMusic(true);
        }
        this.refreshUi();
      }
      if (out.trigger.holdWin) { this.auto = 0; await this.runHoldWin(out, bet); }
      if (out.trigger.wheel) { this.auto = 0; await this.runWheel(out, bet); }

      if (this.fs && this.fs.left <= 0) {
        await this.wait(700);
        const fs = this.fs;
        A.fsEnd();
        await this.result('FREE SPINS 완료', fs.win, `${fs.played}회 프리스핀에서 획득`);
        this.fs = null;
        this.cas.mult = 1;
        this.fsMusic(false);
        this.setWin(fs.win);
        this.refreshUi();
      }
    }

    spinReels(out) {
      return new Promise((res) => {
        const R = this.R, m = this.m, grid = out.landGrid;
        const turbo = this.turbo;
        R.startSpin(grid, { speed: turbo ? 30 : 23 });
        const now = performance.now() / 1000;
        let t = now + (turbo ? 0.3 : 0.62);
        const gap = turbo ? 0.08 : 0.2;
        const sI = m.scatterIdx, bI = m.bonusIdx, cI = m.coinIdx;
        const sTrig = sI >= 0 ? m.symbols[sI].trigger : 99;
        const bTrig = bI >= 0 ? m.symbols[bI].trigger : 99;
        const antic = [];
        let sc = 0, bc = 0;
        const stopTimes = [];
        for (let r = 0; r < grid.length; r++) {
          const a = r > 0 && (sc >= sTrig - 1 || bc >= bTrig - 1) && sc < sTrig + 2;
          antic.push(a);
          if (a) t += turbo ? 0.7 : 1.3;
          stopTimes.push(t);
          t += gap;
          grid[r].forEach((c) => { if (c.s === sI) sc++; if (c.s === bI) bc++; });
        }
        let stopped = 0, scSeen = 0;
        const onStop = (r) => {
          if (this.dead) return;
          A.reelStop(r, grid.length);
          grid[r].forEach((c) => {
            if (c.s === sI || c.s === bI) A.scatterLand(scSeen++);
            if (c.s === cI) A.coinLand(0);
          });
          grid[r].forEach((c, row) => {
            if (c.s === sI || c.s === bI || c.s === cI) {
              const [x, y] = R.pageXY(r, row);
              this.app.fx.burst(x, y, R.tierColor(c.s), 10, 0.6);
            }
          });
          R.setReelGlow(r, false);
          if (antic[r]) A.anticipation(false);
          if (antic[r + 1] && !this.fast) { R.setReelGlow(r + 1, true); A.anticipation(true); }
          stopped++;
          if (stopped === grid.length) res();
        };
        stopTimes.forEach((st, r) => R.requestStop(r, st, onStop));
      });
    }

    floatAt(positions, amount, color) {
      if (!positions.length) return;
      let sx = 0, sy = 0;
      positions.forEach(([r, row]) => { const [x, y] = this.R.pageXY(r, row); sx += x; sy += y; });
      this.app.fx.text(sx / positions.length, sy / positions.length, '+' + U.fmt(amount), color || '#ffe066', 28);
    }

    async presentWins(st, base, bet) {
      const m = this.m;
      const all = [];
      const lines = [];
      st.wins.forEach((w) => { all.push(...w.positions); if (w.kind === 'line') lines.push(w.line); });
      this.R.setHighlight(all, lines.length ? lines : null, m.theme.accent);
      A.win(st.win / bet);
      st.wins.slice(0, 8).forEach((w) => this.floatAt(w.positions, w.amount));
      if (m.mech === 'cluster' || m.mech === 'scatter') {
        all.slice(0, 24).forEach(([r, row]) => {
          const [x, y] = this.R.pageXY(r, row);
          this.app.fx.burst(x, y, m.theme.accent, 5, 0.5);
        });
      }
      await this.countWin(base, base + st.win, this.turbo ? 250 : 450);
      const mult = st.mult;
      if (mult > 1) this.setMsg(`<span class="big">x${mult}</span> <span class="sub">배수 적용!</span>`);
      await this.wait(m.feat.cascade ? 650 : 950);
    }

    startCycle() {
      this.stopCycle();
      const wins = this.lastWins;
      if (wins.length < 2 && this.m.mech !== 'lines') return;
      let i = 0;
      const show = () => {
        if (this.busy || this.dead) return;
        const w = wins[i % wins.length];
        this.R.setHighlight(w.positions, w.kind === 'line' ? [w.line] : null, root.LINE_COLORS[(w.line || i) % root.LINE_COLORS.length]);
        const sym = this.m.symbols[w.sym];
        let desc = '';
        if (w.kind === 'line') desc = `라인 ${w.line + 1} · ${sym.e} x${w.count}${w.wildMult > 1 ? ` · 와일드 x${w.wildMult}` : ''}`;
        else if (w.kind === 'ways') desc = `${sym.e} x${w.count} · ${w.ways} 웨이즈`;
        else if (w.kind === 'cluster') desc = `${sym.e} 클러스터 ${w.count}개`;
        else desc = `${sym.e} ${w.count}개`;
        this.setMsg(`<span class="sub">${desc}</span> <span class="big">${U.fmt(w.amount)}</span>`);
        A.lineFlash(i);
        i++;
      };
      this.cycleTimer = setInterval(show, 1500);
    }
    stopCycle() { clearInterval(this.cycleTimer); this.cycleTimer = null; }

    fsMusic(on) {
      const m = this.m;
      if (on) A.playMusic(Object.assign({}, m, { music: Object.assign({}, m.music, { bpm: Math.round(m.music.bpm * 1.12), root: m.music.root + 2 }) }));
      else A.playMusic(m);
    }

    /* ---------- overlays ---------- */
    overlay(html, cls) {
      const d = document.createElement('div');
      d.className = 'ov ' + (cls || '');
      d.innerHTML = html;
      document.getElementById('overlays').appendChild(d);
      return d;
    }
    closeOverlay(d) {
      return new Promise((res) => {
        d.classList.add('out');
        setTimeout(() => { d.remove(); res(); }, 350);
      });
    }

    intro(title, sub, desc, btn) {
      return new Promise((res) => {
        const d = this.overlay(`<div class="rays-bg"></div><div class="ov-title">${title}</div><div class="ov-sub">${sub}</div>
          ${desc ? `<div class="ov-desc">${desc}</div>` : ''}<button class="ov-btn">${btn || '계속'}</button>`);
        this.app.fx.confetti(80);
        const done = () => { clearTimeout(tm); A.click(); this.closeOverlay(d).then(res); };
        d.querySelector('.ov-btn').addEventListener('click', done, { once: true });
        const tm = setTimeout(done, 6000);
      }).then(() => { if (this.dead) throw DEAD; });
    }

    result(title, amount, sub) {
      return new Promise((res) => {
        const d = this.overlay(`<div class="rays-bg"></div><div class="ov-sub">${title}</div><div class="ov-amount">${U.fmt(0)}</div>
          <div class="ov-desc">${sub || ''}</div><button class="ov-btn">수령하기</button>`);
        const am = d.querySelector('.ov-amount');
        const t0 = performance.now(), dur = 1500;
        const st = () => {
          const u = Math.min(1, (performance.now() - t0) / dur);
          am.textContent = U.fmt(Math.round(amount * U.easeOutCubic(u)));
          if (u < 1 && d.isConnected) requestAnimationFrame(st);
        };
        st();
        if (amount > 0) { this.app.fx.coins(40, innerWidth / 2, innerHeight * 0.6); A.win(8); }
        const done = () => { clearTimeout(tm); A.click(); this.app.refresh(true); this.closeOverlay(d).then(res); };
        d.querySelector('.ov-btn').addEventListener('click', done, { once: true });
        const tm = setTimeout(done, 5000);
      }).then(() => { if (this.dead) throw DEAD; });
    }

    bigWin(amount, bet) {
      const ratio = amount / bet;
      const top = BIG.filter((b) => ratio >= b[0]).pop() || BIG[0];
      return new Promise((res) => {
        const d = this.overlay(`<div class="rays-bg"></div><div class="ov-title"></div><div class="ov-amount">0</div><div class="ov-hint">탭하여 건너뛰기</div>`);
        const ti = d.querySelector('.ov-title'), am = d.querySelector('.ov-amount');
        const dur = (this.fast ? 1200 : 2400) + top[3] * 1300;
        const t0 = performance.now();
        let level = 0, finished = false, closing = false;
        A.bigWin(top[3]);
        this.app.fx.confetti(60 + top[3] * 40);
        this.ui.frame.classList.add('shake');
        setTimeout(() => this.ui.frame.classList.remove('shake'), 600);
        const setLevel = (b) => {
          ti.textContent = b[1];
          ti.className = 'ov-title ' + b[2];
          void ti.offsetWidth;
        };
        setLevel(BIG[0]);
        const coinTimer = setInterval(() => this.app.fx.coins(8 + top[3] * 4, innerWidth / 2 + (Math.random() - 0.5) * 200, innerHeight * 0.75), 220);
        const tickTimer = setInterval(() => A.countTick(), 90);
        const finish = () => {
          if (finished) return;
          finished = true;
          clearInterval(tickTimer);
          am.textContent = U.fmt(amount);
          setLevel(top);
          setTimeout(close, 1800);
        };
        const close = () => {
          if (closing) return;
          closing = true;
          clearInterval(coinTimer);
          A.bigWinEnd();
          this.closeOverlay(d).then(res);
        };
        const st = () => {
          if (finished) return;
          const u = Math.min(1, (performance.now() - t0) / dur);
          const v = Math.round(amount * U.easeInOutCubic(u));
          am.textContent = U.fmt(v);
          const lv = Math.max(0, BIG.filter((b) => v / bet >= b[0]).length - 1);
          if (lv > level) { level = lv; setLevel(BIG[lv]); this.app.fx.confetti(40); A.wildTransform(); }
          if (u < 1) requestAnimationFrame(st); else finish();
        };
        st();
        d.addEventListener('click', () => { if (!finished) finish(); else close(); });
      });
    }

    /* ---------- hold & win ---------- */
    async runHoldWin(out, bet) {
      const m = this.m;
      const coins = E.countSym(out.landGrid, m.coinIdx);
      this.R.setHighlight(coins.positions, null, '#ffcc33');
      A.featureTrigger();
      await this.wait(1300);
      await this.intro('HOLD & WIN', `${m.symbols[m.coinIdx].e} ${coins.n}개 획득!`, '금화가 고정되고 리스핀 3회가 주어집니다. 새 금화가 나올 때마다 리스핀이 3회로 초기화! 모든 칸을 채우면 GRAND 잭팟!', '시작!');
      const st = E.holdWinStart(m, out.landGrid);
      this.hw = st;
      this.R.setHighlight(null);
      this.R.hold = { cells: st.cells, pop: {}, spinning: false, collected: new Set() };
      this.fsMusic(true);
      this.updateInfo();
      this.setMsg('HOLD & WIN');
      await this.wait(700);
      while (!st.done) {
        this.R.hold.spinning = true;
        A.respinTick();
        await this.wait(850);
        const landed = E.holdWinRespin(m, st, bet);
        this.R.hold.spinning = false;
        let k = 0;
        for (const [r, row] of landed) {
          this.R.hold.pop[r + ',' + row] = this.R.time;
          const [x, y] = this.R.pageXY(r, row);
          this.app.fx.burst(x, y, '#ffcc33', 16, 1);
          A.coinLand(k++);
          await this.wait(220);
        }
        this.updateInfo();
        await this.wait(landed.length ? 350 : 250);
      }
      let total = 0, i = 0;
      if (st.grand) {
        A.jackpot();
        this.toast('GRAND JACKPOT!');
        this.app.fx.confetti(150);
        await this.wait(1800);
      }
      for (let r = 0; r < st.cells.length; r++) {
        for (let row = 0; row < st.cells[r].length; row++) {
          const c = st.cells[r][row];
          if (!c) continue;
          this.R.hold.collected.add(r + ',' + row);
          total += c.v;
          const [x, y] = this.R.pageXY(r, row);
          this.app.fx.text(x, y, '+' + U.fmt(c.v), c.label ? '#ff7ad9' : '#ffe066', 24);
          A.collect(i++);
          this.setWin(total, true);
          await this.wait(c.label ? 600 : 160);
        }
      }
      total += st.grand;
      this.app.credit(total);
      this.setWin(total, true);
      if (total / bet >= BIG[0][0]) await this.bigWin(total, bet);
      await this.result('HOLD & WIN 보너스', total, st.grand ? `GRAND 잭팟 ${U.fmt(st.grand)} 포함!` : `금화 ${st.cells.flat().filter(Boolean).length}개 수집`);
      this.R.hold = null;
      this.hw = null;
      this.fsMusic(false);
      this.updateInfo();
      this.app.refresh(true);
      this.setMsg(`<span class="big">BONUS WIN ${U.fmt(total)}</span>`);
    }

    /* ---------- bonus wheel ---------- */
    async runWheel(out, bet) {
      const m = this.m;
      this.R.setHighlight(out.bonus.positions, null, '#ffcc33');
      A.featureTrigger();
      await this.wait(1300);
      const segs = m.feat.wheel.segments;
      const idx = E.wheelSpin(m);
      const amount = E.coins(segs[idx].v * bet * m.scale, bet);
      await new Promise((res) => {
        const d = this.overlay(`<div class="rays-bg"></div><div class="ov-sub">${m.symbols[m.bonusIdx].e} 보너스 휠 ${m.symbols[m.bonusIdx].e}</div>
          <div class="wheel-wrap"><div class="wheel-pointer"></div><canvas></canvas></div>
          <button class="ov-btn">SPIN!</button><div class="ov-amount" style="min-height:1.2em"></div>`);
        const cv = d.querySelector('canvas');
        const size = cv.clientWidth || 400;
        const dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = cv.height = size * dpr;
        const ctx = cv.getContext('2d');
        ctx.scale(dpr, dpr);
        const n = segs.length, seg = (Math.PI * 2) / n;
        const th = m.theme;
        const cols = [th.accent, th.accent2, U.shade(th.accent, -0.45), U.shade(th.accent2, -0.45)];
        const drawWheel = (ang, hi) => {
          const c = size / 2, R0 = size / 2 - 6;
          ctx.clearRect(0, 0, size, size);
          ctx.save();
          ctx.translate(c, c);
          ctx.rotate(ang);
          for (let i = 0; i < n; i++) {
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.arc(0, 0, R0, i * seg - Math.PI / 2 - seg / 2, (i + 1) * seg - Math.PI / 2 - seg / 2);
            ctx.closePath();
            ctx.fillStyle = segs[i].label ? '#ffd700' : cols[i % cols.length];
            if (hi === i) ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.save();
            ctx.rotate(i * seg);
            ctx.fillStyle = segs[i].label || hi === i ? '#3a1d00' : '#fff';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const lbl = segs[i].label || U.fmt(E.coins(segs[i].v * bet * m.scale, bet));
            ctx.font = `900 ${Math.max(10, size * (segs[i].label ? 0.034 : 0.045))}px Bungee, sans-serif`;
            ctx.translate(0, -R0 * 0.68);
            ctx.rotate(Math.PI / 2);
            if (!(segs[i].label || hi === i)) ctx.strokeText(lbl, 0, 0);
            ctx.fillText(lbl, 0, 0, R0 * 0.5);
            ctx.restore();
          }
          ctx.restore();
          // rim lights
          for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2 + ang;
            ctx.fillStyle = (i + Math.floor(performance.now() / 150)) % 2 ? '#fff6b0' : '#ff9d00';
            ctx.beginPath(); ctx.arc(c + Math.cos(a) * (R0 - 2), c + Math.sin(a) * (R0 - 2), 3.5, 0, 6.28); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(c, c, size * 0.09, 0, 6.28);
          const hub = ctx.createRadialGradient(c - 5, c - 5, 2, c, c, size * 0.09);
          hub.addColorStop(0, '#fff8c0'); hub.addColorStop(1, '#c48a00');
          ctx.fillStyle = hub; ctx.fill();
        };
        let ang = 0;
        drawWheel(0);
        const idle = setInterval(() => drawWheel(ang), 150);
        const btn = d.querySelector('.ov-btn');
        const go = () => {
          clearInterval(idle);
          clearTimeout(autoT);
          btn.style.visibility = 'hidden';
          A.click();
          const target = Math.PI * 2 * 6 - idx * seg + (Math.random() - 0.5) * seg * 0.6;
          const t0 = performance.now(), dur = this.fast ? 2500 : 5200;
          let lastSeg = 0;
          const st = () => {
            const u = Math.min(1, (performance.now() - t0) / dur);
            ang = target * (1 - Math.pow(1 - u, 4));
            const s = Math.floor((ang + seg / 2) / seg);
            if (s !== lastSeg) { lastSeg = s; A.wheelTick(); }
            drawWheel(ang);
            if (u < 1) requestAnimationFrame(st);
            else {
              A.wheelStop();
              let blink = 0;
              const bl = setInterval(() => { drawWheel(ang, blink++ % 2 ? idx : -1); }, 160);
              d.querySelector('.ov-amount').textContent = U.fmt(amount);
              this.app.fx.coins(50, innerWidth / 2, innerHeight * 0.6);
              this.app.fx.confetti(80);
              setTimeout(() => { clearInterval(bl); this.closeOverlay(d).then(res); }, 2600);
            }
          };
          st();
        };
        btn.addEventListener('click', go, { once: true });
        const autoT = setTimeout(go, 4000);
      });
      if (this.dead) throw DEAD;
      this.app.credit(amount);
      this.setWin(amount, true);
      if (amount / bet >= BIG[0][0]) await this.bigWin(amount, bet);
      this.app.refresh(true);
      this.setMsg(`<span class="big">BONUS WIN ${U.fmt(amount)}</span>`);
    }

    /* ---------- paytable ---------- */
    paytable() {
      const m = this.m, bet = this.bet;
      const unit = m.mech === 'lines' ? bet / m.paylines.length : m.mech === 'ways' || m.mech === 'megaways' ? bet / 20 : bet;
      const items = [];
      for (let i = m.normalCount - 1; i >= 0; i--) {
        const s = m.symbols[i];
        const rows = Object.keys(s.pays).filter((k) => s.pays[k] > 0).sort((a, b) => b - a).map((k) => {
          let lbl = 'x' + k;
          if (m.mech === 'cluster') lbl = k === '15' ? '15+' : k;
          if (m.mech === 'scatter') lbl = k === '12' ? '12+' : k === '10' ? '10-11' : '8-9';
          return `<i>${lbl}</i> ${U.fmt(s.pays[k] * unit * m.scale)}`;
        });
        const show = m.mech === 'cluster' ? rows.filter((_, j) => j % 2 === 0 || j === rows.length - 1) : rows;
        items.push(`<div class="pay-item"><span class="e">${s.e}</span><span class="p">${show.join('<br>')}</span></div>`);
      }
      const specials = ['wild', 'scatter', 'coin', 'bonus', 'bomb'].map((t) => m.symbols.find((s) => s.type === t)).filter(Boolean);
      const spItems = specials.map((s) => {
        const names = { wild: 'WILD', scatter: 'SCATTER', coin: 'HOLD & WIN', bonus: 'BONUS', bomb: 'MULTIPLIER' };
        let p = names[s.type];
        if (s.spays) p += '<br>' + [5, 4, 3].map((k) => `<i>x${k}</i> ${U.fmt(s.spays[k] * bet * m.scale)}`).join('<br>');
        return `<div class="pay-item"><span class="e">${s.e}</span><span class="p">${p}</span></div>`;
      });
      let linesHtml = '';
      if (m.mech === 'lines' && m.paylines.length > 1) {
        linesHtml = '<h4>PAYLINES</h4><div class="lines-grid">' + m.paylines.map((ln, i) => {
          const w = m.reels * 10, h = m.rows * 10;
          let cells = '';
          for (let r = 0; r < m.reels; r++) for (let y = 0; y < m.rows; y++) cells += `<rect x="${r * 10 + 1}" y="${y * 10 + 1}" width="8" height="8" rx="1.5" fill="${ln[r] === y ? root.LINE_COLORS[i % 10] : 'rgba(255,255,255,0.12)'}"/>`;
          return `<div class="mini-line"><svg viewBox="0 0 ${w} ${h}">${cells}</svg>${i + 1}</div>`;
        }).join('') + '</div>';
      }
      const gridTxt = m.mech === 'megaways' ? `${m.reels}릴 × ${m.minRows}~${m.maxRows}행 (최대 ${U.fmt(Math.pow(m.maxRows, m.reels))} 웨이즈)` : `${m.reels}릴 × ${m.rows}행`;
      const mechTxt = {
        lines: `${m.paylines.length}개 페이라인, 왼쪽 첫 릴부터 연속으로 같은 심볼이 이어지면 당첨.`,
        ways: `${U.fmt(Math.pow(m.rows, m.reels))} 웨이즈: 왼쪽 릴부터 인접한 릴에 같은 심볼이 있으면 위치와 상관없이 당첨.`,
        megaways: '메가웨이즈: 매 스핀 각 릴의 높이(2~7)가 바뀌며 웨이즈 수가 변합니다. 왼쪽부터 인접 릴에 같은 심볼이면 당첨.',
        cluster: '클러스터 페이: 같은 심볼 5개 이상이 상하좌우로 붙어 있으면 당첨.',
        scatter: '스캐터 페이: 같은 심볼이 화면 어디에서든 8개 이상이면 당첨.',
      }[m.mech];
      const d = this.overlay(`<div class="modal-box"><button class="icon-btn modal-close">✕</button>
        <h3>${m.name}</h3><div style="color:var(--accent2);font-family:Bungee;font-size:12px">${m.en}</div>
        <p>${m.desc}</p>
        <h4>GAME RULES</h4><ul><li>${gridTxt}</li><li>${mechTxt}</li>${featureList(m).map((f) => `<li>${f}</li>`).join('')}
        <li>현재 베팅 ${U.fmt(bet)} 기준 배당 (코인). 이론 RTP 약 96%.</li></ul>
        <h4>SPECIAL</h4><div class="pay-grid">${spItems.join('')}</div>
        <h4>PAYTABLE${m.mech === 'ways' || m.mech === 'megaways' ? ' (1 웨이 기준, 웨이 수만큼 곱해짐)' : m.mech === 'cluster' ? ' (클러스터 크기별)' : ''}</h4><div class="pay-grid">${items.join('')}</div>
        ${linesHtml}</div>`, 'modal');
      const close = () => { A.click(); this.closeOverlay(d); };
      d.querySelector('.modal-close').addEventListener('click', close);
      d.addEventListener('click', (e) => { if (e.target === d) close(); });
    }
  }

  Game.featureList = featureList;
  Game.mechLabel = mechLabel;
  root.SlotGame = Game;
})(window);
