/* ============================================================
   Sudoku — 9 x 9 number placement.

   Every row, column and 3 x 3 box must hold 1-9 exactly once. Puzzles
   are generated here: fill a grid at random, then dig squares out again
   while the puzzle still has exactly one solution, so no puzzle can ever
   be finished with a "wrong but valid" grid.
   ============================================================ */
const Sudoku = (() => {
  const SZ = 81, ALL = 0x1ff;
  const MIN_SPEED = 0.5, MAX_SPEED = 1.6, MAX_POINTS = 300, CLEAN_BONUS = 20;

  /* `clues` is how many numbers stay printed; `par` is the time (seconds) that
     earns a 1.0 speed multiplier. The generator removes numbers in mirror pairs,
     so the printed count lands one below the target. */
  const LEVELS = [
    { key: 'easy', label: 'Easy', clues: 48, base: 80, par: 360,
      desc: 'About 47 numbers printed. Row-and-column logic alone is enough.' },
    { key: 'medium', label: 'Medium', clues: 40, base: 150, par: 720,
      desc: 'About 39 numbers printed. Comfortable, but pencil marks help.' },
    { key: 'hard', label: 'Hard', clues: 34, base: 190, par: 1200,
      desc: 'About 33 numbers printed, still a single solution. A real puzzle.' }
  ];

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  const BIT_DIGIT = {};
  for (let d = 1; d <= 9; d++) BIT_DIGIT[1 << (d - 1)] = d;

  const rowOf = i => (i / 9) | 0;
  const colOf = i => i % 9;
  const boxOf = i => (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0);
  const bitCount = x => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* The 20 squares sharing a row, column or box with each square. */
  const PEERS = (() => {
    const out = [];
    for (let i = 0; i < SZ; i++) {
      const list = [];
      for (let j = 0; j < SZ; j++) {
        if (j === i) continue;
        if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) list.push(j);
      }
      out.push(list);
    }
    return out;
  })();

  function masks(grid) {
    const m = { rows: new Array(9).fill(0), cols: new Array(9).fill(0), boxes: new Array(9).fill(0) };
    for (let i = 0; i < SZ; i++) {
      const v = grid[i];
      if (!v) continue;
      const b = 1 << (v - 1);
      m.rows[rowOf(i)] |= b;
      m.cols[colOf(i)] |= b;
      m.boxes[boxOf(i)] |= b;
    }
    return m;
  }

  /* The empty square with the fewest candidates — this is what makes the
     solver fast enough to call 80+ times while digging out a puzzle. */
  function pick(g, m) {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < SZ; i++) {
      if (g[i]) continue;
      const avail = ALL & ~(m.rows[rowOf(i)] | m.cols[colOf(i)] | m.boxes[boxOf(i)]);
      const c = bitCount(avail);
      if (!c) return { i: -1, mask: 0, dead: true };
      if (c < bestCount) {
        bestCount = c; best = i; bestMask = avail;
        if (c === 1) break;
      }
    }
    return { i: best, mask: bestMask, dead: false };
  }

  /* Count solutions, stopping as soon as `limit` are found. */
  function search(g, m, limit) {
    const p = pick(g, m);
    if (p.dead) return 0;
    if (p.i < 0) return 1;
    const r = rowOf(p.i), c = colOf(p.i), b = boxOf(p.i);
    let found = 0, left = p.mask;
    while (left) {
      const bit = left & -left;
      left ^= bit;
      g[p.i] = BIT_DIGIT[bit];
      m.rows[r] |= bit; m.cols[c] |= bit; m.boxes[b] |= bit;
      found += search(g, m, limit - found);
      g[p.i] = 0;
      m.rows[r] ^= bit; m.cols[c] ^= bit; m.boxes[b] ^= bit;
      if (found >= limit) break;
    }
    return found;
  }

  const countSolutions = (grid, limit) => search(grid.slice(), masks(grid), limit);

  /* Fill every square with a random valid digit. */
  function fillAll(g, m) {
    const p = pick(g, m);
    if (p.dead) return false;
    if (p.i < 0) return true;
    const r = rowOf(p.i), c = colOf(p.i), b = boxOf(p.i);
    const opts = [];
    let left = p.mask;
    while (left) { const bit = left & -left; left ^= bit; opts.push(bit); }
    shuffle(opts);
    for (let k = 0; k < opts.length; k++) {
      const bit = opts[k];
      g[p.i] = BIT_DIGIT[bit];
      m.rows[r] |= bit; m.cols[c] |= bit; m.boxes[b] |= bit;
      if (fillAll(g, m)) return true;
      g[p.i] = 0;
      m.rows[r] ^= bit; m.cols[c] ^= bit; m.boxes[b] ^= bit;
    }
    return false;
  }

  /* Fill at random, then take numbers away again while the puzzle keeps a
     single solution. Pass 1 removes mirror pairs (which is how printed puzzles
     look); pass 2 keeps digging anywhere if that was not enough. */
  function generate(targetClues) {
    const solution = new Array(SZ).fill(0);
    fillAll(solution, masks(solution));
    const puzzle = solution.slice();
    let left = SZ;

    const pairs = [];
    for (let i = 0; i <= 40; i++) pairs.push(i);
    shuffle(pairs);
    for (let k = 0; k < pairs.length && left > targetClues; k++) {
      const i = pairs[k], j = SZ - 1 - i;
      if (i === j || !puzzle[i]) continue;
      const a = puzzle[i], b = puzzle[j];
      puzzle[i] = 0; puzzle[j] = 0;
      if (countSolutions(puzzle, 2) === 1) left -= 2;
      else { puzzle[i] = a; puzzle[j] = b; }
    }

    if (left > targetClues) {
      const rest = [];
      for (let i = 0; i < SZ; i++) rest.push(i);
      shuffle(rest);
      for (let k = 0; k < rest.length && left > targetClues; k++) {
        const i = rest[k];
        if (!puzzle[i]) continue;
        const a = puzzle[i];
        puzzle[i] = 0;
        if (countSolutions(puzzle, 2) === 1) left--;
        else puzzle[i] = a;
      }
    }
    return { puzzle: puzzle, solution: solution, clues: left };
  }

  /* ---------------- play ---------------- */

  function start(level) {
    const cfg = cfgOf(level);
    const gen = generate(cfg.clues);
    return {
      level: cfg.key, label: cfg.label, base: cfg.base, par: cfg.par,
      size: SZ,
      grid: gen.puzzle.slice(),
      puzzle: gen.puzzle.slice(),
      solution: gen.solution,
      clues: gen.clues,
      given: gen.puzzle.map(v => v > 0),
      notes: new Array(SZ).fill(0),
      wrong: new Array(SZ).fill(false),
      sel: -1, notesOn: false,
      moves: 0, mistakes: 0,
      status: 'playing', startedAt: Date.now(), elapsedMs: 0
    };
  }

  const isGiven = (st, i) => !!st.given[i];
  const valueAt = (st, i) => st.grid[i];

  function filled(st) {
    let n = 0;
    for (let i = 0; i < SZ; i++) if (st.grid[i]) n++;
    return n;
  }

  /* How many of digit `v` are on the board — the pad greys out finished ones. */
  function placed(st, v) {
    let n = 0;
    for (let i = 0; i < SZ; i++) if (st.grid[i] === v) n++;
    return n;
  }

  /* Squares that clash with an equal number in their row, column or box. */
  function conflicts(st) {
    const bad = new Array(SZ).fill(false);
    for (let i = 0; i < SZ; i++) {
      const v = st.grid[i];
      if (!v) continue;
      const peers = PEERS[i];
      for (let k = 0; k < peers.length; k++) {
        if (st.grid[peers[k]] === v) { bad[i] = true; bad[peers[k]] = true; }
      }
    }
    return bad;
  }

  function complete(st) {
    for (let i = 0; i < SZ; i++) {
      if (!st.grid[i]) return false;
      const peers = PEERS[i];
      for (let k = 0; k < peers.length; k++) if (st.grid[peers[k]] === st.grid[i]) return false;
    }
    return true;
  }

  /* Write `v` into square `i` (0 clears it, a digit while notes are on toggles
     the pencil mark instead). Returns whether anything changed. */
  function set(st, i, v) {
    if (st.status !== 'playing' || i < 0 || i >= SZ || st.given[i]) return false;
    const bit = v ? 1 << (v - 1) : 0;

    if (v && st.notesOn) {
      st.notes[i] ^= bit;
      return true;
    }
    if (st.grid[i] === v) return false;

    st.grid[i] = v;
    st.notes[i] = 0;
    if (v) {
      st.moves++;
      if (v !== st.solution[i]) { st.mistakes++; st.wrong[i] = true; }
      /* a number placed for real makes the same pencil mark pointless */
      const peers = PEERS[i];
      for (let k = 0; k < peers.length; k++) {
        const j = peers[k];
        if (!st.given[j]) st.notes[j] &= ~bit;
      }
    }
    if (complete(st)) st.status = 'solved';
    return true;
  }

  function select(st, i) {
    st.sel = (i >= 0 && i < SZ) ? i : -1;
    return st.sel;
  }

  function toggleNotes(st) {
    st.notesOn = !st.notesOn;
    return st.notesOn;
  }

  /* First empty square, for the keyboard when nothing is selected. */
  function firstEmpty(st) {
    for (let i = 0; i < SZ; i++) if (!st.grid[i]) return i;
    return -1;
  }

  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const solved = st.status === 'solved';
    const clean = st.mistakes === 0;
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, cfg.par / seconds));
    const cleanBonus = solved && clean ? CLEAN_BONUS : 0;
    const base = cfg.base + cleanBonus;
    return {
      level: st.level, label: st.label, size: SZ,
      clues: st.clues, filled: filled(st),
      solved: solved, seconds: seconds, speed: speed,
      par: cfg.par, base: base, cleanBonus: cleanBonus,
      clean: clean, mistakes: st.mistakes, moves: st.moves,
      points: solved ? Math.max(0, Math.min(MAX_POINTS, Math.round(base * speed))) : 0
    };
  }

  return {
    SZ: SZ, LEVELS: LEVELS, MAX_POINTS: MAX_POINTS, CLEAN_BONUS: CLEAN_BONUS,
    cfgOf: cfgOf, start: start, set: set, select: select,
    isGiven: isGiven, valueAt: valueAt, filled: filled, placed: placed,
    conflicts: conflicts, complete: complete,
    toggleNotes: toggleNotes, firstEmpty: firstEmpty,
    finish: finish, generate: generate, countSolutions: countSolutions
  };
})();
