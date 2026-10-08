// Phase 22 · Delivery Worker — grab a parcel at the station, carry it to the address on the tag,
// press E at the door. Four parcels is a shift; each delivery is 20 points and a fast one (under
// its par time) is +10. The plaza is the whole route: every building has a doorstep.
import { spot, floatIcon, poof, note, pointer } from './kit.js';

// the station itself is a world object (interactions.js, art 'counter', footprint 560..670 × 500..580);
// this is the patch of floor in front of it where the player stands to load up
const STATION = { x: 615, y: 612 };
const PAR = 22000;                        // a delivery counted "fast" if made inside this many ms

// delivery addresses: doorsteps of the plaza buildings (label matches the tag on the parcel)
const STOPS = [
  { label: 'the Library',        emoji: '📚', x: 205,  y: 330 },
  { label: 'the School',         emoji: '🔔', x: 495,  y: 340 },
  { label: 'the Town Hall',      emoji: '🏛️', x: 900,  y: 340 },
  { label: 'the Arcade',         emoji: '🕹️', x: 1300, y: 340 },
  { label: 'the Café',           emoji: '☕', x: 1590, y: 340 },
  { label: 'the Clothing Shop',  emoji: '🧥', x: 360,  y: 750 },
  { label: 'the Furniture Shop', emoji: '🛋️', x: 1445, y: 750 },
  { label: 'My Home',            emoji: '🏠', x: 900,  y: 950 },
];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const deliveryJob = {
  begin(sys) {
    const st = sys.active.st;
    st.stops = shuffle(STOPS).slice(0, sys.active.job.total);
    st.leg = -1; st.carry = null; st.legStart = 0;
    st.glow = spot(sys, STATION.x, STATION.y + 4, 0xffc247);
    this.nextParcel(sys);
  },

  nextParcel(sys) {
    const st = sys.active.st;
    st.leg++;
    if (st.leg >= st.stops.length) { sys.setObjective('Every parcel delivered — the station is empty!'); return sys.finish(); }
    st.dest = st.stops[st.leg];
    st.legStart = Date.now();
    st.parcelTag = note(sys, STATION.x, STATION.y - 66, `→ ${st.dest.label} ${st.dest.emoji}`);
    sys.setObjective(`Parcel ${st.leg + 1}/${sys.active.job.total}: collect it at the station.`);
  },

  tick(sys) {
    const st = sys.active.st, p = sys.scene.player;
    if (st.carry) {
      st.carry.setPosition(p.x, p.y - 62);
      const d = sys.near(st.dest.x, st.dest.y, 64);
      sys.setHint(d ? `Press E to deliver the parcel to ${st.dest.label}` : '');
    } else {
      const d = sys.near(STATION.x, STATION.y, 70);
      sys.setHint(d ? 'Press E to collect the next parcel' : '');
    }
  },

  onE(sys) {
    const st = sys.active.st;
    if (!st.carry && sys.near(STATION.x, STATION.y, 70)) {
      st.carry = floatIcon(sys, sys.scene.player.x, sys.scene.player.y - 62, '📦', { size: 26, still: true });
      st.carry.setPosition(sys.scene.player.x, sys.scene.player.y - 62);
      st.tag = note(sys, sys.scene.player.x, sys.scene.player.y - 92, `→ ${st.dest.label}`);
      st.parcelTag?.destroy();
      st.destGlow = spot(sys, st.dest.x, st.dest.y + 6, 0xffc247);
      pointer(sys, st.dest.x, st.dest.y - 8);
      sys.setObjective(`Parcel ${st.leg + 1}/${sys.active.job.total}: deliver to ${st.dest.label} ${st.dest.emoji}`);
      st.legStart = Date.now();
      return true;
    }
    if (st.carry && sys.near(st.dest.x, st.dest.y, 64)) {
      const fast = Date.now() - st.legStart < PAR;
      poof(sys, st.dest.x, st.dest.y - 20, 0xffc247);
      st.carry.destroy(); st.carry = null;
      st.tag?.destroy(); st.tag = null;
      st.destGlow = null;
      sys.addPoints(fast ? 30 : 20, fast ? `Fast delivery to ${st.dest.label}!` : `Delivered to ${st.dest.label}`);
      sys.setProgress(st.leg + 1);
      this.nextParcel(sys);
      return true;
    }
    return false;
  },

  cleanup(sys, st) {
    st.carry?.destroy();
    st.tag?.destroy();
    st.parcelTag?.destroy();
  },
};
