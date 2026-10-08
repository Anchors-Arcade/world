// Phase 22 — the job catalogue, as data.
// A job is a short, replayable shift that happens IN the world (no scene switch, no menu, no new
// currency): walk to its board, press E, do the work, get paid in Anchor Coins. The payout goes
// through the same server pipeline as minigames — supabase/phase22.sql seeds one `job_*` row per
// job into the `minigames` catalogue (score ceilings + reward tiers live THERE, on the server),
// start_minigame() opens the server-timed session when the shift begins and submit_minigame_score()
// validates the shift against that clock when it ends. Everything here is display + gameplay only.
//
//   { id, game, room, name, emoji, tagline, description, shiftMs, total, max, colors }
//     game    -> the server catalogue id the shift is scored as ('job_cafe')
//     room    -> where the board (and the whole shift) lives
//     total   -> how many work items make a full shift (4 orders, 8 litter, ...)
//     max     -> the server's max_score for this job; points are clamped to it at submit
//     shiftMs -> the shift clock; run out and the shift pays for whatever is done
//
// The gameplay of each job is its own module in src/world/jobs/<id>.js, exporting
// { begin, tick, onE, cleanup } — see src/world/JobSystem.js for the contract.
import { cafeJob } from './jobs/cafe.js';
import { cleanupJob } from './jobs/cleanup.js';
import { deliveryJob } from './jobs/delivery.js';
import { fishingJob } from './jobs/fishing.js';
import { maintenanceJob } from './jobs/maintenance.js';
import { tourJob } from './jobs/tour.js';
import { libraryJob } from './jobs/library.js';
import { snowJob } from './jobs/snow.js';

export const JOBS = {
  cafe: {
    id: 'cafe', game: 'job_cafe', room: 'cafe', name: 'Café Shift', emoji: '☕',
    tagline: 'Serve the café before the kettle cools.',
    description: 'Take an order at the counter, add the right ingredients, brew with good timing, and carry the cup to the waiting table.',
    shiftMs: 150000, total: 4, max: 120, colors: { a: '#e9a23b', b: '#6b4428' },
    ...cafeJob,
  },
  cleanup: {
    id: 'cleanup', game: 'job_cleanup', room: 'snowy_plaza', name: 'Town Cleanup', emoji: '🧹',
    tagline: 'The plaza deserves better than this.',
    description: 'Litter has blown all over the plaza. Pick it up and put it in a bin. Finish the lot for a tidy bonus.',
    shiftMs: 150000, total: 8, max: 120, colors: { a: '#8ff0b3', b: '#2a6f49' },
    ...cleanupJob,
  },
  delivery: {
    id: 'delivery', game: 'job_delivery', room: 'snowy_plaza', name: 'Parcel Run', emoji: '📦',
    tagline: 'Four parcels, four doors, one penguin.',
    description: 'Grab a parcel from the station, carry it to the address on the tag, and press E at the door. Quick legs earn a bonus.',
    shiftMs: 150000, total: 4, max: 120, colors: { a: '#e9a23b', b: '#8a6240' },
    ...deliveryJob,
  },
  fishing: {
    id: 'fishing', game: 'job_fishing', room: 'frozen_lake', name: 'Ice Fisher', emoji: '🎣',
    tagline: 'Holes in the ice, fish under them.',
    description: 'Cast into a glowing hole, watch the float, and strike the moment it dips. Rarer fish are worth more; a perfect strike doubles the catch.',
    shiftMs: 150000, total: 4, max: 160, colors: { a: '#5bb6e8', b: '#0c2a44' },
    ...fishingJob,
  },
  maintenance: {
    id: 'maintenance', game: 'job_maintenance', room: 'snowy_plaza', name: 'Maintenance Crew', emoji: '🛠️',
    tagline: 'Nothing in town stays fixed by itself.',
    description: 'Something is always broken — a lamp, a sign, a bench. Tighten each bolt when the ring lines up to set it right.',
    shiftMs: 150000, total: 3, max: 150, colors: { a: '#9aa7b8', b: '#3a4d5c' },
    ...maintenanceJob,
  },
  tour: {
    id: 'tour', game: 'job_tour', room: 'snowy_plaza', name: 'Tour Guide', emoji: '🧭',
    tagline: 'Show a visitor the town.',
    description: 'A visitor wants the grand tour. Lead them to each highlight on the route — they follow you — then bring them back to the booth.',
    shiftMs: 180000, total: 3, max: 120, colors: { a: '#ffd977', b: '#8a6240' },
    ...tourJob,
  },
  library: {
    id: 'library', game: 'job_library', room: 'library', name: 'Library Aide', emoji: '📚',
    tagline: 'Every book back on its own shelf.',
    description: 'Returned books are piling up on the cart. Take one, match its colour to the right shelf, and press E to file it.',
    shiftMs: 150000, total: 5, max: 120, colors: { a: '#5bb6e8', b: '#1d3f66' },
    ...libraryJob,
  },
  snow: {
    id: 'snow', game: 'job_snow', room: 'mountain_village', name: 'Snow Crew', emoji: '🧊',
    tagline: 'The paths do not clear themselves.',
    description: 'Overnight snow has blocked the village lanes. Shovel each pile clear — hold E and keep at it until the lane is open again.',
    shiftMs: 150000, total: 5, max: 120, colors: { a: '#cfe6f4', b: '#3a4d5c' },
    ...snowJob,
  },
};

export const jobsInRoom = (roomId) => Object.values(JOBS).filter((j) => j.room === roomId);
