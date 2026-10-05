/* Web Audio engine: synth instruments, 808-style drums, generative background music with
   arrangement (fills, breakdowns, sidechain), casino floor ambience and slot sound effects.
   Everything is synthesized in the browser. */
(function (root) {
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10], phrygdom: [0, 1, 4, 5, 7, 8, 10], harmMinor: [0, 2, 3, 5, 7, 8, 11],
    lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], pentaMaj: [0, 2, 4, 7, 9],
    pentaMin: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10], inScale: [0, 1, 5, 7, 8],
  };
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- instrument specs ---------- */
  const INST = {
    sine: { osc: [{ t: 'sine' }], env: [0.01, 0.3, 0.6, 0.2] },
    synthlead: { osc: [{ t: 'sawtooth', d: -9 }, { t: 'sawtooth', d: 9 }], filter: ['lowpass', 2600, 3], env: [0.01, 0.2, 0.6, 0.25], vib: [5.5, 7, 0.25], g: 0.5 },
    pluck: { osc: [{ t: 'sawtooth' }], filter: ['lowpass', 700, 2, 5000, 0.22], env: [0.003, 0.32, 0, 0.12], g: 0.7 },
    bell: { osc: [{ t: 'sine' }], fm: [3.5, 2.2, 1.0], env: [0.002, 1.3, 0, 0.4], g: 0.7 },
    celesta: { osc: [{ t: 'sine' }, { t: 'sine', r: 4, g: 0.15 }], fm: [4, 1.1, 0.35], env: [0.002, 0.9, 0, 0.3], g: 0.7 },
    musicbox: { osc: [{ t: 'sine' }, { t: 'sine', r: 3, g: 0.1 }], fm: [7, 0.8, 0.2], env: [0.001, 1.4, 0, 0.5], g: 0.6 },
    marimba: { osc: [{ t: 'sine' }, { t: 'sine', r: 4, g: 0.3 }, { t: 'sine', r: 10, g: 0.06 }], env: [0.002, 0.45, 0, 0.1], g: 0.9 },
    koto: { osc: [{ t: 'triangle' }, { t: 'sawtooth', g: 0.35 }], filter: ['lowpass', 1400, 1, 6500, 0.35], env: [0.002, 0.9, 0, 0.3], bend: [1.03, 0.05], g: 0.6 },
    guzheng: { osc: [{ t: 'triangle' }, { t: 'sawtooth', g: 0.25 }], filter: ['lowpass', 1600, 1, 7000, 0.5], env: [0.002, 1.4, 0, 0.5], vib: [5, 9, 0.35], g: 0.6 },
    harp: { osc: [{ t: 'triangle' }, { t: 'sine', r: 2, g: 0.2 }], filter: ['lowpass', 3200, 0.5], env: [0.003, 1.3, 0, 0.6], g: 0.75 },
    oud: { osc: [{ t: 'triangle' }, { t: 'square', g: 0.2 }], filter: ['lowpass', 900, 2, 3600, 0.25], env: [0.003, 0.55, 0, 0.15], bend: [0.97, 0.06], g: 0.7 },
    banjo: { osc: [{ t: 'square', g: 0.5 }, { t: 'sawtooth' }], filter: ['lowpass', 1800, 2, 7000, 0.08], env: [0.001, 0.26, 0, 0.08], g: 0.45 },
    organ: { osc: [{ t: 'sine' }, { t: 'sine', r: 2, g: 0.5 }, { t: 'sine', r: 3, g: 0.3 }, { t: 'sine', r: 4, g: 0.2 }], env: [0.01, 0.1, 0.85, 0.12], vib: [6, 4, 0], g: 0.38 },
    accordion: { osc: [{ t: 'sawtooth', d: -11 }, { t: 'sawtooth', d: 11 }, { t: 'square', r: 2, g: 0.2 }], filter: ['lowpass', 1900, 1], env: [0.03, 0.1, 0.8, 0.12], vib: [6.5, 3, 0], g: 0.3 },
    brass: { osc: [{ t: 'sawtooth', d: -6 }, { t: 'sawtooth', d: 6 }], filter: ['lowpass', 1500, 1.5, 450, 0.08, true], env: [0.04, 0.25, 0.7, 0.18], vib: [5, 5, 0.3], g: 0.45 },
    trumpet: { osc: [{ t: 'sawtooth' }, { t: 'square', g: 0.3 }], filter: ['lowpass', 2600, 2, 600, 0.05, true], env: [0.03, 0.2, 0.75, 0.12], vib: [5.5, 8, 0.2], g: 0.4 },
    strings: { osc: [{ t: 'sawtooth', d: -12 }, { t: 'sawtooth', d: 0 }, { t: 'sawtooth', d: 12 }], filter: ['lowpass', 2400, 0.7], env: [0.22, 0.3, 0.8, 0.6], vib: [5, 6, 0.3], g: 0.28 },
    pad: { osc: [{ t: 'sawtooth', d: -14 }, { t: 'sawtooth', d: 14 }, { t: 'triangle', r: 0.5 }], filter: ['lowpass', 1100, 0.8], env: [0.7, 0.5, 0.8, 1.4], g: 0.25 },
    warmpad: { osc: [{ t: 'triangle', d: -8 }, { t: 'triangle', d: 8 }, { t: 'sine', r: 2, g: 0.2 }], env: [0.6, 0.4, 0.8, 1.4], g: 0.35 },
    choir: { osc: [{ t: 'sawtooth', d: -10 }, { t: 'sawtooth', d: 10 }], filter: ['bandpass', 900, 1.2], env: [0.4, 0.3, 0.85, 0.9], vib: [5, 6, 0.2], g: 0.6 },
    flute: { osc: [{ t: 'sine' }, { t: 'triangle', r: 2, g: 0.08 }], env: [0.07, 0.2, 0.8, 0.15], vib: [5, 9, 0.15], breath: 0.05, g: 0.7 },
    whistle: { osc: [{ t: 'sine' }], env: [0.04, 0.1, 0.85, 0.1], vib: [6, 12, 0.1], breath: 0.03, g: 0.6 },
    erhu: { osc: [{ t: 'sawtooth' }], filter: ['lowpass', 1800, 3], env: [0.09, 0.2, 0.8, 0.2], vib: [6, 16, 0.12], glide: [0.97, 0.08], g: 0.4 },
    fiddle: { osc: [{ t: 'sawtooth' }, { t: 'sawtooth', d: 5, g: 0.5 }], filter: ['lowpass', 3000, 2], env: [0.04, 0.1, 0.8, 0.1], vib: [6, 10, 0.1], g: 0.32 },
    sax: { osc: [{ t: 'sawtooth' }, { t: 'square', g: 0.4 }], filter: ['lowpass', 1700, 3, 600, 0.06, true], env: [0.04, 0.2, 0.75, 0.15], vib: [5, 10, 0.2], glide: [0.98, 0.05], g: 0.35 },
    epiano: { osc: [{ t: 'sine' }, { t: 'sine', r: 2, g: 0.12 }], fm: [1, 1.6, 0.5], env: [0.003, 1.1, 0.25, 0.35], g: 0.7 },
    chip: { osc: [{ t: 'square' }], env: [0.001, 0.08, 0.6, 0.04], g: 0.22 },
    chiptri: { osc: [{ t: 'triangle' }], env: [0.001, 0.05, 0.9, 0.03], g: 0.8 },
    acid: { osc: [{ t: 'sawtooth' }], filter: ['lowpass', 380, 13, 3200, 0.16], env: [0.003, 0.18, 0.4, 0.06], g: 0.5 },
    bass: { osc: [{ t: 'sine' }, { t: 'triangle', g: 0.5 }], env: [0.005, 0.3, 0.6, 0.1], g: 0.9 },
    synthbass: { osc: [{ t: 'sawtooth' }, { t: 'square', r: 0.5, g: 0.4 }], filter: ['lowpass', 500, 4, 2400, 0.14], env: [0.004, 0.2, 0.6, 0.08], g: 0.55 },
    upright: { osc: [{ t: 'triangle' }, { t: 'sine', g: 0.6 }], filter: ['lowpass', 800, 1, 2000, 0.08], env: [0.004, 0.55, 0.15, 0.1], g: 1 },
    subbass: { osc: [{ t: 'sine' }], env: [0.01, 0.3, 0.8, 0.2], g: 1 },
    theremin: { osc: [{ t: 'sine' }, { t: 'triangle', g: 0.15 }], env: [0.15, 0.2, 0.9, 0.3], vib: [6.2, 22, 0.05], glide: [0.94, 0.15], g: 0.55 },
  };

  /* ---------- styles ---------- */
  // Pattern chars: drums x=accent o=soft; bass digits = chord tone (0 root,1 3rd,2 5th,3 octave,4 7th);
  // chords/arp x = hit; lead rhythm x=note -=tie .=rest
  const S16 = '................';
  const STYLES = {
    synthwave: { steps: 16, prog: [0, 5, 2, 6], drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.' },
      bass: ['synthbass', -2, '0.0.0.0.0.0.0.0.'], chords: ['pad', 0, 'x...............'], arp: ['pluck', 1, 'xxxxxxxxxxxxxxxx', 'updown', 0.25],
      lead: ['synthlead', 1, ['x-------x---x---', 'x---x---x-x-x---', 'x-x-x---x-------'], 0.45], fx: { rev: 0.35, delay: 0.3 } },
    rockabilly: { steps: 16, swing: 0.18, prog: [0, 0, 3, 4], drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
      bass: ['upright', -2, '0...1...2...1...'], chords: ['pluck', 0, '..x...x...x...x.'], lead: ['organ', 1, ['x.x.x---x.x.x---', 'x-x-x-x-x---....', 'x.xxx.x.x---x...'], 0.4], fx: { rev: 0.2 } },
    egypt: { steps: 16, prog: [0, 0, 1, 0], drums: { dum: 'x.....x...x.....', tek: '...x.x...x.x.x.x', shaker: 'o.o.o.o.o.o.o.o.' },
      bass: ['bass', -2, '0.......0...2...'], drone: ['warmpad', -1], lead: ['oud', 1, ['xxx-x---xxx-x---', 'x-xxx-x-x-x-x---', 'x.x.xxx-x-------'], 0.5], fx: { rev: 0.4 } },
    chinese: { steps: 16, prog: [0, 3, 1, 0], drums: { wood: '..x...x...x.x...', tomL: 'o.......o.......' }, gong: true,
      bass: ['bass', -2, '0.......2.......'], arp: ['guzheng', 0, '..x.x..x..x.x...', 'updown', 0.4], lead: ['flute', 1, ['x---x-x-x-------', 'x-x-x---x-x-x---', 'x-------x-x-x-x-'], 0.45], fx: { rev: 0.45 } },
    kawaii: { steps: 16, prog: [0, 4, 5, 3], drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..o...o...o...o.' },
      bass: ['synthbass', -2, '0.0...0.3.0...0.'], chords: ['pluck', 0, 'x..x..x...x..x..'], lead: ['celesta', 1, ['x.x.x.x.x---x...', 'x-x-x.x.x.x.x---', 'xx.xx.x.x---....'], 0.5], fx: { rev: 0.25 } },
    ambient: { steps: 16, prog: [0, 1, 0, 4], drums: { shaker: '..o...o...o...o.' }, wind: true,
      bass: ['subbass', -2, '0...............'], chords: ['pad', 0, 'x...............'], arp: ['bell', 1, 'x.....x.....x...', 'random', 0.3], lead: ['flute', 1, ['x-------x-------', 'x---x-----------'], 0.35], fx: { rev: 0.6, delay: 0.3 } },
    space: { steps: 16, prog: [0, 5, 3, 4], drums: { kick: 'x.........x.....', snare: '........x.......', hat: '..o...o...o...o.' }, wind: true,
      bass: ['synthbass', -2, '0.......0.......'], chords: ['pad', 0, 'x...............'], arp: ['pluck', 1, 'x.x.x.x.x.x.x.x.', 'updown', 0.25], lead: ['bell', 1, ['x-------x---x---', 'x---x---x-------'], 0.35], fx: { rev: 0.55, delay: 0.35 } },
    epic: { steps: 16, prog: [0, 5, 6, 0], drums: { taiko: 'x.....x...x.....', tomM: '....o.......o.o.', crash: 'x' + S16.slice(1) }, crashBar0: true,
      bass: ['bass', -2, '0.......0...0...'], chords: ['strings', -1, 'x...............'], pad2: ['choir', 0], lead: ['brass', 0, ['x-------x---x---', 'x-----x-x-------', 'x---x---x---x---'], 0.45], fx: { rev: 0.5 } },
    japanese: { steps: 16, prog: [0, 0, 3, 2], drums: { wood: '........x.......', taiko: 'o...............' },
      bass: ['bass', -2, '0...............'], arp: ['koto', 0, 'x..x..x.x..x..x.', 'updown', 0.45], lead: ['flute', 1, ['x-------x---x---', 'x-----x-x-------'], 0.4], fx: { rev: 0.5 } },
    western: { steps: 16, swing: 0.3, prog: [0, 3, 0, 4], chordScale: 'mixolydian', drums: { kick: 'x.......x.......', brush: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.' },
      bass: ['upright', -2, '0...2...0...2...'], chords: ['pluck', 0, '..x...x...x...x.'], lead: ['whistle', 2, ['x---x-x-x-------', 'x-x-x---x---x---', 'x-------x.x.x---'], 0.35], fx: { rev: 0.4 } },
    tribal: { steps: 16, prog: [0, 3, 4, 0], drums: { conga: 'x..x..x...x.x...', bongo: '..o...o.o..o..o.', shaker: 'oooooooooooooooo', tomL: 'x.......x.......' },
      bass: ['bass', -2, '0..0..2...0.....'], arp: ['marimba', 0, 'x.xx.x.xx.x.x.x.', 'random', 0.5], lead: ['flute', 1, ['x---x-x-x-------', 'x-x-x-x-x---x---'], 0.35], fx: { rev: 0.3 } },
    mariachi: { steps: 12, prog: [0, 4, 4, 0], drums: { tamb: '....o...o...' },
      bass: ['upright', -2, '0...........'], bassAlt: '2...........', chords: ['pluck', 0, '....x...x...'], lead: ['trumpet', 1, ['x-x-x-x-x---', 'x---x-x-x-x-', 'x-----x-x---'], 0.4], fx: { rev: 0.3 } },
    musicbox: { steps: 12, prog: [0, 3, 4, 0], drums: {},
      bass: ['harp', -1, '0...2...2...'], lead: ['musicbox', 2, ['x---x---x---', 'x-x-x---x---', 'x-----x-x-x-'], 0.5], arp: ['celesta', 1, '..x...x...x.', 'up', 0.2], fx: { rev: 0.55 } },
    shanty: { steps: 12, beat: 6, prog: [0, 6, 0, 4], drums: { stomp: 'x.....x.....', clap: '......x.....', tamb: '...o.....o..' },
      bass: ['bass', -2, '0.....2.....'], chords: ['accordion', 0, 'x..x.xx..x.x'], lead: ['whistle', 1, ['x-xx-xx-----', 'x--x--x-xx-x', 'x-----x--x--'], 0.35], fx: { rev: 0.3 } },
    fairy: { steps: 16, prog: [0, 1, 0, 4], drums: { tri: '....x.......x...', shaker: 'o.o.o.o.o.o.o.o.' },
      bass: ['harp', -2, '0.......2.......'], chords: ['warmpad', 0, 'x...............'], arp: ['harp', 0, 'x.x.x.x.x.x.x.x.', 'updown', 0.35], lead: ['celesta', 1, ['x---x-x-x-------', 'x-x-x-x-x---x---'], 0.4], fx: { rev: 0.55 } },
    spooky: { steps: 16, prog: [0, 5, 3, 4], drums: { kick: 'x..x............', rim: '....x.......x...', hat: '......o.......o.' },
      bass: ['bass', -2, '0..0..0.3..0..1.'], chords: ['organ', -1, 'x.......x.......'], lead: ['theremin', 1, ['x-------x-------', 'x---x---x-------'], 0.4], fx: { rev: 0.55 } },
    bluegrass: { steps: 16, prog: [0, 3, 0, 4], drums: { kick: 'x.......x.......', brush: '....x.......x...', shaker: 'o.o.o.o.o.o.o.o.' },
      bass: ['upright', -2, '0...2...0...2...'], arp: ['banjo', 0, 'xxxxxxxxxxxxxxxx', 'roll', 0.35], lead: ['fiddle', 1, ['x-x-x-x-x---x---', 'xxx-x-x-x-x-x---'], 0.35], fx: { rev: 0.2 } },
    celtic: { steps: 12, beat: 6, prog: [0, 6, 0, 4], drums: { bodhran: 'x..o.ox..o.o' },
      bass: ['bass', -2, '0.....2.....'], chords: ['pluck', 0, 'x..x..x..x..'], lead: ['whistle', 2, ['xxxxxxx--xxx', 'x--xxxx--x--', 'xxxx-xxxxx--'], 0.33], fx: { rev: 0.35 } },
    techno: { steps: 16, prog: [0, 0, 1, 0], drums: { kick: 'x...x...x...x...', ohat: '..x...x...x...x.', hat: 'oooooooooooooooo', clap: '....x.......x...' },
      bass: ['acid', -2, '0.00.0.30.0.0.1.'], chords: ['synthlead', 0, '...x.....x......'], lead: ['bell', 1, ['x-------........', 'x---x-----------'], 0.25], fx: { rev: 0.3, delay: 0.3 } },
    lounge: { steps: 16, swing: 0.32, prog: [0, 3, 0, 4], drums: { ride: 'x...x..xx...x..x', kick: 'o.......o.......', rim: '....o.......o...' },
      bass: ['upright', -2, 'walk'], chords: ['epiano', 0, '..x.....x..x....', 4], lead: ['sax', 0, ['x-x-x---x-x-x---', 'x---x.x.x-------', 'x.x.x.x.x---x---'], 0.4], fx: { rev: 0.3 } },
    orchestral: { steps: 16, prog: [0, 5, 2, 6], drums: { timp: 'x.......x...x...', crash: 'x' + S16.slice(1) }, crashBar0: true,
      bass: ['strings', -2, '0.......0.......'], chords: ['strings', 0, 'x.......x.......'], arp: ['harp', 0, 'x.x.x.x.x.x.x.x.', 'up', 0.3], lead: ['brass', 1, ['x-------x---x---', 'x-----x-x-x-x---'], 0.4], fx: { rev: 0.55 } },
    aztec: { steps: 16, prog: [0, 3, 2, 0], drums: { tomL: 'x..x....x..x....', tomH: '....x.x.....x.x.', shaker: 'x.x.x.x.x.x.x.x.', wood: '.......x.......x' },
      bass: ['bass', -2, '0...0...2...0...'], arp: ['pluck', -1, 'x..x..x.x..x..x.', 'random', 0.35], lead: ['flute', 1, ['x-x-x---x-x-x---', 'x---x-x-x-------'], 0.4], fx: { rev: 0.4 } },
    disco: { steps: 16, prog: [0, 3, 0, 3], drums: { kick: 'x...x...x...x...', ohat: '..x...x...x...x.', clap: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.' },
      bass: ['synthbass', -2, '0.3.0.3.0.3.0.3.'], chords: ['strings', 0, 'x.....x...x.....'], arp: ['pluck', 0, 'x.x.x.x.x.x.x.x.', 'up', 0.2], lead: ['strings', 1, ['x-------x-x-x---', 'x---x---x---x---'], 0.35], fx: { rev: 0.3 } },
    lofi: { steps: 16, swing: 0.22, prog: [3, 2, 1, 4], drums: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.' }, crackle: true,
      bass: ['bass', -2, '0.......2...1...'], chords: ['epiano', 0, 'x.......x.......', 4], lead: ['bell', 1, ['x---x-------x---', 'x-----x---------'], 0.25], fx: { rev: 0.35, lofi: true } },
    swing: { steps: 16, swing: 0.33, prog: [0, 5, 1, 4], drums: { ride: 'x...x..xx...x..x', kick: 'o.......o.......', snare: '......o.......o.' },
      bass: ['upright', -2, 'walk'], chords: ['brass', 0, '..x.......x.....', 4], lead: ['trumpet', 1, ['x-x-x---x-x-x---', 'x.x.x.x.x---x---', 'x---x-x-x-x-x---'], 0.35], fx: { rev: 0.3 } },
    zen: { steps: 16, prog: [0, 3, 1, 0], drums: { wood: '....o.......o...', tomL: 'o...............' },
      bass: ['bass', -2, '0...............'], chords: ['warmpad', 0, 'x...............'], arp: ['guzheng', 0, 'x...x..x....x...', 'random', 0.4], lead: ['erhu', 1, ['x-------x---x---', 'x---x-x-x-------'], 0.4], fx: { rev: 0.55 } },
    adventure: { steps: 16, prog: [0, 5, 6, 0], drums: { tomL: 'x..x..x...x..x..', taiko: 'x.......x.......', snare: '....x.......x...' },
      bass: ['strings', -1, '0.0.0.0.0.0.0.0.'], chords: ['brass', 0, 'x.......x.......'], lead: ['brass', 1, ['x-----x-x-------', 'x---x---x-x-x---'], 0.4], fx: { rev: 0.4 } },
    chiptune: { steps: 16, prog: [0, 5, 3, 4], drums: { ckick: 'x.......x.x.....', csnare: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.' },
      bass: ['chiptri', -2, '0.0.3.0.0.0.3.0.'], arp: ['chip', 1, 'xxxxxxxxxxxxxxxx', 'up', 0.12], lead: ['chip', 1, ['x.x.x-x.x.x.x---', 'xxx.x.x.x---x...', 'x-x-x-x-x.x.x---'], 0.35], fx: { rev: 0.15 } },
    christmas: { steps: 16, prog: [0, 3, 4, 0], drums: { sleigh: 'x.x.x.x.x.x.x.x.', kick: 'x.......x.......', snare: '....o.......o...' },
      bass: ['bass', -2, '0...2...0...2...'], chords: ['celesta', 0, 'x...x...x...x...'], lead: ['bell', 1, ['x-x-x---x-x-x---', 'x-x-x-x-x-------', 'x---x---x-x-x---'], 0.45], fx: { rev: 0.4 } },
    darkdrums: { steps: 16, prog: [0, 1, 0, 6], drums: { kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', tomL: '..............oo' },
      bass: ['synthbass', -2, '0.......0..0....'], chords: ['pad', -1, 'x...............'], lead: ['synthlead', 0, ['x-------x---x---', 'x-----x-x-------'], 0.3], fx: { rev: 0.4 } },
    bossa: { steps: 16, prog: [1, 4, 0, 5], drums: { rim: 'x..x..x...x..x..', shaker: 'oooooooooooooooo', kick: 'x..x....x..x....' },
      bass: ['upright', -2, '0.....2.0.....2.'], chords: ['epiano', 0, 'x..x..x...x..x..', 4], lead: ['flute', 1, ['x-x-x---x-x-x---', 'x---x---x-x-----'], 0.35], fx: { rev: 0.35 } },
  };

  ['synthwave', 'techno', 'disco', 'kawaii', 'darkdrums', 'space', 'lofi', 'chiptune'].forEach((s) => { STYLES[s].sidechain = true; });

  /* ---------- engine ---------- */
  const A = {
    ctx: null, ready: false,
    musicOn: true, sfxOn: true, ambOn: true,
    machine: null,
  };
  const MUSIC_VOL = 0.5, SFX_VOL = 0.95, AMB_VOL = 0.45;
  const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);
  A.mobile = MOBILE;
  A.vol = { music: 0.8, sfx: 1, amb: 0.8 };
  // voice budget: every scheduled voice is booked as [start, end) with a cost; when the
  // overlap at its start would exceed the budget, low-priority voices are skipped instead
  // of overloading the audio thread (which causes crackles and dropouts on phones)
  const LIMIT = MOBILE ? 64 : 200;
  let booked = [];
  function allow(t, dur, cost, prio) {
    if (!A.ctx) return false;
    const nowT = A.ctx.currentTime;
    if (booked.length > 64) booked = booked.filter((b) => b.e > nowT);
    let load = 0;
    for (const b of booked) if (b.s <= t && b.e > t) load += b.c;
    const cap = prio >= 2 ? LIMIT * 1.4 : prio === 1 ? LIMIT : LIMIT * 0.55;
    if (load + cost > cap) return false;
    booked.push({ s: t, e: t + dur, c: cost });
    return true;
  }

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try { ctx = new AC({ latencyHint: MOBILE ? 'playback' : 'interactive' }); } catch (e) { ctx = new AC(); }
    A.ctx = ctx;
    // master chain: tone shaping -> glue compressor -> brickwall-ish limiter
    const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 110; low.gain.value = 2.5;
    const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 7500; high.gain.value = 2;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.25; glue.knee.value = 8;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; lim.knee.value = 0;
    A.master = ctx.createGain(); A.master.gain.value = 0.9;
    A.master.connect(low); low.connect(high); high.connect(glue); glue.connect(lim); lim.connect(ctx.destination);

    A.musicBus = ctx.createGain(); A.musicBus.gain.value = A.musicOn ? MUSIC_VOL * A.vol.music * A.vol.music : 0;
    A.musicDuck = ctx.createGain();
    A.musicFilter = ctx.createBiquadFilter(); A.musicFilter.type = 'lowpass'; A.musicFilter.frequency.value = 20000; A.musicFilter.Q.value = 0.8;
    const sat = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = (i / 1023.5) - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    sat.curve = curve; sat.oversample = '2x';
    A.musicBus.connect(A.musicDuck); A.musicDuck.connect(sat); sat.connect(A.musicFilter); A.musicFilter.connect(A.master);
    // stereo chorus on the music bus (two modulated short delays panned apart)
    (MOBILE ? [] : [[-0.8, 0.011, 0.31], [0.8, 0.017, 0.23]]).forEach(([pan, base, rate]) => {
      const d = ctx.createDelay(0.05); d.delayTime.value = base;
      const l = ctx.createOscillator(); l.frequency.value = rate;
      const lg = ctx.createGain(); lg.gain.value = 0.0035; l.connect(lg); lg.connect(d.delayTime); l.start();
      const g = ctx.createGain(); g.gain.value = 0.22;
      const p2 = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (p2.pan) p2.pan.value = pan;
      A.musicFilter.connect(d); d.connect(g); g.connect(p2); p2.connect(A.master);
    });
    A.scBus = ctx.createGain(); A.scBus.connect(A.musicBus); // sidechained layers (bass, chords, arps)
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = A.sfxOn ? SFX_VOL * A.vol.sfx * A.vol.sfx : 0; A.sfxBus.connect(A.master);
    A.ambBus = ctx.createGain(); A.ambBus.gain.value = A.ambOn ? AMB_VOL * A.vol.amb * A.vol.amb : 0; A.ambBus.connect(A.master);

    // reverbs: hall for music, plate for sfx, big room for ambience
    const mkRev = (secs, decay, pre, damp) => {
      const conv = ctx.createConvolver(); conv.buffer = impulse(ctx, secs, decay, damp);
      const d = ctx.createDelay(0.2); d.delayTime.value = pre;
      const send = ctx.createGain();
      send.connect(d); d.connect(conv);
      return { send, out: conv };
    };
    const hall = mkRev(2.8, 2.6, 0.025, 0.5);
    A.revSend = hall.send; hall.out.connect(A.musicFilter);
    const plate = mkRev(1.8, 3, 0.012, 0.3);
    A.sfxRev = plate.send; plate.out.connect(A.sfxBus);
    A.sfxRev.gain.value = 0.9;
    const room = mkRev(3.5, 2, 0.04, 0.6);
    A.ambRev = room.send; room.out.connect(A.ambBus);

    // stereo ping-pong delay for music
    const dl = ctx.createDelay(1.5), dr = ctx.createDelay(1.5), fb = ctx.createGain(), dlf = ctx.createBiquadFilter();
    dlf.type = 'lowpass'; dlf.frequency.value = 3500; fb.gain.value = 0.38;
    const merger = ctx.createChannelMerger(2);
    A.delaySend = ctx.createGain(); A.delaySend.gain.value = 0;
    A.delaySend.connect(dlf); dlf.connect(dl); dl.connect(dr); dr.connect(fb); fb.connect(dl);
    dl.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(A.musicFilter);
    A.dl = dl; A.dr = dr;

    A.noise = noiseBuf(ctx, 2);
    A.brown = brownBuf(ctx, 4);
    prerender(ctx);
    A.ready = true;
    A.startAmbience();
    if (A.pending) A.playMusic(A.pending);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state === 'suspended') ctx.resume(); });
  };

  // render frequently used percussive sounds once, then play them as cheap buffers
  function prerender(ctx) {
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OAC) return;
    const sr = ctx.sampleRate;
    const render = (secs, build) => {
      try {
        const oc = new OAC(1, Math.ceil(sr * secs), sr);
        build(oc);
        const p = oc.startRendering();
        return p && p.then ? p : null;
      } catch (e) { return null; }
    };
    const coin = (f0) => (oc) => {
      const out = oc.createGain(); out.gain.value = 0.32; out.connect(oc.destination);
      COIN_MODES.forEach(([r, a, d]) => {
        const o = oc.createOscillator(); o.frequency.value = Math.min(18000, f0 * r * (1 + (Math.random() - 0.5) * 0.012));
        const g = oc.createGain();
        g.gain.setValueAtTime(0.0001, 0); g.gain.linearRampToValueAtTime(a, 0.0015);
        g.gain.exponentialRampToValueAtTime(0.0001, d * (0.8 + Math.random() * 0.5));
        o.connect(g); g.connect(out); o.start(0); o.stop(d + 0.1);
      });
    };
    const metalB = (dur, hp) => (oc) => {
      const g = oc.createGain();
      g.gain.setValueAtTime(0.0001, 0); g.gain.linearRampToValueAtTime(1, 0.001); g.gain.exponentialRampToValueAtTime(0.0001, dur);
      const bp = oc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8;
      const h = oc.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
      bp.connect(h); h.connect(g); g.connect(oc.destination);
      [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => { const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(0); o.stop(dur); });
    };
    const coins = [];
    for (let i = 0; i < 8; i++) { const p = render(0.32, coin(1900 + i * 230)); if (p) p.then((b) => coins.push(b)).catch(() => {}); }
    A.coinBufs = coins;
    A.metalBufs = {};
    [['s', 0.08, 8000], ['m', 0.35, 7000], ['l', 1.9, 4500]].forEach(([k, d, hp]) => {
      const p = render(d + 0.05, metalB(d, hp));
      if (p) p.then((b) => { A.metalBufs[k] = b; }).catch(() => {});
    });
  }
  function playBuf(buf, t, vel, dest, rate, pan, dur, rev) {
    const ctx = A.ctx;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate || 1;
    const g = ctx.createGain(); g.gain.value = vel;
    if (dur) { g.gain.setValueAtTime(vel, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    src.connect(g);
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); } else g.connect(dest);
    if (rev) { const sg = ctx.createGain(); sg.gain.value = rev; g.connect(sg); sg.connect(A.revSend); }
    src.start(t);
    if (dur) src.stop(t + dur + 0.02);
  }

  function impulse(ctx, secs, decay, damp) {
    const len = Math.floor(ctx.sampleRate * secs);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const a = 1 - damp * k; // high frequencies die faster
        lp = lp * (1 - a) + (Math.random() * 2 - 1) * a;
        d[i] = lp * Math.pow(1 - k, decay);
      }
      // early reflections
      for (let e = 0; e < 8; e++) {
        const at = Math.floor(ctx.sampleRate * (0.008 + Math.random() * 0.06));
        if (at < len) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - e * 0.05);
      }
    }
    return b;
  }
  function noiseBuf(ctx, secs) {
    const len = Math.floor(ctx.sampleRate * secs);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function brownBuf(ctx, secs) {
    const len = Math.floor(ctx.sampleRate * secs);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }

  /* ---------- voice ---------- */
  function play(instName, freq, t, dur, vel, dest, opt) {
    const ctx = A.ctx;
    const sp = INST[instName] || INST.sine;
    const cost = sp.osc.length + (sp.fm ? 1 : 0) + (sp.vib ? 1 : 0) + (sp.breath ? 1 : 0);
    const prio = opt && opt.prio != null ? opt.prio : dest === A.sfxBus ? 1 : 2;
    if (!allow(t, dur + sp.env[3] + sp.env[0], cost, prio)) return;
    const out = ctx.createGain();
    const [a, d, s, r] = sp.env;
    const peak = vel * (sp.g || 0.6);
    const g = out.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.setTargetAtTime(peak * s, t + a, d / 3 + 0.001);
    const end = t + Math.max(dur, a + 0.01);
    if (s > 0) g.setValueAtTime(peak * s, end);
    g.setTargetAtTime(0, s > 0 ? end : t + a + d, r / 3 + 0.001);
    const stopAt = (s > 0 ? end : t + a + d) + r + 0.1;
    let node = out;
    if (sp.filter) {
      const [type, f, q, from, time, rise] = sp.filter;
      const fl = ctx.createBiquadFilter();
      fl.type = type; fl.Q.value = q;
      if (from) {
        fl.frequency.setValueAtTime(from, t);
        if (rise) fl.frequency.linearRampToValueAtTime(f, t + time);
        else fl.frequency.setTargetAtTime(f, t, time / 2);
      } else fl.frequency.value = f;
      fl.connect(out);
      node = fl;
    }
    if (opt && opt.pan && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner(); pan.pan.value = opt.pan;
      out.connect(pan); pan.connect(dest);
    } else out.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; out.connect(sg); sg.connect(opt.revDest || A.revSend); }
    if (opt && opt.dly) { const dg = ctx.createGain(); dg.gain.value = opt.dly === true ? 1 : opt.dly; out.connect(dg); dg.connect(A.delaySend); }
    let vibG = null;
    if (sp.vib) {
      const [rate, depth, delay] = sp.vib;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(depth, t + delay + 0.15);
      lfo.connect(vibG); lfo.start(t); lfo.stop(stopAt);
    }
    let fmG = null;
    if (sp.fm) {
      const [ratio, index, decay] = sp.fm;
      const mod = ctx.createOscillator(); mod.frequency.value = Math.min(18000, freq * ratio);
      fmG = ctx.createGain();
      fmG.gain.setValueAtTime(freq * index, t);
      fmG.gain.setTargetAtTime(0, t, decay / 3);
      mod.connect(fmG); mod.start(t); mod.stop(stopAt);
    }
    for (const o of sp.osc) {
      const osc = ctx.createOscillator();
      osc.type = o.t;
      const f = Math.min(18000, freq * (o.r || 1));
      if (sp.bend) { osc.frequency.setValueAtTime(f * sp.bend[0], t); osc.frequency.setTargetAtTime(f, t, sp.bend[1]); }
      else if (sp.glide) { osc.frequency.setValueAtTime(f * sp.glide[0], t); osc.frequency.setTargetAtTime(f, t, sp.glide[1]); }
      else osc.frequency.setValueAtTime(f, t);
      osc.detune.value = (o.d || 0) + (opt && opt.detune || 0);
      if (vibG) vibG.connect(osc.detune);
      if (fmG) fmG.connect(osc.frequency);
      let on = osc;
      if (o.g) { const og = ctx.createGain(); og.gain.value = o.g; osc.connect(og); on = og; }
      on.connect(node);
      osc.start(t); osc.stop(stopAt);
    }
    if (sp.breath) {
      const n = ctx.createBufferSource(); n.buffer = A.noise;
      const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = Math.min(12000, freq * 2); bf.Q.value = 1;
      const ng = ctx.createGain(); ng.gain.value = sp.breath * 4;
      n.connect(bf); bf.connect(ng); ng.connect(node);
      n.start(t, Math.random()); n.stop(stopAt);
    }
  }
  // wide stereo pair for pads/strings/chords
  function playWide(inst, freq, t, dur, vel, dest, opt) {
    play(inst, freq, t, dur, vel * 0.62, dest, Object.assign({}, opt, { pan: -0.55, detune: -7 }));
    play(inst, freq, t + 0.004, dur, vel * 0.62, dest, Object.assign({}, opt, { pan: 0.55, detune: 7 }));
  }

  function noise(t, dur, vel, dest, ftype, f, q, opt) {
    const ctx = A.ctx;
    if (!allow(t, dur, 1, opt && opt.prio != null ? opt.prio : dest === A.sfxBus ? 1 : 2)) return;
    const n = ctx.createBufferSource(); n.buffer = A.noise;
    const fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q || 1;
    if (opt && opt.sweep) fl.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + (opt && opt.attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = g;
    if (opt && opt.hp) { const h = A.ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = opt.hp; g.connect(h); last = h; }
    n.connect(fl); fl.connect(g); last.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; last.connect(sg); sg.connect(opt.revDest || A.revSend); }
    n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  }

  function tone(type, f0, f1, t, dur, vel, dest, opt) {
    const ctx = A.ctx;
    if (!allow(t, dur, 1, opt && opt.prio != null ? opt.prio : dest === A.sfxBus ? 1 : 2)) return;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * (opt && opt.bendT || 1));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + (opt && opt.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (opt && opt.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = opt.pan; g.connect(p); p.connect(dest); } else g.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; g.connect(sg); sg.connect(opt.revDest || A.revSend); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  // 808-style metallic source: six detuned squares
  function metal(t, dur, vel, dest, hp, opt) {
    const ctx = A.ctx;
    const mb = A.metalBufs && A.metalBufs[dur <= 0.1 ? 's' : dur <= 0.6 ? 'm' : 'l'];
    if (mb) {
      if (!allow(t, dur, 1, dest === A.sfxBus ? 1 : 2)) return;
      playBuf(mb, t, vel, dest, (opt && opt.pitch) || 1, opt && opt.pan, dur, opt && opt.rev);
      return;
    }
    if (!allow(t, dur, 6, dest === A.sfxBus ? 1 : 2)) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8;
    const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp || 7000;
    bp.connect(h); h.connect(g);
    if (opt && opt.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = opt.pan; g.connect(p); p.connect(dest); } else g.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; g.connect(sg); sg.connect(A.revSend); }
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * (opt && opt.pitch || 1);
      o.connect(bp); o.start(t); o.stop(t + dur + 0.02);
    });
  }

  /* ---------- drums ---------- */
  const DRUM = {
    kick(t, v, d) {
      tone('sine', 160, 45, t, 0.38, v * 1.15, d, { bendT: 0.28 });
      tone('triangle', 90, 50, t, 0.18, v * 0.4, d);
      noise(t, 0.012, v * 0.35, d, 'highpass', 3000);
    },
    ckick(t, v, d) { tone('square', 220, 40, t, 0.12, v * 0.32, d); },
    snare(t, v, d) {
      tone('triangle', 240, 170, t, 0.12, v * 0.45, d);
      tone('sine', 330, 250, t, 0.08, v * 0.25, d);
      noise(t, 0.22, v * 0.55, d, 'bandpass', 2200, 0.7, { rev: 0.35, hp: 700 });
    },
    csnare(t, v, d) { noise(t, 0.1, v * 0.4, d, 'highpass', 1500); tone('square', 180, 120, t, 0.05, v * 0.12, d); },
    brush(t, v, d) { noise(t, 0.18, v * 0.22, d, 'bandpass', 4000, 0.5, { attack: 0.03 }); },
    clap(t, v, d) {
      for (let i = 0; i < 4; i++) noise(t + i * 0.009, 0.05, v * 0.45, d, 'bandpass', 1400, 1.4);
      noise(t + 0.03, 0.25, v * 0.32, d, 'bandpass', 1300, 1, { rev: 0.5 });
    },
    hat(t, v, d) { metal(t, 0.05, v * 0.12, d, 8000, { pan: 0.25 }); },
    chat(t, v, d) { noise(t, 0.03, v * 0.15, d, 'highpass', 6000); },
    ohat(t, v, d) { metal(t, 0.28, v * 0.1, d, 7000, { pan: 0.25 }); },
    ride(t, v, d) { metal(t, 0.55, v * 0.06, d, 5000, { pan: -0.3, pitch: 1.3 }); tone('sine', 5200, 5100, t, 0.4, v * 0.025, d); },
    crash(t, v, d) { metal(t, 1.8, v * 0.12, d, 4000, { rev: 0.5 }); noise(t, 1.6, v * 0.16, d, 'highpass', 5000, 0.5, { rev: 0.5 }); },
    rim(t, v, d) { tone('square', 1700, 1700, t, 0.025, v * 0.12, d); noise(t, 0.02, v * 0.2, d, 'bandpass', 3000, 3); },
    tomL(t, v, d) { tone('sine', 140, 80, t, 0.38, v * 0.8, d); noise(t, 0.02, v * 0.1, d, 'lowpass', 1500); },
    tomM(t, v, d) { tone('sine', 200, 120, t, 0.3, v * 0.7, d, { rev: 0.3 }); },
    tomH(t, v, d) { tone('sine', 300, 190, t, 0.22, v * 0.6, d); },
    taiko(t, v, d) { tone('sine', 115, 48, t, 0.8, v * 1.1, d, { rev: 0.5 }); noise(t, 0.09, v * 0.3, d, 'lowpass', 700); },
    timp(t, v, d) { tone('sine', 98, 90, t, 1, v * 0.9, d, { rev: 0.6 }); tone('sine', 196, 180, t, 0.45, v * 0.2, d); noise(t, 0.05, v * 0.15, d, 'lowpass', 900); },
    conga(t, v, d) { tone('sine', 330, 260, t, 0.18, v * 0.6, d, { pan: -0.3 }); },
    bongo(t, v, d) { tone('sine', 520, 430, t, 0.1, v * 0.5, d, { pan: 0.35 }); },
    shaker(t, v, d) { noise(t, 0.06, v * 0.11, d, 'highpass', 6000, 1, { attack: 0.015 }); },
    tamb(t, v, d) { metal(t, 0.14, v * 0.08, d, 8000, { pitch: 1.6, pan: 0.3 }); },
    wood(t, v, d) { tone('sine', 1150, 1100, t, 0.06, v * 0.5, d, { rev: 0.3 }); },
    dum(t, v, d) { tone('sine', 120, 70, t, 0.35, v * 0.9, d); },
    tek(t, v, d) { noise(t, 0.05, v * 0.35, d, 'bandpass', 2600, 2); tone('sine', 700, 600, t, 0.04, v * 0.2, d); },
    bodhran(t, v, d) { tone('sine', 110, 65, t, 0.22, v * 0.8, d); noise(t, 0.04, v * 0.2, d, 'lowpass', 900); },
    stomp(t, v, d) { tone('sine', 90, 45, t, 0.25, v, d); noise(t, 0.06, v * 0.35, d, 'lowpass', 500); },
    tri(t, v, d) { tone('sine', 4200, 4200, t, 0.9, v * 0.06, d, { rev: 0.4 }); tone('sine', 6100, 6100, t, 0.6, v * 0.03, d); },
    sleigh(t, v, d) { metal(t, 0.12, v * 0.09, d, 7000, { pitch: 2.2, pan: (Math.random() - 0.5) * 0.6 }); },
    cowbell(t, v, d) { tone('square', 540, 540, t, 0.2, v * 0.1, d); tone('square', 800, 800, t, 0.2, v * 0.1, d); },
  };

  /* ---------- music sequencer ---------- */
  function scaleNote(root0, sc, deg) {
    const n = sc.length;
    const o = Math.floor(deg / n);
    return root0 + 12 * o + sc[((deg % n) + n) % n];
  }

  function buildSong(machine) {
    const st = STYLES[machine.music.style] || STYLES.bossa;
    const mu = machine.music;
    const rng = root.U.mulberry32(root.U.hashStr(machine.id + mu.style));
    const sc = SCALES[mu.scale] || SCALES.major;
    const csc = SCALES[st.chordScale] || sc;
    const bars = st.prog.length;
    const melodies = [0, 1].map(() => {
      const mel = [];
      let prev = sc.length + 2;
      for (let b = 0; b < bars; b++) {
        const rh = b === 2 && mel[0] ? mel[0].rh : st.lead ? st.lead[2][Math.floor(rng() * st.lead[2].length)] : '';
        const notes = [];
        const chordDeg = st.prog[b];
        for (let i = 0; i < rh.length; i++) {
          if (rh[i] !== 'x') continue;
          let len = 1;
          while (i + len < rh.length && rh[i + len] === '-') len++;
          let deg;
          if (i % (st.steps === 12 ? 6 : 4) === 0) {
            const cands = [0, 2, 4].map((k) => chordDeg + k).flatMap((d) => [d, d + sc.length, d - sc.length]);
            cands.sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev) + (rng() - 0.5) * 2);
            deg = cands[0];
          } else {
            const steps = [-2, -1, -1, 1, 1, 2, 0, 3, -3];
            deg = prev + steps[Math.floor(rng() * steps.length)];
          }
          deg = Math.max(0, Math.min(sc.length * 2 + 1, deg));
          if (b === bars - 1 && i >= rh.lastIndexOf('x')) deg = sc.length;
          notes.push({ step: i, len, deg, vel: 0.85 + rng() * 0.3 });
          prev = deg;
        }
        mel.push({ rh, notes });
      }
      return mel;
    });
    return { st, sc, csc, bars, melodies, root: mu.root };
  }

  const SEQ = { timer: null, song: null, nextTime: 0, step: 0, bar: 0, loop: 0, arpIdx: 0, nodes: [] };

  A.playMusic = function (machine) {
    A.pending = machine;
    if (!A.ready) return;
    A.stopMusic();
    const song = buildSong(machine);
    SEQ.song = song;
    SEQ.step = 0; SEQ.bar = 0; SEQ.loop = 0; SEQ.arpIdx = 0;
    const now = A.ctx.currentTime;
    SEQ.nextTime = now + 0.15;
    A.revSend.gain.setValueAtTime(song.st.fx.rev || 0.3, now);
    A.delaySend.gain.setValueAtTime((song.st.fx.delay || 0) * 0.8, now);
    const beatDur = 60 / (machine.music.bpm || 100);
    SEQ.stepDur = beatDur / (song.st.beat || 4);
    A.dl.delayTime.setValueAtTime(Math.min(1.4, SEQ.stepDur * 3), now);
    A.dr.delayTime.setValueAtTime(Math.min(1.4, SEQ.stepDur * 3), now);
    A.musicFilter.frequency.cancelScheduledValues(now);
    A.musicFilter.frequency.setValueAtTime(song.st.fx.lofi ? 3600 : 20000, now);
    // gentle fade-in
    A.musicDuck.gain.cancelScheduledValues(now);
    A.musicDuck.gain.setValueAtTime(0, now);
    A.musicDuck.gain.linearRampToValueAtTime(A.ducked ? 0.25 : 1, now + 1.2);
    SEQ.timer = setInterval(schedule, 25);
    if (song.st.wind) startWind();
    if (song.st.crackle) startCrackle();
    if (song.st.drone) startDrone(song);
  };

  A.stopMusic = function () {
    if (SEQ.timer) clearInterval(SEQ.timer);
    SEQ.timer = null;
    for (const n of SEQ.nodes) { try { n.stop(); } catch (e) { /* */ } }
    SEQ.nodes = [];
  };

  function startWind() {
    const ctx = A.ctx;
    const n = ctx.createBufferSource(); n.buffer = A.brown; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency);
    const g = ctx.createGain(); g.gain.value = 0.1;
    n.connect(f); f.connect(g); g.connect(A.musicBus);
    n.start(); lfo.start();
    SEQ.nodes.push(n, lfo);
  }
  function startCrackle() {
    const ctx = A.ctx;
    const len = ctx.sampleRate * 3;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.01;
    const n = ctx.createBufferSource(); n.buffer = b; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.value = 0.3;
    n.connect(f); f.connect(g); g.connect(A.musicBus); n.start();
    SEQ.nodes.push(n);
  }
  function startDrone(song) {
    const ctx = A.ctx;
    for (const iv of [0, 7]) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(song.root - 12 + iv); o.detune.value = det;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
        const g = ctx.createGain(); g.gain.value = 0.02;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        o.connect(f); f.connect(g);
        if (p) { p.pan.value = det < 0 ? -0.5 : 0.5; g.connect(p); p.connect(A.musicBus); } else g.connect(A.musicBus);
        o.start();
        SEQ.nodes.push(o);
      }
    }
  }

  function schedule() {
    const ctx = A.ctx;
    if (!SEQ.song) return;
    if (SEQ.nextTime < ctx.currentTime - 0.3) SEQ.nextTime = ctx.currentTime + 0.05;
    while (SEQ.nextTime < ctx.currentTime + (MOBILE ? 0.35 : 0.15)) {
      playStep(SEQ.nextTime);
      let d = SEQ.stepDur;
      const sw = SEQ.song.st.swing || 0;
      if (sw) d = SEQ.step % 2 === 0 ? d * (1 + sw) : d * (1 - sw);
      SEQ.nextTime += d;
      SEQ.step++;
      if (SEQ.step >= SEQ.song.st.steps) {
        SEQ.step = 0; SEQ.bar++;
        if (SEQ.bar >= SEQ.song.bars) { SEQ.bar = 0; SEQ.loop++; }
      }
    }
  }

  function chordTones(song, deg, n) {
    const out = [];
    for (let k = 0; k < (n || 3); k++) out.push(scaleNote(song.root, song.csc, deg + k * 2));
    return out;
  }

  function playStep(t) {
    const song = SEQ.song, st = song.st;
    const s = SEQ.step, bar = SEQ.bar, loop = SEQ.loop;
    const bus = A.musicBus;
    const deg = st.prog[bar];
    const sd = SEQ.stepDur;
    const len = (pat, i) => { let k = 1; while (i + k < pat.length && pat[i + k] === '.') k++; return k; };
    const intro = loop === 0 && bar < 2;
    const breakdown = loop % 4 === 3; // every 4th pass: drums thin out, filter sweeps back up
    const lastBar = bar === song.bars - 1;
    const hasKit = /kick|snare|taiko|tom|dum|stomp|bodhran|timp|conga/.test(Object.keys(st.drums).join());
    const fillZone = hasKit && lastBar && s >= st.steps * 0.75 && loop % 2 === 1 && !breakdown;
    const hum = () => 0.85 + Math.random() * 0.25;

    if (s === 0 && bar === 0) {
      const now = t;
      if (breakdown) {
        A.musicFilter.frequency.setValueAtTime(st.fx.lofi ? 3600 : 20000, now);
        A.musicFilter.frequency.exponentialRampToValueAtTime(900, now + sd * st.steps * 0.5);
        A.musicFilter.frequency.exponentialRampToValueAtTime(st.fx.lofi ? 3600 : 18000, now + sd * st.steps * song.bars);
      }
    }
    // drums
    if (!intro || bar === 1) {
      for (const name in st.drums) {
        const p = st.drums[name];
        const ch = p[s % p.length];
        if (breakdown && /kick|snare|clap|taiko|tom|dum|stomp|timp|ckick|csnare|conga|bodhran/.test(name) && !(lastBar && s >= st.steps / 2)) continue;
        if (fillZone && /hat|ride|shaker/.test(name) === false && name !== 'crash') continue;
        if (ch === 'x' || ch === 'o') {
          if (name === 'crash' && !(bar === 0 && loop > 0)) continue;
          DRUM[name] && DRUM[name](t, (ch === 'x' ? 0.9 : 0.5) * hum(), bus);
          if (st.sidechain && (name === 'kick' || name === 'ckick')) sidechain(t, sd);
        }
      }
      if (fillZone) {
        const k = s - Math.floor(st.steps * 0.75);
        const tom = ['tomH', 'tomM', 'tomL', 'snare'][k % 4];
        const drum = /chip/.test(st.lead && st.lead[0]) ? DRUM.csnare : DRUM[st.drums.taiko ? 'taiko' : tom];
        drum(t, 0.55 + k * 0.08, bus);
        if (st.steps === 16) drum(t + sd / 2, 0.4 + k * 0.06, bus);
      }
      if (s === 0 && bar === 0 && loop > 0 && !st.drums.crash && !breakdown) DRUM.crash(t, 0.5, bus);
    }
    if (st.gong && s === 0 && bar === 0) gong(t, 0.3, bus);
    const sc = A.scBus;
    // bass
    if (st.bass && !(breakdown && bar < song.bars - 1)) {
      const [inst, oct, pat0] = st.bass;
      const pat = st.bassAlt && bar % 2 ? st.bassAlt : pat0;
      if (pat === 'walk') {
        if (s % 4 === 0) {
          const beat = s / 4;
          const nextDeg = st.prog[(bar + 1) % song.bars];
          const degs = [deg, deg + 2, deg + 4, nextDeg + 1];
          play(inst, mtof(scaleNote(song.root + oct * 12, song.csc, degs[beat] || deg)), t, sd * 3.5, 0.75 * hum(), sc);
        }
      } else {
        const ch = pat[s];
        if (ch && ch !== '.') {
          const k = +ch;
          const tones = chordTones(song, deg, 4);
          let n = k === 3 ? tones[0] + 12 : k === 4 ? tones[3] : tones[k];
          n += oct * 12;
          play(inst, mtof(n), t, sd * len(pat, s) * 0.9, 0.78 * hum(), sc);
        }
      }
    }
    // chords (stereo)
    if (st.chords) {
      const [inst, oct, pat, nt] = st.chords;
      if (pat[s] === 'x') {
        const tones = chordTones(song, deg, nt || 3);
        const d = sd * len(pat, s) * 0.95;
        const wide = /pad|strings|warmpad|choir|organ|accordion/.test(inst);
        tones.forEach((n, i) => (wide ? playWide : play)(inst, mtof(n + oct * 12), t + i * 0.008, d, 0.3 * hum(), sc, { rev: 0.3, pan: wide ? 0 : (i - 1) * 0.35 }));
      }
    }
    if (st.pad2 && s === 0) {
      const [inst, oct] = st.pad2;
      chordTones(song, deg, 3).forEach((n) => playWide(inst, mtof(n + oct * 12), t, sd * st.steps * 0.98, 0.18, sc, { rev: 0.45 }));
    }
    // arp
    if (st.arp && !intro) {
      const [inst, oct, pat, order, vel] = st.arp;
      if (pat[s] === 'x') {
        const tones = chordTones(song, deg, 3).concat([chordTones(song, deg, 1)[0] + 12]);
        const i = SEQ.arpIdx++;
        let n;
        if (order === 'up') n = tones[i % 4];
        else if (order === 'updown') n = tones[[0, 1, 2, 3, 2, 1][i % 6]];
        else if (order === 'roll') n = tones[[0, 2, 3, 1, 2, 3, 0, 3][i % 8]];
        else n = tones[Math.floor(Math.random() * 4)];
        play(inst, mtof(n + oct * 12), t, sd * 1.6, vel * hum(), sc, { rev: 0.3, dly: 0.6, pan: Math.sin(i * 0.9) * 0.55 });
      }
    }
    // lead
    if (st.lead && !breakdown && !(loop === 0 && bar < 2)) {
      const mel = song.melodies[Math.floor(loop / 2) % 2][bar];
      const [inst, oct, , vel] = st.lead;
      for (const nt of mel.notes) {
        if (nt.step === s) {
          const n = scaleNote(song.root + 12 * oct, song.sc, nt.deg);
          play(inst, mtof(n), t, sd * nt.len * 0.92, vel * nt.vel, bus, { rev: 0.35, dly: 0.5 });
        }
      }
    }
  }

  function sidechain(t, sd) {
    const g = A.scBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.3, t);
    g.setTargetAtTime(1, t + 0.02, sd * 0.9);
  }

  function gong(t, v, dest) {
    [1, 1.48, 2.1, 2.76, 3.4].forEach((r, i) => tone('sine', 110 * r, 108 * r, t, 3.5 - i * 0.5, v * 0.25 / (i + 1), dest, { rev: 0.6, attack: 0.02 }));
    noise(t, 1.5, v * 0.1, dest, 'bandpass', 700, 0.8, { rev: 0.6 });
  }

  /* ---------- casino ambience ---------- */
  A.startAmbience = function () {
    const ctx = A.ctx;
    const n = ctx.createBufferSource(); n.buffer = A.brown; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.06;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = ctx.createGain(); lg.gain.value = 0.025; lfo.connect(lg); lg.connect(g.gain);
    n.connect(f); f.connect(g); g.connect(A.ambBus); n.start(); lfo.start();
    const tick = () => {
      A.ambTimer = setTimeout(() => { if (A.ambOn && !document.hidden) ambientEvent(); tick(); }, 2200 + Math.random() * 4500);
    };
    tick();
  };

  function ambientEvent() {
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.05;
    const r = Math.random();
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) p.pan.value = (Math.random() - 0.5) * 1.6;
    const g = ctx.createGain(); g.gain.value = 0.2 + Math.random() * 0.2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500 + Math.random() * 3000;
    p.connect(lp); lp.connect(g); g.connect(A.ambBus); g.connect(A.ambRev);
    if (r < 0.45) {
      const base = 60 + Math.floor(Math.random() * 12);
      const pent = [0, 2, 4, 7, 9, 12, 14, 16];
      const n = 5 + Math.floor(Math.random() * 6);
      const inst = ['bell', 'chip', 'celesta', 'marimba'][Math.floor(Math.random() * 4)];
      for (let i = 0; i < n; i++) play(inst, mtof(base + pent[(i * 2 + (Math.random() < 0.3 ? 1 : 0)) % pent.length] + 12), t + i * 0.085, 0.08, 0.35, p);
    } else if (r < 0.75) {
      const n = 4 + Math.floor(Math.random() * 14);
      for (let i = 0; i < n; i++) clink(t + i * (0.04 + Math.random() * 0.05), 0.25, p);
    } else if (r < 0.88) {
      bellRing(t, 0.6 + Math.random() * 0.8, 0.07, p);
    } else {
      for (let i = 0; i < 18; i++) noise(t + i * 0.055, 0.02, 0.15, p, 'bandpass', 2400, 3);
      for (let i = 0; i < 3; i++) tone('sine', 140, 60, t + 1 + i * 0.22, 0.1, 0.3, p);
    }
  }

  // struck-coin model: inharmonic modes with independent decays + tiny impact transient
  const COIN_MODES = [[1, 1, 0.22], [2.32, 0.55, 0.16], [4.25, 0.32, 0.1], [6.63, 0.18, 0.06], [9.38, 0.1, 0.04]];
  function clink(t, v, dest, pitch) {
    const ctx = A.ctx;
    if (A.coinBufs && A.coinBufs.length) {
      if (!allow(t, 0.3, 1, 0)) return;
      const b = A.coinBufs[Math.floor(Math.random() * A.coinBufs.length)];
      playBuf(b, t, v, dest, (pitch || 1) * (0.92 + Math.random() * 0.22), (Math.random() - 0.5) * 0.9);
      return;
    }
    if (!allow(t, 0.25, 6, 0)) return;
    const f0 = (1900 + Math.random() * 1700) * (pitch || 1);
    const out = ctx.createGain(); out.gain.value = v * 0.32;
    let node = out;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - 0.5) * 0.9; out.connect(p); node = p; }
    node.connect(dest);
    COIN_MODES.forEach(([r, a, d]) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = Math.min(18000, f0 * r * (1 + (Math.random() - 0.5) * 0.012));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a, t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d * (0.8 + Math.random() * 0.5));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.1);
    });
    noise(t, 0.006, v * 0.25, dest, 'highpass', 6500);
  }

  function bellRing(t, dur, v, dest) {
    const ctx = A.ctx;
    const o1 = ctx.createOscillator(); o1.frequency.value = 2350;
    const o2 = ctx.createOscillator(); o2.frequency.value = 3420;
    const am = ctx.createGain(); am.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 22;
    const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    o1.connect(am); o2.connect(am); am.connect(g); g.connect(dest);
    [o1, o2, lfo].forEach((o) => { o.start(t); o.stop(t + dur + 0.7); });
  }

  /* ---------- sound effects ---------- */
  const sx = () => A.ready && A.sfxOn && A.ctx.state === 'running';
  function sfxInst() { return (A.machine && A.machine.sfx && A.machine.sfx.inst) || 'bell'; }
  function sNote(deg, oct) {
    const m = A.machine;
    const sc = SCALES[(m && m.music && m.music.scale) || 'major'];
    return mtof(scaleNote((m && m.music ? m.music.root : 60) + 12 * (oct || 1), sc, deg));
  }
  const PENT = [0, 2, 4, 7, 9];
  function pNote(i, oct) {
    const m = A.machine;
    const r = (m && m.music ? m.music.root : 60) + 12 * (oct || 1);
    return mtof(r + 12 * Math.floor(i / 5) + PENT[((i % 5) + 5) % 5]);
  }
  function now() { return A.ctx.currentTime + 0.01; }
  const fx = () => A.sfxBus;
  const rv = (v) => ({ rev: v, revDest: A.sfxRev });

  A.setMachine = function (m) { A.machine = m; };

  A.click = function () {
    if (!sx()) return;
    const t = now();
    tone('sine', 1800, 1200, t, 0.05, 0.1, fx());
    noise(t, 0.012, 0.08, fx(), 'highpass', 5000);
  };
  A.bet = function (up) {
    if (!sx()) return;
    const t = now();
    play('celesta', pNote(up ? 7 : 5, 1), t, 0.1, 0.35, fx(), rv(0.2));
    tone('sine', 1500, 1100, t, 0.04, 0.07, fx());
  };
  A.buzz = function () { if (!sx()) return; const t = now(); tone('sawtooth', 150, 130, t, 0.25, 0.12, fx()); tone('sawtooth', 156, 134, t, 0.25, 0.1, fx()); };

  A.spinStart = function () {
    if (!sx()) return;
    const t = now();
    tone('sine', 200, 60, t, 0.16, 0.5, fx());
    noise(t, 0.03, 0.35, fx(), 'bandpass', 1400, 2);
    noise(t + 0.01, 0.4, 0.22, fx(), 'bandpass', 300, 1.1, { sweep: 4500, attack: 0.08 });
    play(sfxInst(), pNote(0, 1), t + 0.02, 0.07, 0.22, fx(), rv(0.2));
    play(sfxInst(), pNote(2, 1), t + 0.07, 0.07, 0.22, fx(), rv(0.2));
  };

  let whirr = null, tickT = null;
  A.spinLoop = function (on, fast) {
    if (whirr) {
      const w = whirr; whirr = null;
      w.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.06);
      setTimeout(() => { try { w.n.stop(); w.l.stop(); } catch (e) { /* */ } }, 400);
    }
    clearInterval(tickT); tickT = null;
    if (!on || !sx()) return;
    const ctx = A.ctx;
    const n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fast ? 1500 : 1100; f.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.08);
    const l = ctx.createOscillator(); l.frequency.value = fast ? 22 : 16;
    const lg = ctx.createGain(); lg.gain.value = 0.03; l.connect(lg); lg.connect(g.gain);
    n.connect(f); f.connect(g); g.connect(fx());
    n.start(); l.start();
    whirr = { n, l, g };
    tickT = setInterval(() => { if (sx()) noise(now(), 0.015, 0.05, fx(), 'bandpass', 3000, 5); }, fast ? 70 : 95);
  };

  A.reelStop = function (i, n) {
    if (!sx()) return;
    const t = now();
    tone('sine', 120, 42, t, 0.18, 0.6, fx());
    noise(t, 0.025, 0.28, fx(), 'bandpass', 1800, 1.5);
    noise(t, 0.08, 0.12, fx(), 'lowpass', 600);
    // each reel stop plays the next note of a rising scale
    play('marimba', pNote(i, 1), t, 0.12, 0.28, fx(), Object.assign({ pan: ((i / Math.max(1, n - 1)) - 0.5) * 0.8 }, rv(0.15)));
  };

  A.scatterLand = function (k) {
    if (!sx()) return;
    const t = now();
    play(sfxInst(), pNote(5 + k * 2, 1), t, 0.3, 0.45, fx(), rv(0.6));
    play('bell', pNote(7 + k * 2, 1), t + 0.05, 0.4, 0.32, fx(), rv(0.6));
    play('celesta', pNote(10 + k * 2, 1), t + 0.1, 0.3, 0.2, fx(), rv(0.6));
    metal(t, 0.5, 0.05, fx(), 9000, { pitch: 2 });
    tone('sine', 60, 40, t, 0.3, 0.35, fx());
  };

  let antic = null;
  A.anticipation = function (on) {
    if (antic) {
      const { nodes, g } = antic;
      g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05);
      setTimeout(() => nodes.forEach((o) => { try { o.stop(); } catch (e) { /* */ } }), 300);
      clearInterval(antic.beat);
      antic = null;
    }
    if (!on || !sx()) return;
    const ctx = A.ctx;
    const t = now();
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.4);
    g.connect(fx());
    const nodes = [];
    [-8, 8].forEach((det) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(sNote(0, 0), t); o.frequency.exponentialRampToValueAtTime(sNote(7, 1), t + 3);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5000, t + 3); f.Q.value = 6;
      o.connect(f); f.connect(g); o.start(t); nodes.push(o);
    });
    const n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.setValueAtTime(500, t); nf.frequency.exponentialRampToValueAtTime(8000, t + 3);
    const ng = ctx.createGain(); ng.gain.value = 0.35;
    n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t); nodes.push(n);
    let k = 0;
    const beat = setInterval(() => { if (!sx()) return; const tt = now(); tone('sine', 70, 40, tt, 0.15, 0.5, fx()); if (++k % 2) tone('sine', 65, 38, tt + 0.14, 0.12, 0.35, fx()); }, 430);
    antic = { nodes, g, beat };
  };

  A.win = function (ratio) {
    if (!sx()) return;
    const t = now();
    const inst = sfxInst();
    const tier = ratio < 1 ? 0 : ratio < 3 ? 1 : ratio < 8 ? 2 : 3;
    const n = [4, 6, 8, 10][tier];
    // melodic run in the machine's key, doubled an octave up for brightness
    for (let i = 0; i < n; i++) {
      const tt = t + i * (tier ? 0.055 : 0.065);
      play(inst, pNote(i + 2, 1), tt, 0.16, 0.42, fx(), Object.assign({ pan: (i / n - 0.5) * 0.9 }, rv(0.35)));
      if (tier >= 1) play('celesta', pNote(i + 2, 2), tt + 0.01, 0.12, 0.14, fx(), rv(0.4));
    }
    const end = t + n * 0.055;
    // resolving chord + shimmer
    [0, 2, 4].forEach((k) => playWide(tier >= 2 ? 'brass' : 'warmpad', sNote(k + 7, tier >= 2 ? 1 : 1), end, 0.5 + tier * 0.25, 0.22 + tier * 0.06, fx(), rv(0.5)));
    play('bell', pNote(n + 6, 1), end, 0.6, 0.3, fx(), rv(0.7));
    metal(end, 0.9, 0.05, fx(), 9500, { pitch: 2.4 });
    if (tier >= 1) { tone('sine', 90, 40, t, 0.35, 0.45 + tier * 0.12, fx()); noise(t, 0.4, 0.15 + tier * 0.05, fx(), 'bandpass', 600, 1, Object.assign({ sweep: 8000 }, rv(0.4))); }
    if (tier >= 2) DRUM.crash(end, 0.6, fx());
    const coins = tier === 0 ? 3 : Math.min(26, 5 + Math.floor(ratio * 2.4));
    for (let i = 0; i < coins; i++) clink(t + 0.08 + i * (0.035 + Math.random() * 0.03), 0.55, fx(), 0.9 + Math.random() * 0.25);
  };

  A.leverTick = function (k) {
    if (!sx()) return;
    const t = now();
    tone('square', 1300 + k * 90, 900, t, 0.02, 0.05, fx());
    noise(t, 0.014, 0.22, fx(), 'bandpass', 2600 + k * 200, 4);
    tone('sine', 220, 120, t, 0.05, 0.12, fx());
  };
  A.leverPull = function () {
    if (!sx()) return;
    const t = now();
    for (let k = 0; k < 6; k++) A.leverTick && setTimeout(() => A.leverTick(k), k * 38);
    noise(t, 0.3, 0.12, fx(), 'bandpass', 600, 1, { sweep: 1600, attack: 0.05 });
  };
  A.leverRelease = function () {
    if (!sx()) return;
    const t = now();
    // heavy clunk + spring boing
    tone('sine', 140, 40, t, 0.25, 0.8, fx());
    noise(t, 0.05, 0.45, fx(), 'bandpass', 900, 1.5);
    noise(t, 0.12, 0.2, fx(), 'lowpass', 400);
    const o = A.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(320, t + 0.03);
    const l = A.ctx.createOscillator(); l.frequency.value = 26;
    const lg = A.ctx.createGain(); lg.gain.setValueAtTime(90, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.6);
    l.connect(lg); lg.connect(o.frequency);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + 0.03); g.gain.linearRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(fx());
    o.start(t); l.start(t); o.stop(t + 0.7); l.stop(t + 0.7);
  };

  A.lineFlash = function (i) { if (!sx()) return; play('celesta', pNote(i % 8 + 3, 1), now(), 0.08, 0.16, fx(), rv(0.3)); };
  A.countTick = function () { if (!sx()) return; clink(now(), 0.3, fx()); };

  // rising "roll-up" ticks while a win counts up
  A.rollup = function (ms, big) {
    if (!sx()) return () => {};
    const ctx = A.ctx;
    const start = ctx.currentTime;
    const n = Math.max(4, Math.floor(ms / (big ? 55 : 70) / (MOBILE ? 1.6 : 1)));
    const t0 = now();
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const t = t0 + (ms / 1000) * u;
      const f = pNote(Math.floor(u * (big ? 14 : 9)), 1);
      tone('triangle', f * 2, f * 2, t, 0.05, 0.05, fx(), { prio: 0 });
      if (i % (MOBILE ? 4 : 2) === 0) clink(t, 0.22, fx(), 0.8 + u * 0.6);
    }
    return () => { /* scheduled; nothing to stop */ void start; };
  };

  A.duck = function (on) {
    A.ducked = on;
    if (!A.ready) return;
    A.musicDuck.gain.setTargetAtTime(on ? 0.22 : 1, A.ctx.currentTime, 0.25);
  };

  A.impact = function (size) {
    if (!sx()) return;
    const t = now();
    const s = size || 1;
    tone('sine', 90, 28, t, 1.1 * s, 0.9, fx(), { bendT: 0.6 });
    noise(t, 0.9 * s, 0.5, fx(), 'lowpass', 900, 0.7, rv(0.7));
    noise(t, 0.05, 0.4, fx(), 'highpass', 2500);
    DRUM.crash(t, 0.7, fx());
  };
  A.riser = function (dur) {
    if (!sx()) return;
    const t = now();
    noise(t, dur, 0.3, fx(), 'bandpass', 300, 2, { sweep: 9000, attack: dur * 0.9 });
    tone('sawtooth', sNote(0, 0), sNote(7, 1), t, dur, 0.06, fx(), { attack: dur * 0.9 });
  };

  A.bigWin = function (level) {
    if (!sx()) return;
    A.duck(true);
    const t = now();
    A.impact(1.2);
    const prog = [[0, 2, 4], [3, 5, 7], [4, 6, 8], [7, 9, 11]];
    prog.forEach((ch, i) => {
      ch.forEach((k) => {
        playWide('brass', sNote(k, 1), t + 0.15 + i * 0.3, i === 3 ? 1.6 : 0.24, 0.42, fx(), rv(0.45));
        playWide('strings', sNote(k, 0), t + 0.15 + i * 0.3, i === 3 ? 1.8 : 0.28, 0.25, fx(), rv(0.5));
      });
      DRUM.timp(t + 0.15 + i * 0.3, 0.9, fx());
    });
    DRUM.crash(t + 1.05, 1, fx());
    bellRing(t + 1.05, 1.2 + level * 0.6, 0.05, fx());
    const coins = MOBILE ? 14 + level * 6 : 30 + level * 25;
    for (let i = 0; i < coins; i++) clink(t + 0.3 + Math.random() * (2.2 + level), 0.45, fx());
    for (let i = 0; i < 12; i++) play(sfxInst(), pNote(8 + [0, 2, 4, 5, 4, 2, 4, 7, 9, 7, 9, 12][i], 1), t + 1.2 + i * 0.08, 0.12, 0.3, fx(), rv(0.3));
  };
  A.tierUp = function (level) {
    if (!sx()) return;
    const t = now();
    A.impact(0.8);
    [0, 2, 4, 7].forEach((k) => playWide('brass', sNote(k + level * 2, 1), t, 0.5, 0.4, fx(), rv(0.4)));
    for (let i = 0; i < 6; i++) play('celesta', pNote(10 + level * 2 + i, 1), t + 0.1 + i * 0.04, 0.2, 0.25, fx(), rv(0.5));
  };
  A.bigWinEnd = function () { A.duck(false); };

  A.cascadePop = function (level) {
    if (!sx()) return;
    const t = now();
    // glassy shatter
    noise(t, 0.25, 0.3, fx(), 'highpass', 3000, 0.7, rv(0.3));
    for (let i = 0; i < 7; i++) {
      const f = 2000 + Math.random() * 5000 + level * 300;
      tone('sine', f, f * 0.98, t + Math.random() * 0.06, 0.12 + Math.random() * 0.15, 0.05, fx(), { pan: (Math.random() - 0.5) });
    }
    tone('sine', 150, 50, t, 0.2, 0.4, fx());
    play(sfxInst(), pNote(level * 2 + 4, 1), t + 0.04, 0.12, 0.3, fx(), rv(0.3));
  };
  A.drop = function () {
    if (!sx()) return;
    const t = now();
    tone('sine', 160, 60, t, 0.12, 0.35, fx());
    noise(t, 0.05, 0.1, fx(), 'lowpass', 800);
  };

  A.wildTransform = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.7, 0.28, fx(), 'bandpass', 500, 1, Object.assign({ sweep: 9000, attack: 0.15 }, rv(0.5)));
    for (let i = 0; i < 10; i++) play('celesta', pNote(i + 5, 1), t + i * 0.035, 0.2, 0.22, fx(), rv(0.5));
    tone('sine', 80, 40, t + 0.3, 0.5, 0.5, fx());
  };
  A.thunder = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.06, 0.7, fx(), 'highpass', 2500);
    noise(t + 0.02, 1.4, 0.65, fx(), 'lowpass', 700, 0.7, rv(0.8));
    tone('sine', 75, 30, t, 1, 0.7, fx());
  };

  A.featureTrigger = function () {
    if (!sx()) return;
    A.duck(true);
    const t = now();
    A.impact(1.3);
    gong(t, 0.8, fx());
    [0, 2, 4, 7].forEach((k) => playWide('strings', sNote(k, 1), t + 0.05, 1.8, 0.28, fx(), rv(0.6)));
    for (let i = 0; i < 12; i++) play(sfxInst(), pNote(i + 2, 1), t + 0.35 + i * 0.055, 0.15, 0.32, fx(), rv(0.4));
    setTimeout(() => A.duck(false), 2800);
  };
  A.fsEnd = function () {
    if (!sx()) return;
    const t = now();
    [9, 7, 4, 2].forEach((d, i) => play(sfxInst(), pNote(d, 1), t + i * 0.15, 0.3, 0.4, fx(), rv(0.4)));
    [0, 2, 4].forEach((k) => playWide('brass', sNote(k, 1), t + 0.6, 1.3, 0.35, fx(), rv(0.5)));
    DRUM.timp(t + 0.6, 0.9, fx());
  };

  A.coinLand = function (k) {
    if (!sx()) return;
    const t = now();
    tone('sine', 200, 70, t, 0.18, 0.45, fx());
    clink(t, 0.9, fx()); clink(t + 0.025, 0.6, fx());
    play(sfxInst(), pNote(4 + (k || 0), 1), t, 0.2, 0.32, fx(), rv(0.4));
  };
  A.respinTick = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.6, 0.12, fx(), 'bandpass', 800, 1.5, { sweep: 3000, attack: 0.1 });
    for (let i = 0; i < 8; i++) noise(t + i * 0.07, 0.015, 0.06, fx(), 'bandpass', 3000, 5);
  };
  A.collect = function (i) {
    if (!sx()) return;
    const t = now();
    play(sfxInst(), pNote(i % 12 + 2, 1), t, 0.1, 0.35, fx(), rv(0.3));
    clink(t, 0.45, fx(), 1 + (i % 12) * 0.04);
  };
  A.jackpot = function () {
    if (!sx()) return;
    const t = now();
    bellRing(t, 2.5, 0.08, fx());
    A.bigWin(3);
  };

  A.wheelTick = function () {
    if (!sx()) return;
    const t = now();
    tone('square', 2000, 1500, t, 0.015, 0.05, fx());
    noise(t, 0.012, 0.18, fx(), 'bandpass', 3200, 3);
    tone('sine', 400, 300, t, 0.03, 0.08, fx());
  };
  A.wheelStop = function () {
    if (!sx()) return;
    const t = now();
    A.impact(0.7);
    [0, 2, 4, 7].forEach((k, i) => playWide('brass', sNote(k, 1), t + i * 0.1, 0.5, 0.38, fx(), rv(0.4)));
  };

  A.bomb = function (k) {
    if (!sx()) return;
    const t = now();
    tone('sine', 110, 35, t, 0.5, 0.6, fx());
    noise(t, 0.45, 0.35, fx(), 'lowpass', 3000, 1, Object.assign({ sweep: 200 }, rv(0.4)));
    play('bell', pNote(6 + (k || 0), 2), t + 0.04, 0.4, 0.3, fx(), rv(0.6));
  };
  A.powerUp = function () {
    if (!sx()) return;
    const t = now();
    tone('sawtooth', 200, 2400, t, 0.55, 0.08, fx(), { attack: 0.05 });
    tone('square', 300, 3600, t, 0.55, 0.04, fx(), { attack: 0.05 });
    noise(t, 0.55, 0.18, fx(), 'bandpass', 400, 1, { sweep: 9000, attack: 0.35 });
    setTimeout(() => A.impact(0.6), 520);
  };

  // volume 0..1 per channel; 0 also counts as "off" so muted channels cost nothing
  A.setVolume = function (kind, v) {
    v = Math.max(0, Math.min(1, v));
    A.vol[kind] = v;
    const on = v > 0;
    if (kind === 'music') A.musicOn = on;
    if (kind === 'sfx') { A.sfxOn = on; if (!on) { A.spinLoop(false); A.anticipation(false); } }
    if (kind === 'amb') A.ambOn = on;
    if (!A.ready) return;
    const bus = { music: A.musicBus, sfx: A.sfxBus, amb: A.ambBus }[kind];
    const base = { music: MUSIC_VOL, sfx: SFX_VOL, amb: AMB_VOL }[kind];
    // perceptual curve so the slider feels even
    bus.gain.setTargetAtTime(base * v * v, A.ctx.currentTime, 0.05);
  };
  A.setMusic = function (on) { A.setVolume('music', on ? A.vol.music || 0.8 : 0); };
  A.setSfx = function (on) { A.setVolume('sfx', on ? A.vol.sfx || 1 : 0); };
  A.setAmb = function (on) { A.setVolume('amb', on ? A.vol.amb || 0.8 : 0); };

  /* ---------- puzzle-quest sounds ---------- */
  A.qTile = function (k) {
    if (!sx()) return;
    const t = now();
    // ceramic tile clack
    tone('sine', 2300 + (k ? -300 : 0), 2100, t, 0.05, 0.16, fx());
    tone('sine', 3400, 3300, t, 0.035, 0.08, fx());
    noise(t, 0.03, 0.22, fx(), 'bandpass', 3200, 2);
    tone('sine', 420, 300, t, 0.06, 0.18, fx());
  };
  A.qMatch = function (combo) {
    if (!sx()) return;
    const t = now();
    const c = Math.min(combo || 1, 12);
    noise(t, 0.18, 0.22, fx(), 'highpass', 3500, 0.7, rv(0.3));
    for (let i = 0; i < 4; i++) {
      const f = 2400 + Math.random() * 4200;
      tone('sine', f, f * 0.97, t + Math.random() * 0.04, 0.12, 0.04, fx(), { prio: 0 });
    }
    play('marimba', pNote(c + 3, 1), t, 0.12, 0.42, fx(), rv(0.3));
    play('celesta', pNote(c + 5, 1), t + 0.05, 0.2, 0.32, fx(), rv(0.5));
    if (c >= 3) play('bell', pNote(c + 8, 1), t + 0.1, 0.4, 0.25, fx(), rv(0.6));
    tone('sine', 160, 60, t, 0.14, 0.3, fx());
  };
  A.qBad = function () {
    if (!sx()) return;
    const t = now();
    tone('sine', 180, 90, t, 0.18, 0.45, fx());
    tone('sawtooth', 130, 110, t, 0.2, 0.08, fx());
    noise(t, 0.08, 0.15, fx(), 'lowpass', 700);
  };
  A.qHint = function () {
    if (!sx()) return;
    const t = now();
    for (let i = 0; i < 6; i++) play('celesta', pNote(i * 2 + 6, 1), t + i * 0.05, 0.18, 0.22, fx(), rv(0.6));
    noise(t, 0.5, 0.12, fx(), 'bandpass', 800, 1, { sweep: 9000, attack: 0.2 });
  };
  A.qShuffle = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.5, 0.25, fx(), 'bandpass', 400, 1, { sweep: 3500, attack: 0.1 });
    for (let i = 0; i < 14; i++) { const tt = t + i * 0.03 + Math.random() * 0.02; tone('sine', 2000 + Math.random() * 1500, 1800, tt, 0.03, 0.06, fx(), { prio: 0 }); }
  };
  A.qFound = function (n) {
    if (!sx()) return;
    const t = now();
    [0, 2, 4].forEach((k, i) => play('bell', pNote(k + 5 + (n || 0), 1), t + i * 0.04, 0.4, 0.3, fx(), rv(0.5)));
    play('celesta', pNote(12 + (n || 0), 1), t + 0.12, 0.3, 0.25, fx(), rv(0.6));
    metal(t + 0.1, 0.6, 0.05, fx(), 9500, { pitch: 2.4 });
    tone('sine', 120, 50, t, 0.2, 0.35, fx());
  };
  A.qTick = function (left) {
    if (!sx()) return;
    const t = now();
    const urgent = left <= 5;
    tone('square', urgent ? 1600 : 1200, urgent ? 1500 : 1100, t, 0.03, urgent ? 0.09 : 0.06, fx());
    if (urgent) tone('sine', 90, 50, t, 0.2, 0.3, fx());
  };
  A.qClear = function () {
    if (!sx()) return;
    A.duck(true);
    const t = now();
    A.impact(0.9);
    [[0, 2, 4], [3, 5, 7], [4, 6, 8], [7, 9, 11]].forEach((ch, i) => ch.forEach((k) => playWide('brass', sNote(k, 1), t + 0.1 + i * 0.22, i === 3 ? 1.2 : 0.18, 0.4, fx(), rv(0.45))));
    for (let i = 0; i < 10; i++) play('celesta', pNote(10 + i, 1), t + 0.9 + i * 0.05, 0.15, 0.25, fx(), rv(0.5));
    for (let i = 0; i < (A.mobile ? 8 : 20); i++) clink(t + 0.4 + Math.random() * 1.6, 0.4, fx());
    setTimeout(() => A.duck(false), 2400);
  };
  A.qFail = function () {
    if (!sx()) return;
    const t = now();
    [7, 6, 5, 3].forEach((d, i) => play('brass', sNote(d, 0), t + i * 0.28, i === 3 ? 0.8 : 0.24, 0.35, fx(), rv(0.4)));
    tone('sine', 110, 40, t + 0.85, 0.8, 0.45, fx());
  };
  A.qWhoosh = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.7, 0.3, fx(), 'bandpass', 300, 1.2, { sweep: 5000, attack: 0.3 });
    tone('sine', 200, 900, t, 0.5, 0.06, fx(), { attack: 0.3 });
  };
  A.qDialog = function () {
    if (!sx()) return;
    const t = now();
    play('marimba', pNote(7, 1), t, 0.08, 0.25, fx());
    play('marimba', pNote(9, 1), t + 0.06, 0.1, 0.2, fx());
  };
  A.qChapter = function () {
    if (!sx()) return;
    const t = now();
    gong(t, 0.6, fx());
    [0, 2, 4, 7].forEach((k) => playWide('strings', sNote(k, 1), t + 0.1, 1.6, 0.24, fx(), rv(0.6)));
    for (let i = 0; i < 8; i++) play('harp', pNote(i * 2, 1), t + 0.3 + i * 0.07, 0.3, 0.25, fx(), rv(0.5));
  };
  A.qQuest = function () {
    if (!sx()) return;
    const t = now();
    [0, 4, 7, 12].forEach((k, i) => play('bell', sNote(k, 1), t + i * 0.09, 0.35, 0.3, fx(), rv(0.5)));
    for (let i = 0; i < 6; i++) clink(t + 0.3 + i * 0.05, 0.4, fx());
  };

  A.STYLES = STYLES;
  root.SlotAudio = A;
})(window);
