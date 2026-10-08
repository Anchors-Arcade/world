// Phase 22 — the job HUD: one small card, bottom-left, while a shift is running. It shows the
// job, the objective, progress, points, the coins they currently add up to, and the shift clock.
// The same widget doubles as the café's ingredient strip ("job-panel" events), so jobs never
// grow a menu of their own — the world stays the screen.
const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};

export function mountJobHUD(root, game) {
  const el = document.createElement('div');
  el.className = 'jobhud';
  el.innerHTML = `
    <div class="jh-head"><span class="jh-emoji">💼</span><b class="jh-name"></b><span class="jh-clock">⏱</span></div>
    <div class="jh-obj"></div>
    <div class="jh-row"><div class="jh-prog"><i></i></div><span class="jh-count"></span></div>
    <div class="jh-meta"><span class="jh-pts"></span><span class="jh-coins"></span></div>
    <div class="jh-hint"></div>
    <div class="jh-panel"></div>`;
  root.appendChild(el);

  const q = (s) => el.querySelector(s);
  const bar = q('.jh-prog > i');
  const hide = () => { el.classList.remove('on'); el.dataset.on = ''; };

  // The shift state, a few times a second (see JobSystem.hud()).
  const onHud = (d) => {
    if (!d.on || document.getElementById('ui')?.classList.contains('editing')) return hide();
    el.classList.add('on');
    const j = d.job;
    q('.jh-emoji').textContent = j.emoji;
    q('.jh-name').textContent = j.name;
    q('.jh-clock').textContent = `⏱ ${fmt(d.timeLeftMs)}`;
    q('.jh-clock').classList.toggle('low', d.timeLeftMs < 20000);
    q('.jh-obj').textContent = d.objective || '';
    bar.style.width = `${Math.round((Math.min(d.done, d.total) / Math.max(1, d.total)) * 100)}%`;
    q('.jh-count').textContent = `${Math.min(d.done, d.total)}/${d.total}`;
    q('.jh-pts').textContent = `⭐ ${d.points}`;
    q('.jh-coins').textContent = `≈ ⚓${d.coins}`;
    // the shift clock doubles as a thin bar across the very bottom
    el.style.setProperty('--jh-shift', `${Math.round((d.timeLeftMs / Math.max(1, d.shiftMs)) * 100)}%`);
  };

  // A contextual button strip (the café's ingredients). Clicks go straight back to the job.
  const onPanel = (d) => {
    const p = q('.jh-panel');
    if (!d.on) { p.innerHTML = ''; p.classList.remove('on'); return; }
    p.classList.add('on');
    p.innerHTML = `<div class="jh-ptitle">${d.title || ''}</div>` +
      (d.items || []).map((i) =>
        `<button class="jh-item ${i.done ? 'done' : ''}" data-key="${i.key}"><span>${i.emoji}</span>${i.label}</button>`).join('');
    p.querySelectorAll('.jh-item').forEach((b) => (b.onclick = () => game.events.emit('job-panel-click', b.dataset.key)));
    if (d.err) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
  };

  // One-off instructions from the job ("add the ingredients with the buttons below").
  const onHint = (d) => { q('.jh-hint').textContent = d?.text || ''; };

  game.events.on('job-hud', onHud);
  game.events.on('job-panel', onPanel);
  game.events.on('job-hud-hint', onHint);
  return {
    hide,
    destroy() {
      game.events.off('job-hud', onHud);
      game.events.off('job-panel', onPanel);
      game.events.off('job-hud-hint', onHint);
      el.remove();
    },
  };
}
