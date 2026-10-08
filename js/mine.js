/* ============================================================
   WordBubbles — Minesweeper engine.

   Flat grid, index 0 = top-left. Three classic levels. The board is seeded
   on the FIRST reveal, with the clicked cell and its eight neighbours kept
   mine-free, so the opening move always has room to breathe.

   Left click / tap reveals. Flagging is just a mark — the win condition is
   "every non-mine cell is open", exactly like the original.
   ============================================================ */
const Mine = (() => {
  const LEVELS = [
    { key: 'beginner', label: 'Beginner', cols: 9, rows: 9, mines: 10, base: 100,
      desc: '9 × 9 with 10 mines. A quick warm-up.' },
    { key: 'intermediate', label: 'Intermediate', cols: 16, rows: 16, mines: 40, base: 200,
      desc: '16 × 16 with 40 mines. The classic.' },
    { key: 'expert', label: 'Expert', cols: 30, rows: 16, mines: 99, base: 320,
      desc: '30 × 16 with 99 mines. Good luck.' }
  ];

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  function start(level) {
    const cfg = cfgOf(level);
    const size = cfg.cols * cfg.rows;
    return {
      level: cfg.key,
      cols: cfg.cols, rows: cfg.rows, mines: cfg.mines, base: cfg.base,
      mine: new Array(size).fill(false),
      open: new Array(size).fill(false),
      flag: new Array(size).fill(false),
      near: new Array(size).fill(0),
      seeded: false,
      status: 'playing',          // 'playing' | 'won' | 'lost'
      exploded: -1,
      flags: 0,
      opened: 0,
      size: size,
      par: Math.round(size / 3),  // seconds; "a good time" for the speed factor
      startedAt: Date.now(),
      firstAt: 0,
      elapsedMs: 0
    };
  }

  function around(st, i) {
    const c = i % st.cols, r = (i / st.cols) | 0, out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < st.rows && cc >= 0 && cc < st.cols) out.push(rr * st.cols + cc);
      }
    }
    return out;
  }

  /* Place the mines once, avoiding the first click and everything around it. */
  function seed(st, safe) {
    const banned = {};
    banned[safe] = true;
    around(st, safe).forEach(j => { banned[j] = true; });

    const pool = [];
    for (let i = 0; i < st.size; i++) if (!banned[i]) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    const n = Math.min(st.mines, pool.length);
    for (let k = 0; k < n; k++) st.mine[pool[k]] = true;

    for (let i = 0; i < st.size; i++) {
      if (st.mine[i]) { st.near[i] = -1; continue; }
      let c = 0;
      around(st, i).forEach(j => { if (st.mine[j]) c++; });
      st.near[i] = c;
    }
    st.seeded = true;
    st.firstAt = Date.now();
  }

  /* Open `i` and spread outwards while the cells have no adjacent mines. */
  function flood(st, seeds) {
    const out = [];
    const stack = seeds.slice();
    while (stack.length) {
      const i = stack.pop();
      if (st.open[i] || st.flag[i] || st.mine[i]) continue;
      st.open[i] = true;
      st.opened++;
      out.push(i);
      if (st.near[i] === 0) {
        around(st, i).forEach(j => { if (!st.open[j] && !st.flag[j]) stack.push(j); });
      }
    }
    return out;
  }

  function settle(st) {
    if (st.status !== 'playing') return;
    if (st.opened < st.size - st.mines) return;
    st.status = 'won';
    const mines = [];
    for (let i = 0; i < st.size; i++) if (st.mine[i]) { st.flag[i] = true; mines.push(i); }
    st.flags = st.mines;
    st.winMines = mines;
  }

  function open(st, i) {
    if (!st || st.status !== 'playing' || i < 0 || i >= st.size) return null;
    if (st.flag[i] || st.open[i]) return null;
    if (!st.seeded) seed(st, i);

    if (st.mine[i]) {
      st.open[i] = true;
      st.opened++;
      st.exploded = i;
      st.status = 'lost';
      return { boom: true, opened: [i] };
    }
    const cells = flood(st, [i]);
    settle(st);
    return { boom: false, opened: cells };
  }

  function flag(st, i) {
    if (!st || st.status !== 'playing' || i < 0 || i >= st.size) return null;
    if (st.open[i]) return null;
    st.flag[i] = !st.flag[i];
    st.flags += st.flag[i] ? 1 : -1;
    return { flagged: st.flag[i] };
  }

  /* Clicking a satisfied number opens its remaining neighbours — the usual
     "chord" shortcut, and a mistake there loses just like any other. */
  function chord(st, i) {
    if (!st || st.status !== 'playing' || !st.open[i] || st.near[i] <= 0) return null;
    const nb = around(st, i);
    let marked = 0;
    nb.forEach(j => { if (st.flag[j]) marked++; });
    if (marked !== st.near[i]) return null;

    const opened = [];
    let boom = false;
    for (const j of nb) {
      if (st.flag[j] || st.open[j]) continue;
      const res = open(st, j);
      if (!res) continue;
      opened.push.apply(opened, res.opened);
      if (res.boom) { boom = true; break; }
    }
    if (!opened.length) return null;
    return { boom: boom, opened: opened, chord: true };
  }

  const seconds = st => Math.max(1, Math.round(
    (st.elapsedMs || (Date.now() - (st.firstAt || st.startedAt))) / 1000));

  /* Cleared board scores by difficulty and speed; blowing up simply scores
     nothing (this project never takes points away). */
  function score(st) {
    const won = st.status === 'won';
    const speed = Math.min(1.6, Math.max(0.4, st.par / seconds(st)));
    return {
      points: won ? Math.min(300, Math.max(0, Math.round(st.base * speed))) : 0,
      won: won,
      speed: speed,
      seconds: seconds(st),
      opened: st.opened,
      safe: st.size - st.mines,
      flags: st.flags
    };
  }

  function finish(st) {
    if (!st.elapsedMs) st.elapsedMs = Date.now() - (st.firstAt || st.startedAt);
    return {
      status: st.status,
      won: st.status === 'won',
      level: st.level,
      levelLabel: cfgOf(st.level).label,
      seconds: seconds(st),
      opened: st.opened,
      safe: st.size - st.mines,
      flags: st.flags,
      mines: st.mines,
      base: st.base,
      par: st.par,
      cols: st.cols,
      rows: st.rows,
      score: score(st)
    };
  }

  return {
    LEVELS: LEVELS, cfgOf: cfgOf,
    start: start, open: open, flag: flag, chord: chord,
    around: around, score: score, finish: finish
  };
})();
