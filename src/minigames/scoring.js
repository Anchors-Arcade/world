// Pure game maths (no Phaser, no network) so it can be unit-tested with plain node: `node scripts/test-phase7.mjs`.
// Every score a game produces goes through these functions and is then clamped to the server's max (see `clampScore`).
export const MAX_SCORE = { snow_dash: 10000, coin_catcher: 9000, snowball_arena: 9000 };   // mirrors minigames.max_score in phase7.sql
export const clampScore = (game, s) => Math.max(0, Math.min(MAX_SCORE[game] ?? 0, Math.round(Number.isFinite(s) ? s : 0)));

// ---- Snow Dash: faster = better. 8000 pts for time (24 s or faster = full marks, 80 s = 0) + up to 2000 clean-run bonus.
export const DASH = { length: 9000, timeLimitMs: 90000, parMs: 24000, zeroMs: 80000, timePts: 8000, cleanPts: 2000, crashPenalty: 400 };
export function snowDashScore({ timeMs, crashes = 0, finished = true, progress = 1 }) {
  if (!finished) return clampScore('snow_dash', Math.floor(1500 * Math.min(1, Math.max(0, progress))));      // ran out of time: partial credit
  const t = Math.min(1, Math.max(0, (DASH.zeroMs - timeMs) / (DASH.zeroMs - DASH.parMs)));
  const clean = Math.max(0, DASH.cleanPts - crashes * DASH.crashPenalty);
  return clampScore('snow_dash', Math.round(DASH.timePts * t + clean));
}

// ---- Coin Catcher: streaks raise a multiplier (x1 .. x5)
export const CATCH = { timeMs: 45000, values: { flake: 5, coin: 15, gem: 50 }, penalty: { bomb: 100, icicle: 60 }, perStep: 6, maxMult: 5 };
export const catchMultiplier = (streak) => Math.min(CATCH.maxMult, 1 + Math.floor(streak / CATCH.perStep));

// ---- Snowball Arena: consecutive hits raise the multiplier (x1 .. x5); a miss or a friendly penguin resets it
export const ARENA = { timeMs: 45000, values: { snowman: 10, bullseye: 25, golden: 75 }, friendPenalty: 60, perStep: 3, maxMult: 5 };
export const arenaMultiplier = (streak) => Math.min(ARENA.maxMult, 1 + Math.floor(streak / ARENA.perStep));
