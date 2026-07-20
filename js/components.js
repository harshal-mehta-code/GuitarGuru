// GuitarGuru UI components: chord diagram SVG, toasts, confetti, modal helpers.
'use strict';

// Render a chord diagram as an SVG string. size ~ width in px.
function chordSVG(chordId, size = 120) {
  const ch = CHORDS[chordId];
  if (!ch) return '';
  const frets = ch.frets, fingers = ch.fingers;
  const W = size, H = size * 1.22;
  const left = W * 0.14, right = W * 0.94, top = H * 0.18, bottom = H * 0.92;
  const nStr = 6, nFret = 4;
  const sw = (right - left) / (nStr - 1);
  const fh = (bottom - top) / nFret;
  const maxFret = Math.max(...frets.filter(f => f > 0), 1);
  const baseFret = maxFret > 4 ? Math.min(...frets.filter(f => f > 0)) : 1;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${size}" style="max-width:100%">`;
  // strings
  for (let i = 0; i < nStr; i++) {
    const x = left + i * sw;
    out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="var(--diagram-line)" stroke-width="${1 + (5 - i) * 0.25}"/>`;
  }
  // frets
  for (let i = 0; i <= nFret; i++) {
    const y = top + i * fh;
    out += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="var(--diagram-line)" stroke-width="${i === 0 && baseFret === 1 ? 4 : 1.2}"/>`;
  }
  if (baseFret > 1) out += `<text x="${left - 8}" y="${top + fh * 0.65}" font-size="${W*0.09}" fill="var(--muted)" text-anchor="end">${baseFret}</text>`;
  // markers
  for (let i = 0; i < nStr; i++) {
    const x = left + i * sw;
    const f = frets[i];
    if (f === -1) {
      out += `<text x="${x}" y="${top - 8}" font-size="${W*0.1}" fill="var(--muted)" text-anchor="middle" font-weight="700">✕</text>`;
    } else if (f === 0) {
      out += `<circle cx="${x}" cy="${top - 12}" r="${W*0.045}" fill="none" stroke="var(--text)" stroke-width="1.6"/>`;
    } else {
      const rel = f - baseFret + 1;
      const y = top + (rel - 0.5) * fh;
      out += `<circle cx="${x}" cy="${y}" r="${W*0.075}" fill="var(--accent)"/>`;
      if (fingers[i]) out += `<text x="${x}" y="${y + W*0.033}" font-size="${W*0.085}" fill="#1a1108" text-anchor="middle" font-weight="800">${fingers[i]}</text>`;
    }
  }
  out += '</svg>';
  return out;
}

// --- Toasts ---
function toast(html, cls = '', ms = 2600) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = html;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, ms);
}

// --- Confetti ---
function confetti(count = 120) {
  const cv = document.getElementById('confetti');
  const cx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  cv.style.display = 'block';
  const colors = ['#f5a524','#f31260','#17c964','#006fee','#7828c8','#f9c97c'];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
    size: 5 + Math.random() * 7, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frames = 0;
  (function anim() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.05;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
      cx.fillStyle = p.color; cx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      cx.restore();
    });
    frames++;
    if (frames < 220) requestAnimationFrame(anim);
    else cv.style.display = 'none';
  })();
}

// --- Modal ---
function showModal(html) {
  const m = document.getElementById('modal');
  m.querySelector('.modal-body').innerHTML = html;
  m.classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

// --- Celebration wiring ---
function wireCelebrations() {
  Bus.on('xp', ({ amount, reason }) => toast(`<b>+${amount} XP</b> ${reason ? '· ' + reason : ''}`, 'xp'));
  Bus.on('levelup', ({ level, title }) => {
    confetti(140);
    toast(`<div class="big">⬆️ Level ${level}!</div><div>You are now a <b>${title}</b></div>`, 'level', 4200);
  });
  Bus.on('achievement', (a) => {
    confetti(90);
    toast(`<div class="big">${a.icon} Achievement unlocked!</div><div><b>${a.name}</b> — ${a.desc}</div>`, 'ach', 4200);
  });
  Bus.on('daycomplete', ({ day }) => {
    confetti(200);
    toast(`<div class="big">🏆 Day ${day} complete!</div><div>See you tomorrow — the streak is everything.</div>`, 'level', 4600);
  });
  Bus.on('chordlearned', ({ id }) => toast(`🎸 New chord learned: <b>${id}</b>`, 'ach'));
}
