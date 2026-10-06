/* Operator settings: parses config.txt (Korean INI), keeps built-in defaults,
   re-reads the file every minute so edits apply to running apps. */
(function (root) {
  const DEFAULT = {
    '경제': { '시작코인': 3000, '코인부족시_상점열기': true },
    '캠페인': { '자동시작_초': 3, '자동진행_초': 3, '축제_스핀수': 10, '축제_보상': 200, '별3개_보너스': 100, '보스_보너스': 500, '에피소드_보상': 2000, '도전장_승리보상': 300 },
    '사천성': {
      '입장료': 100, '클리어보상': 300, '남은시간_보상': 2, '콤보_보상': 10, '힌트_가격': 50, '셔플_가격': 80,
      '시간연장_가격': 150, '시간연장_초': 45, '보드_단계': '6x8, 8x8, 8x10, 8x12, 10x12, 10x14', '보드증가_간격': 3,
      '제한시간_시작': 200, '제한시간_감소': 3, '제한시간_최소': 100, '그림종류_최대': 30, '특수타일_확률': 15,
      '중력_시작판': 5, '중력_확률': 35,
    },
    '틀린그림': {
      '입장료': 100, '클리어보상': 300, '남은시간_보상': 3, '오답_감점초': 8, '힌트_가격': 60, '시간연장_가격': 150,
      '시간연장_초': 30, '차이개수_시작': 3, '차이개수_최대': 9, '차이증가_간격': 4, '제한시간_시작': 100,
      '제한시간_감소': 2, '제한시간_최소': 45, '미묘함_시작': 20, '미묘함_증가': 3, '미묘함_최대': 85,
      '물건수_시작': 14, '물건수_최대': 30,
    },
    '슬롯 RTP': { '전체': 96 },
    '상점': {
      '결제모드': '테스트',
      '상품': ['5000 | ₩1,200 | coins_5000', '30000 | ₩5,900 | coins_30000', '80000 | ₩12,000 | coins_80000', '200000 | ₩25,000 | coins_200000', '600000 | ₩59,000 | coins_600000'],
    },
    '자유플레이': { '보상_배율': 40, '최대단계': 150 },
    '보상': { '출석_기본': 500, '출석_연속보너스': 200, '일일퀘스트_보상': 400, '챕터완료_보상': 1000, '업적_보상': 150 },
    '틀린그림 사용자 이미지': { _lines: [] },
  };

  function parse(txt) {
    const out = {};
    let sec = null;
    txt.split(/\r?\n/).forEach((raw) => {
      const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '').trim();
      if (!line) return;
      const m = line.match(/^\[(.+)\]$/);
      if (m) { sec = m[1].trim(); out[sec] = out[sec] || { _lines: [] }; return; }
      if (!sec) return;
      const eq = line.indexOf('=');
      if (eq < 0) { out[sec]._lines.push(line); return; }
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if (sec === '틀린그림 사용자 이미지') { out[sec]._lines.push(line); return; }
      if (/^-?\d+(\.\d+)?$/.test(v.replace(/,/g, '')) && !/x/i.test(v) && !/\|/.test(v)) v = parseFloat(v.replace(/,/g, ''));
      else if (v === '예' || v === '네' || /^(yes|true|on)$/i.test(v)) v = true;
      else if (v === '아니오' || v === '아니요' || /^(no|false|off)$/i.test(v)) v = false;
      if (k === '상품') { (out[sec]['상품'] = out[sec]['상품'] || []).push(v); return; }
      out[sec][k] = v;
    });
    // custom image lines are written without '=' ("a.jpg | b.jpg | ...")
    return out;
  }

  const C = {
    data: JSON.parse(JSON.stringify(DEFAULT)),
    loadedAt: 0,
    source: '기본값',
    listeners: [],
    get(sec, key) {
      const s = C.data[sec];
      if (s && s[key] !== undefined) return s[key];
      return DEFAULT[sec] ? DEFAULT[sec][key] : undefined;
    },
    num(sec, key) { const v = C.get(sec, key); return typeof v === 'number' ? v : parseFloat(v) || 0; },
    onChange(fn) { C.listeners.push(fn); },
    async load() {
      try {
        const r = await fetch('config.txt?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        const txt = await r.text();
        const p = parse(txt);
        const merged = JSON.parse(JSON.stringify(DEFAULT));
        for (const sec in p) merged[sec] = Object.assign(merged[sec] || {}, p[sec]);
        const changed = JSON.stringify(merged) !== JSON.stringify(C.data);
        C.data = merged;
        C.source = 'config.txt';
        C.loadedAt = Date.now();
        if (changed) C.listeners.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
      } catch (e) { /* keep last known values */ }
    },
    start() { C.load(); setInterval(() => { if (!document.hidden) C.load(); }, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) C.load(); }); },

    /* ---------- derived values ---------- */
    rtp(id) {
      const s = C.data['슬롯 RTP'] || {};
      const v = s[id] !== undefined ? s[id] : s['전체'] !== undefined ? s['전체'] : 96;
      return Math.max(10, Math.min(200, +v || 96));
    },
    products() {
      return (C.get('상점', '상품') || []).map((line) => {
        const [c, price, sku] = String(line).split('|').map((x) => x.trim());
        return { coins: parseInt(String(c).replace(/[^\d]/g, ''), 10) || 0, price: price || '', sku: sku || '' };
      }).filter((p) => p.coins > 0);
    },
    // per-stage curves (stage counts from 1 across the whole run)
    shisen(stage) {
      const g = (k) => C.num('사천성', k);
      const sizes = String(C.get('사천성', '보드_단계')).split(',').map((s) => s.trim().split(/x/i).map((n) => parseInt(n, 10))).filter((a) => a[0] > 1 && a[1] > 1 && (a[0] * a[1]) % 2 === 0);
      const step = Math.max(1, g('보드증가_간격'));
      const [rows, cols] = sizes[Math.min(sizes.length - 1, Math.floor((stage - 1) / step))] || [6, 8];
      return {
        rows, cols,
        time: Math.max(g('제한시간_최소'), g('제한시간_시작') - (stage - 1) * g('제한시간_감소')),
        kinds: Math.max(4, Math.min(g('그림종류_최대'), Math.floor((rows * cols) / 4))),
        special: g('특수타일_확률') / 100,
        gravity: stage >= g('중력_시작판') && Math.random() < g('중력_확률') / 100,
        fee: g('입장료'), reward: g('클리어보상'), timeBonus: g('남은시간_보상'), comboBonus: g('콤보_보상'),
        hint: g('힌트_가격'), shuffle: g('셔플_가격'), extendCost: g('시간연장_가격'), extendSec: g('시간연장_초'),
      };
    },
    diff(stage) {
      const g = (k) => C.num('틀린그림', k);
      return {
        count: Math.min(g('차이개수_최대'), g('차이개수_시작') + Math.floor((stage - 1) / Math.max(1, g('차이증가_간격')))),
        time: Math.max(g('제한시간_최소'), g('제한시간_시작') - (stage - 1) * g('제한시간_감소')),
        subtle: Math.min(g('미묘함_최대'), g('미묘함_시작') + (stage - 1) * g('미묘함_증가')) / 100,
        objects: Math.min(g('물건수_최대'), g('물건수_시작') + Math.floor((stage - 1) / 2)),
        penalty: g('오답_감점초'), fee: g('입장료'), reward: g('클리어보상'), timeBonus: g('남은시간_보상'),
        hint: g('힌트_가격'), extendCost: g('시간연장_가격'), extendSec: g('시간연장_초'),
      };
    },
    customDiffs() {
      const sec = C.data['틀린그림 사용자 이미지'] || {};
      return (sec._lines || []).map((line) => {
        const parts = line.split('|').map((x) => x.trim());
        if (parts.length < 3) return null;
        const spots = parts[2].split(';').map((s) => s.split(',').map((n) => parseFloat(n))).filter((a) => a.length >= 2 && a.every((n) => !isNaN(n)))
          .map(([x, y, r]) => ({ x: x / 100, y: y / 100, r: (r || 5) / 100 }));
        return spots.length ? { a: 'img/' + parts[0], b: 'img/' + parts[1], spots } : null;
      }).filter(Boolean);
    },
  };
  C.parse = parse;
  root.QuestConfig = C;
})(window);
