import { supabase } from '../config/supabase.js';
import { DEFAULT_AVATAR, AVATAR_COLORS } from '../config/game.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function register(email, password, username) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Username: 3–16 letters, numbers or _');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw error;
  if (!data.session) throw new Error('Check your email to confirm your account, then log in.');
  return data.session;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export const logout = () => supabase?.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;

// Profile is created by a DB trigger; retry briefly in case of lag.
export async function fetchProfile(userId) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data) return data;
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
