# 🎸 GuitarGuru

**Zero to casually playing acoustic guitar in 30 days** — a gamified, interactive learning
app that runs entirely in your browser.

**▶ Play it now: https://harshal-mehta-code.github.io/GuitarGuru/**

Works on phone, tablet, and desktop. Best experienced on your phone, propped next to your guitar.

## What's inside

- **📅 30-day guided curriculum** in 4 phases — ~15 focused minutes a day, built on
  research-backed practice science: short daily sessions, one-minute chord-change drills,
  spaced review, early song-playing, and deliberate slow-fast-medium tempo work.
- **🎯 Tuner** — real microphone pitch detection (autocorrelation) with per-string reference tones.
- **🕰️ Metronome** — 40–200 bpm, 4/4 · 3/4 · 6/8, beat-1 accent, visual pulse.
- **🎵 Strum trainer** — visual pattern arrows synced to the beat, including the legendary
  "Old Faithful" (D-DU-UDU) and percussive chucks.
- **⚡ One-minute changes** — the #1 proven chord-learning drill, with tap counting,
  countdowns, personal bests and daily targets.
- **🎸 Chord library** — 18 chords with finger diagrams (SVG), difficulty, pro tips, and
  synthesized audio so you know what each chord should sound like.
- **🎤 Songbook** — 10 play-along songs (traditional/public domain) with a moving chord
  chart, now/next diagrams, and adjustable tempo.
- **🧠 Quizzes** on days 7, 14, 21, 28 and 30.
- **🔥 Gamification** — XP, 12 levels with titles, daily streaks, 24 achievements,
  confetti, and a Duolingo-style journey map.
- **💾 Progress tracking** — saved locally in your browser, with export/import backup.

## Tech

Plain HTML/CSS/JS — zero dependencies, zero build step. Web Audio API for the metronome,
chord synthesis (Karplus-Strong), and tuner. Deployed with classic GitHub Pages from the
`gh-pages` branch — to ship an update, push the new code to `gh-pages` and GitHub
rebuilds the site automatically.

Run locally: any static server, e.g. `python3 -m http.server` then open
http://localhost:8000. (The tuner needs HTTPS or localhost for mic access.)

## Development notes

See [PROGRESS.md](PROGRESS.md) for the build log and session-continuity notes.
