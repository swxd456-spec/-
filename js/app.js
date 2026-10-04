/* App shell: lobby, routing, wallet, sound settings and the main render loop. */
(function (root) {
  const U = root.U, A = root.SlotAudio, E = root.SlotEngine;
  const START = 10000;
  const LOBBY_MUSIC = { id: 'lobby', music: { style: 'bossa', root: 53, scale: 'major', bpm: 116 }, sfx: { inst: 'bell' } };
  const LOBBY_THEME = { bg: ['#07031a', '#1a0b3a', '#3a0f4f'], fx: 'sparkles', accent: '#ff4fd8', accent2: '#00e5ff' };

  const FILTERS = [
    ['all', '전체'], ['classic', '클래식 3릴'], ['lines', '페이라인'], ['ways', '웨이즈'], ['megaways', '메가웨이즈'],
    ['cluster', '클러스터'], ['tumble', '텀블·캐스케이드'], ['fs', '프리스핀'], ['holdWin', '홀드 앤 윈'], ['wheel', '보너스 휠'],
  ];

  function tags(cfg) {
    const t = [];
    const f = cfg.feat || {};
    const grid = cfg.mech === 'megaways' ? `${cfg.reels}×${cfg.minRows}-${cfg.maxRows}` : `${cfg.reels}×${cfg.rows}`;
    const mech = { lines: `${cfg.lines}라인`, ways: `${U.fmt(Math.pow(cfg.rows, cfg.reels))} 웨이즈`, megaways: '메가웨이즈', cluster: '클러스터', scatter: '스캐터 페이' }[cfg.mech];
    t.push(['mech', mech], ['', grid]);
    if (cfg.scatter) t.push(['', '프리스핀']);
    if (cfg.coin) t.push(['', '홀드&윈']);
    if (cfg.bonus) t.push(['', '보너스 휠']);
    if (f.expanding) t.push(['', '확장 와일드']);
    if (f.sticky) t.push(['', '스티키 와일드']);
    if (cfg.wild && cfg.wild.mult) t.push(['', '배수 와일드']);
    if (f.wildReels) t.push(['', '와일드 릴']);
    if (f.cascade) t.push(['', f.cascade.step ? '무한 배수' : '텀블']);
    if (cfg.bomb) t.push(['', '배수 폭탄']);
    return t;
  }

  function matches(cfg, k) {
    const f = cfg.feat || {};
    switch (k) {
      case 'all': return true;
      case 'classic': return cfg.reels === 3;
      case 'lines': return cfg.mech === 'lines';
      case 'ways': return cfg.mech === 'ways';
      case 'megaways': return cfg.mech === 'megaways';
      case 'cluster': return cfg.mech === 'cluster';
      case 'tumble': return !!f.cascade;
      case 'fs': return !!cfg.scatter;
      case 'holdWin': return !!cfg.coin;
      case 'wheel': return !!cfg.bonus;
    }
    return true;
  }

  const App = {
    balance: U.store.get('balance', START),
    game: null,
    filter: 'all',

    init() {
      this.bg = new root.SlotBackground(document.getElementById('bg'));
      this.fx = new root.SlotFx(document.getElementById('fx'));
      this.bg.setTheme(LOBBY_THEME);
      A.musicOn = U.store.get('snd.music', true);
      A.sfxOn = U.store.get('snd.sfx', true);
      A.ambOn = U.store.get('snd.amb', true);
      this.buildLobby();
      this.bindSound();
      this.refresh();
      const unlock = () => {
        const first = !A.ready;
        A.init();
        if (A.ready) {
          document.getElementById('tap-hint').classList.add('hidden');
          if (first && !this.game) A.playMusic(LOBBY_MUSIC);
        }
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
      window.addEventListener('hashchange', () => this.route());
      this.route();
      let last = performance.now();
      const frame = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        this.bg.draw(t, dt);
        if (this.game && this.game.R) this.game.R.draw(t);
        this.fx.draw(t, dt);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    /* ---------- wallet ---------- */
    credit(x) {
      this.balance = Math.round((this.balance + x) * 100) / 100;
      U.store.set('balance', this.balance);
    },
    refresh(bump) {
      document.querySelectorAll('.js-balance').forEach((el) => {
        el.textContent = U.fmt(this.balance);
        if (bump) { const w = el.parentElement; w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
      });
    },
    lowBalance() {
      const d = document.createElement('div');
      d.className = 'ov modal';
      d.innerHTML = `<div class="modal-box" style="text-align:center"><div style="font-size:60px">🪙</div>
        <h3>코인이 부족해요</h3><p>무료 코인 ${U.fmt(START)}개를 받고 계속 즐겨보세요!<br><small>(베팅 금액을 낮출 수도 있어요)</small></p>
        <button class="ov-btn">무료 코인 받기</button></div>`;
      document.getElementById('overlays').appendChild(d);
      d.querySelector('.ov-btn').addEventListener('click', () => {
        this.credit(START);
        this.refresh(true);
        this.fx.coins(60, innerWidth / 2, innerHeight * 0.7);
        A.win(10);
        d.remove();
      });
      d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    },

    /* ---------- sound panel ---------- */
    bindSound() {
      const panel = document.getElementById('sound-panel');
      const mu = document.getElementById('snd-music'), sf = document.getElementById('snd-sfx'), am = document.getElementById('snd-amb');
      mu.checked = A.musicOn; sf.checked = A.sfxOn; am.checked = A.ambOn;
      const icon = () => document.querySelectorAll('.js-sound').forEach((b) => { b.textContent = A.musicOn || A.sfxOn || A.ambOn ? '🔊' : '🔇'; });
      icon();
      mu.addEventListener('change', () => { A.setMusic(mu.checked); U.store.set('snd.music', mu.checked); icon(); });
      sf.addEventListener('change', () => { A.setSfx(sf.checked); U.store.set('snd.sfx', sf.checked); icon(); });
      am.addEventListener('change', () => { A.setAmb(am.checked); U.store.set('snd.amb', am.checked); icon(); });
      document.querySelectorAll('.js-sound').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
        const r = b.getBoundingClientRect();
        panel.style.top = r.bottom + 8 + 'px';
        panel.style.right = Math.max(8, innerWidth - r.right) + 'px';
      }));
      document.addEventListener('click', (e) => { if (!panel.contains(e.target)) panel.classList.add('hidden'); });
    },

    /* ---------- lobby ---------- */
    buildLobby() {
      const fl = document.getElementById('filters');
      fl.innerHTML = FILTERS.map(([k, l]) => `<button class="chip ${k === this.filter ? 'on' : ''}" data-k="${k}">${l}</button>`).join('');
      fl.addEventListener('click', (e) => {
        const k = e.target.dataset.k;
        if (!k) return;
        this.filter = k;
        A.click();
        fl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.k === k));
        this.renderCards();
      });
      this.renderCards();
    },

    renderCards() {
      const box = document.getElementById('cards');
      const list = root.MACHINES.map((c, i) => [c, i]).filter(([c]) => matches(c, this.filter));
      box.innerHTML = list.map(([c, i], n) => {
        const th = c.theme;
        const top = c.syms[c.syms.length - 1][0];
        const orb = [c.wild && c.wild.e, (c.scatter || c.coin || c.bonus || {}).e, c.syms[c.syms.length - 2][0], c.syms[Math.floor(c.syms.length / 2)][0]].filter(Boolean);
        const badge = c.coin ? 'JACKPOT' : c.mech === 'megaways' ? 'MEGAWAYS' : c.bonus ? 'WHEEL' : c.bomb ? 'MULTI x100' : c.reels === 3 ? 'CLASSIC' : '';
        return `<button class="card" data-id="${c.id}" style="--card-bg: radial-gradient(circle at 50% 35%, ${th.bg[2]}, ${th.bg[1]} 55%, ${th.bg[0]});
          --card-accent:${th.accent}; --card-glow:${U.rgba(th.accent, 0.45)}; animation-delay:${n * 25}ms">
          <span class="card-num">#${String(i + 1).padStart(2, '0')}</span>
          ${badge ? `<span class="card-badge">${badge}</span>` : ''}
          <div class="card-art"><div class="ring"></div><span class="hero">${top}</span>
            ${orb.map((e, k) => `<span class="orbit o${k + 1}">${e}</span>`).join('')}</div>
          <div class="card-info"><h3>${c.name}</h3><div class="en">${c.en}</div>
            <div class="tags">${tags(c).slice(0, 5).map(([cl, t]) => `<span class="tag ${cl}">${t}</span>`).join('')}</div></div>
        </button>`;
      }).join('');
      box.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => {
        A.init();
        A.click();
        location.hash = '#/play/' + el.dataset.id;
      }));
    },

    /* ---------- routing ---------- */
    route() {
      const m = location.hash.match(/^#\/play\/([\w-]+)/);
      const cfg = m && root.MACHINES.find((c) => c.id === m[1]);
      if (this.game) { this.game.destroy(); this.game = null; }
      if (cfg) {
        document.getElementById('lobby').classList.add('hidden');
        window.scrollTo(0, 0);
        this.game = new root.SlotGame(this, cfg);
        this.game.mount();
        document.title = `${cfg.name} · Slot Palace 30`;
      } else {
        document.getElementById('lobby').classList.remove('hidden');
        this.bg.setTheme(LOBBY_THEME);
        document.documentElement.style.setProperty('--accent', LOBBY_THEME.accent);
        document.documentElement.style.setProperty('--accent2', LOBBY_THEME.accent2);
        A.setMachine(LOBBY_MUSIC);
        A.playMusic(LOBBY_MUSIC);
        document.title = 'Slot Palace 30';
      }
      this.refresh();
    },

    goLobby() {
      A.click();
      location.hash = '#/';
    },
  };

  root.SlotApp = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.init());
  else App.init();
})(window);
