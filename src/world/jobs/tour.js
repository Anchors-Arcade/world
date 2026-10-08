// Phase 22 · Tour Guide — a visitor wants the grand tour of the plaza. Pick them up at the booth
// and they follow you everywhere (a happy little trail). Walk to each stop on the route, press E
// to share the fact, and when all three are done bring them back to the booth: a tour finished
// inside the par time earns a tip. Stops are 25 points, each fact +5, the tip +20. Max 120.
import { spot, floatIcon, poof, note, bubble } from './kit.js';

const BOOTH = { x: 1115, y: 912 };   // the patch of floor in front of the tour booth
const PAR_MS = 100000;              // finish the whole tour inside this for the tip

// the plaza's greatest hits; the route is a fresh shuffle of three every shift
const HIGHLIGHTS = [
  { name: 'the town pond',  fact: 'The pond freezes solid every winter — perfect for sliding.', x: 900,  y: 580 },
  { name: 'the snowman',    fact: 'The town snowman is rebuilt every year after the thaw.',      x: 1500, y: 880 },
  { name: 'the arcade',     fact: 'The arcade holds the town record for loudest celebration.',   x: 1300, y: 400 },
  { name: 'the town hall',  fact: 'Every town meeting ends with hot cocoa. Every one.',          x: 900,  y: 400 },
  { name: 'the café door',  fact: 'The café beans its own hot chocolate recipe. A secret!',      x: 1590, y: 400 },
];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const tourJob = {
  begin(sys) {
    const st = sys.active.st;
    st.route = shuffle(HIGHLIGHTS).slice(0, sys.active.job.total);
    st.leg = -1;
    st.trail = [];                            // the player's recent positions — the visitor follows this
    st.lastTrail = 0;
    // the visitor is waiting at the booth the player just used, and joins the walk at once
    st.tourist = floatIcon(sys, BOOTH.x, BOOTH.y - 46, '🐧', { size: 32, still: true });
    st.touristTag = note(sys, BOOTH.x, BOOTH.y - 90, 'visitor');
    this.nextStop(sys);
  },

  nextStop(sys) {
    const st = sys.active.st;
    st.leg++;
    if (st.leg >= st.route.length) {
      st.dest = { name: 'the tour booth', x: BOOTH.x, y: BOOTH.y };
      st.destGlow = spot(sys, BOOTH.x, BOOTH.y + 4, 0xffc247);
      sys.setObjective('All stops done — bring your visitor back to the booth!');
      return;
    }
    st.dest = st.route[st.leg];
    st.destGlow = spot(sys, st.dest.x, st.dest.y + 4, 0x5bb6e8);
    sys.setObjective(`Stop ${st.leg + 1}/${sys.active.job.total}: lead them to ${st.dest.name}.`);
  },

  tick(sys, time) {
    const st = sys.active.st, p = sys.player;
    // remember where the player has been; the visitor walks the same path, a beat behind
    if (time - st.lastTrail > 220) {
      st.lastTrail = time;
      st.trail.push({ x: p.x, y: p.y });
      if (st.trail.length > 6) st.trail.shift();
    }
    const tgt = st.trail[0] || { x: p.x, y: p.y };
    const dx = tgt.x - st.tourist.x, dy = tgt.y - st.tourist.y, d = Math.hypot(dx, dy);
    const nearPlayer = Math.hypot(p.x - st.tourist.x, p.y - st.tourist.y) < 52;
    if (d > 4 && !nearPlayer) {                 // keeps a polite step behind, never on top of you
      const step = Math.min(d, 2.6);
      st.tourist.x += (dx / d) * step;
      st.tourist.y += (dy / d) * step;
    }
    st.touristTag.setPosition(st.tourist.x, st.tourist.y - 40);

    const here = sys.near(st.dest.x, st.dest.y, 72);
    const theyreHere = Math.hypot(st.tourist.x - st.dest.x, st.tourist.y - st.dest.y) < 110;
    sys.setHint(here ? (theyreHere ? 'Press E to share the fact' : 'Wait for your visitor to catch up…') : '');
  },

  onE(sys) {
    const st = sys.active.st;
    if (!sys.near(st.dest.x, st.dest.y, 72)) return false;
    if (Math.hypot(st.tourist.x - st.dest.x, st.tourist.y - st.dest.y) > 110) return false;

    if (st.leg >= st.route.length) {           // back at the booth — the tour is over
      const fast = Date.now() - sys.active.startAt < PAR_MS;
      if (fast) { sys.addPoints(20, 'A generous tip for the grand tour!'); }
      poof(sys, BOOTH.x, BOOTH.y - 40, 0xffc247);
      sys.setObjective('Tour complete — the visitor loved it!');
      return sys.finish(), true;
    }
    // one highlight reached: share the fact
    st.factBubble?.destroy();
    st.factBubble = bubble(sys, st.tourist.x, st.tourist.y - 46, `“${st.dest.fact}”`, { w: 200, size: 12 });
    st.destGlow.destroy(); st.destGlow = null;
    poof(sys, st.dest.x, st.dest.y - 8, 0x5bb6e8);
    sys.addPoints(25, `Showed them ${st.dest.name}`);
    sys.addPoints(5, 'Shared the story');
    sys.setProgress(st.leg + 1);
    this.nextStop(sys);
    return true;
  },

  cleanup(sys, st) {
    st.factBubble?.destroy();
    st.touristTag?.destroy();
  },
};
