# Anchors World ⚓❄️  (no build, no npm)

Plain HTML/CSS/JS. Phaser and Supabase load from CDNs. Upload the files as-is to GitHub.

## Setup (once)
1. Supabase → SQL Editor → paste and run `supabase/schema.sql`, then `supabase/phase5.sql` (shops, furniture, rooms), then `supabase/phase6.sql` (chat, friends, safety), **then** `supabase/phase7.sql` (arcade scores, rewards, leaderboards), **then** `supabase/phase8.sql` (collectibles, secrets, achievements, visited places), **then** `supabase/phase9.sql` (the bigger clothing catalogue), **then** `supabase/phase10.sql` (the seven world activities). Then **`supabase/phase11.sql`** (Slope Sled Run + Snow Runner) and **`supabase/phase12.sql`** (the five sled routes). All safe to re-run.
   Deploy the new client files and run `phase6.sql` together: Phase 6 changes how your own profile is loaded (`get_my_profile()`).
   (Auth → Providers → Email: turn off "Confirm email" while testing, or keep it on and do step 1b.)
1b. **E-mail confirmation links** go to your Supabase *Site URL*, which defaults to `http://localhost:3000` ("site can't be reached"). Fix: Supabase → Authentication → **URL Configuration** → set **Site URL** to where the game runs (e.g. `https://YOUR-USER.github.io/YOUR-REPO/` or `http://localhost:5173/`) and add the same address(es) under **Redirect URLs** (add `http://localhost:5173/**` and your GitHub Pages address with `/**`). The game now also sends the page you signed up from as the redirect, and the sign-up screen has a "Resend confirmation email" button. Links already sent keep the old address: request a new one.
2. Edit `src/config/keys.js` with your Project URL and anon/publishable key.
3. Upload every file in this folder to the root of your GitHub repo (keep the folder structure, include `.nojekyll`).
4. Repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
5. Open `https://YOUR-USER.github.io/YOUR-REPO/`

No keys yet? Click "Look around as a guest".

Controls: WASD / arrows or click. E (or click a building) to enter doors. **Enter** opens chat, **Q** opens the emote wheel, **1–8** play an emote directly, **Esc** closes panels. Tap a player to see their card.

## Phase 5: shops, furniture, player rooms
- **Clothing Shop** (Snowy Threads) and **Furniture Shop** (Cozy Corner): walk into the shop from the plaza and press E at the counter
  (or click it). The HUD 🛍️ button opens the clothing shop anywhere. Items preview before you buy; owned items show a ✓ and can be worn/taken off.
- **My Home** (plaza) or the HUD 🏠 button takes you to your room. Press **🛠️ Decorate** to edit: tap furniture in the tray to add it,
  drag to move (8px grid), **R** / ⟳ rotate, **Delete** / 🗑 remove, arrow keys nudge, 🎨 Theme for wall/floor looks, **Save room** to persist (one request), Cancel to discard.
- All purchases and saves are server-side: `purchase_item()`, `get_room()`, `save_room()` (see `supabase/phase5.sql`). Clients can only SELECT.
- Add furniture: edit `src/shops/furniture.js` + its art in `src/utils/furnitureArt.js`, then regenerate the seed:
  `node scripts/gen-furniture-seed.mjs` and run the output in the SQL editor.
- Tests (no browser needed): `node scripts/test-rules.mjs`.

## Phase 6: chat, friends, emotes, safety
- **Chat** 💬: per-room chat with quick-chat buttons (⚡), 100-character limit, bubbles over avatars, names open the player card. History = last 40 lines of the current room (one query per room change); new lines arrive over the room's existing Realtime channel via `postgres_changes` filtered to that room. Players only receive rows Row Level Security allows (not blocked / muted / hidden, and only rooms they may enter).
- **Safe chat** 🛡️: all writes go through `send_chat()`: length, control-character cleanup, link / e-mail / phone blocking, word filter (`chat_filter_terms`, look-alike and stretched-letter aware), rate limits (600 ms gap, 5 per 10 s, 20 per minute, no repeats). The same rules run in `src/social/chatRules.js` for instant feedback. **The starter word list is tiny on purpose: extend it** (`insert into chat_filter_terms ...`) or put a moderation service in front of `send_chat()`. Moderators can hide a line with `update chat_messages set hidden = true` (the service role / SQL editor). Schedule `prune_social_data()` (24 h of chat) with pg_cron, see the end of `phase6.sql`.
- **Friends** 👥: search by username prefix, player cards, requests (send / accept / decline / cancel), friend list with 🟢/⚪ status, current room and **Join**. Mutual requests become friendships instantly. Limits: 100 friends, 30 pending requests, 20 requests per hour, 1-day cool-down after a decline.
- **Online status**: one global `social` presence channel per session; each client publishes only `{r: room}`. Only your friends' entries are kept. "Join" goes through the normal room loader; homes are checked by the server first (`can_view_room`: owner / blocked / "allow visits" / room visibility `friends`·`public`·`private`).
- **Emotes** 😄: radial wheel (button or **Q**), hotkeys **1–8**, 8 original emotes (`src/social/emotes.js`). Broadcast-only `{id, e}` packets, never stored; unknown keys and floods are ignored; "reduce motion" keeps the icon and skips the animation.
- **Block / mute / report**: Mute hides a player's chat, bubbles and emotes. Block also hides their avatar, removes the friendship and pending requests, and stops chat both ways. Reports (`reports` table) are write-only for players (no select policy at all); the server attaches the reported player's recent chat as evidence. Read them in the Supabase dashboard / service role.
- **Privacy foundation** ⚙️: `player_settings` (friend requests, friends can join me, room visits, typed chat) with four switches in Settings. Other players can no longer read your coins or current room from `profiles`.
- Tests (no browser / Supabase needed): `node scripts/test-phase6.mjs` (chat rules, emotes, SQL security review) and `node scripts/test-social.mjs` (friends / presence / privacy logic).

## Phase 7: the Arcade, minigames, leaderboards
- **Arcade room**: walk in through the Arcade on the plaza. Three cabinets (Snow Dash, Coin Catcher, Snowball Arena) and the Leaderboards screen; press **E** or click one. The Arcade screen shows each game's description, your best, and its highest reward.
- **Games** (all playable, 45–90 s): ❄️ **Snow Dash** (steer ← → / A D or drag; dodge trees/rocks/snowmen, hit boost pads; faster + fewer crashes = more points), 🪙 **Coin Catcher** (move the basket; streaks raise a ×1–×5 multiplier; avoid ice bombs and icicles), ☃️ **Snowball Arena** (aim with mouse/finger, click/tap/hold or SPACE to throw; hit streaks multiply; don't hit friendly penguins). **Esc / P** pauses, **M** mutes, **Enter/Space** starts or replays.
- **Trust model** (`supabase/phase7.sql`): the browser calls `start_minigame()` (opens a server-timed session for `auth.uid()`), then `submit_minigame_score()` once. The server checks the session is yours and unused, the score range, score-per-second ceiling and the run length against its own clock, then picks the coins from its **own** reward table, applies a 1,500 coins/day cap, updates your personal best and pays the wallet. The client never sends a player id or a coin amount; players have no write access to any of these tables. Rejected runs are kept (`status='rejected'`) so abusers are easy to find; the `stats` column stores per-run counters for stronger checks later.
- **Leaderboards**: all-time, today, this week, this month (UTC) and *My scores*, per game, with avatars and your own row highlighted (or pinned below the list when you're outside the top 20).
- **Architecture** (`src/minigames/`): `MinigameScene.js` (shared start / countdown / pause / finish / result screens), one file per game, `MinigameManager.js` (pauses the Room scene so Realtime presence/chat stay connected, restores it on exit), `scoreSystem.js` + `leaderboard.js` (RPC calls only), `scoring.js` + `rewards.js` (pure maths), `registry.js`, `art.js` (procedural textures), `Pool.js` (object pooling). The only network calls are *start*, *submit*, and one cached overview per Arcade visit; nothing runs inside the frame loop.
- **Add a game**: a row in the `minigames` SQL table, an entry in `registry.js`, a scene extending `MinigameScene` (override `build / resetRun / tick / hudText`, call `this.finish({score})`), add it to `minigames/index.js`, and a cabinet in `maps/rooms.js`.
- Guests can play for fun; their scores aren't saved and they earn no coins.
- Tests: `node scripts/test-phase7.mjs` (scoring, reward tiers, client/SQL consistency, SQL permissions).

## Phase 8: the wider world, secrets, collectibles, achievements
- **Ten new places**, all on the same reusable room system (`src/maps/rooms.js` — one data entry each, no per-map code):
  🌲 Deep Forest, ⛺ Snow Camp, 🧊 Frozen Lake, 🏘️ Harbour Village, 🗼 Lighthouse, 🏔️ Mountain Pass, 🕳️ Ice Caves,
  🏛️ Old Observatory, and two **secret** rooms — 💎 Crystal Hollow and 🪐 Star Chamber. The plaza's old "Forest"/"Beach"
  portals now lead somewhere real. Each room keeps its own id, name, floor, collision, spawn, portals, interactive
  objects and multiplayer players, exactly like Phases 1–7.
- **A connected world**: Deep Forest ⇄ Plaza ⇄ Harbour Village · Deep Forest ⇄ Snow Camp ⇄ Frozen Lake ⇄ Harbour Village ·
  Frozen Lake ⇄ Mountain Pass → Ice Caves / Observatory · Harbour Village → Lighthouse. Walk the edge portals, press **E**
  at doors, or use the **World Map** 🗺️.
- **World Map** 🗺️: every location with its activities, whether you have been there, and per-room exploration progress
  (⭐ items, 🔎 secrets, ✓ when a place is finished). Secret rooms are **not** listed until their secret is discovered.
- **Secrets** 🔎 (`src/world/secrets.js`): seven of them, each a set of **clues** hidden in the world — three glowing marks
  in the Ice Caves open a cracked wall into Crystal Hollow; two Observatory dials plus the old chart unseal the Star
  Chamber; the lighthouse lamp switch, a suspiciously neat snow pile, four humming pines, a bubble in the lake and three
  fallen cairns do the rest. Clue objects glow until you have found them; a one-clue secret is a hidden switch.
  When the last clue lands, a hidden entrance appears in the room **without reloading it**.
- **Collectibles** ⭐ (32): snowflakes, crystals, lost objects, badges and artifacts in five rarities. Walk into one to
  pick it up; coins come from the server. Items behind an undiscovered secret are never sent to the browser at all.
- **Achievements** 🏅 (10): First Find, Curator, Snow Hunter, Completionist, Curious Penguin, Explorer, Wanderer,
  Arcade Master, Social Anchor, Room Designer. Progress is **recomputed server-side** from real rows (collectibles,
  secrets, friendships, furniture, arcade bests, visited places), so they also count things you did in earlier phases.
- **Explorer's Journal** 📒 (dock button): three tabs — items by location (unfound ones show only their rarity and
  region), secrets with clue progress, and badges with progress bars and rewards.
- **Interactive objects** (`src/world/interactions.js`): signs, notice boards, campfires, snow piles, crates, cairns,
  pines, dials, charts, a lamp switch, telescopes, crystals. They are registered in the scene's existing `doors` list as
  `world:<id>`, so the **E** prompt, click-to-walk and mobile tap all work unchanged. **No NPCs anywhere outside the
  shops** — the only penguin behind a counter is the Phase 5 shopkeeper.
- **Trust model** (`supabase/phase8.sql`): four `security definer` functions — `get_exploration()` (one request fills the
  journal, the map and the hidden-room gates), `collect_collectible()`, `find_clue()`, `visit_room()`. The browser never
  sends a player id, a coin amount, a progress value or an "unlocked" flag. Duplicate rewards are blocked by a
  `unique (player_id, collectible_id)` constraint; an invented clue id is rejected because it is not in the secret's own
  clue list; achievement rewards are paid once inside `_sync_achievements()`, which players cannot call. Players have no
  insert/update/delete rights on any Phase 8 table, and `collectibles`/`secrets` have RLS on with no policy at all.
- **Performance**: only the room you are standing in builds its objects and collectibles (`src/world/WorldLayer.js`);
  pickups are a few distance checks, not physics bodies; no new realtime subscription, no polling — state is updated
  from the return values of collect / find_clue / visit_room, plus one request when the journal is opened.
- **Guests** can explore, pick things up and open secrets locally; nothing is saved and no coins are earned.
- **Add a place**: one entry in `src/maps/rooms.js` + one in `src/world/worldMap.js`. **Add a secret**: a row in `secrets`
  (SQL) + `src/world/secrets.js` + one object per clue in `src/world/interactions.js`. **Add a collectible**: a row in
  `collectibles` (SQL) + `src/world/collectibles.js`.
- Tests: `node scripts/test-phase8.mjs` (rooms reachable and escapable, collectibles inside their rooms, every clue has an
  object, secret rooms properly gated and off the map, no NPCs outside shops, client/SQL seeds identical, SQL permissions).

## Phase 9: title screen, bigger wardrobe, better-looking world
- **Title screen** (`src/ui/authUI.js` + the Phase 9 block in `style.css`): a painted night scene built entirely from
  CSS — aurora bands, twinkling stars, a moon, three parallax ridges, a lighthouse with a sweeping beam, layered
  drifting snow and a foreground snowbank. Over it: the logo, a tagline, and three ways in — **Enter the world**,
  **Create an account**, **Look around as a guest** — plus a strip of what is waiting inside. Log-in and sign-up slide
  in as their own card with a **Back** button. All the Phase 1–8 auth behaviour is unchanged, including the
  confirmation-email notice and the **Resend confirmation email** button. Honours `prefers-reduced-motion`.
- **67 cosmetics** (was 30) and **16 body colours** (was 8). New: Star / Wink / Visor eyes, snow mask, eye patch, frost
  paint, ushanka, horned helm, winter hat, flight cap, snow blossom, aurora halo, star helmet, ice pendant, explorer
  medal, neck compass, puffer jacket, yellow slicker, sailor coat, frost plate, star suit, brave shorts, plaid
  trousers, frost greaves, flippers, fur mukluks, snow jet, sled, aurora cloak, keeper lantern, fishing rod, hot cocoa
  and a cave crystal. Every one is procedural art in `src/utils/itemArt.js` — still zero downloaded assets.
  `supabase/phase9.sql` seeds them; prices stay server-side, so `purchase_item()` is still the only way to own one.
  Regenerate the seed after editing the catalogue: `node scripts/gen-item-seed.mjs`.
- **Ambience per place** (`addAmbience` / `addWeather` in `RoomScene.js`, data in `src/maps/rooms.js`): each room can now
  set `sky`, a colour `wash`, `stars`, `aurora`, `vignette` and `fx` — `snow`, `blizzard` (lake and pass), `embers`,
  `sparkle` (caves, hollow, arcade, star chamber) or `dust` (interiors). The Frozen Lake and Mountain Pass get the
  northern lights; the caves get a dark vignette and drifting motes; the café, shops and observatory get warm haze.
- **Scenery props**: `snowman`, `lamp` (with a warm, breathing pool of light), `bush` and `glow` (a bare light source —
  the campfire, the lighthouse spill, crystal clusters, the observatory dome) join `pond`, `ice`, `rock`, `crystal` and
  `dock`. Rooms can also define their own trodden `paths`, so each outdoor map has its own shape instead of the
  plaza's cross.
- One new file (`supabase/phase9.sql`), one new script (`scripts/gen-item-seed.mjs`); everything else is an edit to
  files that already existed. No new dependencies, no new requests, no new realtime channels.

## Phase 10: an activity on every map, livelier houses, a new UI, real fullscreen
- **One minigame per map** (`src/minigames/worldGames.js`), all built on the Phase 7 `MinigameScene`, so they share the
  start screen, countdown, pause, server-timed session, result screen and leaderboards — and the Phase 8 **Arcade
  Master** badge counts them too:
  ✨ **Firefly Catch** (Deep Forest · tap the sprites, avoid the angry ones) · ☕ **Cocoa Rush** (Snow Camp · serve the
  order in the right order) · 🎣 **Ice Fishing** (Frozen Lake · strike while the marker is in the green, which keeps
  shrinking) · 📦 **Crate Stack** (Harbour Village · drop the swinging crate squarely or lose the overhang) ·
  ⛰️ **Cliff Climb** (Mountain Pass · climb and dodge falling rocks) · 💎 **Crystal Echo** (Ice Caves) and
  🌟 **Star Link** (Observatory · repeat a pattern that grows every round).
  You start them from an **activity stand** in the room — board, emoji, your best score, walk up and press **E** — and
  when you finish you are put back where you were standing instead of in the Arcade. The Arcade screen still lists only
  the three cabinets. `supabase/phase10.sql` adds the seven rows to the same `minigames` table, so the trust model,
  the score checks and the shared daily coin cap are unchanged.
- **More to do everywhere**: 13 new interactive objects — the town tree and the frozen fountain, an empty den and snow
  berries, the camp flag and a parked sled, a swept rink and a groaning crack in the lake, a beached boat and the
  harbour map, the lighthouse stairs, a mountain viewpoint, a still pool, the sky model, an echo spot and the
  astronomer's desk (which has something to say about the hollow).
- **Houses, properly built**: every building now gets a chimney with drifting smoke, icicles along the eaves, string
  lights in four colours, a wreath on the door, a stone step, two porch lanterns and a warm pool of light on the snow.
- **New UI**: glass top bar with an avatar pill and a gold coin pill, a frosted dock that lights up the panel you have
  open, rounded gradient drawers, and softer prompts and toasts.
- **Fullscreen that works on every screen** — the point of this phase:
  * a **⛶ Full** button in the dock uses the Fullscreen API on the whole document, hides the browser UI and, where the
    device allows it, locks to landscape; the button tracks the real state, so Esc or F11 keeps it in step. On iPhone,
    where Safari forbids it, the button explains the Add to Home Screen route instead.
  * the layout fills the **visible** area on any device: `dvh` units with a `-webkit-fill-available` fallback, and every
    fixed edge padded by `env(safe-area-inset-*)`, so nothing hides under a notch, a home bar or a browser toolbar.
  * short, wide windows (a phone on its side, a split screen) shrink the dock to icons and tighten the panels; very wide
    screens keep the HUD within a sane width instead of flinging it into the corners.
  * pinch-zoom, rubber-band scrolling and tap highlights are off, so the world does not slide around under your finger.
  * Phaser is resized, not letterboxed: the room camera follows the new size and the screen-space weather and vignette
    are rebuilt (debounced) on every resize, rotation and fullscreen change; minigames re-fit their 960×540 stage into
    any window, with the zoom clamped so huge monitors do not blow the art up.
- `vite.config.js` is new and dev-only: it points the Supabase CDN import at `node_modules` for `npm run dev`, while a
  production build and the plain-files deployment keep using the CDN.

## Phase 12.1: the ski system, fixed
The ski area shipped in the code but could not actually be used. Five separate faults, all fixed here:

1. **`Avatar` had no `setPosition()`** — and both the gondola ride and the sled called it every frame. Pressing **S**
   at the top of a slope, or **E** at the lift, threw an exception instantly, so nothing happened at all. This was the
   "the ski system isn't here" bug. `Avatar.setPosition()` now exists: it moves the hitbox (every visual layer is drawn
   from it) and moves the physics body **by hand**, because the lift and the sled deliberately run with the body
   disabled while they drive the transform — `body.reset()` would have switched collisions back on mid-ride.
2. **`supabase/phase11.sql` did not exist.** `slope_sled` and `snow_runner` were registered in the client and listed in
   the Arcade, but had no rows in the `minigames` table, so `start_minigame()` answered "Unknown minigame" and neither
   game could be played. The file is now here, with ceilings and reward tiers that match the client.
   `scripts/test-phase7.mjs` now reads phase 7, 10, 11 **and** 12, so a missing catalogue fails the tests instead of
   failing silently in the browser.
3. **Sled runs were never scored.** `start_minigame()` returns a bare uuid, but the sled read `r.session_id`, so the
   session id was always null and no run was ever submitted — no score, no coins, no leaderboard entry.
4. **The payout was read from the wrong field** (`coins_awarded` instead of `coins`) and the wallet was never
   refreshed. Finishing a route now pays, updates the HUD immediately, invalidates the leaderboard cache, and reports
   a new personal best or your rank.
5. **The Hidden Valley could never open.** Its gate waited on the room being "unlocked", but its secret
   (`buried_cache`) unlocks no room of its own, so the check could never pass. A hidden entrance now opens either way:
   the room being unlocked, **or** its secret simply being discovered.

Polish in the same pass:
- **Every slope has a way back up.** A slope used to be a one-way room with no portal: if a run never started you were
  stranded. Each route now has a "▴ Back to the summit" gate at the top — which is also why `test-phase8.mjs` passes
  again ("every place can be walked out of").
- **Summit gates read like a real piste map**: difficulty (🟢 🔵 🔴 ⚫ ❄️), the route's par time and your own best time.
- **A start gate at the top of each run** with the route name, par and your best, plus a proper live HUD while riding:
  distance %, coins, a red/green split against par, speed and hits. (It used to print raw pixels-per-second as "km/h".)
- **The ski area is findable**: the Mountain Pass signpost and the plaza notice board both point at Anchor Peak, and
  the Warming Hut now has a route board describing all five runs and a cocoa pot.
- Background peaks got a ridge line and base haze so they read as distant mountains rather than flat wedges.

## Phase 13: real world visuals
Everything in the world used to be a coloured rectangle with an emoji sitting on it. Phase 13 replaces those with
original drawn sprites, without touching a single interaction: **every footprint, collision body, door, zone and
action is exactly what Phases 1-12 defined** — only the art changed, so shops, portals, secrets, collectibles, the
ski lift and multiplayer all behave identically.

- **`src/utils/sprites.js`** (new) — the drawing library: tents with fabric, poles and a doorway; campfires with a
  stone ring, logs and flame; notice boards with pinned notes; signposts; crates, barrels and fish crates; sleds;
  harbour bells; lanterns; mooring posts with coiled rope; a beached boat; skates; cairns; snow piles; snow berries;
  carved glowing marks; crystal clusters; ice holes and frozen bubbles; shop counters, clothes racks, shelves,
  sofas, beds, plants, books, desks, charts, telescopes, dials, scrolls, globes, orreries, ladders, buckets,
  toolboxes, clocks, café tables with a steaming mug, cakes, a decorated town tree and a frozen fountain.
  Each sprite is a few hundred bytes of code: no textures to download, no atlas, nothing to load.
- **How it attaches to the old data**: the rooms and interactions of Phases 1-12 identify their objects with an emoji
  in the label. `spriteFor()` maps those emoji onto the sprites above, so nothing had to be re-authored, and an
  explicit `art: 'tent'` overrides it. The words of a label become a small caption *under* the object; the picture is
  the object itself. Anything unmapped falls back to a wooden crate rather than a bare rectangle.
- **Collectibles** (`src/utils/collectibleArt.js`, new) — all 32 were the same sparkle in a different tint. They are
  now snowflakes, crystals, a compass, a skate key, a locket, logbooks, a medal, a badge, an orrery gear, a comet
  fragment, a brass lens, a star chart, a kettle, a sailor's charm, a piton and a marker stone, each with its rarity
  glow behind it.
- **Trees** — two baked pine variants (broad and tall) with a trunk, layered tiers, a lit side and snow on every
  tier, picked deterministically from each tree's position with a little scale jitter. Still one image per tree.
- **Buildings** keep their baked art from Phase 12 and gain a **hanging sign** by the door with the shop's own
  pictogram, so a café reads differently from a clothes shop before you read the name.
- **Shop counters** are real counters — wooden front, stone worktop, a till and a propped sign — with the shopkeeper
  penguin behind them (still the only NPCs in the world).
- **The ski lift** is now visibly a lift: steel lattice towers with cross-arms and sheave wheels, a cable strung
  between them, chairs drifting up the mountain and a plank boarding platform. Riding it is unchanged.
- **Standing spots** (shop counters, arcade cabinets, activity stands, interactive objects, the lift platform) were
  bright yellow rectangles that read as placeholder UI. They are now one shared soft oval of trodden snow.
- **Paths** are trodden snow with soft edges and boot prints instead of translucent boxes.
- **Hover feedback**: interactive objects lift slightly and show a soft ring under them on hover or tap. Walking up
  and pressing **E** is unchanged.
- Verified in a headless browser: every room still builds with its doors intact, a house door still enters its room,
  a counter still opens the shop, an object still fires its interaction, a collectible still collects, and the lift
  still boards. All five test suites pass.
