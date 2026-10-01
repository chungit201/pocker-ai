// suited — synthesised sound. No files, no network: everything is a few
// oscillators and a noise buffer, so it costs nothing and never blocks a hand.
// Muted until the player asks for it (browsers require a gesture anyway).

export function createSound() {
  let ctx = null, master = null, noise = null;
  let muted = true, volume = 0.55;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 0.6;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return ctx;
  }

  const env = (node, t, a, dTime, peak) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dTime);
    node.connect(g); g.connect(master);
    return g;
  };

  function tone(freq, { at = 0, a = 0.004, d = 0.09, peak = 0.22, type = 'triangle', detune = 0, sweep = null } = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + a + d);
    o.detune.value = detune;
    env(o, t, a, d, peak);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  function hiss({ at = 0, d = 0.12, peak = 0.14, hp = 900, lp = 6000, q = 0.7 } = {}) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f1 = ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp; f1.Q.value = q;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
    src.connect(f1); f1.connect(f2);
    env(f2, t, 0.006, d, peak);
    src.start(t); src.stop(t + d + 0.1);
  }

  const voices = {
    ui: () => { tone(1180, { d: 0.035, peak: 0.1, type: 'square' }); },
    hover: () => { tone(1560, { d: 0.02, peak: 0.035, type: 'sine' }); },
    deal: () => { hiss({ d: 0.1, peak: 0.1, hp: 1400, lp: 7200 }); tone(320, { d: 0.05, peak: 0.05, sweep: 210 }); },
    flip: () => { hiss({ d: 0.06, peak: 0.09, hp: 2200, lp: 9000 }); tone(760, { d: 0.05, peak: 0.07, sweep: 520 }); },
    peel: () => { hiss({ d: 0.22, peak: 0.05, hp: 3000, lp: 11000, q: 1.4 }); },
    chip: () => {
      hiss({ d: 0.05, peak: 0.13, hp: 2600, lp: 11000 });
      tone(1420, { d: 0.05, peak: 0.09, type: 'square', detune: -8 });
      tone(2100, { at: 0.02, d: 0.05, peak: 0.05, type: 'square' });
    },
    chips: () => { for (let i = 0; i < 4; i++) { hiss({ at: i * 0.035, d: 0.05, peak: 0.1, hp: 2400, lp: 10000 }); tone(1200 + i * 130, { at: i * 0.035, d: 0.05, peak: 0.06, type: 'square' }); } },
    check: () => { tone(180, { d: 0.09, peak: 0.2, type: 'sine' }); hiss({ d: 0.04, peak: 0.06, hp: 300, lp: 1800 }); },
    fold: () => { hiss({ d: 0.18, peak: 0.07, hp: 700, lp: 3400 }); tone(240, { d: 0.1, peak: 0.05, sweep: 150 }); },
    bet: () => { tone(520, { d: 0.08, peak: 0.14, sweep: 720 }); voices.chip(); },
    allin: () => { [440, 587, 740].forEach((f, i) => tone(f, { at: i * 0.06, d: 0.3, peak: 0.13, type: 'triangle' })); voices.chips(); },
    turnStart: () => { tone(880, { d: 0.07, peak: 0.09 }); tone(1320, { at: 0.05, d: 0.07, peak: 0.06 }); },
    alert: () => {
      [740, 988, 1318].forEach((f, i) => tone(f, { at: i * 0.11, d: 0.26, peak: 0.2, type: 'triangle' }));
      [740, 988].forEach((f, i) => tone(f, { at: 0.42 + i * 0.11, d: 0.26, peak: 0.16, type: 'triangle' }));
    },
    lowTime: () => { tone(660, { d: 0.06, peak: 0.12, type: 'square' }); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.075, d: 0.34, peak: 0.15, type: 'triangle' })); voices.chips(); },
    // A pot is worth a real cue: bass root, major arpeggio, chip cascade.
    potwin: () => {
      tone(131, { d: 0.6, peak: 0.16, type: 'sine' });
      [392, 523, 659, 784].forEach((f, i) => tone(f, { at: 0.04 + i * 0.08, d: 0.42, peak: 0.15, type: 'triangle' }));
      for (let i = 0; i < 7; i++) setTimeout(() => { if (ctx && !muted) voices.chip(); }, 120 + i * 62);
    },
    bigwin: () => {
      tone(98, { d: 0.9, peak: 0.18, type: 'sine' });
      tone(196, { d: 0.8, peak: 0.12, type: 'sine' });
      [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, { at: 0.05 + i * 0.075, d: 0.62, peak: 0.16, type: 'triangle' }));
      [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: 0.62 + i * 0.05, d: 0.9, peak: 0.1, type: 'sine' }));
      hiss({ at: 0.05, d: 0.9, peak: 0.05, hp: 4200, lp: 13000, q: 0.8 });
      for (let i = 0; i < 16; i++) setTimeout(() => { if (ctx && !muted) voices.chip(); }, 160 + i * 58);
    },
    lose: () => { [392, 330].forEach((f, i) => tone(f, { at: i * 0.11, d: 0.3, peak: 0.1, type: 'sine' })); },
    badbeat: () => { [523, 466, 415, 349].forEach((f, i) => tone(f, { at: i * 0.13, d: 0.4, peak: 0.11, type: 'sine' })); },
    seat: () => { tone(300, { d: 0.12, peak: 0.14, sweep: 480 }); },
    error: () => { tone(200, { d: 0.14, peak: 0.14, type: 'square', sweep: 140 }); },
  };

  return {
    play(name) {
      if (muted) return;
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      (voices[name] || voices.ui)();
    },
    unlock() { if (!muted) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); } },
    setMuted(m) {
      muted = m;
      if (!m) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
      if (master) master.gain.value = m ? 0 : volume;
      return muted;
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master && !muted) master.gain.value = volume;
      return volume;
    },
    /* Close the audio context and forget it.
     *
     * componentWillUnmount has always called this — "release the audio context
     * outright — a detached instance that keeps one open stays audible and
     * ignores the new instance's mute" — but it was never written, so the call
     * threw. Nothing noticed, because under the old runtime the app mounted
     * once and never unmounted; React's development double-mount is what made
     * an unmount happen at all, and with it the crash.
     *
     * Implemented rather than guarded away at the call site: the comment there
     * describes a real leak (one live AudioContext per mount, all of them
     * audible, none of them reachable by the current instance's mute), and a
     * `this.sound.destroy?.()` would have left that leak in place.
     *
     * `ensure()` rebuilds everything from `ctx` on the next play, so a sound
     * object stays usable after this — it just starts a fresh context. */
    destroy() {
      if (ctx && typeof ctx.close === 'function') ctx.close().catch(() => {});
      ctx = null; master = null; noise = null;
    },
    get muted() { return muted; },
    get volume() { return volume; },
  };
}
