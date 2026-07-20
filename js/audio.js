// GuitarGuru audio engine: shared AudioContext, metronome, plucked-string chord synth, mic tuner.
'use strict';

const Audio = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // --- Plucked string (Karplus-Strong via buffer) ---------------------------
  function pluck(freq, when, gainVal = 0.35, dur = 2.2) {
    const c = ac();
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, Math.ceil(sr * dur), sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    const damp = 0.996;
    for (let i = 0; i < out.length; i++) {
      const next = (idx + 1) % period;
      ring[idx] = (ring[idx] + ring[next]) * 0.5 * damp;
      out[i] = ring[idx];
      idx = next;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, freq * 8);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(when);
    src.stop(when + dur);
  }

  // Strum a chord definition (frets array low->high). dir: 1 down, -1 up.
  function strumChord(frets, { dir = 1, speed = 0.045, gain = 0.3 } = {}) {
    const c = ac();
    const t0 = c.currentTime + 0.03;
    const notes = [];
    frets.forEach((f, i) => { if (f >= 0) notes.push(midiToFreq(OPEN_MIDI[i] + f)); });
    const order = dir === 1 ? notes : [...notes].reverse();
    order.forEach((f, i) => pluck(f, t0 + i * speed, gain));
  }

  function playNote(midi) { pluck(midiToFreq(midi), ac().currentTime + 0.02, 0.4); }

  // --- Click sounds ---------------------------------------------------------
  function click(when, accent) {
    const c = ac();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = accent ? 1568 : 1046;
    g.gain.setValueAtTime(accent ? 0.5 : 0.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
    osc.connect(g).connect(c.destination);
    osc.start(when); osc.stop(when + 0.07);
  }

  // Short noise burst for strum-trainer hits ('X' chuck = darker).
  function tick(when, kind) {
    const c = ac();
    const len = 0.05;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = kind === 'X' ? 500 : kind === 'U' ? 3500 : 2200;
    const g = c.createGain(); g.gain.value = kind === 'X' ? 0.5 : 0.35;
    src.connect(f).connect(g).connect(c.destination);
    src.start(when); src.stop(when + len);
  }

  // --- Metronome (lookahead scheduler) --------------------------------------
  // Fires cb(beatIndex, subIndex, atTime) via requestAnimationFrame-ish timing for visuals.
  function makeScheduler({ bpm, beats = 4, subdiv = 1, onTick, sound = true, accent = true }) {
    let running = false, timer = null, nextTime = 0, count = 0;
    const state = { bpm, beats, subdiv };
    function schedule() {
      const c = ac();
      while (nextTime < c.currentTime + 0.12) {
        const sub = count % state.subdiv;
        const beat = Math.floor(count / state.subdiv) % state.beats;
        if (sound && sub === 0) click(nextTime, accent && beat === 0);
        if (onTick) {
          const at = nextTime, b = beat, s = sub, total = count;
          const delay = Math.max(0, (at - c.currentTime) * 1000);
          setTimeout(() => { if (running) onTick(b, s, at, total); }, delay);
        }
        nextTime += (60 / state.bpm) / state.subdiv;
        count++;
      }
    }
    return {
      start() {
        if (running) return;
        running = true; count = 0;
        nextTime = ac().currentTime + 0.1;
        schedule();
        timer = setInterval(schedule, 25);
      },
      stop() { running = false; if (timer) clearInterval(timer); timer = null; },
      setBpm(b) { state.bpm = b; },
      set(opts) { Object.assign(state, opts); },
      get running() { return running; },
    };
  }

  // --- Tuner: autocorrelation pitch detection -------------------------------
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  let micStream = null, analyser = null, tunerRAF = null;

  function autoCorrelate(buf, sr) {
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.008) return -1; // too quiet
    // trim silence at edges
    let r1 = 0, r2 = buf.length - 1;
    const thres = 0.2;
    for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < thres) { r2 = buf.length - i; break; }
    const b = buf.slice(r1, r2);
    const n = b.length;
    if (n < 200) return -1;
    const c = new Float32Array(n);
    for (let lag = 0; lag < n; lag++)
      for (let i = 0; i < n - lag; i++) c[lag] += b[i] * b[i + lag];
    let d = 0; while (d < n - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    if (maxpos <= 0) return -1;
    let T0 = maxpos;
    // parabolic interpolation
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || x2;
    const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
    if (a) T0 = T0 - bb / (2 * a);
    return sr / T0;
  }

  async function startTuner(onReading) {
    const c = ac();
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = c.createMediaStreamSource(micStream);
    analyser = c.createAnalyser();
    analyser.fftSize = 4096;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      const freq = autoCorrelate(buf, c.sampleRate);
      if (freq > 40 && freq < 1500) {
        const midi = 69 + 12 * Math.log2(freq / 440);
        const nearest = Math.round(midi);
        const cents = Math.round((midi - nearest) * 100);
        onReading({ freq, midi: nearest, cents, note: NOTE_NAMES[((nearest % 12) + 12) % 12], octave: Math.floor(nearest / 12) - 1 });
      } else {
        onReading(null);
      }
      tunerRAF = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopTuner() {
    if (tunerRAF) cancelAnimationFrame(tunerRAF);
    tunerRAF = null;
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    analyser = null;
  }

  return { ac, strumChord, playNote, click, tick, makeScheduler, startTuner, stopTuner, midiToFreq };
})();
