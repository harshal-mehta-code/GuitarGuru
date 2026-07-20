# GuitarGuru — Build Progress Log

> Session continuity doc. If a new Claude session picks this up, read this file first.

## Mission
One-shot gamified, addictive, interactive acoustic-guitar learning web app for a complete
beginner. Goal: casually playing guitar in 30 days. Deployed to a public URL.

## Deployment target
- **URL:** https://harshal-mehta-code.github.io/GuitarGuru/
- Repo: `harshal-mehta-code/GuitarGuru` (public), branch `claude/gamified-guitar-learning-app-kfs72s`
- Deploy: GitHub Actions workflow `.github/workflows/deploy.yml` → GitHub Pages
  (uses `actions/configure-pages@v5` with `enablement: true` to auto-enable Pages).
  Triggers on push to the branch above.

## Architecture (no build step, plain static files)
- `index.html` — app shell, all views mounted by JS
- `css/style.css` — full design system (dark, amber accent, mobile-first, bottom nav)
- `js/data.js` — chord library, 30-day curriculum, songs, strum patterns, achievements, levels, quizzes
- `js/audio.js` — Web Audio: metronome (lookahead scheduler), Karplus-Strong chord synth, mic tuner (autocorrelation)
- `js/state.js` — localStorage persistence, XP/levels/streaks/achievements engine, export/import
- `js/components.js` — SVG chord diagram renderer, confetti, toasts, modals
- `js/views.js` — all screens: Home dashboard, Journey (30-day map), Day detail, Chords, Tools (tuner/metronome/strum/changes), Songs
- `js/app.js` — hash router + init

## Feature checklist
- [x] Plan + repo docs
- [x] Curriculum data (30 days, 4 phases, activities w/ tool deep-links)
- [x] Chord library data (18 chords) + SVG diagrams + synthesized chord playback
- [x] Songs (10 traditional/public-domain, chord charts + play-along)
- [x] Tuner (getUserMedia + autocorrelation, needs HTTPS — Pages is HTTPS)
- [x] Metronome (40–200 bpm, 4/4 3/4 6/8, accent, visual pulse)
- [x] Strumming trainer (patterns synced to metronome)
- [x] One-minute chord change trainer (tap counting, personal bests, targets)
- [x] Gamification: XP, 12 levels, streaks (+freeze), 24 achievements, daily quests
- [x] Quizzes (days 7/14/21/28/30)
- [x] Progress persistence + export/import
- [ ] Deploy workflow + Pages live
- [x] Smoke-tested in headless Chromium

## Status: App complete & pushed; verifying Pages deploy
Note: the push event did NOT auto-trigger the workflow (proxy-pushed commits may not fire
push events) — triggered manually via workflow_dispatch instead. If future pushes don't
deploy, run the "Deploy to GitHub Pages" workflow manually on the branch.

## If resuming
1. `git fetch origin claude/gamified-guitar-learning-app-kfs72s` and check out.
2. Check Actions runs on the repo for Pages deploy status (workflow: "Deploy to GitHub Pages").
3. Update the checklist above and this status line as you go.
