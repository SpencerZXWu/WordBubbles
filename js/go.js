/* ============================================================
   WordBubbles — Go engine.

   Stones sit on the INTERSECTIONS of an n x n grid, black plays first.
   Implemented: liberties, captures, suicide prevention, simple ko (no move
   may recreate the position that existed before the opponent's last move),
   passes, two passes ending the game, resignation and Chinese AREA scoring
   (your stones + the empty points you surround) with komi for white.

   Board is a flat array, index 0 = top-left ... n*n-1 = bottom-right.

   Note on dead stones: any stone still on the board when the game ends is
   counted as alive, so on a small board you should capture what you can
   before passing. This is the usual casual-play convention.
   ============================================================ */
const Go = (() => {
  const SIZES = [9, 13, 19];
  const DEFAULT_SIZE = 9;
  const KOMI = 6.5;

  function start(size) {
    const n = (size >= 5 && size <= 25) ? size : DEFAULT_SIZE;
    return {
      size: n,
      board: new Array(n * n).fill(null),
      turn: 'b',
      captures: { b: 0, w: 0 },
      last: null,
      passes: 0,
      moveNo: 0,
      prev: null,               // board as it was before the previous move (ko)
      status: 'playing',        // 'playing' | 'ended'
      result: null,
      startedAt: Date.now(),
      elapsedMs: 0
    };
  }

  function neighbours(n, i) {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  /* The connected block of same-coloured stones through `i`, with its liberties. */
  function groupOf(board, n, i) {
    const color = board[i];
    const stones = [], libs = [], seen = new Set([i]), stack = [i];
    while (stack.length) {
      const j = stack.pop();
      stones.push(j);
      for (const k of neighbours(n, j)) {
        if (!board[k]) { if (libs.indexOf(k) < 0) libs.push(k); }
        else if (board[k] === color && !seen.has(k)) { seen.add(k); stack.push(k); }
      }
    }
    return { stones: stones, libs: libs };
  }

  const key = board => board.join('|');

  /* Work out what playing at `i` would do WITHOUT changing anything.
     Returns { reason } when the move is illegal, otherwise the new board. */
  function evaluate(state, i) {
    const n = state.size, board = state.board;
    if (i < 0 || i >= board.length || board[i]) return { reason: 'occupied' };
    const color = state.turn, opp = color === 'b' ? 'w' : 'b';
    const next = board.slice();
    next[i] = color;

    const taken = [];
    for (const j of neighbours(n, i)) {
      if (next[j] === opp) {
        const g = groupOf(next, n, j);
        if (!g.libs.length) {
          for (const k of g.stones) { if (next[k]) { next[k] = null; taken.push(k); } }
        }
      }
    }
    // a stone may not be played with no liberties unless it captures
    if (!taken.length && !groupOf(next, n, i).libs.length) return { reason: 'suicide' };
    // simple ko: the result may not be the position from before the opponent's move
    if (state.prev !== null && key(next) === state.prev) return { reason: 'ko' };
    return { reason: null, next: next, taken: taken, color: color, opp: opp };
  }

  function place(state, i) {
    if (!state || state.status !== 'playing') return null;
    const e = evaluate(state, i);
    if (e.reason) return null;

    const before = key(state.board);
    state.board = e.next;
    state.captures[e.color] += e.taken.length;
    state.prev = before;
    state.last = i;
    state.passes = 0;
    state.moveNo++;
    state.turn = e.opp;
    return { at: i, color: e.color, taken: e.taken };
  }

  /* Why a point cannot be played: 'occupied' | 'suicide' | 'ko' | 'over'.
     null means the move is legal. Used for the rejection feedback. */
  function whyNot(state, i) {
    if (!state || state.status !== 'playing') return 'over';
    return evaluate(state, i).reason;
  }

  function pass(state) {
    if (!state || state.status !== 'playing') return null;
    state.passes++;
    state.last = null;
    state.prev = null;           // a pass lifts the ko ban
    state.moveNo++;
    state.turn = state.turn === 'b' ? 'w' : 'b';
    if (state.passes >= 2) {
      end(state);
      return { pass: true, ended: true };
    }
    return { pass: true, ended: false };
  }

  /* Empty points grouped by owner: 'b' / 'w' when the region touches only that
     colour, 'dame' when it touches both (or nothing). */
  function territory(state) {
    const n = state.size, b = state.board;
    const seen = new Array(b.length).fill(false);
    const out = { b: [], w: [], dame: [] };
    for (let i = 0; i < b.length; i++) {
      if (b[i] || seen[i]) continue;
      const region = [], border = new Set(), stack = [i];
      seen[i] = true;
      while (stack.length) {
        const j = stack.pop();
        region.push(j);
        for (const k of neighbours(n, j)) {
          if (b[k]) border.add(b[k]);
          else if (!seen[k]) { seen[k] = true; stack.push(k); }
        }
      }
      const owner = border.size === 1 ? Array.from(border)[0] : 'dame';
      const bucket = owner === 'b' ? out.b : (owner === 'w' ? out.w : out.dame);
      for (const pt of region) bucket.push(pt);
    }
    return out;
  }

  /* Chinese area scoring: stones plus the empty points that touch only one colour. */
  function area(state) {
    const b = state.board;
    let black = 0, white = 0;
    for (let i = 0; i < b.length; i++) {
      if (b[i] === 'b') black++;
      else if (b[i] === 'w') white++;
    }
    const t = territory(state);
    return { black: black + t.b.length, white: white + t.w.length, dame: t.dame.length };
  }

  function end(state) {
    if (state.status !== 'playing') return state.result;
    const a = area(state);
    const black = a.black, white = a.white + KOMI;
    state.status = 'ended';
    state.result = {
      black: black, white: white, komi: KOMI, dame: a.dame,
      winner: black > white ? 'b' : 'w',
      margin: Math.abs(black - white),
      resign: false
    };
    return state.result;
  }

  function resign(state, color) {
    if (state.status !== 'playing') return state.result;
    const a = area(state);
    state.status = 'ended';
    state.result = {
      black: a.black, white: a.white + KOMI, komi: KOMI, dame: a.dame,
      winner: color === 'b' ? 'w' : 'b',
      margin: 0,
      resign: true
    };
    return state.result;
  }

  /* Win / loss, scaled by the size of the win so narrow results stay close. */
  function score(state, color) {
    const r = state.result;
    const mine = r ? (color === 'b' ? r.black : r.white) : 0;
    const theirs = r ? (color === 'b' ? r.white : r.black) : 0;
    let points = 0;
    if (r) {
      if (r.resign) points = r.winner === color ? 200 : -100;
      else {
        const diff = mine - theirs;
        points = Math.min(300, Math.max(-100,
          Math.round(diff * 6 + (r.winner === color ? 70 : -70))));
      }
    }
    return {
      points: points,
      area: mine,
      conceded: theirs,
      captures: state.captures[color]
    };
  }

  function finish(state) {
    if (!state.elapsedMs) state.elapsedMs = Date.now() - state.startedAt;
    return {
      status: state.status,
      result: state.result,
      seconds: Math.max(1, Math.round(state.elapsedMs / 1000)),
      moves: state.moveNo,
      scores: { b: score(state, 'b'), w: score(state, 'w') }
    };
  }

  return {
    SIZES: SIZES, DEFAULT_SIZE: DEFAULT_SIZE, KOMI: KOMI,
    start: start, place: place, pass: pass, end: end, resign: resign,
    area: area, territory: territory, whyNot: whyNot,
    groupOf: groupOf, neighbours: neighbours,
    score: score, finish: finish
  };
})();
