// GuitarGuru views: every screen + interactive trainers.
// Each view returns HTML; wire() attaches behavior after mount.
'use strict';

const Views = {};
// Context linking a trainer session back to a curriculum activity: {day, idx} or null.
let ActivityCtx = null;
let activeScheduler = null; // any running metronome/strum/song scheduler — stopped on nav
let liveTimers = [];        // setInterval ids owned by the current view
function trackTimer(id) { liveTimers.push(id); return id; }

function stopActive() {
  if (activeScheduler) { activeScheduler.stop(); activeScheduler = null; }
  liveTimers.forEach(clearInterval);
  liveTimers = [];
  if (Views.changes._keyHandler) { document.removeEventListener('keydown', Views.changes._keyHandler); Views.changes._keyHandler = null; }
  Audio.stopTuner();
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function fmtTime(sec) { return Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0'); }

function completeCtx() {
  if (!ActivityCtx) return;
  const { day, idx } = ActivityCtx;
  ActivityCtx = null;
  State.completeActivity(day, idx);
  setTimeout(() => { location.hash = '#/day/' + day; }, 900);
}

// ---------------------------------------------------------------- HOME
Views.home = {
  render() {
    const li = State.levelInfo();
    const st = State.streak();
    const cur = State.currentDay();
    const d = DAYS[cur - 1];
    const prog = State.dayProgress(cur);
    const daysDone = Object.keys(State.data.completedDays).length;
    const nChords = Object.keys(State.data.learnedChords).length;
    const nSongs = Object.keys(State.data.playedSongs).length;
    const nAch = Object.keys(State.data.achievements).length;
    const pct = Math.round(prog.done / prog.total * 100);
    return `
    <div class="hero">
      <div class="hero-top">
        <div>
          <div class="eyebrow">GUITARGURU · 30-DAY CHALLENGE</div>
          <h1>Hey, future guitarist 👋</h1>
        </div>
        <button class="icon-btn" onclick="location.hash='#/profile'" title="Profile & awards">🏅</button>
      </div>
      <div class="stat-row">
        <div class="stat ${State.practicedToday() ? 'lit' : ''}"><div class="stat-num">🔥 ${st}</div><div class="stat-label">day streak</div></div>
        <div class="stat"><div class="stat-num">⭐ ${State.data.xp}</div><div class="stat-label">total XP</div></div>
        <div class="stat"><div class="stat-num">📅 ${daysDone}/30</div><div class="stat-label">days done</div></div>
      </div>
      <div class="level-card">
        <div class="level-line"><b>Level ${li.n} — ${li.title}</b><span>${li.maxed ? 'MAX' : li.xpInto + ' / ' + li.xpNeed + ' XP'}</span></div>
        <div class="bar"><div class="bar-fill" style="width:${Math.round(li.progress * 100)}%"></div></div>
      </div>
    </div>
    <div class="card today-card" onclick="location.hash='#/day/${cur}'">
      <div class="today-head">
        <div class="day-badge">DAY ${cur}</div>
        <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      </div>
      <h2>${esc(d.title)}</h2>
      <p class="muted">${esc(d.goal)}</p>
      <div class="chip-row"><span class="chip">⏱ ~${d.minutes} min</span><span class="chip">${prog.done}/${prog.total} tasks</span></div>
      <button class="btn primary big-btn">${prog.done === 0 ? '▶ Start today’s practice' : prog.done === prog.total ? '✓ Done — review day' : '▶ Continue practice'}</button>
    </div>
    ${!State.practicedToday() && st > 0 ? `<div class="card warn-card">🔥 Your <b>${st}-day streak</b> is on the line — even 5 minutes keeps it alive.</div>` : ''}
    <div class="grid2">
      <div class="card mini" onclick="location.hash='#/tools/tuner'"><div class="mini-icon">🎯</div><b>Tuner</b><span class="muted">Get in tune</span></div>
      <div class="card mini" onclick="location.hash='#/tools/changes'"><div class="mini-icon">⚡</div><b>1-Min Changes</b><span class="muted">Beat your best</span></div>
      <div class="card mini" onclick="location.hash='#/tools/metronome'"><div class="mini-icon">🕰️</div><b>Metronome</b><span class="muted">Lock the groove</span></div>
      <div class="card mini" onclick="location.hash='#/tools/strum'"><div class="mini-icon">🎵</div><b>Strum Trainer</b><span class="muted">Pattern practice</span></div>
    </div>
    <div class="card row-card" onclick="location.hash='#/profile'">
      <span>🏅 <b>${nAch}</b>/${ACHIEVEMENTS.length} achievements · 🎸 <b>${nChords}</b> chords · 🎵 <b>${nSongs}</b> songs</span><span class="chev">›</span>
    </div>`;
  },
  wire() {},
};

// ---------------------------------------------------------------- JOURNEY
Views.journey = {
  render() {
    let out = `<h1 class="page-title">Your 30-Day Journey</h1>`;
    PHASES.forEach(ph => {
      out += `<div class="phase-head"><b>Phase ${ph.n}: ${ph.name}</b><span class="muted"> · Days ${ph.days}</span><div class="muted small">${ph.desc}</div></div><div class="path">`;
      DAYS.filter(d => d.phase === ph.n).forEach(d => {
        const done = State.isDayDone(d.day);
        const cur = State.currentDay() === d.day && !done;
        const locked = !done && !cur && d.day > State.currentDay();
        const prog = State.dayProgress(d.day);
        out += `<div class="node ${done ? 'done' : cur ? 'current' : locked ? 'locked' : ''}"
          onclick="${locked ? `toast('🔒 Finish Day ${State.currentDay()} first!')` : `location.hash='#/day/${d.day}'`}">
          <div class="node-circle">${done ? '✓' : locked ? '🔒' : d.day}</div>
          <div class="node-info"><b>Day ${d.day}: ${esc(d.title)}</b>
          <span class="muted small">${done ? 'Completed ✓' : prog.done ? prog.done + '/' + prog.total + ' tasks' : '~' + d.minutes + ' min'}</span></div>
        </div>`;
      });
      out += `</div>`;
    });
    return out;
  },
  wire() {},
};

// ---------------------------------------------------------------- DAY DETAIL
Views.day = {
  render(n) {
    const d = DAYS[n - 1];
    if (!d) return '<p>No such day.</p>';
    const prog = State.dayProgress(n);
    let out = `
    <div class="day-head">
      <button class="icon-btn" onclick="location.hash='#/journey'">‹</button>
      <div><div class="eyebrow">DAY ${n} · PHASE ${d.phase} · ~${d.minutes} MIN</div><h1>${esc(d.title)}</h1></div>
    </div>
    <p class="muted">${esc(d.goal)}</p>
    <div class="bar wide"><div class="bar-fill" style="width:${prog.done / prog.total * 100}%"></div></div>`;
    d.activities.forEach((a, i) => {
      const done = State.isActivityDone(n, i);
      const icon = { read: '📖', tune: '🎯', chord: '🎸', changes: '⚡', strum: '🎵', song: '🎤', quiz: '🧠', free: '⏱' }[a.type] || '•';
      out += `<div class="card act ${done ? 'done' : ''}" data-i="${i}">
        <div class="act-icon">${done ? '✅' : icon}</div>
        <div class="act-body">
          <b>${esc(a.title)}</b> <span class="xp-tag">+${a.xp} XP</span>
          ${a.text ? `<p class="muted small pre">${esc(a.text)}</p>` : ''}
          ${this.actionButton(a, n, i, done)}
        </div>
      </div>`;
    });
    if (prog.done === prog.total) out += `<div class="card success-card">🏆 Day ${n} complete! ${n < 30 ? 'Come back tomorrow — sleep is when your fingers actually learn.' : 'YOU GRADUATED! 🎓'}</div>`;
    return out;
  },
  actionButton(a, day, i, done) {
    if (done) return '';
    const ctx = `ActivityCtx={day:${day},idx:${i}};`;
    switch (a.type) {
      case 'tune':   return `<button class="btn" onclick="${ctx}location.hash='#/tools/tuner'">Open tuner</button>`;
      case 'chord':  return `<button class="btn" onclick="${ctx}location.hash='#/chord/${a.chord}'">Learn ${a.chord}</button>`;
      case 'changes':return `<button class="btn" onclick="${ctx}location.hash='#/tools/changes/${a.pair[0]}/${a.pair[1]}/${a.target}'">Start drill (target ${a.target}, best ${State.bestFor(a.pair)})</button>`;
      case 'strum':  return `<button class="btn" onclick="${ctx}location.hash='#/tools/strum/${a.pattern}/${a.bpm}/${a.minutes||3}'">Open strum trainer</button>`;
      case 'song':   return `<button class="btn" onclick="${ctx}location.hash='#/song/${a.song}'">Play song</button>`;
      case 'quiz':   return `<button class="btn" onclick="${ctx}location.hash='#/quiz/${a.quiz}'">Take quiz</button>`;
      case 'read':   return `<button class="btn ghost" onclick="State.completeActivity(${day},${i});App.render()">Got it ✓</button>`;
      case 'free':   return `<button class="btn ghost" onclick="Views.day.freeTimer(${day},${i},${a.minutes || 3})">Start ${a.minutes || 3}-min timer</button>
                             <button class="btn ghost" onclick="State.completeActivity(${day},${i});App.render()">Mark done ✓</button>`;
    }
    return '';
  },
  freeTimer(day, i, minutes) {
    const card = document.querySelector(`.act[data-i="${i}"] .act-body`);
    if (!card || card.querySelector('.free-timer')) return;
    const el = document.createElement('div');
    el.className = 'free-timer';
    let left = minutes * 60;
    el.innerHTML = `<div class="timer-big">${fmtTime(left)}</div>`;
    card.appendChild(el);
    const iv = trackTimer(setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(iv);
        State.completeActivity(day, i);
        App.render();
      } else el.querySelector('.timer-big').textContent = fmtTime(left);
    }, 1000));
  },
  wire() {},
};

// ---------------------------------------------------------------- CHORD LIBRARY
Views.chords = {
  render() {
    let out = `<h1 class="page-title">Chord Library</h1><p class="muted">Tap a chord to learn it, hear it, and drill it.</p><div class="chord-grid">`;
    Object.keys(CHORDS).forEach(id => {
      const learned = State.data.learnedChords[id];
      out += `<div class="card chord-card ${learned ? 'learned' : ''}" onclick="location.hash='#/chord/${id}'">
        <div class="chord-name">${id}${learned ? ' <span class="learned-tick">✓</span>' : ''}</div>
        ${chordSVG(id, 100)}
      </div>`;
    });
    return out + '</div>';
  },
  wire() {},
};

Views.chord = {
  render(id) {
    const ch = CHORDS[id];
    if (!ch) return '<p>Unknown chord.</p>';
    const learned = State.data.learnedChords[id];
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>${id} <span class="muted h-sub">${esc(ch.name)}</span></h1></div>
    <div class="card chord-detail">
      <div class="chord-svg-big">${chordSVG(id, 220)}</div>
      <div class="diff">Difficulty: ${'●'.repeat(ch.diff)}${'○'.repeat(4 - ch.diff)}</div>
      <p class="tip">💡 ${esc(ch.tip)}</p>
      <div class="btn-row">
        <button class="btn primary" id="hear-slow">🔊 Hear it (slow)</button>
        <button class="btn" id="hear-strum">🎸 Strum it</button>
      </div>
      <div class="btn-row">
        ${learned ? `<span class="chip">✓ Learned ${learned}</span>`
                  : `<button class="btn success" id="mark-learned">I can play it — every string rings ✓</button>`}
      </div>
      <p class="muted small">Checklist: press with fingertips · right behind the fret · thumb behind neck · pluck each string one by one — all clear? You’ve got it.</p>
    </div>`;
  },
  wire(id) {
    const ch = CHORDS[id];
    document.getElementById('hear-slow').onclick = () => Audio.strumChord(ch.frets, { speed: 0.5, gain: 0.4 });
    document.getElementById('hear-strum').onclick = () => Audio.strumChord(ch.frets, { speed: 0.04 });
    const btn = document.getElementById('mark-learned');
    if (btn) btn.onclick = () => {
      State.learnChord(id);
      if (ActivityCtx) { completeCtx(); } else { App.render(); }
    };
  },
};

// ---------------------------------------------------------------- SONGS
Views.songs = {
  render() {
    let out = `<h1 class="page-title">Songbook</h1><p class="muted">Real songs, unlocked as your journey progresses.</p>`;
    SONGS.forEach(s => {
      const locked = s.day > State.currentDay() && !State.isDayDone(s.day) && !State.data.playedSongs[s.id];
      const played = State.data.playedSongs[s.id] || 0;
      out += `<div class="card row-card song-row ${locked ? 'locked' : ''}"
        onclick="${locked ? `toast('🔒 Unlocks on Day ${s.day}')` : `location.hash='#/song/${s.id}'`}">
        <div><b>${locked ? '🔒 ' : '🎵 '}${esc(s.title)}</b><div class="muted small">${esc(s.artist)} · ${s.chords.join(' ')} · Day ${s.day}${played ? ' · played ' + played + '×' : ''}</div></div>
        <span class="chev">›</span></div>`;
    });
    return out;
  },
  wire() {},
};

Views.song = {
  bar: 0,
  render(id) {
    const s = SONGS.find(x => x.id === id);
    if (!s) return '<p>Unknown song.</p>';
    const pat = STRUM_PATTERNS[s.pattern];
    let bars = '';
    s.bars.forEach((b, i) => {
      const label = Array.isArray(b) ? b.join(' / ') : b;
      bars += `<div class="song-bar" data-bar="${i}">${label}</div>`;
    });
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>${esc(s.title)}</h1></div>
    <p class="muted">${esc(s.note)} ${s.lyric ? '· “' + esc(s.lyric) + '”' : ''}</p>
    <div class="card">
      <div class="song-now">
        <div><div class="eyebrow">NOW</div><div class="song-chord" id="now-chord">—</div><div id="now-svg"></div></div>
        <div><div class="eyebrow">NEXT</div><div class="song-chord next" id="next-chord">—</div><div id="next-svg"></div></div>
      </div>
      <div class="song-grid">${bars}</div>
      <div class="tool-controls">
        <label>Tempo <b id="bpm-val">${s.bpm}</b> bpm</label>
        <input type="range" id="bpm" min="40" max="140" value="${s.bpm}">
        <div class="btn-row">
          <button class="btn primary big-btn" id="play">▶ Play along</button>
        </div>
        <p class="muted small">Strum: <b>${pat ? esc(pat.name) : 'free'}</b> · ${s.timeSig}/4 time · chord sounds on beat 1, click keeps time. Finish a full pass to complete.</p>
      </div>
    </div>`;
  },
  wire(id) {
    const s = SONGS.find(x => x.id === id);
    const bpmEl = document.getElementById('bpm');
    bpmEl.oninput = () => { document.getElementById('bpm-val').textContent = bpmEl.value; if (activeScheduler) activeScheduler.setBpm(+bpmEl.value); };
    const playBtn = document.getElementById('play');
    const chordAt = (i) => { const b = s.bars[i % s.bars.length]; return Array.isArray(b) ? b : [b]; };
    const show = (i) => {
      document.querySelectorAll('.song-bar').forEach(el => el.classList.remove('active'));
      const el = document.querySelector(`.song-bar[data-bar="${i % s.bars.length}"]`);
      if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      const now = chordAt(i)[0], next = chordAt(i + 1)[0];
      document.getElementById('now-chord').textContent = now;
      document.getElementById('next-chord').textContent = next;
      document.getElementById('now-svg').innerHTML = chordSVG(now, 90);
      document.getElementById('next-svg').innerHTML = chordSVG(next, 90);
    };
    let barIdx = -1, passes = 0;
    playBtn.onclick = () => {
      if (activeScheduler) { stopActive(); playBtn.textContent = '▶ Play along'; return; }
      barIdx = -1;
      activeScheduler = Audio.makeScheduler({
        bpm: +bpmEl.value, beats: s.timeSig, subdiv: 1, sound: true,
        onTick: (beat) => {
          if (beat === 0) {
            barIdx++;
            if (barIdx > 0 && barIdx % s.bars.length === 0) {
              passes++;
              State.playSong(s.id);
              toast('🎵 Full pass complete!');
              if (ActivityCtx) { stopActive(); playBtn.textContent = '▶ Play along'; completeCtx(); return; }
              State.addXP(15, 'Song pass: ' + s.title);
            }
            show(barIdx);
            const half = chordAt(barIdx);
            const ch = CHORDS[half[0]];
            if (ch) Audio.strumChord(ch.frets, { speed: 0.03, gain: 0.22 });
            if (half[1] && CHORDS[half[1]]) {
              const late = (60 / +bpmEl.value) * (s.timeSig / 2) * 1000;
              setTimeout(() => { if (activeScheduler) Audio.strumChord(CHORDS[half[1]].frets, { speed: 0.03, gain: 0.22 }); }, late);
            }
          }
        },
      });
      activeScheduler.start();
      playBtn.textContent = '⏸ Stop';
    };
    show(0);
  },
};

// ---------------------------------------------------------------- TOOLS HUB
Views.tools = {
  render() {
    return `<h1 class="page-title">Practice Tools</h1>
    <div class="card row-card" onclick="location.hash='#/tools/tuner'"><span>🎯 <b>Tuner</b><div class="muted small">Microphone pitch detection, all 6 strings</div></span><span class="chev">›</span></div>
    <div class="card row-card" onclick="location.hash='#/tools/changes'"><span>⚡ <b>One-Minute Changes</b><div class="muted small">The #1 chord-learning drill · personal bests</div></span><span class="chev">›</span></div>
    <div class="card row-card" onclick="location.hash='#/tools/metronome'"><span>🕰️ <b>Metronome</b><div class="muted small">40–200 bpm · 4/4, 3/4, 6/8 · accent</div></span><span class="chev">›</span></div>
    <div class="card row-card" onclick="location.hash='#/tools/strum'"><span>🎵 <b>Strum Trainer</b><div class="muted small">Visual patterns synced to the beat</div></span><span class="chev">›</span></div>`;
  },
  wire() {},
};

// ---------------------------------------------------------------- TUNER
Views.tuner = {
  render() {
    let strings = TUNING.map(t =>
      `<button class="btn string-btn" data-midi="${t.midi}" id="str-${t.midi}">${t.name[0]}<span class="muted small">${t.name.slice(1)}</span></button>`).join('');
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>Tuner</h1></div>
    <div class="card tuner-card">
      <div class="tuner-note" id="t-note">—</div>
      <div class="tuner-status" id="t-status">Press start, then pluck a string</div>
      <div class="needle-wrap"><div class="needle-scale">
        <div class="needle" id="needle"></div>
        <div class="needle-center"></div>
      </div><div class="needle-labels"><span>♭ low</span><span class="ok">in tune</span><span>high ♯</span></div></div>
      <button class="btn primary big-btn" id="t-start">🎤 Start tuner</button>
      <p class="muted small">Standard tuning, thick to thin — tap a string to hear its reference note:</p>
      <div class="btn-row">${strings}</div>
      ${ActivityCtx ? `<button class="btn success big-btn" id="t-done">All 6 in tune — done ✓</button>` : ''}
    </div>`;
  },
  wire() {
    document.querySelectorAll('.string-btn').forEach(b => b.onclick = () => Audio.playNote(+b.dataset.midi));
    const startBtn = document.getElementById('t-start');
    startBtn.onclick = async () => {
      try {
        startBtn.textContent = '🎤 Listening…'; startBtn.disabled = true;
        State.markTunerUsed();
        await Audio.startTuner((r) => {
          const note = document.getElementById('t-note'), status = document.getElementById('t-status'), needle = document.getElementById('needle');
          if (!note) return;
          if (!r) { note.classList.remove('good'); status.textContent = 'Pluck a string…'; return; }
          // snap display to nearest guitar string for beginner clarity
          let target = TUNING[0];
          for (const t of TUNING) if (Math.abs(r.midi - t.midi) < Math.abs(r.midi - target.midi)) target = t;
          const offMidi = (r.midi + r.cents / 100) - target.midi;
          const cents = Math.max(-50, Math.min(50, Math.round(offMidi * 100)));
          note.textContent = target.name;
          needle.style.transform = `translateX(${cents * 1.4}px) rotate(${cents * 0.5}deg)`;
          const inTune = Math.abs(cents) <= 5;
          note.classList.toggle('good', inTune);
          status.textContent = inTune ? '✓ In tune!' : cents < 0 ? 'Too low — tighten slowly' : 'Too high — loosen slowly';
        });
      } catch (e) {
        startBtn.disabled = false; startBtn.textContent = '🎤 Start tuner';
        document.getElementById('t-status').textContent = 'Mic blocked. Allow microphone access, or tune by ear with the reference notes below.';
      }
    };
    const done = document.getElementById('t-done');
    if (done) done.onclick = () => { State.markTunerUsed(); completeCtx(); };
  },
};

// ---------------------------------------------------------------- METRONOME
Views.metronome = {
  render() {
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>Metronome</h1></div>
    <div class="card tuner-card">
      <div class="beat-dots" id="beat-dots"></div>
      <div class="tuner-note" id="m-bpm">80</div>
      <div class="muted">beats per minute</div>
      <input type="range" id="m-slider" min="40" max="200" value="80" class="wide-slider">
      <div class="btn-row">
        <button class="btn" data-d="-5">−5</button><button class="btn" data-d="-1">−1</button>
        <button class="btn" data-d="1">+1</button><button class="btn" data-d="5">+5</button>
      </div>
      <div class="btn-row">
        <button class="btn seg" data-sig="4">4/4</button><button class="btn seg" data-sig="3">3/4</button><button class="btn seg" data-sig="6">6/8</button>
      </div>
      <button class="btn primary big-btn" id="m-start">▶ Start</button>
      <p class="muted small">Tip: pick a tempo where you can change chords in time — speed comes from accuracy, not effort.</p>
    </div>`;
  },
  wire() {
    let bpm = 80, beats = 4, startedAt = 0;
    const dots = document.getElementById('beat-dots');
    const drawDots = (active = -1) => {
      dots.innerHTML = Array.from({ length: beats }, (_, i) =>
        `<div class="dot ${i === active ? 'on' : ''} ${i === 0 ? 'accent' : ''}"></div>`).join('');
    };
    drawDots();
    const slider = document.getElementById('m-slider');
    const setBpm = (v) => { bpm = Math.max(40, Math.min(200, v)); slider.value = bpm; document.getElementById('m-bpm').textContent = bpm; if (activeScheduler) activeScheduler.setBpm(bpm); };
    slider.oninput = () => setBpm(+slider.value);
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => setBpm(bpm + +b.dataset.d));
    document.querySelectorAll('[data-sig]').forEach(b => b.onclick = () => { beats = +b.dataset.sig; drawDots(); if (activeScheduler) activeScheduler.set({ beats }); });
    const btn = document.getElementById('m-start');
    btn.onclick = () => {
      if (activeScheduler) {
        stopActive(); btn.textContent = '▶ Start';
        if (Date.now() - startedAt > 30000) { State.bumpMetronome(); State.addXP(5, 'Metronome session'); }
        return;
      }
      startedAt = Date.now();
      activeScheduler = Audio.makeScheduler({ bpm, beats, subdiv: 1, onTick: (b) => drawDots(b) });
      activeScheduler.start();
      btn.textContent = '⏸ Stop';
    };
  },
};

// ---------------------------------------------------------------- STRUM TRAINER
Views.strum = {
  render(patternId, bpm, minutes) {
    const patId = patternId || 'oldFaithful';
    const opts = Object.keys(STRUM_PATTERNS).map(k =>
      `<option value="${k}" ${k === patId ? 'selected' : ''}>${esc(STRUM_PATTERNS[k].name)}</option>`).join('');
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>Strum Trainer</h1></div>
    <div class="card tuner-card">
      <select id="s-pattern" class="select">${opts}</select>
      <p class="muted small" id="s-desc"></p>
      <div class="strum-slots" id="s-slots"></div>
      <div class="tool-controls">
        <label>Tempo <b id="s-bpm-val">${bpm || 70}</b> bpm</label>
        <input type="range" id="s-bpm" min="40" max="140" value="${bpm || 70}" class="wide-slider">
      </div>
      <button class="btn primary big-btn" id="s-start">▶ Start</button>
      <div class="muted" id="s-timer"></div>
      <p class="muted small">Hold any chord (or mute the strings) and copy the highlighted arrows. Arm swings down-up nonstop — grey slots are “misses”: swing but don’t touch.</p>
    </div>`;
  },
  wire(patternId, bpmArg, minutesArg) {
    const sel = document.getElementById('s-pattern');
    const minutes = +(minutesArg || 0);
    let elapsed = 0, timerIv = null;
    const draw = (active = -1) => {
      const p = STRUM_PATTERNS[sel.value];
      document.getElementById('s-desc').textContent = p.desc;
      document.getElementById('s-slots').innerHTML = p.slots.map((s, i) => {
        const sym = s === 'D' ? '↓' : s === 'U' ? '↑' : s === 'X' ? '✕' : '·';
        return `<div class="slot ${s === '-' ? 'miss' : ''} ${i === active ? 'on' : ''}">${sym}</div>`;
      }).join('');
    };
    draw();
    sel.onchange = () => { if (activeScheduler) stopStrum(); draw(); };
    const bpmEl = document.getElementById('s-bpm');
    bpmEl.oninput = () => { document.getElementById('s-bpm-val').textContent = bpmEl.value; if (activeScheduler) activeScheduler.setBpm(+bpmEl.value); };
    const btn = document.getElementById('s-start');
    function stopStrum() {
      stopActive(); btn.textContent = '▶ Start';
      if (timerIv) clearInterval(timerIv); timerIv = null;
    }
    btn.onclick = () => {
      if (activeScheduler) { stopStrum(); return; }
      const p = STRUM_PATTERNS[sel.value];
      const beats = p.beats || 4;
      let slot = -1;
      activeScheduler = Audio.makeScheduler({
        bpm: +bpmEl.value, beats, subdiv: 2, sound: false,
        onTick: (beat, sub, at, total) => {
          slot = total % p.slots.length;
          const v = p.slots[slot];
          if (v !== '-') Audio.tick(Audio.ac().currentTime, v);
          if (sub === 0) Audio.click(Audio.ac().currentTime, beat === 0);
          draw(slot);
        },
      });
      activeScheduler.start();
      btn.textContent = '⏸ Stop';
      elapsed = 0;
      timerIv = trackTimer(setInterval(() => {
        elapsed++;
        const t = document.getElementById('s-timer');
        if (!t) { clearInterval(timerIv); return; }
        if (minutes) {
          const left = minutes * 60 - elapsed;
          t.textContent = left > 0 ? '⏱ ' + fmtTime(left) + ' to go' : '';
          if (left <= 0) { stopStrum(); State.addXP(5, 'Strum practice'); if (ActivityCtx) completeCtx(); }
        } else t.textContent = '⏱ ' + fmtTime(elapsed);
      }, 1000));
    };
  },
};

// ---------------------------------------------------------------- ONE-MINUTE CHANGES
Views.changes = {
  render(a, b, target) {
    const ids = Object.keys(CHORDS);
    const selA = a || 'Em', selB = b || 'Am';
    const opts = (sel) => ids.map(id => `<option ${id === sel ? 'selected' : ''}>${id}</option>`).join('');
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>One-Minute Changes</h1></div>
    <div class="card tuner-card">
      <div class="pair-row">
        <select id="c-a" class="select">${opts(selA)}</select>
        <span class="pair-arrow">⇄</span>
        <select id="c-b" class="select">${opts(selB)}</select>
      </div>
      <div class="pair-diagrams" id="c-diagrams"></div>
      <div class="changes-best muted" id="c-best"></div>
      <div class="tuner-note" id="c-count" style="display:none">0</div>
      <div class="muted" id="c-timer"></div>
      <button class="btn primary big-btn" id="c-start">▶ Start 60-second drill</button>
      <button class="btn tap-btn" id="c-tap" style="display:none">TAP on every change 🎸</button>
      <p class="muted small">Form chord A, strum once, switch to B, strum once — tap the big button (or press space) at every switch. Sloppy is fine: chasing speed is what builds the muscle memory.</p>
    </div>`;
  },
  wire(a, b, target) {
    const tgt = +(target || 0);
    const elA = document.getElementById('c-a'), elB = document.getElementById('c-b');
    const drawPair = () => {
      document.getElementById('c-diagrams').innerHTML = chordSVG(elA.value, 110) + chordSVG(elB.value, 110);
      const best = State.bestFor([elA.value, elB.value]);
      document.getElementById('c-best').innerHTML = `Personal best: <b>${best}</b>${tgt ? ' · today’s target: <b>' + tgt + '</b>' : ''}`;
    };
    drawPair();
    elA.onchange = drawPair; elB.onchange = drawPair;
    let running = false, count = 0, left = 60, iv = null;
    const startBtn = document.getElementById('c-start'), tapBtn = document.getElementById('c-tap');
    const countEl = document.getElementById('c-count'), timerEl = document.getElementById('c-timer');
    const tap = () => {
      if (!running) return;
      count++;
      countEl.textContent = count;
      countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop');
    };
    tapBtn.onclick = tap;
    this._keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); tap(); } };
    document.addEventListener('keydown', this._keyHandler);
    const finish = () => {
      running = false;
      clearInterval(iv);
      document.removeEventListener('keydown', this._keyHandler);
      tapBtn.style.display = 'none';
      startBtn.style.display = '';
      startBtn.textContent = '↻ Go again';
      const pair = [elA.value, elB.value];
      const isRecord = State.recordChanges(pair, count);
      const hitTarget = tgt && count >= tgt;
      timerEl.innerHTML = `<b>${count} changes!</b> ${isRecord ? '🏆 NEW PERSONAL BEST!' : ''} ${hitTarget ? '✓ Target hit!' : tgt ? '(target was ' + tgt + ' — again!)' : ''}`;
      if (isRecord) confetti(80);
      State.addXP(Math.min(40, 10 + count), `Changes ${pair[0]}↔${pair[1]}`);
      drawPair();
      if (ActivityCtx) completeCtx();
    };
    startBtn.onclick = () => {
      count = 0; left = 60; running = false;
      startBtn.style.display = 'none';
      countEl.style.display = ''; countEl.textContent = '3';
      let cd = 3;
      const cdIv = trackTimer(setInterval(() => {
        cd--;
        if (cd > 0) { countEl.textContent = cd; Audio.click(Audio.ac().currentTime, false); }
        else {
          clearInterval(cdIv);
          Audio.click(Audio.ac().currentTime, true);
          running = true; countEl.textContent = '0';
          tapBtn.style.display = '';
          iv = trackTimer(setInterval(() => {
            left--;
            timerEl.textContent = '⏱ ' + left + 's';
            if (left <= 10 && left > 0) Audio.click(Audio.ac().currentTime, false);
            if (left <= 0) finish();
          }, 1000));
        }
      }, 800));
    };
  },
};

// ---------------------------------------------------------------- QUIZ
Views.quiz = {
  render(id) {
    const qz = QUIZZES[id];
    if (!qz) return '<p>Unknown quiz.</p>';
    return `
    <div class="day-head"><button class="icon-btn" onclick="history.back()">‹</button><h1>${esc(qz.name)}</h1></div>
    <div id="quiz-box" class="card tuner-card"></div>`;
  },
  wire(id) {
    const qz = QUIZZES[id];
    const box = document.getElementById('quiz-box');
    let qi = 0, score = 0;
    const showQ = () => {
      const q = qz.questions[qi];
      const order = q.a.map((_, i) => i).sort(() => Math.random() - 0.5);
      box.innerHTML = `
        <div class="muted small">Question ${qi + 1} of ${qz.questions.length}</div>
        <h2 class="quiz-q">${esc(q.q)}</h2>
        ${order.map(i => `<button class="btn quiz-opt" data-i="${i}">${esc(q.a[i])}</button>`).join('')}`;
      box.querySelectorAll('.quiz-opt').forEach(btn => btn.onclick = () => {
        const correct = +btn.dataset.i === q.c;
        if (correct) score++;
        btn.classList.add(correct ? 'right' : 'wrong');
        box.querySelectorAll('.quiz-opt').forEach(o => { o.disabled = true; if (+o.dataset.i === q.c) o.classList.add('right'); });
        setTimeout(() => { qi++; qi < qz.questions.length ? showQ() : showResult(); }, 900);
      });
    };
    const showResult = () => {
      const pct = Math.round(score / qz.questions.length * 100);
      State.recordQuiz(id, pct);
      State.addXP(10 + score * 5, qz.name);
      if (pct === 100) confetti(100);
      box.innerHTML = `
        <div class="tuner-note ${pct >= 80 ? 'good' : ''}">${pct}%</div>
        <h2>${pct === 100 ? '🎓 Perfect!' : pct >= 80 ? '🎉 Great job!' : pct >= 60 ? '👍 Solid!' : '📚 Review and retry!'}</h2>
        <p class="muted">${score} of ${qz.questions.length} correct</p>
        <div class="btn-row">
          ${pct < 100 ? '<button class="btn" id="quiz-retry">↻ Try again</button>' : ''}
          ${ActivityCtx ? '<button class="btn primary" id="quiz-done">Continue ✓</button>' : '<button class="btn primary" onclick="history.back()">Done</button>'}
        </div>`;
      const r = document.getElementById('quiz-retry');
      if (r) r.onclick = () => { qi = 0; score = 0; showQ(); };
      const d = document.getElementById('quiz-done');
      if (d) d.onclick = () => completeCtx();
    };
    showQ();
  },
};

// ---------------------------------------------------------------- PROFILE / AWARDS
Views.profile = {
  render() {
    const li = State.levelInfo();
    const bests = Object.entries(State.data.changeBests).sort((x, y) => y[1] - x[1]);
    let out = `
    <div class="day-head"><button class="icon-btn" onclick="location.hash='#/home'">‹</button><h1>Your Trophy Room</h1></div>
    <div class="card">
      <div class="level-line"><b>Level ${li.n} — ${li.title}</b><span>${State.data.xp} XP</span></div>
      <div class="bar"><div class="bar-fill" style="width:${Math.round(li.progress * 100)}%"></div></div>
      <div class="chip-row" style="margin-top:10px">
        <span class="chip">🔥 ${State.streak()}-day streak</span>
        <span class="chip">📅 ${Object.keys(State.data.completedDays).length}/30 days</span>
        <span class="chip">🎸 ${Object.keys(State.data.learnedChords).length} chords</span>
        <span class="chip">🎵 ${Object.keys(State.data.playedSongs).length} songs</span>
      </div>
    </div>
    <h2 class="section-title">Achievements</h2><div class="ach-grid">`;
    ACHIEVEMENTS.forEach(a => {
      const got = State.data.achievements[a.id];
      out += `<div class="ach ${got ? 'got' : ''}" title="${esc(a.desc)}">
        <div class="ach-icon">${a.icon}</div><b>${esc(a.name)}</b><span class="muted small">${got ? got : esc(a.desc)}</span></div>`;
    });
    out += `</div>`;
    if (bests.length) {
      out += `<h2 class="section-title">Chord-change records</h2><div class="card">`;
      bests.slice(0, 10).forEach(([pair, n]) => {
        out += `<div class="best-row"><span>${pair.replace('|', ' ⇄ ')}</span><b>${n}</b></div>`;
      });
      out += `</div>`;
    }
    out += `
    <h2 class="section-title">Data</h2>
    <div class="card btn-row">
      <button class="btn" id="btn-export">⬇ Export backup</button>
      <button class="btn" id="btn-import">⬆ Import backup</button>
      <button class="btn danger" id="btn-reset">Reset everything</button>
      <input type="file" id="import-file" accept=".json" style="display:none">
    </div>
    <p class="muted small">Progress lives in this browser. Export a backup if you switch devices.</p>`;
    return out;
  },
  wire() {
    document.getElementById('btn-export').onclick = () => {
      const blob = new Blob([State.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'guitarguru-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
    };
    const fileEl = document.getElementById('import-file');
    document.getElementById('btn-import').onclick = () => fileEl.click();
    fileEl.onchange = async () => {
      try {
        State.importJSON(await fileEl.files[0].text());
        toast('✓ Backup restored!');
        App.render();
      } catch (e) { toast('⚠️ Not a valid backup file'); }
    };
    document.getElementById('btn-reset').onclick = () => {
      if (confirm('Really erase ALL progress? This cannot be undone.')) { State.resetAll(); App.render(); }
    };
  },
};
