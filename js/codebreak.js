/* ============================================================
   Code Break — guess the hidden number (bulls and cows / Mastermind).

   Every guess is answered with two counts:
     bulls — right digit in the right place
     cows  — right digit in the wrong place
   Crack the whole code before you run out of guesses.
   ============================================================ */
const CodeBreak = (() => {
  /* `alphabet` is how many digits are in play (0 .. alphabet-1). A small
     alphabet with repeats is a nicer kind of hard than a huge search space:
     the guesses stay deducible instead of turning into a lucky dip. */
  const LEVELS = [
    { key: 'easy', label: '3 digits', len: 3, repeats: false, alphabet: 10, tries: 8, base: 90, par: 75,
      desc: 'Three digits, no digit repeated. Eight guesses.' },
    { key: 'medium', label: '4 digits', len: 4, repeats: false, alphabet: 10, tries: 8, base: 130, par: 120,
      desc: 'Four digits, no digit repeated. Eight guesses.' },
    { key: 'hard', label: '4 digits, repeats', len: 4, repeats: true, alphabet: 6, tries: 8, base: 170, par: 150,
      desc: 'Four digits from 0-5, and a digit may repeat. Eight guesses.' }
  ];

  const MIN_SPEED = 0.5, MAX_SPEED = 1.6, MAX_POINTS = 300, SPARE_BONUS = 15;

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];

  function makeSecret(cfg) {
    const pool = [];
    for (let d = 0; d < cfg.alphabet; d++) pool.push(d);
    const out = [];
    if (cfg.repeats) {
      for (let i = 0; i < cfg.len; i++) out.push((Math.random() * cfg.alphabet) | 0);
    } else {
      for (let i = 0; i < cfg.len; i++) {
        const at = (Math.random() * pool.length) | 0;
        out.push(pool[at]);
        pool.splice(at, 1);
      }
    }
    return out;
  }

  function start(level) {
    const cfg = cfgOf(level);
    return {
      level: cfg.key, label: cfg.label, len: cfg.len, repeats: cfg.repeats,
      alphabet: cfg.alphabet, maxTries: cfg.tries, base: cfg.base, par: cfg.par,
      secret: makeSecret(cfg),
      rows: [],                       // { guess: [..], bulls, cows }
      entry: new Array(cfg.len).fill(-1),
      cursor: 0,
      status: 'playing',
      startedAt: Date.now(), elapsedMs: 0
    };
  }

  /* Right digit right place, and right digit wrong place (counting each digit
     only as often as the code itself holds it). */
  function judge(secret, guess) {
    let bulls = 0;
    const leftSecret = [], leftGuess = [];
    for (let i = 0; i < secret.length; i++) {
      if (secret[i] === guess[i]) bulls++;
      else { leftSecret.push(secret[i]); leftGuess.push(guess[i]); }
    }
    let cows = 0;
    const used = new Array(10).fill(0);
    leftSecret.forEach(d => { used[d]++; });
    leftGuess.forEach(d => { if (used[d] > 0) { used[d]--; cows++; } });
    return { bulls: bulls, cows: cows };
  }

  const filled = st => st.entry.indexOf(-1) < 0;
  const triesLeft = st => st.maxTries - st.rows.length;

  function typeDigit(st, d) {
    if (st.status !== 'playing') return false;
    if (d < 0 || d >= st.alphabet) return false;
    if (st.cursor >= st.len) return false;
    if (!st.repeats && st.entry.indexOf(d) >= 0) return false;
    st.entry[st.cursor] = d;
    st.cursor = Math.min(st.len, st.cursor + 1);
    return true;
  }

  function backspace(st) {
    if (st.status !== 'playing') return false;
    if (st.cursor > 0 && st.entry[st.cursor - 1] >= 0) {
      st.entry[st.cursor - 1] = -1;
      st.cursor--;
      return true;
    }
    if (st.cursor > 0) { st.cursor--; st.entry[st.cursor] = -1; return true; }
    return false;
  }

  function clearEntry(st) {
    if (st.status !== 'playing') return false;
    st.entry = st.entry.map(() => -1);
    st.cursor = 0;
    return true;
  }

  /* Submit what has been typed. Returns the finished row, or a reason not to. */
  function submit(st) {
    if (st.status !== 'playing') return { ok: false, why: 'over' };
    if (!filled(st)) return { ok: false, why: 'short' };
    const guess = st.entry.slice();
    const j = judge(st.secret, guess);
    const row = { guess: guess, bulls: j.bulls, cows: j.cows };
    st.rows.push(row);
    st.entry = st.entry.map(() => -1);
    st.cursor = 0;
    if (j.bulls === st.len) st.status = 'solved';
    else if (st.rows.length >= st.maxTries) st.status = 'lost';
    return { ok: true, row: row, solved: st.status === 'solved', lost: st.status === 'lost' };
  }

  /* Which digits are knocked out by the guesses so far — shown as a keypad hint. */
  function ruledOut(st) {
    const gone = new Array(st.alphabet).fill(false);
    if (st.repeats) return gone;
    st.rows.forEach(r => {
      if (r.bulls === 0 && r.cows === 0) r.guess.forEach(d => { gone[d] = true; });
    });
    return gone;
  }

  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const won = st.status === 'solved';
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, cfg.par / seconds));
    const spare = won ? Math.max(0, st.maxTries - st.rows.length) * SPARE_BONUS : 0;
    return {
      level: st.level, label: st.label, len: st.len, repeats: st.repeats,
      solved: won, seconds: seconds, speed: speed, par: cfg.par, base: cfg.base,
      guesses: st.rows.length, maxTries: st.maxTries, spareBonus: spare,
      secret: st.secret.slice(), rows: st.rows.slice(),
      points: won ? Math.max(0, Math.min(MAX_POINTS, Math.round(cfg.base * speed) + spare)) : 0
    };
  }

  return {
    LEVELS: LEVELS, cfgOf: cfgOf, MAX_POINTS: MAX_POINTS,
    start: start, judge: judge, typeDigit: typeDigit, backspace: backspace,
    clearEntry: clearEntry, submit: submit, filled: filled, triesLeft: triesLeft,
    ruledOut: ruledOut, finish: finish
  };
})();
