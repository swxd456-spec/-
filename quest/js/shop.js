/* Coin shop payments.
   결제모드 = 테스트     → no money moves; coins are granted after an in-page confirmation (for testing).
   결제모드 = 구글플레이 → Google Play Billing through the Digital Goods API, available when the game runs
                           as the Play Store app (Trusted Web Activity built with PWABuilder / Bubblewrap).
   Production note: verify each purchaseToken on your own server (Google Play Developer API) before
   granting coins; the client-only flow below trusts the device. */
(function (root) {
  const PLAY = 'https://play.google.com/billing';
  const Shop = {
    mode() { return String(root.QuestConfig.get('상점', '결제모드') || '테스트'); },
    playAvailable() { return 'getDigitalGoodsService' in window; },
    async prices(products) {
      // when running inside the Play app, show the localized price Google returns
      if (Shop.mode() !== '구글플레이' || !Shop.playAvailable()) return products;
      try {
        const svc = await window.getDigitalGoodsService(PLAY);
        const det = await svc.getDetails(products.map((p) => p.sku));
        return products.map((p) => {
          const d = det.find((x) => x.itemId === p.sku);
          if (!d) return p;
          const v = d.price;
          const price = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: v.currency }).format(+v.value);
          return Object.assign({}, p, { price });
        });
      } catch (e) { return products; }
    },
    // resolves { ok, reason }
    async buy(p, confirmTest) {
      const mode = Shop.mode();
      if (mode === '구글플레이') {
        if (!Shop.playAvailable()) return { ok: false, reason: '플레이스토어에서 설치한 앱에서만 결제할 수 있어요.' };
        try {
          const svc = await window.getDigitalGoodsService(PLAY);
          const req = new PaymentRequest([{ supportedMethods: PLAY, data: { sku: p.sku } }], { total: { label: 'Total', amount: { currency: 'KRW', value: '0' } } });
          const resp = await req.show();
          const token = resp.details && resp.details.purchaseToken;
          if (!token) { await resp.complete('fail'); return { ok: false, reason: '결제 정보를 받지 못했어요.' }; }
          // TODO(production): send `token` + p.sku to your server and verify it with the Google Play Developer API here.
          await svc.consume(token); // coins are consumable, so the same pack can be bought again
          await resp.complete('success');
          return { ok: true, token };
        } catch (e) {
          return { ok: false, reason: e && e.name === 'AbortError' ? '결제를 취소했어요.' : '결제에 실패했어요. 잠시 후 다시 시도해 주세요.' };
        }
      }
      const ok = await confirmTest(p);
      return ok ? { ok: true, test: true } : { ok: false, reason: '' };
    },
  };
  root.QuestShop = Shop;
})(window);
