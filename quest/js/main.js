/* 행운의 궁전 — flow controller.
   Each hall (chapter) runs automatically: 사천성 → 틀린그림찾기 → 슬롯 축제 → next hall, forever (seasons).
   Owns the wallet, quests, achievements, attendance, levels, shop, menus and all transitions. */
(function (root) {
  const U = root.U, A = root.SlotAudio, Art = root.SlotArt, C = root.QuestConfig, S = root.QuestStory, Shop = root.QuestShop, E = root.SlotEngine;
  const M = root.MACHINES;
  const $ = (s) => document.querySelector(s);
  const PHASES = ['shisen', 'diff', 'slot'];
  const PHASE_KR = { shisen: '봉인 해제 · 사천성', diff: '거울 세계 · 틀린그림찾기', slot: '홀 개방 축제 · 슬롯' };
  const PUZZLE_MUSIC = {
    shisen: [['zen', 'pentaMaj', 76], ['chinese', 'pentaMaj', 96], ['japanese', 'inScale', 80], ['fairy', 'lydian', 96]],
    diff: [['lofi', 'major', 78], ['bossa', 'major', 112], ['ambient', 'lydian', 72], ['musicbox', 'harmMinor', 88]],
  };
  const today = (off) => { const d = new Date(Date.now() + (off || 0) * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  const Q = {
    state: null,
    flow: 0,

    /* ---------- boot ---------- */
    init() {
      C.start();
      this.shader = new root.ShaderBG($('#bgl'));
      this.amb = new root.SlotAmbient($('#amb'));
      this.fx = new root.SlotFx($('#fx'));
      this.load();
      this.prepared = {};
      this.setTheme(M[this.state.hall].theme);
      [['music', 0.8], ['sfx', 1], ['amb', 0.8]].forEach(([k, d]) => A.setVolume(k, U.store.get('vol.' + k, d)));
      this.bindSound();
      this.bindHud();
      this.refresh();
      C.onChange(() => { if (this.game) this.game.applyRtp(); this.refresh(); });
      $('#ts-start').addEventListener('click', () => {
        A.init();
        A.click();
        $('#title').classList.add('out');
        setTimeout(() => $('#title').classList.add('hidden'), 600);
        this.begin();
      });
      ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => A.init(), { passive: true }));
      let last = performance.now();
      const frame = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        this.shader.draw(t, dt);
        this.amb.draw(t, dt);
        if (this.game && this.game.R) this.game.R.draw(t);
        this.fx.draw(t, dt);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    machine(i) {
      const cfg = M[i % M.length];
      if (!this.prepared[cfg.id]) this.prepared[cfg.id] = E.prepare(cfg, root.SLOT_CALIBRATION);
      return this.prepared[cfg.id];
    },
    fresh() {
      return {
        v: 1, coins: C.num('경제', '시작코인'), season: 1, hall: 0, phase: 'shisen', step: 0, cnt: { shisen: 0, diff: 0 }, spins: 0,
        xp: 0, level: 1, stats: {}, ach: {}, daily: null, login: { last: '', streak: 0 }, welcomed: false, customIdx: 0,
      };
    },
    load() {
      const s = U.store.get('quest', null);
      this.state = s && s.v === 1 ? Object.assign(this.fresh(), s) : this.fresh();
    },
    save() { U.store.set('quest', this.state); },

    /* ---------- wallet (also used by the slot module) ---------- */
    get balance() { return this.state.coins; },
    credit(x) { this.state.coins = Math.max(0, Math.round((this.state.coins + x) * 100) / 100); this.save(); },
    refresh(bump) {
      document.querySelectorAll('.js-balance').forEach((el) => {
        el.textContent = U.fmt(this.state.coins);
        if (bump) { const w = el.parentElement; w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
      });
      const st = this.state;
      const need = this.xpNeed(st.level);
      document.querySelectorAll('.js-lv').forEach((e) => { e.textContent = st.level; });
      document.querySelectorAll('.js-xp').forEach((e) => { e.style.width = Math.min(100, (st.xp / need) * 100) + '%'; });
      this.updateChapter();
    },
    spend(cost, what) {
      if (cost <= 0) return true;
      if (this.state.coins >= cost) { this.credit(-cost); this.refresh(true); return true; }
      A.buzz();
      this.openShop(`${what || ''} 코인이 ${U.fmt(cost - this.state.coins)}개 부족해요`);
      return false;
    },
    lowBalance() { this.openShop('코인이 부족해요'); },
    setTheme(th) { this.shader.setTheme(th); this.amb.setTheme(th); ['--accent', '--accent2'].forEach((k, i) => document.documentElement.style.setProperty(k, i ? th.accent2 : th.accent)); },
    goLobby() { this.openMenu(); },

    /* ---------- progression ---------- */
    xpNeed(lv) { return 100 + lv * 60; },
    addXp(n) {
      const st = this.state;
      st.xp += n;
      while (st.xp >= this.xpNeed(st.level)) {
        st.xp -= this.xpNeed(st.level);
        st.level++;
        const reward = st.level * 100;
        this.credit(reward);
        this.toast(`LEVEL UP! Lv.${st.level}  +${U.fmt(reward)}`);
        this.fx.explode(innerWidth / 2, innerHeight * 0.3, 2.5, ['#ffe27a', '#fff', '#7fffd4']);
        A.qQuest();
      }
      this.save(); this.refresh();
    },
    emit(ev, n, isMax) {
      const st = this.state;
      n = n == null ? 1 : n;
      if (!isMax) st.stats[ev] = (st.stats[ev] || 0) + n;
      else st.stats[ev + '_max'] = Math.max(st.stats[ev + '_max'] || 0, n);
      // daily
      this.ensureDaily();
      const reward = C.num('보상', '일일퀘스트_보상');
      st.daily.quests.forEach((q) => {
        if (q.done || q.ev !== ev) return;
        q.progress = q.max ? Math.max(q.progress, n) : q.progress + n;
        if (q.progress >= q.target) {
          q.progress = q.target; q.done = true;
          this.credit(reward);
          this.toast(`퀘스트 완료! ${q.title}  +${U.fmt(reward)}`);
          A.qQuest();
          $('.js-qdot').classList.remove('hidden');
        }
      });
      // achievements (endless tiers)
      S.ACH.forEach((a) => {
        if (a.ev !== ev) return;
        let tier = st.ach[a.id] || 0;
        while ((st.stats[ev] || 0) >= S.achTarget(tier)) {
          const r = C.num('보상', '업적_보상') * (tier + 1);
          this.credit(r);
          tier++;
          this.toast(`업적 「${a.name}」 ${tier}단계 달성!  +${U.fmt(r)}`);
          A.qQuest();
        }
        st.ach[a.id] = tier;
      });
      this.save();
      this.refresh(true);
    },
    ensureDaily() {
      const st = this.state, k = today();
      if (!st.daily || st.daily.date !== k) st.daily = { date: k, quests: S.dailyFor(k) };
    },

    /* ---------- main flow ---------- */
    async begin() {
      const st = this.state;
      if (!st.welcomed) {
        await this.lumi(S.LINES.welcome[0], 6000);
        st.welcomed = true; this.save();
      }
      await this.attendance();
      this.runPhase();
    },
    need(phase) { return phase === 'shisen' ? Math.max(1, C.num('순환', '사천성_판수')) : phase === 'diff' ? Math.max(1, C.num('순환', '틀린그림_판수')) : Math.max(1, C.num('순환', '슬롯_스핀수')); },
    updateChapter() {
      const el = $('.js-chapter');
      if (!el || !this.state) return;
      const st = this.state, m = M[st.hall];
      const ph = st.phase;
      el.innerHTML = `<span class="ch-season">SEASON ${st.season}</span><span class="ch-hall">제 ${st.hall + 1}홀 · ${m.name}</span>
        <span class="ch-steps">${PHASES.map((p) => `<i class="${p === ph ? 'on' : PHASES.indexOf(p) < PHASES.indexOf(ph) ? 'done' : ''}">${{ shisen: '사천성', diff: '틀린그림', slot: '슬롯' }[p]}</i>`).join('<b>›</b>')}</span>`;
    },
    music(phase) {
      const st = this.state, m = this.machine(st.hall);
      A.setMachine(m);
      if (phase === 'slot') return; // the slot module starts its own music
      const list = PUZZLE_MUSIC[phase];
      const [style, scale, bpm] = list[(st.hall + st.season) % list.length];
      A.playMusic({ id: 'q-' + phase + st.hall, music: { style, scale, bpm, root: m.music.root }, sfx: m.sfx });
    },
    clearStage() {
      if (this.mg) { this.mg.destroy(); this.mg = null; }
      if (this.game) { this.game.destroy(); this.game = null; }
      $('.js-slotq').classList.add('hidden');
      clearInterval(this.slotWatch);
    },
    async runPhase() {
      const token = ++this.flow;
      const st = this.state;
      this.clearStage();
      const m = this.machine(st.hall);
      this.setTheme(m.theme);
      this.music(st.phase);
      this.refresh();
      if (st.phase === 'slot') { this.startSlot(token); return; }
      $('#play').classList.remove('hidden');
      const kind = st.phase;
      const stageNo = st.cnt[kind] + 1;
      const params = kind === 'shisen' ? C.shisen(stageNo) : C.diff(stageNo);
      await this.introCard(`${PHASE_KR[kind]}`, `${st.step + 1} / ${this.need(kind)}`, S.pick(S.LINES[kind]), `입장료 🪙${U.fmt(params.fee)}`);
      if (token !== this.flow) return;
      if (!this.spend(params.fee, '입장료가')) { this.afterShop = () => this.runPhase(); return; }
      this.startPuzzle(kind, stageNo, params, token);
    },
    startPuzzle(kind, stageNo, params, token) {
      const st = this.state;
      const host = $('.js-mg');
      host.className = 'mg-host js-mg ' + kind;
      const seed = U.hashStr(`${st.season}-${st.hall}-${kind}-${stageNo}`);
      const common = {
        params, stage: stageNo, seed, m: this.machine(st.hall), machineId: M[st.hall].id, fx: this.fx,
        spend: (c, w) => { const ok = this.spend(c, w + '에'); return ok; },
        onEvent: (type, d) => this.puzzleEvent(kind, type, d),
        onEnd: (res) => { if (token === this.flow) this.puzzleEnd(kind, res, params, stageNo, token); },
      };
      if (kind === 'diff') {
        const custom = C.customDiffs();
        if (st.customIdx < custom.length) { common.custom = custom[st.customIdx]; this.usingCustom = true; } else this.usingCustom = false;
        this.mg = new root.SpotDiffGame(host, common);
      } else this.mg = new root.ShisenGame(host, common);
      requestAnimationFrame(() => { if (this.mg) { this.mg.layout(); this.mg.start(); } });
    },
    puzzleEvent(kind, type, d) {
      if (kind === 'shisen' && type === 'match') { this.emit('shisen_match', 1); if (d.combo >= 2) this.emit('shisen_combo', d.combo, true); }
      if (kind === 'diff' && type === 'found') this.emit('diff_found', 1);
    },
    async puzzleEnd(kind, res, p, stageNo, token) {
      const st = this.state;
      if (!res.cleared) return this.puzzleFail(kind, p, token);
      const rows = [['클리어 보상', p.reward]];
      const tb = Math.round(res.timeLeft * p.timeBonus);
      if (tb) rows.push([`남은 시간 ${Math.ceil(res.timeLeft)}초`, tb]);
      let stars;
      if (kind === 'shisen') {
        if (res.maxCombo > 1) rows.push([`최고 콤보 x${res.maxCombo}`, res.maxCombo * p.comboBonus]);
        if (res.gold) rows.push(['황금 타일', res.gold]);
        const r = res.timeLeft / p.time;
        stars = r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
      } else {
        stars = res.misses === 0 && res.hints === 0 ? 3 : res.misses <= 2 ? 2 : 1;
        if (res.misses === 0 && res.hints === 0) rows.push(['오답·힌트 없이 완벽!', 150]);
      }
      const total = rows.reduce((a, r) => a + r[1], 0);
      this.credit(total);
      st.cnt[kind]++;
      st.step++;
      if (kind === 'diff' && this.usingCustom) st.customIdx++;
      this.save();
      this.emit(kind === 'shisen' ? 'shisen_clear' : 'diff_clear', 1);
      if (kind === 'diff' && res.misses === 0) this.emit('diff_perfect', 1);
      this.addXp(40);
      A.qClear();
      this.fx.confetti(90);
      this.fx.explode(innerWidth / 2, innerHeight * 0.4, 3.5, ['#ffe27a', '#fff', M[st.hall].theme.accent]);
      const nextLabel = this.peekNext();
      await this.result(stars, rows, total, nextLabel, token);
      if (token !== this.flow) return;
      this.advance();
    },
    peekNext() {
      const st = this.state;
      if (st.step < this.need(st.phase)) return PHASE_KR[st.phase];
      return PHASE_KR[PHASES[(PHASES.indexOf(st.phase) + 1) % 3]];
    },
    advance() {
      const st = this.state;
      if (st.step >= this.need(st.phase)) {
        st.phase = PHASES[(PHASES.indexOf(st.phase) + 1) % 3];
        st.step = 0;
        if (st.phase === 'slot') st.spins = 0;
      }
      this.save();
      A.qWhoosh();
      this.runPhase();
    },
    puzzleFail(kind, p, token) {
      A.qFail();
      this.mg.paused = true;
      const d = this.ov(`<div class="ov-glow" style="--glow:rgba(255,60,90,.45)"></div>
        <div class="title3d small fail" data-t="TIME OVER">TIME OVER</div>
        <div class="lumi-mini"><span>🦊</span><p>${S.pick(S.LINES.fail)} 시간을 사서 이어서 할 수 있어요.</p></div>
        <button class="cta big js-ext">⏱️ +${p.extendSec}초 계속하기 <span class="price">🪙 ${U.fmt(p.extendCost)}</span></button>
        <button class="ghost-btn js-retry">처음부터 다시 <span class="price">🪙 ${U.fmt(p.fee)}</span></button>`, 'fail-ov');
      d.querySelector('.js-ext').addEventListener('click', () => {
        if (!this.spend(p.extendCost, '시간 연장에')) return;
        A.click();
        this.close(d);
        this.mg.resume(p.extendSec);
      });
      d.querySelector('.js-retry').addEventListener('click', () => {
        if (this.state.coins < p.fee) { this.spend(p.fee, '다시 하기에'); return; }
        A.click();
        this.close(d);
        this.runPhase();
      });
    },

    /* ---------- slot festival ---------- */
    async startSlot(token) {
      const st = this.state;
      $('#play').classList.add('hidden');
      await this.introCard('홀 개방 축제', M[st.hall].name, S.pick(S.LINES.slot), `축제 스핀 ${this.need('slot')}회`);
      if (token !== this.flow) return;
      this.game = new root.SlotGame(this, M[st.hall]);
      this.game.mount();
      this.slotChip();
      const chip = $('.js-slotq'), logo = $('#game .g-logo');
      if (logo && chip.previousElementSibling !== logo) logo.after(chip);
      chip.classList.remove('hidden');
    },
    slotChip() {
      const st = this.state, n = this.need('slot');
      $('.js-slotq').innerHTML = `<span class="sq-ico">🎉</span><span>축제 스핀 <b>${Math.min(st.spins, n)}</b> / ${n}</span><i><em style="width:${Math.min(100, (st.spins / n) * 100)}%"></em></i><span class="sq-next">완료하면 다음 홀로</span>`;
    },
    onSlotEvent(type, d) {
      const st = this.state;
      if (type === 'spin') {
        this.emit('slot_spin', 1);
        if (d.win > 0) this.emit('slot_win', d.win);
        this.addXp(2);
        if (st.phase === 'slot' && !d.free) {
          st.spins++;
          this.save();
          this.slotChip();
          if (st.spins >= this.need('slot') && !this.slotWatch) {
            if (this.game) this.game.auto = 0;
            const token = this.flow;
            // wait until the current spin, free spins and bonuses are finished
            this.slotWatch = setInterval(() => {
              const g = this.game;
              if (!g || token !== this.flow) { clearInterval(this.slotWatch); this.slotWatch = null; return; }
              if (g.busy || g.fs || g.hw || document.querySelector('#overlays .ov')) return;
              clearInterval(this.slotWatch); this.slotWatch = null;
              setTimeout(() => { if (token === this.flow) this.finishHall(); }, 1200);
            }, 400);
          }
        }
      }
      if (type === 'bigwin') this.emit('slot_bigwin', 1);
    },
    async finishHall() {
      const st = this.state;
      const token = ++this.flow;
      this.clearStage();
      const reward = C.num('보상', '챕터완료_보상');
      this.credit(reward);
      this.emit('hall_open', 1);
      this.addXp(100);
      A.qChapter();
      this.fx.fireworks(6);
      const m = M[st.hall];
      await this.result(3, [[`제 ${st.hall + 1}홀 「${m.name}」 개방`, reward]], reward, '다음 홀로 이동', token, 'HALL OPEN!');
      if (token !== this.flow) return;
      st.hall++;
      if (st.hall >= M.length) { st.hall = 0; st.season++; this.save(); await this.lumi(S.LINES.season[0], 6000); }
      st.phase = 'shisen'; st.step = 0; st.spins = 0;
      this.save();
      await this.travel();
      if (token !== this.flow) return;
      this.runPhase();
    },

    /* ---------- overlays ---------- */
    ov(html, cls) {
      const d = document.createElement('div');
      d.className = 'ov ' + (cls || '');
      d.innerHTML = html;
      $('#overlays').appendChild(d);
      return d;
    },
    close(d) { d.classList.add('out'); setTimeout(() => d.remove(), 350); },
    toast(text) {
      const t = document.createElement('div');
      t.className = 'q-toast';
      t.textContent = text;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3200);
    },
    // short stage card with Lumi's line; closes by itself
    introCard(title, sub, line, foot) {
      return new Promise((res) => {
        A.qWhoosh();
        const st = this.state;
        const d = this.ov(`<div class="ic-band"><div class="ic-kicker">SEASON ${st.season} · 제 ${st.hall + 1}홀 ${M[st.hall].name}</div>
          <div class="ic-title">${title}</div><div class="ic-sub">${sub}</div>${foot ? `<div class="ic-foot">${foot}</div>` : ''}</div>
          <div class="lumi-mini"><span>🦊</span><p>${line}</p></div>`, 'intro-card');
        const done = () => { clearTimeout(tm); this.close(d); setTimeout(res, 250); };
        const tm = setTimeout(done, 2400);
        d.addEventListener('click', done, { once: true });
      });
    },
    result(stars, rows, total, nextLabel, token, title) {
      return new Promise((res) => {
        const auto = Math.max(1, C.num('순환', '자동진행_초'));
        const d = this.ov(`<div class="ov-rays"></div><div class="ov-glow"></div>
          <div class="res-stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.22}s">★</span>`).join('')}</div>
          <div class="title3d small" data-t="${title || 'CLEAR!'}">${title || 'CLEAR!'}</div>
          <div class="res-rows">${rows.map((r, i) => `<div style="animation-delay:${0.6 + i * 0.15}s"><span>${r[0]}</span><b>+${U.fmt(r[1])}</b></div>`).join('')}</div>
          <div class="amount3d js-total" data-t="0">0</div>
          <div class="res-next"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="prog" cx="20" cy="20" r="17" style="animation-duration:${auto + 1.4}s"/></svg><span>다음: <b>${nextLabel}</b></span></div>`, 'tier-1 result');
        const am = d.querySelector('.js-total');
        const t0 = performance.now() + 700, dur = 1100;
        A.rollup && setTimeout(() => A.rollup(dur, true), 700);
        const st = () => {
          const u = U.clamp((performance.now() - t0) / dur, 0, 1);
          const v = U.fmt(Math.round(total * U.easeOutCubic(u)));
          am.textContent = v; am.dataset.t = v;
          if (u < 1 && d.isConnected) requestAnimationFrame(st);
          else if (u >= 1) { this.refresh(true); this.fx.coins(24, innerWidth / 2, innerHeight * 0.62, 120); }
        };
        requestAnimationFrame(st);
        const done = () => { clearTimeout(tm); this.close(d); setTimeout(res, 300); };
        const tm = setTimeout(done, (auto + 1.4) * 1000);
        d.addEventListener('click', () => { if (performance.now() - t0 > 400) done(); });
      });
    },
    travel() {
      return new Promise((res) => {
        const st = this.state;
        const cur = st.hall, prev = (cur + M.length - 1) % M.length;
        const nodes = M.map((c, i) => {
          const m = this.machine(i);
          const icon = Art.icon(m, m.normalCount - 1, 40);
          const cls = i < cur || (st.season > 1) ? 'open' : i === cur ? 'next' : '';
          return `<div class="tr-node ${cls}" style="--c:${c.theme.accent}"><img alt="" src="${icon}"><span>${i + 1}</span></div>`;
        }).join('');
        const d = this.ov(`<div class="tr-head">SEASON ${st.season} · 궁전 지도</div>
          <div class="tr-map"><div class="tr-track js-track">${nodes}<div class="tr-fox js-fox">🦊</div></div></div>
          <div class="title3d small" data-t="제 ${cur + 1}홀">제 ${cur + 1}홀</div>
          <div class="ov-sub">${M[cur].name} · ${M[cur].en}</div>
          <div class="lumi-mini"><span>🦊</span><p>${S.HALL_INTRO[M[cur].id] || ''}</p></div>`, 'travel');
        const track = d.querySelector('.js-track'), fox = d.querySelector('.js-fox');
        const nodeEls = track.querySelectorAll('.tr-node');
        const place = (i) => { const n = nodeEls[i]; return n.offsetLeft + n.offsetWidth / 2; };
        requestAnimationFrame(() => {
          const map = d.querySelector('.tr-map');
          fox.style.left = place(prev) + 'px';
          map.scrollLeft = place(cur) - map.clientWidth / 2;
          setTimeout(() => { fox.style.left = place(cur) + 'px'; A.qWhoosh(); }, 500);
          setTimeout(() => { nodeEls[cur].classList.add('arrive'); A.qChapter(); this.setTheme(M[cur].theme); }, 1400);
        });
        const done = () => { clearTimeout(tm); this.close(d); setTimeout(res, 300); };
        const tm = setTimeout(done, 4200);
        d.addEventListener('click', done, { once: true });
      });
    },
    lumi(text, ms) {
      return new Promise((res) => {
        A.qDialog();
        const d = this.ov(`<div class="lumi-big"><div class="lb-fox">🦊</div><div class="lb-bubble"><b>루미</b><p class="js-txt"></p><small>탭해서 계속</small></div></div>`, 'lumi-ov');
        const p = d.querySelector('.js-txt');
        let i = 0;
        const typer = setInterval(() => { p.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typer); }, 28);
        const done = () => { clearInterval(typer); clearTimeout(tm); this.close(d); setTimeout(res, 300); };
        const tm = setTimeout(done, ms || 5000);
        d.addEventListener('click', () => { if (i < text.length) { i = text.length; p.textContent = text; } else done(); });
      });
    },
    attendance() {
      const st = this.state, k = today();
      this.ensureDaily();
      if (st.login.last === k) return Promise.resolve();
      st.login.streak = st.login.last === today(-1) ? Math.min(st.login.streak + 1, 99) : 1;
      st.login.last = k;
      const day = ((st.login.streak - 1) % 7) + 1;
      const reward = C.num('보상', '출석_기본') + Math.min(st.login.streak - 1, 6) * C.num('보상', '출석_연속보너스');
      this.save();
      return new Promise((res) => {
        const d = this.ov(`<div class="ov-glow"></div><div class="ov-kicker">DAILY REWARD</div>
          <div class="title3d small" data-t="출석 ${st.login.streak}일째">출석 ${st.login.streak}일째</div>
          <div class="att-row">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<div class="${i < day ? 'got' : i === day ? 'today' : ''}"><span>${i}일</span><b>🪙</b><em>${U.fmt(C.num('보상', '출석_기본') + (i - 1) * C.num('보상', '출석_연속보너스'))}</em></div>`).join('')}</div>
          <button class="cta big js-get">받기 +${U.fmt(reward)}</button>`, 'tier-1');
        const done = () => {
          clearTimeout(tm);
          this.credit(reward); this.refresh(true);
          this.fx.coins(40, innerWidth / 2, innerHeight * 0.65, 140); A.win(6);
          this.close(d); setTimeout(res, 400);
        };
        d.querySelector('.js-get').addEventListener('click', done, { once: true });
        const tm = setTimeout(done, 7000);
      });
    },

    /* ---------- panels ---------- */
    pauseAll(on) {
      if (this.mg) this.mg.paused = on;
    },
    panel(html, onClose) {
      this.pauseAll(true);
      const d = this.ov(`<div class="modal-box q-panel">${html}</div>`, 'modal');
      const close = () => { A.click(); this.close(d); if (!document.querySelector('#overlays .modal:not(.out)')) this.pauseAll(false); onClose && onClose(); };
      d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('.js-close')) close(); });
      return { d, close };
    },
    async openShop(reason) {
      if (document.querySelector('#overlays .shop')) return;
      const list = await Shop.prices(C.products());
      const mode = Shop.mode();
      const after = this.afterShop; this.afterShop = null;
      const { d, close } = this.panel(`<div class="modal-head"><div><h3>코인 상점</h3><div class="en">COIN SHOP</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        ${reason ? `<p class="shop-reason">${reason}</p>` : ''}
        <div class="shop-grid">${list.map((p, i) => `<button class="shop-item" data-i="${i}" style="--n:${i}">
            ${i === 2 ? '<span class="shop-tag">인기</span>' : i === list.length - 1 ? '<span class="shop-tag best">최고 가치</span>' : ''}
            <span class="shop-pile">${'🪙'.repeat(Math.min(5, i + 1))}</span>
            <b>${U.fmt(p.coins)}</b><span class="shop-price">${p.price}</span></button>`).join('')}</div>
        <p class="shop-note">${mode === '구글플레이' ? '결제는 Google Play로 처리됩니다. 구매한 코인은 환불·현금화되지 않습니다.' : '⚠️ 테스트 결제 모드 — 실제 돈은 청구되지 않고 바로 지급됩니다.'}</p>`, () => { if (after) after(); });
      d.classList.add('shop');
      d.querySelectorAll('.shop-item').forEach((b) => b.addEventListener('click', async () => {
        const p = list[+b.dataset.i];
        A.click();
        const r = await Shop.buy(p, (pp) => this.confirmTest(pp));
        if (r.ok) {
          this.credit(p.coins);
          this.refresh(true);
          this.toast(`🪙 ${U.fmt(p.coins)} 코인이 지급됐어요`);
          this.fx.coins(70, innerWidth / 2, innerHeight * 0.6, 200);
          this.fx.explode(innerWidth / 2, innerHeight * 0.45, 3, ['#ffe27a', '#fff']);
          A.win(10);
          close();
        } else if (r.reason) this.toast(r.reason);
      }));
    },
    confirmTest(p) {
      return new Promise((res) => {
        const d = this.ov(`<div class="modal-box q-panel" style="max-width:360px;text-align:center"><h3>테스트 결제</h3>
          <p>실제 결제는 되지 않습니다.<br>코인 <b>${U.fmt(p.coins)}</b>개(표시가격 ${p.price})를 지급할까요?</p>
          <button class="cta js-y">지급하기</button> <button class="ghost-btn js-n">취소</button></div>`, 'modal');
        d.querySelector('.js-y').addEventListener('click', () => { this.close(d); res(true); });
        d.querySelector('.js-n').addEventListener('click', () => { this.close(d); res(false); });
      });
    },
    openQuests() {
      this.ensureDaily();
      $('.js-qdot').classList.add('hidden');
      const st = this.state;
      const bar = (a, b) => `<i class="qbar"><em style="width:${Math.min(100, (a / b) * 100)}%"></em></i>`;
      const daily = st.daily.quests.map((q) => `<div class="q-row ${q.done ? 'done' : ''}"><div><b>${q.title}</b>${bar(q.progress, q.target)}</div><span>${q.done ? '완료 ✓' : `${U.fmt(q.progress)}/${U.fmt(q.target)}`}</span></div>`).join('');
      const ach = S.ACH.map((a) => {
        const tier = st.ach[a.id] || 0, tgt = S.achTarget(tier), v = st.stats[a.ev] || 0;
        return `<div class="q-row"><div><b>${a.name} <small>${tier}단계</small></b>${bar(v, tgt)}</div><span>${U.fmt(v)}/${U.fmt(tgt)}${a.unit}</span></div>`;
      }).join('');
      this.panel(`<div class="modal-head"><div><h3>퀘스트</h3><div class="en">QUESTS</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <h4>오늘의 퀘스트 · 개당 🪙${U.fmt(C.num('보상', '일일퀘스트_보상'))}</h4>${daily}
        <h4>업적 (끝없이 단계가 올라갑니다)</h4>${ach}
        <h4>기록</h4><p>시즌 ${st.season} · 연 홀 ${st.stats.hall_open || 0}개 · 연속 출석 ${st.login.streak}일 · Lv.${st.level}</p>`);
    },
    openMenu() {
      const ago = C.loadedAt ? Math.max(0, Math.round((Date.now() - C.loadedAt) / 60000)) + '분 전' : '기본값 사용 중';
      const { d, close } = this.panel(`<div class="modal-head"><div><h3>메뉴</h3><div class="en">MENU</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <div class="menu-list">
          <button class="js-m-resume">▶ 계속하기</button>
          <button class="js-m-quest">📜 퀘스트</button>
          <button class="js-m-shop">🪙 코인 상점</button>
          <button class="js-m-sound">🔊 사운드</button>
          <button class="js-m-reset danger">↺ 처음부터 다시 시작</button>
        </div>
        <p class="menu-info">설정 파일: ${C.source} · ${ago} 읽음 · 결제 모드: ${Shop.mode()}</p>`);
      d.querySelector('.js-m-resume').addEventListener('click', close);
      d.querySelector('.js-m-quest').addEventListener('click', () => { close(); this.openQuests(); });
      d.querySelector('.js-m-shop').addEventListener('click', () => { close(); this.openShop(); });
      d.querySelector('.js-m-sound').addEventListener('click', (e) => { e.stopPropagation(); close(); setTimeout(() => this.showSound(), 50); });
      d.querySelector('.js-m-reset').addEventListener('click', () => {
        const b = d.querySelector('.js-m-reset');
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '정말 초기화할까요? 한 번 더 누르세요'; return; }
        close();
        this.state = this.fresh(); this.save(); this.refresh();
        this.begin();
      });
    },
    showSound() {
      const panel = $('#sound-panel');
      panel.classList.remove('hidden');
      panel.style.top = '64px'; panel.style.right = '12px';
    },
    bindSound() {
      const panel = $('#sound-panel');
      [['music', 'snd-music'], ['sfx', 'snd-sfx'], ['amb', 'snd-amb']].forEach(([k, id]) => {
        const inp = document.getElementById(id);
        const out = inp.parentElement.querySelector('output');
        const v = Math.round(A.vol[k] * 100);
        inp.value = v; out.textContent = v; inp.style.setProperty('--p', v + '%');
        inp.addEventListener('input', () => {
          const n = +inp.value;
          out.textContent = n; inp.style.setProperty('--p', n + '%');
          A.setVolume(k, n / 100); U.store.set('vol.' + k, n / 100);
        });
      });
      document.querySelectorAll('.js-sound').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
        const r = b.getBoundingClientRect();
        panel.style.top = r.bottom + 8 + 'px';
        panel.style.right = Math.max(8, innerWidth - r.right) + 'px';
      }));
      document.addEventListener('click', (e) => { if (!panel.contains(e.target)) panel.classList.add('hidden'); });
    },
    bindHud() {
      document.querySelectorAll('.js-shop').forEach((b) => b.addEventListener('click', () => { A.click(); this.openShop(); }));
      $('.js-quests').addEventListener('click', () => { A.click(); this.openQuests(); });
      $('.js-menu').addEventListener('click', () => { A.click(); this.openMenu(); });
      // the slot screen's wallet opens the shop too
      document.querySelectorAll('#game .wallet').forEach((w) => { w.style.cursor = 'pointer'; w.addEventListener('click', () => { A.click(); this.openShop(); }); });
    },
  };

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.hostname)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  root.Quest = Q;
  root.SlotApp = Q; // the slot module looks for this name in a few places
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Q.init()); else Q.init();
})(window);
