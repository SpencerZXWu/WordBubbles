/* ============================================================
   WordBubbles — Chess engine.

   Full movement for all six pieces, captures, check / checkmate /
   stalemate, castling, en passant and promotion. Board is a flat
   64 array, index 0 = a8 ... 63 = h1. White starts at rows 6-7 and
   moves toward row 0.

   A move object looks like:
     { from, to, piece, captured, capturedAt, promotion, castle, double }
   ============================================================ */
const Chess = (() => {
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const NAME = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

  const KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const PROMOS = ['q', 'r', 'b', 'n'];

  const rowOf = i => (i / 8) | 0;
  const colOf = i => i % 8;
  const at = (r, c) => r * 8 + c;
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const sideOf = p => (p ? p[0] : null);
  const typeOf = p => (p ? p[1] : null);
  const other = s => (s === 'w' ? 'b' : 'w');

  function start() {
    const board = new Array(64).fill(null);
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      board[at(0, c)] = 'b' + back[c];
      board[at(1, c)] = 'bp';
      board[at(6, c)] = 'wp';
      board[at(7, c)] = 'w' + back[c];
    }
    return {
      board: board,
      turn: 'w',
      castling: { wk: true, wq: true, bk: true, bq: true },
      ep: null,
      halfmove: 0,
      fullmove: 1,
      captured: { w: [], b: [] },
      last: null,
      status: 'playing',
      winner: null,
      startedAt: Date.now(),
      elapsedMs: 0
    };
  }

  function findKing(b, side) {
    const want = side + 'k';
    for (let i = 0; i < 64; i++) if (b[i] === want) return i;
    return -1;
  }

  /* Is `sq` attacked by any piece of colour `by`? */
  function attacked(b, sq, by) {
    if (sq < 0) return false;
    const r0 = rowOf(sq), c0 = colOf(sq);

    const pd = by === 'w' ? 1 : -1;                 // look "behind" the target
    for (const dc of [-1, 1]) {
      const r = r0 + pd, c = c0 + dc;
      if (on(r, c) && b[at(r, c)] === by + 'p') return true;
    }
    for (const [dr, dc] of KNIGHT_D) {
      const r = r0 + dr, c = c0 + dc;
      if (on(r, c) && b[at(r, c)] === by + 'n') return true;
    }
    for (const [dr, dc] of KING_D) {
      const r = r0 + dr, c = c0 + dc;
      if (on(r, c) && b[at(r, c)] === by + 'k') return true;
    }
    const slide = (dirs, types) => {
      for (const [dr, dc] of dirs) {
        let r = r0 + dr, c = c0 + dc;
        while (on(r, c)) {
          const p = b[at(r, c)];
          if (p) {
            if (p[0] === by && types.indexOf(p[1]) >= 0) return true;
            break;
          }
          r += dr; c += dc;
        }
      }
      return false;
    };
    if (slide(ROOK_D, 'rq')) return true;
    if (slide(BISHOP_D, 'bq')) return true;
    return false;
  }

  /* Moves that ignore king safety. */
  function pseudoMoves(state, from) {
    const b = state.board, piece = b[from];
    if (!piece) return [];
    const side = sideOf(piece), type = typeOf(piece);
    const r0 = rowOf(from), c0 = colOf(from);
    const out = [];

    if (type === 'p') {
      const dir = side === 'w' ? -1 : 1;
      const startRow = side === 'w' ? 6 : 1;
      const promoRow = side === 'w' ? 0 : 7;
      const r1 = r0 + dir;
      if (on(r1, c0) && !b[at(r1, c0)]) {
        if (r1 === promoRow) {
          PROMOS.forEach(pr => out.push({ from: from, to: at(r1, c0), piece: piece, captured: null, promotion: pr }));
        } else {
          out.push({ from: from, to: at(r1, c0), piece: piece, captured: null });
          if (r0 === startRow) {
            const r2 = r0 + dir * 2;
            if (!b[at(r2, c0)]) out.push({ from: from, to: at(r2, c0), piece: piece, captured: null, double: true });
          }
        }
      }
      for (const dc of [-1, 1]) {
        const r = r0 + dir, c = c0 + dc;
        if (!on(r, c)) continue;
        const t = b[at(r, c)];
        if (t && t[0] !== side) {
          if (r === promoRow) {
            PROMOS.forEach(pr => out.push({ from: from, to: at(r, c), piece: piece, captured: t, promotion: pr }));
          } else {
            out.push({ from: from, to: at(r, c), piece: piece, captured: t });
          }
        } else if (!t && state.ep === at(r, c)) {
          out.push({ from: from, to: at(r, c), piece: piece, captured: other(side) + 'p', capturedAt: at(r0, c), ep: true });
        }
      }
    } else if (type === 'n' || type === 'k') {
      const dirs = type === 'n' ? KNIGHT_D : KING_D;
      for (const [dr, dc] of dirs) {
        const r = r0 + dr, c = c0 + dc;
        if (!on(r, c)) continue;
        const t = b[at(r, c)];
        if (t && t[0] === side) continue;
        out.push({ from: from, to: at(r, c), piece: piece, captured: t || null });
      }
      if (type === 'k') {
        const back = side === 'w' ? 7 : 0;
        const kR = side === 'w' ? state.castling.wk : state.castling.bk;
        const qR = side === 'w' ? state.castling.wq : state.castling.bq;
        if (kR && !b[at(back, 5)] && !b[at(back, 6)] && b[at(back, 7)] === side + 'r') {
          out.push({ from: from, to: at(back, 6), piece: piece, captured: null, castle: 'k' });
        }
        if (qR && !b[at(back, 3)] && !b[at(back, 2)] && !b[at(back, 1)] && b[at(back, 0)] === side + 'r') {
          out.push({ from: from, to: at(back, 2), piece: piece, captured: null, castle: 'q' });
        }
      }
    } else {
      const dirs = type === 'r' ? ROOK_D : type === 'b' ? BISHOP_D : ROOK_D.concat(BISHOP_D);
      for (const [dr, dc] of dirs) {
        let r = r0 + dr, c = c0 + dc;
        while (on(r, c)) {
          const t = b[at(r, c)];
          if (t && t[0] === side) break;
          out.push({ from: from, to: at(r, c), piece: piece, captured: t || null });
          if (t) break;
          r += dr; c += dc;
        }
      }
    }
    return out;
  }

  /* Copy the board and play a move onto it (used for legality tests). */
  function withMove(b, m, piece) {
    const nb = b.slice();
    const side = sideOf(piece);
    nb[m.from] = null;
    if (m.capturedAt != null) nb[m.capturedAt] = null;
    nb[m.to] = m.promotion ? side + m.promotion : piece;
    if (m.castle) {
      const back = side === 'w' ? 7 : 0;
      const rf = at(back, m.castle === 'k' ? 7 : 0);
      const rt = at(back, m.castle === 'k' ? 5 : 3);
      nb[rt] = nb[rf];
      nb[rf] = null;
    }
    return nb;
  }

  function legalMoves(state, from) {
    const piece = state.board[from];
    if (!piece) return [];
    const side = sideOf(piece), opp = other(side);
    return pseudoMoves(state, from).filter(m => {
      if (m.castle) {
        const back = side === 'w' ? 7 : 0;
        const mid = m.castle === 'k' ? at(back, 5) : at(back, 3);
        if (attacked(state.board, from, opp)) return false;
        if (attacked(state.board, mid, opp)) return false;
      }
      const nb = withMove(state.board, m, piece);
      return !attacked(nb, findKing(nb, side), opp);
    });
  }

  function allLegalMoves(state, color) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      const p = state.board[i];
      if (p && p[0] === color) out.push.apply(out, legalMoves(state, i));
    }
    return out;
  }

  function inCheck(state, color) {
    return attacked(state.board, findKing(state.board, color), other(color));
  }

  /* Play a move for real. Mutates and returns the state. */
  function applyMove(state, m) {
    const b = state.board;
    const side = sideOf(m.piece);
    const opp = other(side);
    const type = typeOf(m.piece);

    b[m.from] = null;
    if (m.capturedAt != null) b[m.capturedAt] = null;
    b[m.to] = m.promotion ? side + m.promotion : m.piece;

    if (m.castle) {
      const back = side === 'w' ? 7 : 0;
      const rf = at(back, m.castle === 'k' ? 7 : 0);
      const rt = at(back, m.castle === 'k' ? 5 : 3);
      b[rt] = b[rf];
      b[rf] = null;
    }

    if (m.captured) state.captured[side].push(m.captured);

    if (type === 'k') {
      if (side === 'w') { state.castling.wk = false; state.castling.wq = false; }
      else { state.castling.bk = false; state.castling.bq = false; }
    }
    const corner = (sq, key) => { if (m.from === sq || m.to === sq) state.castling[key] = false; };
    corner(at(7, 0), 'wq'); corner(at(7, 7), 'wk');
    corner(at(0, 0), 'bq'); corner(at(0, 7), 'bk');

    state.ep = m.double ? (m.from + m.to) / 2 : null;
    state.halfmove = (m.captured || type === 'p') ? 0 : state.halfmove + 1;
    if (side === 'b') state.fullmove += 1;
    state.turn = opp;
    state.last = { from: m.from, to: m.to };

    const chk = inCheck(state, opp);
    const canMove = allLegalMoves(state, opp).length > 0;
    if (!canMove) {
      state.status = chk ? 'checkmate' : 'stalemate';
      state.winner = chk ? side : null;
    } else {
      state.status = chk ? 'check' : 'playing';
      state.winner = null;
    }
    return state;
  }

  /* Material captured BY `side`, in pawn units. */
  function material(state, side) {
    return state.captured[side].reduce((sum, p) => sum + (VALUE[typeOf(p)] || 0), 0);
  }

  /* Score for `side`: material balance plus a result bonus, kept inside
     the same -100 .. +300 band the maths duel uses. */
  function score(state, side) {
    const diff = material(state, side) - material(state, other(side));
    let result = 0;
    if (state.status === 'checkmate') result = state.winner === side ? 1 : -1;
    const points = Math.min(300, Math.max(-100, Math.round(diff * 25 + result * 120)));
    return { diff: diff, result: result, points: points, material: material(state, side), conceded: material(state, other(side)) };
  }

  function finish(state) {
    if (!state.elapsedMs) state.elapsedMs = Date.now() - state.startedAt;
    return {
      status: state.status,
      winner: state.winner,
      seconds: Math.max(1, Math.round(state.elapsedMs / 1000)),
      moves: state.fullmove - 1,
      scores: { w: score(state, 'w'), b: score(state, 'b') }
    };
  }

  return {
    GLYPH: GLYPH, VALUE: VALUE, NAME: NAME,
    start: start, legalMoves: legalMoves, allLegalMoves: allLegalMoves,
    applyMove: applyMove, inCheck: inCheck, material: material,
    score: score, finish: finish, findKing: findKing
  };
})();
