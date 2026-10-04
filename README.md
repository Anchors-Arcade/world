# Anchors World ⚓❄️  (no build, no npm)

Plain HTML/CSS/JS. Phaser and Supabase load from CDNs. Upload the files as-is to GitHub.

## Setup (once)
1. Supabase → SQL Editor → paste and run `supabase/schema.sql`, **then** `supabase/phase5.sql` (shops, furniture, rooms; safe to re-run).
   (Auth → Providers → Email: turn off "Confirm email" while testing.)
2. Edit `src/config/keys.js` with your Project URL and anon/publishable key.
3. Upload every file in this folder to the root of your GitHub repo (keep the folder structure, include `.nojekyll`).
4. Repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
5. Open `https://YOUR-USER.github.io/YOUR-REPO/`

No keys yet? Click "Look around as a guest".

Controls: WASD / arrows or click. E (or click a building) to enter doors.

## Phase 5: shops, furniture, player rooms
- **Clothing Shop** (Snowy Threads) and **Furniture Shop** (Cozy Corner): walk into the shop from the plaza and press E at the counter
  (or click it). The HUD 🛍️ button opens the clothing shop anywhere. Items preview before you buy; owned items show a ✓ and can be worn/taken off.
- **My Home** (plaza) or the HUD 🏠 button takes you to your room. Press **🛠️ Decorate** to edit: tap furniture in the tray to add it,
  drag to move (8px grid), **R** / ⟳ rotate, **Delete** / 🗑 remove, arrow keys nudge, 🎨 Theme for wall/floor looks, **Save room** to persist (one request), Cancel to discard.
- All purchases and saves are server-side: `purchase_item()`, `get_room()`, `save_room()` (see `supabase/phase5.sql`). Clients can only SELECT.
- Add furniture: edit `src/shops/furniture.js` + its art in `src/utils/furnitureArt.js`, then regenerate the seed:
  `node scripts/gen-furniture-seed.mjs` and run the output in the SQL editor.
- Tests (no browser needed): `node scripts/test-rules.mjs`.
