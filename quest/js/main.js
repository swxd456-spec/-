/* 행운의 궁전 — flow controller.
   Campaign: 12 episodes (15–30 stages each) of mixed mini-games, a slot festival every 5th stage and a boss at the end,
   then a new season. Owns the wallet, map, cutscenes, quests, league, challenges, shop, menus and all transitions. */
(function (root) {
  const U = root.U, A = root.SlotAudio, C = root.QuestConfig, S = root.QuestStory, Shop = root.QuestShop, E = root.SlotEngine;
  const M = root.MACHINES, G = root.QuestGames, Ch = root.Chara, L = root.QuestLeague, VS = root.QuestChallenge;
  const $ = (s) => document.querySelector(s);
  const byId = {}; M.forEach((m) => { byId[m.id] = m; });
  const MUSIC = {
    map: [['musicbox', 'major', 92], ['fairy', 'lydian', 96]],
    match3: [['kawaii', 'major', 118], ['disco', 'major', 116]],
    bubble: [['fairy', 'lydian', 104], ['kawaii', 'pentaMaj', 110]],
    brick: [['chiptune', 'major', 132], ['techno', 'minor', 124]],
    block: [['lofi', 'major', 84], ['lounge', 'major', 96]],
    sling: [['adventure', 'major', 112], ['celtic', 'major', 120]],
    stack: [['ambient', 'lydian', 80], ['zen', 'pentaMaj', 84]],
    shisen: [['zen', 'pentaMaj', 76], ['chinese', 'pentaMaj', 96], ['japanese', 'inScale', 80]],
    diff: [['lofi', 'major', 78], ['bossa', 'major', 112], ['musicbox', 'harmMinor', 88]],
    boss: [['epic', 'harmMinor', 124], ['darkdrums', 'minor', 118]],
  };
  const today = (off) => { const d = new Date(Date.now() + (off || 0) * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fox = (expr, cls) => `<div class="chara ${cls || ''}" data-id="lumi">${Ch.svg('lumi', expr || 'smile')}</div>`;
  const gameInfo = (g) => (g === 'slot' ? { id: 'slot', name: '행운 축제', icon: '🎰', color: '#ffd23f', desc: '축제 스핀을 돌리면 클리어!' } : (G[g] && G[g].info) || { id: g, name: g, icon: '❔', color: '#888', desc: '' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
      this.challenge = VS.take();
      this.setTheme(this.epMachine().theme);
      [['music', 0.8], ['sfx', 1], ['amb', 0.8]].forEach(([k, d]) => A.setVolume(k, U.store.get('vol.' + k, d)));
      this.bindSound();
      this.bindHud();
      this.refresh();
      if (this.challenge) {
        const c = this.challenge;
        $('#ts-start').textContent = '도전장 받기';
        $('.ts-tag').innerHTML = `<b>${esc(c.n)}</b>님의 도전장! 「${gameInfo(c.g).name}」 ${U.fmt(c.sc)}점을 넘어라`;
      }
      C.onChange(() => { if (this.game) this.game.applyRtp(); this.refresh(); });
      $('#ts-start').addEventListener('click', () => {
        A.init(); A.click();
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
    machine(id) {
      const cfg = byId[id] || M[0];
      if (!this.prepared[cfg.id]) this.prepared[cfg.id] = E.prepare(cfg, root.SLOT_CALIBRATION);
      return this.prepared[cfg.id];
    },
    ep(i) { return S.EPISODES[i == null ? this.state.ep : i]; },
    epMachine(i) { return byId[this.ep(i).machines[0]]; },
    fresh() {
      return {
        v: 2, coins: C.num('경제', '시작코인'), season: 1, ep: 0, si: 0, stars: {}, best: {}, seen: {}, seenEp: {},
        xp: 0, level: 1, stats: {}, ach: {}, daily: null, login: { last: '', streak: 0 }, prologue: false, league: null, name: '', customIdx: 0,
      };
    },
    load() {
      const s = U.store.get('quest', null);
      if (s && s.v === 2) this.state = Object.assign(this.fresh(), s);
      else if (s && s.v === 1) {
        // keep the wallet and profile from the first version, start the new campaign
        const f = this.fresh();
        ['coins', 'xp', 'level', 'login', 'customIdx'].forEach((k) => { if (s[k] != null) f[k] = s[k]; });
        this.state = f;
      } else this.state = this.fresh();
      L.ensure(this.state);
    },
    save() { U.store.set('quest', this.state); },
    key(ei, si, season) { return (season || this.state.season) + ':' + ei + ':' + si; },
    unlocked() { return S.unlockedAt(this.state.season > 1 ? S.EPISODES.length - 1 : this.state.ep); },

    /* ---------- wallet (also used by the slot module) ---------- */
    get balance() { return this.state.coins; },
    credit(x) { this.state.coins = Math.max(0, Math.round((this.state.coins + x) * 100) / 100); this.save(); },
    refresh(bump) {
      document.querySelectorAll('.js-balance').forEach((el) => {
        el.textContent = U.fmt(this.state.coins);
        if (bump) { const w = el.parentElement; w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
      });
      const st = this.state, need = this.xpNeed(st.level);
      document.querySelectorAll('.js-lv').forEach((e) => { e.textContent = st.level; });
      document.querySelectorAll('.js-xp').forEach((e) => { e.style.width = Math.min(100, (st.xp / need) * 100) + '%'; });
      const lg = L.ensure(st);
      document.querySelectorAll('.js-league').forEach((e) => { e.innerHTML = `<i style="--tc:${L.TIERS[lg.tier].c}">🏆</i><b>${L.rankOf(lg)}위</b>`; });
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
          document.querySelectorAll('.js-qdot').forEach((d) => d.classList.remove('hidden'));
        }
      });
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
      if (!st.daily || st.daily.date !== k) st.daily = { date: k, quests: S.dailyFor(k, this.unlocked()) };
    },

    /* ---------- main flow ---------- */
    async begin() {
      const st = this.state;
      if (!st.prologue) {
        this.music('map');
        await root.Cinema.play(S.PROLOGUE, { theme: this.epMachine().theme, card: { kicker: 'PROLOGUE', title: '행운의 궁전', sub: 'PALACE OF FORTUNE', hour: 12 } });
        st.prologue = true; this.save();
      }
      await this.attendance();
      await this.leagueResult();
      if (this.challenge) { const c = this.challenge; this.challenge = null; this.runChallenge(c); return; }
      this.showMap(true);
    },
    music(kind) {
      const st = this.state, ep = this.ep();
      const m = this.machine(this.stageMachine || ep.machines[0]);
      A.setMachine(m);
      if (kind === 'slot') return; // the slot module starts its own music
      const list = MUSIC[kind] || MUSIC.map;
      const [style, scale, bpm] = list[(st.ep + st.si + st.season) % list.length];
      A.playMusic({ id: 'q-' + kind + st.ep, music: { style, scale, bpm, root: m.music.root }, sfx: m.sfx });
    },
    clearStage() {
      if (this.mg) { try { this.mg.destroy(); } catch (e) { /* already gone */ } this.mg = null; }
      if (this.game) { this.game.destroy(); this.game = null; }
      $('.js-slotq').classList.add('hidden');
      clearInterval(this.slotWatch); this.slotWatch = null;
      root.QuestMap.stop();
    },
    screen(name) {
      $('#map').classList.toggle('hidden', name !== 'map');
      $('#play').classList.toggle('hidden', name !== 'play');
      if (name !== 'slot') $('#game').classList.add('hidden');
    },

    showMap(auto, foxFrom) {
      const token = ++this.flow;
      const st = this.state;
      // coming back from replaying an older episode: restore the real progress
      if (this.restore) { st.ep = this.restore.ep; st.si = this.restore.si; this.restore = null; this.save(); foxFrom = undefined; }
      this.clearStage();
      this.stageMachine = null;
      this.screen('map');
      this.setTheme(this.epMachine().theme);
      this.music('map');
      this.refresh();
      const ep = this.ep(), lay = S.layout(st.ep);
      root.QuestMap.render($('.js-map'), {
        ei: st.ep, ep, layout: lay, season: st.season, current: st.si, selected: st.si, foxFrom,
        starsOf: (i) => st.stars[this.key(st.ep, i)] || 0,
        info: gameInfo,
        auto: auto ? Math.max(0, C.num('캠페인', '자동시작_초')) : 0,
        onStart: (i) => { if (token === this.flow) this.startStage(i); },
        onEpisodes: () => this.openEpisodes(),
      });
    },

    async startStage(si) {
      const token = ++this.flow;
      const st = this.state, ei = st.ep, ep = this.ep();
      const def = S.layout(ei)[si];
      const replay = si < st.si;
      root.QuestMap.stop();
      this.stage = { ei, si, def, replay, token };
      this.stageMachine = def.machine;
      if (si === 0 && !st.seenEp[st.season + ':' + ei] && !replay) {
        this.music(def.g === 'slot' ? 'map' : def.g);
        await root.Cinema.play(ep.intro, { theme: byId[def.machine].theme, deco: root.QuestMap.DECO[ep.id], card: { kicker: `EPISODE ${ei + 1} · ${ep.hour}시`, title: ep.title, sub: ep.en, hour: ep.hour } });
        st.seenEp[st.season + ':' + ei] = true; this.save();
        if (token !== this.flow) return;
      }
      if (def.boss) {
        this.music('boss');
        await root.Cinema.play([{ cast: [[ep.boss, 'c', 'smug', 'top']], who: ep.boss, text: S.pick(['여기까지 온 걸 칭찬해 주지. 하지만 별조각은 못 줘!', '후후… 내 앞에서 무릎 꿇게 될걸?', '거울님의 이름으로, 너를 막겠다!']), fx: 'lightning' }], { theme: byId[def.machine].theme, deco: root.QuestMap.DECO[ep.id] });
        if (token !== this.flow) return;
      }
      if (def.g === 'slot') return this.startSlot(def, token);
      return this.startGame(def, token);
    },

    async startGame(def, token, chal) {
      const st = this.state;
      const Game = G[def.g];
      if (!Game) { this.toast('이 게임을 불러오지 못했어요'); this.showMap(false); return; }
      const inf = Game.info;
      this.setTheme(byId[def.machine].theme);
      this.music(def.boss ? 'boss' : def.g);
      this.screen('play');
      $('.js-mg').innerHTML = '';
      this.refresh();
      const gs = chal ? chal.gs : S.gameStage(st.season, this.stage.ei, this.stage.si);
      const p = Game.params(gs, C);
      if (chal) p.fee = 0;
      this.updateChapter(def, inf, chal);
      if (!st.seen[def.g]) {
        await this.howto(Game);
        st.seen[def.g] = true; this.save();
        if (token !== this.flow) return;
      }
      await this.introCard(def, inf, p, chal);
      if (token !== this.flow) return;
      if (!this.spend(p.fee, '입장료가')) { this.afterShop = () => { if (token === this.flow) this.startGame(def, token, chal); }; return; }
      const host = $('.js-mg');
      host.className = 'mg-host js-mg ' + def.g;
      const seed = chal ? chal.seed : U.hashStr(`${st.season}-${this.stage.ei}-${this.stage.si}-${def.g}`);
      const meta = chal ? Object.assign({}, chal, { seed, gs }) : { seed, gs };
      const o = {
        params: p, stage: gs, seed, m: this.machine(def.machine), theme: byId[def.machine].theme, machineId: def.machine, fx: this.fx,
        spend: (c, w) => this.spend(c, w),
        onEvent: (type, d) => this.gameEvent(def.g, type, d),
        onEnd: (res) => { if (token === this.flow) this.gameEnd(def, res, p, token, meta); },
      };
      if (def.g === 'diff') {
        const custom = C.customDiffs();
        if (!chal && st.customIdx < custom.length) { o.custom = custom[st.customIdx]; this.usingCustom = true; } else this.usingCustom = false;
      }
      try { this.mg = new Game(host, o); } catch (e) { console.error(e); this.toast('게임 오류가 났어요. 지도로 돌아갑니다.'); this.credit(p.fee); this.showMap(false); return; }
      requestAnimationFrame(() => { if (this.mg) { this.mg.layout(); this.mg.start(); } });
    },
    gameEvent(g, type, d) {
      if (g === 'shisen' && type === 'match') { this.emit('shisen_match', 1); if (d && d.combo >= 2) this.emit('shisen_combo', d.combo, true); }
      if (g === 'diff' && type === 'found') this.emit('diff_found', 1);
      if (type === 'combo' && d && d.n) this.emit(g + '_combo', d.n, true);
    },
    async gameEnd(def, res, p, token, meta) {
      if (!res.cleared) return this.stageFail(def, p, token, meta);
      if (meta && meta.n) return this.challengeEnd(def, res, meta);
      const rows = [['클리어 보상', p.reward]].concat((res.rows || []).filter((r) => r && r[1]));
      if (def.g === 'diff' && this.usingCustom) this.state.customIdx++;
      this.emit(def.g + '_clear', 1);
      if (def.g === 'diff' && res.misses === 0) this.emit('diff_perfect', 1);
      await this.stageClear(def, res.stars || 1, res.score || 0, rows, token, meta);
    },
    async stageClear(def, stars, score, rows, token, meta) {
      const st = this.state, { ei, si, replay } = this.stage;
      const k = this.key(ei, si);
      const prev = st.stars[k] || 0;
      if (stars === 3 && prev < 3) rows.push(['첫 별 세 개!', C.num('캠페인', '별3개_보너스')]);
      if (def.boss && !replay) rows.push([`보스 ${Ch.name(this.ep().boss)} 격파`, C.num('캠페인', '보스_보너스')]);
      st.stars[k] = Math.max(prev, stars);
      st.best[k] = Math.max(st.best[k] || 0, score);
      const total = rows.reduce((a, r) => a + r[1], 0);
      this.credit(total);
      const lp = 100 + stars * 120 + (def.boss ? 300 : 0) + Math.min(200, Math.round(score / 100));
      const lr = L.add(st, lp);
      this.save();
      this.emit('stage_clear', 1);
      if (stars > prev) this.emit('stars', stars - prev);
      if (stars === 3) this.emit('three_star', 1);
      if (def.boss) this.emit('boss_clear', 1);
      this.emit('league_pts', lp);
      this.addXp(30 + stars * 10);
      A.qClear();
      this.fx.confetti(90);
      this.fx.explode(innerWidth / 2, innerHeight * 0.4, 3.5, ['#ffe27a', '#fff', byId[def.machine].theme.accent]);
      const share = def.g !== 'slot' && meta ? { g: def.g, seed: meta.seed, gs: meta.gs, sc: score } : null;
      await this.result({ stars, rows, total, title: def.boss ? 'BOSS CLEAR!' : 'STAGE CLEAR!', league: { lp, before: lr.before, after: lr.after }, share });
      if (token !== this.flow) return;
      this.advance();
    },
    async advance() {
      const st = this.state, { si, replay } = this.stage;
      if (replay) { this.showMap(true); return; }
      const ep = this.ep();
      if (si + 1 >= ep.n) {
        // episode finished: ending scene, episode reward, next world (or a new season)
        const token = ++this.flow;
        this.clearStage();
        this.music('map');
        await root.Cinema.play(ep.outro, { theme: this.epMachine().theme, deco: root.QuestMap.DECO[ep.id] });
        const r = C.num('캠페인', '에피소드_보상');
        this.credit(r); this.refresh(true);
        this.toast(`별조각 획득! 에피소드 보상 +${U.fmt(r)}`);
        this.addXp(150);
        if (st.ep + 1 >= S.EPISODES.length) {
          st.season++; st.ep = 0; st.si = 0; this.save();
          await root.Cinema.play(S.SEASON, { theme: this.epMachine(0).theme, card: { kicker: `SEASON ${st.season}`, title: '새벽의 궁전', sub: '더 강해진 그림자들이 돌아왔다', hour: 1 } });
        } else { st.ep++; st.si = 0; this.save(); }
        if (token !== this.flow) return;
        this.showMap(true);
        return;
      }
      st.si = si + 1;
      this.save();
      this.showMap(true, si);
    },
    stageFail(def, p, token, meta) {
      A.qFail();
      if (this.mg) this.mg.paused = true;
      const free = meta && meta.n;
      const d = this.ov(`<div class="ov-glow" style="--glow:rgba(255,60,90,.45)"></div>
        <div class="title3d small fail" data-t="${p.time ? 'TIME OVER' : 'FAILED'}">${p.time ? 'TIME OVER' : 'FAILED'}</div>
        <div class="lumi-mini">${fox('sad')}<p>${S.pick(S.LINES.fail)} 코인으로 이어서 할 수 있어요.</p></div>
        <button class="cta big js-ext">${p.extendText || '+' + p.extendSec + '초'} 계속하기 <span class="price">🪙 ${U.fmt(p.extendCost)}</span></button>
        <button class="ghost-btn js-retry">처음부터 다시 <span class="price">🪙 ${U.fmt(free ? 0 : p.fee)}</span></button>
        <button class="ghost-btn js-quit">지도로 돌아가기</button>`, 'fail-ov');
      d.querySelector('.js-ext').addEventListener('click', () => {
        if (!this.spend(p.extendCost, '이어하기에')) return;
        A.click(); this.close(d);
        if (this.mg) { this.mg.paused = false; this.mg.resume(p.extendSec); }
      });
      d.querySelector('.js-retry').addEventListener('click', () => {
        const fee = free ? 0 : p.fee;
        if (this.state.coins < fee) { this.spend(fee, '다시 하기에'); return; }
        A.click(); this.close(d);
        const tk = ++this.flow;
        if (this.mg) { this.mg.destroy(); this.mg = null; }
        this.startGame(def, tk, free ? meta : null);
      });
      d.querySelector('.js-quit').addEventListener('click', () => { A.click(); this.close(d); this.showMap(false); });
    },

    /* ---------- slot festival stage ---------- */
    async startSlot(def, token) {
      const cfg = byId[def.machine];
      this.screen('slot');
      this.setTheme(cfg.theme);
      this.slotSpins = 0;
      this.slotNeed = Math.max(1, C.num('캠페인', '축제_스핀수'));
      await this.introCard(def, gameInfo('slot'), { fee: 0 }, null, cfg);
      if (token !== this.flow) return;
      this.game = new root.SlotGame(this, cfg);
      this.game.mount();
      this.slotChip();
      const chip = $('.js-slotq'), logo = $('#game .g-logo');
      if (logo && chip.previousElementSibling !== logo) logo.after(chip);
      chip.classList.remove('hidden');
    },
    slotChip() {
      const n = this.slotNeed;
      $('.js-slotq').innerHTML = `<span class="sq-ico">🎉</span><span>축제 스핀 <b>${Math.min(this.slotSpins, n)}</b> / ${n}</span><i><em style="width:${Math.min(100, (this.slotSpins / n) * 100)}%"></em></i><span class="sq-next">다 돌리면 스테이지 클리어</span>`;
    },
    onSlotEvent(type, d) {
      if (type === 'spin') {
        this.emit('slot_spin', 1);
        if (d.win > 0) this.emit('slot_win', d.win);
        this.addXp(1);
        if (this.game && !d.free && this.stage && this.stage.def.g === 'slot') {
          this.slotSpins++;
          this.slotChip();
          if (this.slotSpins >= this.slotNeed && !this.slotWatch) {
            this.game.auto = 0;
            const token = this.flow;
            this.slotWatch = setInterval(() => {
              const g = this.game;
              if (!g || token !== this.flow) { clearInterval(this.slotWatch); this.slotWatch = null; return; }
              if (g.busy || g.fs || g.hw || document.querySelector('#overlays .ov')) return;
              clearInterval(this.slotWatch); this.slotWatch = null;
              setTimeout(() => {
                if (token !== this.flow) return;
                const def = this.stage.def;
                this.clearStage();
                this.stageClear(def, 3, 0, [['축제 완료', C.num('캠페인', '축제_보상')]], token, null);
              }, 1200);
            }, 400);
          }
        }
      }
      if (type === 'bigwin') this.emit('slot_bigwin', 1);
    },

    /* ---------- challenge links ---------- */
    async runChallenge(c) {
      if (!G[c.g]) { this.toast('알 수 없는 도전장이에요'); this.showMap(true); return; }
      const token = ++this.flow;
      const st = this.state;
      this.stage = { ei: st.ep, si: st.si, def: { g: c.g, machine: this.ep().machines[0] }, replay: true, token };
      this.stageMachine = this.ep().machines[0];
      this.screen('play');
      await root.Cinema.play([
        { cast: [['lumi', 'l', 'surprised', 'left'], ['nocturne', 'r', 'smug', 'right']], who: 'nocturne', text: `도전장이 도착했다. ${c.n}님이 「${gameInfo(c.g).name}」에서 ${U.fmt(c.sc)}점을 냈다는군.` },
        { cast: [['lumi', 'c', 'angry']], who: 'lumi', text: '같은 판이라면 질 수 없지! 받아 주겠어!', fx: 'flash' },
      ], { theme: this.epMachine().theme });
      if (token !== this.flow) return;
      this.startGame(this.stage.def, token, c);
    },
    challengeEnd(def, res, c) {
      const win = (res.score || 0) > c.sc;
      const reward = win ? C.num('캠페인', '도전장_승리보상') : 0;
      if (reward) this.credit(reward);
      this.emit('challenge', 1);
      A[win ? 'qClear' : 'qFail']();
      if (win) this.fx.fireworks(5);
      const d = this.ov(`<div class="ov-rays"></div><div class="ov-glow" style="--glow:${win ? 'rgba(255,190,0,.55)' : 'rgba(120,80,255,.45)'}"></div>
        <div class="title3d small ${win ? '' : 'fail'}" data-t="${win ? 'YOU WIN!' : 'YOU LOSE'}">${win ? 'YOU WIN!' : 'YOU LOSE'}</div>
        <div class="vs-row"><div class="vs-p me"><small>나</small><b>${U.fmt(res.score || 0)}</b></div><div class="vs-x">VS</div><div class="vs-p"><small>${esc(c.n)}</small><b>${U.fmt(c.sc)}</b></div></div>
        ${reward ? `<div class="ov-sub">승리 보상 🪙 ${U.fmt(reward)}</div>` : '<div class="ov-sub">아깝다! 내 점수로 되받아쳐 볼까요?</div>'}
        <button class="cta big js-send">내 점수로 도전장 보내기</button>
        <button class="ghost-btn js-go">모험으로 돌아가기</button>`, 'tier-1 result');
      d.querySelector('.js-send').addEventListener('click', () => this.shareChallenge({ g: def.g, seed: c.seed, gs: c.gs, sc: res.score || 0 }));
      d.querySelector('.js-go').addEventListener('click', () => { A.click(); this.close(d); this.showMap(true); });
    },
    async shareChallenge(c) {
      const st = this.state;
      if (!st.name) { const n = await this.askName(); if (!n) return; }
      const r = await VS.share(Object.assign({ n: st.name, t: Date.now() }, c), gameInfo(c.g).name);
      if (r === 'copied') this.toast('도전장 링크를 복사했어요! 카톡에 붙여넣어 보내 보세요');
      else if (r.startsWith('manual:')) this.panel(`<div class="modal-head"><div><h3>도전장 링크</h3></div><button class="icon-btn js-close">✕</button></div><p>아래 내용을 복사해서 친구에게 보내세요.</p><textarea class="vs-text" readonly>${esc(r.slice(7))}</textarea>`);
    },
    askName() {
      return new Promise((res) => {
        const { d, close } = this.panel(`<div class="modal-head"><div><h3>닉네임</h3><div class="en">NICKNAME</div></div><button class="icon-btn js-close">✕</button></div>
          <p>도전장에 표시될 이름을 정해 주세요.</p><input class="q-input js-name" maxlength="12" placeholder="예: 행운의 여우" value="${esc(this.state.name || '')}"><button class="cta js-ok" style="margin-top:12px">확인</button>`, () => res(this.state.name || ''));
        const inp = d.querySelector('.js-name');
        setTimeout(() => inp.focus(), 100);
        d.querySelector('.js-ok').addEventListener('click', () => { const v = inp.value.trim().slice(0, 12); if (!v) return; this.state.name = v; this.save(); close(); });
      });
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
    updateChapter(def, inf, chal) {
      const el = $('.js-chapter');
      const st = this.state;
      el.innerHTML = chal ? `<span class="ch-season">도전장</span><span class="ch-hall">${esc(chal.n)}님 ${U.fmt(chal.sc)}점을 넘어라</span>`
        : `<span class="ch-season">${this.stage.ei + 1}-${this.stage.si + 1}</span><span class="ch-hall">${inf.icon} ${inf.name}${def.boss ? ' · <b class="ch-boss">BOSS</b>' : ''}</span><span class="ch-ep">${this.ep().title}${st.season > 1 ? ' · S' + st.season : ''}</span>`;
    },
    // first-time tutorial card for a game
    howto(Game) {
      return new Promise((res) => {
        const inf = Game.info;
        const d = this.ov(`<div class="ov-glow" style="--glow:${inf.color}66"></div><div class="ov-kicker">NEW GAME</div>
          <div class="ht-ico" style="--c:${inf.color}">${inf.icon}</div>
          <div class="title3d small" data-t="${inf.name}">${inf.name}</div>
          <ol class="ht-list">${Game.howto.map((l, i) => `<li style="animation-delay:${0.4 + i * 0.25}s">${l}</li>`).join('')}</ol>
          <div class="lumi-mini">${fox('wink')}<p>처음 보는 게임이네요! 이렇게 하면 돼요.</p></div>
          <button class="cta big js-ok">알겠어요!</button>`, 'tier-1 howto');
        A.qChapter && A.qChapter();
        d.querySelector('.js-ok').addEventListener('click', () => { A.click(); this.close(d); setTimeout(res, 250); });
      });
    },
    // stage card: banner + goal + Lumi; closes by itself
    introCard(def, inf, p, chal, cfg) {
      return new Promise((res) => {
        A.qWhoosh();
        const st = this.state;
        const lines = S.LINES[def.boss ? 'boss' : def.g] || S.LINES.clear;
        const kicker = chal ? '친구의 도전장' : `EPISODE ${this.stage.ei + 1} · STAGE ${this.stage.si + 1}${st.season > 1 ? ' · SEASON ' + st.season : ''}`;
        const sub = def.g === 'slot' ? `${cfg.name} · 축제 스핀 ${this.slotNeed}회` : (inf.desc || '');
        const d = this.ov(`<div class="ic-band ${def.boss ? 'boss' : ''}"><div class="ic-kicker">${kicker}</div>
          <div class="ic-title"><span class="ic-ico">${inf.icon}</span>${def.boss ? 'BOSS · ' : ''}${inf.name}</div><div class="ic-sub">${sub}</div>
          ${p.fee ? `<div class="ic-foot">입장료 🪙${U.fmt(p.fee)}</div>` : ''}</div>
          <div class="lumi-mini">${fox(def.boss ? 'angry' : 'joy', 'talking')}<p>${S.pick(lines)}</p></div>`, 'intro-card');
        const done = () => { clearTimeout(tm); this.close(d); setTimeout(res, 250); };
        const tm = setTimeout(done, 2400);
        d.addEventListener('click', done, { once: true });
      });
    },
    result(o) {
      return new Promise((res) => {
        const auto = Math.max(1, C.num('캠페인', '자동진행_초'));
        const lg = o.league;
        const d = this.ov(`<div class="ov-rays"></div><div class="ov-glow"></div>
          <div class="res-stars">${[1, 2, 3].map((i) => `<span class="${i <= o.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.22}s">★</span>`).join('')}</div>
          <div class="title3d small" data-t="${o.title}">${o.title}</div>
          <div class="res-rows">${o.rows.map((r, i) => `<div style="animation-delay:${0.6 + i * 0.15}s"><span>${r[0]}</span><b>+${U.fmt(r[1])}</b></div>`).join('')}</div>
          <div class="amount3d js-total" data-t="0">0</div>
          ${lg ? `<div class="res-league"><i>🏆</i> 리그 +${U.fmt(lg.lp)}P <span>${lg.before}위 → <b>${lg.after}위</b>${lg.after < lg.before ? ' ▲' : ''}</span></div>` : ''}
          ${o.share ? '<button class="ghost-btn js-vs">⚔️ 친구에게 도전장 보내기</button>' : ''}
          <div class="res-next"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="prog" cx="20" cy="20" r="17" style="animation-duration:${auto + 1.6}s"/></svg><span>탭하면 <b>계속</b></span></div>`, 'tier-1 result');
        const am = d.querySelector('.js-total');
        const t0 = performance.now() + 700, dur = 1100;
        A.rollup && setTimeout(() => A.rollup(dur, true), 700);
        const step = () => {
          const u = U.clamp((performance.now() - t0) / dur, 0, 1);
          const v = U.fmt(Math.round(o.total * U.easeOutCubic(u)));
          am.textContent = v; am.dataset.t = v;
          if (u < 1 && d.isConnected) requestAnimationFrame(step);
          else if (u >= 1) { this.refresh(true); this.fx.coins(24, innerWidth / 2, innerHeight * 0.62, 120); }
        };
        requestAnimationFrame(step);
        let hold = false;
        const done = () => { if (hold) return; clearTimeout(tm); this.close(d); setTimeout(res, 300); };
        let tm = setTimeout(done, (auto + 1.6) * 1000);
        const vs = d.querySelector('.js-vs');
        if (vs) vs.addEventListener('click', async (e) => {
          e.stopPropagation(); clearTimeout(tm); hold = true;
          d.querySelector('.res-next circle.prog').style.animationPlayState = 'paused';
          await this.shareChallenge(o.share);
          hold = false; tm = setTimeout(done, 1500);
        });
        d.addEventListener('click', () => { if (performance.now() - t0 > 400) done(); });
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
          <div class="att-row">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<div class="${i < day ? 'got' : i === day ? 'today' : ''}"><span>${i}일</span><b>${i === 7 ? '🎁' : '🪙'}</b><em>${U.fmt(C.num('보상', '출석_기본') + (i - 1) * C.num('보상', '출석_연속보너스'))}</em></div>`).join('')}</div>
          <div class="lumi-mini">${fox('joy')}<p>오늘도 와 줬네요! 출석 선물이에요.</p></div>
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
    leagueResult() {
      const lg = L.ensure(this.state);
      if (!lg.last || lg.last.paid) return Promise.resolve();
      const r = lg.last;
      r.paid = true;
      this.credit(r.reward); this.save(); this.refresh(true);
      return new Promise((res) => {
        const tn = L.TIERS[lg.tier];
        const d = this.ov(`<div class="ov-rays"></div><div class="ov-glow"></div><div class="ov-kicker">WEEKLY LEAGUE</div>
          <div class="title3d small" data-t="${r.rank}위">${r.rank}위</div>
          <div class="ov-sub">${r.move > 0 ? `🎉 승급! <b style="color:${tn.c}">${tn.name} 리그</b>로 올라가요` : r.move < 0 ? `${tn.name} 리그로 내려가요. 이번 주에 다시 올라가요!` : `${tn.name} 리그에 남아요`}</div>
          <div class="ov-sub">순위 보상 🪙 ${U.fmt(r.reward)}</div>
          <button class="cta big js-ok">좋아요!</button>`, 'tier-1');
        if (r.move > 0) this.fx.fireworks(5);
        d.querySelector('.js-ok').addEventListener('click', () => { A.click(); this.close(d); setTimeout(res, 300); });
      });
    },

    /* ---------- panels ---------- */
    pauseAll(on) { if (this.mg) this.mg.paused = on; if (on) root.QuestMap.stop(); },
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
      document.querySelectorAll('.js-qdot').forEach((d) => d.classList.add('hidden'));
      const st = this.state;
      const bar = (a, b) => `<i class="qbar"><em style="width:${Math.min(100, (a / b) * 100)}%"></em></i>`;
      const daily = st.daily.quests.map((q) => `<div class="q-row ${q.done ? 'done' : ''}"><div><b>${q.title}</b>${bar(q.progress, q.target)}</div><span>${q.done ? '완료 ✓' : `${U.fmt(q.progress)}/${U.fmt(q.target)}`}</span></div>`).join('');
      const ach = S.ACH.map((a) => {
        const tier = st.ach[a.id] || 0, tgt = S.achTarget(tier), v = st.stats[a.ev] || 0;
        return `<div class="q-row"><div><b>${a.name} <small>${tier}단계</small></b>${bar(v, tgt)}</div><span>${U.fmt(v)}/${U.fmt(tgt)}${a.unit}</span></div>`;
      }).join('');
      const stars = Object.values(st.stars).reduce((a, b) => a + b, 0);
      this.panel(`<div class="modal-head"><div><h3>퀘스트</h3><div class="en">QUESTS</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <h4>오늘의 퀘스트 · 개당 🪙${U.fmt(C.num('보상', '일일퀘스트_보상'))}</h4>${daily}
        <h4>업적 (끝없이 단계가 올라갑니다)</h4>${ach}
        <h4>기록</h4><p>시즌 ${st.season} · 에피소드 ${st.ep + 1} · 모은 별 ${stars}개 · 연속 출석 ${st.login.streak}일 · Lv.${st.level}</p>`);
    },
    openLeague() {
      const st = this.state, lg = L.ensure(st), board = L.board(lg), tn = L.TIERS[lg.tier];
      const rows = board.map((r, i) => `<div class="lg-row ${r.me ? 'me' : ''} ${i < 5 ? 'up' : i >= 16 ? 'down' : ''}">
          <span class="lg-rank">${i + 1}</span><div class="chara">${Ch.svg(r.av, i < 3 ? 'joy' : 'smile')}</div>
          <b>${r.me ? (esc(st.name) || '나') + ' (나)' : r.name}</b><em>${U.fmt(r.pts)}P</em></div>${i === 4 ? '<div class="lg-line up">▲ 승급 구역</div>' : i === 15 ? '<div class="lg-line down">▼ 강등 구역</div>' : ''}`).join('');
      const { d } = this.panel(`<div class="modal-head"><div><h3>주간 리그</h3><div class="en">WEEKLY LEAGUE</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <div class="lg-head" style="--tc:${tn.c}"><span class="lg-badge">🏆</span><div><b>${tn.name} 리그</b><small>${L.daysLeft()}일 후 정산 · 1위 🪙3,000 · 5위까지 승급</small></div></div>
        <div class="lg-tiers">${L.TIERS.map((t, i) => `<i class="${i === lg.tier ? 'on' : i < lg.tier ? 'past' : ''}" style="--tc:${t.c}"><span>${t.name}</span></i>`).join('')}</div>
        <div class="lg-list">${rows}</div>
        <p class="menu-info">스테이지를 깰 때마다 리그 포인트(별·보스·점수)가 쌓여요. 라이벌은 궁전 주민들이고, 진짜 친구와는 결과 화면의 「⚔️ 도전장」으로 같은 판 대결을 할 수 있어요.</p>`);
      d.classList.add('league');
      const me = d.querySelector('.lg-row.me');
      if (me) setTimeout(() => me.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    },
    openEpisodes() {
      const st = this.state;
      const items = S.EPISODES.map((ep, i) => {
        const lay = S.layout(i), got = lay.reduce((a, s, k) => a + (st.stars[this.key(i, k)] || 0), 0);
        const open = st.season > 1 || i <= st.ep;
        const ch = ep.friend || (i === 0 ? 'lumi' : ep.boss);
        return `<button class="ep-item ${i === st.ep ? 'cur' : ''} ${open ? '' : 'lock'}" data-i="${i}">${open ? `<div class="chara">${Ch.svg(ch, 'smile')}</div>` : '<span class="ep-lock">🔒</span>'}
          <div><small>EPISODE ${i + 1} · ${ep.hour}시 · ${ep.n}스테이지</small><b>${open ? ep.title : '???'}</b></div><em>★ ${got}/${lay.length * 3}</em></button>`;
      }).join('');
      const { d, close } = this.panel(`<div class="modal-head"><div><h3>에피소드</h3><div class="en">STAR CLOCK · SEASON ${st.season}</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <p>별시계의 열두 시간을 되찾는 모험. 지난 에피소드는 다시 들어가서 별 세 개에 도전할 수 있어요.</p><div class="ep-list">${items}</div>`);
      d.querySelectorAll('.ep-item:not(.lock)').forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.i;
        close();
        if (i === st.ep) { this.showMap(false); return; }
        this.viewEpisode(i);
      }));
    },
    // browse an earlier episode (replays only); the real progress is restored by showMap afterwards
    viewEpisode(i) {
      const st = this.state;
      const token = ++this.flow;
      if (!this.restore) this.restore = { ep: st.ep, si: st.si };
      this.clearStage();
      this.screen('map');
      const ep = this.ep(i), lay = S.layout(i);
      this.setTheme(byId[ep.machines[0]].theme);
      root.QuestMap.render($('.js-map'), {
        ei: i, ep, layout: lay, season: st.season, current: lay.length, selected: 0,
        starsOf: (k) => st.stars[this.key(i, k)] || 0, info: gameInfo, auto: 0,
        onStart: (k) => {
          if (token !== this.flow) return;
          st.ep = i; st.si = lay.length; // every stage of this episode counts as a replay
          this.startStage(k);
        },
        onEpisodes: () => this.openEpisodes(),
      });
    },
    openMenu() {
      const ago = C.loadedAt ? Math.max(0, Math.round((Date.now() - C.loadedAt) / 60000)) + '분 전' : '기본값 사용 중';
      const { d, close } = this.panel(`<div class="modal-head"><div><h3>메뉴</h3><div class="en">MENU</div></div><button class="icon-btn js-close" aria-label="닫기">✕</button></div>
        <div class="menu-list">
          <button class="js-m-resume">▶ 계속하기</button>
          <button class="js-m-map">🗺️ 지도로 가기</button>
          <button class="js-m-ep">📖 에피소드</button>
          <button class="js-m-league">🏆 주간 리그</button>
          <button class="js-m-quest">📜 퀘스트</button>
          <button class="js-m-shop">🪙 코인 상점</button>
          <button class="js-m-name">✏️ 닉네임 ${this.state.name ? '(' + esc(this.state.name) + ')' : ''}</button>
          <button class="js-m-sound">🔊 사운드</button>
          <button class="js-m-story">🎬 프롤로그 다시 보기</button>
          <button class="js-m-reset danger">↺ 처음부터 다시 시작</button>
        </div>
        <p class="menu-info">설정 파일: ${C.source} · ${ago} 읽음 · 결제 모드: ${Shop.mode()}</p>`);
      const on = (c, fn) => d.querySelector(c).addEventListener('click', (e) => { e.stopPropagation(); close(); setTimeout(fn, 60); });
      on('.js-m-resume', () => {});
      on('.js-m-map', () => this.showMap(false));
      on('.js-m-ep', () => this.openEpisodes());
      on('.js-m-league', () => this.openLeague());
      on('.js-m-quest', () => this.openQuests());
      on('.js-m-shop', () => this.openShop());
      on('.js-m-name', () => this.askName());
      on('.js-m-sound', () => this.showSound());
      on('.js-m-story', async () => { this.clearStage(); ++this.flow; await root.Cinema.play(S.PROLOGUE, { theme: this.epMachine().theme, card: { kicker: 'PROLOGUE', title: '행운의 궁전', sub: 'PALACE OF FORTUNE', hour: 12 } }); this.showMap(false); });
      d.querySelector('.js-m-reset').addEventListener('click', () => {
        const b = d.querySelector('.js-m-reset');
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '정말 초기화할까요? 한 번 더 누르세요'; return; }
        close();
        this.clearStage(); ++this.flow; this.restore = null;
        this.state = this.fresh(); L.ensure(this.state); this.save(); this.refresh();
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
      const on = (sel, fn) => document.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); A.click(); fn(); }));
      on('.js-shop', () => this.openShop());
      on('.js-quests', () => this.openQuests());
      on('.js-menu', () => this.openMenu());
      on('.js-leaguebtn', () => this.openLeague());
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
