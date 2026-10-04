// Phase 8 — interactive world objects, as data.
// One entry = one object the player can walk up to and press E on (or click). The scene draws it, gives it a
// collision body and an interaction zone, exactly like the shop counters and arcade cabinets of earlier phases —
// no new architecture, and nothing here is an NPC: shopkeepers stay inside the shops.
//
//   { id, label, icon, x, y, w, h, color, title, text, secret?, clue?, walkable?, flat? }
//     secret + clue  -> pressing E reports that clue to the server (find_clue); the server decides what it unlocks.
//     walkable: true -> decoration only, no collision body (still interactive).
//     flat: true     -> drawn as a flat mark on the floor instead of a standing object.
export const INTERACTIONS = {
  snowy_plaza: [
    { id: 'plaza_board', label: 'Notice Board', icon: '📋', x: 1080, y: 790, w: 110, h: 70, color: 0x8c5a3a,
      title: '📋 Notice Board',
      text: 'WELCOME TO ANCHORS WORLD\n\nThe paths west and east are open again. Travellers report strange marks in the ice caves and a light in the old lighthouse.\n\nFound something odd? Press E on it.' },
    { id: 'plaza_lamp', label: 'Lamp Post', icon: '🏮', x: 1150, y: 930, w: 44, h: 80, color: 0x34506b,
      title: '🏮 Lamp Post', text: 'A warm little flame behind frosted glass. Something glitters on the cross-bar above you.' },
  ],

  deep_forest: [
    { id: 'forest_sign', label: 'Trail Sign', icon: '🪧', x: 1380, y: 520, w: 120, h: 70, color: 0x6b4428,
      title: '🪧 Trail Sign', text: '◂ PLAZA\n▴ SNOW CAMP\n\nUnder the arrows somebody has scratched: "four pines sing — listen in order".' },
    { id: 'pine_1', label: 'Humming Pine', icon: '🌲', x: 300, y: 620, w: 70, h: 70, color: 0x1f6b4f, secret: 'whistling_pines', clue: 'pine_1',
      title: '🌲 A Humming Pine', text: 'You press your ear to the bark. Deep inside the trunk something hums a low note.' },
    { id: 'pine_2', label: 'Humming Pine', icon: '🌲', x: 640, y: 380, w: 70, h: 70, color: 0x1f6b4f, secret: 'whistling_pines', clue: 'pine_2',
      title: '🌲 A Humming Pine', text: 'The same hum, a tone higher. The needles tremble even though there is no wind in here.' },
    { id: 'pine_3', label: 'Humming Pine', icon: '🌲', x: 1080, y: 300, w: 70, h: 70, color: 0x1f6b4f, secret: 'whistling_pines', clue: 'pine_3',
      title: '🌲 A Humming Pine', text: 'A third note. Three pines are now humming together behind you.' },
    { id: 'pine_4', label: 'Humming Pine', icon: '🌲', x: 1140, y: 860, w: 70, h: 70, color: 0x1f6b4f, secret: 'whistling_pines', clue: 'pine_4',
      title: '🌲 A Humming Pine', text: 'The last note slots into place. The whole clearing rings like a struck glass.' },
    { id: 'forest_stone', label: 'Mossy Stone', icon: '🪨', x: 520, y: 760, w: 90, h: 60, color: 0x6c7d74,
      title: '🪨 Mossy Stone', text: 'Letters worn almost flat: "WE WENT UP THE PASS. IF THE CAIRNS ARE DOWN, PUT THEM BACK."' },
  ],

  snow_camp: [
    { id: 'camp_fire', label: 'Campfire', icon: '🔥', x: 655, y: 435, w: 90, h: 70, color: 0xb5703f,
      title: '🔥 Campfire', text: 'Still warm. Somebody banked it carefully before they left, which means they meant to come back.' },
    { id: 'camp_pile_a', label: 'Snow Pile', icon: '🌨️', x: 380, y: 480, w: 90, h: 60, color: 0xe9f4fb,
      title: '🌨️ Snow Pile', text: 'You dig a little. Just snow, and a lot of it.' },
    { id: 'camp_pile_b', label: 'Snow Pile', icon: '🌨️', x: 860, y: 460, w: 90, h: 60, color: 0xe9f4fb,
      title: '🌨️ Snow Pile', text: 'Snow, a pinecone, and an old sock. Not it.' },
    { id: 'camp_pile_neat', label: 'Neat Snow Pile', icon: '🌨️', x: 980, y: 420, w: 90, h: 60, color: 0xdfeefb, secret: 'buried_cache', clue: 'neat_pile',
      title: '🌨️ A Very Neat Snow Pile', text: 'This one has straight edges. Nobody shovels snow this tidily by accident — and your boot hits wood.' },
    { id: 'camp_board', label: 'Camp Notice', icon: '📋', x: 540, y: 700, w: 110, h: 70, color: 0x8c5a3a,
      title: '📋 Camp Notice', text: 'ROTA: fire, cocoa, cocoa, cocoa.\n\nBelow, in different handwriting: "buried the medal where the snow is tidy".' },
    { id: 'camp_crate', label: 'Supply Crate', icon: '📦', x: 1140, y: 480, w: 80, h: 70, color: 0x9c5f12,
      title: '📦 Supply Crate', text: 'Rope, two mugs, a spare lantern and absolutely no cocoa left.' },
  ],

  frozen_lake: [
    { id: 'lake_sign', label: 'Warning Sign', icon: '🪧', x: 380, y: 620, w: 120, h: 70, color: 0x6b4428,
      title: '🪧 Warning Sign', text: 'THIN ICE IN THE MIDDLE.\n\nSomebody has crossed out "thin" and written "fine, probably".' },
    { id: 'lake_bubble', label: 'Bubble in the Ice', icon: '🫧', x: 760, y: 530, w: 90, h: 60, color: 0xbfe8fb, flat: true, walkable: true,
      secret: 'frozen_message', clue: 'ice_bubble',
      title: '🫧 Something in the Ice', text: 'A bubble the size of a dinner plate, and inside it a glint of metal on a chain. You tap once. The ice sighs and lets it go.' },
    { id: 'lake_hole', label: 'Fishing Hole', icon: '🕳️', x: 1100, y: 760, w: 80, h: 60, color: 0x8fd3f0, flat: true, walkable: true,
      title: '🕳️ Fishing Hole', text: 'Cut this morning, already glazing over. A line of footprints leads off towards the harbour.' },
    { id: 'lake_skates', label: 'Old Skates', icon: '⛸️', x: 640, y: 840, w: 70, h: 60, color: 0x7fa6c9,
      title: '⛸️ Old Skates', text: 'Hung on a post by their laces, three sizes too small for anyone here. The key for them is still missing.' },
  ],

  harbor_village: [
    { id: 'harbor_bell', label: 'Harbour Bell', icon: '🔔', x: 820, y: 420, w: 70, h: 90, color: 0xc9a227,
      title: '🔔 Harbour Bell', text: 'You ring it once. The sound rolls out over the water and comes back thinner, from somewhere up the coast.' },
    { id: 'harbor_crates', label: 'Fish Crates', icon: '🐟', x: 1240, y: 740, w: 140, h: 70, color: 0x9c5f12,
      title: '🐟 Fish Crates', text: 'Stacked three high and smelling exactly as you would expect. Something round is wedged in the gap.' },
    { id: 'harbor_post', label: 'Mooring Post', icon: '🪢', x: 460, y: 760, w: 50, h: 70, color: 0x6b4428,
      title: '🪢 Mooring Post', text: 'A knot you have never seen before, pulled tight by years of tide. A charm hangs off the end of it.' },
    { id: 'harbor_board', label: 'Harbour Notice', icon: '📋', x: 640, y: 300, w: 110, h: 70, color: 0x8c5a3a,
      title: '📋 Harbour Notice', text: 'BOATS: none today.\nWEATHER: snow.\nLIGHTHOUSE: keeper away — do not touch the lamp.\n\n"do not" has been underlined twice, which is practically an invitation.' },
  ],

  lighthouse: [
    { id: 'light_switch', label: 'Lamp Switch', icon: '💡', x: 420, y: 200, w: 70, h: 90, color: 0xffc247, secret: 'lantern_signal', clue: 'lamp_switch',
      title: '💡 The Lamp Switch', text: 'You pull the handle. The great lens turns, catches, and throws a beam straight out over the frozen lake. Somewhere below, a hatch clicks open.' },
    { id: 'light_desk', label: "Keeper's Desk", icon: '📖', x: 640, y: 420, w: 120, h: 70, color: 0x6b4428,
      title: "📖 Keeper's Desk", text: 'Tide tables, a cold cup of tea, and a logbook left open at a page with nothing on it but a small ink star.' },
    { id: 'light_charts', label: 'Wall Charts', icon: '🗺️', x: 180, y: 190, w: 120, h: 80, color: 0x3d5a80,
      title: '🗺️ Wall Charts', text: 'The coast, drawn by hand. Up in the mountains, away from the sea, somebody has inked a small circle and written "they watch the sky here".' },
  ],

  mountain_pass: [
    { id: 'pass_sign', label: 'Signpost', icon: '🪧', x: 620, y: 700, w: 120, h: 70, color: 0x6b4428,
      title: '🪧 Signpost', text: '▾ FROZEN LAKE\n◂ ICE CAVES\n▸ OLD OBSERVATORY\n\nA fourth arm has snapped off and lies in the snow, pointing nowhere.' },
    { id: 'cairn_1', label: 'Fallen Cairn', icon: '🪨', x: 420, y: 560, w: 80, h: 70, color: 0x8a9aa6, secret: 'cairn_road', clue: 'cairn_1',
      title: '🪨 Fallen Cairn', text: 'You stack the stones back up, biggest first. It takes a while and your gloves are now soaking.' },
    { id: 'cairn_2', label: 'Fallen Cairn', icon: '🪨', x: 760, y: 400, w: 80, h: 70, color: 0x8a9aa6, secret: 'cairn_road', clue: 'cairn_2',
      title: '🪨 Fallen Cairn', text: 'The second cairn goes up faster. From here you can see where the third one should be.' },
    { id: 'cairn_3', label: 'Fallen Cairn', icon: '🪨', x: 1060, y: 660, w: 80, h: 70, color: 0x8a9aa6, secret: 'cairn_road', clue: 'cairn_3',
      title: '🪨 Fallen Cairn', text: 'Three cairns, straight as a ruler. Looked at from the right angle they trace the old road — and a marker stone you had not noticed.' },
    { id: 'pass_boulder', label: 'Split Boulder', icon: '⛰️', x: 900, y: 820, w: 140, h: 90, color: 0x6c7d74,
      title: '⛰️ Split Boulder', text: 'Cracked clean in two, with a very old iron spike driven into the fault line.' },
  ],

  ice_caves: [
    { id: 'mark_a', label: 'Glowing Mark', icon: '🔹', x: 380, y: 260, w: 70, h: 70, color: 0x5bb6e8, secret: 'hollow_crack', clue: 'mark_a',
      title: '🔹 A Glowing Mark', text: 'A hand-sized spiral, cut into the ice and lit from somewhere behind it. Its tail points along the wall.' },
    { id: 'mark_b', label: 'Glowing Mark', icon: '🔹', x: 860, y: 320, w: 70, h: 70, color: 0x5bb6e8, secret: 'hollow_crack', clue: 'mark_b',
      title: '🔹 A Glowing Mark', text: 'The second spiral, turned the other way. Two lines, and they cross somewhere to the west.' },
    { id: 'mark_c', label: 'Glowing Mark', icon: '🔹', x: 1060, y: 700, w: 70, h: 70, color: 0x5bb6e8, secret: 'hollow_crack', clue: 'mark_c',
      title: '🔹 A Glowing Mark', text: 'The third spiral. All three point at the same stretch of wall — and with a crack like a dropped plate, it opens.' },
    { id: 'cave_wall', label: 'Cracked Wall', icon: '🧊', x: 160, y: 380, w: 120, h: 90, color: 0x9fd8ef,
      title: '🧊 Cracked Wall', text: 'Not ice: frozen-over stone, hollow when you knock on it. The marks in this cave all seem to aim at it.' },
    { id: 'cave_drip', label: 'Dripping Column', icon: '💧', x: 700, y: 480, w: 60, h: 100, color: 0xbfe8fb,
      title: '💧 Dripping Column', text: 'An icicle growing up to meet one growing down. Give them another century.' },
  ],

  crystal_hollow: [
    { id: 'hollow_core', label: 'Great Crystal', icon: '💎', x: 440, y: 180, w: 130, h: 140, color: 0xb48cff,
      title: '💎 The Great Crystal', text: 'Taller than the Town Hall door and humming the same note as the pines in the forest. Nobody has stood here for a very long time.' },
    { id: 'hollow_scratch', label: 'Wall Scratches', icon: '✒️', x: 760, y: 200, w: 110, h: 80, color: 0x7a6ea8,
      title: '✒️ Wall Scratches', text: 'Tally marks, hundreds of them, and at the end: "the sky room is sealed. the dials know."' },
  ],

  observatory: [
    { id: 'obs_scope', label: 'Great Telescope', icon: '🔭', x: 470, y: 380, w: 170, h: 130, color: 0x4a6fa5,
      title: '🔭 The Great Telescope', text: 'Brass, enormous, and pointing at the floor. Looking through it you see only your own reflection, slightly disappointed.' },
    { id: 'dial_north', label: 'North Dial', icon: '🧭', x: 300, y: 210, w: 80, h: 80, color: 0xc9a227, secret: 'star_alignment', clue: 'dial_north',
      title: '🧭 North Dial', text: 'You turn it until the pointer sits on the notch marked with a long scratch. It clunks into place.' },
    { id: 'dial_west', label: 'West Dial', icon: '🧭', x: 610, y: 210, w: 80, h: 80, color: 0xc9a227, secret: 'star_alignment', clue: 'dial_west',
      title: '🧭 West Dial', text: 'The second dial fights you, then gives. Somewhere above, gears take up the slack.' },
    { id: 'old_chart', label: 'Old Sky Chart', icon: '🗞️', x: 830, y: 470, w: 130, h: 80, color: 0xd8c9a3, secret: 'star_alignment', clue: 'old_chart',
      title: '🗞️ Old Sky Chart', text: 'Three constellations circled, and the dial settings written beside them. You match the last one — and the wall behind the telescope folds open.' },
    { id: 'obs_shelf', label: 'Lens Shelf', icon: '📚', x: 150, y: 540, w: 120, h: 70, color: 0x6b4428,
      title: '📚 Lens Shelf', text: 'Forty lenses in forty velvet pockets, and one pocket empty.' },
  ],

  star_chamber: [
    { id: 'star_orrery', label: 'Orrery', icon: '🪐', x: 420, y: 170, w: 160, h: 140, color: 0x6a4fb3,
      title: '🪐 The Orrery', text: 'Brass planets on brass arms, still turning. One gear is missing a tooth and the whole sky stutters once a minute.' },
    { id: 'star_ceiling', label: 'Painted Ceiling', icon: '✨', x: 740, y: 180, w: 120, h: 90, color: 0x2d2a5e,
      title: '✨ Painted Ceiling', text: 'The winter sky as it was, in gold leaf. One star is painted brighter than the rest, and it is not a star.' },
  ],
};

export const interactionsIn = (roomId) => INTERACTIONS[roomId] || [];
// Every clue that is actually reachable through an object in the world (used by the Phase 8 test).
export const CLUE_SOURCES = Object.values(INTERACTIONS).flat().filter((o) => o.secret && o.clue)
  .map((o) => ({ secret: o.secret, clue: o.clue, room: o.id }));
