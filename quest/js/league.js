/* Weekly league: the player races 19 palace residents (named NPC rivals) for league points each week.
   Top 5 move up a tier, bottom 4 move down; rank rewards are paid when the week rolls over.
   For real people there is the challenge link (challenge.js). */
(function (root) {
  const U = root.U;
  const TIERS = [
    { name: '브론즈', c: '#d08a4a' }, { name: '실버', c: '#c9d3e0' }, { name: '골드', c: '#ffd23f' }, { name: '플래티넘', c: '#7fffd4' },
    { name: '다이아', c: '#7ab8ff' }, { name: '마스터', c: '#c48cff' }, { name: '레전드', c: '#ff5f8a' },
  ];
  const ADJ = ['반짝이는', '졸린', '용감한', '수줍은', '배고픈', '행운의', '번개', '달콤한', '느긋한', '씩씩한', '꼬마', '은하', '무지개', '구름', '대왕', '새벽', '별빛', '말랑'];
  const NOUN = ['토끼', '판다', '펭귄', '고양이', '부엉이', '다람쥐', '햄스터', '여우', '곰돌이', '수달', '코알라', '오리', '고슴도치', '알파카', '돌고래', '용'];
  const AV = ['toto', 'pingu', 'hana', 'nyank', 'hoya', 'bana', 'robo', 'boya', 'draco'];

  function weekKey(t) {
    // weeks start on Monday 00:00 local time
    const d = new Date(t || Date.now());
    const day = (d.getDay() + 6) % 7;
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    return mon.getFullYear() + '-' + String(mon.getMonth() + 1).padStart(2, '0') + '-' + String(mon.getDate()).padStart(2, '0');
  }
  function weekProgress(t) {
    const d = new Date(t || Date.now());
    const day = (d.getDay() + 6) % 7;
    return U.clamp((day + (d.getHours() * 60 + d.getMinutes()) / 1440) / 7, 0, 1);
  }
  // rivals for a week/tier: deterministic, so the board is stable on every open
  function rivals(week, tier) {
    const rnd = U.mulberry32(U.hashStr('league-' + week + '-' + tier));
    const scale = 1800 * Math.pow(1.55, tier);
    const used = {};
    return Array.from({ length: 19 }, (_, i) => {
      let name;
      do { name = ADJ[Math.floor(rnd() * ADJ.length)] + ' ' + NOUN[Math.floor(rnd() * NOUN.length)]; } while (used[name]);
      used[name] = 1;
      const skill = 0.15 + Math.pow(rnd(), 1.4) * 2.2; // a few strong, many casual
      const shape = 0.7 + rnd() * 0.8;                 // early birds vs. last-minute grinders
      return { name, av: AV[Math.floor(rnd() * AV.length)], end: Math.round(scale * skill), shape, seed: rnd() };
    });
  }
  function rivalPts(r, prog) { prog = 0.12 + 0.88 * prog; return Math.round(r.end * Math.pow(prog, r.shape) * (0.92 + 0.08 * Math.sin(r.seed * 50 + prog * 20))); }

  const League = {
    TIERS,
    ensure(st) {
      const wk = weekKey();
      if (!st.league) st.league = { week: wk, tier: 0, pts: 0, last: null };
      const L = st.league;
      if (L.week !== wk) {
        // settle last week at 100% progress
        const rank = League.rankOf(L, 1);
        const reward = rank === 1 ? 3000 : rank <= 3 ? 2000 : rank <= 5 ? 1000 : rank <= 10 ? 500 : 200;
        const move = rank <= 5 && L.tier < TIERS.length - 1 ? 1 : rank >= 17 && L.tier > 0 ? -1 : 0;
        L.last = { week: L.week, rank, reward, tier: L.tier, move, paid: false };
        L.tier += move;
        L.week = wk; L.pts = 0;
      }
      return L;
    },
    board(L, prog) {
      prog = prog == null ? weekProgress() : prog;
      const list = rivals(L.week, L.tier).map((r) => ({ name: r.name, av: r.av, pts: rivalPts(r, prog) }));
      list.push({ me: true, name: '나', av: 'lumi', pts: L.pts });
      list.sort((a, b) => b.pts - a.pts || (a.me ? -1 : 1));
      return list;
    },
    rankOf(L, prog) { return League.board(L, prog).findIndex((x) => x.me) + 1; },
    add(st, pts) {
      const L = League.ensure(st);
      const before = League.rankOf(L);
      L.pts += pts;
      return { before, after: League.rankOf(L), pts: L.pts };
    },
    daysLeft() { const p = weekProgress(); return Math.max(0, Math.ceil(7 - p * 7)); },
  };
  root.QuestLeague = League;
})(window);
