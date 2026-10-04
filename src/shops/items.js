// Single source of truth for the cosmetic catalog (client rendering + SQL seed via scripts/gen-seed.mjs).
// Item id === texture key === `asset` column. Slot name === category.
export const SLOTS = ['eyes', 'face', 'hat', 'accessory', 'shirt', 'pants', 'shoes', 'back', 'hand'];
export const BODY_TYPES = { round: [1, 1], tall: [0.9, 1.14], chubby: [1.14, 0.94] };
export const BODY_COLORS = ['#4aa8ff', '#ff7a8a', '#ffc247', '#6fd08c', '#b48cff', '#ff9a52', '#59d0c8', '#9aa7b8'];
export const RARITY = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', event: 'Event' };

// Where each layer sits relative to the avatar's feet (container origin).
export const LAYOUT = {
  back: { x: 0, y: -24 }, pants: { x: 0, y: -9 }, shirt: { x: 0, y: -14 }, accessory: { x: 0, y: -16 },
  eyes: { x: 0, y: -36 }, face: { x: 0, y: -33 }, hat: { x: 0, y: -50 }, hand: { x: 27, y: -14 },
};

const I = (id, name, category, rarity, price, description, extra = {}) => ({ id, name, category, rarity, price, description, asset: id, ...extra });
export const ITEMS = [
  I('eyes_0', 'Bright Eyes', 'eyes', 'common', 0, 'Wide awake.', { starter: true }),
  I('eyes_1', 'Happy Eyes', 'eyes', 'common', 0, 'Always smiling.', { starter: true }),
  I('eyes_2', 'Sleepy Eyes', 'eyes', 'common', 0, 'Five more minutes…', { starter: true }),
  I('eyes_3', 'Sparkle Eyes', 'eyes', 'uncommon', 100, 'Starry-eyed.'),
  I('face_blush', 'Rosy Cheeks', 'face', 'common', 0, 'Cold-nose blush.', { starter: true }),
  I('face_freckles', 'Freckles', 'face', 'common', 40, 'Sun-kissed, somehow.'),
  I('face_glasses', 'Round Glasses', 'face', 'uncommon', 80, 'Bookish and cozy.'),
  I('face_sunglasses', 'Snow Shades', 'face', 'rare', 150, 'Glare-proof.'),
  I('hat_beanie', 'Red Beanie', 'hat', 'common', 0, 'The classic.', { starter: true }),
  I('hat_beanie_blue', 'Blue Beanie', 'hat', 'common', 80, 'Cool in every way.'),
  I('hat_earmuffs', 'Earmuffs', 'hat', 'uncommon', 100, 'Toasty ears.'),
  I('hat_party', 'Party Hat', 'hat', 'uncommon', 120, 'Every day is a party.'),
  I('hat_tophat', 'Top Hat', 'hat', 'rare', 250, 'Very distinguished.'),
  I('hat_crown', 'Ice Crown', 'hat', 'epic', 600, 'Rule the plaza.'),
  I('accessory_scarf', 'Striped Scarf', 'accessory', 'common', 60, 'Wrap up warm.'),
  I('accessory_bowtie', 'Bow Tie', 'accessory', 'uncommon', 90, 'Dapper.'),
  I('accessory_bell', 'Jingle Bell', 'accessory', 'uncommon', 70, 'Jingles when you waddle.'),
  I('shirt_stripe', 'Striped Tee', 'shirt', 'common', 0, 'Simple and sailor-y.', { starter: true }),
  I('shirt_hoodie', 'Cozy Hoodie', 'shirt', 'common', 120, 'Pocket included.'),
  I('shirt_sweater', 'Nordic Sweater', 'shirt', 'uncommon', 150, 'Knitted by someone who cares.'),
  I('shirt_tux', 'Tuxedo', 'shirt', 'rare', 300, 'Black-tie ready.'),
  I('pants_jeans', 'Blue Jeans', 'pants', 'common', 70, 'Never out of style.'),
  I('pants_cargo', 'Cargo Pants', 'pants', 'common', 90, 'So many pockets.'),
  I('pants_snow', 'Snow Pants', 'pants', 'uncommon', 140, 'Built for snowball fights.'),
  I('shoes_boots', 'Winter Boots', 'shoes', 'common', 90, 'Stomp-ready.'),
  I('shoes_sneakers', 'White Sneakers', 'shoes', 'common', 80, 'Fresh kicks.'),
  I('shoes_skates', 'Ice Skates', 'shoes', 'rare', 200, 'Glide into style.'),
  I('back_backpack', 'Explorer Pack', 'back', 'common', 150, 'Snacks inside.'),
  I('back_cape', 'Hero Cape', 'back', 'rare', 300, 'Flutters dramatically.'),
  I('back_wings', 'Frost Wings', 'back', 'epic', 450, 'Shimmering and silly.'),
  I('hand_snowball', 'Snowball', 'hand', 'common', 20, 'Packed fresh.'),
  I('hand_icecream', 'Ice Cream', 'hand', 'common', 40, 'Yes, in the snow.'),
  I('hand_balloon', 'Balloon', 'hand', 'uncommon', 60, 'Floaty.'),
  I('hand_umbrella', 'Umbrella', 'hand', 'uncommon', 100, 'For snow showers.'),
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function normalizeAvatar(d = {}) {
  const out = { bodyType: BODY_TYPES[d.bodyType] ? d.bodyType : 'round', color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : BODY_COLORS[0] };
  for (const slot of SLOTS) {
    let v = d[slot];
    if (v == null || v === false) v = null;
    else if (typeof v === 'number') v = `${slot}_${v}`;
    else if (!String(v).startsWith(slot + '_')) v = `${slot}_${v}`;       // legacy: 'beanie' -> 'hat_beanie'
    out[slot] = v && ITEM_BY_ID[v]?.category === slot ? v : null;
  }
  if (!out.eyes) out.eyes = 'eyes_0';
  return out;
}
