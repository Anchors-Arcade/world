import { supabase } from '../config/supabase.js';

// Thin wrapper over one Supabase Realtime channel per room.
//  - Presence  = who is here + their outfit (auto-removed when a client disconnects).
//  - Broadcast = high-frequency position packets. Nothing here touches the database.
export class Network {
  constructor(profile) { this.profile = profile; this.channel = null; this.active = false; this.me = null; }
  get enabled() { return !!supabase && !this.profile.guest; }

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
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') { this.active = true; ch.track(this.me); } });
    this.channel = ch; this.me = me;
  }

  updateMe(patch) { this.me = { ...this.me, ...patch }; if (this.active) this.channel.track(this.me); }
  sendPos(p) { if (this.active) this.channel.send({ type: 'broadcast', event: 'pos', payload: p }); }

  leave() {
    if (this.channel) supabase.removeChannel(this.channel);
    this.channel = null; this.active = false;
  }
}
