// Phase 22 · Maintenance Worker — something in town is always broken. Three things, today: both
// plaza lamps are flickering and the poor snowman has come loose in the wind. Tighten each one's
// bolts with a well-timed press of E; every bolt is 10 points, a dead-centre hit +5, and a
// finished repair +5 more. Max 150.
import { spot, floatIcon, poof, note, timingBar } from './kit.js';

// things that are broken today: the plaza's two lamps (addProp draws them at these spots) and
// the snowman — real objects already in the room, we just dress them as "out of order"
const TARGETS = [
  { name: 'west lamp',  x: 700,  y: 620, icon: '💡' },
  { name: 'east lamp',  x: 1100, y: 620, icon: '💡' },
  { name: 'snowman',    x: 1500, y: 880, icon: '⛄' },
];
const BOLTS = 3;

export const maintenanceJob = {
  begin(sys) {
    const st = sys.active.st;
    st.items = TARGETS.map((t) => {
      const warn = floatIcon(sys, t.x, t.y - 104, '⚡', { size: 22 });       // the flicker above it
      const glow = spot(sys, t.x, t.y + 10, 0xff6b4a);                      // "out of order" red glow
      return { ...t, warn, glow, fixed: false };
    });
    st.repair = null;                                                       // the active timing bar
    st.bolts = 0; st.target = null;
    st.tally = note(sys, 900, 600, '🛠️ 0/3 fixed');
    sys.setObjective('Find the 3 broken things (⚡) and tighten their bolts.');
  },

  startRepair(sys, item) {
    const st = sys.active.st;
    st.target = item;
    st.bolts = 0;
    this.newBolt(sys);
  },

  newBolt(sys) {
    const st = sys.active.st;
    st.repair = timingBar(sys, sys.player.x, sys.player.y - 66, {
      label: `Press E to tighten bolt ${st.bolts + 1}/${BOLTS} on the ${st.target.name}`,
      w: 220,
    });
    // later targets are a bit trickier: the zone shrinks and drifts
    const idx = TARGETS.indexOf(st.target);
    st.repair.setZone(0.2 + Math.random() * 0.55, 0.26 - idx * 0.04);
    st.marker = 0; st.dir = 1;
    st.repair.marker = 0;
    st.repair.draw();
    sys.setObjective(`${st.target.name}: tighten the bolts — stop the marker in the green.`);
  },

  strike(sys) {
    const st = sys.active.st;
    const perfect = st.repair.inZone(true), ok = st.repair.inZone();
    st.repair.cont.destroy(); st.repair = null;
    if (!ok) { sys.setHint('Missed the bolt — wait for the green and try again'); return; }
    st.bolts++;
    poof(sys, st.target.x, st.target.y - 40, perfect ? 0xffc247 : 0x9fb8cc);
    sys.addPoints(perfect ? 15 : 10, perfect ? 'Perfect bolt!' : 'Bolt tightened');
    if (st.bolts < BOLTS) return this.newBolt(sys);
    // the whole thing is fixed
    st.target.fixed = true;
    st.target.warn.destroy(); st.target.glow.destroy();
    poof(sys, st.target.x, st.target.y - 60, 0x8ff0b3);
    floatIcon(sys, st.target.x, st.target.y - 110, '✅', { size: 20 });
    sys.addPoints(5, `The ${st.target.name} works again`);
    const done = st.items.filter((i) => i.fixed).length;
    st.tally.setText(`🛠️ ${done}/3 fixed`);
    st.target = null;
    if (done >= st.items.length) {
      sys.setObjective('Everything in town works again!');
      sys.finish();
    } else {
      sys.setProgress(done);
      sys.setObjective(`${done}/3 fixed — find the next ⚡.`);
    }
  },

  tick(sys, time, delta) {
    const st = sys.active.st;
    if (st.repair) {
      const p = sys.player;
      st.repair.cont.setPosition(p.x, p.y - 66);
      st.marker += st.dir * (delta / 620) * (1 + st.items.filter((i) => i.fixed).length * 0.15);
      if (st.marker >= 1) { st.marker = 1; st.dir = -1; }
      if (st.marker <= 0) { st.marker = 0; st.dir = 1; }
      st.repair.marker = st.marker;
      st.repair.draw();
      sys.setHint('Press E when the marker is in the green');
      return;
    }
    // warn signs flicker over the broken things
    const now = time % 1000;
    st.items.forEach((i) => { if (!i.fixed) i.warn.setAlpha(now < 500 ? 1 : 0.35); });
    const near = st.items.find((i) => !i.fixed && sys.near(i.x, i.y, 74));
    sys.setHint(near ? `Press E to fix the broken ${near.name}` : '');
  },

  onE(sys) {
    const st = sys.active.st;
    if (st.repair) { this.strike(sys); return true; }
    const near = st.items.find((i) => !i.fixed && sys.near(i.x, i.y, 74));
    if (near) { this.startRepair(sys, near); return true; }
    return false;
  },

  cleanup(sys, st) {
    st.repair?.cont.destroy();
  },
};
