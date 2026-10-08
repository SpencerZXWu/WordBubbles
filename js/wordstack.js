/* ============================================================
   WordBubbles — Word Stack (crossword tile duel) engine.

   Two players each get a tray of random word tiles. On your turn you
   drop one tile onto the shared board so that EVERY letter it covers
   lands on the same letter already sitting there — the very first tile
   of the game may go anywhere. Tiles can be turned 90° before they are
   played. A turn lasts TURN_MS: place a tile, pass, or run out of time
   and play moves on. Whoever empties their tray first wins — unless the
   other player empties theirs on the very next turn, which is a draw.

   Board is a flat array, index 0 = top-left ... cols*rows-1.
   A cell is null while empty, otherwise { ch, owner, tile, shared }.
   ============================================================ */
const WordStack = (() => {
  /* Three levels. The easy board is what the mode has always used; medium is
     about twice its area and hard just over three times, and the trays grow
     with it so the board never gets sparse. */
  const LEVELS = [
    { key: 'easy', label: 'Easy', cols: 23, rows: 23, tiles: 15,
      desc: '23 × 23 · 15 tiles each. The board this mode started with.' },
    { key: 'medium', label: 'Medium', cols: 32, rows: 32, tiles: 20,
      desc: '32 × 32 · 20 tiles each. Twice the room to build in.' },
    { key: 'hard', label: 'Hard', cols: 40, rows: 40, tiles: 25,
      desc: '40 × 40 · 25 tiles each. Three times the room, and a long game.' }
  ];
  const DEFAULT_LEVEL = 'easy';
  const MIN_LEN = 3, MAX_LEN = 8;
  const TURN_MS = 30000;
  /* nobody could add anything for this many turns in a row -> settle it */
  const STALEMATE_PASSES = 4;
  /* every shared cell is worth two points, mapped 1 node = 5 points, plus a
     small bonus for taking the game, kept inside the 0 .. +300 band */
  const PER_NODE = 5, WIN_BONUS = 30, MAX_POINTS = 300;

  function cfgOf(level) {
    for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i].key === level) return LEVELS[i];
    return LEVELS[0];
  }

  const FALLBACK = ('ant apt arc arm art ash ate bad bag ban bar bat bed bee bet bid big bin bit ' +
    'bow box bud bug bun bus cab can cap car cat cod cog cop cot cow cry cup cut dam den dew dig dim ' +
    'dip dog dot dry ear eat eel egg elf elm end era eve eye fan far fat fed fee few fig fin fir fit ' +
    'fix fly fog for fox fry fun fur gap gas gem got gum gun gut gym ham hat hen her hid hip hit hog ' +
    'hop hot how hub hug hut ice ink inn ion ivy jam jar jaw jet job jog joy jug key kid kin kit lab ' +
    'lad lap law lay leg lid lie lip lit log lot low mad man map mat mop mud mug nap net new nib nod ' +
    'nor not now nut oak oar oat odd oil old one orb ore out owl own pad pan pat paw pay pea peg pen ' +
    'pet pie pig pin pit pod pot pub pup put rag ram ran rat raw ray red rib rid rim rip rob rod rot ' +
    'row rub rug rum run rut sad sag sap sat saw sea see set sew shy sin sip sir sit six ski sky sly ' +
    'sob sod son sow soy spa spy sum sun tab tag tan tap tar tax tea ten the tie tin tip toe tog ton ' +
    'too top tow toy try tub tug two urn use van vat vet via vow wag war was wax way web wed wet who ' +
    'why wig win wit woe wok won woo yes yet you zip zoo').split(/\s+/).filter(Boolean);

  /* Words of MIN_LEN..MAX_LEN letters, deduped, from the shared bank. */
  let pool = null;
  function words() {
    if (pool) return pool;
    const seen = Object.create(null);
    const out = [];
    const src = (typeof WORDBANK !== 'undefined' && WORDBANK && WORDBANK.length) ? WORDBANK : FALLBACK;
    for (let i = 0; i < src.length; i++) {
      const w = String(src[i]).toUpperCase();
      if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
      if (!/^[A-Z]+$/.test(w) || seen[w]) continue;
      seen[w] = true;
      out.push(w);
    }
    pool = out.length >= LEVELS[LEVELS.length - 1].tiles * 2 ? out : FALLBACK;
    return pool;
  }

  /* n words, shuffled. One shuffle feeds both trays so the two players never
     hold the same word. */
  function pick(n) {
    const w = words().slice();
    for (let i = w.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = w[i]; w[i] = w[j]; w[j] = t;
    }
    return w.slice(0, n);
  }

  function start(level) {
    const cfg = cfgOf(level);
    const st = {
      level: cfg.key,
      cols: cfg.cols,
      rows: cfg.rows,
      tilesPer: cfg.tiles,
      grid: new Array(cfg.cols * cfg.rows).fill(null),
      tiles: [],
      turn: 0,
      passes: 0,
      moves: 0,
      finishedBy: -1,          // owner who emptied their tray first
      status: 'playing',       // 'playing' | 'won' | 'draw'
      winner: -1,
      reason: '',              // 'tiles' | 'both' | 'stalemate' | 'agreed'
      startedAt: Date.now(),
      elapsedMs: 0
    };
    const shuffled = pick(cfg.tiles * 2);   // one shuffle, both trays, no repeats
    for (let p = 0; p < 2; p++) {
      for (let k = 0; k < cfg.tiles; k++) {
        st.tiles.push({
          id: st.tiles.length, owner: p, word: shuffled[p * cfg.tiles + k],
          vertical: false, placed: false, r: -1, c: -1
        });
      }
    }
    return st;
  }

  function tray(st, owner) {
    const out = [];
    for (let i = 0; i < st.tiles.length; i++) {
      const t = st.tiles[i];
      if (t.owner === owner && !t.placed) out.push(t);
    }
    return out;
  }

  function placedCount(st, owner) {
    let n = 0;
    for (let i = 0; i < st.tiles.length; i++) {
      const t = st.tiles[i];
      if (t.owner === owner && t.placed) n++;
    }
    return n;
  }

  /* The cells a tile of `len` letters would occupy from (r, c), in letter
     order. Indices outside the board are kept so callers can see how far
     it hangs off; use insideOf() to filter. */
  function cellsOf(st, r, c, len, vertical) {
    const out = [];
    for (let k = 0; k < len; k++) {
      out.push((r + (vertical ? k : 0)) * st.cols + (c + (vertical ? 0 : k)));
    }
    return out;
  }
  const insideOf = (st, cells) => cells.filter(i => i >= 0 && i < st.grid.length);

  /* Legal? Every covered letter must match what is already there, the tile
     has to touch the board once it exists, and it must add at least one new
     letter (so you cannot burn a tile by laying it flat on other tiles). */
  function canPlace(st, tileId, r, c, vertical) {
    if (!st || st.status !== 'playing') return { ok: false, reason: 'over', cells: [] };
    const t = st.tiles[tileId];
    if (!t || t.placed) return { ok: false, reason: 'gone', cells: [] };
    const len = t.word.length;
    const cells = cellsOf(st, r, c, len, vertical);
    let overlap = 0;
    for (let k = 0; k < len; k++) {
      const i = cells[k];
      if (i < 0 || i >= st.grid.length) return { ok: false, reason: 'off', cells: cells };
      /* a single step past the end of a row wraps around, so bounds-check columns too */
      const rr = r + (vertical ? k : 0), cc = c + (vertical ? 0 : k);
      if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) return { ok: false, reason: 'off', cells: cells };
      const cell = st.grid[i];
      if (!cell) continue;
      if (cell.ch !== t.word.charAt(k)) return { ok: false, reason: 'clash', at: i, cells: cells };
      overlap++;
    }
    if (st.moves > 0 && overlap === 0) return { ok: false, reason: 'lonely', cells: cells };
    if (overlap === len) return { ok: false, reason: 'flat', cells: cells };
    return { ok: true, overlap: overlap, cells: cells };
  }

  function rotate(st, tileId) {
    const t = st && st.tiles[tileId];
    if (!t || t.placed) return null;
    t.vertical = !t.vertical;
    return { vertical: t.vertical };
  }

  /* Write the tile, then hand the turn over. */
  function place(st, tileId, r, c, vertical) {
    const chk = canPlace(st, tileId, r, c, vertical);
    if (!chk.ok) return chk;
    const t = st.tiles[tileId];
    const len = t.word.length;
    t.placed = true;
    t.r = r; t.c = c; t.vertical = !!vertical;

    for (let k = 0; k < len; k++) {
      const i = chk.cells[k];
      const prev = st.grid[i];
      st.grid[i] = { ch: t.word.charAt(k), owner: t.owner, tile: t.id, shared: !!prev };
      if (prev) prev.shared = true;             // both tiles claim this letter
    }
    st.moves++;
    const over = endTurn(st, t.owner, false);
    return {
      ok: true, cells: chk.cells, id: t.id, owner: t.owner, word: t.word,
      overlap: chk.overlap, over: over.over, status: st.status, reason: st.reason, winner: st.winner
    };
  }

  /* Shared by the dry-turn rule and the End game button: whoever has fewer
     tiles left (i.e. got more down) takes it, level pegging is a draw. */
  function settleByTiles(st, reason) {
    const a = placedCount(st, 0), b = placedCount(st, 1);
    st.status = a === b ? 'draw' : 'won';
    st.winner = a === b ? -1 : (a > b ? 0 : 1);
    st.reason = reason;
    return { over: true, status: st.status, winner: st.winner, reason: st.reason };
  }

  /* Hand the turn over after `mover` acted. Decides the whole finish logic:
     the first player to empty their tray wins unless the other player empties
     theirs on the very next turn (a draw). */
  function endTurn(st, mover, viaPass) {
    if (viaPass) st.passes++; else st.passes = 0;
    const emptied = tray(st, mover).length === 0;

    if (emptied) {
      if (st.finishedBy < 0) st.finishedBy = mover;              // first to finish: wait one turn
      else if (st.finishedBy !== mover) {                        // opponent matched it right away
        st.status = 'draw'; st.winner = -1; st.reason = 'both';
        return { over: true };
      }
    } else if (st.finishedBy >= 0) {                             // failed to match -> the finisher wins
      st.status = 'won'; st.winner = st.finishedBy; st.reason = 'tiles';
      return { over: true };
    }

    if (viaPass && st.passes >= STALEMATE_PASSES) return settleByTiles(st, 'stalemate');

    st.turn = 1 - mover;
    return { over: false };
  }

  /* Both players agree to stop (the End game button). */
  function end(st) {
    if (!st || st.status !== 'playing') return null;
    const res = settleByTiles(st, 'agreed');
    res.left = [tray(st, 0).length, tray(st, 1).length];
    return res;
  }

  function pass(st) {
    if (!st || st.status !== 'playing') return null;
    const mover = st.turn;
    const res = endTurn(st, mover, true);
    return {
      pass: true, mover: mover, over: res.over,
      status: st.status, reason: st.reason, winner: st.winner
    };
  }

  /* Is there anything at all this player could legally play? */
  function hasAnyMove(st, owner) {
    if (!st || st.status !== 'playing') return false;
    const list = tray(st, owner);
    for (let n = 0; n < list.length; n++) {
      const len = list[n].word.length;
      for (let v = 0; v < 2; v++) {
        for (let r = 0; r < st.rows; r++) {
          for (let c = 0; c < st.cols; c++) {
            if (canPlace(st, list[n].id, r, c, !!v).ok) return true;
          }
        }
      }
    }
    return false;
  }

  /* A "node" is one letter two tiles share. Dark x Light gives a point to
     both players; Dark x Dark (your own two words crossing) gives 2 to that
     player. Three or more tiles on one cell score per pair. */
  function nodes(st) {
    const at = Object.create(null);
    for (let i = 0; i < st.tiles.length; i++) {
      const t = st.tiles[i];
      if (!t.placed) continue;
      for (let k = 0; k < t.word.length; k++) {
        const idx = (t.r + (t.vertical ? k : 0)) * st.cols + (t.c + (t.vertical ? 0 : k));
        (at[idx] || (at[idx] = [])).push(t.id);
      }
    }
    const out = [0, 0];
    let crossings = 0;
    Object.keys(at).forEach(idx => {
      const list = at[idx];
      if (list.length < 2) return;
      crossings++;
      for (let a = 0; a < list.length; a++) {
        for (let b = a + 1; b < list.length; b++) {
          const oa = st.tiles[list[a]].owner, ob = st.tiles[list[b]].owner;
          if (oa === ob) out[oa] += 2;
          else { out[0] += 1; out[1] += 1; }
        }
      }
    });
    return { per: out, crossings: crossings };
  }

  /* The bulk of the score is the node count mapped into the points band, with
     a nudge for winning so a win never trails a quiet loss. Nothing is ever
     taken away. */
  function scoreWith(st, owner, n) {
    const placed = placedCount(st, owner);
    const total = st.tiles.filter(t => t.owner === owner).length;
    const result = st.status === 'won' ? (st.winner === owner ? 1 : -1) : 0;
    const bonus = result === 1 ? WIN_BONUS : 0;
    const raw = Math.round(n.per[owner] * PER_NODE) + bonus;
    return {
      result: result,
      nodes: n.per[owner],
      crossings: n.crossings,
      bonus: bonus,
      points: Math.min(MAX_POINTS, Math.max(0, raw)),
      placed: placed,
      left: total - placed,
      total: total
    };
  }

  function score(st, owner) { return scoreWith(st, owner, nodes(st)); }

  function finish(st) {
    if (!st.elapsedMs) st.elapsedMs = Date.now() - st.startedAt;
    const n = nodes(st);
    return {
      status: st.status,
      winner: st.winner,
      reason: st.reason,
      seconds: Math.max(1, Math.round(st.elapsedMs / 1000)),
      moves: st.moves,
      level: st.level,
      tiles: st.tilesPer,
      cols: st.cols,
      rows: st.rows,
      crossings: n.crossings,
      perNode: PER_NODE,
      winBonus: WIN_BONUS,
      scores: { 0: scoreWith(st, 0, n), 1: scoreWith(st, 1, n) }
    };
  }

  return {
    LEVELS: LEVELS, DEFAULT_LEVEL: DEFAULT_LEVEL, cfgOf: cfgOf,
    TURN_MS: TURN_MS, MIN_LEN: MIN_LEN, MAX_LEN: MAX_LEN,
    PER_NODE: PER_NODE, WIN_BONUS: WIN_BONUS,
    start: start, tray: tray, placedCount: placedCount,
    cellsOf: cellsOf, insideOf: insideOf,
    canPlace: canPlace, place: place, pass: pass, rotate: rotate, end: end,
    hasAnyMove: hasAnyMove, nodes: nodes, score: score, finish: finish
  };
})();
