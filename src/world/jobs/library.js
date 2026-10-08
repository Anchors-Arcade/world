// Phase 22 · Library Aide — the return cart is overflowing. Take a book, read its tag colour,
// and press E at the matching shelf. A book is worth 18; file all five before the shift ends and
// the librarian adds a +30 bonus. Wrong shelf? The book just rattles — no harm done. Max 120.
import { floatIcon, poof, note, spot } from './kit.js';

// the return cart is a world object (interactions.js, art 'books', footprint 480..590 × 430..510);
// this is the patch of floor beside it where the player stands to grab a book
const CART = { x: 535, y: 540 };

// the genre shelves along the library wall (x matches the shelf blocks in the room)
const SHELVES = [
  { genre: 'Adventure', x: 150, y: 300, color: 0x3f8fc9 },
  { genre: 'History',  x: 390, y: 300, color: 0xd96a5a },
  { genre: 'Science',  x: 630, y: 300, color: 0x2f9e5b },
  { genre: 'Poetry',   x: 870, y: 300, color: 0xffc247 },
];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const libraryJob = {
  begin(sys) {
    const st = sys.active.st;
    st.shelves = SHELVES.map((s) => ({ ...s, glow: spot(sys, s.x, s.y + 14, s.color) }));
    st.queue = shuffle(SHELVES).concat(shuffle(SHELVES)).slice(0, sys.active.job.total);   // 5 varied books
    st.leg = -1; st.carry = null;
    st.cartTag = note(sys, CART.x, CART.y - 120, '📚 Return cart');
    st.cartGlow = spot(sys, CART.x, CART.y + 4, 0xffc247);
    this.nextBook(sys);
  },

  nextBook(sys) {
    const st = sys.active.st;
    st.leg++;
    if (st.leg >= st.queue.length) {
      sys.addPoints(30, 'The cart is empty — librarian bonus!');
      sys.setObjective('All books shelved — tidy and quiet.');
      return sys.finish();
    }
    st.book = st.queue[st.leg];
    sys.setObjective(`Book ${st.leg + 1}/${sys.active.job.total}: take it from the cart and shelve it under ${st.book.genre}.`);
  },

  tick(sys) {
    const st = sys.active.st, p = sys.player;
    if (st.carry) {
      st.carry.setPosition(p.x, p.y - 60);
      st.carryTag.setPosition(p.x, p.y - 88);
      const atShelf = st.shelves.find((s) => sys.near(s.x, s.y, 86));
      sys.setHint(atShelf ? (atShelf.genre === st.book.genre ? `Press E to shelve it under ${atShelf.genre}` : `This is the ${atShelf.genre} shelf — not the right one!`) : '');
    } else {
      sys.setHint(sys.near(CART.x, CART.y, 76) ? 'Press E to take the next book from the cart' : '');
    }
  },

  onE(sys) {
    const st = sys.active.st;
    if (!st.carry && sys.near(CART.x, CART.y, 76)) {
      st.carry = floatIcon(sys, sys.player.x, sys.player.y - 60, '📕', { size: 24, still: true });
      st.carry.setColor(`#${st.book.color.toString(16).padStart(6, '0')}`);
      st.carryTag = note(sys, sys.player.x, sys.player.y - 88, st.book.genre, `#${st.book.color.toString(16).padStart(6, '0')}`);
      st.cartGlow.setVisible(false);
      sys.setObjective(`Book ${st.leg + 1}/${sys.active.job.total}: ${st.book.genre} — match the tag colour to its shelf.`);
      return true;
    }
    if (st.carry) {
      const shelf = st.shelves.find((s) => sys.near(s.x, s.y, 86));
      if (!shelf) return false;
      if (shelf.genre !== st.book.genre) {
        // the wrong shelf: the book rattles, nothing worse
        sys.scene.tweens.add({ targets: st.carry, angle: { from: -8, to: 8 }, duration: 60, yoyo: true, repeat: 3 });
        sys.setHint(`No, no — ${st.book.genre} belongs on the ${st.book.genre} shelf!`);
        return true;
      }
      poof(sys, shelf.x, shelf.y - 40, shelf.color);
      st.carry.destroy(); st.carry = null;
      st.carryTag.destroy(); st.carryTag = null;
      st.cartGlow.setVisible(true);
      sys.addPoints(18, `Shelved under ${shelf.genre}`);
      sys.setProgress(st.leg + 1);
      this.nextBook(sys);
      return true;
    }
    return false;
  },

  cleanup(sys, st) {
    st.carry?.destroy();
    st.carryTag?.destroy();
  },
};
