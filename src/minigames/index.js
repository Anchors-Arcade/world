import { SnowDash } from './SnowDash.js';
import { CoinCatcher } from './CoinCatcher.js';
import { SnowballArena } from './SnowballArena.js';
export { GAMES, GAME_LIST, DEFAULT_GAME } from './registry.js';
export { MinigameManager } from './MinigameManager.js';

// Register a new game's scene class here (and in registry.js + the `minigames` SQL table).
export const MINIGAME_SCENES = [SnowDash, CoinCatcher, SnowballArena];
