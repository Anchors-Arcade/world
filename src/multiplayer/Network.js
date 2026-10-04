import { supabase } from '../config/supabase.js';

// Thin wrapper over TWO Supabase Realtime channels per player (kept to a minimum on purpose):
//  1. room:<id>  - the room you are standing in. Presence = who is here + outfit. Broadcast = positions + emotes (never stored).
//                  Phase 6 adds a postgres_changes binding for chat_messages of THIS room only, on the same channel.
//  2. social     - one global channel for the whole session. Presence = "I am online, in room X" (what friends read),
//                  plus postgres_changes for friend requests / friendships addressed to you.
// Nothing here polls the database.
export class Network {
  constructor(profile) { this.profile = profile; this.channel = null; this.active = false; this.me = null; this.social = null; this.socialActive = false; this.where = { r: null }; }
  get enabled() { return !!supabase && !this.profile.guest; }

  // ---------- room channel ----------
  join(roomId, me, cb) {
    this.leave();
    if (!this.enabled) return;
    const id = this.profile.id;
    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const out = {};
      for (const [key, metas] of Object.entries(ch.presenceState())) if (key !== id && metas.length) out[key] = metas[metas.length - 1];
      cb.onSync(out);
    });
    ch.on('presence', { event: 'join' }, ({ key }) => { if (key !== id) cb.onJoin?.(key); });
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => cb.onPos(payload));
    ch.on('broadcast', { event: 'emote' }, ({ payload }) => cb.onEmote?.(payload));
    // Chat: Realtime pushes only rows of this room, and only rows Row Level Security lets us see (not blocked/muted/hidden).
    if (cb.onChat) ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, ({ new: row }) => cb.onChat(row));
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') { this.active = true; ch.track(this.me); } });
    this.channel = ch; this.me = me;
  }

  updateMe(patch) { this.me = { ...this.me, ...patch }; if (this.active) this.channel.track(this.me); }
  sendPos(p) { if (this.active) this.channel.send({ type: 'broadcast', event: 'pos', payload: p }); }
  sendEmote(e) { if (this.active) this.channel.send({ type: 'broadcast', event: 'emote', payload: { id: this.profile.id, e } }); }

  leave() {
    if (this.channel) supabase.removeChannel(this.channel);
    this.channel = null; this.active = false;
  }

  // ---------- social channel (online status + friend notifications) ----------
  // Presence payload is deliberately tiny and public-safe: {r: room key | 'home' (own home) | 'private' (someone else's home) | null (location hidden)}.
  joinSocial(cb) {
    if (!this.enabled || this.social) return;
    const id = this.profile.id;
    const ch = supabase.channel('social', { config: { presence: { key: id } } });
    ch.on('presence', { event: 'sync' }, () => cb.onPresence(ch.presenceState()));
    const pg = (table, filter, event) => ch.on('postgres_changes', { event, schema: 'public', table, filter }, (p) => cb.onChange(table, p));
    pg('friend_requests', `receiver_id=eq.${id}`, 'INSERT');            // someone asked me
    pg('friend_requests', `sender_id=eq.${id}`, 'UPDATE');              // they answered my request
    pg('friendships', `user_id=eq.${id}`, 'INSERT');                    // a friendship involving me was created (either column)
    pg('friendships', `friend_id=eq.${id}`, 'INSERT');
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') { this.socialActive = true; ch.track(this.where); } });
    this.social = ch;
  }
  // where: {r: ...}. Re-tracked on every room change or privacy change; Supabase de-duplicates identical payloads cheaply.
  setWhere(where) { this.where = where; if (this.socialActive) this.social.track(where); }

  leaveSocial() { if (this.social) supabase.removeChannel(this.social); this.social = null; this.socialActive = false; }
  destroy() { this.leave(); this.leaveSocial(); }
}
