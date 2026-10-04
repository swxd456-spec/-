/* Shared helpers (browser + node) */
(function (root) {
  const U = {
    rand: Math.random,
    ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    // items: [{w:..}] or weights array
    wpick(items, wf, rng) {
      const r0 = rng || Math.random;
      let tot = 0;
      for (let i = 0; i < items.length; i++) tot += wf ? wf(items[i], i) : items[i];
      let r = r0() * tot;
      for (let i = 0; i < items.length; i++) {
        r -= wf ? wf(items[i], i) : items[i];
        if (r < 0) return i;
      }
      return items.length - 1;
    },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeInCubic(t) { return t * t * t; },
    easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeOutBack(t, c1 = 1.2) {
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeOutElastic(t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },
    fmt(n) {
      const v = Math.round(n * 100) / 100;
      return v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    },
    hashStr(s) {
      let h = 1779033703 ^ s.length;
      for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      return h >>> 0;
    },
    mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
    store: {
      get(k, d) {
        try {
          const v = localStorage.getItem('slots30.' + k);
          return v === null ? d : JSON.parse(v);
        } catch (e) { return d; }
      },
      set(k, v) {
        try { localStorage.setItem('slots30.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
      },
    },
    hexToRgb(h) {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    rgba(h, a) {
      const [r, g, b] = U.hexToRgb(h);
      return `rgba(${r},${g},${b},${a})`;
    },
    shade(h, p) {
      // p in [-1,1]
      const [r, g, b] = U.hexToRgb(h);
      const f = (c) => Math.round(p < 0 ? c * (1 + p) : c + (255 - c) * p);
      return `rgb(${f(r)},${f(g)},${f(b)})`;
    },
  };
  root.U = U;
  if (typeof module !== 'undefined') module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);
