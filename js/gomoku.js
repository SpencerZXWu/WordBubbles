/* ============================================================
   WordBubbles — Gomoku (five in a row) engine.

   Stones go on the INTERSECTIONS of an n x n grid, black plays first, and
   whoever lines up five (or more) in a row wins. Plain free-style gomoku:
   no opening rules, no forbidden moves, no Renju restrictions.

   Board is a flat array, index 0 = top-left ... n*n-1 = bottom-right.
   A point is null while empty, otherwise 'b' / 'w'.
   ============================================================ */
const Gomoku = (() => {
  const SIZES = [13, 15, 19];
  const DEFAULT_SIZE = 15;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  function start(size) {
    const n = (size >= 5 && size <= 25) ? size : DEFAULT_SIZE;
    return {
      size: n,
      board: new Array(n * n).fill(null),
      turn: 'b',
      moveNo: 0,
      last: null,
      winLine: null,
      status: 'playing',        // 'playing' | 'win' | 'draw'
      winner: null,
      startedAt: Date.now(),
      elapsedMs: 0
    };
  }

  /* The full run of same-coloured stones through `i` in each of the four
     directions; returns the first run that reaches five. */
  function lineAt(state, i) {
    const n = state.size, b = state.board, color = b[i];
    if (!color) return null;
    const r0 = (i / n) | 0, c0 = i % n;
    for (let d = 0; d < DIRS.length; d++) {
      const dr = DIRS[d][0], dc = DIRS[d][1];
      const run = [i];
      for (const step of [1, -1]) {
        let r = r0 + dr * step, c = c0 + dc * step;
        while (r >= 0 && r < n && c >= 0 && c < n && b[r * n + c] === color) {
          run.push(r * n + c);
          r += dr * step;
          c += dc * step;
        }
      }
      if (run.length >= 5) return run;
    }
    return null;
  }

  function place(state, i) {
    if (!state || state.status !== 'playing') return null;
    if (i < 0 || i >= state.board.length || state.board[i]) return null;

    const color = state.turn;
    state.board[i] = color;
    state.moveNo++;
    state.last = i;
    state.turn = color === 'b' ? 'w' : 'b';

    const line = lineAt(state, i);
    if (line) {
      state.winLine = line;
      state.status = 'win';
      state.winner = color;
    } else if (state.moveNo >= state.size * state.size) {
      state.status = 'draw';
    }
    return { at: i, color: color, win: !!line };
  }

  /* Why a point cannot be played: 'occupied' | 'over'. null means it is legal. */
  function whyNot(state, i) {
    if (!state || state.status !== 'playing') return 'over';
    if (i < 0 || i >= state.board.length) return 'off';
    return state.board[i] ? 'occupied' : null;
  }

  function stonesOf(state, color) {
    let k = 0;
    for (let i = 0; i < state.board.length; i++) if (state.board[i] === color) k++;
    return k;
  }

  /* Win / loss / draw plus a small bonus for winning with fewer stones.
     Kept inside the same -100 .. +300 band every other mode uses. */
  function score(state, color) {
    const result = state.status === 'win' ? (state.winner === color ? 1 : -1) : 0;
    const stones = stonesOf(state, color);
    const bonus = result === 1 ? Math.max(0, 45 - stones) : 0;
    return {
      result: result,
      points: Math.min(300, Math.max(-100, Math.round(result * 110 + bonus))),
      stones: stones,
      conceded: stonesOf(state, color === 'b' ? 'w' : 'b'),
      line: state.winLine ? state.winLine.length : 0
    };
  }

  function finish(state) {
    if (!state.elapsedMs) state.elapsedMs = Date.now() - state.startedAt;
    return {
      status: state.status,
      winner: state.winner,
      seconds: Math.max(1, Math.round(state.elapsedMs / 1000)),
      moves: state.moveNo,
      scores: { b: score(state, 'b'), w: score(state, 'w') }
    };
  }

  return {
    SIZES: SIZES, DEFAULT_SIZE: DEFAULT_SIZE,
    start: start, place: place, lineAt: lineAt,
    stonesOf: stonesOf, whyNot: whyNot, score: score, finish: finish
  };
})();
