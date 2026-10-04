import * as auth from '../database/auth.js';
import { isConfigured } from '../config/supabase.js';

export function mountAuth(root, onEnter) {
  let mode = 'login';
  const el = document.createElement('div');
  el.className = 'auth';
  root.appendChild(el);

  const render = () => {
    el.innerHTML = `
    <div class="card">
      <h1 class="logo">Anchors <span>World</span> ⚓</h1>
      <p class="tag">A snowy town full of friends.</p>
      ${isConfigured ? '' : `<div class="notice"><b>Supabase isn't set up yet.</b> Add your keys in <code>src/config/keys.js</code>. You can still look around as a guest.</div>`}
      <div class="tabs"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Log in</button><button data-m="register" class="${mode === 'register' ? 'on' : ''}">Create account</button></div>
      <form id="f" novalidate>
        ${mode === 'register' ? `<label>Username</label><input id="u" maxlength="16" autocomplete="username" placeholder="SnowyFox_7">` : ''}
        <label>Email</label><input id="e" type="email" autocomplete="email">
        <label>Password</label><input id="p" type="password" minlength="6" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">
        <button class="btn" ${isConfigured ? '' : 'disabled'}>${mode === 'login' ? 'Enter the world' : 'Create my account'}</button>
      </form>
      <button class="btn alt" id="g">Look around as a guest (not saved)</button>
      <div class="msg" id="m"></div>
    </div>`;
    el.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { mode = b.dataset.m; render(); }));
    const msg = (t, ok) => { const m = el.querySelector('#m'); m.textContent = t; m.className = 'msg' + (ok ? ' ok' : ''); };

    el.querySelector('#g').onclick = () => {
      el.remove();
      onEnter(auth.guestProfile('Guest' + Math.floor(Math.random() * 900 + 100)));
    };
    el.querySelector('#f').onsubmit = async (ev) => {
      ev.preventDefault();
      if (!isConfigured) return;
      const email = el.querySelector('#e').value.trim(), pw = el.querySelector('#p').value;
      try {
        msg('One moment…', true);
        const session = mode === 'login' ? await auth.login(email, pw) : await auth.register(email, pw, el.querySelector('#u').value.trim());
        const profile = await auth.fetchProfile(session.user.id);
        el.remove();
        onEnter(profile);
      } catch (e) { msg(e.message || 'Something went wrong.'); }
    };
  };
  render();
  return el;
}
