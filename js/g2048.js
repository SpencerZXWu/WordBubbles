/* ============================================================
   2048 — slide the grid, merge equal tiles, reach the goal tile.

   Every swipe moves the whole board as far as it can go; two equal
   numbers that meet become their sum. One new tile appears per move,
   and the round ends when the goal tile shows up (or when the board
   jams with no move left).
   ============================================================ */
const G2048 = (() => {
  const LEVELS = [
    { key: 'easy', label: '3 × 3', n: 3, goal: 64, base: 120,
      desc: 'A small grid. Reach 64 — easier than it sounds.' },
    { key: 'medium', label: '4 × 4', n: 4, goal: 512, base: 220,
      desc: 'The classic grid. Reach 512.' },
    { key: 'hard', label: '4 × 4, big goal', n: 4, goal: 2048, base: 280,
      desc: 'The classic grid, all the way to 2048. Needs planning.' }
  ];

  const MAX_POINTS = 300, CLEAR_BONUS = 20, SPAWN_FOUR = 0.1;
  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  function start(level) {
    const cfg = cfgOf(level);
    const st = {
      level: cfg.key, label: cfg.label, n: cfg.n, goal: cfg.goal, base: cfg.base,
      board: new Array(cfg.n * cfg.n).fill(0),
      score: 0, moves: 0, merges: 0, best: 0,
      status: 'playing', startedAt: Date.now(), elapsedMs: 0
    };
    spawn(st);
    spawn(st);
    st.status = 'playing';
    return st;
  }

  function emptyCells(st) {
    const out = [];
    for (let i = 0; i < st.board.length; i++) if (!st.board[i]) out.push(i);
    return out;
  }

  function spawn(st) {
    const free = emptyCells(st);
    if (!free.length) return -1;
    const at = free[(Math.random() * free.length) | 0];
    st.board[at] = Math.random() < SPAWN_FOUR ? 4 : 2;
    return at;
  }

  /* The index lists a swipe travels along: the first entry is the far end, so
     packing the values toward the front slides them in the pressed direction. */
  function lines(st, dir) {
    const n = st.n;
    const out = [];
    for (let a = 0; a < n; a++) {
      const line = [];
      for (let b = 0; b < n; b++) {
        let r, c;
        if (dir === 'left') { r = a; c = b; }
        else if (dir === 'right') { r = a; c = n - 1 - b; }
        else if (dir === 'up') { r = b; c = a; }
        else { r = n - 1 - b; c = a; }
        line.push(r * n + c);
      }
      out.push(line);
    }
    return out;
  }

  /* Slide and merge one line. Returns the board positions that just merged. */
  function collapse(st, cells) {
    const n = st.n;
    const packed = [];
    cells.forEach(i => { if (st.board[i]) packed.push(st.board[i]); });
    const out = [];
    const mergedAt = [];
    for (let k = 0; k < packed.length; k++) {
      if (k < packed.length - 1 && packed[k] === packed[k + 1]) {
        const v = packed[k] * 2;
        out.push(v);
        mergedAt.push(out.length - 1);
        st.score += v;
        st.merges++;
        k++;
      } else {
        out.push(packed[k]);
      }
    }
    while (out.length < n) out.push(0);
    let changed = false;
    for (let k = 0; k < n; k++) {
      if (st.board[cells[k]] !== out[k]) changed = true;
      st.board[cells[k]] = out[k];
    }
    return { changed: changed, mergedAt: mergedAt.map(k => cells[k]) };
  }

  /* One swipe. `dir` is one of up / down / left / right. */
  function move(st, dir) {
    if (st.status !== 'playing') return { moved: false };
    if (!DIRS[dir]) return { moved: false };
    const merged = [];
    let changed = false;
    lines(st, dir).forEach(line => {
      const r = collapse(st, line);
      if (r.changed) changed = true;
      r.mergedAt.forEach(i => merged.push(i));
    });
    if (!changed) return { moved: false };

    st.moves++;
    const spawned = spawn(st);
    st.best = Math.max(st.best, bestTile(st));
    if (bestTile(st) >= st.goal) st.status = 'won';
    else if (!hasMoves(st)) st.status = 'lost';
    return {
      moved: true, merged: merged, spawned: spawned,
      status: st.status, score: st.score, best: bestTile(st)
    };
  }

  function bestTile(st) {
    let b = 0;
    st.board.forEach(v => { if (v > b) b = v; });
    return b;
  }

  function hasMoves(st) {
    const n = st.n;
    if (emptyCells(st).length) return true;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = st.board[r * n + c];
        if (c + 1 < n && st.board[r * n + c + 1] === v) return true;
        if (r + 1 < n && st.board[(r + 1) * n + c] === v) return true;
      }
    }
    return false;
  }

  /* Points scale with how far the board got: reaching the goal pays the full
     base, a half-way board still pays half. Nothing is ever taken away. */
  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const best = Math.max(st.best, bestTile(st));
    const won = st.status === 'won' || best >= st.goal;
    const share = Math.max(0, Math.min(1, best / st.goal));
    const clearBonus = won ? CLEAR_BONUS : 0;
    return {
      level: st.level, label: st.label, n: st.n, goal: st.goal,
      solved: won, seconds: seconds, moves: st.moves, merges: st.merges,
      score: st.score, best: best, base: cfg.base, clearBonus: clearBonus,
      points: Math.max(0, Math.min(MAX_POINTS,
        Math.round(st.base * share) + clearBonus))
    };
  }

  return {
    DIRS: DIRS, LEVELS: LEVELS, cfgOf: cfgOf, MAX_POINTS: MAX_POINTS,
    start: start, move: move, spawn: spawn, emptyCells: emptyCells,
    bestTile: bestTile, hasMoves: hasMoves, finish: finish
  };
})();
