// Procedural WebAudio soundscape: twin-turboprop harmonics, wind rush,
// stall reed horn, beacon chime, gear/flap/de-ice mechanics, touchdown chirp,
// radio squelch. Silent until first user gesture; muted in shot staging.
export function createAudio() {
  let ctx = null, master = null, engOsc = [], windSrc = null, windGain = null, muted = false;
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      // twin prop: two detuned saw oscillators + blade-pass pulse
      [92, 94.5].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = 0.05;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
        o.connect(lp); lp.connect(g); g.connect(master); o.start();
        engOsc.push({ o, g });
      });
      // wind noise
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource(); windSrc.buffer = buf; windSrc.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0.0;
      windSrc.connect(bp); bp.connect(windGain); windGain.connect(master); windSrc.start();
    } catch (e) { ctx = null; }
  }
  function blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    init, toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    update(plane) {
      if (!ctx || muted) return;
      const rpm = 0.4 + plane.throttle * 0.9;
      engOsc.forEach((e, i) => { e.o.frequency.value = (92 + i * 2.5) * rpm * (plane.reverse ? 0.7 : 1); e.g.gain.value = 0.03 + plane.throttle * 0.05; });
      if (windGain) windGain.gain.value = Math.min(0.22, plane.ias / 900);
    },
    chime() { blip(660, 0.25); setTimeout(() => blip(990, 0.35), 90); },
    clunk() { blip(140, 0.12, 'square', 0.25); },
    click() { blip(900, 0.05, 'square', 0.12); },
    squelch() { blip(1200, 0.04, 'square', 0.08); },
    touchdown() { blip(300, 0.18, 'sine', 0.3); setTimeout(() => blip(220, 0.15, 'sine', 0.2), 80); },
    stallHorn(on) { if (on) blip(440, 0.3, 'sawtooth', 0.12); },
  };
}
