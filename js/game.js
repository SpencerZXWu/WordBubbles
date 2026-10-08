/* ============================================================
   WordBubbles — game engine (tokenising, blanking, scoring,
   Super Mind hint generation)
   ============================================================ */
const Game = (() => {

  /* Words we never blank out — too easy / no meaning to guess. */
  const STOPWORDS = new Set((
    'the and for his her you she are but not with they this that from have has had were will would ' +
    'there their what when then them than its our out who why how all any can may into over just ' +
    'your been some very much many more most only also such too did does done doing being each other ' +
    'after before again once here where while both few own same now about above below under between ' +
    'during against because until upon onto off away back down further then once am is was be to of ' +
    'in on at by as it he we us my me i do so if or no up'
  ).split(/\s+/).filter(Boolean));

  /* ---------- word bank, grouped by length (lazy) ---------- */
  let bankByLen = null;
  function bank(n) {
    if (!bankByLen) {
      bankByLen = {};
      WORDBANK.forEach(w => {
        const k = w.length;
        (bankByLen[k] = bankByLen[k] || []).push(w);
      });
    }
    return bankByLen[n] || [];
  }

  /* ---------- helpers ---------- */
  function tokenize(text) { return text.match(/[A-Za-z]+|\s+|[^A-Za-z\s]+/g) || []; }
  function isWord(tok) { return /^[A-Za-z]+$/.test(tok); }
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  /* Small deterministic RNG (mulberry32) so a blank always looks the same. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- passage & blank selection ---------- */
  function poolFor(difficulty) {
    if (typeof PASSAGE_POOLS !== 'undefined' && PASSAGE_POOLS[difficulty]) return PASSAGE_POOLS[difficulty];
    return typeof PASSAGES !== 'undefined' ? PASSAGES : [];
  }

  function pickPassage(difficulty, excludeId) {
    const pool = poolFor(difficulty);
    let list = pool;
    if (pool.length > 1 && excludeId) {
      const rest = pool.filter(p => p.id !== excludeId);
      if (rest.length) list = rest;
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  /* A word that is capitalised somewhere in the middle of a sentence is a
     proper noun. Remember all of them so a name at the START of a sentence
     is never blanked either (otherwise "Tom has a red ball" could hide Tom). */
  let properNouns = null;
  function getProperNouns() {
    if (properNouns) return properNouns;
    properNouns = new Set();
    poolFor('primary').concat(poolFor('easy'), poolFor('medium'), poolFor('hard')).forEach(p => {
      let start = true;
      tokenize(p.text).forEach(tok => {
        if (/^\s+$/.test(tok)) return;
        if (isWord(tok)) {
          if (/^[A-Z]/.test(tok) && !start) properNouns.add(tok.toLowerCase());
          start = false;
        } else if (/[.!?]/.test(tok)) {
          start = true;
        }
      });
    });
    /* Names that only ever appear at the start of a sentence cannot be
       detected above, so list them explicitly. */
    ['tom', 'sara', 'amelia', 'daniel', 'lily', 'max', 'ben', 'anna', 'peter',
      'chen', 'patel', 'ali', 'lee', 'snow', 'lucky', 'elias', 'maria', 'david',
      'mimi', 'leo', 'mara', 'mrs', 'mr', 'miss'].forEach(n => properNouns.add(n));
    return properNouns;
  }

  function eligibleIndices(tokens, minLen) {
    const names = getProperNouns();
    const out = [];
    let sentenceStart = true;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (/^\s+$/.test(tok)) continue;
      if (isWord(tok)) {
        const lower = tok.toLowerCase();
        const proper = names.has(lower) || (/^[A-Z]/.test(tok) && !sentenceStart);
        if (tok.length >= minLen && !STOPWORDS.has(lower) && !proper) out.push(i);
        sentenceStart = false;
      } else if (/[.!?]/.test(tok)) {
        sentenceStart = true;
      }
    }
    return out;
  }

  function chooseBlanks(tokens, difficulty, seedStr) {
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
    const elig = eligibleIndices(tokens, cfg.minLen);
    const blanks = new Set();
    if (!elig.length) return blanks;
    const offset = hash(seedStr) % cfg.step;
    for (let k = offset; k < elig.length; k += cfg.step) blanks.add(elig[k]);
    return blanks;
  }

  function estimateBlanks(passage, difficulty) {
    return chooseBlanks(tokenize(passage.text), difficulty, passage.id).size;
  }

  /* Average blanks across a whole difficulty pool — used by the UI. */
  function averageBlanks(difficulty) {
    const pool = poolFor(difficulty);
    if (!pool.length) return 0;
    const counts = pool.map(p => chooseBlanks(tokenize(p.text), difficulty, p.id).size);
    return Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
  }

  /* ---------- Super Mind ---------- */
  const passageWords = {};
  function collectPassageWords() {
    PASSAGES.forEach(p => {
      tokenize(p.text).forEach(tok => {
        if (isWord(tok)) (passageWords[tok.length] = passageWords[tok.length] || []).push(tok.toLowerCase());
      });
    });
  }

  function optionPool(word) {
    if (!Object.keys(passageWords).length) collectPassageWords();
    const n = word.length;
    const set = new Set();
    const add = w => {
      const lw = w.toLowerCase();
      if (lw.length === n && !STOPWORDS.has(lw)) set.add(lw);
    };
    bank(n).forEach(add);
    (passageWords[n] || []).forEach(add);
    set.delete(word.toLowerCase());
    return [...set];
  }

  /* Five words of the same length — four distractors plus the answer.
     Cached per blank so focusing the same gap again shows the same list. */
  function optionsFor(round, index) {
    if (!round.mind) round.mind = {};
    if (round.mind[index]) return round.mind[index];

    const word = round.tokens[index];
    const rand = rng(hash(round.passage.id + '|' + index + '|' + word.toLowerCase()));
    const copy = optionPool(word);
    const used = new Set([word.toLowerCase()]);
    const picked = [];
    let guard = 0;
    while (picked.length < 4 && copy.length && guard++ < 800) {
      const j = Math.floor(rand() * copy.length);
      const cand = copy.splice(j, 1)[0];
      if (used.has(cand)) continue;
      used.add(cand);
      picked.push(cand);
    }

    const opts = [word.toLowerCase(), ...picked];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
    }
    round.mind[index] = opts;
    return opts;
  }

  /* ---------- lifecycle ---------- */
  function start(difficulty, excludeId) {
    const passage = pickPassage(difficulty, excludeId);
    const tokens = tokenize(passage.text);
    const blanks = chooseBlanks(tokens, difficulty, passage.id);
    return {
      passage,
      difficulty,
      tokens,
      blanks,
      answers: {},                 // token index -> typed string
      mind: {},                    // token index -> cached option list
      mindShown: new Set(),        // blanks already revealed this round
      mindCharges: Math.floor(blanks.size / 2),   // half the gaps, rounded down
      mindUsed: 0,
      startedAt: Date.now(),
      finishedAt: null,
      elapsedMs: 0
    };
  }

  /* Seconds of reading/typing allowed per blank before the speed bonus drops. */
  const SEC_PER_BLANK = 12;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* Par time for a round — the UI shows it next to the clock. */
  function parSeconds(total) { return Math.max(1, total * SEC_PER_BLANK); }

  function grade(round) {
    const cfg = DIFFICULTY[round.difficulty] || DIFFICULTY.easy;
    const details = [];
    let correct = 0, base = 0, letters = 0;

    [...round.blanks].sort((a, b) => a - b).forEach(i => {
      const word = round.tokens[i];
      const given = (round.answers[i] || '').trim();
      const ok = given.toLowerCase() === word.toLowerCase();
      if (ok) {
        correct++;
        letters += word.length;
        base += Math.round(word.length * 10 * cfg.mult);
      }
      details.push({ index: i, word, given, ok });
    });

    const total = round.blanks.size;
    const perfect = total > 0 && correct === total;
    const seconds = round.elapsedMs
      ? Math.round(round.elapsedMs / 1000)
      : Math.round(((round.finishedAt || Date.now()) - round.startedAt) / 1000);

    /* Time factor: beating par multiplies the score up to 1.8x,
       running slow pulls it down to 0.6x. */
    const par = parSeconds(total);
    const speed = clamp(par / Math.max(seconds, 1), 0.6, 1.8);
    const multiplier = Math.round(base * speed);
    const timeBonus = multiplier - base;
    const perfectBonus = perfect ? 100 : 0;
    const points = multiplier + perfectBonus;

    return {
      total, correct, points, base, letters, perfect,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      seconds, par, speed, timeBonus, perfectBonus, details
    };
  }

  return { tokenize, isWord, chooseBlanks, estimateBlanks, averageBlanks, poolFor, parSeconds, optionsFor, start, grade };
})();
