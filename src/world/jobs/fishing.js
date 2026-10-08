// Phase 22 · Ice Fisher — glowing holes are cut in the lake; walk to one, press E to cast, and
// strike the instant the float dips. Too early and the fish bolts; too late and it is gone.
// Rarer fish are worth more, and a quick strike earns a little extra: four casts is a shift.
import { spot, floatIcon, poof, note } from './kit.js';
import { toast } from '../../ui/hud.js';

const HOLES = [[650, 480], [800, 420], [950, 500], [700, 600], [880, 610], [1000, 450]];
const BITE_WINDOW = 750;                 // ms to strike once the float dips
const FISH = [
  { name: 'Sardine',        value: 8,  color: 0x9fb8cc, weight: 45 },
  { name: 'Bluefin',        value: 14, color: 0x3f8fc9, weight: 30 },
  { name: 'Glacier Trout',  value: 20, color: 0x2a6f49, weight: 20 },
  { name: 'Golden Anchovy', value: 30, color: 0xffc247, weight: 5 },
];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const pickFish = () => {
  const total = FISH.reduce((n, f) => n + f.weight, 0), roll = Math.random() * total;
  let acc = 0;
  for (const f of FISH) { acc += f.weight; if (roll < acc) return f; }
  return FISH[0];
};

export const fishingJob = {
  begin(sys) {
    const st = sys.active.st;
    st.spots = shuffle(HOLES).slice(0, sys.active.job.total).map(([x, y]) => {
      const s = sys.scene, g = s.add.graphics().setDepth(y);
      g.fillStyle(0x16304a, 0.5); g.fillEllipse(x, y, 64, 34);         // the hole in the ice
      g.fillStyle(0x0b2a44, 0.95); g.fillEllipse(x, y, 52, 24);
      g.lineStyle(3, 0xd9f2ff, 0.85); g.strokeEllipse(x, y, 64, 34);
      const glow = s.add.ellipse(x, y, 96, 52, 0x9fe3ff, 0.25).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD);
      sys.keep(g); sys.keep(glow);
      return { x, y, g, glow, used: false, open: false };
    });
    st.cast = null; st.casts = 0; st.float = null; st.fishCount = 0;
    st.tally = note(sys, 430, 700, '🎣 0 fish');
    this.openHole(sys);
    sys.setObjective('Cast into 4 glowing holes and strike when the float dips.');
  },

  openHole(sys) {
    const st = sys.active.st;
    const hole = st.spots.find((h) => !h.used && !h.open);
    st.spots.forEach((h) => { h.open = h === hole; h.glow.setAlpha(h === hole ? 0.45 : 0.1); });
    if (hole) spot(sys, hole.x, hole.y + 26, 0x9fe3ff);
  },

  castIn(sys, hole) {
    const st = sys.active.st;
    st.casts++;
    sys.setProgress(st.casts);
    hole.open = false;
    st.cast = { hole, phase: 'wait', dipAt: Date.now() + 900 + Math.random() * 1800, bitAt: 0 };
    st.float = floatIcon(sys, hole.x, hole.y - 8, '🔴', { size: 14, still: true });  // the float sits on the hole
    sys.setObjective(`Cast ${st.casts}/4 — watch the float…`);
  },

  bite(sys) {
    const st = sys.active.st;
    st.cast.phase = 'bite';
    st.cast.bitAt = Date.now();
    const h = st.cast.hole;
    st.float?.setText('❗');
    poof(sys, h.x, h.y - 6, 0x9fe3ff);
    sys.setHint('STRIKE! Press E!');
  },

  resolve(sys, caught, perfect) {
    const st = sys.active.st, h = st.cast.hole;
    st.cast = null;
    st.float?.destroy(); st.float = null;
    h.used = true;
    h.glow.setAlpha(0.06);
    if (caught) {
      const f = st.fish || pickFish();
      st.fishCount += 1;
      const pts = f.value + (perfect ? 8 : 0);
      sys.addPoints(pts, `Caught a ${f.name}${perfect ? ' — perfect strike!' : ''}`);
      // the fish leaps out and is gone
      const s = sys.scene, fg = s.add.graphics().setDepth(h.y + 40);
      fg.fillStyle(f.color, 1); fg.fillEllipse(h.x, h.y - 30, 26, 13);
      fg.fillStyle(f.color, 1); fg.fillTriangle(h.x - 13, h.y - 30, h.x - 21, h.y - 37, h.x - 21, h.y - 23);
      fg.fillStyle(0x16304a, 1); fg.fillCircle(h.x + 7, h.y - 33, 1.8);
      sys.keep(fg);
      s.tweens.add({ targets: fg, y: -50, angle: 25, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => fg.destroy() });
      st.tally.setText(`🎣 ${st.fishCount} fish`);
    } else {
      poof(sys, h.x, h.y - 4, 0x9aa7b8);
    }
    if (st.casts >= sys.active.job.total) {
      sys.setObjective(st.fishCount ? `${st.fishCount} fish — lines up!` : 'No fish today…');
      sys.finish();
    } else {
      this.openHole(sys);
      sys.setObjective(`Cast ${st.casts}/4 done — head to the next glowing hole.`);
    }
  },

  tick(sys) {
    const st = sys.active.st, now = Date.now();
    if (st.cast?.phase === 'wait' && now >= st.cast.dipAt) this.bite(sys);
    if (st.cast?.phase === 'bite' && now - st.cast.bitAt > BITE_WINDOW) {
      sys.setHint('');
      toast('Too slow — it spat the bait!');
      this.resolve(sys, false, false);                                   // too slow — it spat the bait
    }
    if (!st.cast) {
      const h = st.spots.find((x) => x.open);
      sys.setHint(h && sys.near(h.x, h.y, 60) ? 'Press E to cast your line' : h ? 'Cast into the glowing hole' : '');
    }
  },

  onE(sys) {
    const st = sys.active.st;
    if (st.cast) {
      if (st.cast.phase === 'bite') {
        const perfect = Date.now() - st.cast.bitAt < BITE_WINDOW * 0.45;
        st.fish = pickFish();
        this.resolve(sys, true, perfect);
      } else {
        toast('Too soon — the fish bolted!');
        this.resolve(sys, false, false);                                 // too soon — the fish bolted
      }
      return true;
    }
    const h = st.spots.find((x) => x.open && sys.near(x.x, x.y, 60));
    if (h) { this.castIn(sys, h); return true; }
    return false;
  },

  cleanup(sys, st) {
    st.float?.destroy();
  },
};
