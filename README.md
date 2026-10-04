# Anchors World ⚓❄️  (no build, no npm)

Plain HTML/CSS/JS. Phaser and Supabase load from CDNs. Upload the files as-is to GitHub.

## Setup (once)
1. Supabase → SQL Editor → paste and run `supabase/schema.sql`.
   (Auth → Providers → Email: turn off "Confirm email" while testing.)
2. Edit `src/config/keys.js` with your Project URL and anon/publishable key.
3. Upload every file in this folder to the root of your GitHub repo (keep the folder structure, include `.nojekyll`).
4. Repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
5. Open `https://YOUR-USER.github.io/YOUR-REPO/`

No keys yet? Click "Look around as a guest".

Controls: WASD / arrows or click. E (or click a building) to enter doors.
