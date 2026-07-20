// GuitarGuru app: hash router + boot.
'use strict';

const App = (() => {
  // route table: pattern -> view name; params passed positionally to render/wire.
  const routes = [
    { re: /^#?\/?$|^#\/home$/, view: 'home' },
    { re: /^#\/journey$/, view: 'journey' },
    { re: /^#\/day\/(\d+)$/, view: 'day', num: true },
    { re: /^#\/chords$/, view: 'chords' },
    { re: /^#\/chord\/([\w#]+)$/, view: 'chord' },
    { re: /^#\/songs$/, view: 'songs' },
    { re: /^#\/song\/([\w-]+)$/, view: 'song' },
    { re: /^#\/tools$/, view: 'tools' },
    { re: /^#\/tools\/tuner$/, view: 'tuner' },
    { re: /^#\/tools\/metronome$/, view: 'metronome' },
    { re: /^#\/tools\/strum(?:\/([\w-]+)\/(\d+)\/(\d+))?$/, view: 'strum' },
    { re: /^#\/tools\/changes(?:\/([\w#]+)\/([\w#]+)\/(\d+))?$/, view: 'changes' },
    { re: /^#\/quiz\/([\w-]+)$/, view: 'quiz' },
    { re: /^#\/profile$/, view: 'profile' },
  ];

  const NAV = [
    { hash: '#/home', icon: '🏠', label: 'Home', match: /^#\/(home)?$|^$/ },
    { hash: '#/journey', icon: '🗺️', label: 'Journey', match: /^#\/(journey|day)/ },
    { hash: '#/chords', icon: '🎸', label: 'Chords', match: /^#\/chord/ },
    { hash: '#/tools', icon: '🛠️', label: 'Tools', match: /^#\/tools|^#\/quiz/ },
    { hash: '#/songs', icon: '🎵', label: 'Songs', match: /^#\/song/ },
  ];

  function render() {
    stopActive();
    const h = location.hash || '#/home';
    let view = 'home', params = [];
    for (const r of routes) {
      const m = h.match(r.re);
      if (m) { view = r.view; params = m.slice(1).map(x => r.num && x != null ? +x : x); break; }
    }
    // trainers reached without their deep-link params keep no stale activity context
    const v = Views[view] || Views.home;
    const main = document.getElementById('main');
    main.innerHTML = v.render(...params);
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    if (v.wire) v.wire(...params);
    // bottom nav active state
    document.getElementById('nav').innerHTML = NAV.map(n =>
      `<button class="nav-btn ${n.match.test(h) ? 'active' : ''}" onclick="location.hash='${n.hash}'">
        <span class="nav-icon">${n.icon}</span><span>${n.label}</span></button>`).join('');
  }

  function boot() {
    wireCelebrations();
    window.addEventListener('hashchange', render);
    document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    // first-run welcome
    if (!State.data.startDate && !Object.keys(State.data.completedActivities).length && !sessionStorage.getItem('gg_welcomed')) {
      sessionStorage.setItem('gg_welcomed', '1');
      showModal(`
        <div class="welcome">
          <div class="welcome-logo">🎸</div>
          <h1>Welcome to GuitarGuru</h1>
          <p>Zero to <b>casually playing guitar in 30 days</b> — about 15 focused minutes a day.</p>
          <ul class="welcome-list">
            <li>📅 A guided quest for each day</li>
            <li>⚡ Science-backed drills (one-minute changes, spaced review)</li>
            <li>🎯 Real tools: tuner, metronome, strum trainer</li>
            <li>🔥 Streaks, XP, levels & achievements to keep you hooked</li>
          </ul>
          <p class="muted small">All you need: any acoustic guitar and a pick (or your thumb).</p>
          <button class="btn primary big-btn" onclick="closeModal();location.hash='#/day/1'">Start Day 1 →</button>
        </div>`);
    }
    render();
  }

  return { render, boot };
})();

document.addEventListener('DOMContentLoaded', App.boot);
