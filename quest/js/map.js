/* Stage map (Angry Birds / Candy Crush style): a winding path of stage nodes that scrolls upward through the episode.
   QuestMap.render(host, o) with o = {
     ei, ep, layout, season, current (next stage index), selected, starsOf(i) → 0..3, info(g) → { name, icon, color },
     auto (seconds, 0 = off), onStart(i), onEpisodes(), deco: [emoji…] } */
(function (root) {
  const Ch = root.Chara, A = root.SlotAudio;
  const DECO = {
    neon: ['🌃', '🎵', '💿', '🕹️', '✨'], candy: ['🍭', '🍬', '🧁', '🍩', '🍓'], sea: ['🐚', '🐠', '🫧', '🪸', '⚓'], sakura: ['🌸', '🎋', '🏮', '🍡', '🌸'],
    desert: ['🌵', '🐪', '🏺', '☀️', '💰'], ice: ['❄️', '⛄', '🎁', '🧊', '✨'], jungle: ['🌴', '🦜', '💎', '🍌', '🌿'], space: ['🪐', '⭐', '🚀', '🛸', '🌙'],
    ghost: ['🎃', '🕯️', '🦇', '👻', '🍬'], sky: ['☁️', '⚡', '🏛️', '🕊️', '✨'], volcano: ['🔥', '🌋', '🐉', '💥', '🪨'], mirror: ['💎', '👑', '🪞', '✨', '🎰'],
  };
  function smooth(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  const QuestMap = {
    render(host, o) {
      clearInterval(this.timer);
      const n = o.layout.length;
      const W = Math.min(host.clientWidth || innerWidth, 640);
      const SP = 116, TOP = 170, BOT = 230;
      const H = TOP + BOT + (n - 1) * SP;
      const amp = Math.min(W * 0.3, 200);
      const pts = o.layout.map((s, i) => [Math.round(W / 2 + Math.sin(i * 0.95 + o.ei * 1.3) * amp), H - BOT - i * SP]);
      const rnd = root.U.mulberry32(root.U.hashStr('deco' + o.ep.id));
      const deco = DECO[o.ep.id] || DECO.neon;
      let decoHTML = '';
      for (let k = 0; k < n * 1.4; k++) {
        const y = TOP * 0.5 + rnd() * (H - TOP * 0.5 - 60);
        const near = pts.reduce((m, p) => Math.min(m, Math.abs(p[1] - y) < 70 ? Math.abs(p[0] - (W * 0.08 + rnd() * W * 0.84)) : 999), 999);
        const x = W * 0.06 + rnd() * W * 0.88;
        if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 70) || near < 10) continue;
        decoHTML += `<i class="map-deco" style="left:${x}px;top:${y}px;font-size:${22 + rnd() * 22}px;--d:${(rnd() * 4).toFixed(2)}s">${deco[Math.floor(rnd() * deco.length)]}</i>`;
      }
      const done = Math.min(o.current, n);
      const full = smooth(pts);
      const partPts = pts.slice(0, Math.max(1, done + 1));
      const nodes = o.layout.map((s, i) => {
        const inf = s.g === 'slot' ? { name: '행운 축제', icon: '🎰', color: '#ffd23f' } : o.info(s.g);
        const st = o.starsOf(i);
        const state = i < o.current ? 'done' : i === o.current ? 'cur' : 'lock';
        const cls = ['map-node', state, s.boss ? 'boss' : '', s.g === 'slot' ? 'slot' : '', i === o.selected ? 'sel' : ''].join(' ');
        const face = s.boss ? `<span class="mn-boss">${Ch.svg(o.ep.boss, state === 'done' ? 'sad' : 'smug')}</span>` : `<span class="mn-ico">${inf.icon}</span>`;
        return `<button class="${cls}" data-i="${i}" style="left:${pts[i][0]}px;top:${pts[i][1]}px;--c:${inf.color}">
          <span class="mn-disc">${face}</span><b class="mn-no">${i + 1}</b>
          <span class="mn-stars">${[1, 2, 3].map((k) => `<em class="${k <= st ? 'on' : ''}">★</em>`).join('')}</span></button>`;
      }).join('');
      const totalStars = o.layout.reduce((a, s, i) => a + o.starsOf(i), 0);
      host.innerHTML = `<div class="map-scroll js-mscroll"><div class="map-world" style="width:${W}px;height:${H}px">
          <div class="map-goal" style="top:${TOP * 0.25}px"><div class="mg-star">⭐</div><span>${o.ep.hour}시의 별조각</span></div>
          ${decoHTML}
          <svg class="map-path" width="${W}" height="${H}"><path d="${full}" class="mp-base"/><path d="${full}" class="mp-dash"/><path d="${smooth(partPts)}" class="mp-done"/></svg>
          ${nodes}
          <div class="map-fox js-mfox"></div>
        </div></div>
        <div class="map-head">
          <button class="map-ep js-eps"><small>EPISODE ${o.ei + 1}${o.season > 1 ? ` · 시즌 ${o.season}` : ''}</small><b>${o.ep.title}</b></button>
          <div class="map-starsum">★ ${totalStars}<small>/${n * 3}</small></div>
        </div>
        <div class="map-panel js-mpanel"></div>`;
      const scroll = host.querySelector('.js-mscroll');
      const fox = host.querySelector('.js-mfox');
      fox.appendChild(Ch.el('lumi', 'joy'));
      const placeFox = (i, instant) => {
        const p = pts[Math.min(i, n - 1)];
        if (instant) fox.style.transition = 'none';
        fox.style.left = p[0] + 'px'; fox.style.top = (p[1] - 62) + 'px';
        if (instant) { void fox.offsetWidth; fox.style.transition = ''; }
      };
      const from = o.foxFrom != null ? o.foxFrom : o.current;
      placeFox(from, true);
      const centre = (i, smoothScroll) => { const y = pts[Math.min(i, n - 1)][1] - scroll.clientHeight * 0.55; scroll.scrollTo({ top: Math.max(0, y), behavior: smoothScroll ? 'smooth' : 'auto' }); };
      requestAnimationFrame(() => {
        centre(from, false);
        if (from !== o.current) setTimeout(() => { placeFox(o.current); fox.classList.add('hop'); A.qWhoosh && A.qWhoosh(); centre(o.current, true); setTimeout(() => fox.classList.remove('hop'), 900); }, 500);
      });

      const panel = host.querySelector('.js-mpanel');
      let sel = o.selected;
      const showPanel = (i, auto) => {
        clearInterval(this.timer);
        sel = i;
        host.querySelectorAll('.map-node').forEach((b) => b.classList.toggle('sel', +b.dataset.i === i));
        const s = o.layout[i];
        const inf = s.g === 'slot' ? { name: '행운 축제 (슬롯)', icon: '🎰', desc: '축제 스핀을 돌리면 클리어!' } : o.info(s.g);
        const st = o.starsOf(i);
        panel.innerHTML = `<div class="mp-card ${s.boss ? 'boss' : ''}">
            <div class="mp-ico" style="--c:${inf.color || '#ffd23f'}">${s.boss ? Ch.svg(o.ep.boss, 'smug') : inf.icon}</div>
            <div class="mp-txt"><small>STAGE ${o.ei + 1}-${i + 1}${s.boss ? ' · BOSS' : ''}</small><b>${s.boss ? Ch.name(o.ep.boss) + ' 보스전 · ' : ''}${inf.name}</b><span>${inf.desc || ''}</span>
              <em>${[1, 2, 3].map((k) => (k <= st ? '★' : '☆')).join('')}${i < o.current ? ' · 다시 하기' : ''}</em></div>
            <button class="mp-go js-go"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" class="mp-ring"/></svg><span>▶</span></button>
          </div>`;
        const go = panel.querySelector('.js-go');
        go.addEventListener('click', (e) => { e.stopPropagation(); clearInterval(this.timer); A.click && A.click(); o.onStart(i); });
        if (auto && o.auto > 0) {
          go.classList.add('auto'); go.style.setProperty('--t', o.auto + 's');
          let left = o.auto;
          this.timer = setInterval(() => { left -= 0.1; if (left <= 0) { clearInterval(this.timer); o.onStart(i); } }, 100);
        }
      };
      host.querySelectorAll('.map-node').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = +b.dataset.i;
        if (i > o.current) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); A.qBad && A.qBad(); return; }
        A.click && A.click();
        showPanel(i, false);
      }));
      // touching the map cancels the auto start (the player wants to look around)
      ['wheel', 'touchstart', 'pointerdown'].forEach((ev) => scroll.addEventListener(ev, () => {
        const go = panel.querySelector('.js-go');
        if (go && go.classList.contains('auto')) { clearInterval(this.timer); go.classList.remove('auto'); }
      }, { passive: true }));
      host.querySelector('.js-eps').addEventListener('click', () => { clearInterval(this.timer); A.click && A.click(); o.onEpisodes(); });
      showPanel(Math.min(sel, n - 1), true);
    },
    stop() { clearInterval(this.timer); },
  };
  QuestMap.DECO = DECO;
  root.QuestMap = QuestMap;
})(window);
