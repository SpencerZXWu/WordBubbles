/* ============================================================
   WordBubbles — app controller
   state · timer · pause · Super Mind toggle · animation hooks
   ============================================================ */
const App = (() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* every mode that needs two players picked on the home screen */
  const DUELS = ['math', 'chess', 'gomoku', 'go', 'wordstack', 'tacta'];
  const isDuel = m => DUELS.indexOf(m) >= 0;

  let round = null;
  let difficulty = 'easy';
  let mathDifficulty = 'easy';
  let mathState = null;
  let mode = 'words';      // 'words' | 'math' | 'chess'
  let selected = [];       // player ids picked on the home screen
  let chessState = null;
  let chessSides = ['w', 'b'];
  let chessSel = -1;
  let chessBusy = false;

  let gomokuState = null;
  let goState = null;
  let boardSides = ['b', 'w'];
  let boardBusy = false;
  const boardSize = { gomoku: 15, go: 9 };

  let mineState = null;
  let mineLevel = 'beginner';
  let slideState = null;
  let slideLevel = 'easy';
  let suState = null;
  let suLevel = 'easy';
  let ngState = null;
  let ngLevel = 'easy';
  let g8State = null;
  let g8Level = 'easy';
  let tyState = null;
  let tyLevel = 'easy';
  let cbState = null;
  let cbLevel = 'easy';
  let laState = null;
  let laLevel = 'easy';
  let flagMode = false;

  let wordstackState = null;
  let wsLevel = 'easy';
  let wsDrag = null;           // in-flight drag of a tray tile
  let wsZoom = 1;              // board scale, driven by pinch / wheel / buttons
  let wsZoomTween = null;      // in-flight animated zoom
  let wsBase = null;           // natural (unscaled) board size in px
  let wsPan = null;            // one-finger / mouse panning of the board
  let wsPinch = null;          // two-finger zooming of the board
  const wsPointers = new Map();
  let wsTickId = null;         // per-turn countdown frame
  let wsPassTimer = null;      // pending automatic pass
  let wsEndsAt = 0;
  let wsSayId = null;
  let wsSayUntil = 0;
  const WS_ZOOM_MIN = 0.4, WS_ZOOM_MAX = 4;

  let tactaState = null;
  let tcSel = -1;              // hand card currently highlighted
  let tcDrag = null;           // in-flight drag of a hand card
  let tcPreview = [];          // board cells carrying preview classes right now
  let tcPassTimer = null;
  let tcSayId = null;
  let tcSayUntil = 0;
  let tcZoom = 1;              // table scale, driven by pinch / wheel / buttons
  let tcZoomTween = null;      // in-flight animated zoom
  let tcBase = null;           // natural (unscaled) table size in px
  let tcPan = null;            // one-finger panning of the table
  let tcPinch = null;          // two-finger zooming of the table
  const tcPointers = new Map();
  const TC_ZOOM_MIN = 0.35, TC_ZOOM_MAX = 5;
  const TC_LEAVE_MS = 260;

  /* choreography, in ms (all collapse to 0 under reduced motion) */
  const CRACK_MS = 220, SHARD_MS = 240, SLIDE_MS = 280, BUSY_MS = 400;
  const KING_CRACK_MS = 620, KING_SHARD_MS = 320, LEAVE_MS = 260;
  const anim = ms => (reduceMotion ? 0 : ms);

  let timerId = null;
  let paused = false;
  let startedAt = 0;
  let accumulated = 0;
  let mindEl = null;
  let armed = false;      // Super Mind armed, waiting for a gap click

  /* ---------------- boot ---------------- */
  function init() {
    const st = Store.init();
    document.documentElement.setAttribute('data-theme', st.theme || 'light');

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    window.addEventListener('resize', wsOnResize);
    document.getElementById('logoHome').addEventListener('click', e => {
      e.preventDefault();
      leaveGame();
      showHome();
    });
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') setArmed(false);
      const typing = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName || '');
      if (!typing && tactaState && tactaState.status === 'playing') {
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); tcTurnSel(); return; }
        if (e.key === 'm' || e.key === 'M') { e.preventDefault(); tcMirrorSel(); return; }
      }
      if (!typing && slideState && slideState.status === 'playing') {
        if (e.key === 'ArrowUp') { e.preventDefault(); slideStep(-1, 0); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); slideStep(1, 0); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); slideStep(0, -1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); slideStep(0, 1); return; }
      }
      if (!typing && suState && suState.status === 'playing') {
        if (e.key >= '1' && e.key <= '9') { e.preventDefault(); writeSudoku(Number(e.key)); return; }
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
          e.preventDefault(); writeSudoku(0); return;
        }
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          Sudoku.toggleNotes(suState);
          UI.sudokuSync(suState);
          return;
        }
        if (e.key === 'ArrowUp') { e.preventDefault(); sudokuMove(-1, 0); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); sudokuMove(1, 0); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); sudokuMove(0, -1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); sudokuMove(0, 1); return; }
      }
      if (!typing && ngState && ngState.status === 'playing' && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        Nonogram.toggleMode(ngState);
        UI.nonogramSync(ngState);
        return;
      }
      if (!typing && g8State && g8State.status === 'playing') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); doG2048Move('up'); return; }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); doG2048Move('down'); return; }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); doG2048Move('left'); return; }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); doG2048Move('right'); return; }
      }
      if (!typing && cbState && cbState.status === 'playing') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          if (Number(e.key) < cbState.alphabet) cbDigit(Number(e.key));
          else cbSay('This level only uses digits 0-' + (cbState.alphabet - 1), true);
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); cbBack(); return; }
        if (e.key === 'Enter') { e.preventDefault(); cbSubmit(); return; }
      }
      if (!typing && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        toggleFullscreen();
      }
    });
    syncFullscreenButton();

    showHome();
  }

  /* ---------------- fullscreen ---------------- */
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function syncFullscreenButton() {
    const btn = document.getElementById('fullscreenToggle');
    if (!btn) return;
    const on = !!document.fullscreenElement;
    btn.classList.toggle('active', on);
    btn.title = on ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
    btn.setAttribute('aria-label', btn.title);
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Store.setTheme(next);
    const btn = document.getElementById('themeToggle');
    if (btn && !reduceMotion) {
      btn.classList.remove('spin');
      void btn.offsetWidth;
      btn.classList.add('spin');
    }
  }

  /* ---------------- screens ---------------- */
  /* Keep the home selection valid against the current player list. */
  let seeded = false;
  function pruneSelection() {
    const ids = Store.state.players.map(p => p.id);
    selected = selected.filter(id => ids.indexOf(id) >= 0);
    const max = isDuel(mode) ? 2 : 1;
    if (selected.length > max) selected = selected.slice(0, max);
    // seed from the remembered player once per session, so the user can still
    // clear the selection on purpose afterwards
    if (!seeded) {
      seeded = true;
      if (!selected.length && ids.indexOf(Store.state.currentPlayerId) >= 0) {
        selected = [Store.state.currentPlayerId];
      }
    }
    if (selected.length) Store.selectPlayer(selected[0]);
  }

  function showHome() {
    mathState = null;
    chessState = null;
    gomokuState = null;
    goState = null;
    mineState = null;
    slideState = null;
    suState = null;
    ngState = null;
    g8State = null;
    tyState = null;
    cbState = null;
    laState = null;
    wordstackState = null;
    tactaState = null;
    tcSel = -1;
    clearMathTimers();
    clearWsTimers();
    clearTcTimers();
    clearTyTimers();
    stopTimer();
    hideMind();
    setArmed(false);
    const st = Store.state;
    pruneSelection();
    UI.home(st.players, selected, mode);

    document.getElementById('addPlayer').addEventListener('click', () => {
      UI.addPlayerModal((name, avatar) => {
        const p = Store.addPlayer(name, avatar);
        selected = (isDuel(mode) && selected.length >= 2)
          ? [selected[1], p.id]
          : selected.concat([p.id]);
        showHome();
      });
    });

    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        selected = selected.slice(0, isDuel(mode) ? 2 : 1);
        refreshHome();
      });
    });

    document.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.player;
        if (isDuel(mode)) {
          const at = selected.indexOf(id);
          if (at >= 0) selected.splice(at, 1);            // tap again to unpick
          else if (selected.length < 2) selected.push(id);
          else { selected.shift(); selected.push(id); }    // replace the oldest pick
        } else {
          selected = [id];
        }
        refreshHome();
      });
    });

    document.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const p = Store.getPlayer(btn.dataset.del);
        if (!p) return;
        if (confirm('Remove player "' + p.name + '" and their scores?')) {
          Store.deletePlayer(p.id);
          selected = selected.filter(id => id !== p.id);
          showHome();
        }
      });
    });

    document.querySelectorAll('[data-history]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const p = Store.getPlayer(btn.dataset.history);
        if (p) UI.historyModal(p);
      });
    });

    const cont = document.getElementById('continueBtn');
    if (cont) cont.addEventListener('click', () => {
      if (mode === 'math') {
        if (selected.length === 2) showMathDifficulty();
      } else if (mode === 'chess') {
        if (selected.length === 2) startChess();
      } else if (mode === 'gomoku' || mode === 'go') {
        if (selected.length === 2) showBoardSetup(mode);
      } else if (mode === 'wordstack') {
        if (selected.length === 2) showWordStackSetup();
      } else if (mode === 'tacta') {
        if (selected.length === 2) startTacta();
      } else if (mode === 'mine') {
        if (selected.length === 1) showMineDifficulty();
      } else if (mode === 'slide') {
        if (selected.length === 1) showSlideDifficulty();
      } else if (mode === 'sudoku') {
        if (selected.length === 1) showSudokuDifficulty();
      } else if (mode === 'nonogram') {
        if (selected.length === 1) showNonogramDifficulty();
      } else if (mode === 'g2048') {
        if (selected.length === 1) showG2048Difficulty();
      } else if (mode === 'typing') {
        if (selected.length === 1) showTypingDifficulty();
      } else if (mode === 'codebreak') {
        if (selected.length === 1) showCodeBreakDifficulty();
      } else if (mode === 'ladder') {
        if (selected.length === 1) showLadderDifficulty();
      } else if (selected.length === 1) {
        showDifficulty();
      }
    });
  }

  /* Picking a player or a mode only flips the selection — rebuilding the whole
     home screen made it flash, so this updates it in place instead. */
  function refreshHome() {
    pruneSelection();
    UI.homeUpdate(Store.state.players, selected, mode);
  }

  /* Any in-game Home button: leave the game and go back. Scores are only ever
     written when a game finishes, so nothing changes on the way out. */
  function goHome() {
    leaveGame();
    showHome();
  }

  function bindHome() {
    const b = document.getElementById('homeBtn');
    if (b) b.addEventListener('click', goHome);
  }

  function showDifficulty() {
    UI.difficulty(difficulty);
    document.querySelectorAll('[data-diff]').forEach(card => {
      card.addEventListener('click', () => {
        difficulty = card.dataset.diff;
        showDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startGame(difficulty));
  }

  /* ---------------- timer & pause ---------------- */
  function elapsedMs() { return paused ? accumulated : accumulated + (Date.now() - startedAt); }
  function tickTimer() {
    const el = document.getElementById('timer');
    if (el) el.textContent = UI.fmtTime(Math.floor(elapsedMs() / 1000));
  }
  function startTimer() {
    stopTimer();
    accumulated = 0;
    paused = false;
    startedAt = Date.now();
    timerId = setInterval(tickTimer, 250);
    tickTimer();
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  function pauseGame() {
    if (paused || !round) return;
    paused = true;
    accumulated += Date.now() - startedAt;
    hideMind();
    setArmed(false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const cover = document.getElementById('pauseCover');
    if (cover) cover.hidden = false;
  }

  function resumeGame() {
    if (!paused) return;
    paused = false;
    startedAt = Date.now();
    const cover = document.getElementById('pauseCover');
    if (cover) cover.hidden = true;
  }

  /* ---------------- game ---------------- */
  function startGame(diff) {
    const player = Store.getCurrent();
    if (!player) { showHome(); return; }
    stopTimer();
    hideMind();
    armed = false;
    round = Game.start(diff, round && round.passage ? round.passage.id : null);
    UI.game(round, player);
    bindGame();
    bindHome();
    startTimer();
    const first = document.querySelector('.bin');
    if (first) first.focus();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function leaveGame() {
    stopTimer();
    hideMind();
    setArmed(false);
    clearMathTimers();
    clearWsTimers();
    round = null;
    mathState = null;
    chessState = null;
    gomokuState = null;
    goState = null;
    mineState = null;
    slideState = null;
    suState = null;
    ngState = null;
    g8State = null;
    tyState = null;
    cbState = null;
    laState = null;
    wordstackState = null;
    chessBusy = false;
    boardBusy = false;
    clearTyTimers();
  }

  function refreshProgress() {
    if (!round) return;
    const inputs = Array.from(document.querySelectorAll('.bin'));
    let filled = 0;
    inputs.forEach(i => { if (i.value.trim()) filled++; });
    const size = round.blanks.size || 1;
    const bar = document.getElementById('progBar');
    if (bar) bar.style.width = (filled / size) * 100 + '%';
    const txt = document.getElementById('progText');
    if (txt) txt.textContent = filled + ' / ' + round.blanks.size + ' filled';
    const submit = document.getElementById('submitBtn');
    if (submit) {
      const ready = filled === round.blanks.size;
      const wasReady = !submit.disabled;
      submit.disabled = !ready;
      if (ready && !wasReady && !reduceMotion) {
        submit.classList.remove('ready');
        void submit.offsetWidth;
        submit.classList.add('ready');
      }
    }
  }

  function syncBlank(inp) {
    const el = inp.closest('.blank');
    if (el) el.classList.toggle('filled', inp.value.length > 0);
  }

  function bindGame() {
    const inputs = Array.from(document.querySelectorAll('.bin'));
    const submit = document.getElementById('submitBtn');

    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => {
        const cleaned = inp.value.replace(/[^A-Za-z]/g, '');
        if (cleaned !== inp.value) inp.value = cleaned;
        round.answers[inp.dataset.i] = inp.value;
        syncBlank(inp);
        if (inp.value.length >= inp.maxLength && inputs[idx + 1]) inputs[idx + 1].focus();
        refreshProgress();
      });

      inp.addEventListener('keydown', e => {
        if (e.key === ' ') {
          e.preventDefault();
          if (inputs[idx + 1]) inputs[idx + 1].focus();
        } else if (e.key === 'Backspace' && inp.value === '' && inputs[idx - 1]) {
          const prev = inputs[idx - 1];
          prev.focus();
          prev.setSelectionRange(prev.value.length, prev.value.length);
        } else if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && inputs[idx - 1]) {
          inputs[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && inputs[idx + 1]) {
          inputs[idx + 1].focus();
        } else if (e.key === 'Enter') {
          if (!submit.disabled) submit.click();
        }
      });

      // Typing/focusing never spends a hint. Super Mind must be armed first.
      inp.addEventListener('click', () => onBlankClick(Number(inp.dataset.i)));

      inp.addEventListener('focus', () => {
        inp.setSelectionRange(inp.value.length, inp.value.length);
      });
    });

    submit.addEventListener('click', submitRound);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('mindBtn').addEventListener('click', toggleArmed);
    refreshProgress();
  }

  /* ---------------- Super Mind ---------------- */
  function setArmed(v) {
    armed = !!v && !!round && round.mindUsed < round.mindCharges;
    const btn = document.getElementById('mindBtn');
    if (btn) btn.classList.toggle('armed', armed);
    const note = document.getElementById('armedNote');
    if (note) note.hidden = !armed;
    document.body.classList.toggle('mind-armed', armed);
  }

  function toggleArmed() {
    if (!round || paused) return;
    if (round.mindUsed >= round.mindCharges) return;
    setArmed(!armed);
  }

  function updateMindCount() {
    const el = document.getElementById('mindCount');
    if (!el || !round) return;
    const left = round.mindCharges - round.mindUsed;
    el.textContent = left + '/' + round.mindCharges;
    const btn = document.getElementById('mindBtn');
    if (btn) btn.disabled = left <= 0;
  }

  function onBlankClick(i) {
    if (paused || !round) return;
    if (round.mindShown.has(i)) { showMindFor(i); return; }   // already paid for
    if (!armed) return;
    if (round.mindUsed >= round.mindCharges) { setArmed(false); return; }
    round.mindUsed++;
    round.mindShown.add(i);
    updateMindCount();
    setArmed(false);
    showMindFor(i);
  }

  function showMindFor(i) {
    const inp = document.querySelector('.bin[data-i="' + i + '"]');
    if (!inp) return;
    const blankEl = inp.closest('.blank');
    const options = Game.optionsFor(round, i);

    hideMind();
    const pop = UI.mindPopover(options);
    pop.addEventListener('click', e => {
      const btn = e.target.closest('[data-opt]');
      if (!btn) return;
      e.stopPropagation();
      inp.value = btn.dataset.opt;
      round.answers[i] = inp.value;
      syncBlank(inp);
      hideMind();
      refreshProgress();
      const inputs = Array.from(document.querySelectorAll('.bin'));
      const idx = inputs.indexOf(inp);
      if (inputs[idx + 1]) inputs[idx + 1].focus();
    });
    blankEl.appendChild(pop);
    mindEl = pop;
    // Lift this gap above sticky bars so the chooser is always on top.
    blankEl.classList.add('has-mind');
    // no room above the passage? flip the chooser below the gap.
    // Both rects move with scrolling, so this comparison is scroll-proof.
    requestAnimationFrame(() => {
      const wrap = document.getElementById('passageWrap');
      if (!wrap) return;
      if (pop.getBoundingClientRect().top < wrap.getBoundingClientRect().top + 4) {
        pop.classList.add('below');
      }
    });
  }

  function hideMind() {
    if (mindEl) { mindEl.remove(); mindEl = null; }
    document.querySelectorAll('.blank.has-mind').forEach(el => el.classList.remove('has-mind'));
  }

  function onDocumentClick(e) {
    if (!mindEl) return;
    if (e.target.closest('.mind-pop') || e.target.closest('.blank')) return;
    hideMind();
  }

  /* ---------------- Math Duel ---------------- */
  let mathAnim = null;   // pending turn timeout
  let mathFly = null;    // pending settlement timeout

  function clearMathTimers() {
    if (mathAnim) { clearTimeout(mathAnim); mathAnim = null; }
    if (mathFly) { clearTimeout(mathFly); mathFly = null; }
    document.querySelectorAll('.settle-fly, .roll-tmp').forEach(el => el.remove());
  }

  /* Animate a number element from `from` to `to`. */
  function countUp(el, from, to, ms) {
    if (!el) return;
    if (ms <= 0 || from === to) { el.textContent = String(to); return; }
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = String(to);
    }
    requestAnimationFrame(frame);
  }

  /* Fade the old number out and roll the new one in. */
  function rollNumber(value, done) {
    const cn = document.getElementById('centerNum');
    if (!cn) { if (done) done(); return; }
    const swap = () => {
      cn.textContent = MathGame.fmt(value);
      cn.classList.remove('roll-out');
      cn.classList.add('roll-in');
      setTimeout(() => {
        cn.classList.remove('roll-in');
        if (done) done();
      }, reduceMotion ? 0 : 420);
    };
    if (reduceMotion) { swap(); return; }
    cn.classList.add('roll-out');
    setTimeout(swap, 190);
  }

  function showMathDifficulty() {
    UI.mathDifficulty(mathDifficulty);
    document.querySelectorAll('[data-mdiff]').forEach(card => {
      card.addEventListener('click', () => {
        mathDifficulty = card.dataset.mdiff;
        showMathDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startMathBtn').addEventListener('click', () => startMath(mathDifficulty));
  }

  function startMath(diff) {
    clearMathTimers();
    const players = selected.map(id => Store.getPlayer(id)).filter(Boolean);
    if (players.length !== 2) { showHome(); return; }
    // Player 1 / Player 2 are assigned at random
    const order = Math.random() < 0.5 ? [players[0], players[1]] : [players[1], players[0]];
    mathState = MathGame.start(diff, order);
    UI.mathGame(mathState);
    bindMath();
    bindHome();
    refreshMath();
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindMath() {
    document.querySelectorAll('.mcard').forEach(btn => {
      btn.addEventListener('click', () => onMathCard(btn.dataset.p, btn.dataset.card));
    });
  }

  /* Render the board. `opts.value` lets the caller keep showing a settled
     number while the engine has already rolled the next one. */
  function refreshMath(opts) {
    const s = mathState;
    if (!s) return;
    opts = opts || {};
    const value = typeof opts.value === 'number' ? opts.value : s.center;
    const cn = document.getElementById('centerNum');
    const text = MathGame.fmt(value);
    cn.textContent = text;
    cn.classList.toggle('long', text.length > 5 && text.length <= 8);
    cn.classList.toggle('xlong', text.length > 8);
    cn.classList.toggle('negative', value < 0);

    // lean the number toward whoever would collect it
    const owner = MathGame.ownerOf(value);
    const lean = document.getElementById('numLean');
    if (lean) {
      lean.classList.toggle('lean-p1', owner === 0);
      lean.classList.toggle('lean-p2', owner === 1);
    }
    const ph = document.getElementById('parityHint');
    if (ph) {
      ph.textContent = (Math.abs(value) % 2 === 1 ? 'odd' : 'even') + ' \u2192 ' + s.players[owner].name;
    }

    if (!opts.holdScores) {
      document.getElementById('mscore0').textContent = String(s.scores[0]);
      document.getElementById('mscore1').textContent = String(s.scores[1]);
    }

    const sc = document.getElementById('settleCount');
    sc.textContent = s.turnsLeft;
    sc.classList.remove('tick'); void sc.offsetWidth; sc.classList.add('tick');
    document.getElementById('turnLabel').textContent = s.players[s.active].name + ' plays a card';
    document.querySelectorAll('.mpanel').forEach((el, pi) => el.classList.toggle('on', pi === s.active));
    document.querySelectorAll('.handrow').forEach(row => {
      const pi = Number(row.dataset.p);
      row.classList.toggle('active', pi === s.active);
      row.classList.toggle('waiting', pi !== s.active);
    });
    document.querySelectorAll('.mcard').forEach(btn => {
      btn.disabled = opts.lockHands ? true : (Number(btn.dataset.p) !== s.active);
    });
    document.getElementById('mprog').style.width = (s.turn / s.totalTurns) * 100 + '%';
    document.getElementById('mturnText').textContent = 'turn ' + s.turn + ' / ' + s.totalTurns;
  }

  /* One turn, start to finish. Every hand stays locked until the whole
     animation chain is done, so the picture can never drift from the
     engine state. */
  function onMathCard(pIdx, cardId) {
    const s = mathState;
    if (!s || s.busy || s.done) return;
    if (Number(pIdx) !== s.active) return;

    s.busy = true;
    document.querySelectorAll('.mcard').forEach(b => { b.disabled = true; });

    const btn = document.querySelector('.mcard[data-card="' + cardId + '"]');
    if (btn) btn.classList.add('playing');

    mathAnim = setTimeout(() => {
      mathAnim = null;
      const prevScores = s.scores.slice();
      const res = MathGame.playCard(s, Number(pIdx), cardId);
      if (!res) {
        s.busy = false;
        if (btn) btn.classList.remove('playing');
        refreshMath();
        return;
      }
      res.prevScores = prevScores;
      if (btn) btn.remove();

      const cn = document.getElementById('centerNum');
      const land = () => {
        cn.classList.remove('rounding');
        cn.textContent = MathGame.fmt(res.after);
        cn.classList.remove('pop'); void cn.offsetWidth; cn.classList.add('pop');
        refreshMath({ value: res.after, holdScores: true, lockHands: !!res.settlement });
        if (res.settlement) runSettlement(res, res.done);
        else if (res.done) { s.busy = false; finishMath(); }
        else s.busy = false;
      };

      if (res.fraction && !reduceMotion) {
        // show the fraction, then let it round onto the whole number.
        // The lean and parity hint belong to the previous number, so clear
        // them while the fraction is on screen.
        cn.textContent = MathGame.fmt(res.raw);
        cn.classList.add('rounding');
        const ph = document.getElementById('parityHint');
        if (ph) ph.textContent = '';
        const leanEl = document.getElementById('numLean');
        if (leanEl) { leanEl.classList.remove('lean-p1', 'lean-p2'); }
        mathAnim = setTimeout(() => { mathAnim = null; land(); }, 560);
      } else {
        land();
      }
    }, reduceMotion ? 0 : 240);
  }

  /* Settlement: hold the result for 2s, fly the points to the winner,
     then load the next random number. */
  function runSettlement(res, isFinal) {
    const s = mathState;
    const st = res.settlement;
    const cn = document.getElementById('centerNum');
    const panel = document.getElementById('mpanel' + st.winner);
    if (!cn || !panel) { s.busy = false; return; }

    const from = cn.getBoundingClientRect();
    const to = panel.getBoundingClientRect();

    const el = document.createElement('div');
    el.className = 'settle-fly' + (st.value < 0 ? ' neg' : '');
    el.textContent = (st.value >= 0 ? '+' : '') + st.value + ' \u2192 ' + s.players[st.winner].name;
    el.style.left = Math.round(from.left + from.width / 2) + 'px';
    el.style.top = Math.round(from.bottom + 10) + 'px';
    document.body.appendChild(el);

    const hold = reduceMotion ? 500 : 2000;
    const flyMs = reduceMotion ? 0 : 800;

    mathFly = setTimeout(() => {
      mathFly = null;
      const dx = Math.round((to.left + to.width / 2) - (from.left + from.width / 2));
      const dy = Math.round((to.top + to.height / 2) - (from.bottom + 10));

      const arrive = () => {
        el.remove();
        const scoreEl = document.getElementById('mscore' + st.winner);
        if (scoreEl) {
          scoreEl.classList.remove('got'); void scoreEl.offsetWidth; scoreEl.classList.add('got');
        }
        countUp(scoreEl, res.prevScores[st.winner], s.scores[st.winner], reduceMotion ? 0 : 700);
        panel.classList.add('got');
        setTimeout(() => panel.classList.remove('got'), 750);

        if (isFinal) {
          s.busy = false;
          setTimeout(finishMath, reduceMotion ? 0 : 600);
          return;
        }
        rollNumber(s.center, () => {
          s.busy = false;
          refreshMath();
        });
      };

      if (flyMs) {
        const anim = el.animate([
          { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), ' + dy + 'px) scale(.55)', opacity: .12 }
        ], { duration: flyMs, easing: 'cubic-bezier(.4,.8,.2,1)', fill: 'forwards' });
        anim.onfinish = arrive;
      } else {
        arrive();
      }
    }, hold);
  }

  function finishMath() {
    const s = mathState;
    if (!s) return;
    s.elapsedMs = elapsedMs();
    stopTimer();
    const res = MathGame.finish(s);

    // Map the duel score into a fixed -100 .. +300 band:
    // a draw is 0, losing costs at most 100, winning earns at most 300.
    const WIN_MAX = 300, LOSS_MAX = 100;
    const totalAbs = Math.abs(res.scores[0]) + Math.abs(res.scores[1]);
    const mapped = [0, 1].map(pi => {
      let share = totalAbs > 0 ? res.scores[pi] / totalAbs : 0.5;
      share = Math.min(1, Math.max(0, share));   // keep the result inside the band
      return share >= 0.5
        ? Math.round((share - 0.5) * 2 * WIN_MAX)
        : -Math.round((0.5 - share) * 2 * LOSS_MAX);
    });

    [[0, s.players[0], s.players[1]], [1, s.players[1], s.players[0]]].forEach(item => {
      const pi = item[0], me = item[1], opp = item[2];
      const mine = res.scores[pi], theirs = res.scores[1 - pi];
      Store.recordGame(me.id, {
        mode: 'math',
        difficulty: s.difficulty,
        points: mapped[pi],
        seconds: res.seconds,
        opponent: opp.name,
        myScore: mine,
        oppScore: theirs,
        outcome: mine > theirs ? 'win' : (mine < theirs ? 'lose' : 'draw')
      });
    });

    UI.mathResult(s, res, mapped);
    document.getElementById('mathAgainBtn').addEventListener('click', () => startMath(s.difficulty));
    document.getElementById('mathChangeBtn').addEventListener('click', showMathDifficulty);
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Chess ---------------- */
  function chessPlayers() {
    return selected.map(id => Store.getPlayer(id)).filter(Boolean);
  }
  function playerIndexOfColor(col) { return chessSides[0] === col ? 0 : 1; }

  function startChess() {
    const players = chessPlayers();
    if (players.length !== 2) { showHome(); return; }
    clearMathTimers();
    // colours are handed out at random
    chessSides = Math.random() < 0.5 ? ['w', 'b'] : ['b', 'w'];
    chessState = Chess.start();
    chessSel = -1;
    chessBusy = false;
    UI.chessGame(chessState, players, chessSides);
    bindChess();
    bindHome();
    refreshChess();
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindChess() {
    document.getElementById('board').addEventListener('click', e => {
      const sq = e.target.closest('.sq');
      if (sq) onSquare(Number(sq.dataset.i));
    });
  }

  function onSquare(i) {
    const st = chessState;
    if (!st || chessBusy || st.status === 'checkmate' || st.status === 'stalemate') return;

    if (chessSel >= 0) {
      const hits = Chess.legalMoves(st, chessSel).filter(m => m.to === i);
      if (hits.length) { chooseChessMove(hits); return; }
    }
    const p = st.board[i];
    chessSel = (p && p[0] === st.turn && chessSel !== i) ? i : -1;
    renderChessHighlights();
  }

  function chooseChessMove(hits) {
    if (hits.length > 1 && hits[0].promotion) {
      chessBusy = true;
      UI.promotionModal(chessState.turn, choice => {
        chessBusy = false;
        const pick = hits.filter(m => m.promotion === choice)[0];
        doChessMove(pick || hits[0]);
      });
      return;
    }
    doChessMove(hits[0]);
  }

  /* A capture is staged: the victim cracks open, breaks into shards and
     disappears, and only then does the capturing piece glide onto its square.
     The board only turns once that has played out. */
  function doChessMove(m) {
    const st = chessState;
    const board = document.getElementById('board');
    chessSel = -1;
    chessBusy = true;
    renderChessHighlights();

    const takeSq = m.capturedAt != null ? m.capturedAt : m.to;
    const victim = (m.captured || m.capturedAt != null) ? board.children[takeSq].firstChild : null;

    const commit = () => {
      Chess.applyMove(st, m);
      refreshChess(true);          // draw the new position, board not yet turned
      slideInPiece(m);
      setTimeout(() => {
        turnChessBoard();          // now hand the board to the other player
        setTimeout(() => {
          chessBusy = false;
          if (st.status === 'checkmate' || st.status === 'stalemate') beginChessEnd();
        }, anim(BUSY_MS));
      }, anim(SLIDE_MS));
    };

    if (victim && !reduceMotion) {
      victim.classList.add('cracked');
      setTimeout(() => {
        shatter(victim);
        setTimeout(commit, anim(SHARD_MS));
      }, anim(CRACK_MS));
    } else {
      commit();
    }
  }

  /* Replace `pieceEl` with four clipped copies that fly apart. */
  function shatter(pieceEl) {
    const sq = pieceEl.parentNode;
    pieceEl.classList.add('gone');
    const shards = document.createElement('div');
    shards.className = 'shards';
    for (let k = 0; k < 4; k++) {
      const s = pieceEl.cloneNode(true);
      s.className = pieceEl.className.split('gone').join('').trim() + ' shard s' + k;
      shards.appendChild(s);
    }
    sq.appendChild(shards);
    setTimeout(() => { if (shards.parentNode) shards.parentNode.removeChild(shards); }, 420);
  }

  /* Glide the piece that just landed from the square it came from. Uses the
     independent `translate` property so it composes with the board rotation. */
  function slideInPiece(m) {
    if (reduceMotion) return;
    const board = document.getElementById('board');
    if (!board) return;                 // the screen may have been left mid-move
    const cell = board.getBoundingClientRect().width / 8;
    const slide = (from, to) => {
      const el = board.children[to].firstChild;
      if (!el || el.className.indexOf('empty') >= 0) return;
      const dr = ((to / 8) | 0) - ((from / 8) | 0);
      const dc = (to % 8) - (from % 8);
      el.animate(
        [{ translate: (-dc * cell) + 'px ' + (-dr * cell) + 'px' }, { translate: '0 0' }],
        { duration: SLIDE_MS + 60, easing: 'cubic-bezier(.22,.9,.24,1)' }
      );
    };
    slide(m.from, m.to);
    if (m.castle) {                     // the rook travels with the king
      const r = (m.to / 8) | 0;
      slide(r * 8 + (m.castle === 'k' ? 7 : 0), r * 8 + (m.castle === 'k' ? 5 : 3));
    }
  }

  function turnChessBoard() {
    const st = chessState;
    const el = document.getElementById('boardRot');
    if (el && st) el.style.setProperty('--rot', (st.turn === 'w' ? 0 : 180) + 'deg');
  }

  /* Redraw the board. The whole board rotates half a turn each move so the
     player to move always looks at the board from their own side. One custom
     property drives every rotation (board wrapper + each counter-rotated
     glyph), so the turn animates as a single synchronised movement. */
  function refreshChess(deferRot) {
    const st = chessState;
    if (!st) return;
    const players = chessPlayers();
    const board = document.getElementById('board');
    if (!deferRot) turnChessBoard();

    const last = st.last;
    const kingSq = (st.status === 'check' || st.status === 'checkmate')
      ? Chess.findKing(st.board, st.turn) : -1;

    for (let i = 0; i < 64; i++) {
      const sq = board.children[i];
      const p = st.board[i];
      const pieceEl = sq.firstChild;
      const r = (i / 8) | 0, c = i % 8;
      sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      if (last && (i === last.from || i === last.to)) sq.classList.add('last');
      if (i === kingSq) sq.classList.add('check');
      if (p) {
        pieceEl.textContent = Chess.GLYPH[p[1]];
        pieceEl.className = 'piece ' + p[0];
      } else {
        pieceEl.textContent = '';
        pieceEl.className = 'piece empty';
      }
    }

    // The pieces a side has taken live on that side's own edge of the board.
    ['w', 'b'].forEach(col => {
      const el = document.getElementById('capStrip' + col.toUpperCase());
      if (!el) return;
      const opp = col === 'w' ? 'b' : 'w';
      const list = st.captured[col] || [];
      const edge = Chess.material(st, col) - Chess.material(st, opp);
      el.innerHTML = list.map(p => '<i class="cap ' + p[0] + '">' + Chess.GLYPH[p[1]] + '</i>').join('') +
        (edge > 0 ? '<b class="edge">+' + edge + '</b>' : '');
    });

    const turnEl = document.getElementById('chessTurn');
    if (turnEl) {
      turnEl.textContent = Chess.GLYPH.k;
      turnEl.className = 'msettle-v chess-turn ' + st.turn;
    }

    const stEl = document.getElementById('chessStatus');
    if (stEl) {
      if (st.status === 'checkmate') {
        const w = players[playerIndexOfColor(st.winner)];
        stEl.textContent = (w ? w.name : '?') + ' wins by checkmate';
      } else if (st.status === 'stalemate') {
        stEl.textContent = 'Stalemate — a draw';
      } else {
        const m = players[playerIndexOfColor(st.turn)];
        stEl.textContent = (m ? m.name : '?') + ' to move' + (st.status === 'check' ? ' — check!' : '');
      }
    }

    const active = playerIndexOfColor(st.turn);
    document.querySelectorAll('.duel-head .mpanel').forEach((el, pi) => {
      el.classList.toggle('on', pi === active);
    });

    renderChessHighlights();
  }

  /* Only the piece the player has actually picked up is "aiming": an enemy piece
     counts as threatened only when the selected piece can take it right now, and
     it then gets the full treatment (red tile + cracks + shake).
     Everything is wiped first, so deselecting can never leave a red tile behind. */
  function renderChessHighlights() {
    const st = chessState;
    const board = document.getElementById('board');
    if (!st || !board) return;
    for (let i = 0; i < 64; i++) {
      const sq = board.children[i];
      sq.classList.remove('sel', 'move', 'threat');
      sq.firstChild.classList.remove('cracked');
    }
    const p = chessSel >= 0 ? st.board[chessSel] : null;
    if (!p || p[0] !== st.turn) return;
    board.children[chessSel].classList.add('sel');
    Chess.legalMoves(st, chessSel).forEach(m => {
      const sq = board.children[m.to];
      if (m.captured || m.capturedAt != null) {
        sq.classList.add('threat');
        sq.firstChild.classList.add('cracked');
      } else {
        sq.classList.add('move');
      }
    });
  }

  /* Checkmate: play the losing king cracking apart, then fade the board out and
     only afterwards bring the scoreboard in — never a hard cut. */
  function beginChessEnd() {
    const st = chessState;
    const board = document.getElementById('board');
    const kSq = st && st.status === 'checkmate' ? Chess.findKing(st.board, st.turn) : -1;
    const sq = kSq >= 0 ? board.children[kSq] : null;
    if (!sq || reduceMotion) { leaveChess(); return; }
    const king = sq.firstChild;
    sq.classList.add('check', 'threat');
    king.classList.add('cracked');
    setTimeout(() => {
      shatter(king);
      setTimeout(leaveChess, anim(KING_SHARD_MS));
    }, anim(KING_CRACK_MS));
  }

  function leaveChess() {
    const screen = document.querySelector('.chess-screen');
    if (!screen || reduceMotion) { finishChess(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishChess, LEAVE_MS);
  }

  function finishChess() {
    const st = chessState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Chess.finish(st);
    const players = chessPlayers();
    chessSides.forEach((col, pi) => {
      const me = players[pi];
      if (!me) return;
      const opp = players[1 - pi];
      const s = res.scores[col];
      Store.recordGame(me.id, {
        mode: 'chess',
        difficulty: 'standard',
        points: s.points,
        seconds: res.seconds,
        opponent: opp ? opp.name : '',
        myScore: s.material,
        oppScore: s.conceded,
        outcome: st.status === 'stalemate' ? 'draw' : (st.winner === col ? 'win' : 'lose')
      });
    });
    UI.chessResult(st, res, players, chessSides);
    document.getElementById('chessAgainBtn').addEventListener('click', startChess);
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Gomoku & Go ---------------- */

  /* The goban has no per-point elements, so the intersection is derived from
     wherever the click landed inside the grid. A click further than about half
     a cell from any intersection is ignored rather than snapped to one. */
  function boardPoint(el, n, e) {
    const grid = el.querySelector('.ggrid');
    if (!grid || n < 2) return -1;
    const r = grid.getBoundingClientRect();
    const cell = r.width / (n - 1);
    const c = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    const row = Math.round(((e.clientY - r.top) / r.height) * (n - 1));
    if (c < 0 || c > n - 1 || row < 0 || row > n - 1) return -1;
    if (Math.hypot(e.clientX - (r.left + c * cell), e.clientY - (r.top + row * cell)) > cell * 0.6) return -1;
    return row * n + c;
  }

  function boardPlayers() {
    return selected.map(id => Store.getPlayer(id)).filter(Boolean);
  }
  function boardPlayerOf(col) {
    return boardPlayers()[boardSides[0] === col ? 0 : 1] || {};
  }
  const sideName = col => (col === 'b' ? 'Black' : 'White');

  const WHY_TEXT = {
    occupied: 'That point is already taken',
    suicide: 'Suicide — that stone would have no liberties',
    ko: 'Ko — you have to play elsewhere first',
    over: 'The game is already over',
    off: 'Off the board'
  };

  /* A rejected point shakes the board and flashes why, instead of the click
     silently doing nothing. */
  function rejectBoard(reason) {
    if (reduceMotion) return;
    const board = document.getElementById('goban');
    const stEl = document.getElementById('boardStatus');
    if (board) {
      board.classList.remove('reject');
      void board.offsetWidth;                 // restart the animation
      board.classList.add('reject');
      setTimeout(() => board.classList.remove('reject'), 420);
    }
    if (!stEl) return;
    stEl.textContent = WHY_TEXT[reason] || 'Not allowed there';
    stEl.classList.remove('nope');
    void stEl.offsetWidth;
    stEl.classList.add('nope');
    setTimeout(() => {
      stEl.classList.remove('nope');
      if (goState) refreshGo(); else if (gomokuState) refreshGomoku();
    }, 1250);
  }

  /* Deltas that send each captured stone into the bowl of whoever took it. */
  function captureFly(color, taken, n) {
    if (reduceMotion) return null;
    const grid = document.getElementById('ggrid');
    const panel = document.getElementById('bpanel' + (boardSides[0] === color ? 0 : 1));
    if (!grid || !panel) return null;
    const r = grid.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const cell = r.width / (n - 1);
    const tx = p.left + p.width / 2;
    const ty = p.top + p.height / 2;
    const out = {};
    taken.forEach(i => {
      out[i] = {
        x: Math.round(tx - (r.left + (i % n) * cell)),
        y: Math.round(ty - (r.top + ((i / n) | 0) * cell))
      };
    });
    return out;
  }

  /* Fade the board away before swapping in the scoreboard. */
  function leaveBoardScreen(done) {
    const screen = document.querySelector('.board-screen');
    if (!screen || reduceMotion) { done(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(done, LEAVE_MS);
  }

  /* Count the game out loud: flood the territory, then hand over to the board. */
  function endGoGame() {
    if (!goState) return;
    if (reduceMotion) { leaveBoardScreen(finishGo); return; }
    UI.showGoTerritory(goState, () => leaveBoardScreen(finishGo));
  }

  function showBoardSetup(m) {
    UI.boardSetup(m, String(boardSize[m]));
    document.querySelectorAll('[data-size]').forEach(card => {
      card.addEventListener('click', () => {
        boardSize[m] = Number(card.dataset.size);
        showBoardSetup(m);
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => {
      if (m === 'go') startGo(boardSize.go); else startGomoku(boardSize.gomoku);
    });
  }

  /* ---------------- Gomoku ---------------- */
  function startGomoku(size) {
    const players = boardPlayers();
    if (players.length !== 2) { showHome(); return; }
    clearMathTimers();
    boardSides = Math.random() < 0.5 ? ['b', 'w'] : ['w', 'b'];   // black still moves first
    gomokuState = Gomoku.start(size);
    goState = null;
    boardBusy = false;
    UI.gomokuGame(gomokuState, players, boardSides);
    bindHome();

    const el = document.getElementById('goban');
    if (el) el.addEventListener('click', e => {
      const st = gomokuState;
      if (boardBusy || !st || st.status !== 'playing') return;
      const i = boardPoint(e.currentTarget, st.size, e);
      if (i < 0) return;
      const why = Gomoku.whyNot(st, i);
      if (why) { rejectBoard(why); return; }
      Gomoku.place(st, i);
      refreshGomoku();
      if (st.status !== 'playing') {
        boardBusy = true;
        // let the winning run pop stone by stone before handing over
        setTimeout(() => leaveBoardScreen(finishGomoku), anim(1300));
      }
    });

    refreshGomoku();
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function refreshGomoku() {
    const st = gomokuState;
    if (!st) return;
    UI.syncStones(st.board, st.size, st.last);
    UI.markWinLine(st.winLine);    const turnEl = document.getElementById('boardTurn');
    if (turnEl) turnEl.innerHTML = '<i class="disc ' + st.turn + '"></i>';
    document.querySelectorAll('.duel-head .mpanel').forEach((el, pi) => {
      el.classList.toggle('on', boardSides[pi] === st.turn);
    });
    const stEl = document.getElementById('boardStatus');
    if (stEl) {
      if (st.status === 'win') stEl.textContent = boardPlayerOf(st.winner).name + ' wins — five in a row';
      else if (st.status === 'draw') stEl.textContent = 'The board is full — a draw';
      else stEl.textContent = boardPlayerOf(st.turn).name + ' to play';
    }
  }

  function finishGomoku() {
    const st = gomokuState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Gomoku.finish(st);
    const players = boardPlayers();
    boardSides.forEach((col, pi) => {
      const me = players[pi];
      if (!me) return;
      const opp = players[1 - pi];
      const s = res.scores[col];
      Store.recordGame(me.id, {
        mode: 'gomoku',
        difficulty: st.size + 'x' + st.size,
        points: s.points,
        seconds: res.seconds,
        opponent: opp ? opp.name : '',
        myScore: s.stones,
        oppScore: s.conceded,
        outcome: res.status === 'draw' ? 'draw' : (res.winner === col ? 'win' : 'lose')
      });
    });
    UI.gomokuResult(st, res, players, boardSides);
    document.getElementById('againBtn').addEventListener('click', () => startGomoku(st.size));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Go ---------------- */
  function startGo(size) {
    const players = boardPlayers();
    if (players.length !== 2) { showHome(); return; }
    clearMathTimers();
    boardSides = Math.random() < 0.5 ? ['b', 'w'] : ['w', 'b'];
    goState = Go.start(size);
    gomokuState = null;
    boardBusy = false;
    UI.goGame(goState, players, boardSides);
    bindHome();

    const el = document.getElementById('goban');
    if (el) el.addEventListener('click', e => {
      const st = goState;
      if (boardBusy || !st || st.status !== 'playing') return;
      const i = boardPoint(e.currentTarget, st.size, e);
      if (i < 0) return;
      const why = Go.whyNot(st, i);
      if (why) { rejectBoard(why); return; }
      const mv = Go.place(st, i);
      refreshGo(mv.taken.length ? captureFly(mv.color, mv.taken, st.size) : null);
    });

    const passBtn = document.getElementById('passBtn');
    if (passBtn) passBtn.addEventListener('click', () => {
      const st = goState;
      if (boardBusy || !st || st.status !== 'playing') return;
      const r = Go.pass(st);
      refreshGo();
      if (r.ended) { boardBusy = true; endGoGame(); }
    });

    const resignBtn = document.getElementById('resignBtn');
    if (resignBtn) resignBtn.addEventListener('click', () => {
      const st = goState;
      if (boardBusy || !st || st.status !== 'playing') return;
      Go.resign(st, st.turn);
      refreshGo();
      boardBusy = true;
      endGoGame();
    });

    refreshGo();
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function refreshGo(fly) {
    const st = goState;
    if (!st) return;
    UI.syncStones(st.board, st.size, st.last, fly);
    const turnEl = document.getElementById('boardTurn');
    if (turnEl) turnEl.innerHTML = '<i class="disc ' + st.turn + '"></i>';
    document.querySelectorAll('.duel-head .mpanel').forEach((el, pi) => {
      el.classList.toggle('on', boardSides[pi] === st.turn);
    });

    // live area estimate — Chinese area scoring, komi to white
    const a = Go.area(st);
    const black = a.black, white = a.white + Go.KOMI;
    const sbB = document.getElementById('sbB');
    const sbW = document.getElementById('sbW');
    const sbFill = document.getElementById('sbFill');
    if (sbB) sbB.textContent = 'Black ' + black;
    if (sbW) sbW.textContent = 'White ' + white;
    if (sbFill) sbFill.style.width = ((black / Math.max(1, black + white)) * 100) + '%';

    const stEl = document.getElementById('boardStatus');
    if (stEl) {
      if (st.status === 'ended') {
        const r = st.result;
        stEl.textContent = boardPlayerOf(r.winner).name +
          (r.resign ? ' wins by resignation' : ' wins by ' + r.margin);
      } else {
        stEl.textContent = boardPlayerOf(st.turn).name + ' to play' +
          (st.captures.b || st.captures.w ? ' · captures ' + st.captures.b + ':' + st.captures.w : '') +
          (st.passes === 1 ? ' · one pass played, pass again to end' : '');
      }
    }
  }

  function finishGo() {
    const st = goState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Go.finish(st);
    const r = res.result;
    const players = boardPlayers();
    const round1 = v => Math.round(v * 10) / 10;      // komi leaves a .5 on white
    boardSides.forEach((col, pi) => {
      const me = players[pi];
      if (!me) return;
      const opp = players[1 - pi];
      const s = res.scores[col];
      Store.recordGame(me.id, {
        mode: 'go',
        difficulty: st.size + 'x' + st.size,
        points: s.points,
        seconds: res.seconds,
        opponent: opp ? opp.name : '',
        myScore: round1(s.area),
        oppScore: round1(s.conceded),
        outcome: r.winner === col ? 'win' : 'lose'
      });
    });
    UI.goResult(st, res, players, boardSides);
    document.getElementById('againBtn').addEventListener('click', () => startGo(st.size));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Word Stack ---------------- */

  const WS_LEAVE_MS = 260;
  const WS_WHY = {
    clash: 'Letters have to match exactly where the tiles overlap',
    lonely: 'It has to touch a tile that is already on the board',
    off: 'That would run off the board',
    flat: 'Every letter would sit on an existing tile — it has to add a new one',
    gone: 'That tile is already down',
    over: 'The game is already over'
  };

  function clearWsTimers() {
    if (wsTickId) { cancelAnimationFrame(wsTickId); wsTickId = null; }
    if (wsZoomTween) { cancelAnimationFrame(wsZoomTween); wsZoomTween = null; }
    clearTimeout(wsPassTimer);
    wsPassTimer = null;
    clearTimeout(wsSayId);
    wsSayId = null;
    wsCancelDrag();
    wsPointers.clear();
    wsPan = null;
    wsPinch = null;
  }

  /* Board size first, like the other board games. */
  function showWordStackSetup() {
    UI.wordstackSetup(wsLevel);
    document.querySelectorAll('[data-wlevel]').forEach(card => {
      card.addEventListener('click', () => {
        wsLevel = card.dataset.wlevel;
        showWordStackSetup();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startWordStack(wsLevel));
  }

  function startWordStack(level) {
    const players = boardPlayers();
    if (players.length !== 2) { showHome(); return; }
    clearWsTimers();
    wordstackState = WordStack.start(level || wsLevel);
    wsLevel = wordstackState.level;
    wsZoom = 1;
    wsBase = null;
    boardBusy = false;
    UI.wordstackGame(wordstackState, players);
    bindWordStack();
    bindHome();
    wsFitBoard();
    wsApplyZoom();
    refreshWordStack();
    startTimer();
    wsBeginTurn();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindWordStack() {
    const body = document.querySelector('.ws-body');
    if (!body) return;
    body.addEventListener('pointerdown', wsDown);
    body.addEventListener('contextmenu', e => {
      const chip = e.target.closest('.ws-tile');
      if (!chip) return;
      e.preventDefault();
      wsRotate(Number(chip.dataset.tile));
    });
    [0, 1].forEach(pi => {
      const pass = document.getElementById('wsPass' + pi);
      if (pass) pass.addEventListener('click', () => wsPassTurn(false));
    });
    const endBtn = document.getElementById('wsEndBtn');
    if (endBtn) endBtn.addEventListener('click', wsEndGame);
    const zin = document.getElementById('wsZoomIn');
    if (zin) zin.addEventListener('click', () => wsZoomGo(wsZoom * 1.28, null));
    const zout = document.getElementById('wsZoomOut');
    if (zout) zout.addEventListener('click', () => wsZoomGo(wsZoom / 1.28, null));
    const zfit = document.getElementById('wsZoomFit');
    if (zfit) zfit.addEventListener('click', wsZoomFit);
    bindWsGestures();
  }

  /* ---------------- board zoom & pan ---------------- */

  /* ---- zooming ----------------------------------------------------------
     Re-laying out a 40 x 40 board costs ~170 ms, so the grid is never resized.
     Its natural size is measured once, a stage is sized to natural x zoom to
     carry the scroll range, and the grid itself is just scaled with a
     composited transform. Every frame of a zoom is therefore cheap. */

  /* Fit the base cell size to the board box. Written as a plain pixel value so
     that nothing inside depends on container units — those made every zoom
     frame re-resolve all 1600 cells. */
  function wsFitBoard() {
    const wrap = document.getElementById('wsBoardWrap');
    const grid = document.getElementById('wsGrid');
    const st = wordstackState;
    if (!wrap || !grid || !st) return;
    const gap = 2, pad = 4;
    const byW = (wrap.clientWidth - pad - (st.cols - 1) * gap) / st.cols;
    const byH = (wrap.clientHeight - pad - (st.rows - 1) * gap) / st.rows;
    const cell = Math.max(7, Math.min(34, Math.min(byW, byH)));
    grid.style.setProperty('--cell', cell.toFixed(2) + 'px');
    wsBase = null;                       // the natural size changed
  }

  function wsNatural() {
    const grid = document.getElementById('wsGrid');
    if (!grid) return null;
    if (!wsBase || !wsBase.w) wsBase = { w: grid.offsetWidth, h: grid.offsetHeight };
    return wsBase;
  }

  function wsApplyZoom() {
    const stage = document.getElementById('wsStage');
    const grid = document.getElementById('wsGrid');
    if (!grid) return;
    const n = wsNatural();
    if (stage && n) {
      stage.style.width = Math.round(n.w * wsZoom) + 'px';
      stage.style.height = Math.round(n.h * wsZoom) + 'px';
    }
    grid.style.transform = Math.abs(wsZoom - 1) < 0.001 ? '' : 'scale(' + wsZoom.toFixed(4) + ')';
    const lab = document.getElementById('wsZoomLevel');
    if (lab) lab.textContent = Math.round(wsZoom * 100) + '%';
  }

  const wsClampZoom = z => Math.min(WS_ZOOM_MAX, Math.max(WS_ZOOM_MIN, z));

  /* Where the board sits under `anchor` right now, so a zoom keeps that spot
     pinned instead of sliding the board around. */
  function wsAnchorOf(wrap, anchor) {
    const rect = wrap.getBoundingClientRect();
    const ax = anchor ? anchor.x - rect.left : wrap.clientWidth / 2;
    const ay = anchor ? anchor.y - rect.top : wrap.clientHeight / 2;
    return { ax: ax, ay: ay, cx: wrap.scrollLeft + ax, cy: wrap.scrollTop + ay, base: wsZoom };
  }

  function wsZoomPaint(z, s) {
    wsZoom = z;
    wsApplyZoom();
    const wrap = document.getElementById('wsBoardWrap');
    if (!wrap || !s) return;
    const k = z / s.base;
    wrap.scrollLeft = s.cx * k - s.ax;
    wrap.scrollTop = s.cy * k - s.ay;
  }

  /* Direct zoom — pinch uses this so the board tracks the fingers exactly. */
  function wsSetZoom(z, anchor) {
    const wrap = document.getElementById('wsBoardWrap');
    if (!wrap) return;
    const goal = wsClampZoom(z);
    if (Math.abs(goal - wsZoom) < 0.002) return;
    if (wsZoomTween) { cancelAnimationFrame(wsZoomTween); wsZoomTween = null; }
    wsZoomPaint(goal, wsAnchorOf(wrap, anchor));
  }

  /* Animated zoom — the buttons and Ctrl-scroll glide instead of jumping. */
  function wsZoomGo(z, anchor) {
    const wrap = document.getElementById('wsBoardWrap');
    if (!wrap) return;
    const goal = wsClampZoom(z);
    const from = wsZoom;
    if (wsZoomTween) { cancelAnimationFrame(wsZoomTween); wsZoomTween = null; }
    if (Math.abs(goal - from) < 0.004) return;
    if (reduceMotion) { wsZoomPaint(goal, wsAnchorOf(wrap, anchor)); return; }
    const s = wsAnchorOf(wrap, anchor);
    const t0 = performance.now(), dur = 200;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);              // easeOutCubic
      wsZoomPaint(from + (goal - from) * e, s);
      wsZoomTween = p < 1 ? requestAnimationFrame(step) : null;
    };
    wsZoomTween = requestAnimationFrame(step);
  }

  function wsZoomFit() {
    wsZoomGo(1, null);
    const wrap = document.getElementById('wsBoardWrap');
    if (!wrap) return;
    setTimeout(() => {
      if (wordstackState && !wsZoomTween) {
        wrap.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }, reduceMotion ? 0 : 210);
  }

  /* the base size depends on how big the board box is, so re-measure on resize */
  function wsOnResize() {
    if (tactaState) {
      tcFitBoard();
      tcApplyZoom();
    }
    if (wordstackState) {
      wsFitBoard();
      wsApplyZoom();
    }
    fitActiveGame();
  }

  function bindWsGestures() {
    const wrap = document.getElementById('wsBoardWrap');
    if (!wrap) return;
    const mid = () => {
      const p = Array.from(wsPointers.values());
      return { mid: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 },
               dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
    };

    wrap.addEventListener('pointerdown', e => {
      wsPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (wsPointers.size === 1) {
        wsPan = { sx: e.clientX, sy: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop };
      } else if (wsPointers.size === 2) {
        wsPan = null;
        wsCancelDrag();                                   // two fingers means zoom, not place
        const m = mid();
        wsPinch = { dist: m.dist, mid: m.mid, zoom: wsZoom };
        wrap.classList.add('zooming');
      }
    });

    wrap.addEventListener('pointermove', e => {
      if (!wsPointers.has(e.pointerId)) return;
      wsPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (wsPointers.size >= 2 && wsPinch) {
        const m = mid();
        if (wsPinch.dist > 8) {
          wsSetZoom(wsPinch.zoom * (m.dist / wsPinch.dist), m.mid);
        }
        e.preventDefault();
      } else if (wsPan && wsPointers.size === 1) {
        const dx = e.clientX - wsPan.sx;
        const dy = e.clientY - wsPan.sy;
        if (!wsPan.on && Math.hypot(dx, dy) > 4) { wsPan.on = true; wrap.classList.add('grabbing'); }
        if (wsPan.on) {
          wrap.scrollLeft = wsPan.sl - dx;
          wrap.scrollTop = wsPan.st - dy;
        }
      }
    });

    const release = e => {
      wsPointers.delete(e.pointerId);
      if (wsPointers.size < 2) { wsPinch = null; wrap.classList.remove('zooming'); }
      if (!wsPointers.size) { wsPan = null; wrap.classList.remove('grabbing'); }
    };
    wrap.addEventListener('pointerup', release);
    wrap.addEventListener('pointercancel', release);
    wrap.addEventListener('lostpointercapture', release);

    /* desktop: Ctrl/Cmd + wheel zooms smoothly, plain wheel scrolls as usual */
    wrap.addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      wsZoomGo(wsZoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), { x: e.clientX, y: e.clientY });
    }, { passive: false });
  }

  function refreshWordStack(fresh) {
    const st = wordstackState;
    if (!st) return;
    UI.wsPaint(st, fresh || []);
    UI.wsTrays(st, boardPlayers());
  }

  /* Turn a tray tile 90°. Called on a tap/click, on right-click, and by the
     keyboard shortcut below. */
  function wsRotate(id) {
    const st = wordstackState;
    if (!st || st.status !== 'playing' || boardBusy || wsDrag) return;
    const t = st.tiles[id];
    if (!t || t.placed || t.owner !== st.turn) return;
    WordStack.rotate(st, id);
    UI.wsTrays(st, boardPlayers());
    const chip = document.querySelector('.ws-tile[data-tile="' + id + '"]');
    if (chip && !reduceMotion) {
      chip.classList.remove('flash');
      void chip.offsetWidth;
      chip.classList.add('flash');
      setTimeout(() => chip.classList.remove('flash'), 340);
    }
    wsSay(t.word + (t.vertical ? ' turned upright' : ' turned sideways'), false);
  }

  /* Board geometry measured from real cells, so the ghost lines up with the
     grid whatever the gap or padding turns out to be. */
  function wsGeom(st) {
    const grid = document.getElementById('wsGrid');
    if (!grid || grid.children.length < 2) return null;
    const a = grid.children[0].getBoundingClientRect();
    const b = grid.children[1].getBoundingClientRect();
    const d = grid.children[Math.min(st.cols, grid.children.length - 1)].getBoundingClientRect();
    return { a: a, pitchX: b.left - a.left, pitchY: d.top - a.top, size: a.width };
  }

  function wsDown(e) {
    const st = wordstackState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    if (e.button !== 0) return;                 // right button belongs to contextmenu
    const chip = e.target.closest('.ws-tile');
    if (!chip || chip.disabled) return;
    const id = Number(chip.dataset.tile);
    const t = st.tiles[id];
    if (!t || t.placed || t.owner !== st.turn) return;
    const geom = wsGeom(st);
    if (!geom) return;
    e.preventDefault();

    /* the letter they grabbed stays under the finger */
    const parts = Array.from(chip.children);
    let grab = 0;
    for (let k = 0; k < parts.length; k++) {
      const b = parts[k].getBoundingClientRect();
      if (t.vertical ? (e.clientY >= b.top && e.clientY < b.bottom)
                     : (e.clientX >= b.left && e.clientX < b.right)) grab = k;
    }

    const n = t.word.length;
    const g = document.createElement('div');
    g.className = 'ws-ghost o' + t.owner + (t.vertical ? ' vert' : '');
    g.style.setProperty('--cell', geom.size + 'px');
    g.innerHTML = t.word.split('').map((ch, k) =>
      '<span class="ws-l' + (k === 0 ? ' wsend-a' : (k === n - 1 ? ' wsend-b' : '')) + '">' + ch + '</span>'
    ).join('');
    g.style.left = (e.clientX - geom.size / 2) + 'px';
    g.style.top = (e.clientY - geom.size / 2) + 'px';
    document.body.appendChild(g);

    wsDrag = {
      id: id, grab: grab, sx: e.clientX, sy: e.clientY, moved: 0,
      origin: null, valid: false, reason: '', cells: [], ghost: g
    };
    chip.classList.add('holding');
    document.addEventListener('pointermove', wsMove);
    document.addEventListener('pointerup', wsUp);
    document.addEventListener('pointercancel', wsUp);
  }

  function wsMove(e) {
    const d = wsDrag, st = wordstackState;
    if (!d || !st) return;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    const t = st.tiles[d.id];
    const geom = wsGeom(st);
    if (!t || !geom) return;

    const col = Math.round((e.clientX - geom.a.left) / geom.pitchX - 0.5);
    const row = Math.round((e.clientY - geom.a.top) / geom.pitchY - 0.5);
    const c0 = col - (t.vertical ? 0 : d.grab);
    const r0 = row - (t.vertical ? d.grab : 0);
    const chk = WordStack.canPlace(st, d.id, r0, c0, t.vertical);

    d.origin = { r: r0, c: c0 };
    d.valid = chk.ok;
    d.reason = chk.reason;
    d.cells = WordStack.insideOf(st, chk.cells || []);
    UI.wsPreview(st, d.cells, chk.ok);

    /* snap the tile onto the grid so the drop reads before it is released */
    d.ghost.style.left = (geom.a.left + (t.vertical ? col : c0) * geom.pitchX) + 'px';
    d.ghost.style.top = (geom.a.top + (t.vertical ? r0 : row) * geom.pitchY) + 'px';
  }

  function wsCancelDrag() {
    const d = wsDrag;
    if (!d) return;
    document.removeEventListener('pointermove', wsMove);
    document.removeEventListener('pointerup', wsUp);
    document.removeEventListener('pointercancel', wsUp);
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    const chip = document.querySelector('.ws-tile[data-tile="' + d.id + '"]');
    if (chip) chip.classList.remove('holding');
    wsDrag = null;
    if (wordstackState) UI.wsPreview(wordstackState, [], false);
  }

  function wsUp() {
    const d = wsDrag;
    if (!d) return;
    document.removeEventListener('pointermove', wsMove);
    document.removeEventListener('pointerup', wsUp);
    document.removeEventListener('pointercancel', wsUp);
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    const chip = document.querySelector('.ws-tile[data-tile="' + d.id + '"]');
    if (chip) chip.classList.remove('holding');
    wsDrag = null;

    const st = wordstackState;
    if (st) UI.wsPreview(st, [], false);
    if (!st || st.status !== 'playing' || boardBusy) return;

    if (d.moved < 9) { wsRotate(d.id); return; }         // a plain tap turns the tile 90°
    if (!d.valid) { wsReject(d.id, d.reason); return; }
    const t = st.tiles[d.id];
    const res = WordStack.place(st, d.id, d.origin.r, d.origin.c, t.vertical);
    if (!res || !res.ok) { wsReject(d.id, (res && res.reason) || d.reason); return; }

    stopWsTick();
    refreshWordStack(res.cells);
    wsSay(res.overlap > 1
      ? res.overlap + ' letters matched — ' + (boardPlayers()[st.turn] || {}).name + '\'s turn'
      : 'Placed — back to ' + ((boardPlayers()[st.turn] || {}).name || 'the other player'), false);
    if (st.status !== 'playing') { wsFinishSoon(); return; }
    wsBeginTurn();
  }

  function wsReject(id, reason) {
    const chip = document.querySelector('.ws-tile[data-tile="' + id + '"]');
    if (chip && !reduceMotion) {
      chip.classList.remove('nope');
      void chip.offsetWidth;
      chip.classList.add('nope');
      setTimeout(() => chip.classList.remove('nope'), 460);
    }
    wsSay(WS_WHY[reason] || 'That does not fit there', true);
  }

  function wsIdleStatus() {
    const st = wordstackState;
    const el = document.getElementById('wsStatus');
    if (!el || !st) return;
    if (st.status !== 'playing') { el.textContent = ''; return; }
    const name = (boardPlayers()[st.turn] || {}).name || '—';
    el.textContent = name + ' to play · tap a tile to turn it, drag it to place it';
  }

  function wsSay(text, nope) {
    const el = document.getElementById('wsStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('nope');
    if (nope && !reduceMotion) { void el.offsetWidth; el.classList.add('nope'); }
    wsSayUntil = Date.now() + 1500;
    clearTimeout(wsSayId);
    wsSayId = setTimeout(() => {
      el.classList.remove('nope');
      if (wsDrag) return;                    // still mid-drag, leave it be
      wsIdleStatus();
    }, 1500);
  }

  function wsBeginTurn() {
    const st = wordstackState;
    if (!st || st.status !== 'playing') return;
    stopWsTick();
    const players = boardPlayers();
    UI.wsTrays(st, players);
    UI.wsTurn(st, players);
    if (Date.now() >= wsSayUntil) wsIdleStatus();

    if (!WordStack.hasAnyMove(st, st.turn)) {                 // nothing fits: pass for them
      wsSay((players[st.turn] || {}).name + ' has nothing that fits — passing', false);
      clearTimeout(wsPassTimer);
      wsPassTimer = setTimeout(() => wsPassTurn(true), anim(950));
      return;
    }
    wsStartTick();
  }

  function wsStartTick() {
    stopWsTick();
    wsEndsAt = Date.now() + WordStack.TURN_MS;
    const wsLowFrom = Math.max(2500, Math.round(WordStack.TURN_MS * 0.25));
    const step = () => {
      const st = wordstackState;
      if (!st || st.status !== 'playing' || boardBusy) return;
      const left = Math.max(0, wsEndsAt - Date.now());
      const bar = document.getElementById('wsBar');
      const num = document.getElementById('wsTimerNum');
      if (bar) {
        bar.style.width = (left / WordStack.TURN_MS) * 100 + '%';
        bar.classList.toggle('low', left <= wsLowFrom);
      }
      if (num) num.textContent = (left / 1000).toFixed(1);
      if (left <= 0) { wsPassTurn(true); return; }            // out of time
      wsTickId = requestAnimationFrame(step);
    };
    wsTickId = requestAnimationFrame(step);
  }

  function stopWsTick() {
    if (wsTickId) { cancelAnimationFrame(wsTickId); wsTickId = null; }
  }

  /* Both players agree the board has beaten them: stop and settle on what is
     left in the trays. */
  function wsEndGame() {
    const st = wordstackState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    const players = boardPlayers();
    const left = [WordStack.tray(st, 0).length, WordStack.tray(st, 1).length];
    const msg = 'End the game here?\n\n' +
      (players[0] ? players[0].name : 'Player 1') + ' has ' + left[0] + ' tiles left, ' +
      (players[1] ? players[1].name : 'Player 2') + ' has ' + left[1] + ' tiles left.\n\n' +
      'The player with fewer tiles left wins.';
    if (!window.confirm(msg)) return;
    stopWsTick();
    clearTimeout(wsPassTimer);
    wsCancelDrag();
    if (!WordStack.end(st)) return;
    wsSay('Game ended by agreement — settling on tiles left', false);
    wsFinishSoon();
  }

  function wsPassTurn(auto) {
    const st = wordstackState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    clearTimeout(wsPassTimer);
    wsPassTimer = null;
    stopWsTick();
    wsCancelDrag();
    const players = boardPlayers();
    const mover = st.turn;
    const res = WordStack.pass(st);
    if (!res) return;
    wsSay(auto
      ? (players[mover] || {}).name + ' ran out of time — passing'
      : (players[mover] || {}).name + ' passed', auto);
    if (st.status !== 'playing') { wsFinishSoon(); return; }
    wsBeginTurn();
  }

  function wsFinishSoon() {
    const st = wordstackState;
    if (!st || boardBusy) return;
    boardBusy = true;
    stopWsTick();
    clearTimeout(wsPassTimer);
    clearTimeout(wsSayId);
    wsCancelDrag();
    stopTimer();
    const el = document.getElementById('wsStatus');
    if (el) {
      el.classList.remove('nope');
      el.textContent = st.status === 'draw'
        ? 'A draw!'
        : (boardPlayers()[st.winner] || {}).name + ' wins!';
    }
    setTimeout(() => leaveWsScreen(finishWordStack), anim(1000));
  }

  function leaveWsScreen(done) {
    const screen = document.querySelector('.ws-screen');
    if (!screen || reduceMotion) { done(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(done, WS_LEAVE_MS);
  }

  function finishWordStack() {
    const st = wordstackState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = WordStack.finish(st);
    const players = boardPlayers();
    [0, 1].forEach(pi => {
      const me = players[pi];
      if (!me) return;
      const opp = players[1 - pi];
      const s = res.scores[pi];
      Store.recordGame(me.id, {
        mode: 'wordstack',
        difficulty: st.cols + 'x' + st.rows,
        points: s.points,
        seconds: res.seconds,
        opponent: opp ? opp.name : '',
        myScore: s.placed,
        oppScore: res.scores[1 - pi].placed,
        outcome: res.status === 'draw' ? 'draw' : (res.winner === pi ? 'win' : 'lose')
      });
    });
    UI.wordstackResult(st, res, players);
    document.getElementById('againBtn').addEventListener('click', () => startWordStack(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Minesweeper ---------------- */

  /* A short shake, used when a mine goes off. */
  function shakeEl(el) {
    if (!el || reduceMotion) return;
    el.classList.remove('shake');
    void el.offsetWidth;                 // restart the animation
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 480);
  }

  function showMineDifficulty() {
    UI.mineDifficulty(mineLevel);
    document.querySelectorAll('[data-mlevel]').forEach(card => {
      card.addEventListener('click', () => {
        mineLevel = card.dataset.mlevel;
        showMineDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startMine(mineLevel));
  }

  function startMine(level) {
    const me = selected.map(id => Store.getPlayer(id)).filter(Boolean)[0];
    if (!me) { showHome(); return; }
    clearMathTimers();
    stopTimer();
    accumulated = 0;
    startedAt = Date.now();
    mineState = Mine.start(level);
    mineLevel = mineState.level;
    flagMode = false;
    boardBusy = false;
    UI.mineGame(mineState);
    bindMine();
    bindHome();
    mineFit();
    refreshMine();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindMine() {
    const grid = document.getElementById('minegrid');
    if (!grid) return;
    grid.addEventListener('click', e => {
      const btn = e.target.closest('.mc');
      if (btn) digMine(Number(btn.dataset.i));
    });
    grid.addEventListener('contextmenu', e => {
      e.preventDefault();
      const btn = e.target.closest('.mc');
      if (btn) markMine(Number(btn.dataset.i));
    });

    const face = document.getElementById('mineFace');
    if (face) face.addEventListener('click', () => startMine(mineState ? mineState.level : mineLevel));

    const flagBtn = document.getElementById('flagBtn');
    if (flagBtn) flagBtn.addEventListener('click', () => {
      flagMode = !flagMode;
      flagBtn.textContent = 'Flag mode: ' + (flagMode ? 'on' : 'off');
      flagBtn.classList.toggle('active', flagMode);
    });
  }

  function digMine(i) {
    const st = mineState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    if (flagMode) { markMine(i); return; }        // tapping marks instead of digging

    if (st.open[i]) {                             // a satisfied number opens its neighbours
      const c = Mine.chord(st, i);
      if (c) afterMine(st, c.opened, i, c.boom);
      return;
    }
    if (!st.seeded) startTimer();                 // the clock starts with the first dig
    const res = Mine.open(st, i);
    if (!res) return;
    afterMine(st, res.opened, i, res.boom);
  }

  function markMine(i) {
    const st = mineState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    if (!Mine.flag(st, i)) return;
    refreshMine([i], null);
  }

  /* Play out one dig / chord / blast in the same place. */
  function afterMine(st, opened, at, boom) {
    refreshMine(opened, at);
    if (boom) {
      boardBusy = true;
      stopTimer();
      shakeEl(document.getElementById('minegrid'));
      // the remaining mines surface one after another, sweeping out from the blast
      setTimeout(() => {
        const rest = [];
        for (let i = 0; i < st.size; i++) if (st.mine[i] && i !== st.exploded) rest.push(i);
        refreshMine(rest, st.exploded, true);
      }, anim(400));
      setTimeout(leaveMineScreen, anim(1500));
      return;
    }
    if (st.status === 'won') {
      boardBusy = true;
      stopTimer();
      setTimeout(leaveMineScreen, anim(950));
    }
  }

  function refreshMine(fresh, origin, revealMines) {
    const st = mineState;
    if (!st) return;
    UI.mineSync(st, fresh, origin, revealMines);
    const stEl = document.getElementById('mineStatus');
    if (!stEl) return;
    if (st.status === 'won') stEl.textContent = 'Cleared — every safe square is open.';
    else if (st.status === 'lost') stEl.textContent = 'Boom — that square was mined.';
    else if (!st.seeded) stEl.textContent = 'Pick a square to start; the first one is always safe.';
    else stEl.textContent = st.opened + ' of ' + (st.size - st.mines) + ' safe squares open' +
      (flagMode ? ' · flag mode on' : '');
  }

  function leaveMineScreen() {
    const screen = document.querySelector('.mine-screen');
    if (!screen || reduceMotion) { finishMine(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishMine, LEAVE_MS);
  }

  function finishMine() {
    const st = mineState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Mine.finish(st);
    const me = selected.map(id => Store.getPlayer(id)).filter(Boolean)[0];
    if (me) {
      Store.recordGame(me.id, {
        mode: 'mine',
        difficulty: st.level,
        points: res.score.points,
        seconds: res.seconds,
        correct: res.opened,
        total: res.safe,
        speed: res.score.speed,
        perfect: res.won,
        outcome: res.won ? 'win' : 'lose'
      });
    }
    UI.mineResult(st, res);
    animateScore(res.score.points);
    if (res.won) celebrate();
    document.getElementById('mineAgainBtn').addEventListener('click', () => startMine(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Number Slide & Sudoku ---------------- */

  const mePlaying = () => selected.map(id => Store.getPlayer(id)).filter(Boolean)[0];

  function showSlideDifficulty() {
    UI.slideDifficulty(slideLevel);
    document.querySelectorAll('[data-slevel]').forEach(card => {
      card.addEventListener('click', () => {
        slideLevel = card.dataset.slevel;
        showSlideDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startSlide(slideLevel));
  }

  function startSlide(level) {
    slideState = Slide.start(level);
    slideLevel = slideState.level;
    boardBusy = false;
    UI.slideGame(slideState);
    bindSlide();
    bindHome();
    slideFit();
    UI.slideSync(slideState, null);
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindSlide() {
    const grid = document.getElementById('slideGrid');
    if (grid) {
      grid.addEventListener('click', e => {
        const tile = e.target.closest('.slide-tile');
        if (tile) doSlide(Number(tile.dataset.at));
      });
    }
    const again = document.getElementById('slideNew');
    if (again) again.addEventListener('click', () => startSlide(slideState ? slideState.level : slideLevel));
  }

  function doSlide(i) {
    const st = slideState;
    if (!st || st.status !== 'playing') return;
    const res = Slide.slide(st, i);
    if (!res.moved) {
      const el = document.querySelector('.slide-tile[data-at="' + i + '"]');
      if (el) shakeEl(el);
      return;
    }
    UI.slideSync(st, res);
    if (res.solved) leaveSlideScreen();
  }

  /* The arrow keys push the number beside the gap in the direction pressed. */
  function slideStep(dr, dc) {
    const st = slideState;
    if (!st || st.status !== 'playing') return false;
    const res = Slide.step(st, dr, dc);
    if (!res.moved) return true;                 // still our key, just nothing to move
    UI.slideSync(st, res);
    if (res.solved) leaveSlideScreen();
    return true;
  }

  function leaveSlideScreen() {
    const screen = document.querySelector('.slide-screen');
    if (!screen || reduceMotion) { finishSlide(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishSlide, LEAVE_MS);
  }

  function finishSlide() {
    const st = slideState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Slide.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'slide',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.home,
        total: res.total,
        speed: res.speed,
        perfect: res.solved,
        myScore: res.moves,
        outcome: res.solved ? 'win' : 'lose'
      });
    }
    UI.slideResult(st, res);
    animateScore(res.points);
    if (res.solved) celebrate();
    document.getElementById('slideAgainBtn').addEventListener('click', () => startSlide(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function showSudokuDifficulty() {
    UI.sudokuDifficulty(suLevel);
    document.querySelectorAll('[data-sulevel]').forEach(card => {
      card.addEventListener('click', () => {
        suLevel = card.dataset.sulevel;
        showSudokuDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startSudoku(suLevel));
  }

  function startSudoku(level) {
    suState = Sudoku.start(level);
    suLevel = suState.level;
    boardBusy = false;
    UI.sudokuGame(suState);
    suState.sel = Sudoku.firstEmpty(suState);
    suFit();
    UI.sudokuSync(suState);
    bindSudoku();
    bindHome();
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindSudoku() {
    const grid = document.getElementById('suGrid');
    if (grid) {
      grid.addEventListener('click', e => {
        const cell = e.target.closest('.su-c');
        if (!cell) return;
        const i = Number(cell.dataset.i);
        if (suState && suState.given[i]) { Sudoku.select(suState, i); UI.sudokuSync(suState); return; }
        Sudoku.select(suState, i);
        UI.sudokuSync(suState);
      });
    }
    const pad = document.getElementById('suPad');
    if (pad) {
      pad.addEventListener('click', e => {
        const key = e.target.closest('.su-key');
        if (key) writeSudoku(Number(key.dataset.v));
      });
    }
    const notes = document.getElementById('suNotes');
    if (notes) notes.addEventListener('click', () => {
      if (!suState) return;
      Sudoku.toggleNotes(suState);
      UI.sudokuSync(suState);
    });
    const again = document.getElementById('suNew');
    if (again) again.addEventListener('click', () => startSudoku(suState ? suState.level : suLevel));
  }

  function writeSudoku(v) {
    const st = suState;
    if (!st || st.status !== 'playing') return;
    if (st.sel < 0) return;
    if (!Sudoku.set(st, st.sel, v)) return;
    UI.sudokuSync(st);
    if (st.status === 'solved') leaveSudokuScreen();
  }

  /* Arrow keys walk the selection; they never wrap into the next row. */
  function sudokuMove(dr, dc) {
    const st = suState;
    if (!st) return false;
    const i = st.sel < 0 ? Sudoku.firstEmpty(st) : st.sel;
    if (i < 0) return true;
    const r = (i / 9) | 0, c = i % 9;
    const nr = Math.max(0, Math.min(8, r + dr));
    const nc = Math.max(0, Math.min(8, c + dc));
    Sudoku.select(st, nr * 9 + nc);
    UI.sudokuSync(st);
    return true;
  }

  function leaveSudokuScreen() {
    const screen = document.querySelector('.su-screen');
    if (!screen || reduceMotion) { finishSudoku(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishSudoku, LEAVE_MS);
  }

  function finishSudoku() {
    const st = suState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Sudoku.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'sudoku',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.filled,
        total: res.size,
        speed: res.speed,
        perfect: res.solved && res.clean,
        myScore: Sudoku.filled(st),
        outcome: res.solved ? 'win' : 'lose'
      });
    }
    UI.sudokuResult(st, res);
    animateScore(res.points);
    if (res.solved) celebrate();
    document.getElementById('suAgainBtn').addEventListener('click', () => startSudoku(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---- filling the stage ----
     Each board asks its `.game-stage` how much room it has and sizes itself to
     that, so the layout follows the window instead of a fixed pixel cap. */
  function stageBox() {
    const el = document.getElementById('stage');
    if (!el) return null;
    /* measure what the flex column can give, not the floor an earlier fit left
       behind — otherwise every resize would let the board creep a size bigger */
    el.style.minHeight = '';
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 60) return null;
    return { w: r.width - 4, h: r.height - 4, el: el };
  }

  const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* A board may be allowed to run past the stage it was measured in. When it
     does, the stage has to grow to match — otherwise the board simply paints
     over the buttons underneath it. Measuring the board forces one layout,
     which is cheap enough for something that runs on start and on resize. */
  function growStage(box, board, extra) {
    if (!box || !box.el || !board) return;
    const h = board.getBoundingClientRect().height;
    if (h > 0) box.el.style.minHeight = Math.round(h + (extra || 0)) + 'px';
  }

  /* Whole-pixel cells. A board whose cells land on fractional pixels puts each
     box-shadow grid line at a different sub-pixel offset, so some snap to two
     device pixels and others to one — which reads as random bolding. Dividing
     the space into whole cells fixes it, so every fit works in cell sizes and
     derives the board side from that.

     `chrome` is the board's own padding + gaps + border, which box-sizing
     counts inside the side. */
  const boardSide = (avail, n, chrome, loCell, hiCell) =>
    clampTo(Math.floor((avail - chrome) / n), loCell, hiCell) * n + chrome;

  function g8Fit() {
    const grid = document.getElementById('g8Grid');
    const box = stageBox();
    if (!grid || !box || !g8State) return;
    const n = g8State.n;
    const size = boardSide(Math.min(box.w, box.h * 1.15), n, 6 * n + 10, 44, 188);
    grid.style.setProperty('--size', size + 'px');
    grid.style.setProperty('--g8-font', Math.round((size - 6 * n - 10) / n * 0.44) + 'px');
    growStage(box, grid);
  }

  function suFit() {
    const grid = document.getElementById('suGrid');
    const body = document.querySelector('.su-body');
    const box = stageBox();
    if (!grid || !box) return;
    grid.style.setProperty('--size', boardSide(Math.min(box.w, box.h * 1.1), 9, 4, 24, 78) + 'px');
    growStage(box, body || grid);
  }

  function slideFit() {
    const grid = document.getElementById('slideGrid');
    const box = stageBox();
    if (!grid || !box) return;
    const n = (slideState && slideState.n) || 4;
    grid.style.setProperty('--size', boardSide(Math.min(box.w, box.h * 1.15), n, 3, 52, 150) + 'px');
    growStage(box, grid);
  }

  function ngFit() {
    const wrap = document.getElementById('ngWrap');
    const box = stageBox();
    if (!wrap || !box || !ngState) return;
    const n = ngState.n;
    /* the clue strips take about 2.4 cells, plus the gap that separates them */
    const c = clampTo(Math.floor(Math.min(box.w / (n + 2.7), box.h * 1.1 / (n + 2.7))), 11, 48);
    wrap.style.setProperty('--c', c + 'px');
    growStage(box, wrap);
  }

  function mineFit() {
    const grid = document.getElementById('minegrid');
    const box = stageBox();
    if (!grid || !box || !mineState) return;
    /* readable cells matter more here than a screen that fits, and a wide grid
       has spare width to spend, so let it run further past the stage height */
    const c = clampTo(Math.floor(Math.min(box.w / mineState.cols,
      box.h * 1.45 / mineState.rows) - 2), 18, 34);
    grid.style.setProperty('--cell', c + 'px');
    growStage(box, grid);
  }

  function fitActiveGame() {
    if (g8State) g8Fit();
    if (suState) suFit();
    if (slideState) slideFit();
    if (ngState) ngFit();
    if (mineState) mineFit();
  }

  /* ---------------- Nonogram ---------------- */

  let ngPaint = null;          // { value } while dragging across squares

  function showNonogramDifficulty() {
    UI.nonogramDifficulty(ngLevel);
    document.querySelectorAll('[data-nglevel]').forEach(card => {
      card.addEventListener('click', () => {
        ngLevel = card.dataset.nglevel;
        showNonogramDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startNonogram(ngLevel));
  }

  function startNonogram(level) {
    ngState = Nonogram.start(level);
    ngLevel = ngState.level;
    ngPaint = null;
    boardBusy = false;
    UI.nonogramGame(ngState);
    bindNonogram();
    bindHome();
    ngFit();
    UI.nonogramSync(ngState);
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function ngValueNow(st) {
    return st.mode === 'mark' ? Nonogram.EMPTY : Nonogram.FILLED;
  }

  function ngPaintAt(i, value) {
    const st = ngState;
    if (!st || st.status !== 'playing') return;
    if (!Nonogram.set(st, i, value)) return;
    UI.nonogramSync(st);
    if (st.status === 'solved') leaveNonogramScreen();
  }

  function bindNonogram() {
    const grid = document.getElementById('ngGrid');
    if (grid) {
      grid.addEventListener('pointerdown', e => {
        const cell = e.target.closest('.ng-c');
        if (!cell || !ngState) return;
        e.preventDefault();
        const i = Number(cell.dataset.i);
        const want = ngValueNow(ngState);
        /* a drag paints the opposite of whatever the first square was */
        ngPaint = { value: ngState.marks[i] === want ? Nonogram.UNKNOWN : want };
        ngPaintAt(i, ngPaint.value);
      });
      grid.addEventListener('pointermove', e => {
        if (!ngPaint || !ngState) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el && el.closest ? el.closest('.ng-c') : null;
        if (cell) ngPaintAt(Number(cell.dataset.i), ngPaint.value);
      });
      grid.addEventListener('pointerup', () => { ngPaint = null; });
      grid.addEventListener('pointerleave', () => { ngPaint = null; });
    }
    document.addEventListener('pointerup', () => { ngPaint = null; });
    const mode = document.getElementById('ngMode');
    if (mode) mode.addEventListener('click', () => {
      if (!ngState) return;
      Nonogram.toggleMode(ngState);
      UI.nonogramSync(ngState);
    });
    const hint = document.getElementById('ngHint');
    if (hint) hint.addEventListener('click', ngHint);
    const help = document.getElementById('ngHelp');
    if (help) help.addEventListener('click', () => UI.nonogramHelp());
    const clear = document.getElementById('ngClear');
    if (clear) clear.addEventListener('click', () => {
      if (!ngState) return;
      Nonogram.clearAll(ngState);
      UI.nonogramSync(ngState);
    });
    const again = document.getElementById('ngNew');
    if (again) again.addEventListener('click', () => startNonogram(ngState ? ngState.level : ngLevel));
  }

  /* Hand the player one square the clues already decide. The solver runs on top
     of their own marks, so it never contradicts a correct board and it catches
     a wrong mark instead of papering over it. */
  function ngHint() {
    const st = ngState;
    if (!st || st.status !== 'playing') return;
    const say = document.getElementById('ngStatus');
    const step = Nonogram.solveStep(st);
    if (!step.ok) {
      if (say) {
        say.textContent = step.wrong
          ? 'One of your marks cannot be right — look for numbers that turned red'
          : 'Nothing left to work out — the picture is already correct';
      }
      return;
    }
    st.hints++;
    Nonogram.set(st, step.cell, step.value);
    UI.nonogramSync(st);
    const cell = document.querySelector('#ngGrid .ng-c[data-i="' + step.cell + '"]');
    if (cell && cell.animate && !reduceMotion) {
      cell.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
        { duration: 340, easing: 'ease-out' });
    }
    if (say) {
      const row = ((step.cell / st.n) | 0) + 1, col = (step.cell % st.n) + 1;
      say.textContent = 'Row ' + row + ', column ' + col + ' has to be ' +
        (step.value === Nonogram.FILLED ? 'shaded' : 'left blank');
    }
    if (st.status === 'solved') leaveNonogramScreen();
  }

  function leaveNonogramScreen() {
    const screen = document.querySelector('.ng-screen');
    if (!screen || reduceMotion) { finishNonogram(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishNonogram, LEAVE_MS);
  }

  function finishNonogram() {
    const st = ngState;
    if (!st) return;
    if (st.status === 'playing' && !Nonogram.check(st)) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Nonogram.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'nonogram',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.shaded,
        total: res.total,
        speed: res.speed,
        perfect: res.solved,
        myScore: res.shaded,
        outcome: res.solved ? 'win' : 'lose'
      });
    }
    UI.nonogramResult(st, res);
    animateScore(res.points);
    if (res.solved) celebrate();
    document.getElementById('ngAgainBtn').addEventListener('click', () => startNonogram(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- 2048 ---------------- */

  let g8Swipe = null;

  function showG2048Difficulty() {
    UI.g2048Difficulty(g8Level);
    document.querySelectorAll('[data-g8level]').forEach(card => {
      card.addEventListener('click', () => {
        g8Level = card.dataset.g8level;
        showG2048Difficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startG2048(g8Level));
  }

  function startG2048(level) {
    g8State = G2048.start(level);
    g8Level = g8State.level;
    g8Swipe = null;
    boardBusy = false;
    UI.g2048Game(g8State);
    bindG2048();
    bindHome();
    g8Fit();
    UI.g2048Sync(g8State, null);
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindG2048() {
    const wrap = document.getElementById('g8Grid');
    if (wrap) {
      wrap.addEventListener('pointerdown', e => {
        g8Swipe = { x: e.clientX, y: e.clientY };
      });
      wrap.addEventListener('pointerup', e => {
        if (!g8Swipe) return;
        const dx = e.clientX - g8Swipe.x, dy = e.clientY - g8Swipe.y;
        g8Swipe = null;
        if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
        doG2048Move(Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up'));
      });
      wrap.addEventListener('pointercancel', () => { g8Swipe = null; });
    }
    document.querySelectorAll('.g8-dir').forEach(b => {
      b.addEventListener('click', () => doG2048Move(b.dataset.dir));
    });
    const again = document.getElementById('g8New');
    if (again) again.addEventListener('click', () => startG2048(g8State ? g8State.level : g8Level));
  }

  function doG2048Move(dir) {
    const st = g8State;
    if (!st || st.status !== 'playing') return false;
    const res = G2048.move(st, dir);
    if (!res.moved) return true;
    UI.g2048Sync(st, res);
    const say = document.getElementById('g8Status');
    if (say) {
      say.textContent = res.merged.length
        ? 'Merged ' + res.merged.length + ' tile' + (res.merged.length === 1 ? '' : 's') +
          ' · biggest ' + res.best + ' of ' + st.goal
        : 'Slid · biggest ' + res.best + ' of ' + st.goal;
    }
    if (st.status !== 'playing') leaveG2048Screen();
    return true;
  }

  function leaveG2048Screen() {
    const screen = document.querySelector('.g8-screen');
    if (!screen || reduceMotion) { finishG2048(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishG2048, LEAVE_MS);
  }

  function finishG2048() {
    const st = g8State;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = G2048.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'g2048',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.moves,
        total: res.merges,
        outcome: res.solved ? 'win' : 'lose',
        perfect: res.solved,
        myScore: res.best
      });
    }
    UI.g2048Result(st, res);
    animateScore(res.points);
    if (res.solved) celebrate();
    document.getElementById('g8AgainBtn').addEventListener('click', () => startG2048(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Typing Sprint ---------------- */

  let tyTick = null;

  const clearTyTimers = () => { if (tyTick) { clearInterval(tyTick); tyTick = null; } };

  function showTypingDifficulty() {
    UI.typingDifficulty(tyLevel);
    document.querySelectorAll('[data-tylevel]').forEach(card => {
      card.addEventListener('click', () => {
        tyLevel = card.dataset.tylevel;
        showTypingDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startTyping(tyLevel));
  }

  function startTyping(level) {
    clearTyTimers();
    tyState = Typing.start(level);
    tyLevel = tyState.level;
    boardBusy = false;
    UI.typingGame(tyState);
    bindTyping();
    bindHome();
    UI.typingSync(tyState);
    startTimer();
    /* a light tick keeps the live speed readout honest */
    tyTick = setInterval(() => { if (tyState) UI.typingSync(tyState); }, 500);
    const box = document.getElementById('tyInput');
    if (box) box.focus();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindTyping() {
    const box = document.getElementById('tyInput');
    if (box) {
      box.addEventListener('input', () => {
        const st = tyState;
        if (!st || st.status !== 'playing') return;
        const r = Typing.type(st, box.value);
        if (!r.ok) return;
        UI.typingSync(st);
        const say = document.getElementById('tyStatus');
        if (say) {
          say.textContent = r.errors
            ? r.errors + ' wrong key' + (r.errors === 1 ? '' : 's') + ' so far — ' +
              Math.round(Typing.progress(st) * 100) + '% through'
            : 'Clean so far — ' + Math.round(Typing.progress(st) * 100) + '% through';
        }
        if (st.status === 'done') leaveTypingScreen();
      });
      /* clicking the passage puts the carets back in the invisible box */
      const wrap = document.getElementById('tyWrap');
      if (wrap) wrap.addEventListener('click', () => box.focus());
    }
    const again = document.getElementById('tyNew');
    if (again) again.addEventListener('click', () => startTyping(tyState ? tyState.level : tyLevel));
  }

  function leaveTypingScreen() {
    clearTyTimers();
    const screen = document.querySelector('.ty-screen');
    if (!screen || reduceMotion) { finishTyping(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishTyping, LEAVE_MS);
  }

  function finishTyping() {
    const st = tyState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Typing.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'typing',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.correct,
        total: res.total,
        speed: res.speed,
        perfect: res.clean,
        myScore: Math.round(res.wpm),
        outcome: res.done ? 'win' : 'lose'
      });
    }
    UI.typingResult(st, res);
    animateScore(res.points);
    if (res.done && res.clean) celebrate();
    document.getElementById('tyAgainBtn').addEventListener('click', () => startTyping(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Code Break ---------------- */

  function showCodeBreakDifficulty() {
    UI.codebreakDifficulty(cbLevel);
    document.querySelectorAll('[data-cblevel]').forEach(card => {
      card.addEventListener('click', () => {
        cbLevel = card.dataset.cblevel;
        showCodeBreakDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startCodeBreak(cbLevel));
  }

  function startCodeBreak(level) {
    cbState = CodeBreak.start(level);
    cbLevel = cbState.level;
    boardBusy = false;
    UI.codebreakGame(cbState);
    bindCodeBreak();
    bindHome();
    UI.codebreakSync(cbState);
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function cbSay(text, bad) {
    const el = document.getElementById('cbStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('nope');
    if (bad && !reduceMotion) {
      void el.offsetWidth;
      el.classList.add('nope');
    }
  }

  function cbDigit(d) {
    const st = cbState;
    if (!st || st.status !== 'playing') return;
    if (!CodeBreak.typeDigit(st, d)) {
      cbSay(st.repeats ? 'That row is full' : 'No repeats in this level, and that digit is already used', true);
      return;
    }
    UI.codebreakSync(st);
    cbSay(CodeBreak.filled(st) ? 'Ready — press Guess' : 'Keep going');
  }

  function cbBack() {
    const st = cbState;
    if (!st || st.status !== 'playing') return;
    CodeBreak.backspace(st);
    UI.codebreakSync(st);
  }

  function cbClearRow() {
    const st = cbState;
    if (!st || st.status !== 'playing') return;
    CodeBreak.clearEntry(st);
    UI.codebreakSync(st);
  }

  function cbSubmit() {
    const st = cbState;
    if (!st || st.status !== 'playing') return;
    const r = CodeBreak.submit(st);
    if (!r.ok) {
      cbSay(r.why === 'short' ? 'Fill every slot first' : 'The game is over', true);
      return;
    }
    UI.codebreakSync(st);
    if (r.solved) {
      cbSay('Cracked it!');
      leaveCodeBreakScreen();
      return;
    }
    if (r.lost) {
      cbSay('Out of guesses');
      leaveCodeBreakScreen();
      return;
    }
    cbSay(r.row.bulls + ' in place · ' + r.row.cows + ' in the wrong place · ' +
      (st.maxTries - st.rows.length) + ' guesses left');
  }

  function bindCodeBreak() {
    const pad = document.getElementById('cbPad');
    if (pad) {
      pad.addEventListener('click', e => {
        const key = e.target.closest('.cb-key');
        if (!key) return;
        if (key.dataset.cmd === 'back') cbBack();
        else if (key.dataset.cmd === 'clear') cbClearRow();
        else if (key.dataset.cmd === 'go') cbSubmit();
        else cbDigit(Number(key.dataset.d));
      });
    }
    const again = document.getElementById('cbNew');
    if (again) again.addEventListener('click', () => startCodeBreak(cbState ? cbState.level : cbLevel));
  }

  function leaveCodeBreakScreen() {
    const screen = document.querySelector('.cb-screen');
    if (!screen || reduceMotion) { finishCodeBreak(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishCodeBreak, LEAVE_MS);
  }

  function finishCodeBreak() {
    const st = cbState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = CodeBreak.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'codebreak',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.solved ? res.guesses : 0,
        total: res.maxTries,
        speed: res.speed,
        perfect: res.solved,
        myScore: res.guesses,
        outcome: res.solved ? 'win' : 'lose'
      });
    }
    UI.codebreakResult(st, res);
    animateScore(res.points);
    if (res.solved) celebrate();
    document.getElementById('cbAgainBtn').addEventListener('click', () => startCodeBreak(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Word Ladder ---------------- */

  const LA_WHY = {
    length: 'That is the wrong number of letters',
    same: 'That is the word you are already on',
    used: 'You have already used that word',
    change: 'Change exactly one letter',
    unknown: 'That is not in the word list'
  };

  function showLadderDifficulty() {
    UI.ladderDifficulty(laLevel);
    document.querySelectorAll('[data-lalevel]').forEach(card => {
      card.addEventListener('click', () => {
        laLevel = card.dataset.lalevel;
        showLadderDifficulty();
      });
    });
    document.getElementById('backHome').addEventListener('click', showHome);
    document.getElementById('startBtn').addEventListener('click', () => startLadder(laLevel));
  }

  function startLadder(level) {
    laState = Ladder.start(level);
    laLevel = laState.level;
    boardBusy = false;
    UI.ladderGame(laState);
    bindLadder();
    bindHome();
    startTimer();
    const box = document.getElementById('laInput');
    if (box) box.focus();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function laSay(text, bad) {
    const el = document.getElementById('laStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('nope');
    if (bad && !reduceMotion) {
      void el.offsetWidth;
      el.classList.add('nope');
    }
  }

  function laPlay() {
    const st = laState;
    const box = document.getElementById('laInput');
    if (!st || !box || st.status !== 'playing') return;
    const r = Ladder.play(st, box.value);
    if (!r.ok) { laSay(LA_WHY[r.why] || 'That word will not work', true); return; }
    box.value = '';
    UI.ladderSync(st);
    if (r.solved) {
      laSay('There it is — ' + r.steps + ' steps');
      leaveLadderScreen();
      return;
    }
    laSay('Good — ' + r.steps + ' step' + (r.steps === 1 ? '' : 's') +
      ' so far, ' + st.par + ' is the par');
  }

  function laHint() {
    const st = laState;
    if (!st || st.status !== 'playing') return;
    const r = Ladder.hint(st);
    if (!r.ok) { laSay('Nothing sensible left from here', true); return; }
    UI.ladderSync(st);
    const box = document.getElementById('laInput');
    if (box) box.value = '';
    if (r.solved) { laSay('The hint finished it for you'); leaveLadderScreen(); return; }
    laSay('Added ' + r.word + ' — a hint has been counted');
  }

  function laUndo() {
    const st = laState;
    if (!st || st.status !== 'playing') return;
    if (!Ladder.undo(st)) { laSay('Nothing to undo', true); return; }
    UI.ladderSync(st);
    laSay('Took that rung back');
  }

  function bindLadder() {
    const go = document.getElementById('laGo');
    if (go) go.addEventListener('click', laPlay);
    const box = document.getElementById('laInput');
    if (box) box.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); laPlay(); }
    });
    const hint = document.getElementById('laHint');
    if (hint) hint.addEventListener('click', laHint);
    const undo = document.getElementById('laUndo');
    if (undo) undo.addEventListener('click', laUndo);
    const again = document.getElementById('laNew');
    if (again) again.addEventListener('click', () => startLadder(laState ? laState.level : laLevel));
  }

  function leaveLadderScreen() {
    const screen = document.querySelector('.la-screen');
    if (!screen || reduceMotion) { finishLadder(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(finishLadder, LEAVE_MS);
  }

  function finishLadder() {
    const st = laState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Ladder.finish(st);
    const me = mePlaying();
    if (me) {
      Store.recordGame(me.id, {
        mode: 'ladder',
        difficulty: st.level,
        points: res.points,
        seconds: res.seconds,
        correct: res.steps,
        total: res.par,
        outcome: res.solved ? 'win' : 'lose',
        perfect: res.optimal,
        myScore: res.steps
      });
    }
    UI.ladderResult(st, res);
    animateScore(res.points);
    if (res.optimal) celebrate();
    document.getElementById('laAgainBtn').addEventListener('click', () => startLadder(st.level));
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------------- Tacta ---------------- */

  const TC_WHY = {
    off: 'Keep the whole card on the table',
    clash: 'A shape can only land on the same kind of shape — square on square, rectangle on rectangle, triangle on triangle',
    lonely: 'At least one shape has to line up with the same kind of shape already printed',
    gone: 'That card is already on the table',
    over: 'The game is over'
  };

  /* ---- table size and zoom ----
     The same scheme the Word Stack board uses: JS writes the cell size as a
     plain pixel value so the whole table fits at 100%, a stage is sized to
     natural x zoom to carry the scroll range, and the board itself only ever
     gets a composited transform. Re-laying out 1296 cells per zoom frame is
     what made the first version of that board stutter. */

  function tcFitBoard() {
    const wrap = document.getElementById('tcBoardWrap');
    const board = document.getElementById('tcBoard');
    const st = tactaState;
    if (!wrap || !board || !st) return;
    const n = st.board, pad = 4;
    const byW = (wrap.clientWidth - pad) / n;
    const byH = (wrap.clientHeight - pad) / n;
    const cell = Math.max(9, Math.min(34, Math.min(byW, byH)));
    board.style.setProperty('--cell', cell.toFixed(2) + 'px');
    tcBase = null;
  }

  function tcNatural() {
    const board = document.getElementById('tcBoard');
    if (!board) return null;
    if (!tcBase || !tcBase.w) tcBase = { w: board.offsetWidth, h: board.offsetHeight };
    return tcBase;
  }

  function tcApplyZoom() {
    const stage = document.getElementById('tcStage');
    const board = document.getElementById('tcBoard');
    if (!board) return;
    const n = tcNatural();
    if (stage && n) {
      stage.style.width = Math.round(n.w * tcZoom) + 'px';
      stage.style.height = Math.round(n.h * tcZoom) + 'px';
    }
    board.style.transform = Math.abs(tcZoom - 1) < 0.001 ? '' : 'scale(' + tcZoom.toFixed(4) + ')';
    const lab = document.getElementById('tcZoomLevel');
    if (lab) lab.textContent = Math.round(tcZoom * 100) + '%';
  }

  const tcClampZoom = z => Math.min(TC_ZOOM_MAX, Math.max(TC_ZOOM_MIN, z));

  function tcAnchorOf(wrap, anchor) {
    const rect = wrap.getBoundingClientRect();
    const ax = anchor ? anchor.x - rect.left : wrap.clientWidth / 2;
    const ay = anchor ? anchor.y - rect.top : wrap.clientHeight / 2;
    return { ax: ax, ay: ay, cx: wrap.scrollLeft + ax, cy: wrap.scrollTop + ay, base: tcZoom };
  }

  function tcZoomPaint(z, s) {
    tcZoom = z;
    tcApplyZoom();
    const wrap = document.getElementById('tcBoardWrap');
    if (!wrap || !s) return;
    const k = z / s.base;
    wrap.scrollLeft = s.cx * k - s.ax;
    wrap.scrollTop = s.cy * k - s.ay;
  }

  /* Direct zoom — a pinch uses this so the table tracks the fingers exactly. */
  function tcSetZoom(z, anchor) {
    const wrap = document.getElementById('tcBoardWrap');
    if (!wrap) return;
    const goal = tcClampZoom(z);
    if (Math.abs(goal - tcZoom) < 0.002) return;
    if (tcZoomTween) { cancelAnimationFrame(tcZoomTween); tcZoomTween = null; }
    tcZoomPaint(goal, tcAnchorOf(wrap, anchor));
  }

  /* Animated zoom — buttons and Ctrl-scroll glide instead of jumping. */
  function tcZoomGo(z, anchor) {
    const wrap = document.getElementById('tcBoardWrap');
    if (!wrap) return;
    const goal = tcClampZoom(z);
    const from = tcZoom;
    if (tcZoomTween) { cancelAnimationFrame(tcZoomTween); tcZoomTween = null; }
    if (Math.abs(goal - from) < 0.004) return;
    if (reduceMotion) { tcZoomPaint(goal, tcAnchorOf(wrap, anchor)); return; }
    const start = performance.now();
    const span = goal - from;
    const s = tcAnchorOf(wrap, anchor);
    const frame = now => {
      const p = Math.min(1, (now - start) / 200);
      const eased = 1 - Math.pow(1 - p, 3);
      tcZoomPaint(from + span * eased, s);
      if (p < 1) tcZoomTween = requestAnimationFrame(frame);
      else tcZoomTween = null;
    };
    tcZoomTween = requestAnimationFrame(frame);
  }

  function tcZoomFit() {
    tcZoomGo(1, null);
    const wrap = document.getElementById('tcBoardWrap');
    if (wrap) setTimeout(() => wrap.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' }),
      reduceMotion ? 0 : 210);
  }

  /* Put the starting card in the middle of the viewport. */
  function tcCenterOnStart() {
    const wrap = document.getElementById('tcBoardWrap');
    const board = document.getElementById('tcBoard');
    const st = tactaState;
    if (!wrap || !board || !st) return;
    const cell = parseFloat(getComputedStyle(board).getPropertyValue('--cell')) || 20;
    const px = cell * tcZoom;
    wrap.scrollLeft = (st.startC + Tacta.W / 2) * px - wrap.clientWidth / 2;
    wrap.scrollTop = (st.startR + Tacta.H / 2) * px - wrap.clientHeight / 2;
  }

  /* Pan with one finger and zoom with two, exactly like the Word Stack board. */
  function bindTcGestures() {
    const wrap = document.getElementById('tcBoardWrap');
    if (!wrap) return;
    wrap.addEventListener('pointerdown', e => {
      if (!tactaState) return;
      tcPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      if (tcPointers.size === 1) {
        tcPan = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
        wrap.classList.add('grabbing');
      } else if (tcPointers.size === 2) {
        const pts = Array.from(tcPointers.values());
        tcPan = null;
        tcPinch = {
          d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          zoom: tcZoom,
          mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
        };
      }
    });
    wrap.addEventListener('pointermove', e => {
      if (!tcPointers.has(e.pointerId)) return;
      tcPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(tcPointers.values());
      if (tcPointers.size >= 2 && tcPinch) {
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        if (tcPinch.d > 8) tcSetZoom(tcPinch.zoom * (d / tcPinch.d), mid);
      } else if (tcPan) {
        wrap.scrollLeft = tcPan.left - (e.clientX - tcPan.x);
        wrap.scrollTop = tcPan.top - (e.clientY - tcPan.y);
      }
    });
    const end = e => {
      tcPointers.delete(e.pointerId);
      if (tcPointers.size < 2) tcPinch = null;
      if (tcPointers.size === 1) {
        const p = Array.from(tcPointers.values())[0];
        tcPan = { x: p.x, y: p.y, left: wrap.scrollLeft, top: wrap.scrollTop };
      }
      if (!tcPointers.size) { tcPan = null; wrap.classList.remove('grabbing'); }
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      tcZoomGo(tcZoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), { x: e.clientX, y: e.clientY });
    }, { passive: false });
  }

  /* ---- drag and drop ---- */

  function tcMeasure() {
    const board = document.getElementById('tcBoard');
    if (!board) return null;
    const els = board.querySelectorAll('.tc-c');
    const n = tactaState ? tactaState.board : Tacta.BOARD;
    if (els.length < n + 1) return null;
    const a = els[0].getBoundingClientRect();
    const b = els[1].getBoundingClientRect();
    const d = els[n].getBoundingClientRect();
    return { ox: a.left, oy: a.top, pitchX: b.left - a.left, pitchY: d.top - a.top, size: a.width };
  }

  const tcCellEls = () => {
    const board = document.getElementById('tcBoard');
    return board ? board.querySelectorAll('.tc-c') : [];
  };

  function tcCellsAt(r, c, ow, oh) {
    const n = Tacta.BOARD;
    const out = [];
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const rr = r + y, cc = c + x;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n) out.push(rr * n + cc);
      }
    }
    return out;
  }

  function tcClearPreview() {
    const els = tcCellEls();
    tcPreview.forEach(i => {
      const el = els[i];
      if (el) el.classList.remove('pre-ok', 'pre-bad');
    });
    tcPreview = [];
  }

  function tcPaintPreview(cells, ok) {
    const els = tcCellEls();
    tcPreview.forEach(i => {
      const el = els[i];
      if (el) el.classList.remove('pre-ok', 'pre-bad');
    });
    tcPreview = cells.slice();
    tcPreview.forEach(i => {
      const el = els[i];
      if (el) el.classList.add(ok ? 'pre-ok' : 'pre-bad');
    });
  }

  function tcPositionGhost(ghost, geo, r, c, ow, oh, ok) {
    if (!ghost) return;
    ghost.style.left = (geo.ox + c * geo.pitchX) + 'px';
    ghost.style.top = (geo.oy + r * geo.pitchY) + 'px';
    ghost.style.width = (geo.pitchX * ow).toFixed(2) + 'px';
    ghost.style.height = (geo.pitchY * oh).toFixed(2) + 'px';
    ghost.classList.toggle('ok', !!ok);
    ghost.classList.toggle('bad', !ok);
  }

  /* ---------------- status line ---------------- */

  function tcIdleStatus() {
    const st = tactaState;
    const el = document.getElementById('tcStatus');
    if (!el || !st) return;
    if (st.status !== 'playing') { el.textContent = ''; return; }
    const name = (boardPlayers()[st.turn] || {}).name || '—';
    el.textContent = name + ' to play · drag a card out, tap it to turn it, right-click to mirror it';
  }

  function tcSay(text, bad) {
    const el = document.getElementById('tcStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('nope');
    if (bad && !reduceMotion) { void el.offsetWidth; el.classList.add('nope'); }
    tcSayUntil = Date.now() + 1900;
    clearTimeout(tcSayId);
    tcSayId = setTimeout(() => {
      el.classList.remove('nope');
      if (tcDrag) return;
      tcIdleStatus();
    }, 1900);
  }

  /* ---------------- turn flow ---------------- */

  function startTacta() {
    const players = boardPlayers();
    if (players.length !== 2) { showHome(); return; }
    clearTcTimers();
    tactaState = Tacta.start();
    tcSel = -1;
    tcDrag = null;
    tcZoom = 1;
    tcBase = null;
    boardBusy = false;
    accumulated = 0;
    startedAt = Date.now();
    UI.tactaGame(tactaState, players);
    bindTacta();
    bindHome();
    tcFitBoard();
    /* Open zoomed in enough that a card reads at about the size it has in the
       tray — the whole 36 x 36 table is far too small to play on — with Fit
       one tap away for the overview. */
    const fitCell = parseFloat(getComputedStyle(document.getElementById('tcBoard')).getPropertyValue('--cell')) || 12;
    tcZoom = tcClampZoom(Math.min(3, Math.max(1.3, 30 / fitCell)));
    tcApplyZoom();
    tcCenterOnStart();
    UI.tactaPaint(tactaState);
    UI.tactaTrays(tactaState, players);
    UI.tactaTurn(tactaState, players);
    startTimer();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    tcBeginTurn();
  }

  function bindTacta() {
    const body = document.querySelector('.tc-body');
    if (!body) return;
    body.addEventListener('pointerdown', tcDown);
    body.addEventListener('contextmenu', e => {
      const cardEl = e.target.closest('.tc-card');
      if (!cardEl) return;
      e.preventDefault();
      const id = Number(cardEl.dataset.card);
      if (tcDrag && tcDrag.id === id) tcDragMirror();
      else tcFlipCard(id);
    });
    const rot = document.getElementById('tcRotate');
    if (rot) rot.addEventListener('click', tcTurnSel);
    const mir = document.getElementById('tcFlip');
    if (mir) mir.addEventListener('click', tcMirrorSel);
    const zin = document.getElementById('tcZoomIn');
    if (zin) zin.addEventListener('click', () => tcZoomGo(tcZoom * 1.3, null));
    const zout = document.getElementById('tcZoomOut');
    if (zout) zout.addEventListener('click', () => tcZoomGo(tcZoom / 1.3, null));
    const zfit = document.getElementById('tcZoomFit');
    if (zfit) zfit.addEventListener('click', tcZoomFit);
    bindTcGestures();
  }

  function tcBeginTurn() {
    const st = tactaState;
    if (!st || st.status !== 'playing') return;
    const players = boardPlayers();
    tcSel = -1;
    UI.tactaTrays(st, players);
    UI.tactaTurn(st, players);
    if (Date.now() >= tcSayUntil) tcIdleStatus();

    if (!Tacta.hasAnyMove(st, st.turn)) {                 // nothing fits: pass for them
      tcSay((players[st.turn] || {}).name + ' has no card that fits — passing', true);
      clearTimeout(tcPassTimer);
      tcPassTimer = setTimeout(tcPassTurn, anim(1100));
      return;
    }
  }

  function tcPassTurn() {
    const st = tactaState;
    if (!st || st.status !== 'playing') return;
    Tacta.pass(st);
    if (st.status !== 'playing') { tcFinishSoon(); return; }
    UI.tactaPaint(st);
    tcBeginTurn();
  }

  /* ---------------- card selection ---------------- */

  function tcLiveCard(id) {
    const st = tactaState;
    if (!st || st.status !== 'playing') return null;
    const card = Tacta.cardOf(st, id);
    if (!card || card.placed || card.owner !== st.turn) return null;
    return card;
  }

  function tcSelect(id) {
    tcSel = id;
    document.querySelectorAll('.tc-card').forEach(el => {
      el.classList.toggle('sel', Number(el.dataset.card) === id);
    });
  }

  function tcFlash(id) {
    const el = document.querySelector('.tc-card[data-card="' + id + '"]');
    if (!el || reduceMotion) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 360);
  }

  function tcTurnCard(id) {
    if (!tcLiveCard(id)) return;
    Tacta.rotate(tactaState, id);
    UI.tactaTrays(tactaState, boardPlayers());
    tcSelect(id);
    tcFlash(id);
  }

  function tcFlipCard(id) {
    if (!tcLiveCard(id)) return;
    Tacta.flip(tactaState, id);
    UI.tactaTrays(tactaState, boardPlayers());
    tcSelect(id);
    tcFlash(id);
  }

  function tcTurnSel() {
    if (tcDrag) { tcDragTurn(); return; }
    if (tcSel < 0) { tcSay('Pick a card first, then turn it', true); return; }
    tcTurnCard(tcSel);
  }

  function tcMirrorSel() {
    if (tcDrag) { tcDragMirror(); return; }
    if (tcSel < 0) { tcSay('Pick a card first, then mirror it', true); return; }
    tcFlipCard(tcSel);
  }

  function tcDragTurn() {
    const d = tcDrag, st = tactaState;
    if (!d || !st) return;
    Tacta.rotate(st, d.id);
    tcRefreshGhost();
  }

  function tcDragMirror() {
    const d = tcDrag, st = tactaState;
    if (!d || !st) return;
    Tacta.flip(st, d.id);
    tcRefreshGhost();
  }

  /* Re-draw the floating card after a turn / mirror and re-check the spot. */
  function tcRefreshGhost() {
    const d = tcDrag, st = tactaState;
    if (!d || !st) return;
    const card = Tacta.cardOf(st, d.id);
    if (!card) return;
    const ow = Tacta.orW(card.rot), oh = Tacta.orH(card.rot);
    d.ghost.innerHTML = UI.tactaCardSvg(card);
    d.ow = ow;
    d.oh = oh;
    /* the grabbed point is kept as a fraction of the card, so it stays under
       the pointer when the card is turned or mirrored */
    d.gc = Math.max(0, Math.min(ow - 1, Math.floor(d.u * ow)));
    d.gr = Math.max(0, Math.min(oh - 1, Math.floor(d.v * oh)));
    UI.tactaTrays(st, boardPlayers());
    tcSelect(d.id);
    tcEvaluate();
  }

  /* ---------------- drag and drop ---------------- */

  function tcDown(e) {
    const st = tactaState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    if (e.button !== 0) return;                        // right button mirrors
    const cardEl = e.target.closest('.tc-card');
    if (!cardEl) return;
    const id = Number(cardEl.dataset.card);
    const card = tcLiveCard(id);
    if (!card) return;
    const geo = tcMeasure();
    if (!geo) return;
    e.preventDefault();

    /* the cell they grabbed stays under the pointer for the whole drag */
    const fr = cardEl.getBoundingClientRect();
    const ow = Tacta.orW(card.rot), oh = Tacta.orH(card.rot);
    const u = Math.min(0.999, Math.max(0, (e.clientX - fr.left) / fr.width));
    const v = Math.min(0.999, Math.max(0, (e.clientY - fr.top) / fr.height));
    const gc = Math.max(0, Math.min(ow - 1, Math.floor(u * ow)));
    const gr = Math.max(0, Math.min(oh - 1, Math.floor(v * oh)));

    const ghost = document.createElement('div');
    ghost.className = 'tc-ghost';
    ghost.innerHTML = UI.tactaCardSvg(card);
    document.body.appendChild(ghost);

    tcDrag = {
      id: id, gc: gc, gr: gr, ow: ow, oh: oh, u: u, v: v,
      sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
      moved: 0, r: 0, c: 0, valid: false, reason: '', cells: [], ghost: ghost
    };
    tcSelect(id);
    cardEl.classList.add('holding');
    tcEvaluate();
    document.addEventListener('pointermove', tcMove);
    document.addEventListener('pointerup', tcUp);
    document.addEventListener('pointercancel', tcUp);
  }

  function tcMove(e) {
    const d = tcDrag;
    if (!d) return;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    d.x = e.clientX;
    d.y = e.clientY;
    tcEvaluate();
  }

  /* Where would the card land right now, and is that legal? */
  function tcEvaluate() {
    const d = tcDrag, st = tactaState;
    if (!d || !st) return;
    const geo = tcMeasure();
    const card = Tacta.cardOf(st, d.id);
    if (!geo || !card) return;
    d.c = Math.round((d.x - geo.ox) / geo.pitchX - 0.5) - d.gc;
    d.r = Math.round((d.y - geo.oy) / geo.pitchY - 0.5) - d.gr;
    const chk = Tacta.canPlace(st, d.id, d.r, d.c);
    d.valid = chk.ok;
    d.reason = chk.reason;
    d.cells = tcCellsAt(d.r, d.c, d.ow, d.oh);
    tcPaintPreview(d.cells, chk.ok);
    tcPositionGhost(d.ghost, geo, d.r, d.c, d.ow, d.oh, chk.ok);
  }

  function tcUnbindDrag() {
    document.removeEventListener('pointermove', tcMove);
    document.removeEventListener('pointerup', tcUp);
    document.removeEventListener('pointercancel', tcUp);
  }

  function tcCancelDrag() {
    const d = tcDrag;
    if (!d) return;
    tcUnbindDrag();
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    tcDrag = null;
    tcClearPreview();
  }

  function tcUp() {
    const d = tcDrag;
    if (!d) return;
    tcUnbindDrag();
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    const held = document.querySelector('.tc-card[data-card="' + d.id + '"].holding');
    if (held) held.classList.remove('holding');
    tcDrag = null;
    tcClearPreview();

    const st = tactaState;
    if (!st || st.status !== 'playing' || boardBusy) return;
    if (d.moved < 9) { tcTurnCard(d.id); return; }     // a plain tap turns the card 90°
    if (!d.valid) { tcReject(d.id, d.reason); return; }
    tcPlay(d.id, d.r, d.c);
  }

  function tcPlay(id, r, c) {
    const st = tactaState;
    if (!st) return;
    const chk = Tacta.canPlace(st, id, r, c);
    if (!chk.ok) { tcReject(id, chk.reason); return; }
    const card = Tacta.cardOf(st, id);
    Tacta.place(st, id, r, c);
    tcSel = -1;
    UI.tactaPaint(st);
    const players = boardPlayers();
    const n = chk.shapes || 1;
    tcSay(n > 1
      ? n + ' shapes lined up — ' + ((players[st.turn] || {}).name || '—') + ' to play'
      : 'Shape lined up — ' + ((players[st.turn] || {}).name || 'the other player') + ' to play', false);
    void card;
    if (st.status !== 'playing') { tcFinishSoon(); return; }
    tcBeginTurn();
  }

  function tcReject(id, reason) {
    const el = document.querySelector('.tc-card[data-card="' + id + '"]');
    if (el && !reduceMotion) {
      el.classList.remove('nope');
      void el.offsetWidth;
      el.classList.add('nope');
      setTimeout(() => el.classList.remove('nope'), 460);
    }
    tcSay(TC_WHY[reason] || 'That card cannot go there', true);
  }

  /* ---------------- wrapping up ---------------- */

  function tcFinishSoon() {
    const st = tactaState;
    if (!st) return;
    boardBusy = true;
    clearTimeout(tcPassTimer);
    tcCancelDrag();
    stopTimer();
    const players = boardPlayers();
    const el = document.getElementById('tcStatus');
    if (el) {
      el.classList.remove('nope');
      el.textContent = st.status === 'draw'
        ? 'A draw!'
        : ((players[st.winner] || {}).name || '—') + ' wins!';
    }
    setTimeout(() => leaveTcScreen(finishTacta), anim(1000));
  }

  function leaveTcScreen(done) {
    const screen = document.querySelector('.tc-screen');
    if (!screen || reduceMotion) { done(); return; }
    screen.classList.add('screen-leaving');
    setTimeout(done, TC_LEAVE_MS);
  }

  function finishTacta() {
    const st = tactaState;
    if (!st) return;
    st.elapsedMs = elapsedMs();
    stopTimer();
    const res = Tacta.finish(st);
    const players = boardPlayers();
    [0, 1].forEach(pi => {
      const me = players[pi];
      if (!me) return;
      const opp = players[1 - pi];
      const s = res.scores[pi];
      Store.recordGame(me.id, {
        mode: 'tacta',
        difficulty: st.board + 'x' + st.board,
        points: s.points,
        seconds: res.seconds,
        opponent: opp ? opp.name : '',
        myScore: s.visible,
        oppScore: res.scores[1 - pi].visible,
        outcome: res.status === 'draw' ? 'draw' : (res.winner === pi ? 'win' : 'lose')
      });
    });
    UI.tactaResult(st, res, players);
    document.getElementById('againBtn').addEventListener('click', startTacta);
    document.getElementById('homeBtn').addEventListener('click', showHome);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function clearTcTimers() {
    clearTimeout(tcPassTimer);
    clearTimeout(tcSayId);
    tcCancelDrag();
    if (tcZoomTween) { cancelAnimationFrame(tcZoomTween); tcZoomTween = null; }
    tcPointers.clear();
    tcPan = null;
    tcPinch = null;
    stopTimer();
  }

  /* ---------------- submit ---------------- */  /* ---------------- submit ---------------- */
  function submitRound() {
    if (!round) return;
    round.elapsedMs = elapsedMs();
    round.finishedAt = Date.now();
    stopTimer();
    hideMind();
    setArmed(false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    const player = Store.getCurrent();
    const result = Game.grade(round);
    const prevBest = player.best || 0;
    const isNewBest = result.points > prevBest;

    Store.recordGame(player.id, {
      points: result.points,
      passage: round.passage.title,
      difficulty: round.difficulty,
      correct: result.correct,
      total: result.total,
      seconds: result.seconds,
      speed: result.speed,
      mindUsed: round.mindUsed,
      perfect: result.perfect
    });

    UI.result(round, result, Store.getPlayer(player.id), isNewBest);
    bindResult();
    animateScore(result.points);
    if (result.perfect) celebrate();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function bindResult() {
    document.getElementById('againBtn').addEventListener('click', () => startGame(round.difficulty));
    document.getElementById('changeBtn').addEventListener('click', () => { leaveGame(); showDifficulty(); });
    document.getElementById('homeBtn').addEventListener('click', () => { leaveGame(); showHome(); });
  }

  /* ---------------- result animations ---------------- */
  function animateScore(target) {
    const el = document.getElementById('scoreNum');
    if (!el) return;
    if (reduceMotion || target <= 0) {
      el.textContent = '+' + target;
      el.classList.add('landed');
      return;
    }
    const duration = Math.min(2000, Math.max(900, target * 0.9));  // scales with score, capped at 2s
    const start = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);                       // easeOutCubic
      el.textContent = '+' + Math.round(target * eased);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = '+' + target;
        el.classList.add('landed');
      }
    }
    requestAnimationFrame(frame);
  }

  function celebrate() {
    if (reduceMotion) return;
    const layer = document.createElement('div');
    layer.className = 'confetti';
    const shapes = ['■', '▲', '●', '◆'];
    for (let i = 0; i < 34; i++) {
      const s = document.createElement('i');
      s.textContent = shapes[i % shapes.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = (6 + Math.random() * 10) + 'px';
      s.style.animationDelay = (Math.random() * 0.5) + 's';
      s.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      s.style.opacity = 0.35 + Math.random() * 0.5;
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3200);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
