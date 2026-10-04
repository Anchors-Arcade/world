# Anchors World ⚓❄️
Browser multiplayer virtual world. Phaser 3 + Vite + Supabase. Static build → GitHub Pages.

**Status:** Phase 1 (auth, HUD, Supabase) and Phase 2 (avatar, movement, collision, Snowy Plaza, room system) done.

## Run
1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
   (For quick testing turn off "Confirm email" under Auth → Providers → Email.)
3. `cp .env.example .env` and fill in URL + anon key.
4. `npm run dev`  (no keys? Use "Look around as a guest".)

## Deploy
Repo → Settings → Pages → Source: GitHub Actions. Add repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Push to `main`.

## Controls
WASD / arrows, or click the ground. Click a building (or press E at its door) to enter.

## Add a room
Add an entry to `src/maps/rooms.js` and link a building `to:` / portal `to:` to its id.
