-- =====================================================================
-- ANCHORS WORLD · PHASE 22 — Jobs
-- Run AFTER schema.sql and phase7.sql (and ideally all later phases). Safe to re-run.
--
-- Phase 22 adds eight jobs around the world (café, cleanup, delivery, ice fishing,
-- maintenance, tour guide, library, snow clearing). A job is a short in-world shift:
-- no scene switch, no new currency. The shift is scored in "job points" and paid out in
-- Anchor Coins through the EXISTING minigame pipeline — start_minigame() opens the
-- server-timed session when the shift begins, submit_minigame_score() validates the
-- result against that clock when the shift ends. No new functions, no new tables:
-- each job is simply a row in the `minigames` catalogue with its own score limits and
-- reward tiers, so the whole trust model of Phase 7 (the browser never says who it is
-- and never says how many coins it earned; daily cap; anti-cheat ceilings) applies
-- to jobs unchanged.
--
-- Job ids are prefixed `job_` so they can never collide with a minigame id, and the
-- Arcade screen does not list them (it renders its own client-side catalogue).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The job catalogue. Score limits are generous ceilings, not targets:
--      max_score         = the best shift a perfect player could post
--      max_score_per_sec = impossible-score ceiling (score <= rate * seconds + 50)
--      min_duration_ms   = a shift faster than this is not a real shift
--      max_duration_ms   = a shift slower than this has been abandoned
--      reward_min_ms     = shorter shifts are saved but earn nothing
--      rewards           = [{"min":<points>,"coins":<n>}, ...] highest matching tier wins
--    Tiers are deliberately humbler than arcade payouts: a job is steady work,
--    not a jackpot — around 4–36 coins per shift against the shared 1,500/day cap.
-- ---------------------------------------------------------------------
insert into public.minigames (id, name, max_score, max_score_per_sec, min_duration_ms, max_duration_ms, reward_min_ms, rewards) values
  ('job_cafe',       'Café Shift',        120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]'),
  ('job_cleanup',    'Town Cleanup',      120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]'),
  ('job_delivery',   'Parcel Run',        120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]'),
  ('job_fishing',    'Ice Fisher',        160, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":100,"coins":24},{"min":140,"coins":36}]'),
  ('job_maintenance','Maintenance Crew',  150, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":100,"coins":24},{"min":140,"coins":36}]'),
  ('job_tour',       'Tour Guide',        120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]'),
  ('job_library',    'Library Aide',      120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]'),
  ('job_snow',       'Snow Crew',         120, 4, 15000, 600000, 15000,
    '[{"min":1,"coins":4},{"min":40,"coins":10},{"min":70,"coins":16},{"min":95,"coins":22},{"min":115,"coins":30}]')
on conflict (id) do update set name = excluded.name, max_score = excluded.max_score, max_score_per_sec = excluded.max_score_per_sec,
  min_duration_ms = excluded.min_duration_ms, max_duration_ms = excluded.max_duration_ms, reward_min_ms = excluded.reward_min_ms,
  rewards = excluded.rewards;
