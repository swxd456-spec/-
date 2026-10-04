/* Web Audio engine: synth instruments, drums, generative background music,
   casino floor ambience and all slot sound effects. Everything is synthesized. */
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

  /* ---------- engine ---------- */
  const A = {
    ctx: null, ready: false,
    musicOn: true, sfxOn: true, ambOn: true,
    machine: null, style: null,
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    A.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    A.master = ctx.createGain(); A.master.gain.value = 0.85;
    A.master.connect(comp); comp.connect(ctx.destination);
    A.musicBus = ctx.createGain(); A.musicBus.gain.value = A.musicOn ? 0.55 : 0;
    A.musicDuck = ctx.createGain(); A.musicDuck.gain.value = 1;
    A.lofi = ctx.createBiquadFilter(); A.lofi.type = 'lowpass'; A.lofi.frequency.value = 20000;
    A.musicBus.connect(A.musicDuck); A.musicDuck.connect(A.lofi); A.lofi.connect(A.master);
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = A.sfxOn ? 0.9 : 0; A.sfxBus.connect(A.master);
    A.ambBus = ctx.createGain(); A.ambBus.gain.value = A.ambOn ? 0.5 : 0; A.ambBus.connect(A.master);
    // reverb
    A.reverb = ctx.createConvolver();
    A.reverb.buffer = impulse(ctx, 2.6, 2.2);
    A.revSend = ctx.createGain(); A.revSend.gain.value = 0.35;
    A.revSend.connect(A.reverb); A.reverb.connect(A.lofi);
    A.sfxRev = ctx.createGain(); A.sfxRev.gain.value = 0.25; A.sfxRev.connect(A.reverb);
    A.reverb2 = ctx.createConvolver(); A.reverb2.buffer = impulse(ctx, 3.5, 1.8);
    A.ambRev = ctx.createGain(); A.ambRev.gain.value = 1; A.ambRev.connect(A.reverb2); A.reverb2.connect(A.ambBus);
    // delay
    A.delay = ctx.createDelay(1.5); A.delayFb = ctx.createGain(); A.delaySend = ctx.createGain();
    A.delayFb.gain.value = 0.35; A.delaySend.gain.value = 0;
    A.delaySend.connect(A.delay); A.delay.connect(A.delayFb); A.delayFb.connect(A.delay); A.delay.connect(A.lofi);
    A.noise = noiseBuf(ctx, 2);
    A.brown = brownBuf(ctx, 4);
    A.ready = true;
    A.startAmbience();
    if (A.pendingStyle) A.playMusic(A.pendingStyle.machine);
    const resume = () => { if (ctx.state === 'suspended') ctx.resume(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  };

  function impulse(ctx, secs, decay) {
    const len = Math.floor(ctx.sampleRate * secs);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
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
    const out = ctx.createGain();
    const [a, d, s, r] = sp.env;
    const peak = vel * (sp.g || 0.6);
    const g = out.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.setTargetAtTime(peak * s, t + a, d / 3 + 0.001);
    const end = t + Math.max(dur, a + 0.01);
    if (s > 0) {
      g.setValueAtTime(peak * s, end);
    }
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
    let pan = null;
    if (opt && opt.pan && ctx.createStereoPanner) {
      pan = ctx.createStereoPanner(); pan.pan.value = opt.pan;
      out.connect(pan); pan.connect(dest);
    } else out.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; out.connect(sg); sg.connect(opt.revDest || A.revSend); }
    if (opt && opt.dly) out.connect(A.delaySend);
    const oscs = [];
    let vibG = null;
    if (sp.vib) {
      const [rate, depth, delay] = sp.vib;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(depth, t + delay + 0.15);
      lfo.connect(vibG); lfo.start(t); lfo.stop(stopAt); oscs.push(lfo);
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
      if (o.d) osc.detune.value = o.d;
      if (vibG) vibG.connect(osc.detune);
      if (fmG) fmG.connect(osc.frequency);
      let on = osc;
      if (o.g) { const og = ctx.createGain(); og.gain.value = o.g; osc.connect(og); on = og; }
      on.connect(node);
      osc.start(t); osc.stop(stopAt);
    }
    if (sp.breath) {
      const n = ctx.createBufferSource(); n.buffer = A.noise;
      const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = freq * 2; bf.Q.value = 1;
      const ng = ctx.createGain(); ng.gain.value = sp.breath * 4;
      n.connect(bf); bf.connect(ng); ng.connect(node);
      n.start(t, Math.random()); n.stop(stopAt);
    }
  }

  function noise(t, dur, vel, dest, ftype, f, q, opt) {
    const ctx = A.ctx;
    const n = ctx.createBufferSource(); n.buffer = A.noise;
    const fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q || 1;
    if (opt && opt.sweep) fl.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + (opt && opt.attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl); fl.connect(g); g.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; g.connect(sg); sg.connect(opt.revDest || A.revSend); }
    n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  }

  function tone(type, f0, f1, t, dur, vel, dest, opt) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * (opt && opt.bendT || 1));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + (opt && opt.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    if (opt && opt.rev) { const sg = ctx.createGain(); sg.gain.value = opt.rev; g.connect(sg); sg.connect(opt.revDest || A.revSend); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  /* ---------- drums ---------- */
  const DRUM = {
    kick(t, v, d) { tone('sine', 150, 42, t, 0.32, v * 1.1, d, { bendT: 0.35 }); noise(t, 0.02, v * 0.25, d, 'highpass', 2000); },
    ckick(t, v, d) { tone('square', 200, 40, t, 0.12, v * 0.35, d); },
    snare(t, v, d) { noise(t, 0.18, v * 0.6, d, 'bandpass', 1800, 0.8, { rev: 0.3 }); tone('triangle', 230, 160, t, 0.1, v * 0.4, d); },
    csnare(t, v, d) { noise(t, 0.1, v * 0.4, d, 'highpass', 1200); },
    brush(t, v, d) { noise(t, 0.16, v * 0.25, d, 'bandpass', 3500, 0.5, { attack: 0.03 }); },
    clap(t, v, d) { for (let i = 0; i < 3; i++) noise(t + i * 0.011, 0.09, v * 0.45, d, 'bandpass', 1300, 1.2); noise(t + 0.03, 0.2, v * 0.3, d, 'bandpass', 1300, 1, { rev: 0.4 }); },
    hat(t, v, d) { noise(t, 0.045, v * 0.22, d, 'highpass', 8000); },
    chat(t, v, d) { noise(t, 0.03, v * 0.15, d, 'highpass', 6000); },
    ohat(t, v, d) { noise(t, 0.25, v * 0.2, d, 'highpass', 7000); },
    ride(t, v, d) { noise(t, 0.4, v * 0.13, d, 'highpass', 5000); tone('sine', 5200, 5100, t, 0.3, v * 0.03, d); },
    crash(t, v, d) { noise(t, 1.6, v * 0.25, d, 'highpass', 4000, 0.5, { rev: 0.5 }); },
    rim(t, v, d) { tone('square', 1700, 1700, t, 0.03, v * 0.15, d); noise(t, 0.02, v * 0.2, d, 'bandpass', 3000, 3); },
    tomL(t, v, d) { tone('sine', 140, 80, t, 0.35, v * 0.8, d); },
    tomM(t, v, d) { tone('sine', 200, 120, t, 0.3, v * 0.7, d, { rev: 0.3 }); },
    tomH(t, v, d) { tone('sine', 300, 190, t, 0.22, v * 0.6, d); },
    taiko(t, v, d) { tone('sine', 110, 50, t, 0.7, v * 1.1, d, { rev: 0.5 }); noise(t, 0.08, v * 0.3, d, 'lowpass', 600); },
    timp(t, v, d) { tone('sine', 98, 90, t, 0.9, v * 0.9, d, { rev: 0.6 }); tone('sine', 196, 180, t, 0.4, v * 0.2, d); },
    conga(t, v, d) { tone('sine', 330, 260, t, 0.18, v * 0.6, d); },
    bongo(t, v, d) { tone('sine', 520, 430, t, 0.1, v * 0.5, d); },
    shaker(t, v, d) { noise(t, 0.06, v * 0.12, d, 'highpass', 5000, 1, { attack: 0.015 }); },
    tamb(t, v, d) { noise(t, 0.12, v * 0.18, d, 'highpass', 7000); tone('sine', 6500, 6500, t, 0.08, v * 0.03, d); },
    wood(t, v, d) { tone('sine', 1150, 1100, t, 0.06, v * 0.5, d, { rev: 0.3 }); },
    dum(t, v, d) { tone('sine', 120, 70, t, 0.35, v * 0.9, d); },
    tek(t, v, d) { noise(t, 0.05, v * 0.35, d, 'bandpass', 2600, 2); tone('sine', 700, 600, t, 0.04, v * 0.2, d); },
    bodhran(t, v, d) { tone('sine', 110, 65, t, 0.22, v * 0.8, d); noise(t, 0.04, v * 0.2, d, 'lowpass', 900); },
    stomp(t, v, d) { tone('sine', 90, 45, t, 0.25, v, d); noise(t, 0.06, v * 0.35, d, 'lowpass', 500); },
    tri(t, v, d) { tone('sine', 4200, 4200, t, 0.9, v * 0.06, d, { rev: 0.4 }); tone('sine', 6100, 6100, t, 0.6, v * 0.03, d); },
    sleigh(t, v, d) { for (let i = 0; i < 4; i++) tone('sine', 5200 + i * 700 + Math.random() * 300, 0, t + i * 0.008, 0.12, v * 0.03, d); noise(t, 0.1, v * 0.08, d, 'highpass', 8000); },
    cowbell(t, v, d) { tone('square', 540, 540, t, 0.2, v * 0.1, d); tone('square', 800, 800, t, 0.2, v * 0.1, d); },
  };

  /* ---------- music sequencer ---------- */
  function scaleNote(root0, sc, deg) {
    const n = sc.length;
    const o = Math.floor(deg / n);
    return root0 + 12 * o + sc[((deg % n) + n) % n];
  }

  function buildSong(machine, styleName) {
    const st = STYLES[styleName];
    const mu = machine.music;
    const rng = root.U.mulberry32(root.U.hashStr(machine.id + styleName));
    const sc = SCALES[mu.scale] || SCALES.major;
    const csc = SCALES[st.chordScale] || sc;
    const bars = st.prog.length;
    // melody variants (A and B)
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
          const strong = i % (st.steps === 12 ? 6 : 4) === 0;
          if (strong) {
            // nearest chord tone above/below prev
            const cands = [0, 2, 4].map((k) => chordDeg + k).flatMap((d) => [d, d + sc.length, d - sc.length]);
            cands.sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev) + (rng() - 0.5) * 2);
            deg = cands[0];
          } else {
            const steps = [-2, -1, -1, 1, 1, 2, 0, 3, -3];
            deg = prev + steps[Math.floor(rng() * steps.length)];
          }
          deg = Math.max(0, Math.min(sc.length * 2 + 1, deg));
          if (b === bars - 1 && i >= rh.lastIndexOf('x')) deg = sc.length; // resolve to tonic
          notes.push({ step: i, len, deg });
          prev = deg;
        }
        mel.push({ rh, notes });
      }
      return mel;
    });
    return { st, sc, csc, bars, melodies, root: mu.root, rng };
  }

  const SEQ = { timer: null, song: null, nextTime: 0, step: 0, bar: 0, loop: 0, arpIdx: 0, nodes: [] };

  A.playMusic = function (machine, styleOverride) {
    A.pendingStyle = { machine };
    if (!A.ready) return;
    A.stopMusic();
    const styleName = styleOverride || machine.music.style;
    const song = buildSong(machine, styleName);
    SEQ.song = song;
    SEQ.step = 0; SEQ.bar = 0; SEQ.loop = 0; SEQ.arpIdx = 0;
    SEQ.nextTime = A.ctx.currentTime + 0.15;
    A.revSend.gain.value = song.st.fx.rev || 0.3;
    A.delaySend.gain.value = song.st.fx.delay || 0;
    const beatDur = 60 / (machine.music.bpm || 100);
    SEQ.stepDur = beatDur / (song.st.beat || 4);
    A.delay.delayTime.value = Math.min(1.4, SEQ.stepDur * 3);
    A.lofi.frequency.setValueAtTime(song.st.fx.lofi ? 3200 : 20000, A.ctx.currentTime);
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
    const g = ctx.createGain(); g.gain.value = 0.12;
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
    const g = ctx.createGain(); g.gain.value = 0.35;
    n.connect(f); f.connect(g); g.connect(A.musicBus); n.start();
    SEQ.nodes.push(n);
  }
  function startDrone(song) {
    const ctx = A.ctx;
    for (const iv of [0, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(song.root - 12 + iv);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 0.035;
      o.connect(f); f.connect(g); g.connect(A.musicBus); o.start();
      SEQ.nodes.push(o);
    }
  }

  function schedule() {
    const ctx = A.ctx;
    if (!SEQ.song) return;
    if (SEQ.nextTime < ctx.currentTime - 0.3) SEQ.nextTime = ctx.currentTime + 0.05; // tab was asleep
    while (SEQ.nextTime < ctx.currentTime + 0.15) {
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
    // drums
    if (!intro || bar === 1) {
      for (const name in st.drums) {
        const p = st.drums[name];
        const ch = p[s % p.length];
        if (ch === 'x' || ch === 'o') {
          if ((name === 'crash') && !(bar === 0)) continue;
          DRUM[name] && DRUM[name](t, ch === 'x' ? 0.9 : 0.5, bus);
        }
      }
    }
    if (st.gong && s === 0 && bar === 0) gong(t, 0.35, bus);
    // bass
    if (st.bass) {
      const [inst, oct, pat0] = st.bass;
      const pat = st.bassAlt && bar % 2 ? st.bassAlt : pat0;
      if (pat === 'walk') {
        if (s % 4 === 0) {
          const beat = s / 4;
          const nextDeg = st.prog[(bar + 1) % song.bars];
          const degs = [deg, deg + 2, deg + 4, nextDeg + 1];
          const n = scaleNote(song.root + oct * 12, song.csc, degs[beat] || deg);
          play(inst, mtof(n), t, sd * 3.5, 0.75, bus);
        }
      } else {
        const ch = pat[s];
        if (ch && ch !== '.') {
          const k = +ch;
          const tones = chordTones(song, deg, 4);
          let n = k === 3 ? tones[0] + 12 : k === 4 ? tones[3] : tones[k];
          n += oct * 12;
          play(inst, mtof(n), t, sd * len(pat, s) * 0.9, 0.75, bus);
        }
      }
    }
    // chords
    if (st.chords) {
      const [inst, oct, pat, nt] = st.chords;
      if (pat[s] === 'x') {
        const tones = chordTones(song, deg, nt || 3);
        const d = sd * len(pat, s) * 0.95;
        tones.forEach((n, i) => play(inst, mtof(n + oct * 12), t + i * 0.006, d, 0.32, bus, { rev: 0.25 }));
      }
    }
    if (st.pad2 && s === 0) {
      const [inst, oct] = st.pad2;
      chordTones(song, deg, 3).forEach((n) => play(inst, mtof(n + oct * 12), t, sd * st.steps * 0.98, 0.2, bus, { rev: 0.4 }));
    }
    // arp
    if (st.arp && !intro) {
      const [inst, oct, pat, order, vel] = st.arp;
      if (pat[s] === 'x') {
        const tones = chordTones(song, deg, 3).concat([chordTones(song, deg, 1)[0] + 12]);
        let n;
        const i = SEQ.arpIdx++;
        if (order === 'up') n = tones[i % 4];
        else if (order === 'updown') n = tones[[0, 1, 2, 3, 2, 1][i % 6]];
        else if (order === 'roll') n = tones[[0, 2, 3, 1, 2, 3, 0, 3][i % 8]];
        else n = tones[Math.floor(Math.random() * 4)];
        play(inst, mtof(n + oct * 12), t, sd * 1.6, vel, bus, { rev: 0.3, dly: true, pan: (Math.random() - 0.5) * 0.5 });
      }
    }
    // lead (rests every 4th loop for breathing room)
    if (st.lead && loop % 4 !== 3 && !(loop === 0 && bar < 2)) {
      const mel = song.melodies[Math.floor(loop / 2) % 2][bar];
      const [inst, oct, , vel] = st.lead;
      for (const nt of mel.notes) {
        if (nt.step === s) {
          const n = scaleNote(song.root + 12 * oct, song.sc, nt.deg);
          play(inst, mtof(n), t, sd * nt.len * 0.92, vel, bus, { rev: 0.35, dly: true });
        }
      }
    }
  }

  function gong(t, v, dest) {
    [1, 1.48, 2.1, 2.76, 3.4].forEach((r, i) => tone('sine', 110 * r, 108 * r, t, 3.5 - i * 0.5, v * 0.25 / (i + 1), dest, { rev: 0.6, attack: 0.02 }));
    noise(t, 1.5, v * 0.1, dest, 'bandpass', 700, 0.8, { rev: 0.6 });
  }

  /* ---------- casino ambience ---------- */
  A.startAmbience = function () {
    const ctx = A.ctx;
    // crowd murmur
    const n = ctx.createBufferSource(); n.buffer = A.brown; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.07;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain);
    n.connect(f); f.connect(g); g.connect(A.ambBus); n.start(); lfo.start();
    const tick = () => {
      const delay = 1800 + Math.random() * 4200;
      A.ambTimer = setTimeout(() => { if (A.ambOn && !document.hidden) ambientEvent(); tick(); }, delay);
    };
    tick();
  };

  function ambientEvent() {
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.05;
    const r = Math.random();
    const pan = (Math.random() - 0.5) * 1.6;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) p.pan.value = pan;
    const g = ctx.createGain(); g.gain.value = 0.25 + Math.random() * 0.2;
    p.connect(g); g.connect(A.ambBus); g.connect(A.ambRev);
    if (r < 0.45) {
      // a distant slot machine jingle
      const base = 60 + Math.floor(Math.random() * 12);
      const pent = [0, 2, 4, 7, 9, 12, 14, 16];
      const n = 5 + Math.floor(Math.random() * 6);
      const inst = ['bell', 'chip', 'celesta', 'marimba'][Math.floor(Math.random() * 4)];
      for (let i = 0; i < n; i++) play(inst, mtof(base + pent[(i * 2 + (Math.random() < 0.3 ? 1 : 0)) % pent.length] + 12), t + i * 0.085, 0.08, 0.35, p);
    } else if (r < 0.75) {
      // coins dropping into a tray
      const n = 4 + Math.floor(Math.random() * 14);
      for (let i = 0; i < n; i++) clink(t + i * (0.04 + Math.random() * 0.05), 0.25, p);
    } else if (r < 0.88) {
      // electromechanical win bell
      bellRing(t, 0.6 + Math.random() * 0.8, 0.08, p);
    } else {
      // reels spinning somewhere
      for (let i = 0; i < 18; i++) noise(t + i * 0.055, 0.02, 0.18, p, 'bandpass', 2400, 3);
      for (let i = 0; i < 3; i++) tone('sine', 140, 60, t + 1 + i * 0.22, 0.1, 0.3, p);
    }
  }

  function clink(t, v, dest) {
    const f = 2600 + Math.random() * 2400;
    tone('sine', f, f * 0.995, t, 0.18, v * 0.3, dest);
    tone('sine', f * 1.51, f * 1.5, t, 0.12, v * 0.18, dest);
    tone('sine', f * 2.43, f * 2.4, t, 0.07, v * 0.1, dest);
    noise(t, 0.01, v * 0.2, dest, 'highpass', 6000);
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
    const sc = SCALES[(m && m.music.scale) || 'major'];
    return mtof(scaleNote((m ? m.music.root : 60) + 12 * (oct || 1), sc, deg));
  }
  function now() { return A.ctx.currentTime + 0.01; }

  A.setMachine = function (m) { A.machine = m; };

  A.click = function () { if (!sx()) return; tone('sine', 1200, 900, now(), 0.06, 0.12, A.sfxBus); };
  A.bet = function (up) { if (!sx()) return; const t = now(); tone('triangle', up ? 660 : 520, up ? 990 : 390, t, 0.1, 0.2, A.sfxBus); };
  A.buzz = function () { if (!sx()) return; tone('sawtooth', 140, 120, now(), 0.35, 0.15, A.sfxBus); };

  A.spinStart = function () {
    if (!sx()) return;
    const t = now();
    // lever clunk + whoosh
    tone('sine', 220, 70, t, 0.18, 0.5, A.sfxBus);
    noise(t, 0.04, 0.4, A.sfxBus, 'bandpass', 900, 2);
    noise(t + 0.02, 0.35, 0.25, A.sfxBus, 'bandpass', 400, 1.2, { sweep: 3200, attack: 0.05 });
    play(sfxInst(), sNote(0, 1), t + 0.02, 0.08, 0.25, A.sfxBus);
    play(sfxInst(), sNote(4, 1), t + 0.08, 0.1, 0.25, A.sfxBus);
  };

  let spinLoopTimer = null;
  A.spinLoop = function (on, fast) {
    if (spinLoopTimer) { clearInterval(spinLoopTimer); spinLoopTimer = null; }
    if (!on || !sx()) return;
    const iv = fast ? 45 : 65;
    spinLoopTimer = setInterval(() => {
      if (!sx()) return;
      const t = now();
      noise(t, 0.018, 0.12, A.sfxBus, 'bandpass', 2200 + Math.random() * 800, 4);
      tone('triangle', 300 + Math.random() * 40, 280, t, 0.025, 0.05, A.sfxBus);
    }, iv);
  };

  A.reelStop = function (i, n) {
    if (!sx()) return;
    const t = now();
    tone('sine', 160 + i * 12, 55, t, 0.16, 0.55, A.sfxBus);
    noise(t, 0.03, 0.3, A.sfxBus, 'bandpass', 1500 + i * 150, 2);
    tone('square', 900 + i * 80, 900 + i * 80, t, 0.02, 0.04, A.sfxBus);
  };

  A.scatterLand = function (k) {
    if (!sx()) return;
    const t = now();
    play(sfxInst(), sNote(4 + k * 2, 2), t, 0.3, 0.5, A.sfxBus, { rev: 0.5, revDest: A.sfxRev });
    play('bell', sNote(6 + k * 2, 2), t + 0.06, 0.3, 0.3, A.sfxBus, { rev: 0.5, revDest: A.sfxRev });
    noise(t, 0.3, 0.08, A.sfxBus, 'highpass', 8000);
  };

  let antic = null;
  A.anticipation = function (on) {
    if (antic) {
      const { o, g, l } = antic;
      g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05);
      setTimeout(() => { try { o.stop(); l.stop(); } catch (e) { /* */ } }, 300);
      antic = null;
    }
    if (!on || !sx()) return;
    const ctx = A.ctx;
    const t = now();
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(sNote(0, 0), t); o.frequency.exponentialRampToValueAtTime(sNote(7, 1), t + 2.5);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.3);
    const l = ctx.createOscillator(); l.frequency.value = 14;
    const lg = ctx.createGain(); lg.gain.value = 0.06; l.connect(lg); lg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(A.sfxBus);
    o.start(t); l.start(t);
    for (let i = 0; i < 40; i++) DRUM.snare(t + i * 0.06, 0.15 + i * 0.008, A.sfxBus);
    antic = { o, g, l };
  };

  A.win = function (ratio) {
    if (!sx()) return;
    const t = now();
    const inst = sfxInst();
    const n = ratio < 1 ? 3 : ratio < 3 ? 5 : 7;
    for (let i = 0; i < n; i++) play(inst, sNote(i * 2, 1), t + i * 0.07, 0.15, 0.45, A.sfxBus, { rev: 0.3, revDest: A.sfxRev });
    play('bell', sNote(n * 2, 1), t + n * 0.07, 0.4, 0.3, A.sfxBus, { rev: 0.4, revDest: A.sfxRev });
    const coins = ratio < 1 ? 2 : Math.min(14, 3 + Math.floor(ratio * 2));
    for (let i = 0; i < coins; i++) clink(t + 0.1 + i * 0.06, 0.6, A.sfxBus);
  };

  A.lineFlash = function (i) {
    if (!sx()) return;
    play(sfxInst(), sNote(i % 7, 2), now(), 0.08, 0.2, A.sfxBus);
  };

  A.countTick = function () { if (!sx()) return; clink(now(), 0.35, A.sfxBus); };

  A.duck = function (on) {
    if (!A.ready) return;
    A.musicDuck.gain.setTargetAtTime(on ? 0.25 : 1, A.ctx.currentTime, 0.2);
  };

  A.bigWin = function (level) {
    if (!sx()) return;
    A.duck(true);
    const t = now();
    const prog = [0, 3, 4, 0];
    prog.forEach((d, i) => {
      [0, 2, 4].forEach((k) => play('brass', sNote(d + k, 1), t + i * 0.28, i === 3 ? 1.4 : 0.22, 0.45, A.sfxBus, { rev: 0.4, revDest: A.sfxRev }));
    });
    DRUM.crash(t, 0.9, A.sfxBus); DRUM.crash(t + 0.84, 1, A.sfxBus);
    DRUM.timp(t, 1, A.sfxBus); DRUM.timp(t + 0.84, 1, A.sfxBus);
    bellRing(t + 0.84, 1.2 + level * 0.6, 0.06, A.sfxBus);
    const coins = 30 + level * 25;
    for (let i = 0; i < coins; i++) clink(t + 0.3 + Math.random() * (2 + level), 0.5, A.sfxBus);
    for (let i = 0; i < 8; i++) play(sfxInst(), sNote(7 + [0, 2, 4, 7, 4, 2, 4, 7][i], 1), t + 1.2 + i * 0.09, 0.12, 0.35, A.sfxBus);
  };
  A.bigWinEnd = function () { A.duck(false); };

  A.cascadePop = function (level) {
    if (!sx()) return;
    const t = now();
    noise(t, 0.2, 0.35, A.sfxBus, 'bandpass', 1200 + level * 300, 1, { sweep: 300 });
    tone('sine', 400 + level * 90, 900 + level * 150, t, 0.12, 0.25, A.sfxBus);
    play(sfxInst(), sNote(level * 2, 1), t + 0.05, 0.1, 0.3, A.sfxBus);
  };

  A.drop = function () { if (!sx()) return; const t = now(); tone('sine', 180, 80, t, 0.08, 0.25, A.sfxBus); };

  A.wildTransform = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 0.6, 0.3, A.sfxBus, 'bandpass', 600, 1, { sweep: 7000, attack: 0.1 });
    for (let i = 0; i < 8; i++) play('celesta', sNote(i * 2, 2), t + i * 0.04, 0.2, 0.25, A.sfxBus, { rev: 0.5, revDest: A.sfxRev });
  };
  A.thunder = function () {
    if (!sx()) return;
    const t = now();
    noise(t, 1.2, 0.7, A.sfxBus, 'lowpass', 800, 0.7, { rev: 0.6, revDest: A.sfxRev });
    tone('sine', 80, 40, t, 0.8, 0.6, A.sfxBus);
    noise(t, 0.08, 0.6, A.sfxBus, 'highpass', 3000);
  };

  A.featureTrigger = function () {
    if (!sx()) return;
    A.duck(true);
    const t = now();
    gong(t, 0.9, A.sfxBus);
    DRUM.crash(t, 1, A.sfxBus);
    [0, 2, 4, 7].forEach((k) => play('strings', sNote(k, 1), t + 0.05, 1.5, 0.3, A.sfxBus, { rev: 0.5, revDest: A.sfxRev }));
    for (let i = 0; i < 10; i++) play(sfxInst(), sNote(i, 1), t + 0.4 + i * 0.06, 0.15, 0.35, A.sfxBus);
    setTimeout(() => A.duck(false), 2600);
  };

  A.fsEnd = function () {
    if (!sx()) return;
    const t = now();
    [7, 4, 2, 0].forEach((d, i) => play(sfxInst(), sNote(d, 1), t + i * 0.16, 0.3, 0.4, A.sfxBus, { rev: 0.4, revDest: A.sfxRev }));
    [0, 2, 4].forEach((k) => play('brass', sNote(k, 1), t + 0.64, 1.2, 0.35, A.sfxBus));
  };

  A.coinLand = function (k) {
    if (!sx()) return;
    const t = now();
    tone('sine', 220, 90, t, 0.15, 0.4, A.sfxBus);
    clink(t, 0.9, A.sfxBus); clink(t + 0.03, 0.6, A.sfxBus);
    play(sfxInst(), sNote(2 + (k || 0), 2), t, 0.2, 0.3, A.sfxBus, { rev: 0.4, revDest: A.sfxRev });
  };
  A.respinTick = function () {
    if (!sx()) return;
    const t = now();
    for (let i = 0; i < 6; i++) noise(t + i * 0.06, 0.02, 0.1, A.sfxBus, 'bandpass', 2500, 4);
  };
  A.collect = function (i) {
    if (!sx()) return;
    const t = now();
    play(sfxInst(), sNote(i % 10, 1), t, 0.1, 0.35, A.sfxBus);
    clink(t, 0.5, A.sfxBus);
  };
  A.jackpot = function () {
    if (!sx()) return;
    const t = now();
    bellRing(t, 2.5, 0.09, A.sfxBus);
    A.bigWin(3);
  };

  A.wheelTick = function (k) {
    if (!sx()) return;
    const t = now();
    tone('square', 1800, 1500, t, 0.02, 0.06, A.sfxBus);
    noise(t, 0.015, 0.15, A.sfxBus, 'bandpass', 3000, 3);
  };
  A.wheelStop = function () {
    if (!sx()) return;
    const t = now();
    [0, 2, 4, 7].forEach((k, i) => play('brass', sNote(k, 1), t + i * 0.1, 0.5, 0.4, A.sfxBus, { rev: 0.4, revDest: A.sfxRev }));
    DRUM.crash(t + 0.3, 0.8, A.sfxBus);
  };

  A.bomb = function (k) {
    if (!sx()) return;
    const t = now();
    tone('sawtooth', 1400, 180, t, 0.3, 0.12, A.sfxBus);
    noise(t, 0.4, 0.35, A.sfxBus, 'lowpass', 2500, 1, { sweep: 200 });
    play('bell', sNote(4 + (k || 0), 2), t + 0.05, 0.3, 0.3, A.sfxBus, { rev: 0.5, revDest: A.sfxRev });
  };
  A.powerUp = function () {
    if (!sx()) return;
    const t = now();
    tone('sawtooth', 200, 2400, t, 0.5, 0.1, A.sfxBus, { attack: 0.05 });
    tone('square', 300, 3600, t, 0.5, 0.05, A.sfxBus, { attack: 0.05 });
    noise(t, 0.5, 0.2, A.sfxBus, 'bandpass', 400, 1, { sweep: 8000, attack: 0.3 });
  };

  A.setMusic = function (on) {
    A.musicOn = on;
    if (A.ready) A.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, A.ctx.currentTime, 0.1);
  };
  A.setSfx = function (on) {
    A.sfxOn = on;
    if (A.ready) A.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, A.ctx.currentTime, 0.05);
    if (!on) { A.spinLoop(false); A.anticipation(false); }
  };
  A.setAmb = function (on) {
    A.ambOn = on;
    if (A.ready) A.ambBus.gain.setTargetAtTime(on ? 0.5 : 0, A.ctx.currentTime, 0.1);
  };

  A.STYLES = STYLES;
  root.SlotAudio = A;
})(window);
