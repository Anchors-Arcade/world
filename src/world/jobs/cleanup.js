// Phase 22 · Cleanup Worker — litter has blown all over the plaza. Walk to a piece, press E to
// pick it up (up to three at a time), then drop it in a bin. Every binned piece is 10 points;
// clearing the whole lot inside the clock ends the shift early with a +40 tidy bonus.
import { floatIcon, poof, note } from './kit.js';

// open spots around the plaza's walkways, clear of buildings, the pond and the props
const SPOTS = [
  [600, 450], [450, 620], [1400, 470], [1450, 520], [1150, 830], [620, 950],
  [350, 900], [1600, 600], [600, 1000], [1640, 960], [150, 500], [1000, 680],
];
const BINS = [{ x: 620, y: 730 }, { x: 1150, y: 730 }];
const MAX_CARRY = 3;
const PICK_ICON = { paper: '📄', can: '🥫', bottle: '🍾' };

// three kinds of litter, drawn small and hand-style like the rest of the props
const KINDS = [
  { id: 'paper', draw(g, x, y) {         // a crumpled scrap of paper
    const pts = [{ x: x - 9, y }, { x: x - 3, y: y + 8 }, { x: x + 8, y: y + 6 }, { x: x + 10, y: y - 5 }, { x: x - 2, y: y - 8 }];
    g.fillStyle(0xf4fbff, 1); g.fillPoints(pts, true);
    g.lineStyle(1.5, 0x9fb8cc, 0.8); g.strokePoints(pts, true);
  } },
  { id: 'can', draw(g, x, y) {            // a battered tin can
    g.fillStyle(0x9aa7b8, 1); g.fillRoundedRect(x - 6, y - 9, 12, 18, 3);
    g.fillStyle(0x59707f, 1); g.fillRect(x - 6, y - 3, 12, 5);
    g.fillStyle(0xc9d4de, 1); g.fillEllipse(x, y - 9, 12, 4);
  } },
  { id: 'bottle', draw(g, x, y) {         // a green bottle on its side
    g.fillStyle(0x3f8f6b, 1); g.fillRoundedRect(x - 10, y - 5, 18, 10, 5);
    g.fillStyle(0x2a6f49, 1); g.fillRect(x + 7, y - 3, 6, 6);
    g.fillStyle(0xffffff, 0.5); g.fillRect(x - 7, y - 3, 10, 2);
  } },
];

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const cleanupJob = {
  begin(sys) {
    const st = sys.active.st;
    st.items = shuffle(SPOTS).slice(0, sys.active.job.total).map(([x, y], i) => {
      const kind = KINDS[i % KINDS.length];
      const g = sys.scene.add.graphics().setDepth(y);
      g.fillStyle(0x16304a, 0.14); g.fillEllipse(x, y + 4, 34, 10);
      kind.draw(g, x, y);
      sys.keep(g);
      return { x, y, kind, g, gone: false };
    });
    st.carry = [];                        // the pieces stacked over the player's head
    st.binned = 0;
    st.binArt = BINS.map((b) => {
      const s = sys.scene, g = s.add.graphics().setDepth(b.y);
      g.fillStyle(0x16304a, 0.16); g.fillEllipse(b.x, b.y + 4, 64, 14);
      g.fillStyle(0x3a6f4f); g.fillRoundedRect(b.x - 22, b.y - 46, 44, 46, 6);
      g.fillStyle(0x2a5238); g.fillRoundedRect(b.x - 25, b.y - 52, 50, 10, 4);
      g.fillStyle(0x8ff0b3, 0.8); g.fillRect(b.x - 16, b.y - 38, 32, 3); g.fillRect(b.x - 16, b.y - 28, 32, 3); g.fillRect(b.x - 16, b.y - 18, 32, 3);
      const icon = s.add.text(b.x, b.y - 60, '♻️', { fontSize: '18px' }).setOrigin(0.5, 1).setDepth(b.y + 1);
      sys.keep(g); sys.keep(icon);
      return { g, icon };
    });
    st.tags = BINS.map((b) => note(sys, b.x, b.y - 74, '0/8 binned'));
    sys.setObjective('Pick up 8 pieces of litter and bin them.');
  },

  tick(sys) {
    const st = sys.active.st, p = sys.scene.player;
    st.carry.forEach((c, i) => c.setPosition(p.x + (i - (st.carry.length - 1) / 2) * 14, p.y - 58 - (i % 2) * 8));
    let nearLitter = null;
    for (const it of st.items) if (!it.gone && sys.near(it.x, it.y, 52)) { nearLitter = it; break; }
    const nearBin = BINS.some((b) => sys.near(b.x, b.y, 66)) && st.carry.length > 0;
    if (nearBin) sys.setHint('Press E to drop the litter in the bin');
    else if (nearLitter) sys.setHint(st.carry.length >= MAX_CARRY ? 'Hands full — go empty them in a bin!' : 'Press E to pick up the litter');
    else sys.setHint('');
    st.tags.forEach((t) => t.setText(`${st.binned}/${sys.active.job.total} binned`));
  },

  onE(sys) {
    const st = sys.active.st, total = sys.active.job.total;
    if (st.carry.length && BINS.some((b) => sys.near(b.x, b.y, 66))) {
      const n = st.carry.length;
      const b = BINS.find((x) => sys.near(x.x, x.y, 66));
      st.binned += n;
      st.carry.forEach((c) => c.destroy());
      st.carry.length = 0;
      poof(sys, b.x, b.y - 34, 0x8ff0b3);
      sys.addPoints(10 * n, n === 1 ? 'Binned a piece of litter' : `Binned ${n} pieces of litter`);
      sys.setProgress(st.binned);
      if (st.binned >= total) {
        sys.addPoints(40, 'The plaza is spotless!');
        sys.setObjective('All the litter is binned — sparkling!');
        sys.finish();
      } else {
        sys.setObjective(`${st.binned}/${total} binned — keep going!`);
      }
      return true;
    }
    if (st.carry.length < MAX_CARRY) {
      const it = st.items.find((i) => !i.gone && sys.near(i.x, i.y, 52));
      if (it) {
        it.gone = true;
        it.g.destroy();
        poof(sys, it.x, it.y - 6);
        const c = floatIcon(sys, sys.scene.player.x, sys.scene.player.y - 58, PICK_ICON[it.kind.id], { size: 20, still: true });
        st.carry.push(c);
        sys.scene.tweens.add({ targets: c, scale: { from: 0.4, to: 1 }, duration: 180 });
        return true;
      }
    }
    return false;
  },

  cleanup(sys, st) {
    st.carry.forEach((c) => c.destroy());
    st.items.forEach((i) => i.g?.destroy());
    st.binArt.forEach((b) => { b.g.destroy(); b.icon.destroy(); });
  },
};
