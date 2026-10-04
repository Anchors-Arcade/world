import { supabase } from '../config/supabase.js';
import { DEFAULT_AVATAR, AVATAR_COLORS } from '../config/game.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Where the e-mail confirmation link sends the player back to: the page the game is served from RIGHT NOW
// (e.g. http://localhost:5173/ while developing, https://you.github.io/repo/ when deployed).
// Without this Supabase falls back to its dashboard "Site URL", which defaults to http://localhost:3000 -> "site can't be reached".
// This URL must ALSO be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs (see README).
export const redirectUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');

// Returns a session, or null when the project requires e-mail confirmation first (the player must click the link in the e-mail).
export async function register(email, password, username) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Username: 3–16 letters, numbers or _');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: redirectUrl() } });
  if (error) throw error;
  return data.session || null;
}

export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } });
  if (error) throw error;
}

// After clicking the e-mail link the browser lands back here with the result in the URL (#access_token=... or #error=...).
// supabase-js turns a good link into a session by itself; this just reads the outcome so we can say something friendly,
// and tidies the address bar.
export function readAuthRedirect() {
  const raw = (location.hash.startsWith('#') ? location.hash.slice(1) : '') || location.search.slice(1);
  const q = new URLSearchParams(raw);
  const out = { confirmed: q.get('type') === 'signup' && !!q.get('access_token'), error: null };
  if (q.get('error') || q.get('error_code')) {
    out.error = q.get('error_code') === 'otp_expired'
      ? 'That confirmation link has expired or was already used. Log in, or request a new e-mail below.'
      : (q.get('error_description') || 'The confirmation link did not work.').replace(/\+/g, ' ');
  }
  if (out.confirmed || out.error || q.get('code')) history.replaceState(null, '', location.pathname);
  return out;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export const logout = () => supabase?.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;

// Profile is created by a DB trigger; retry briefly in case of lag.  (needs supabase/phase6.sql)
export async function fetchProfile(userId) {
  for (let i = 0; i < 5; i++) {
    // Phase 6: other players can no longer read coins/current_room from the table, so you fetch your own full row via a function.
    const { data, error } = await supabase.rpc('get_my_profile');
    if (error) throw error;
    if (data && data.id === userId) return data;
    await sleep(400);
  }
  throw new Error('Profile not found. Did you run supabase/schema.sql?');
}

export function savePlayerLocation(userId, room) {
  return supabase.from('profiles').update({ current_room: room }).eq('id', userId);
}

export function guestProfile(name = 'Guest') {
  const n = name.trim().slice(0, 16) || 'Guest';
  const color = AVATAR_COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return { id: 'guest', username: n, display_name: n, coins: 0, current_room: 'snowy_plaza',
    avatar_data: { ...DEFAULT_AVATAR, color }, guest: true };
}
