/* ============================================================
   Tacta — two players overlap shape cards on a shared table.

   Faithful to the 2025 The Op Games card game. Every card is a dark
   rectangle (4 x 6 cells, a 2:3 playing-card shape) with a thick
   coloured frame, one to four printed shapes and a number in the
   middle.

   The only shapes are a SQUARE, two sizes of RECTANGLE and an
   isosceles right TRIANGLE, and each one is anchored to the card:

     S  square      — sits in a corner, two sides on two card edges
     A  long rect   — its long side spans the card's long side
     B  short rect  — its long side equals the card's short side, so it
                      can lie along a long or a short edge
     T  triangle    — isosceles right, hypotenuse on an edge, apex inward

   A card may only be laid down when
     * no shape of it lands on a *different* kind of shape already on
       the table, and
     * at least one shape of it lands on the *same* kind of shape
       already there — which is what "the outlines line up" means.
   A printed shape is opaque, so a shape laid over a dot buries that
   dot. Hands are the full 18-card set each; the player with more of
   their own dots still showing wins.
   ============================================================ */
const Tacta = (() => {
  const BOARD = 36;          // the table is BOARD x BOARD cells
  const W = 4, H = 6;        // cards are W x H cells (a playing-card shape)
  const HAND = 18;           // the full set, dealt to each player
  const START_R = (BOARD - H) / 2, START_C = (BOARD - W) / 2;

  /* The set holds 63 dots a player, and a loose table leaves roughly 50 of them
     showing, so a dot is worth a lot less than it was on the old small board. */
  const PER_DOT = 5;         // points per visible dot
  const WIN_BONUS = 25;
  const MAX_POINTS = 400;

  const BLANK = '.';
  const WILD = '*';          // the base card matches any shape

  /* Card faces. `b` is [row, col, width, height, kind] for every shape, plus a
     6th entry giving a triangle's facing (0 up · 1 right · 2 down · 3 left).
     `d` lists the dot cells as [row, col] pairs.
     kinds: T triangle · S square · A long rectangle · B short rectangle */
  const SPECS = [
    /* --- 1 dot each --- */
    { b: [[0, 0, 4, 2, 'T', 2]], d: [[0, 1]] },                                          /* C1-1 */
    { b: [[0, 0, 2, 2, 'S']], d: [[0, 0]] },                                             /* C1-2 */
    { b: [[0, 0, 2, 6, 'A']], d: [[2, 0]] },                                             /* C1-3 */
    /* --- 2 dots each --- */
    { b: [[0, 0, 4, 2, 'T', 2], [4, 2, 2, 2, 'S']], d: [[0, 1], [4, 2]] },               /* C2-1 */
    { b: [[2, 0, 4, 2, 'B'], [4, 0, 4, 2, 'T', 0]], d: [[2, 1], [5, 1]] },               /* C2-2 */
    { b: [[0, 0, 2, 2, 'S'], [2, 2, 2, 4, 'B']], d: [[0, 0], [2, 2]] },                  /* C2-3 */
    /* --- 3 dots each --- */
    { b: [[0, 0, 4, 2, 'T', 2], [4, 0, 4, 2, 'T', 0]], d: [[0, 0], [0, 3], [5, 1]] },    /* C3-1 */
    { b: [[0, 0, 2, 4, 'T', 1], [4, 0, 2, 2, 'S'], [2, 2, 2, 4, 'B']],
      d: [[1, 0], [4, 0], [2, 2]] },                                                     /* C3-2 */
    { b: [[0, 0, 2, 6, 'A'], [2, 2, 2, 4, 'B']], d: [[1, 0], [4, 0], [2, 2]] },          /* C3-3 */
    /* --- 4 dots each --- */
    { b: [[0, 0, 4, 2, 'T', 2], [2, 2, 2, 4, 'T', 3], [4, 0, 2, 2, 'S']],
      d: [[0, 0], [0, 3], [3, 3], [4, 0]] },                                             /* C4-1 */
    { b: [[0, 0, 2, 2, 'S'], [4, 2, 2, 2, 'S']],
      d: [[0, 0], [1, 1], [4, 2], [5, 3]] },                                             /* C4-2 */
    { b: [[0, 0, 2, 6, 'A'], [0, 2, 2, 2, 'S'], [2, 2, 2, 4, 'B']],
      d: [[1, 0], [4, 0], [0, 2], [2, 2]] },                                             /* C4-3 */
    /* --- 5 dots each --- */
    { b: [[0, 0, 4, 2, 'T', 2], [2, 0, 4, 2, 'B'], [4, 0, 4, 2, 'T', 0]],
      d: [[0, 0], [0, 3], [2, 1], [3, 1], [5, 1]] },                                     /* C5-1 */
    { b: [[0, 0, 4, 2, 'T', 2], [4, 0, 2, 2, 'S'], [4, 2, 2, 2, 'S']],
      d: [[0, 0], [0, 3], [4, 0], [5, 1], [4, 2]] },                                     /* C5-2 */
    { b: [[0, 0, 2, 2, 'S'], [2, 0, 4, 2, 'B'], [4, 0, 4, 2, 'T', 0]],
      d: [[0, 0], [1, 1], [2, 1], [5, 0], [5, 3]] },                                     /* C5-3 */
    /* --- 6 dots each --- */
    { b: [[0, 0, 2, 4, 'T', 1], [2, 2, 2, 4, 'T', 3], [0, 2, 2, 2, 'S'], [4, 0, 2, 2, 'S']],
      d: [[0, 0], [2, 0], [3, 3], [0, 2], [1, 3], [4, 0]] },                             /* C6-1 */
    { b: [[0, 0, 2, 4, 'B'], [0, 2, 2, 4, 'B'], [4, 0, 2, 2, 'S'], [4, 2, 2, 2, 'S']],
      d: [[0, 0], [1, 0], [0, 2], [4, 0], [5, 1], [4, 2]] },                             /* C6-2 */
    { b: [[2, 0, 4, 2, 'T', 2], [2, 0, 4, 2, 'T', 0], [0, 0, 4, 2, 'B'], [4, 0, 4, 2, 'B']],
      d: [[2, 0], [2, 3], [3, 1], [0, 0], [1, 3], [5, 1]] }                              /* C6-3 */
  ];

  const FLIP_FACE = [0, 3, 2, 1];      // mirroring turns a right-facing triangle left

  /* The four corners of a triangle block, in card units. */
  function triVerts(b) {
    const x = b.c, y = b.r, w = b.w, h = b.h;
    const o = b.o || 0;
    if (o === 1) return [[x + w, y + h / 2], [x, y], [x, y + h]];
    if (o === 2) return [[x + w / 2, y + h], [x, y], [x + w, y]];
    if (o === 3) return [[x, y + h / 2], [x + w, y], [x + w, y + h]];
    return [[x + w / 2, y], [x, y + h], [x + w, y + h]];
  }

  /* Is the centre of cell (x, y) of a block inside the shape drawn in it? */
  function inShape(b, x, y) {
    if (b.k !== 'T') return true;                       // squares and rectangles fill their block
    const p = [b.c + x + 0.5, b.r + y + 0.5];
    const t = triVerts(b);
    const cross = (a, c2, d) => (a[0] - d[0]) * (c2[1] - d[1]) - (c2[0] - d[0]) * (a[1] - d[1]);
    const e = [cross(p, t[0], t[1]), cross(p, t[1], t[2]), cross(p, t[2], t[0])];
    return !((e[0] < 0 || e[1] < 0 || e[2] < 0) && (e[0] > 0 || e[1] > 0 || e[2] > 0));
  }

  const areaOf = b => {
    let n = 0;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (inShape(b, x, y)) n++;
    return n;
  };

  /* Turn a card description into a flat W*H face plus its shape blocks. */
  function build(spec) {
    const face = new Array(W * H).fill(BLANK);
    const blocks = spec.b.map(b => {
      const blk = { r: b[0], c: b[1], w: b[2], h: b[3], k: b[4], o: b[5] || 0 };
      for (let y = 0; y < blk.h; y++) {
        for (let x = 0; x < blk.w; x++) {
          if (inShape(blk, x, y)) face[(blk.r + y) * W + blk.c + x] = blk.k;
        }
      }
      return blk;
    });
    return {
      face: face, blocks: blocks,
      dots: spec.d.map(p => p[0] * W + p[1]),
      num: spec.d.length                                 // the card is worth its dots
    };
  }
  const FACES = SPECS.map(build);
  const TOTAL_DOTS = SPECS.reduce((n, s) => n + s.d.length, 0);   // 63

  /* ---------------- geometry ---------------- */

  const orW = rot => ((rot & 1) ? H : W);
  const orH = rot => ((rot & 1) ? W : H);

  /* Where a cell of the card ends up after turning / mirroring it. The result
     is an index into the turned grid, whose width is orW(rot). */
  function mapCell(i, rot, flip) {
    let x = i % W, y = (i / W) | 0;
    let bw = W, bh = H;
    if (flip) x = bw - 1 - x;
    for (let k = 0; k < (rot & 3); k++) {
      const nx = bh - 1 - y, ny = x, nw = bh, nh = bw;
      x = nx; y = ny; bw = nw; bh = nh;
    }
    return y * bw + x;
  }

  /* The same for a shape block, including a triangle's facing. */
  function mapBlock(b, rot, flip) {
    let r = b.r, c = b.c, w = b.w, h = b.h;
    let bw = W, bh = H;
    let o = b.o || 0;
    if (flip) { c = bw - c - w; o = FLIP_FACE[o]; }
    for (let k = 0; k < (rot & 3); k++) {
      const nr = c, nc = bh - r - h, nw = h, nh = w;
      r = nr; c = nc; w = nw; h = nh;
      o = (o + 1) & 3;
      const t = bw; bw = bh; bh = t;
    }
    return { r: r, c: c, w: w, h: h, k: b.k, o: o };
  }

  function shuffled(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- setup ---------------- */

  /* Both players get the whole 18 card set — only the colour differs. */
  function start() {
    const cards = [];
    const hands = [[], []];
    for (let p = 0; p < 2; p++) {
      FACES.forEach(spec => {
        const id = cards.length;
        cards.push({
          id: id, owner: p, face: spec.face, blocks: spec.blocks,
          dots: spec.dots, num: spec.num,
          rot: 0, flip: 0, placed: false, r: -1, c: -1
        });
        hands[p].push(id);
      });
    }
    return {
      board: BOARD, w: W, h: H, startR: START_R, startC: START_C,
      cards: cards, hands: hands, stack: [],
      turn: 0, moves: 0, passes: 0,
      status: 'playing', winner: -1, reason: '', visible: [0, 0],
      startedAt: Date.now(), elapsedMs: 0
    };
  }

  const cardOf = (st, id) => st.cards[id] || null;
  const handOf = (st, owner) => st.hands[owner] || [];
  const placedCount = (st, owner) => st.cards.filter(c => c.placed && c.owner === owner).length;

  const faceOf = card => {
    const out = new Array(W * H);
    for (let i = 0; i < out.length; i++) out[mapCell(i, card.rot, card.flip)] = card.face[i];
    return out;
  };
  const blocksOf = card => card.blocks.map(b => mapBlock(b, card.rot, card.flip));
  const dotsOf = card => card.dots.map(i => mapCell(i, card.rot, card.flip));

  function orientFace(card, rot, flip) {
    const out = new Array(W * H);
    for (let i = 0; i < out.length; i++) out[mapCell(i, rot, flip)] = card.face[i];
    return out;
  }

  function rotate(st, id) {
    const c = cardOf(st, id);
    if (c && !c.placed) c.rot = (c.rot + 1) & 3;
    return st;
  }

  function flip(st, id) {
    const c = cardOf(st, id);
    if (c && !c.placed) c.flip = c.flip ? 0 : 1;
    return st;
  }

  /* ---------------- reading the table ---------------- */

  /* Walks the pile from the top down.
     `top[i]` = the shape printed highest on cell i — what a new card would
     land on. `dot[i]` = the highest dot on cell i that no shape has been laid
     over, i.e. the dots you can still see. */
  function view(st) {
    const n = BOARD * BOARD;
    const top = new Array(n).fill(null);
    const dot = new Array(n).fill(null);
    for (let k = st.stack.length - 1; k >= 0; k--) {
      const card = st.cards[st.stack[k]];
      const face = faceOf(card);
      const dots = dotsOf(card);
      const ow = orW(card.rot);
      for (let t = 0; t < dots.length; t++) {
        const di = dots[t];
        const i = (card.r + ((di / ow) | 0)) * BOARD + card.c + (di % ow);
        if (!top[i] && !dot[i]) dot[i] = { owner: card.owner, card: card.id };
      }
      for (let y = 0; y < face.length; y++) {
        const ch = face[y];
        if (ch === BLANK) continue;
        const i = (card.r + ((y / ow) | 0)) * BOARD + card.c + (y % ow);
        if (!top[i]) top[i] = { kind: ch, owner: card.owner, card: card.id };
      }
    }
    /* The base card sits under everything: it carries every shape in every
       position, so it matches anything. Filling it in last matters — done first
       it would mask the real shapes laid on top of it and bury dots that are
       still perfectly visible. */
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (START_R + y) * BOARD + START_C + x;
        if (!top[i]) top[i] = { kind: WILD, owner: -1, card: -1 };
      }
    }
    return { top: top, dot: dot };
  }

  /* Which shape of the card each cell of the turned card belongs to. */
  function blockMap(blocks, ow) {
    const m = new Array(W * H).fill(-1);
    blocks.forEach((b, k) => {
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          const i = (b.r + y) * ow + b.c + x;
          if (i >= 0 && i < m.length && m[i] === -1) m[i] = k;
        }
      }
    });
    return m;
  }

  /* How a face laid at (r, c) would land on the table. `map` is optional and
     only used to count how many separate shapes lined up. */
  function scan(top, face, r, c, ow, map) {
    let ink = 0, overlap = 0, clash = false;
    const hits = map ? new Set() : null;
    for (let y = 0; y < face.length; y++) {
      const ch = face[y];
      if (ch === BLANK) continue;
      ink++;
      const t = top[(r + ((y / ow) | 0)) * BOARD + c + (y % ow)];
      if (!t) continue;
      if (t.kind === WILD || t.kind === ch) { overlap++; if (hits) hits.add(map[y]); }
      else clash = true;
    }
    return { ink: ink, overlap: overlap, shapes: hits ? hits.size : 0, clash: clash };
  }

  const inside = (r, c, rot) =>
    r >= 0 && c >= 0 && r + orH(rot) <= BOARD && c + orW(rot) <= BOARD;

  function canPlace(st, id, r, c) {
    const card = cardOf(st, id);
    if (!card || card.placed) return { ok: false, reason: 'gone' };
    if (st.status !== 'playing') return { ok: false, reason: 'over' };
    if (!inside(r, c, card.rot)) return { ok: false, reason: 'off' };
    const face = faceOf(card);
    const s = scan(view(st).top, face, r, c, orW(card.rot), blockMap(blocksOf(card), orW(card.rot)));
    if (s.clash) return { ok: false, reason: 'clash' };
    if (s.overlap === 0) return { ok: false, reason: 'lonely' };
    return { ok: true, face: face, r: r, c: c, overlap: s.overlap, shapes: s.shapes };
  }

  function place(st, id, r, c) {
    const card = cardOf(st, id);
    if (!card || card.placed) return st;
    card.placed = true;
    card.r = r;
    card.c = c;
    st.stack.push(id);
    const hand = st.hands[card.owner];
    const at = hand.indexOf(id);
    if (at >= 0) hand.splice(at, 1);
    st.moves++;
    st.passes = 0;
    endTurn(st, card.owner);
    return st;
  }

  function endTurn(st, mover) {
    if (!st.hands[0].length && !st.hands[1].length) { settle(st, 'all'); return st; }
    st.turn = 1 - mover;
    return st;
  }

  /* Nobody can lay anything down: two passes in a row close the game. */
  function pass(st) {
    if (st.status !== 'playing') return st;
    st.passes++;
    if (st.passes >= 2) { settle(st, 'stuck'); return st; }
    st.turn = 1 - st.turn;
    return st;
  }

  /* ---------------- scoring ---------------- */

  function tally(st) {
    const v = view(st);
    const total = [0, 0];
    st.cards.forEach(card => {
      if (!card.placed) return;
      total[card.owner] += card.dots.length;
    });
    const visible = [0, 0];
    v.dot.forEach(d => { if (d) visible[d.owner]++; });
    return {
      visible: visible, total: total,
      hidden: [total[0] - visible[0], total[1] - visible[1]],
      view: v
    };
  }

  function scoreWith(st, owner, t) {
    const bonus = st.winner === owner ? WIN_BONUS : 0;
    return {
      points: Math.max(0, Math.min(MAX_POINTS, Math.round(t.visible[owner] * PER_DOT) + bonus)),
      bonus: bonus,
      visible: t.visible[owner], total: t.total[owner], hidden: t.hidden[owner],
      placed: placedCount(st, owner), left: handOf(st, owner).length
    };
  }

  function settle(st, reason) {
    const t = tally(st);
    st.visible = t.visible;
    st.status = t.visible[0] === t.visible[1] ? 'draw' : 'done';
    st.winner = t.visible[0] === t.visible[1] ? -1 : (t.visible[0] > t.visible[1] ? 0 : 1);
    st.reason = reason;
    return st;
  }

  function score(st) {
    if (st.status === 'playing') settle(st, 'all');
    const t = tally(st);
    return { 0: scoreWith(st, 0, t), 1: scoreWith(st, 1, t), tally: t };
  }

  function end(st) {
    if (st.status === 'playing') settle(st, 'all');
    return st;
  }

  function finish(st) {
    if (st.status === 'playing') settle(st, 'all');
    const t = tally(st);
    return {
      status: st.status, winner: st.winner, reason: st.reason,
      seconds: Math.round((st.elapsedMs || 0) / 1000),
      moves: st.moves, board: BOARD, w: W, h: H,
      dots: [
        { visible: t.visible[0], total: t.total[0], hidden: t.hidden[0] },
        { visible: t.visible[1], total: t.total[1], hidden: t.hidden[1] }
      ],
      covered: t.hidden[0] + t.hidden[1],
      perDot: PER_DOT, winBonus: WIN_BONUS,
      scores: { 0: scoreWith(st, 0, t), 1: scoreWith(st, 1, t) }
    };
  }

  /* ---------------- move search ---------------- */

  /* A card may be turned any way, so every orientation is tried. */
  function hasAnyMove(st, owner) {
    const top = view(st).top;
    const hand = st.hands[owner] || [];
    for (let k = 0; k < hand.length; k++) {
      const card = st.cards[hand[k]];
      for (let flip = 0; flip < 2; flip++) {
        for (let rot = 0; rot < 4; rot++) {
          if (spotsFor(top, orientFace(card, rot, flip), rot)) return true;
        }
      }
    }
    return false;
  }

  function spotsFor(top, face, rot) {
    const ow = orW(rot), oh = orH(rot);
    for (let r = 0; r + oh <= BOARD; r++) {
      for (let c = 0; c + ow <= BOARD; c++) {
        const s = scan(top, face, r, c, ow);
        if (!s.clash && s.overlap > 0) return true;
      }
    }
    return false;
  }

  /* Every shape position the set uses, for drawing the base card. */
  const BASE_POSITIONS = (() => {
    const seen = new Set();
    const out = [];
    SPECS.forEach(s => s.b.forEach(b => {
      const key = b.join(',');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ r: b[0], c: b[1], w: b[2], h: b[3], k: b[4], o: b[5] || 0 });
    }));
    return out;
  })();

  return {
    BOARD: BOARD, W: W, H: H, HAND: HAND,
    START_R: START_R, START_C: START_C,
    TOTAL_DOTS: TOTAL_DOTS,
    PER_DOT: PER_DOT, WIN_BONUS: WIN_BONUS, MAX_POINTS: MAX_POINTS,
    BLANK: BLANK, WILD: WILD,
    BASE_POSITIONS: BASE_POSITIONS, SPECS: SPECS,
    orW: orW, orH: orH, triVerts: triVerts, areaOf: areaOf,
    start: start, cardOf: cardOf, handOf: handOf, placedCount: placedCount,
    faceOf: faceOf, blocksOf: blocksOf, dotsOf: dotsOf,
    mapCell: mapCell, mapBlock: mapBlock, blockMap: blockMap,
    rotate: rotate, flip: flip,
    view: view, scan: scan, canPlace: canPlace, place: place, pass: pass,
    endTurn: endTurn, hasAnyMove: hasAnyMove, tally: tally, score: score,
    end: end, finish: finish
  };
})();
