// Phase 22 · Café Worker — take an order at the counter, add the right ingredients, brew with
// good timing, carry the cup to the waiting table. Four orders is a shift; the fourth serve ends
// it. Better brewing pays better: a serve is worth 20, a perfect pour +10, a sloppy one +5.
//
// The ingredient buttons are the small DOM strip from src/ui/jobHUD.js ("job-panel" events) —
// the shift never leaves the room, and the world keeps moving around it.
import { bubble, spot, floatIcon, pointer, timingBar, poof, note } from './kit.js';

const ING = {
  beans: { emoji: '🫘', label: 'Beans' },
  milk:  { emoji: '🥛', label: 'Milk' },
  syrup: { emoji: '🍯', label: 'Syrup' },
  marsh: { emoji: '🍡', label: 'Marshmallow' },
};
const MENU = [
  { name: 'Espresso', emoji: '☕', ings: ['beans'] },
  { name: 'Latte',    emoji: '🥛', ings: ['beans', 'milk'] },
  { name: 'Mocha',    emoji: '🍫', ings: ['beans', 'milk', 'syrup'] },
  { name: 'Cocoa',    emoji: '🍡', ings: ['milk', 'marsh'] },
];
// where the customers sit: the café's own four tables (see maps/rooms.js)
const TABLES = [
  { x: 120, y: 292 }, { x: 360, y: 352 }, { x: 640, y: 352 }, { x: 860, y: 292 },
];
const COUNTER = { x: 500, y: 520 };   // stand-below point in front of the counter block

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const cafeJob = {
  begin(sys) {
    const st = sys.active.st;
    Object.assign(st, {
      state: 'await',          // await -> mixing -> brewing -> carrying -> (serve) -> await
      order: -1, drink: null, picked: new Set(),
      brew: null, marker: 0, dir: 1,
      orderBubble: null, tableArt: null, carry: null,
      queue: shuffle([...MENU, ...MENU].slice(0, 4)),     // four varied orders
      seats: shuffle([0, 1, 2, 3]),                        // one table per order
      wrong: null,
    });
    st.panelClick = (key) => this.panelClick(sys, key);
    sys.scene.game.events.on('job-panel-click', st.panelClick);
    sys.scene.game.events.emit('job-hud-hint', { text: 'Walk to the counter by the window to take an order.' });
    this.panel(sys, false);
  },

  // ---------- the DOM ingredient strip ----------
  // `on` defaults to true: takeOrder() and a correct pick call panel(sys) bare, and the strip
  // must show for those — only the explicit panel(sys, false) calls (brewing, cleanup) hide it.
  panel(sys, on = true, err = false) {
    const st = sys.active.st;
    sys.scene.game.events.emit('job-panel', on ? {
      on: true,
      title: `Order ${st.order + 1}/4 · ${st.drink.name}`,
      items: Object.entries(ING).map(([k, v]) => ({ key: k, emoji: v.emoji, label: v.label, done: st.picked.has(k) })),
      err,
    } : { on: false });
  },

  panelClick(sys, key) {
    const st = sys.active?.st; if (!st || st.state !== 'mixing') return;
    if (st.picked.has(key)) return;
    if (!st.drink.ings.includes(key)) { st.wrong = key; return this.panel(sys, true, true); }
    st.picked.add(key);
    if (st.picked.size === st.drink.ings.length) this.startBrew(sys);
    else this.panel(sys);
  },

  // ---------- one order ----------
  takeOrder(sys) {
    const st = sys.active.st;
    st.order++;
    st.drink = st.queue[st.order];
    st.picked = new Set(); st.wrong = null;
    st.state = 'mixing';
    st.orderBubble?.destroy();
    st.orderBubble = bubble(sys, COUNTER.x, 432, `${st.drink.emoji}  ${st.drink.name} — ${st.drink.ings.map((k) => ING[k].label).join(' + ')}`, { w: 220, size: 14 });
    sys.setObjective(`Order ${st.order + 1}/4: make a ${st.drink.name} — ${st.drink.ings.map((k) => ING[k].emoji).join(' ')}`);
    this.panel(sys);
  },

  startBrew(sys) {
    const st = sys.active.st;
    st.state = 'brewing'; st.marker = 0; st.dir = 1;
    st.brew = timingBar(sys, sys.player.x, sys.player.y - 66, { label: `Press E to stop the pour for the ${st.drink.name}!`, w: 210 });
    st.brew.setZone(0.25 + Math.random() * 0.5, 0.2);      // a fresh green zone every cup
    this.panel(sys, false);
    st.orderBubble?.destroy(); st.orderBubble = null;
    sys.setObjective(`Order ${st.order + 1}/4: brew the ${st.drink.name} — stop the marker in the green.`);
  },

  strike(sys) {
    const st = sys.active.st;
    const perfect = st.brew.inZone(true), ok = st.brew.inZone();
    st.brew?.cont.destroy();
    st.brew = null;
    st.bonus = perfect ? 10 : ok ? 5 : 0;
    st.state = 'carrying';
    st.carry = floatIcon(sys, sys.player.x, sys.player.y - 60, st.drink.emoji, { followPlayer: true, size: 26 });
    const seat = TABLES[st.seats[st.order]];
    st.tableArt = { seat, glow: spot(sys, seat.x, seat.y + 8, 0xffc247), cust: floatIcon(sys, seat.x, seat.y - 74, '🐧', { size: 26 }), tag: note(sys, seat.x, seat.y - 104, `wants a ${st.drink.name}`) };
    pointer(sys, seat.x, seat.y - 40);
    sys.setObjective(`Order ${st.order + 1}/4: carry the ${st.drink.name} to the waiting penguin!`);
    poof(sys, COUNTER.x, 460, 0xffe6c2);
  },

  serve(sys) {
    const st = sys.active.st;
    const p = sys.scene.player;
    sys.addPoints(20 + (st.bonus || 0), `Served a ${st.drink.name}`);
    sys.setProgress(st.order + 1);
    st.carry?.destroy(); st.carry = null;
    st.tableArt = null;                                     // glow / customer / tag were sys.keep()ed
    sys.scene.game.events.emit('job-hud-hint', { text: '' });
    if (st.order >= 3) { sys.setObjective('All orders served — great shift!'); return sys.finish(); }
    st.state = 'await';
    sys.setObjective('Back to the counter for the next order.');
  },

  // ---------- framework hooks ----------
  tick(sys, time, delta) {
    const st = sys.active.st;
    const p = sys.scene.player;
    if (st.carry) st.carry.setPosition(p.x, p.y - 60);
    if (st.state === 'await') {
      sys.setHint(sys.near(COUNTER.x, COUNTER.y, 74) ? 'Press E to take the next order' : '');
    } else if (st.state === 'mixing') {
      sys.setHint(sys.near(COUNTER.x, COUNTER.y, 74) ? 'Add the ingredients with the buttons below' : 'Stay near the counter to mix');
      if (st.wrong) { st.wrong = null; }                    // the err flag is a one-frame flash for the panel
    } else if (st.state === 'brewing' && st.brew) {
      st.brew.cont.setPosition(p.x, p.y - 66);
      st.marker += st.dir * (delta / 700) * (1 + st.order * 0.12);   // each cup pours a little faster
      if (st.marker >= 1) { st.marker = 1; st.dir = -1; }
      if (st.marker <= 0) { st.marker = 0; st.dir = 1; }
      st.brew.marker = st.marker;
      st.brew.draw();
      sys.setHint('Press E to stop the pour in the green zone');
    } else if (st.state === 'carrying' && st.tableArt) {
      const s = st.tableArt.seat;
      sys.setHint(sys.near(s.x, s.y, 58) ? `Press E to serve the ${st.drink.name}` : '');
    }
  },

  onE(sys) {
    const st = sys.active.st;
    if (st.state === 'await' && sys.near(COUNTER.x, COUNTER.y, 74)) { this.takeOrder(sys); return true; }
    if (st.state === 'brewing') { this.strike(sys); return true; }
    if (st.state === 'carrying' && st.tableArt && sys.near(st.tableArt.seat.x, st.tableArt.seat.y, 58)) { this.serve(sys); return true; }
    return false;
  },

  cleanup(sys, st) {
    sys.scene.game.events.off('job-panel-click', st.panelClick);
    st.brew?.cont.destroy();
    st.orderBubble?.destroy();
    st.carry?.destroy();
    this.panel(sys, false);
    sys.scene.game.events.emit('job-hud-hint', { text: '' });
  },
};
