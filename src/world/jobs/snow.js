// Phase 22 · Snow Crew — overnight snow has drifted across the village lanes. Stand by a pile,
// hold E, and shovel: the pile visibly shrinks as you work and leaves a swept lane behind it.
// Each cleared pile is 20 points; open every lane in the shift for a +20 bonus. Max 120.
import { poof, note } from './kit.js';

// where the drifts landed: the village's walk lanes, clear of the hearth, cabins, igloo and fences
const SPOTS = [[500, 940], [800, 940], [1100, 940], [950, 700], [450, 820]];
const DIG_MS = 2200;                     // full shovel time per pile
const R = 62;                            // stand this close to keep digging

export const snowJob = {
  begin(sys) {
    const st = sys.active.st;
    st.piles = SPOTS.map(([x, y]) => {
      const s = sys.scene;
      const cont = s.add.container(x, y).setDepth(y);
      const g = s.add.graphics();
      g.fillStyle(0x16304a, 0.12); g.fillEllipse(0, 8, 86, 20);                    // ground shadow
      g.fillStyle(0xeef7ff, 1); g.fillEllipse(0, 0, 84, 34);                        // the drift
      g.fillStyle(0xf9fdff, 1); g.fillEllipse(-6, -8, 58, 22);
      g.fillStyle(0xd9ecfa, 0.9); g.fillEllipse(14, 6, 40, 14);
      cont.add(g);
      sys.keep(cont);
      return { x, y, cont, g, dig: 0, cleared: false };
    });
    st.digging = null;                   // the pile being shovelled right now
    st.cleared = 0;
    st.tally = note(sys, 650, 1050, '🧊 0/5 lanes open');
    sys.setObjective('Hold E at each snow pile until the lane is clear. 5 piles.');
  },

  tick(sys, time, delta) {
    const st = sys.active.st;
    let pile = null;
    for (const p of st.piles) if (!p.cleared && sys.near(p.x, p.y, R)) { pile = p; break; }

    if (pile && sys.scene.keys.E.isDown) {
      if (st.digging !== pile) { st.digging = pile; pile.dig = 0; }
      pile.dig += delta / DIG_MS;
      pile.cont.setScale(Math.max(0.25, 1 - pile.dig * 0.8));                      // it visibly shrinks
      sys.setHint('Keep holding E — shovel, shovel…');
      if (pile.dig >= 1) this.clear(sys, pile);
    } else {
      if (st.digging) {                                                             // let go: the drift settles back
        st.digging.cont.setScale(1);
        st.digging.dig = 0;
        st.digging = null;
      }
      sys.setHint(pile ? 'Hold E to shovel the pile' : '');
    }
  },

  clear(sys, pile) {
    const st = sys.active.st, s = sys.scene;
    pile.cleared = true;
    st.digging = null;
    st.cleared++;
    pile.cont.destroy();
    // a swept lane mark where the drift was — the path stays visibly open afterwards
    const lane = s.add.graphics().setDepth(pile.y - 1);
    lane.fillStyle(0xd6e6f2, 0.7); lane.fillEllipse(pile.x, pile.y + 4, 78, 18);
    sys.keep(lane);
    poof(sys, pile.x, pile.y - 14, 0xf4fbff);
    sys.addPoints(20, 'Lane cleared');
    sys.setProgress(st.cleared);
    st.tally.setText(`🧊 ${st.cleared}/${sys.active.job.total} lanes open`);
    if (st.cleared >= sys.active.job.total) {
      sys.addPoints(20, 'Every lane in the village is open!');
      sys.setObjective('All lanes clear — the village can get about again!');
      sys.finish();
    } else {
      sys.setObjective(`${st.cleared}/${sys.active.job.total} piles cleared — on to the next.`);
    }
  },

  // Pressing E at a pile does the opening push; the real digging is the hold in tick().
  onE(sys) {
    const st = sys.active.st;
    return st.piles.some((p) => !p.cleared && sys.near(p.x, p.y, R));
  },

  cleanup() { /* every pile, mark and tally went through sys.keep() */ },
};
