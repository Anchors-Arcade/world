import { JOBS } from './jobs.js';
import { startRun, submitRun, guestResult, bestOf } from '../minigames/scoreSystem.js';
import { tiersFor, rewardFor } from '../minigames/rewards.js';
import { toast, pickup } from '../ui/hud.js';

// Phase 22 — jobs that happen inside the room, like the ski system: no scene switch, no menu.
// One instance per RoomScene. It owns the SHIFT lifecycle; each job's actual gameplay lives in
// its own module (src/world/jobs/<id>.js) with this contract:
//
//   begin(sys)              build the shift's world objects; set sys.active.st = { ... }
//   tick(sys, time, delta)   per-frame proximity checks; call sys.setHint(...) / sys.setObjective(...)
//   onE(sys)                return true if the E press was consumed by the shift
//   cleanup(sys, st)         drop the shift's leftovers (st = the module's own state bag)
//
// Every Phaser object a module creates should also go through sys.keep(...) so the wholesale
// cleanup in finish()/cancel() can never leak one.
//
// Money never crosses this class: the shift is scored in points, and finish() submits the score
// through the Phase 7 pipeline (start_minigame opened the session at begin(); submit_minigame_score
// validates it against the server clock and pays the coins).
export class JobSystem {
  constructor(scene) {
    this.scene = scene;
    this.roomId = scene.roomId;
    this.active = null;                 // { job, points, startAt, session, done, st }
    this.objects = [];                  // every Phaser object a shift created (cleared wholesale)
    this.hintText = '';
    this.lastHud = 0;

    // The "Start shift" button on a job board's dialog (src/ui/worldDialog.js) fires this.
    this.onStart = (jobId) => this.begin(jobId);
    scene.game.events.on('job-start', this.onStart);
    // Starting an arcade minigame expires the open job session server-side (one live run per
    // player), so the shift ends unpaid rather than failing to submit later.
    this.onMinigame = () => { if (this.active) this.cancel('Shift ended — you slipped off to the arcade!'); };
    scene.game.events.on('minigame-start', this.onMinigame);
    scene.events.once('shutdown', () => this.destroy());
  }

  get player() { return this.scene.player; }

  // ---------- shared kit for the job modules ----------
  // Track a created object so cleanup never leaks one.
  keep(o) { this.objects.push(o); return o; }

  near(x, y, r = 64) {
    const p = this.player; if (!p) return false;
    return Math.hypot(x - p.x, y - p.y) <= r;
  }

  setHint(t) { this.hintText = t || ''; }
  setObjective(t) { if (this.active) this.active.st.objective = t; this.hud({}); }

  addPoints(n, label = '') {
    if (!this.active || n <= 0) return;
    this.active.points += n;
    if (label) pickup(`💼 ${label}`, 0);                       // small chip; coins arrive at submit time
    this.hud({});
  }

  setProgress(done) {
    if (!this.active) return;
    this.active.done = done;
    this.hud({});
  }

  // ---------- lifecycle ----------
  begin(jobId) {
    const s = this.scene, job = JOBS[jobId];
    if (!job || job.room !== this.roomId) return;              // the board is in another room
    if (this.active) return toast('Finish your current shift first!');
    if (s.leaving || s.editing || s.uiLocked) return;

    this.active = { job, points: 0, done: 0, startAt: Date.now(), session: null, st: {} };
    this.hintText = '';
    const profile = s.registry.get('profile');
    if (!profile.guest) {
      // The server clock for the shift starts here. If the backend has not had phase22.sql
      // applied yet the shift still runs — it just cannot be paid, and the player is told why.
      startRun(job.game)
        .then((sid) => { if (this.active?.job === job) this.active.session = sid; })
        .catch((e) => {
          if (!this.active || this.active.job !== job) return;
          this.cancel(/unknown minigame/i.test(e.message)
            ? 'The job board is not wired up yet — run supabase/phase22.sql.'
            : 'Could not clock in: ' + e.message);
        });
    }
    job.begin(this);
    this.hud({});
    toast(`${job.emoji} ${job.name} — shift started!`);
  }

  // A shift ends three ways: the work is finished (the module calls sys.finish()), the clock runs
  // out (update() below), or it is cancelled/abandoned. All of them come through here.
  finish(silent = false) {
    const a = this.active; if (!a) return;
    this.active = null;
    this.hintText = '';
    try { a.job.cleanup(this, a.st); } catch { /* never block a payout on art */ }
    this.clearObjects();
    this.hud({ on: false });
    if (silent) return;

    const job = a.job, durationMs = Date.now() - a.startAt;
    const profile = this.scene.registry.get('profile');
    if (profile.guest) {
      this.result(job, { ...guestResult(job.game, a.points), guest: true }, a.points, durationMs);
    } else if (!a.session) {
      this.result(job, { ok: true, coins: 0, balance: null, guest: false }, a.points, durationMs);
    } else if (durationMs < 15000) {
      // clocked out too fast to be a real shift: the server would reject it, so do not try
      toast(`${job.name} ended too quickly — that was not a real shift.`);
    } else {
      // clamp to the catalogue ceiling so a points bug can never make the server reject a real shift
      const score = Math.min(a.points, job.max);
      submitRun({ sessionId: a.session, gameId: job.game, score, durationMs, stats: {} })
        .then((out) => this.result(job, out, a.points, durationMs))
        .catch(() => toast('Shift saved, but the payout could not be confirmed — check your connection.'));
    }
  }

  cancel(message = '') {
    if (!this.active) return;
    this.finish(true);
    if (message) toast(message);
  }

  // Turn the server's verdict into feedback the player can see.
  result(job, out, points) {
    if (out.balance != null) this.scene.game.events.emit('coins-changed', out.balance);
    if (out.coins > 0) {
      pickup(`${job.emoji} ${job.name}`, out.coins);
      toast(`✅ ${job.name} complete — +${out.coins} ⚓${out.new_best ? ' · new personal best!' : ''}${out.capped ? ' (daily coin cap reached)' : ''}`);
    } else if (out.guest) {
      toast(`✅ ${job.name} complete — ${points} points! Create an account to earn Anchor Coins.`);
    } else if (out.ok === false) {
      toast(`Shift could not be verified: ${out.error || 'try again'}`);
    } else {
      toast(`${job.name} ended early — no pay for an unfinished shift.`);
    }
    this.scene.game.events.emit('job-result', { job, out, points });
  }

  // Leaving the room mid-shift pays for the work already done (if it was enough to be a real
  // shift). Called from the scene's shutdown, so everything visual is already going away.
  abandon() {
    const a = this.active; if (!a) return;
    this.active = null;
    try { a.job.cleanup(this, a.st); } catch { /* scene is shutting down anyway */ }
    this.clearObjects();
    const durationMs = Date.now() - a.startAt;
    const profile = this.scene.registry.get('profile');
    if (profile.guest || !a.session || durationMs < 15000 || a.points < 1) {
      if (!profile.guest && a.points >= 1) toast(`Left mid-shift — ${a.job.name} unfinished.`);
      return;
    }
    submitRun({ sessionId: a.session, gameId: a.job.game, score: Math.min(a.points, a.job.max), durationMs, stats: {} })
      .then((out) => { if (out.ok && out.coins > 0) this.result(a.job, out, a.points); })
      .catch(() => {});
  }

  clearObjects() {
    for (const o of this.objects) o.destroy?.();
    this.objects.length = 0;
  }

  // ---------- per-frame ----------
  update(time, delta) {
    const a = this.active; if (!a) return;
    if (Date.now() - a.startAt >= a.job.shiftMs) return this.finish();   // shift over — pay for what is done
    a.job.tick(this, time, delta);
    if (time - this.lastHud > 250) { this.lastHud = time; this.hud({}); } // the shift clock, a few times a second
  }

  hint() {
    if (!this.active) return '';
    return this.hintText;
  }

  // The scene's E handler asks this before doors, so a shift can never be blocked by one.
  consumeE() {
    if (!this.active) return false;
    return !!this.active.job.onE(this);
  }

  // ---------- the DOM job HUD (src/ui/jobHUD.js) ----------
  hud(patch = {}) {
    const a = this.active;
    this.scene.game.events.emit('job-hud', {
      on: patch.on ?? !!a,
      ...(a ? {
        job: a.job, points: a.points, done: a.done, total: a.job.total,
        objective: a.st.objective ?? '',
        timeLeftMs: Math.max(0, a.job.shiftMs - (Date.now() - a.startAt)), shiftMs: a.job.shiftMs,
        coins: rewardFor(tiersFor(null, a.job.game), a.points),
      } : {}),
      ...patch,
    });
  }

  bestOf(job) {
    return bestOf(job.game, !!this.scene.registry.get('profile').guest);
  }

  destroy() {
    this.abandon();
    this.scene.game.events.off('job-start', this.onStart);
    this.scene.game.events.off('minigame-start', this.onMinigame);
    this.clearObjects();
    this.scene.game.events.emit('job-hud', { on: false });
  }
}
