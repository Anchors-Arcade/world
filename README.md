# Anchors World ⚓❄️  (no build, no npm)

Plain HTML/CSS/JS. Phaser and Supabase load from CDNs. Upload the files as-is to GitHub.

## Setup (once)
1. Supabase → SQL Editor → paste and run `supabase/schema.sql`, then `supabase/phase5.sql` (shops, furniture, rooms), then `supabase/phase6.sql` (chat, friends, safety), **then** `supabase/phase7.sql` (arcade scores, rewards, leaderboards). All safe to re-run.
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
