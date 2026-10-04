# Anchors World ⚓❄️  (no build, no npm)

Plain HTML/CSS/JS. Phaser and Supabase load from CDNs. Upload the files as-is to GitHub.

## Setup (once)
1. Supabase → SQL Editor → paste and run `supabase/schema.sql`, then `supabase/phase5.sql` (shops, furniture, rooms), then `supabase/phase6.sql` (chat, friends, safety), **then** `supabase/phase7.sql` (arcade scores, rewards, leaderboards), **then** `supabase/phase8.sql` (collectibles, secrets, achievements, visited places). All safe to re-run.
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
