/* Cutscene player: letterboxed scenes with animated SVG characters, camera drift, typewriter dialog and screen effects.
   Cinema.play(shots, { theme, card: { kicker, title, sub, hour } }) → Promise (resolves when finished or skipped). */
(function (root) {
  const A = root.SlotAudio, Ch = root.Chara;
  const POS = { l: 20, c: 50, r: 80, ll: 8, rr: 92 };

  function clockSVG(hour) {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2, on = i < hour || (hour === 12);
      const x = 60 + Math.cos(a) * 46, y = 60 + Math.sin(a) * 46;
      return `<path d="M${x} ${y - 7} L${x + 2.2} ${y - 2.2} L${x + 7} ${y} L${x + 2.2} ${y + 2.2} L${x} ${y + 7} L${x - 2.2} ${y + 2.2} L${x - 7} ${y} L${x - 2.2} ${y - 2.2} Z" fill="${on ? '#ffe27a' : 'rgba(255,255,255,.18)'}" ${on ? 'class="cc-on"' : ''} style="--d:${i * 0.06}s"/>`;
    }).join('');
    const ang = ((hour % 12) / 12) * 360;
    return `<svg class="cine-clock" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="rgba(10,6,30,.65)" stroke="#ffd23f" stroke-width="3"/><circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,210,63,.35)" stroke-width="1.5" stroke-dasharray="3 5"/>${ticks}
      <g class="cc-hand" style="--a:${ang}deg"><path d="M60 60 L60 22" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g><circle cx="60" cy="60" r="6" fill="#ffd23f"/></svg>`;
  }

  const Cinema = {
    playing: false,
    play(shots, opt) {
      opt = opt || {};
      return new Promise((resolve) => {
        const th = opt.theme || { sc: ['#14002e', '#3b0a5e', '#ff2bd6'], accent: '#ff4fd8', accent2: '#00e5ff' };
        const d = document.createElement('div');
        d.className = 'cine';
        d.style.setProperty('--c1', th.sc ? th.sc[0] : '#14002e');
        d.style.setProperty('--c2', th.sc ? th.sc[1] : '#3b0a5e');
        d.style.setProperty('--c3', th.accent || '#ff4fd8');
        d.innerHTML = `<div class="cine-stage"><div class="cine-sky"></div><div class="cine-rays"></div><div class="cine-sparks">${Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i * 0.37) % 6}s;--s:${0.5 + ((i * 13) % 10) / 10}"></i>`).join('')}</div><div class="cine-deco">${(opt.deco || []).concat(opt.deco || []).map((e, i) => `<i style="--x:${(i * 23 + 7) % 96}%;--y:${8 + ((i * 41) % 52)}%;--s:${0.7 + ((i * 17) % 10) / 12};--d:${(i * 0.53) % 4}s">${e}</i>`).join('')}</div><div class="cine-floor"></div><div class="cine-cast"></div></div>
          <div class="cine-vig"></div><div class="cine-flash"></div><div class="cine-bolt"></div>
          <div class="cine-bar top"></div><div class="cine-bar bot"></div>
          <div class="cine-box hidden"><div class="cine-name"></div><p class="cine-text"></p><i class="cine-next">▼</i></div>
          <div class="cine-narr hidden"></div>
          <button class="cine-skip">건너뛰기 ▶▶</button>`;
        document.getElementById('overlays').appendChild(d);
        Cinema.playing = true;
        const stage = d.querySelector('.cine-stage'), cast = d.querySelector('.cine-cast');
        const box = d.querySelector('.cine-box'), nameEl = d.querySelector('.cine-name'), textEl = d.querySelector('.cine-text'), narr = d.querySelector('.cine-narr');
        const actors = {};
        let idx = -1, typing = null, full = '', done = false, autoT = null;

        const finish = () => {
          if (done) return; done = true;
          clearInterval(typing); clearTimeout(autoT);
          Cinema.playing = false;
          d.classList.add('out');
          setTimeout(() => { d.remove(); resolve(); }, 450);
        };
        d.querySelector('.cine-skip').addEventListener('click', (e) => { e.stopPropagation(); A.click && A.click(); finish(); });

        const effect = (fx) => {
          if (!fx) return;
          const fl = d.querySelector('.cine-flash');
          if (fx === 'flash' || fx === 'lightning') { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
          if (fx === 'shake' || fx === 'lightning') { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
          if (fx === 'lightning') { const b = d.querySelector('.cine-bolt'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); thunder(); }
          d.classList.toggle('dark', fx === 'dark' || fx === 'lightning');
          if (fx === 'stars') { const f = root.Quest && root.Quest.fx; if (f) { f.explode(innerWidth / 2, innerHeight * 0.4, 2.5, ['#ffe27a', '#fff', th.accent]); f.confetti(50); } A.qChapter && A.qChapter(); }
          if (fx === 'flash') A.qWhoosh && A.qWhoosh();
        };
        const thunder = () => {
          const k = A.kit; if (!k || !k.ok()) return;
          const t = k.now();
          k.noise(t, 0.08, 0.6, 'highpass', 2000);
          k.noise(t + 0.03, 1.6, 0.55, 'lowpass', 500, 0.7, k.rv(0.8));
          k.tone('sine', 70, 30, t, 1.2, 0.6);
        };

        const showCard = () => new Promise((res) => {
          const c = opt.card;
          const el = document.createElement('div');
          el.className = 'cine-card';
          el.innerHTML = `${c.hour ? clockSVG(c.hour) : ''}<div class="cc-kicker">${c.kicker || ''}</div><div class="cc-title">${c.title}</div>${c.sub ? `<div class="cc-sub">${c.sub}</div>` : ''}`;
          d.appendChild(el);
          A.qChapter && A.qChapter();
          setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 500); }, 2600);
        });

        const type = (text) => {
          clearInterval(typing);
          full = text; let i = 0;
          textEl.textContent = '';
          typing = setInterval(() => {
            i += 1;
            textEl.textContent = full.slice(0, i);
            if (i % 3 === 0) A.qDialog && Math.random() < 0.25 && A.qDialog();
            if (i >= full.length) { clearInterval(typing); typing = null; setTalking(null); }
          }, 32);
        };
        const setTalking = (who) => Object.keys(actors).forEach((k) => {
          actors[k].classList.toggle('talking', k === who);
          actors[k].classList.toggle('dim', !!who && k !== who);
          actors[k].classList.toggle('speak', k === who);
        });

        const next = () => {
          if (done) return;
          clearTimeout(autoT);
          if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; setTalking(null); return; }
          idx++;
          if (idx >= shots.length) { finish(); return; }
          const s = shots[idx];
          // cast
          const want = {};
          (s.cast || []).forEach(([id, pos, expr, enter]) => {
            want[id] = 1;
            let a = actors[id];
            const flip = pos === 'r' || pos === 'rr';
            if (!a) {
              a = Ch.el(id, expr, { flip });
              a.classList.add('cine-actor', 'enter-' + (enter || 'fade'));
              if (flip) a.classList.add('flip');
              actors[id] = a;
              cast.appendChild(a);
              A.qWhoosh && enter && A.qWhoosh();
              requestAnimationFrame(() => requestAnimationFrame(() => a.classList.add('in')));
            } else {
              if (a.classList.contains('flip') !== flip) a.classList.toggle('flip', flip);
              Ch.set(a, expr);
              if (expr === 'joy' || expr === 'surprised') { a.classList.remove('hop'); void a.offsetWidth; a.classList.add('hop'); }
              if (expr === 'angry' || expr === 'sad') { a.classList.remove('shiver'); void a.offsetWidth; a.classList.add('shiver'); }
            }
            a.style.setProperty('--x', POS[pos] + '%');
            a.style.zIndex = pos === 'c' ? 3 : 2;
          });
          Object.keys(actors).forEach((k) => { if (!want[k]) { const a = actors[k]; delete actors[k]; a.classList.remove('in'); a.classList.add('gone'); setTimeout(() => a.remove(), 500); } });
          // camera
          stage.style.setProperty('--zoom', (s.cast || []).length <= 1 ? 1.08 : 1);
          effect(s.fx);
          if (s.narr || !s.who) {
            box.classList.add('hidden');
            narr.classList.remove('hidden'); narr.textContent = s.text;
            narr.classList.remove('show'); void narr.offsetWidth; narr.classList.add('show');
            setTalking(null);
          } else {
            narr.classList.add('hidden');
            box.classList.remove('hidden');
            const c = Ch.CH[s.who] || {};
            nameEl.textContent = c.name || s.who;
            nameEl.style.setProperty('--nc', c.shadow || s.who === 'nocturne' || s.who === 'mirror' || s.who === 'minion' ? '#8a5cff' : (c.outfit || '#ff8a3d'));
            box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
            setTalking(s.who);
            A.qDialog && A.qDialog();
            type(s.text);
          }
          // gentle auto-advance so a hands-off player still moves on
          autoT = setTimeout(() => { if (!done) next(); }, 3200 + s.text.length * 75);
        };
        d.addEventListener('click', () => { A.init && A.init(); next(); });
        const begin = () => { d.classList.add('rolling'); setTimeout(next, 450); };
        if (opt.card) showCard().then(begin); else begin();
      });
    },
  };
  root.Cinema = Cinema;
})(window);
