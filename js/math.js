/* ============================================================
   WordBubbles — Math Duel engine.

   Two players are dealt cards. A card is a number plus one of the
   four operations. Players take turns playing a card onto the big
   centre number. A single-digit counter at the top counts down the
   turns until the next settlement; when it reaches zero the centre
   value (rounded to an integer) is added to Player 1 if it is odd,
   or to Player 2 if it is even. Then the centre is re-rolled.

   Counters are generated so their sum is EXACTLY the total number
   of turns, so the match always ends on a settlement.
   ============================================================ */
const MathGame = (() => {

  const ALL_OPS = ['+', '-', '×', '÷'];

  const DIFF = {
    easy: { cards: 6, min: 2, max: 9, ops: ALL_OPS, label: 'Easy',
      desc: '6 cards each — all four operations, small numbers.' },
    medium: { cards: 7, min: 3, max: 12, ops: ALL_OPS, label: 'Medium',
      desc: '7 cards each — all four operations, medium numbers.' },
    hard: { cards: 8, min: 4, max: 15, ops: ALL_OPS, label: 'Hard',
      desc: '8 cards each — all four operations, bigger numbers.' }
  };

  /* Every settlement block lasts between these many turns. */
  const BLOCK_MIN = 3;
  const BLOCK_MAX = 5;

  /* Range the centre number is re-rolled from. */
  const CENTRE_MIN = 10;
  const CENTRE_MAX = 89;

  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let seq = 0;

  function newCard(cfg) {
    const op = cfg.ops[randInt(0, cfg.ops.length - 1)];
    return { id: 'k' + (++seq), op: op, n: randInt(cfg.min, cfg.max) };
  }

  function newCentre() { return randInt(CENTRE_MIN, CENTRE_MAX); }

  /* Split `total` into blocks of BLOCK_MIN..BLOCK_MAX turns whose sum is
     exactly `total` (guaranteed possible for any total >= BLOCK_MIN). */
  function buildCounters(total) {
    const minParts = Math.max(1, Math.ceil(total / BLOCK_MAX));
    const maxParts = Math.max(minParts, Math.floor(total / BLOCK_MIN));
    const n = randInt(minParts, maxParts);

    const parts = new Array(n).fill(BLOCK_MIN);
    let extra = total - BLOCK_MIN * n;
    let guard = 0;
    while (extra > 0 && guard++ < 5000) {
      const i = randInt(0, n - 1);
      if (parts[i] < BLOCK_MAX) { parts[i] += 1; extra -= 1; }
    }

    for (let i = parts.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      const t = parts[i]; parts[i] = parts[j]; parts[j] = t;
    }
    return parts;
  }

  function apply(center, card) {
    switch (card.op) {
      case '+': return center + card.n;
      case '-': return center - card.n;
      case '×': return center * card.n;
      case '÷': return card.n ? center / card.n : center;
    }
    return center;
  }

  /* Pretty number: integers plain, fractions rounded to 2 decimals. */
  function fmt(v) {
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 100) / 100);
  }

  /* Standard 四舍五入: half rounds away from zero (-2.5 -> -3). */
  function roundHalfAway(v) { return v < 0 ? -Math.round(-v) : Math.round(v); }

  /* Which player would collect this value right now. */
  function ownerOf(v) { return Math.abs(v) % 2 === 1 ? 0 : 1; }

  function start(difficulty, players) {
    const cfg = DIFF[difficulty] || DIFF.medium;
    const total = cfg.cards * 2;
    const counters = buildCounters(total);
    return {
      difficulty: difficulty,
      cfg: cfg,
      players: players.slice(0, 2),
      hands: [
        Array.from({ length: cfg.cards }, () => newCard(cfg)),
        Array.from({ length: cfg.cards }, () => newCard(cfg))
      ],
      scores: [0, 0],
      center: newCentre(),
      counters: counters,
      blockIndex: 0,
      turnsLeft: counters[0],
      turn: 0,
      totalTurns: total,
      active: 0,
      settlements: [],
      startedAt: Date.now(),
      elapsedMs: 0,
      done: false
    };
  }

  /* Play one card. Returns a description of what happened, or null if the
     move is not legal (wrong player / already played / match over). */
  function playCard(state, playerIdx, cardId) {
    if (state.done || playerIdx !== state.active) return null;
    const hand = state.hands[playerIdx];
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx < 0) return null;

    const card = hand.splice(idx, 1)[0];
    const before = state.center;
    const raw = apply(before, card);
    const fraction = !Number.isInteger(raw);
    state.center = roundHalfAway(raw);   // every step lands on an integer
    state.turn += 1;
    state.turnsLeft -= 1;

    const out = {
      player: playerIdx, card: card,
      before: before,
      raw: raw,                 // pre-rounding value (for the animation)
      fraction: fraction,       // true when a rounding animation is due
      after: state.center,
      settlement: null, done: false
    };

    if (state.turnsLeft <= 0) {
      const value = state.center;
      const winner = ownerOf(value);
      state.scores[winner] += value;
      out.settlement = { value: value, winner: winner, center: state.center };
      state.settlements.push({ turn: state.turn, value: value, winner: winner });

      if (state.turn >= state.totalTurns) {
        state.done = true;
        out.done = true;
      } else {
        state.blockIndex += 1;
        state.turnsLeft = state.counters[state.blockIndex];
        state.center = newCentre();
      }
    }

    state.active = state.turn % 2;
    return out;
  }

  function finish(state) {
    if (!state.elapsedMs) state.elapsedMs = Date.now() - state.startedAt;
    const s = state.scores;
    return {
      scores: s.slice(),
      winner: s[0] > s[1] ? 0 : (s[1] > s[0] ? 1 : -1),
      seconds: Math.max(1, Math.round(state.elapsedMs / 1000)),
      settlements: state.settlements.length,
      turns: state.totalTurns,
      difficulty: state.difficulty
    };
  }

  return { DIFF: DIFF, start: start, playCard: playCard, finish: finish, fmt: fmt, ownerOf: ownerOf, roundHalfAway: roundHalfAway };
})();
