// GuitarGuru state: localStorage persistence + XP/levels/streaks/achievements engine.
'use strict';

const State = (() => {
  const KEY = 'guitarguru_v1';

  const fresh = () => ({
    xp: 0,
    startDate: null,                 // ISO date of day-1 completion start
    completedActivities: {},         // "day:idx" -> true
    completedDays: {},               // day -> ISO date completed
    learnedChords: {},               // chordId -> ISO date
    playedSongs: {},                 // songId -> count
    changeBests: {},                 // "A|B" (sorted) -> best count
    changeHistory: [],               // {pair, count, date} last 200
    quizBests: {},                   // quizId -> best pct
    achievements: {},                // id -> ISO date
    practiceDates: {},               // "YYYY-MM-DD" -> minutes-ish credit
    streakFreezes: 1,                // one free freeze
    metronomeSessions: 0,
    tunerUsed: false,
    settings: { name: 'Player' },
  });

  let s = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* corrupted -> start fresh */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  const todayStr = () => new Date().toISOString().slice(0, 10);

  // --- XP & levels ---
  function level() {
    let lv = 0;
    for (let i = 0; i < LEVELS.length; i++) if (s.xp >= LEVELS[i].xp) lv = i;
    return lv;
  }
  function levelInfo() {
    const lv = level();
    const cur = LEVELS[lv];
    const next = LEVELS[lv + 1];
    return {
      n: lv + 1, title: cur.title,
      progress: next ? (s.xp - cur.xp) / (next.xp - cur.xp) : 1,
      xpInto: s.xp - cur.xp, xpNeed: next ? next.xp - cur.xp : 0, maxed: !next,
    };
  }
  function addXP(amount, reason) {
    const before = level();
    s.xp += amount;
    s.practiceDates[todayStr()] = (s.practiceDates[todayStr()] || 0) + 1;
    const after = level();
    save();
    Bus.emit('xp', { amount, reason });
    if (after > before) Bus.emit('levelup', { level: after + 1, title: LEVELS[after].title });
    checkAchievements();
  }

  // --- Streaks ---
  function streak() {
    const dates = Object.keys(s.practiceDates).sort();
    if (!dates.length) return 0;
    let n = 0;
    const d = new Date();
    // today counts if practiced; otherwise streak counted from yesterday
    if (!s.practiceDates[todayStr()]) d.setDate(d.getDate() - 1);
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (s.practiceDates[key]) { n++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  }
  function practicedToday() { return !!s.practiceDates[todayStr()]; }

  // --- Activity / day completion ---
  function isActivityDone(day, idx) { return !!s.completedActivities[day + ':' + idx]; }
  function completeActivity(day, idx) {
    const key = day + ':' + idx;
    if (s.completedActivities[key]) return false;
    s.completedActivities[key] = true;
    const act = DAYS[day - 1].activities[idx];
    if (act.type === 'chord' && act.chord) learnChord(act.chord);
    if (act.type === 'song' && act.song) playSong(act.song);
    if (act.type === 'tune') { s.tunerUsed = true; }
    addXP(act.xp || 10, act.title);
    // day complete?
    const d = DAYS[day - 1];
    const all = d.activities.every((_, i) => s.completedActivities[day + ':' + i]);
    if (all && !s.completedDays[day]) {
      s.completedDays[day] = todayStr();
      if (!s.startDate) s.startDate = todayStr();
      save();
      Bus.emit('daycomplete', { day });
    }
    save();
    checkAchievements();
    return true;
  }
  function isDayDone(day) { return !!s.completedDays[day]; }
  function currentDay() {
    for (let i = 1; i <= 30; i++) if (!s.completedDays[i]) return i;
    return 30;
  }
  function dayProgress(day) {
    const d = DAYS[day - 1];
    const done = d.activities.filter((_, i) => isActivityDone(day, i)).length;
    return { done, total: d.activities.length };
  }

  // --- Skills ---
  function learnChord(id) {
    if (!s.learnedChords[id]) { s.learnedChords[id] = todayStr(); save(); Bus.emit('chordlearned', { id }); }
  }
  function playSong(id) { s.playedSongs[id] = (s.playedSongs[id] || 0) + 1; save(); }
  function pairKey(pair) { return [...pair].sort().join('|'); }
  function recordChanges(pair, count) {
    const key = pairKey(pair);
    const prevBest = s.changeBests[key] || 0;
    if (count > prevBest) s.changeBests[key] = count;
    s.changeHistory.push({ pair: key, count, date: new Date().toISOString() });
    if (s.changeHistory.length > 200) s.changeHistory = s.changeHistory.slice(-200);
    save();
    checkAchievements();
    return count > prevBest;
  }
  function bestFor(pair) { return s.changeBests[pairKey(pair)] || 0; }
  function recordQuiz(id, pct) {
    if (pct > (s.quizBests[id] || 0)) s.quizBests[id] = pct;
    save(); checkAchievements();
  }
  function bumpMetronome() { s.metronomeSessions++; save(); checkAchievements(); }
  function markTunerUsed() { if (!s.tunerUsed) { s.tunerUsed = true; save(); checkAchievements(); } }

  // --- Achievements ---
  function unlock(id) {
    if (s.achievements[id]) return;
    s.achievements[id] = todayStr();
    save();
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) Bus.emit('achievement', a);
  }
  function checkAchievements() {
    const nChords = Object.keys(s.learnedChords).length;
    const nSongs = Object.keys(s.playedSongs).length;
    const maxChanges = Math.max(0, ...Object.values(s.changeBests));
    const st = streak();
    if (s.completedDays[1]) unlock('first-steps');
    if (s.tunerUsed) unlock('tuned-up');
    if (nChords >= 1) unlock('first-chord');
    if (nChords >= 5) unlock('collector-5');
    if (nChords >= 10) unlock('collector-10');
    if (nChords >= Object.keys(CHORDS).length) unlock('collector-all');
    if (nSongs >= 1) unlock('first-song');
    if (nSongs >= 3) unlock('songbird-3');
    if (nSongs >= 6) unlock('songbird-6');
    if (st >= 3) unlock('streak-3');
    if (st >= 7) unlock('streak-7');
    if (st >= 14) unlock('streak-14');
    if (st >= 30) unlock('streak-30');
    if (maxChanges >= 30) unlock('changes-30');
    if (maxChanges >= 45) unlock('changes-45');
    if (maxChanges >= 60) unlock('changes-60');
    if (s.metronomeSessions >= 10) unlock('metronome-10');
    if (s.playedSongs['blues12']) unlock('blues');
    if (s.learnedChords['F']) unlock('f-conqueror');
    if (Object.values(s.quizBests).some(p => p >= 100)) unlock('quiz-ace');
    if (level() + 1 >= 5) unlock('level-5');
    if (level() + 1 >= 10) unlock('level-10');
    if ([1,2,3,4,5,6,7].every(d => s.completedDays[d])) unlock('week-1');
    if (Object.keys(s.completedDays).length >= 30) unlock('graduate');
  }

  // --- Export / import ---
  function exportJSON() { return JSON.stringify(s, null, 2); }
  function importJSON(text) {
    const obj = JSON.parse(text);
    if (typeof obj !== 'object' || obj === null || typeof obj.xp !== 'number') throw new Error('Not a GuitarGuru backup');
    s = Object.assign(fresh(), obj);
    save();
    return true;
  }
  function resetAll() { s = fresh(); save(); }

  return {
    get data() { return s; },
    level, levelInfo, addXP, streak, practicedToday,
    isActivityDone, completeActivity, isDayDone, currentDay, dayProgress,
    learnChord, playSong, recordChanges, bestFor, recordQuiz,
    bumpMetronome, markTunerUsed, checkAchievements,
    exportJSON, importJSON, resetAll, save,
  };
})();

// Tiny event bus for gamification popups.
const Bus = (() => {
  const handlers = {};
  return {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    emit(ev, data) { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) {} }); },
  };
})();
