// Phase 21 — the Ideas button: a plain overlay with the ideas Google Form in an iframe.
// Nothing clever here on purpose: GitHub Pages serves this statically, the form is hosted by Google,
// and an iframe is the one thing that needs neither a server nor a build step.
export function createIdeasPanel(root) {
  const el = document.createElement('div');
  el.className = 'ideas-overlay'; el.hidden = true;
  el.innerHTML = `
    <div class="ideas-card" role="dialog" aria-label="Send your ideas">
      <header><h2>💡 Got an idea?</h2><button class="x" aria-label="Close">✕</button></header>
      <p class="ideas-note">Tell us what you want to see in Anchors World — new places, games, clothes, anything.</p>
      <iframe class="ideas-frame" src="https://forms.gle/vgHsPAT2WWAHUmL38" title="Ideas form" loading="lazy"></iframe>
    </div>`;
  root.appendChild(el);
  const close = () => { el.hidden = true; };
  el.querySelector('.x').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const onKey = (e) => { if (e.key === 'Escape' && !el.hidden) close(); };
  document.addEventListener('keydown', onKey);
  return {
    open() { el.hidden = false; },
    close,
    toggle() { el.hidden = !el.hidden; },
    isOpen: () => !el.hidden,
    destroy() { document.removeEventListener('keydown', onKey); el.remove(); },
  };
}
