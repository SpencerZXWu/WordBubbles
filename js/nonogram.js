/* ============================================================
   Nonogram — read the numbers around the grid and shade the picture.

   Each row and column carries the lengths of its runs of shaded squares,
   in order. Shade the squares that fit every one of those clues.

   The picture is generated and then checked with a proper line solver:
   a puzzle is only handed out if shading every forced square, over and
   over, settles the whole grid — which means it can always be finished
   by logic alone, with no guessing, and has exactly one answer.
   ============================================================ */
const Nonogram = (() => {
  const LEVELS = [
    { key: 'easy', label: '5 × 5', n: 5, base: 80, par: 120, minRun: 1, maxRun: 3,
      desc: 'A small picture. A gentle warm-up.' },
    { key: 'medium', label: '10 × 10', n: 10, base: 150, par: 420, minRun: 1, maxRun: 4,
      desc: 'A medium picture. Real nonogram thinking.' },
    { key: 'hard', label: '15 × 15', n: 15, base: 190, par: 900, minRun: 1, maxRun: 5,
      desc: 'A big picture. Long, but every step is logical.' }
  ];

  const MIN_SPEED = 0.5, MAX_SPEED = 1.6, MAX_POINTS = 300;
  const FILLED = 1, EMPTY = -1, UNKNOWN = 0;

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  /* ---------------- the line solver ----------------
     For one line we ask, over every arrangement that fits the clues and the
     squares already decided, which squares are shaded in ALL of them (so they
     are certainly shaded) and which are blank in all of them. That is the
     whole trick behind solving a nonogram without guessing. */
  function lineSolve(blocks, known) {
    const n = known.length, k = blocks.length;
    const clearAt = i => known[i] !== FILLED;           // may this square be blank?
    const runFits = (s, len) => {
      if (s + len > n) return false;
      for (let i = s; i < s + len; i++) if (known[i] === EMPTY) return false;
      return true;
    };
    /* Where the line stands after a block of `len` starting at `s`: normally one
       square further on (the blank that separates runs), but when the block ends
       at the last square there is no separator left to consume. */
    const after = (s, len) => (s + len === n ? n : s + len + 1);
    /* f[i][j]: squares i..n-1 can be covered exactly by blocks j..k-1 */
    const f = [];
    for (let i = 0; i <= n + 1; i++) f.push(new Array(k + 1).fill(false));
    f[n][k] = true;
    for (let i = n - 1; i >= 0; i--) {
      let allClear = true;
      for (let t = i; t < n; t++) if (known[t] === FILLED) { allClear = false; break; }
      f[i][k] = allClear;
    }
    for (let i = n - 1; i >= 0; i--) {
      for (let j = k - 1; j >= 0; j--) {
        const len = blocks[j];
        let ok = false;
        if (clearAt(i) && f[i + 1][j]) ok = true;
        if (!ok && runFits(i, len) && (i + len === n || clearAt(i + len)) &&
            f[after(i, len)][j + 1]) ok = true;
        f[i][j] = ok;
      }
    }
    /* g[i][j]: squares 0..i-1 can be covered exactly by blocks 0..j-1 */
    const g = [];
    for (let i = 0; i <= n + 1; i++) g.push(new Array(k + 1).fill(false));
    g[0][0] = true;
    const canFill = new Array(n).fill(false);
    const canEmpty = new Array(n).fill(false);
    for (let i = 0; i <= n + 1; i++) {
      for (let j = 0; j <= k; j++) {
        if (!g[i][j] || i >= n) continue;
        if (clearAt(i) && f[i + 1][j]) {
          canEmpty[i] = true;
          g[i + 1][j] = true;
        }
        if (j < k) {
          const len = blocks[j];
          if (runFits(i, len) && (i + len === n || clearAt(i + len)) &&
              f[after(i, len)][j + 1]) {
            for (let t = i; t < i + len; t++) canFill[t] = true;
            /* the square right after a run is blank in this arrangement —
               without this the solver has squares with no verdict at all and
               gives up on lines that are perfectly solvable */
            if (i + len < n) canEmpty[i + len] = true;
            g[after(i, len)][j + 1] = true;
          }
        }
      }
    }
    const out = new Array(n).fill(UNKNOWN);
    for (let i = 0; i < n; i++) {
      if (canFill[i] && !canEmpty[i]) out[i] = FILLED;
      else if (canEmpty[i] && !canFill[i]) out[i] = EMPTY;
      else if (!canFill[i] && !canEmpty[i]) return null;   // no arrangement at all
    }
    return out;
  }

  /* Repeat the line solver over every row and column until nothing new falls
     out. Pass `seed` to start from a partly-filled grid (the player's marks)
     instead of a blank one. Returns the settled grid, or null when the clues
     and the seed cannot both be satisfied. */
  function propagate(clues, n, seed) {
    const grid = seed ? seed.slice() : new Array(n * n).fill(UNKNOWN);
    let changed = true;
    let guard = 0;
    while (changed && guard++ < n * 4) {
      changed = false;
      for (let r = 0; r < n; r++) {
        const known = [];
        for (let c = 0; c < n; c++) known.push(grid[r * n + c]);
        const line = lineSolve(clues.rows[r], known);
        if (!line) return null;
        for (let c = 0; c < n; c++) {
          if (line[c] !== UNKNOWN && grid[r * n + c] === UNKNOWN) {
            grid[r * n + c] = line[c];
            changed = true;
          }
        }
      }
      for (let c = 0; c < n; c++) {
        const known = [];
        for (let r = 0; r < n; r++) known.push(grid[r * n + c]);
        const line = lineSolve(clues.cols[c], known);
        if (!line) return null;
        for (let r = 0; r < n; r++) {
          if (line[r] !== UNKNOWN && grid[r * n + c] === UNKNOWN) {
            grid[r * n + c] = line[r];
            changed = true;
          }
        }
      }
    }
    return grid.indexOf(UNKNOWN) < 0 ? grid : null;
  }

  /* One square the clues force that the player has not marked that way yet.
     Because every puzzle here is solvable by line logic from empty, feeding the
     player's own marks back into the same solver always either contradicts them
     or settles the grid — so a hint is never a guess. */
  function solveStep(st) {
    const settled = propagate(st.clues, st.n, st.marks);
    if (!settled) return { ok: false, wrong: true };
    for (let i = 0; i < settled.length; i++) {
      if (settled[i] === UNKNOWN) continue;
      if (st.marks[i] === settled[i]) continue;
      return { ok: true, cell: i, value: settled[i] };
    }
    return { ok: false, done: true };
  }

  /* ---------------- making a picture ---------------- */
  const runsOf = line => {
    const out = [];
    let len = 0;
    line.forEach(v => {
      if (v === FILLED) len++;
      else if (len) { out.push(len); len = 0; }
    });
    if (len) out.push(len);
    return out;
  };

  function cluesOf(pic, n) {
    const rows = [], cols = [];
    for (let r = 0; r < n; r++) {
      const line = [];
      for (let c = 0; c < n; c++) line.push(pic[r * n + c]);
      rows.push(runsOf(line));
    }
    for (let c = 0; c < n; c++) {
      const line = [];
      for (let r = 0; r < n; r++) line.push(pic[r * n + c]);
      cols.push(runsOf(line));
    }
    return { rows: rows, cols: cols };
  }

  /* Blocky runs, mirrored left to right — pictures look deliberate and long
     runs keep the clues from turning into a fog of lonely 1s. */
  function randomPicture(n, minRun, maxRun) {
    const picture = new Array(n * n).fill(0);
    const half = Math.ceil(n / 2);
    const span = Math.max(1, maxRun - minRun + 1);
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < half) {
        const len = minRun + ((Math.random() * span) | 0);
        const on = Math.random() < 0.55;
        for (let k = 0; k < len && c < half; k++, c++) picture[r * n + c] = on ? FILLED : EMPTY;
      }
      for (let c2 = 0; c2 < half; c2++) picture[r * n + (n - 1 - c2)] = picture[r * n + c2];
    }
    return picture;
  }

  /* A line that is entirely blank, or one solid run right across, is already
     finished before the player thinks — a picture full of those is no puzzle. */
  function lineIsTrivial(clues, n) {
    if (!clues.length) return true;
    return clues.length === 1 && clues[0] === n;
  }

  /* Only hand out pictures that the line solver can finish on its own. */
  function makePuzzle(n, minRun, maxRun) {
    for (let relax = 0; relax < 3; relax++) {
      const lo = Math.min(minRun + relax, maxRun);
      for (let attempt = 0; attempt < 30; attempt++) {
        const pic = randomPicture(n, lo, maxRun + relax);
        let on = 0;
        pic.forEach(v => { if (v === FILLED) on++; });
        const share = on / (n * n);
        if (share < 0.32 || share > 0.78) continue;         // too blank / too solid
        const clues = cluesOf(pic, n);
        let interesting = 0;
        clues.rows.forEach(c => { if (!lineIsTrivial(c, n)) interesting++; });
        clues.cols.forEach(c => { if (!lineIsTrivial(c, n)) interesting++; });
        if (interesting < (n * 2) * 0.65) continue;         // banded, boring picture
        const settled = propagate(clues, n);
        if (settled) return { clues: clues, solution: settled };
      }
    }
    return null;
  }

  /* ---------------- play ---------------- */

  function start(level) {
    const cfg = cfgOf(level);
    let made = makePuzzle(cfg.n, cfg.minRun, cfg.maxRun);
    if (!made) {
      /* should not happen, but never leave the player with nothing */
      const pic = new Array(cfg.n * cfg.n).fill(EMPTY);
      pic[0] = FILLED;
      const clues = cluesOf(pic, cfg.n);
      made = { clues: clues, solution: pic };
    }
    return {
      level: cfg.key, label: cfg.label, n: cfg.n,
      base: cfg.base, par: cfg.par,
      clues: made.clues,
      solution: made.solution,
      marks: new Array(cfg.n * cfg.n).fill(UNKNOWN),
      mode: 'fill',                    // 'fill' shades, 'mark' cross-hatches
      moves: 0, hints: 0, status: 'playing',
      startedAt: Date.now(), elapsedMs: 0
    };
  }

  const at = (st, i) => st.marks[i];
  const isDone = st => st.status !== 'playing';

  function paint(st, i, mode) {
    if (st.status !== 'playing' || i < 0 || i >= st.marks.length) return false;
    const want = (mode || st.mode) === 'mark' ? EMPTY : FILLED;
    st.marks[i] = st.marks[i] === want ? UNKNOWN : want;
    st.moves++;
    if (check(st)) st.status = 'solved';
    return true;
  }

  /* Put an exact mark on a square (fills use `paint`, drags use this so the
     whole stroke shares one value instead of toggling square by square). */
  function set(st, i, value) {
    if (st.status !== 'playing' || i < 0 || i >= st.marks.length) return false;
    if (st.marks[i] === value) return false;
    st.marks[i] = value;
    st.moves++;
    if (check(st)) st.status = 'solved';
    return true;
  }

  function toggleMode(st) {
    st.mode = st.mode === 'mark' ? 'fill' : 'mark';
    return st.mode;
  }

  function clearAll(st) {
    if (st.status !== 'playing') return;
    st.marks = st.marks.map(() => UNKNOWN);
  }

  /* The picture is right when every row and column shows exactly its clues. */
  function check(st) {
    const n = st.n;
    const rows = [], cols = [];
    for (let r = 0; r < n; r++) {
      const line = [];
      for (let c = 0; c < n; c++) line.push(st.marks[r * n + c] === FILLED ? FILLED : EMPTY);
      rows.push(runsOf(line));
    }
    for (let c = 0; c < n; c++) {
      const line = [];
      for (let r = 0; r < n; r++) line.push(st.marks[r * n + c] === FILLED ? FILLED : EMPTY);
      cols.push(runsOf(line));
    }
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    for (let r = 0; r < n; r++) if (!same(rows[r], st.clues.rows[r])) return false;
    for (let c = 0; c < n; c++) if (!same(cols[c], st.clues.cols[c])) return false;
    return true;
  }

  /* Per-line state for the view: `done` when the clue is matched, `over` when
     too many squares are shaded for the clue to ever fit. */
  function lineStates(st) {
    const n = st.n;
    const rows = [], cols = [];
    for (let r = 0; r < n; r++) {
      const line = [];
      let on = 0;
      for (let c = 0; c < n; c++) {
        line.push(st.marks[r * n + c] === FILLED ? FILLED : EMPTY);
        if (st.marks[r * n + c] === FILLED) on++;
      }
      const need = st.clues.rows[r].reduce((a, b) => a + b, 0);
      const run = runsOf(line);
      rows.push(on >= need && run.join(',') === st.clues.rows[r].join(',')
        ? 'done' : (on < need ? 'open' : 'over'));
    }
    for (let c = 0; c < n; c++) {
      const line = [];
      let on = 0;
      for (let r = 0; r < n; r++) {
        line.push(st.marks[r * n + c] === FILLED ? FILLED : EMPTY);
        if (st.marks[r * n + c] === FILLED) on++;
      }
      const need = st.clues.cols[c].reduce((a, b) => a + b, 0);
      const run = runsOf(line);
      cols.push(on >= need && run.join(',') === st.clues.cols[c].join(',')
        ? 'done' : (on < need ? 'open' : 'over'));
    }
    return { rows: rows, cols: cols };
  }

  const filledCount = st => st.marks.filter(m => m === FILLED).length;

  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const solved = st.status === 'solved' || check(st);
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, cfg.par / seconds));
    return {
      level: st.level, label: st.label, n: st.n,
      solved: solved, seconds: seconds, speed: speed,
      par: cfg.par, base: cfg.base,
      moves: st.moves, hints: st.hints, shaded: filledCount(st),
      total: st.solution.filter(v => v === FILLED).length,
      points: solved ? Math.max(0, Math.min(MAX_POINTS, Math.round(cfg.base * speed))) : 0
    };
  }

  return {
    LEVELS: LEVELS, cfgOf: cfgOf, MAX_POINTS: MAX_POINTS,
    FILLED: FILLED, EMPTY: EMPTY, UNKNOWN: UNKNOWN,
    start: start, paint: paint, set: set, toggleMode: toggleMode, clearAll: clearAll,
    check: check, lineStates: lineStates, filledCount: filledCount, finish: finish,
    /* exposed for tests */
    lineSolve: lineSolve, propagate: propagate, solveStep: solveStep,
    cluesOf: cluesOf, runsOf: runsOf,
    makePuzzle: makePuzzle, lineIsTrivial: lineIsTrivial
  };
})();
