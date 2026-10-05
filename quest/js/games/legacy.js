/* Adapters that put the original 사천성 (shisen.js) and 틀린그림찾기 (spotdiff.js) behind the QuestGames contract. */
(function (root) {
  const G = root.QuestGames;

  class Shisen {
    static info = { id: 'shisen', name: '사천성', icon: '🀄', section: '사천성', color: '#2fbf71', desc: '같은 그림을 꺾임 두 번 이하로 이어요' };
    static howto = ['같은 그림 두 개를 차례로 누르세요.', '두 그림 사이 길이 두 번 이하로 꺾이면 사라져요.', '보드 바깥으로 돌아가는 길도 돼요. 막히면 셔플!'];
    static params(stage, C) { const p = C.shisen(stage); p.extendText = `+${p.extendSec}초`; return p; }
    constructor(host, o) {
      const p = o.params;
      const inner = new root.ShisenGame(host, Object.assign({}, o, {
        onEnd: (r) => {
          if (!r.cleared) return o.onEnd(r);
          const u = r.timeLeft / p.time;
          const rows = [];
          const tb = Math.round(r.timeLeft * p.timeBonus);
          if (tb) rows.push([`남은 시간 ${Math.ceil(r.timeLeft)}초`, tb]);
          if (r.maxCombo > 1) rows.push([`최고 콤보 x${r.maxCombo}`, r.maxCombo * p.comboBonus]);
          if (r.gold) rows.push(['황금 타일', r.gold]);
          o.onEnd({ cleared: true, score: Math.round(1000 + r.timeLeft * 20 + r.maxCombo * 50), stars: u > 0.5 ? 3 : u > 0.25 ? 2 : 1, timeLeft: r.timeLeft, rows });
        },
      }));
      inner.cheat = () => { inner.running = false; inner.o.onEnd({ cleared: true, timeLeft: inner.time, maxCombo: 1, gold: 0 }); };
      return inner;
    }
  }

  class SpotDiff {
    static info = { id: 'diff', name: '틀린그림찾기', icon: '🔍', section: '틀린그림', color: '#36a3ff', desc: '거울 세계에서 다른 곳을 찾아요' };
    static howto = ['위아래(또는 좌우) 두 그림에서 다른 곳을 찾아 누르세요.', '아무 데나 누르면 시간이 줄어요.', '막히면 돋보기 힌트!'];
    static params(stage, C) { const p = C.diff(stage); p.extendText = `+${p.extendSec}초`; return p; }
    constructor(host, o) {
      const p = o.params;
      const inner = new root.SpotDiffGame(host, Object.assign({}, o, {
        onEnd: (r) => {
          if (!r.cleared) return o.onEnd(r);
          const rows = [];
          const tb = Math.round(r.timeLeft * p.timeBonus);
          if (tb) rows.push([`남은 시간 ${Math.ceil(r.timeLeft)}초`, tb]);
          if (r.misses === 0 && r.hints === 0) rows.push(['오답·힌트 없이 완벽!', 150]);
          o.onEnd({ cleared: true, score: Math.round(1000 + r.timeLeft * 20 - r.misses * 100), stars: r.misses === 0 && r.hints === 0 ? 3 : r.misses <= 2 ? 2 : 1, timeLeft: r.timeLeft, misses: r.misses, rows });
        },
      }));
      inner.cheat = () => { inner.running = false; inner.o.onEnd({ cleared: true, timeLeft: inner.time, misses: 0, hints: 0 }); };
      return inner;
    }
  }

  G.shisen = Shisen;
  G.diff = SpotDiff;
})(window);
