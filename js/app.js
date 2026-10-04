/* App shell: lobby (hero carousel + poster grid), routing, wallet, sound settings, render loop. */
(function (root) {
  const U = root.U, A = root.SlotAudio, E = root.SlotEngine, Art = root.SlotArt;
  const START = 10000;
  const LOBBY_MUSIC = { id: 'lobby', music: { style: 'bossa', root: 53, scale: 'major', bpm: 116 }, sfx: { inst: 'bell' } };
  const LOBBY_THEME = { bg: ['#07031a', '#1a0b3a', '#3a0f4f'], shader: 'bokeh', sc: ['#06021a', '#7a2bd6', '#ffb347'], fx: 'sparkles', accent: '#ff4fd8', accent2: '#00e5ff' };
  const FEATURED = ['olympus', 'neon-nights', 'dragon-fortune', 'galaxy-ways', 'sweet-candy'];

  const FILTERS = [
    ['all', '전체'], ['classic', '클래식'], ['lines', '페이라인'], ['ways', '웨이즈'], ['megaways', '메가웨이즈'],
    ['cluster', '클러스터'], ['tumble', '텀블'], ['holdWin', '홀드 앤 윈'], ['wheel', '보너스 휠'], ['fs', '프리스핀'],
  ];

  function tags(cfg) {
    const t = [];
    const f = cfg.feat || {};
    const grid = cfg.mech === 'megaways' ? `${cfg.reels}×2-7` : `${cfg.reels}×${cfg.rows}`;
    const mech = { lines: `${cfg.lines}라인`, ways: `${U.fmt(Math.pow(cfg.rows, cfg.reels))} 웨이즈`, megaways: '메가웨이즈', cluster: '클러스터', scatter: '스캐터 페이' }[cfg.mech];
    t.push(['mech', mech], ['', grid]);
    if (cfg.coin) t.push(['', '홀드&윈']);
    if (cfg.bonus) t.push(['', '보너스 휠']);
    if (f.expanding) t.push(['', '확장 와일드']);
    if (f.sticky) t.push(['', '스티키']);
    if (cfg.wild && cfg.wild.mult) t.push(['', '배수 와일드']);
    if (f.wildReels) t.push(['', '와일드 릴']);
    if (f.cascade) t.push(['', f.cascade.step ? '무한 배수' : '텀블']);
    if (cfg.bomb) t.push(['', '배수 폭탄']);
    if (cfg.scatter) t.push(['', '프리스핀']);
    return t;
  }
  function matches(cfg, k) {
    const f = cfg.feat || {};
    switch (k) {
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
  function badge(c) {
    return c.coin ? 'JACKPOT' : c.mech === 'megaways' ? 'MEGAWAYS' : c.bonus ? 'BONUS WHEEL' : c.bomb ? 'x100 MULTI' : c.reels === 3 ? 'CLASSIC' : (c.feat || {}).cascade ? 'TUMBLE' : '';
  }

  const App = {
    balance: U.store.get('balance', START),
    game: null,
    filter: 'all',
    posters: {},

    init() {
      this.shader = new root.ShaderBG(document.getElementById('bgl'));
      this.amb = new root.SlotAmbient(document.getElementById('amb'));
      this.fx = new root.SlotFx(document.getElementById('fx'));
      this.setTheme(LOBBY_THEME);
      // volumes (older saves stored on/off switches)
      [['music', 0.8], ['sfx', 1], ['amb', 0.8]].forEach(([k, d]) => {
        const on = U.store.get('snd.' + k, true);
        A.setVolume(k, on ? U.store.get('vol.' + k, d) : 0);
      });
      this.prepared = {};
      root.MACHINES.forEach((c) => { this.prepared[c.id] = E.prepare(c, root.SLOT_CALIBRATION); });
      this.buildLobby();
      this.bindSound();
      this.refresh();
      const unlock = () => {
        const first = !A.ready;
        A.init();
        if (A.ready) {
          document.getElementById('tap-hint').classList.add('hidden');
          if (first && !this.game) { A.setMachine(LOBBY_MUSIC); A.playMusic(LOBBY_MUSIC); }
        }
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
      window.addEventListener('hashchange', () => this.route());
      this.route();
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
      const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, U.wait(2500)]) : Promise.resolve();
      ready.then(() => this.makePosters());
    },

    setTheme(th) {
      this.shader.setTheme(th);
      this.amb.setTheme(th);
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
      d.innerHTML = `<div class="modal-box" style="text-align:center;max-width:420px"><div class="coin-ico" style="width:64px;height:64px;margin:4px auto 12px"></div>
        <h3>코인이 부족해요</h3><p>무료 코인 ${U.fmt(START)}개를 받고 계속 즐겨보세요.<br>베팅 금액을 낮춰서 플레이할 수도 있어요.</p>
        <button class="cta">무료 코인 받기</button></div>`;
      document.getElementById('overlays').appendChild(d);
      d.querySelector('.cta').addEventListener('click', () => {
        this.credit(START);
        this.refresh(true);
        this.fx.coins(70, innerWidth / 2, innerHeight * 0.7, 160);
        A.win(10);
        d.remove();
      });
      d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    },

    /* ---------- sound panel ---------- */
    bindSound() {
      const panel = document.getElementById('sound-panel');
      const icon = () => document.querySelectorAll('.js-sound').forEach((b) => b.classList.toggle('muted', !(A.vol.music || A.vol.sfx || A.vol.amb)));
      [['music', 'snd-music'], ['sfx', 'snd-sfx'], ['amb', 'snd-amb']].forEach(([k, id]) => {
        const inp = document.getElementById(id);
        const out = inp.parentElement.querySelector('output');
        const v = Math.round(A.vol[k] * 100);
        inp.value = v; out.textContent = v;
        inp.style.setProperty('--p', v + '%');
        inp.addEventListener('input', () => {
          const n = +inp.value;
          out.textContent = n;
          inp.style.setProperty('--p', n + '%');
          A.setVolume(k, n / 100);
          U.store.set('vol.' + k, n / 100);
          icon();
        });
        inp.addEventListener('change', () => { if (k === 'sfx') A.click(); });
      });
      icon();
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
      fl.innerHTML = FILTERS.map(([k, l]) => `<button class="chip ${k === this.filter ? 'on' : ''}" data-k="${k}">${l}<span class="n">${root.MACHINES.filter((c) => matches(c, k)).length}</span></button>`).join('');
      fl.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        this.filter = b.dataset.k;
        A.click();
        fl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
        this.renderCards();
      });
      this.renderHero();
      this.renderCards();
    },

    renderHero() {
      const hero = document.getElementById('hero');
      const list = FEATURED.map((id) => root.MACHINES.find((c) => c.id === id));
      hero.innerHTML = list.map((c, i) => `<div class="hero-slide ${i === 0 ? 'on' : ''}" data-id="${c.id}"
          style="--hero-accent:${c.theme.accent};--hero-glow:${U.rgba(c.theme.accent, 0.6)};--hero-font:'${c.theme.font}', 'Bungee', sans-serif">
          <div class="hero-bg" data-poster-bg="${c.id}" style="background-image:linear-gradient(135deg, ${c.theme.bg[1]}, ${c.theme.bg[0]})"></div>
          <div class="hero-copy">
            <div class="hero-kicker">FEATURED · ${badge(c) || 'NEW'}</div>
            <div class="hero-title">${c.en}</div>
            <div class="hero-kr">${c.name}</div>
            <p class="hero-desc">${c.desc}</p>
            <button class="cta" data-play="${c.id}">지금 플레이 ▶</button>
          </div>
          <div class="hero-art"><img alt="" data-poster="${c.id}"></div>
        </div>`).join('') + `<div class="hero-dots">${list.map((c, i) => `<button class="${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="${c.name}"></button>`).join('')}</div>`;
      let cur = 0;
      const show = (i) => {
        cur = (i + list.length) % list.length;
        hero.querySelectorAll('.hero-slide').forEach((s, k) => s.classList.toggle('on', k === cur));
        hero.querySelectorAll('.hero-dots button').forEach((s, k) => s.classList.toggle('on', k === cur));
      };
      hero.addEventListener('click', (e) => {
        const p = e.target.closest('[data-play]');
        if (p) { A.init(); A.click(); location.hash = '#/play/' + p.dataset.play; return; }
        const dt = e.target.closest('.hero-dots button');
        if (dt) { show(+dt.dataset.i); clearInterval(this.heroTimer); this.heroTimer = setInterval(() => show(cur + 1), 6000); }
      });
      this.heroTimer = setInterval(() => show(cur + 1), 6000);
    },

    renderCards() {
      const box = document.getElementById('cards');
      const list = root.MACHINES.map((c, i) => [c, i]).filter(([c]) => matches(c, this.filter));
      box.innerHTML = list.map(([c, i], n) => {
        const th = c.theme;
        const b = badge(c);
        return `<button class="card" data-id="${c.id}" style="--card-bg: linear-gradient(160deg, ${th.bg[1]}, ${th.bg[0]});
          --card-accent:${th.accent}; --card-glow:${U.rgba(th.accent, 0.4)}; animation-delay:${n * 22}ms">
          <div class="card-poster">${this.posters[c.id] ? `<img alt="" src="${this.posters[c.id]}">` : `<img alt="" data-poster="${c.id}">`}
            ${b ? `<span class="badge">${b}</span>` : ''}<span class="card-no">${String(i + 1).padStart(2, '0')}</span></div>
          <div class="card-info"><h3>${c.name}</h3>
            <div class="tags">${tags(c).slice(0, 4).map(([cl, t]) => `<span class="tag ${cl}">${t}</span>`).join('')}</div></div>
        </button>`;
      }).join('');
      box.querySelectorAll('.card').forEach((el) => {
        el.addEventListener('click', () => { A.init(); A.click(); location.hash = '#/play/' + el.dataset.id; });
        el.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg');
          el.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 10 + 'deg');
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      });
      this.fillPosters();
    },

    makePosters() {
      const ids = FEATURED.concat(root.MACHINES.map((c) => c.id).filter((id) => FEATURED.indexOf(id) < 0));
      let i = 0;
      const step = () => {
        const t0 = performance.now();
        while (i < ids.length && performance.now() - t0 < 30) {
          const id = ids[i++];
          try { this.posters[id] = Art.poster(this.prepared[id], 360, 480); } catch (e) { console.warn(e); }
        }
        this.fillPosters();
        if (i < ids.length) setTimeout(step, 16);
      };
      step();
    },
    fillPosters() {
      document.querySelectorAll('img[data-poster]').forEach((img) => {
        const src = this.posters[img.dataset.poster];
        if (src) { img.src = src; img.removeAttribute('data-poster'); }
      });
      document.querySelectorAll('[data-poster-bg]').forEach((el) => {
        const src = this.posters[el.dataset.posterBg];
        if (src) { el.style.backgroundImage = `url(${src})`; el.removeAttribute('data-poster-bg'); }
      });
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
        this.setTheme(LOBBY_THEME);
        ['--accent', '--accent2'].forEach((k, i) => document.documentElement.style.setProperty(k, i ? LOBBY_THEME.accent2 : LOBBY_THEME.accent));
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

  // installable app: offline cache (only works when served from a normal website, e.g. GitHub Pages)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.hostname)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  root.SlotApp = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.init());
  else App.init();
})(window);
