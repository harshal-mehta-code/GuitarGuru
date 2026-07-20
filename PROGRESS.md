# GuitarGuru — Build Progress Log

> Session continuity doc. If a new Claude session picks this up, read this file first.

## Mission
One-shot gamified, addictive, interactive acoustic-guitar learning web app for a complete
beginner. Goal: casually playing guitar in 30 days. Deployed to a public URL.

## Deployment target
- **URL:** https://harshal-mehta-code.github.io/GuitarGuru/
- Repo: `harshal-mehta-code/GuitarGuru` (public), branch `claude/gamified-guitar-learning-app-kfs72s`
- Deploy: classic GitHub Pages serving the `gh-pages` branch. Pushing `gh-pages`
  auto-enabled Pages and triggers the built-in "pages build and deployment" run.
  To ship updates: `git push origin <branch>:gh-pages` (also mirror to `main`).
  An Actions-based deploy workflow was tried first but its runs hit
  `startup_failure` twice (repo initially had no default branch; Actions was flaky),
  so it was removed in favor of the classic path, which is verified working.

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
- [x] Pages live (classic gh-pages branch deployment)
- [x] Smoke-tested in headless Chromium

## Status: COMPLETE — deployed and verified
- Live: https://harshal-mehta-code.github.io/GuitarGuru/ ("pages build and deployment"
  run succeeded; deploy job green). The runtime container cannot reach github.io
  directly (egress policy), so liveness was confirmed via the successful Pages
  deployment run, not a direct fetch.
- Backup copy (single-file build of the same app) published as a Claude artifact:
  https://claude.ai/code/artifact/79860964-d0fe-4856-9f84-441db30ee0da
- Branches `claude/gamified-guitar-learning-app-kfs72s` (development), `main` and
  `gh-pages` (deploy) all point at the same content — keep them in sync.

## If resuming
1. `git fetch origin claude/gamified-guitar-learning-app-kfs72s` and check out.
2. Check Actions runs on the repo for Pages deploy status (workflow: "Deploy to GitHub Pages").
3. Update the checklist above and this status line as you go.
