/* ============================================================
   Slide — the sliding number puzzle (数字华容道 / fifteen puzzle).

   An n x n frame holds the numbers 1 .. n*n-1 and one empty square.
   Slide a number into the empty square until every number sits in its
   home place and the empty square is bottom-right.

   The scramble is made by walking the empty square around with legal
   moves, so a puzzle is never unsolvable by construction — no parity
   check needed.
   ============================================================ */
const Slide = (() => {
  const BLANK = 0;

  /* `par` is the time (in seconds) that earns a 1.0 speed multiplier; solving
     in par/1.6 seconds is the best a round can score. */
  const LEVELS = [
    { key: 'easy', n: 3, label: '3 × 3', base: 80, par: 45,
      desc: 'Eight numbers in a nine-square frame. A quick warm-up.' },
    { key: 'medium', n: 4, label: '4 × 4', base: 150, par: 150,
      desc: 'The classic fifteen puzzle — fifteen numbers, one gap.' },
    { key: 'hard', n: 5, label: '5 × 5', base: 190, par: 360,
      desc: 'Twenty-four numbers. Plenty of room to lose your way.' }
  ];

  const MIN_SPEED = 0.5, MAX_SPEED = 1.6, MAX_POINTS = 300;

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  /* The four squares that touch `i`, staying inside the frame. */
  function neighbours(n, i) {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  const solvedBoard = n => {
    const out = [];
    for (let i = 1; i < n * n; i++) out.push(i);
    out.push(BLANK);
    return out;
  };

  /* How many numbers are away from home (the gap never counts). */
  function misplaced(board, n) {
    let bad = 0;
    for (let i = 0; i < n * n - 1; i++) if (board[i] !== i + 1) bad++;
    return bad;
  }

  /* Walk the gap around with real moves, so the result is always solvable. */
  function scramble(n) {
    const size = n * n;
    const board = solvedBoard(n);
    let gap = size - 1, prev = -1;
    for (let k = 0; k < size * 30; k++) {
      const opts = neighbours(n, gap).filter(j => j !== prev);
      const pick = opts[(Math.random() * opts.length) | 0];
      board[gap] = board[pick];
      board[pick] = BLANK;
      prev = gap;
      gap = pick;
    }
    return { board: board, gap: gap };
  }

  function start(level) {
    const cfg = cfgOf(level);
    const n = cfg.n, size = n * n;
    /* Reject scrambles that barely moved anything — a puzzle that is one nudge
       from solved is no puzzle at all. */
    let board, gap;
    for (let tries = 0; tries < 40; tries++) {
      const s = scramble(n);
      board = s.board;
      gap = s.gap;
      if (misplaced(board, n) >= size * 0.55) break;
    }

    return {
      level: cfg.key, n: n, size: size, label: cfg.label,
      base: cfg.base, par: cfg.par,
      board: board, gap: gap,
      goal: solvedBoard(n),
      moves: 0, status: 'playing',
      startedAt: Date.now(), elapsedMs: 0
    };
  }

  const valueAt = (st, i) => st.board[i];
  const isGap = (st, i) => st.board[i] === BLANK;
  const canSlide = (st, i) =>
    st.status === 'playing' && i >= 0 && i < st.size && st.board[i] !== BLANK &&
    neighbours(st.n, st.gap).indexOf(i) >= 0;

  /* Slide the number at `i` into the gap. Returns what moved, for the view. */
  function slide(st, i) {
    if (!canSlide(st, i)) return { moved: false };
    const tile = st.board[i];
    st.board[st.gap] = tile;
    st.board[i] = BLANK;
    const from = i;
    st.gap = i;
    st.moves++;
    const solved = isSolved(st);
    if (solved) st.status = 'solved';
    return { moved: true, tile: tile, from: from, to: st.gap, solved: solved };
  }

  /* True when every number is in its home square and the gap is last. */
  function isSolved(st) {
    for (let i = 0; i < st.size - 1; i++) if (st.board[i] !== i + 1) return false;
    return st.board[st.size - 1] === BLANK;
  }

  /* Nudge the gap: `d` is a direction the number next to it is pushed in. */
  function step(st, dr, dc) {
    const n = st.n;
    const r = (st.gap / n) | 0, c = st.gap % n;
    const tr = r + dr, tc = c + dc;
    if (tr < 0 || tc < 0 || tr >= n || tc >= n) return { moved: false };
    return slide(st, tr * n + tc);
  }

  function score(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const solved = st.status === 'solved';
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, cfg.par / seconds));
    return {
      solved: solved,
      label: cfg.label, level: cfg.key,
      base: cfg.base, par: cfg.par,
      seconds: seconds, speed: speed,
      points: solved ? Math.max(0, Math.min(MAX_POINTS, Math.round(cfg.base * speed))) : 0
    };
  }

  function finish(st) {
    const s = score(st);
    const n = st.n, size = st.size;
    const total = size - 1;
    /* a number counts as home only if it sits in its own square; one parked in
       the gap's square is away, and `misplaced` never looks at that last cell */
    const away = misplaced(st.board, n) + (st.board[size - 1] === BLANK ? 0 : 1);
    return {
      level: st.level, label: st.label, n: n, size: size,
      solved: s.solved, seconds: s.seconds, speed: s.speed,
      moves: st.moves, points: s.points,
      base: s.base, par: s.par,
      home: total - away, total: total
    };
  }

  return {
    BLANK: BLANK, LEVELS: LEVELS, MAX_POINTS: MAX_POINTS,
    cfgOf: cfgOf, neighbours: neighbours,
    start: start, slide: slide, step: step, canSlide: canSlide,
    isSolved: isSolved, valueAt: valueAt, isGap: isGap,
    score: score, finish: finish
  };
})();
