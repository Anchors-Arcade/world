// Display metadata for every minigame. The SERVER owns the real rules (score limits, reward tiers, daily cap): see the
// `minigames` table in supabase/phase7.sql. Numbers here are only used for offline / guest fallbacks and for labels.
// To add a game: 1) add a row to `minigames` in SQL, 2) add an entry here, 3) write a scene that extends MinigameScene,
// 4) register the scene class in minigames/index.js. Nothing else changes.
export const GAMES = {
  snow_dash: {
    id: 'snow_dash', scene: 'SnowDash', name: 'Snow Dash', emoji: '🏁', icon: '❄️',
    tagline: 'Race through a snowy obstacle course.',
    description: 'Slide downhill on your sled and dodge trees, rocks and snowmen. Hit the boost pads and reach the finish line as fast as you can!',
    controls: '← → / A D to steer · or hold & drag',
    colors: { a: '#5bb6e8', b: '#2a6fa0' }, scoreLabel: 'Score', fallbackReward: 125, rewardMinMs: 12000,
  },
  coin_catcher: {
    id: 'coin_catcher', scene: 'CoinCatcher', name: 'Coin Catcher', emoji: '🪙', icon: '🪙',
    tagline: 'Catch falling treasure and avoid hazards.',
    description: 'Catch coins and gems in your basket to build a combo. Dodge the spiky ice bombs and icicles. 45 seconds on the clock!',
    controls: '← → / A D to move · or move your mouse / finger',
    colors: { a: '#ffc247', b: '#b8750f' }, scoreLabel: 'Score', fallbackReward: 110, rewardMinMs: 20000,
  },
  snowball_arena: {
    id: 'snowball_arena', scene: 'SnowballArena', name: 'Snowball Arena', emoji: '☃️', icon: '☃️',
    tagline: 'Hit the targets with snowballs.',
    description: 'Aim, throw and keep your streak alive. Snowmen, bullseyes and golden snowmen score big. Careful: don’t hit the friendly penguins!',
    controls: 'Aim with the mouse / finger · click or tap to throw · A D to move',
    colors: { a: '#ff7a8a', b: '#b8334a' }, scoreLabel: 'Score', fallbackReward: 110, rewardMinMs: 20000,
  },
};
export const GAME_LIST = Object.values(GAMES);
export const DEFAULT_GAME = 'snow_dash';
