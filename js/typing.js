/* ============================================================
   Typing Sprint — retype a passage as fast and as cleanly as you can.

   The passages are the ones Word Fill already uses, so there is nothing
   new to author. Every character is judged as you type it: a right one
   darkens, a wrong one turns red and stays counted.

   Score = speed against the level's target words-per-minute, plus a
   bonus for a completely clean run.
   ============================================================ */
const Typing = (() => {
  /* `chars` is roughly how long a run should be — a couple of sentences, not a
     whole paragraph, so a round takes half a minute instead of five. */
  const LEVELS = [
    { key: 'primary', label: 'Primary', base: 80, wpm: 15, chars: 90,
      desc: 'Short simple sentences. Aim for 15 words per minute.' },
    { key: 'easy', label: 'Easy', base: 110, wpm: 20, chars: 130,
      desc: 'Everyday sentences. Aim for 20 words per minute.' },
    { key: 'medium', label: 'Medium', base: 160, wpm: 25, chars: 170,
      desc: 'Longer sentences. Aim for 25 words per minute.' },
    { key: 'hard', label: 'Hard', base: 220, wpm: 30, chars: 210,
      desc: 'Dense sentences. Aim for 30 words per minute.' }
  ];

  const MIN_SPEED = 0.5, MAX_SPEED = 1.6, MAX_POINTS = 300, CLEAN_BONUS = 20;

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[1];

  /* Don't hand out the same passage twice in a row. */
  let lastId = null;

  function pool(level) {
    const p = (typeof PASSAGE_POOLS !== 'undefined' && PASSAGE_POOLS[level]) || null;
    return (p && p.length) ? p : PASSAGE_POOLS.easy;
  }

  /* Keep the opening sentences of a passage until the run is long enough.
     Stopping on a sentence boundary keeps it reading like real text. */
  function trim(text, target) {
    const parts = String(text).match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
    let out = '';
    for (let i = 0; i < parts.length; i++) {
      if (out && (out + parts[i]).length > target) break;
      out += parts[i];
    }
    return out.trim() || String(text).trim();
  }

  function start(level) {
    const cfg = cfgOf(level);
    const list = pool(cfg.key);
    let pick = list[(Math.random() * list.length) | 0];
    if (list.length > 1 && pick.id === lastId) {
      pick = list[(list.indexOf(pick) + 1) % list.length];
    }
    lastId = pick.id;
    const info = (typeof DIFFICULTY !== 'undefined' && DIFFICULTY[cfg.key]) || { label: cfg.key };
    return {
      level: cfg.key, label: info.label || cfg.key,
      base: cfg.base, wpmTarget: cfg.wpm, charTarget: cfg.chars,
      title: pick.title, target: trim(pick.text, cfg.chars),
      typed: '', correct: 0, errors: 0, typedTotal: 0,
      status: 'playing', startedAt: Date.now(), elapsedMs: 0
    };
  }

  /* Feed the whole typed string (an input event gives us the full value, which
     makes backspacing and corrections just work). */
  function type(st, value) {
    if (st.status !== 'playing') return { ok: false };
    const v = String(value == null ? '' : value).slice(0, st.target.length);
    const prevLen = st.typed.length;
    st.typed = v;
    let correct = 0;
    for (let i = 0; i < v.length; i++) if (v[i] === st.target[i]) correct++;
    st.correct = correct;
    /* New characters are the only thing that can add a mistake, and each mistake
       is counted once and kept — rubbing it out must not restore a clean run. */
    if (v.length > prevLen) {
      for (let i = prevLen; i < v.length; i++) {
        st.typedTotal++;
        if (v[i] !== st.target[i]) st.errors++;
      }
    }
    if (v.length >= st.target.length) st.status = 'done';
    return { ok: true, correct: correct, errors: st.errors, done: st.status === 'done' };
  }

  const progress = st => st.typed.length / st.target.length;

  function live(st, elapsedMs) {
    const typed = st.typed.length;
    const minutes = Math.max(1 / 60, (elapsedMs || 0) / 60000);
    const wpm = (typed / 5) / minutes;
    /* accuracy over every key ever pressed for real, so deleting a typo does not
       quietly hand back a 100% run */
    const accuracy = st.typedTotal ? (st.typedTotal - st.errors) / st.typedTotal : 1;
    return { typed: typed, correct: st.correct, wpm: wpm, accuracy: accuracy, errors: st.errors };
  }

  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const state = live(st, st.elapsedMs || 0);
    const wpm = state.wpm;
    const accuracy = state.accuracy;
    const clean = st.errors === 0 && st.status === 'done';
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, wpm / cfg.wpm));
    return {
      level: st.level, label: st.label, title: st.title,
      done: st.status === 'done', seconds: seconds,
      wpm: wpm, accuracy: accuracy, errors: st.errors,
      keys: st.typedTotal,
      correct: st.correct, typed: st.typed.length, total: st.target.length,
      speed: speed, clean: clean, base: cfg.base, wpmTarget: cfg.wpm,
      points: st.status === 'done'
        ? Math.max(0, Math.min(MAX_POINTS, Math.round(cfg.base * speed) + (clean ? CLEAN_BONUS : 0)))
        : 0
    };
  }

  return {
    LEVELS: LEVELS, cfgOf: cfgOf, MAX_POINTS: MAX_POINTS,
    start: start, type: type, progress: progress, live: live, finish: finish
  };
})();
