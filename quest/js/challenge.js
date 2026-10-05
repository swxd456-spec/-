/* Friend challenge links: share a stage (same game, same seed, same difficulty) with your score.
   The friend opens the link, plays the identical stage and sees who won — then can send it back.
   Link: <page>?vs=<base64url JSON { g, seed, gs, sc, n, t }> */
(function (root) {
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const dec = (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } };

  const Challenge = {
    // read and remove ?vs= from the address bar
    take() {
      const q = new URLSearchParams(location.search);
      const v = q.get('vs');
      if (!v) return null;
      q.delete('vs');
      const rest = q.toString();
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
      const c = dec(v);
      if (!c || !c.g || typeof c.seed !== 'number') return null;
      return c;
    },
    link(c) {
      const base = location.origin + location.pathname;
      return base + '?vs=' + enc(c);
    },
    async share(c, gameName) {
      const url = Challenge.link(c);
      const text = `🦊 행운의 궁전 도전장! ${c.n}님이 「${gameName}」에서 ${Number(c.sc).toLocaleString()}점을 냈어요. 같은 판에서 이겨 보세요!`;
      if (navigator.share) {
        try { await navigator.share({ title: '행운의 궁전 도전장', text, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
      }
      try { await navigator.clipboard.writeText(text + '\n' + url); return 'copied'; } catch (e) { /* fall through */ }
      return 'manual:' + text + '\n' + url;
    },
  };
  root.QuestChallenge = Challenge;
})(window);
