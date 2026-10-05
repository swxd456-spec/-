# Mini-game brief (행운의 궁전)

You are building ONE new mini-game for "행운의 궁전", a Korean mobile puzzle-adventure (vanilla JS, no build step, no libraries).
The game is part of a long story campaign (hundreds of stages), so it must be fun for a casual player for a long time,
look premium (cute + flashy, like a top mobile game), feel juicy (particles, screen shake, pops, combos) and sound great.

## Files
- Write ONLY `quest/js/games/<id>.js` and `quest/dev/config-<id>.txt`. Do not edit any other file (others are working in the same tree at the same time).
  If you believe a shared file needs a change, describe it in your final report instead.
- Read for reference: `quest/js/games/common.js` (base class + contract, READ FIRST), `quest/js/shisen.js` (an existing, finished game in the same style),
  `quest/js/fx.js` (SlotFx particle API), `quest/js/audio.js` (search `A.kit` and the `A.q*` functions near the end), `quest/js/util.js`, `quest/css/quest.css` (`.mg-*` classes).
- Do not commit or push.

## Contract (see the comment at the top of common.js)
```js
(function (root) {
  const { Base, util } = root.QuestGames; const U = root.U, A = root.SlotAudio;
  class MyGame extends Base {
    static info = { id: '<id>', name: '<Korean name>', icon: '<emoji>', section: '<config section name>', color: '#hex', desc: '<one Korean line>' };
    static howto = ['<short Korean line>', '<line>', '<line>'];   // 2–4 lines, shown before the first play
    static params(stage, C) { /* read config with util.cfg(C, section, DEFAULTS); return everything the game needs */ }
    constructor(host, o) { super(host, o); /* build with this.hud({...}) */ }
    layout() { /* this.fit(); recompute sizes; must handle portrait phone AND landscape desktop, and be called again on resize */ }
    update(dt, t) {}   draw(t, dt) {}   tool(id, btn) {}
    cheat() { /* testing hook: make the stage end as a clear immediately (call this.win()) */ }
  }
  root.QuestGames['<id>'] = MyGame;
})(window);
```
- `params()` must return at least: `fee, reward, extendCost, extendSec, extendText` (label for the fail-screen button like `'+30초'` or `'+5번'`), `time` (0 if not timed), `star: [s1, s2, s3]` (score thresholds) or override `stars()`.
  `resume()` is called after the player pays on the fail screen: give the extension (time or moves) and continue. Override if you use moves.
- End with `this.win({ rows: [[label, coins], ...] })` (rows = optional small bonus lines, typical total 50–300 coins) or `this.lose('time'|'moves'|'...')`.
- Emit `this.o.onEvent('<kind>', data)` for notable things (e.g. 'combo' with {n}, 'special'), used for quests.
- Tools (hint/shuffle/booster…) cost coins: `if (!this.pay(cost, '힌트에')) return;` — main opens the shop when short.
- `this.paused` is set while menus are open; the base loop stops calling update() then.
- `stage` = how many times this game has appeared in the campaign (1, 2, 3 …, can reach 100+).

## Difficulty (very important — the client said players quit when it is hard early)
- Stages 1–3: tutorial-easy, almost impossible to fail, generous time/moves, highlight what to do.
- Ramp slowly with `util.ease(stage, n)` (n ≈ 25–40) so the challenge rises over dozens of stages and plateaus (still beatable) around stage 80+.
- Everything that affects difficulty must come from the config section (Korean keys) so the operator can tune it.
- Same `o.seed` → same level (levels are generated from `this.rnd`, a seeded RNG). Never use Math.random for level layout.

## Config snippet `quest/dev/config-<id>.txt`
Same format as `quest/config.txt` (read it): `[섹션]`, `키 = 값   # 한국어 설명`. Keys must match your DEFAULTS exactly. Include 입장료, 클리어보상, 시간연장_가격 (or equivalent), and the difficulty curve keys.

## Look & feel
- Dark neon casino palace style. Use the current hall theme: `this.th.accent`, `this.th.accent2`, `this.th.tiers` (8 colors), `this.th.sc` etc. Background is already an animated shader behind the transparent page, so draw your board on a translucent glass panel.
- Draw everything on canvas with gradients, glossy highlights, soft shadows, rounded shapes. Cute characters/objects (big shiny eyes, blush) are welcome. Emoji may be used sparingly as small icons; the core pieces should be your own drawn sprites. Cache sprites in offscreen canvases (performance on mid-range Android is important: 60fps, no per-frame allocations of big objects, cap particles).
- Juice: squash & stretch, easing, anticipation, hit-stop on big moments, `this.shake()`, `this.burst/ring/shards/explode/pop` (fx), `this.banner('FEVER!', 'good')`, combo counters, score fly-ups.
- Korean text for all UI. Must work with touch (pointer events) and mouse. No hover-only features.

## Sound
Use `A.kit` (play/tone/noise with instruments listed in `A.kit.inst`, `A.kit.note(i, oct)` for pitches in the hall's key; always check `A.kit.ok()` first) to build 5–10 distinctive sounds for your game (hits, pops, combos rising in pitch, special, fail, win), plus the existing `A.qClear/A.qFail/A.qBad/A.qMatch(combo)/A.qTick` where they fit. Keep voice counts modest (mobile).
Music is handled by main.js — do not start music.

## Test (required)
A static server serves the repo root at http://localhost:8765 (if it is not reachable, start your own on another port: `python3 -m http.server <port> --directory /home/user/-`).
Harness: `http://localhost:8765/quest/dev/game.html?g=<id>&stage=<n>&hall=<0..29>` mounts your game exactly like the real app (window.G = your instance, window.result = end result, window.events).
Playwright: `const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');` (Chromium is preinstalled; never run `playwright install`). Use `devices['Pixel 7']` and a 1440×860 desktop.
- Write a bot that actually plays (real pointer input) at stage 1 and at stage 40 and confirm stage 1 is easily won and stage 40 is harder but winnable; check fail → `G.resume()` → continue works; `G.cheat()` works; zero page errors.
- Take screenshots on both viewports and LOOK at them; iterate on the visuals until it looks like a polished commercial mobile game. Put scratch files in your own folder under /tmp/claude-0/-home-user--/9f9c7e25-4b34-5a28-93ca-75d9e33d1bd4/scratchpad/<id>/ .

## Final report (short)
What you built (mechanics, specials, difficulty curve), config keys, test results (win rates/bot results, errors), screenshot paths, and any shared-file change you need.
