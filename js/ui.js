/* ============================================================
   WordBubbles — view layer (renders HTML, no game state)
   ============================================================ */
const UI = (() => {
  const app = () => document.getElementById('app');

  /* every mode that needs two players picked on the home screen */
  const DUELS = ['math', 'chess', 'gomoku', 'go', 'wordstack', 'tacta'];

  /* labels used by the history list */
  const HIST_MODES = {
    math: { name: 'Math Duel', score: 'opp ' },
    chess: { name: 'Chess', score: 'material ' },
    gomoku: { name: 'Gomoku', score: 'stones ' },
    go: { name: 'Go', score: 'area ' },
    wordstack: { name: 'Word Stack', score: 'words ' },
    tacta: { name: 'Tacta', score: 'dots ' },
    slide: { name: 'Number Slide', score: 'moves ' },
    sudoku: { name: 'Sudoku', score: 'cells ' },
    nonogram: { name: 'Nonogram', score: 'shaded ' },
    g2048: { name: '2048', score: 'tile ' },
    codebreak: { name: 'Code Break', score: 'guesses ' },
    typing: { name: 'Typing Sprint', score: 'wpm ' },
    ladder: { name: 'Word Ladder', score: 'steps ' }
  };

  /* Solo games filed by difficulty rather than by opponent. Each entry names the
     engine that owns its difficulty levels. */
  const SOLO_ENGINES = {
    slide: () => Slide, sudoku: () => Sudoku, nonogram: () => Nonogram,
    g2048: () => G2048, codebreak: () => CodeBreak,
    typing: () => Typing, ladder: () => Ladder
  };

  /* Every game, in one place so a new one only has to be described once. */
  const MODES = {
    words: { title: 'Word Fill', tag: '1 player',
      desc: 'Fill the gaps in a short English passage.' },
    wordstack: { title: 'Word Stack', tag: '2 players',
      desc: 'Two players, overlap your word tiles letter by letter.' },
    typing: { title: 'Typing Sprint', tag: '1 player',
      desc: 'Solo, retype a passage as fast and as cleanly as you can.' },
    ladder: { title: 'Word Ladder', tag: '1 player',
      desc: 'Solo, change one letter at a time to reach the other word.' },
    math: { title: 'Math Duel', tag: '2 players',
      desc: 'Two players, cards and numbers, turn by turn.' },
    mine: { title: 'Minesweeper', tag: '1 player',
      desc: 'Solo, clear the grid without setting off a mine.' },
    g2048: { title: '2048', tag: '1 player',
      desc: 'Solo, slide and merge tiles until you reach the goal number.' },
    codebreak: { title: 'Code Break', tag: '1 player',
      desc: 'Solo, deduce the hidden number from the bulls and cows.' },
    slide: { title: 'Number Slide', tag: '1 player',
      desc: 'Solo, slide the numbers back into order in the frame.' },
    sudoku: { title: 'Sudoku', tag: '1 player',
      desc: 'Solo, fill the grid so every row, column and box holds 1-9.' },
    nonogram: { title: 'Nonogram', tag: '1 player',
      desc: 'Solo, read the line counts and shade the hidden picture.' },
    chess: { title: 'Chess', tag: '2 players',
      desc: 'Two players, a real board, turning each move.' },
    gomoku: { title: 'Gomoku', tag: '2 players',
      desc: 'Two players, black first, five in a row on a line grid.' },
    go: { title: 'Go', tag: '2 players',
      desc: 'Two players, surround territory, capture and keep it.' },
    tacta: { title: 'Tacta', tag: '2 players',
      desc: 'Two players, rotate and overlap shape cards, cover opponent scoring dots and protect your own.' }
  };

  /* The home screen lists the games in these groups. `tacta` is finished and
     kept working but pulled off the menu for now — put it back in the Board
     strategy list to unhide it. */
  const MODE_GROUPS = [
    { name: 'Words', note: 'Reading, spelling and typing.',
      modes: ['words', 'wordstack', 'typing', 'ladder'] },
    { name: 'Numbers & logic', note: 'Arithmetic, deduction and quick thinking.',
      modes: ['math', 'mine', 'g2048', 'codebreak'] },
    { name: 'Puzzles', note: 'Take your time and work it out.',
      modes: ['slide', 'sudoku', 'nonogram'] },
    { name: 'Board strategy', note: 'Two players fighting over a shared board.',
      modes: ['chess', 'gomoku', 'go'] }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function fmtDuration(ms) {
    const s = Math.max(0, Math.round((ms || 0) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  function shortDate(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString(undefined,
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  /* ---------------- home ---------------- */
  function playerCard(p, selected, i) {
    const games = p.games || 0;
    const score = p.score || 0;
    const line1 = games
      ? 'best ' + (p.best || 0) + ' · ' + games + (games === 1 ? ' game' : ' games')
      : 'No games yet';
    return '<div class="player-card ' + (selected ? 'selected' : '') + '" data-player="' + p.id + '" ' +
      'style="--i:' + i + '">' +
      '<button class="player-del" data-del="' + p.id + '" title="Remove player" aria-label="Remove player">×</button>' +
      '<div class="player-avatar">' + avatarSvg(p.avatar) + '</div>' +
      '<div class="player-name">' + esc(p.name) + '</div>' +
      '<div class="player-score' + (score < 0 ? ' neg' : '') + '">' +
        score.toLocaleString() + ' pts</div>' +
      '<div class="player-meta">' + esc(line1) + '</div>' +
      '<div class="player-meta">played ' + esc(fmtDuration(p.totalMs || 0)) + '</div>' +
      (games ? '<button class="player-history" data-history="' + p.id + '">History</button>' : '') +
      '</div>';
  }

  function modeCard(key, title, desc, tag, selected) {
    return '<button class="mode-card ' + (selected ? 'selected' : '') + '" data-mode="' + key + '">' +
      '<div class="mode-title">' + esc(title) + '</div>' +
      '<div class="mode-desc">' + esc(desc) + '</div>' +
      '<div class="mode-tag">' + esc(tag) + '</div>' +
      '</button>';
  }

  function homeLabel(mode) {
    return {
      chess: 'Start match', gomoku: 'Start match', go: 'Start game', mine: 'Start game',
      g2048: 'Start game', codebreak: 'Start game', nonogram: 'Start game',
      typing: 'Start game', ladder: 'Start game',
      wordstack: 'Start match', tacta: 'Start match', slide: 'Start game', sudoku: 'Start game'
    }[mode] || (mode === 'math' ? 'Start duel' : 'Continue');
  }

  /* Home button every in-game screen carries, so leaving a game never needs the
     logo. It never touches scores — they are only written when a game ends. */
  const HOME_BTN = '<button class="btn ghost home-btn" id="homeBtn" ' +
    'title="Back to home — your score stays as it is">Home</button>';

  function home(players, selectedIds, mode) {
    const duel = DUELS.indexOf(mode) >= 0;
    const sel = selectedIds || [];
    const cards = players.map((p, i) => playerCard(p, sel.indexOf(p.id) >= 0, i)).join('');
    const ready = players.length ? (duel ? sel.length === 2 : sel.length === 1) : false;
    const hint = players.length
      ? (duel
        ? 'Pick 2 players — ' + sel.length + '/2 selected.'
        : 'Pick 1 player.')
      : '';
    const label = homeLabel(mode);

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">WordBubbles</h1>' +
        '<p class="page-sub">Fourteen small games, grouped by what they ask of you: ' +
          'read and type, work with numbers and logic, settle in for a puzzle, or ' +
          'fight it out over a board.</p>' +
        '<div class="section-label">Game mode</div>' +
        '<div class="mode-groups">' +
          MODE_GROUPS.map(g =>
            '<section class="mode-group">' +
              '<div class="mode-group-head">' +
                '<span class="mode-group-name">' + esc(g.name) + '</span>' +
                '<span class="mode-group-note">' + esc(g.note) + '</span>' +
                '<span class="mode-group-count">' + g.modes.length + '</span>' +
              '</div>' +
              '<div class="modes">' +
                g.modes.map(k => modeCard(k, MODES[k].title, MODES[k].desc, MODES[k].tag, mode === k)).join('') +
              '</div>' +
            '</section>').join('') +
        '</div>' +
        '<div class="section-label">Who is playing?</div>' +
        (hint ? '<p class="select-hint">' + esc(hint) + '</p>' : '') +
        '<div class="players">' +
          (cards || '') +
          '<button class="player-add" id="addPlayer" style="--i:' + players.length + '">' +
            '<span class="plus">+</span><span>Add player</span></button>' +
        '</div>' +
        (players.length ? '' :
          '<div class="empty" style="margin-top:16px">No players yet. Add one to begin.</div>') +
        '<div class="actions">' +
          '<button class="btn primary big" id="continueBtn"' + (ready ? '' : ' disabled') + '>' + label + '</button>' +
        '</div>' +
      '</div>';
  }

  /* Light-touch update for the home screen. Picking a player or a mode must
     only flip the selection — rebuilding the page made it flash every time. */
  function homeUpdate(players, selectedIds, mode) {
    const duel = DUELS.indexOf(mode) >= 0;
    const sel = selectedIds || [];
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.classList.toggle('selected', b.dataset.mode === mode);
    });
    document.querySelectorAll('.player-card').forEach(c => {
      c.classList.toggle('selected', sel.indexOf(c.dataset.player) >= 0);
    });
    const hint = document.querySelector('.select-hint');
    if (hint) hint.textContent = players.length
      ? (duel ? 'Pick 2 players — ' + sel.length + '/2 selected.' : 'Pick 1 player.')
      : '';
    const btn = document.getElementById('continueBtn');
    if (btn) {
      btn.disabled = !(players.length && (duel ? sel.length === 2 : sel.length === 1));
      btn.textContent = homeLabel(mode);
    }
  }

  /* ---------------- difficulty ---------------- */
  function difficulty(selected) {
    const order = ['primary', 'easy', 'medium', 'hard'];
    const level = { primary: 1, easy: 2, medium: 3, hard: 4 };
    const cards = order.map((d, i) => {
      const cfg = DIFFICULTY[d];
      const n = Game.averageBlanks(d);
      let dots = '';
      for (let k = 1; k <= 4; k++) dots += '<i class="' + (k <= level[d] ? 'on' : '') + '"></i>';
      return '<button class="diff-card ' + (selected === d ? 'selected' : '') + '" data-diff="' + d + '" ' +
        'style="--i:' + i + '">' +
        '<div class="diff-name">' + cfg.label + '</div>' +
        '<div class="diff-desc">' + esc(cfg.desc) + '</div>' +
        '<div class="diff-dots">' + dots + '</div>' +
        '<div class="diff-stat">≈ ' + n + ' blanks · ' + cfg.mult + '× points</div>' +
        '</button>';
    }).join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">Choose difficulty</h1>' +
        '<p class="page-sub">Longer words and denser gaps mean higher scores. Every round you get ' +
          'half as many Super Mind hints as there are gaps.</p>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startBtn"' + (selected ? '' : ' disabled') + '>Start game</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- passage rendering ---------------- */
  function renderPlayPassage(round) {
    return round.tokens.map((tok, i) => {
      if (round.blanks.has(i)) {
        const n = tok.length;
        const pos = (typeof posOf === 'function') ? posOf(tok) : null;
        // number sits inside the box; the part of speech floats above it
        return '<span class="blank">' +
          (pos ? '<span class="pos">' + esc(pos) + '</span>' : '') +
          '<span class="num">' + n + '</span>' +
          '<input class="bin" data-i="' + i + '" type="text" maxlength="' + n + '" ' +
          'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
          'style="width:calc(' + n + 'ch + 0.25em)">' +
          '</span>';
      }
      return esc(tok);
    }).join('');
  }

  function renderResultPassage(round, details) {
    const map = {};
    details.forEach(d => { map[d.index] = d; });
    let k = 0;
    return round.tokens.map((tok, i) => {
      if (round.blanks.has(i)) {
        const d = map[i];
        const delay = 'style="animation-delay:' + (k * 30) + 'ms"';
        k++;
        if (d && d.ok) return '<span class="rword ok" ' + delay + '>' + esc(tok) + '</span>';
        const given = d && d.given
          ? '<span class="rword bad" ' + delay + '>' + esc(d.given) + '</span> ' : '';
        return given + '<span class="rword fix"' + (given ? '' : ' ' + delay) + '>' + esc(tok) + '</span>';
      }
      return esc(tok);
    }).join('');
  }

  /* ---------------- game ---------------- */
  function game(round, player) {
    const cfg = DIFFICULTY[round.difficulty];
    const noCharges = round.mindCharges === 0;
    app().innerHTML =
      '<div class="screen">' +
        '<div class="game-head">' +
          '<span class="chip" style="--i:0">Player <strong>' + esc(player.name) + '</strong></span>' +
          '<span class="chip" style="--i:1">' + cfg.label + ' · <strong>' + round.blanks.size + '</strong> gaps</span>' +
          '<span class="chip" style="--i:2">Time <strong id="timer">0:00</strong>' +
            '<span class="par">/ ' + fmtTime(Game.parSeconds(round.blanks.size)) + '</span></span>' +
          '<button class="chip mind-btn' + (noCharges ? ' is-empty' : '') + '" id="mindBtn"' +
            (noCharges ? ' disabled' : '') + ' style="--i:3" ' +
            'title="Turn on Super Mind, then click a gap">' +
            '<span class="dot"></span>Super Mind <strong id="mindCount">' +
            round.mindCharges + '/' + round.mindCharges + '</strong>' +
          '</button>' +
          '<button class="icon-btn pause-btn" id="pauseBtn" title="Pause" aria-label="Pause" style="--i:4">❚❚</button>' +
          HOME_BTN +
        '</div>' +
        '<div class="armed-note" id="armedNote" hidden>' +
          'Super Mind is on — click a gap to see 5 words of the same length' +
        '</div>' +
        '<div class="passage-wrap" id="passageWrap">' +
          '<h1 class="passage-title">' + esc(round.passage.title) + '</h1>' +
          '<p class="passage" id="passageText">' + renderPlayPassage(round) + '</p>' +
          '<div class="pause-cover" id="pauseCover" hidden>' +
            '<div class="pause-title">Paused</div>' +
            '<div class="pause-sub">The text is hidden</div>' +
            '<button class="btn primary" id="resumeBtn">Resume</button>' +
          '</div>' +
        '</div>' +
        '<div class="progress-bar"><i id="progBar"></i></div>' +
        '<div class="progress-text" id="progText">0 / ' + round.blanks.size + ' filled</div>' +
        '<div class="game-foot">' +
          '<button class="btn primary big" id="submitBtn" disabled>Submit answers</button>' +
        '</div>' +
      '</div>';
  }

  /* Floating Super Mind chooser, anchored above a blank. */
  function mindPopover(options) {
    const el = document.createElement('div');
    el.className = 'mind-pop';
    el.innerHTML = options.map((w, i) =>
      '<button class="opt" data-opt="' + esc(w) + '" style="animation-delay:' + (i * 40) + 'ms">' +
      esc(w) + '</button>').join('');
    return el;
  }

  /* ---------------- result ---------------- */
  function result(round, result, player, isNewBest) {
    const missed = result.details.filter(d => !d.ok);
    const missedHtml = missed.length
      ? missed.map((d, i) =>
          '<div class="missed-item" style="animation-delay:' + (i * 60) + 'ms">' +
            '<span class="gave">' + (d.given ? esc(d.given) : '—') + '</span>' +
            '<span class="arrow">→</span>' +
            '<span class="right">' + esc(d.word) + '</span>' +
          '</div>').join('')
      : '<div class="missed-empty">Perfect round — nothing was missed.</div>';

    app().innerHTML =
      '<div class="screen">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum" data-target="' + result.points + '">+0</div>' +
          '<div class="score-label" id="scoreLabel"' + (isNewBest ? '' : ' hidden') + '>new best!</div>' +
          '<div class="score-label" id="scoreLabelPlain"' + (isNewBest ? ' hidden' : '') + '>' +
            'points · ' + esc(player.name) + '</div>' +
          '<div class="score-breakdown">' + result.base + ' base × ' + result.speed.toFixed(2) +
            ' speed' + (result.perfectBonus ? ' + ' + result.perfectBonus + ' perfect' : '') + '</div>' +
        '</div>' +
        '<div class="stats">' +
          '<div class="stat" style="--i:0"><div class="v">' + result.correct + '/' + result.total +
            '</div><div class="k">Correct</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + result.accuracy +
            '%</div><div class="k">Accuracy</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + fmtTime(result.seconds) +
            '</div><div class="k">Time / par</div></div>' +
          '<div class="stat" style="--i:3"><div class="v">×' + result.speed.toFixed(2) +
            '</div><div class="k">Speed</div></div>' +
        '</div>' +
        '<div class="section-label">' + esc(player.name) + ' · ' + player.score + ' total · best ' + player.best +
          ' · Super Mind used ' + round.mindUsed + '/' + round.mindCharges + '</div>' +
        '<div class="legend">' +
          '<span><span class="swatch" style="background:var(--soft-2)"></span>correct</span>' +
          '<span><span class="swatch" style="background:transparent;color:var(--bad);text-decoration:line-through;width:auto;border-radius:0">abc</span>your answer</span>' +
          '<span><span class="swatch" style="background:transparent;border-bottom:2px solid var(--fg);border-radius:0"></span>answer</span>' +
        '</div>' +
        '<p class="passage">' + renderResultPassage(round, result.details) + '</p>' +
        '<div class="section-label">Missed words</div>' +
        '<div class="missed">' + missedHtml + '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="againBtn">Play again</button>' +
          '<button class="btn ghost" id="changeBtn">Change difficulty</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- math duel ---------------- */
  const opSymbol = o => (o === '-' ? '−' : o);

  function mathDifficulty(selected) {
    const order = ['easy', 'medium', 'hard'];
    const lvl = { easy: 1, medium: 2, hard: 3 };
    const cards = order.map((d, i) => {
      const cfg = MathGame.DIFF[d];
      let dots = '';
      for (let k = 1; k <= 3; k++) dots += '<i class="' + (k <= lvl[d] ? 'on' : '') + '"></i>';
      return '<button class="diff-card ' + (selected === d ? 'selected' : '') + '" data-mdiff="' + d +
        '" style="--i:' + i + '">' +
        '<div class="diff-name">' + cfg.label + '</div>' +
        '<div class="diff-desc">' + esc(cfg.desc) + '</div>' +
        '<div class="diff-dots">' + dots + '</div>' +
        '<div class="diff-stat">' + cfg.cards + ' cards each · ' + (cfg.cards * 2) + ' turns</div>' +
        '</button>';
    }).join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">Math Duel</h1>' +
        '<p class="page-sub">Take turns playing a card onto the big number. When the counter at the top ' +
          'reaches zero, the rounded centre value goes to Player 1 if it is odd, or to Player 2 if it is even.</p>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startMathBtn"' + (selected ? '' : ' disabled') + '>Deal the cards</button>' +
        '</div>' +
      '</div>';
  }

  function handRow(state, pi) {
    const cards = state.hands[pi].map((c, i) =>
      '<button class="mcard" data-card="' + c.id + '" data-p="' + pi + '" style="--i:' + i + '" ' +
      'aria-label="' + esc(opSymbol(c.op) + c.n) + '">' +
        '<span class="mop">' + esc(opSymbol(c.op)) + '</span>' +
        '<span class="mn">' + c.n + '</span>' +
      '</button>').join('');
    return '<div class="handrow" id="handrow' + pi + '" data-p="' + pi + '">' +
      '<div class="handlabel">' + esc(state.players[pi].name) + '</div>' +
      '<div class="handcards" id="cards' + pi + '">' + cards + '</div>' +
      '</div>';
  }

  function mathGame(state) {
    const panel = pi =>
      '<div class="mpanel" id="mpanel' + pi + '">' +
        '<div class="mavatar">' + avatarSvg(state.players[pi].avatar) + '</div>' +
        '<div class="mname">' + esc(state.players[pi].name) + '</div>' +
        '<div class="mscore" id="mscore' + pi + '">0</div>' +
      '</div>';

    app().innerHTML =
      '<div class="screen math-screen">' +
        '<div class="math-head">' +
          panel(0) +
          '<div class="msettle">' +
            '<div class="msettle-k">turns to settle</div>' +
            '<div class="msettle-v" id="settleCount">' + state.turnsLeft + '</div>' +
            '<div class="mtime">Time <b id="timer">0:00</b></div>' +
          '</div>' +
          panel(1) +
        '</div>' +
        '<div class="math-mid">' +
          '<div class="mnum-lean" id="numLean">' +
            '<div class="mbignum" id="centerNum">' + MathGame.fmt(state.center) + '</div>' +
          '</div>' +
          '<div class="mparity" id="parityHint"></div>' +
          '<div class="mturn" id="turnLabel"></div>' +
        '</div>' +
        '<div class="math-hands">' + handRow(state, 0) + handRow(state, 1) + '</div>' +
        '<div class="progress-bar"><i id="mprog"></i></div>' +
        '<div class="progress-text" id="mturnText"></div>' +
        '<div class="game-actions stick-foot">' + HOME_BTN + '</div>' +
      '</div>';
  }

  function mathResult(state, res, mapped) {
    const side = pi => {
      const win = res.winner === pi;
      const pts = mapped ? mapped[pi] : 0;
      return '<div class="duel-side ' + (win ? 'win' : '') + '">' +
        '<div class="player-avatar">' + avatarSvg(state.players[pi].avatar) + '</div>' +
        '<div class="duel-name">' + esc(state.players[pi].name) + '</div>' +
        '<div class="duel-score">' + res.scores[pi] + '</div>' +
        '<div class="duel-k">duel score</div>' +
        '<div class="duel-mapped ' + (pts < 0 ? 'neg' : '') + '">' +
          (pts >= 0 ? '+' : '') + pts + '</div>' +
        '<div class="duel-k">added to total</div>' +
        '</div>';
    };
    const headline = res.winner === -1
      ? 'It is a draw'
      : esc(state.players[res.winner].name) + ' wins!';

    app().innerHTML =
      '<div class="screen">' +
        '<div class="score-hero">' +
          '<div class="duel-scores">' + side(0) +
            '<div class="duel-vs">vs</div>' + side(1) +
          '</div>' +
          '<div class="score-label">' + headline + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.settlements +
            '</div><div class="k">Settlements</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + res.turns +
            '</div><div class="k">Turns</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="mathAgainBtn">Rematch</button>' +
          '<button class="btn ghost" id="mathChangeBtn">Change difficulty</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- chess ---------------- */
  function chessGame(state, players, sides) {
    const panel = pi =>
      '<div class="mpanel" id="cpanel' + pi + '">' +
        '<div class="mavatar">' + avatarSvg(players[pi].avatar) + '</div>' +
        '<div class="mname">' + esc(players[pi].name) + '</div>' +
        '<div class="csideswatch ' + sides[pi] + '"></div>' +
      '</div>';

    let squares = '';
    for (let i = 0; i < 64; i++) {
      squares += '<div class="sq" data-i="' + i + '"><span class="piece empty"></span></div>';
    }

    // Black owns the top edge of an unrotated board and white the bottom, so the
    // strips sit next to their owner and then travel with the board rotation.
    app().innerHTML =
      '<div class="screen chess-screen">' +
        '<div class="duel-head">' +
          panel(0) +
          '<div class="msettle">' +
            '<div class="msettle-k">to move</div>' +
            '<div class="msettle-v chess-turn" id="chessTurn"></div>' +
            '<div class="mtime">Time <b id="timer">0:00</b></div>' +
          '</div>' +
          panel(1) +
        '</div>' +
        '<div class="chess-wrap">' +
          '<div class="board-rot" id="boardRot">' +
            '<div class="cap-strip" id="capStripB"></div>' +
            '<div class="board" id="board">' + squares + '</div>' +
            '<div class="cap-strip" id="capStripW"></div>' +
          '</div>' +
        '</div>' +
        '<div class="chess-status" id="chessStatus"></div>' +
        '<div class="game-actions">' + HOME_BTN + '</div>' +
      '</div>';
  }

  function promotionModal(color, onPick) {
    const root = document.getElementById('modalRoot');
    root.hidden = false;
    root.innerHTML =
      '<div class="modal">' +
        '<h3>Promote your pawn</h3>' +
        '<div class="promo-grid">' +
          ['q', 'r', 'b', 'n'].map((t, i) =>
            '<button class="promo-opt piece ' + color + '" data-promo="' + t + '" ' +
            'style="animation-delay:' + (i * 40) + 'ms" title="' + Chess.NAME[t] + '">' +
            Chess.GLYPH[t] + '</button>').join('') +
        '</div>' +
      '</div>';
    const close = () => { root.hidden = true; root.innerHTML = ''; };
    root.querySelector('.promo-grid').addEventListener('click', e => {
      const b = e.target.closest('[data-promo]');
      if (!b) return;
      close();
      onPick(b.dataset.promo);
    });
  }

  function chessResult(state, res, players, sides) {
    const side = pi => {
      const col = sides[pi];
      const s = res.scores[col];
      const win = res.winner === col;
      return '<div class="duel-side ' + (win ? 'win' : '') + '">' +
        '<div class="player-avatar">' + avatarSvg(players[pi].avatar) + '</div>' +
        '<div class="duel-name">' + esc(players[pi].name) + '</div>' +
        '<div class="chess-side-tag"><i class="csideswatch ' + col + '"></i>' +
          (col === 'w' ? 'White' : 'Black') + '</div>' +
        '<div class="duel-score">' + s.material + '</div>' +
        '<div class="duel-k">material taken</div>' +
        '<div class="duel-mapped ' + (s.points < 0 ? 'neg' : '') + '">' +
          (s.points >= 0 ? '+' : '') + s.points + '</div>' +
        '<div class="duel-k">added to total</div>' +
        '</div>';
    };
    const headline = res.status === 'checkmate'
      ? esc(players[res.winner === sides[0] ? 0 : 1].name) + ' wins by checkmate'
      : 'Stalemate — a draw';

    app().innerHTML =
      '<div class="screen chess-result">' +
        '<div class="score-hero">' +
          '<div class="duel-scores">' + side(0) +
            '<div class="duel-vs">vs</div>' + side(1) +
          '</div>' +
          '<div class="score-label">' + headline + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.moves +
            '</div><div class="k">Full moves</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' +
            (res.status === 'checkmate' ? 'Mate' : 'Draw') + '</div><div class="k">Result</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="chessAgainBtn">Rematch</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- goban (shared by Gomoku and Go) ---------------- */

  const STARS = {
    9: [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]],
    13: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]],
    15: [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]],
    19: [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]]
  };

  const pct = (k, n) => ((k / (n - 1)) * 100).toFixed(4) + '%';

  /* A line grid you drop stones on. The whole board is one click target — the
     intersection is worked out from the coordinates — so the only elements
     that ever change are the stones. */
  function goban(n) {
    let grid = '';
    for (let k = 0; k < n; k++) {
      grid += '<i class="gline v" style="left:' + pct(k, n) + '"></i>';
      grid += '<i class="gline h" style="top:' + pct(k, n) + '"></i>';
    }
    (STARS[n] || []).forEach(pt => {
      grid += '<i class="gstar" style="left:' + pct(pt[1], n) + ';top:' + pct(pt[0], n) + '"></i>';
    });
    return '<div class="goban" id="goban" style="--n:' + n + '">' +
      '<div class="ggrid" id="ggrid">' + grid +
        '<div class="gstones" id="gstones"></div><i class="glast" id="glast" hidden></i>' +
      '</div></div>';
  }

  /* A ring that spreads out from a freshly played point. */
  function ripple(layer, i, n) {
    const r = document.createElement('i');
    r.className = 'ripple';
    r.style.left = pct(i % n, n);
    r.style.top = pct((i / n) | 0, n);
    layer.appendChild(r);
    window.setTimeout(() => { if (r.parentNode) r.parentNode.removeChild(r); }, 600);
  }

  /* Reconcile the stone layer with the board: new points drop in with a ripple,
     captured ones pop off (and fly away when `fly` holds a delta for them), and
     existing elements are reused rather than rebuilt. */
  function syncStones(board, n, last, fly) {
    const layer = document.getElementById('gstones');
    if (!layer) return;
    for (let i = 0; i < board.length; i++) {
      const el = layer.querySelector('[data-i="' + i + '"]');
      const v = board[i];
      if (v) {
        if (!el) {
          const d = document.createElement('i');
          d.dataset.i = i;
          d.style.left = pct(i % n, n);
          d.style.top = pct((i / n) | 0, n);
          d.className = 'stone ' + v;
          layer.appendChild(d);
          ripple(layer, i, n);
        } else if (el.className !== 'stone ' + v) {
          el.className = 'stone ' + v;          // also revives one animating out
        }
      } else if (el && el.className.indexOf('out') < 0) {
        const away = fly && fly[i];
        if (away) {
          el.style.setProperty('--fx', away.x + 'px');
          el.style.setProperty('--fy', away.y + 'px');
          el.className = 'stone out fly';
        } else {
          el.className = 'stone out';
        }
        window.setTimeout(() => {
          if (el.parentNode && el.className.indexOf('out') >= 0) el.parentNode.removeChild(el);
        }, away ? 720 : 380);
      }
    }

    const mark = document.getElementById('glast');
    if (mark) {
      if (last == null || last < 0 || !board[last]) {
        mark.hidden = true;
      } else {
        const fresh = mark.hidden || mark.dataset.at !== String(last);
        mark.hidden = false;
        mark.dataset.at = String(last);
        mark.style.left = pct(last % n, n);
        mark.style.top = pct((last / n) | 0, n);
        mark.className = 'glast ' + (board[last] === 'b' ? 'w' : 'b');   // opposite colour
        if (fresh) {
          mark.animate([{ scale: '.25' }, { scale: '1' }],
            { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1.5)' });
        }
      }
    }
  }

  /* Ring the winning run, popping the stones one after another along it. */
  function markWinLine(line) {
    const layer = document.getElementById('gstones');
    if (!layer) return;
    Array.prototype.forEach.call(layer.querySelectorAll('.win'), e => {
      e.classList.remove('win');
      e.style.animationDelay = '';
      e.style.outline = '';
    });
    (line || []).forEach((i, k) => {
      const el = layer.querySelector('[data-i="' + i + '"]');
      if (!el) return;
      el.style.animationDelay = (k * 80) + 'ms';
      el.classList.add('win');
    });
  }

  /* Flood the counted territory across the board, sweeping out from the middle,
     so the final score is something you watch happen instead of a bare number. */
  function showGoTerritory(state, done) {
    const layer = document.getElementById('gstones');
    if (!layer || !state) { done(); return; }
    const n = state.size;
    const t = Go.territory(state);
    const mid = (n - 1) / 2;
    let span = 0;
    const put = (i, cls) => {
      const c = i % n, r = (i / n) | 0;
      const d = Math.hypot(r - mid, c - mid);
      if (d > span) span = d;
      const el = document.createElement('i');
      el.className = 'terr ' + cls;
      el.style.left = pct(c, n);
      el.style.top = pct(r, n);
      el.style.animationDelay = Math.round(d * 55) + 'ms';
      layer.appendChild(el);
    };
    t.b.forEach(i => put(i, 'b'));
    t.w.forEach(i => put(i, 'w'));
    t.dame.forEach(i => put(i, 'n'));
    window.setTimeout(done, Math.round(span * 55) + 700);
  }

  /* ---------------- gomoku / go ---------------- */

  function boardHead(players, sides, kicker) {
    const panel = pi =>
      '<div class="mpanel" id="bpanel' + pi + '">' +
        '<div class="mavatar">' + avatarSvg(players[pi].avatar) + '</div>' +
        '<div class="mname">' + esc(players[pi].name) + '</div>' +
        '<div class="csideswatch round ' + sides[pi] + '"></div>' +
      '</div>';
    return '<div class="duel-head">' + panel(0) +
      '<div class="msettle">' +
        '<div class="msettle-k">' + esc(kicker) + '</div>' +
        '<div class="msettle-v board-turn" id="boardTurn"></div>' +
        '<div class="mtime">Time <b id="timer">0:00</b></div>' +
      '</div>' + panel(1) + '</div>';
  }

  function gomokuGame(state, players, sides) {
    app().innerHTML =
      '<div class="screen board-screen">' +
        boardHead(players, sides, 'to play') +
        '<div class="board-wrap">' + goban(state.size) + '</div>' +
        '<div class="chess-status" id="boardStatus"></div>' +
        '<div class="game-actions">' + HOME_BTN + '</div>' +
      '</div>';
  }

  function goGame(state, players, sides) {
    app().innerHTML =
      '<div class="screen board-screen">' +
        boardHead(players, sides, 'to play') +
        '<div class="board-wrap">' + goban(state.size) + '</div>' +
        '<div class="score-bar">' +
          '<span class="sbside" id="sbB"></span>' +
          '<span class="sbtrack"><i id="sbFill"></i></span>' +
          '<span class="sbside" id="sbW"></span>' +
        '</div>' +
        '<div class="chess-status" id="boardStatus"></div>' +
        '<div class="actions board-actions stick-foot">' +
          '<button class="btn ghost" id="passBtn">Pass</button>' +
          '<button class="btn ghost" id="resignBtn">Resign</button>' +
          HOME_BTN +
        '</div>' +
      '</div>';
  }

  /* Board size chooser — the same card layout the word game uses for difficulty. */
  function boardSetup(mode, selected) {
    const isGo = mode === 'go';
    const opts = isGo
      ? [['9', '9 × 9', 'The beginner board. Games finish in a few minutes.'],
         ['13', '13 × 13', 'A middle board — more room to build.'],
         ['19', '19 × 19', 'The full board. Long games.']]
      : [['13', '13 × 13', 'A quick, crowded fight.'],
         ['15', '15 × 15', 'The standard Gomoku board.'],
         ['19', '19 × 19', 'Lots of space, slower games.']];
    const cards = opts.map((o, i) =>
      '<button class="diff-card ' + (selected === o[0] ? 'selected' : '') + '" data-size="' + o[0] +
        '" style="--i:' + i + '">' +
        '<div class="diff-name">' + o[1] + '</div>' +
        '<div class="diff-desc">' + esc(o[2]) + '</div>' +
        '<div class="diff-stat">' + (o[0] * o[0]) + ' points</div>' +
      '</button>').join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">' + (isGo ? 'Go' : 'Gomoku') + '</h1>' +
        '<p class="page-sub">' + (isGo
          ? 'Black plays first. Surround empty points to claim them and capture stones by taking ' +
            'their last liberty. Two passes in a row end the game — anything still on the board ' +
            'counts as alive, so capture what you can before you pass.'
          : 'Black plays first. Put a stone on any empty point in turn; the first to line up ' +
            'five in a row wins.') +
        '</p>' +
        '<div class="section-label">Board size</div>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startBtn"' + (selected ? '' : ' disabled') + '>' +
            (isGo ? 'Start game' : 'Start match') + '</button>' +
        '</div>' +
      '</div>';
  }

  function duelSide(players, sides, pi, col, scoreV, scoreK, points, round, tag) {
    return '<div class="duel-side ' + (scoreV.win ? 'win' : '') + '">' +
      '<div class="player-avatar">' + avatarSvg(players[pi].avatar) + '</div>' +
      '<div class="duel-name">' + esc(players[pi].name) + '</div>' +
      '<div class="chess-side-tag"><i class="csideswatch' + (round ? ' round' : '') + ' ' + col + '"></i>' +
        esc(tag || (col === 'b' ? 'Black' : 'White')) + '</div>' +
      '<div class="duel-score">' + scoreV.v + '</div>' +
      '<div class="duel-k">' + esc(scoreK) + '</div>' +
      '<div class="duel-mapped ' + (points < 0 ? 'neg' : '') + '">' +
        (points >= 0 ? '+' : '') + points + '</div>' +
      '<div class="duel-k">added to total</div>' +
    '</div>';
  }

  function boardResultScreen(headline, sidesHtml, stats, againLabel) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="duel-scores">' + sidesHtml + '</div>' +
          '<div class="score-label">' + headline + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          stats.map((s, i) => '<div class="stat" style="--i:' + i + '">' +
            '<div class="v">' + s.v + '</div><div class="k">' + esc(s.k) + '</div></div>').join('') +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="againBtn">' + againLabel + '</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  function gomokuResult(state, res, players, sides) {
    const sidesHtml = [0, 1].map(pi => {
      const col = sides[pi];
      const s = res.scores[col];
      return duelSide(players, sides, pi, col,
        { v: s.stones, win: res.winner === col }, 'stones placed', s.points, true);
    }).join('<div class="duel-vs">vs</div>');
    const headline = res.status === 'draw'
      ? 'A draw — the board is full'
      : esc(players[res.winner === sides[0] ? 0 : 1].name) + ' lined up five';
    boardResultScreen(headline, sidesHtml, [
      { v: res.moves, k: 'Stones played' },
      { v: fmtTime(res.seconds), k: 'Time' },
      { v: res.winner ? res.scores[res.winner].line : '—', k: 'Winning run' }
    ], 'Rematch');
  }

  function goResult(state, res, players, sides) {
    const r = res.result;
    const sidesHtml = [0, 1].map(pi => {
      const col = sides[pi];
      const s = res.scores[col];
      const area = col === 'b' ? r.black : r.white;
      return duelSide(players, sides, pi, col,
        { v: area, win: r.winner === col },
        col === 'w' ? 'area (incl. ' + r.komi + ' komi)' : 'area', s.points, true);
    }).join('<div class="duel-vs">vs</div>');
    const winner = players[r.winner === sides[0] ? 0 : 1];
    const headline = (r.resign ? esc(winner.name) + ' wins by resignation'
      : esc(winner.name) + ' wins by ' + r.margin);
    boardResultScreen(headline, sidesHtml, [
      { v: res.moves, k: 'Moves' },
      { v: res.scores[sides[0]].captures + ' : ' + res.scores[sides[1]].captures, k: 'Captures' },
      { v: fmtTime(res.seconds), k: 'Time' }
    ], 'Rematch');
  }

  /* ---------------- minesweeper ---------------- */

  function mineDifficulty(selected) {
    const level = { beginner: 1, intermediate: 2, expert: 3 };
    const cards = Mine.LEVELS.map((lv, i) => {
      let dots = '';
      for (let k = 1; k <= 3; k++) dots += '<i class="' + (k <= level[lv.key] ? 'on' : '') + '"></i>';
      return '<button class="diff-card ' + (selected === lv.key ? 'selected' : '') + '" data-mlevel="' +
        lv.key + '" style="--i:' + i + '">' +
        '<div class="diff-name">' + lv.label + '</div>' +
        '<div class="diff-desc">' + esc(lv.desc) + '</div>' +
        '<div class="diff-dots">' + dots + '</div>' +
        '<div class="diff-stat">' + (lv.cols * lv.rows) + ' cells · ' + lv.mines + ' mines</div>' +
        '</button>';
    }).join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">Minesweeper</h1>' +
        '<p class="page-sub">Open every safe square without setting off a mine. A number counts ' +
          'the mines touching that square, and the first square you open is always safe. ' +
          'Right-click (or turn on flag mode) to mark a square.</p>' +
        '<div class="section-label">Difficulty</div>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startBtn"' + (selected ? '' : ' disabled') + '>Start game</button>' +
        '</div>' +
      '</div>';
  }

  function mineGame(st) {
    const lv = Mine.cfgOf(st.level);
    let cells = '';
    for (let i = 0; i < st.size; i++) cells += '<button class="mc" data-i="' + i + '"></button>';
    app().innerHTML =
      '<div class="screen mine-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="mineLeft">' + st.mines + '</b><span>mines left</span></div>' +
          '<button class="mine-face" id="mineFace" title="New board" aria-label="New board">☺</button>' +
          '<div class="mine-stat"><b id="timer">0:00</b><span>time</span></div>' +
        '</div>' +
        '<div class="mine-wrap">' +
          '<div class="minegrid" id="minegrid" style="--cols:' + st.cols + ';--rows:' + st.rows + '">' +
            cells +
          '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + esc(lv.label) + ' · ' + st.cols + ' × ' + st.rows +
            ' · ' + st.mines + ' mines</span>' +
          '<button class="btn ghost" id="flagBtn">Flag mode: off</button>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="mineStatus"></div>' +
      '</div>';
  }

  /* Reconcile every square with the model. Squares opened by this action pop in
     a wave that spreads out from where the click landed. */
  function mineSync(st, fresh, origin, revealMines) {
    const grid = document.getElementById('minegrid');
    if (!grid) return;
    const isFresh = {};
    (fresh || []).forEach(i => { isFresh[i] = true; });
    const orow = origin == null ? 0 : (origin / st.cols) | 0;
    const ocol = origin == null ? 0 : origin % st.cols;

    for (let i = 0; i < st.size; i++) {
      const el = grid.children[i];
      if (!el) continue;
      let cls = 'mc', txt = '';
      if (st.open[i]) {
        cls += ' open';
        if (st.mine[i]) { cls += ' mine' + (i === st.exploded ? ' boom' : ''); txt = '●'; }
        else if (st.near[i] > 0) { cls += ' n' + st.near[i]; txt = String(st.near[i]); }
      } else if (revealMines && st.mine[i]) {
        cls += ' open mine shown';
        txt = '●';
      } else if (st.flag[i]) {
        cls += ' flag';
        txt = '⚑';
      }

      if (isFresh[i]) {
        const d = Math.abs(((i / st.cols) | 0) - orow) + Math.abs((i % st.cols) - ocol);
        el.style.animationDelay = Math.min(420, d * 24) + 'ms';
      } else if (el.style.animationDelay) {
        el.style.animationDelay = '';
      }
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== txt) el.textContent = txt;
    }

    const left = document.getElementById('mineLeft');
    if (left) left.textContent = String(st.mines - st.flags);
    const face = document.getElementById('mineFace');
    if (face) face.textContent = st.status === 'won' ? '★' : (st.status === 'lost' ? '☹' : '☺');
  }

  function mineResult(st, res) {
    const s = res.score;
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (s.won
            ? 'Board cleared — ' + esc(res.levelLabel)
            : 'Boom — ' + res.opened + ' of ' + res.safe + ' safe squares') + '</div>' +
          '<div class="score-breakdown">' + (s.won
            ? res.base + ' base × ' + s.speed.toFixed(2) + ' speed · ' + res.mines + ' mines'
            : 'no points this time — scores are only ever added') + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.opened + '/' + res.safe +
            '</div><div class="k">Safe squares</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.flags + '/' + res.mines +
            '</div><div class="k">Mines flagged</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="mineAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- word stack ---------------- */

  function wsPanel(players, pi) {
    const p = players[pi] || { name: '—', avatar: 0 };
    return '<div class="mpanel ws-panel" id="wsPanel' + pi + '">' +
      '<div class="mavatar">' + avatarSvg(p.avatar) + '</div>' +
      '<div class="mname">' + esc(p.name) + '</div>' +
      '<div class="ws-swatch o' + pi + '">W</div>' +
      '<div class="ws-left"><b id="wsLeft' + pi + '">0</b> left</div>' +
      '</div>';
  }

  function wsTileHtml(t, turn, live) {
    const act = live && turn === t.owner;
    return '<button class="ws-tile o' + t.owner + (t.vertical ? ' vert' : '') + '" ' +
      'data-tile="' + t.id + '"' + (act ? '' : ' disabled') + '>' +
      t.word.split('').map(ch => '<span class="ws-l">' + ch + '</span>').join('') +
      '</button>';
  }

  /* Board size chooser. Easy is the board the mode started with. */
  function wordstackSetup(selected) {
    const rank = { easy: 1, medium: 2, hard: 3 };
    const cards = WordStack.LEVELS.map((lv, i) => {
      let dots = '';
      for (let k = 1; k <= 3; k++) dots += '<i class="' + (k <= rank[lv.key] ? 'on' : '') + '"></i>';
      return '<button class="diff-card ' + (selected === lv.key ? 'selected' : '') + '" ' +
        'data-wlevel="' + lv.key + '" style="--i:' + i + '">' +
        '<div class="diff-name">' + lv.label + '</div>' +
        '<div class="diff-desc">' + esc(lv.desc) + '</div>' +
        '<div class="diff-dots">' + dots + '</div>' +
        '<div class="diff-stat">' + (lv.cols * lv.rows) + ' squares · ' + lv.tiles +
          ' tiles each</div>' +
        '</button>';
    }).join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">Word Stack</h1>' +
        '<p class="page-sub">Take turns dropping a word tile onto the shared board so that every ' +
          'letter it covers lands on the same letter already sitting there. Tap a tile to turn it ' +
          '90°, drag it to place it. A turn lasts 30 seconds, and the score is the crossing nodes ' +
          'you end up owning.</p>' +
        '<div class="section-label">Board size</div>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startBtn"' + (selected ? '' : ' disabled') +
            '>Start match</button>' +
        '</div>' +
      '</div>';
  }

  function wordstackGame(st, players) {
    let cells = '';
    for (let i = 0; i < st.cols * st.rows; i++) cells += '<div class="ws-cell" data-i="' + i + '"></div>';
    const trayCol = pi =>
      '<div class="ws-tray" id="wsTray' + pi + '" data-owner="' + pi + '">' +
        '<button class="btn ghost ws-pass" id="wsPass' + pi + '">Pass</button>' +
        '<div class="ws-tray-head" id="wsTrayHead' + pi + '">—</div>' +
        '<div class="ws-tray-list" id="wsList' + pi + '"></div>' +
      '</div>';

    app().innerHTML =
      '<div class="screen ws-screen">' +
        '<div class="ws-head">' +
          wsPanel(players, 0) +
          '<div class="msettle ws-turnbox">' +
            '<div class="msettle-k">to play</div>' +
            '<div class="ws-turnname" id="wsTurnName">—</div>' +
            '<div class="ws-bar"><i id="wsBar"></i></div>' +
            '<div class="ws-tnum"><b id="wsTimerNum">' +
              (WordStack.TURN_MS / 1000).toFixed(1) + '</b>s to go · ' +
              '<span id="timer">0:00</span></div>' +
          '</div>' +
          wsPanel(players, 1) +
        '</div>' +
        '<div class="ws-body">' +
          trayCol(0) +
          '<div class="ws-board-wrap" id="wsBoardWrap">' +
            '<div class="ws-board-stage" id="wsStage">' +
              '<div class="ws-grid" id="wsGrid" style="--cols:' + st.cols + ';--rows:' + st.rows + '">' +
                cells +
              '</div>' +
            '</div>' +
          '</div>' +
          trayCol(1) +
        '</div>' +
        '<div class="ws-foot">' +
          '<div class="ws-zoom">' +
            '<button class="btn ghost" id="wsZoomOut" title="Zoom out">−</button>' +
            '<button class="btn ghost" id="wsZoomFit" title="Fit the board">' +
              '<span id="wsZoomLevel">100%</span></button>' +
            '<button class="btn ghost" id="wsZoomIn" title="Zoom in">+</button>' +
          '</div>' +
          '<div class="ws-hint">Drag a tile onto matching letters · tap it to turn it 90° · ' +
            'pinch (or Ctrl-scroll) to zoom, drag the board to pan</div>' +
          '<button class="btn ghost ws-end" id="wsEndBtn" title="Stop here and settle on tiles left">' +
            'End game</button>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="wsStatus"></div>' +
      '</div>';
  }

  /* Every word is drawn as a capsule: a corner is only rounded BIG when both
     cells touching it are empty, so the two ends of a word carry the four big
     corners. Where two words meet — including two ends that share one cell —
     there is a single shared flat seam instead of two colliding round ones. */
  const WS_RAD = '46%', WS_RADS = '2px';
  function wsCorners(g, cols, rows, i) {
    const r = (i / cols) | 0, c = i % cols;
    const up = r > 0 && !!g[i - cols];
    const down = r < rows - 1 && !!g[i + cols];
    const lf = c > 0 && !!g[i - 1];
    const rt = c < cols - 1 && !!g[i + 1];
    return ((!up && !lf) ? WS_RAD : WS_RADS) + ' ' +
           ((!up && !rt) ? WS_RAD : WS_RADS) + ' ' +
           ((!down && !rt) ? WS_RAD : WS_RADS) + ' ' +
           ((!down && !lf) ? WS_RAD : WS_RADS);
  }

  /* Reconcile the whole board. Cells touched by this move pop in one after
     another (`fresh` is in letter order); `preview` marks where a dragged
     tile would land. */
  function wsPaint(st, fresh, preview, ok) {
    const grid = document.getElementById('wsGrid');
    if (!grid) return;
    const g = st.grid, cols = st.cols, rows = st.rows;
    const idx = {};
    (fresh || []).forEach((i, k) => { idx[i] = k; });
    const pre = {};
    (preview || []).forEach(i => { pre[i] = true; });
    for (let i = 0; i < g.length; i++) {
      const el = grid.children[i];
      if (!el) continue;
      const cell = g[i];
      const ch = cell ? cell.ch : '';
      if (el.textContent !== ch) el.textContent = ch;
      let cls = 'ws-cell';
      if (cell) cls += ' filled o' + cell.owner + (cell.shared ? ' shared' : '');
      if (pre[i]) cls += ok ? ' pre-ok' : ' pre-bad';
      if (el.className !== cls) {
        if (idx[i] != null) el.style.animationDelay = Math.min(300, idx[i] * 55) + 'ms';
        el.className = cls;
      }
      const want = cell ? wsCorners(g, cols, rows, i) : '';
      if (el.dataset.rad !== want) {
        el.dataset.rad = want;
        if (want) el.style.setProperty('--wrad', want);
        else el.style.removeProperty('--wrad');
      }
    }
  }

  function wsPreview(st, cells, ok) { wsPaint(st, [], cells, ok); }

  function wsTrays(st, players) {
    [0, 1].forEach(pi => {
      const list = document.getElementById('wsList' + pi);
      const head = document.getElementById('wsTrayHead' + pi);
      const box = document.getElementById('wsTray' + pi);
      if (!list) return;
      const p = players[pi] || {};
      const tiles = st.tiles.filter(t => t.owner === pi && !t.placed);
      const live = st.status === 'playing';
      const mine = live && st.turn === pi;
      if (head) head.textContent = (p.name || '—') + ' · ' + tiles.length +
        (tiles.length === 1 ? ' tile' : ' tiles');
      if (box) box.classList.toggle('off', !mine);
      const pass = document.getElementById('wsPass' + pi);
      if (pass) pass.disabled = !mine;
      list.innerHTML = tiles.length
        ? tiles.map(t => wsTileHtml(t, st.turn, live)).join('')
        : '<div class="ws-empty">Tray empty</div>';
    });
    [0, 1].forEach(pi => {
      const el = document.getElementById('wsLeft' + pi);
      if (el) el.textContent = WordStack.tray(st, pi).length;
    });
  }

  function wsTurn(st, players) {
    const nameEl = document.getElementById('wsTurnName');
    const name = (players[st.turn] || {}).name || '—';
    if (nameEl && nameEl.textContent !== name) {
      nameEl.textContent = name;
      nameEl.classList.remove('bump');
      void nameEl.offsetWidth;
      nameEl.classList.add('bump');
    }
    document.querySelectorAll('.ws-panel').forEach((el, pi) => el.classList.toggle('on', pi === st.turn));
    const bar = document.getElementById('wsBar');
    if (bar) {
      bar.style.width = '100%';
      bar.classList.remove('low');
    }
  }

  function wordstackResult(st, res, players) {
    const sidesHtml = [0, 1].map(pi => {
      const s = res.scores[pi];
      const key = 'nodes · ' + res.perNode + ' pts each' +
        (s.bonus ? ' +' + s.bonus + ' win' : '');
      return duelSide(players, [0, 1], pi, pi === 0 ? 'b' : 'w',
        { v: s.nodes, win: res.winner === pi }, key, s.points, true,
        pi === 0 ? 'Dark tiles' : 'Light tiles');
    }).join('<div class="duel-vs">vs</div>');
    const headline = res.status === 'draw'
      ? (res.reason === 'both'
        ? 'A draw — both trays were emptied together'
        : res.reason === 'agreed'
          ? 'A draw — level on tiles left'
          : 'A draw — neither tray could be added to')
      : esc((players[res.winner] || {}).name || '—') +
        (res.reason === 'tiles' ? ' used up every tile first' : ' wins with fewer tiles left');
    boardResultScreen(headline, sidesHtml, [
      { v: res.moves, k: 'Words played' },
      { v: res.crossings, k: 'Shared letters' },
      { v: fmtTime(res.seconds), k: 'Time' }
    ], 'Rematch');
  }

  /* ---------------- tacta ---------------- */

  /* One printed shape. It fills its block exactly and is drawn as a thin
     outline over a dark fill, which is also exactly the cells the engine
     counts as "printed" — so what you see is what covers a dot. */
  function tactaShape(b, cls) {
    const c = 'tc-shape' + (cls ? ' ' + cls : '');
    if (b.k === 'T') {
      const pts = Tacta.triVerts(b);
      return '<polygon class="' + c + '" points="' +
        pts.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(' ') + '"/>';
    }
    return '<rect class="' + c + '" x="' + b.c + '" y="' + b.r + '" width="' + b.w +
      '" height="' + b.h + '" rx="0.09"/>';
  }

  /* A white ring with a pip in it, like the dots printed on the real cards. */
  function tactaDot(cx, cy) {
    return '<circle class="tc-dot" cx="' + cx + '" cy="' + cy + '" r="0.19"/>' +
      '<circle class="tc-dotp" cx="' + cx + '" cy="' + cy + '" r="0.07"/>';
  }

  /* The card's suit badge, sitting in the middle with its number inside. */
  function tactaBadge(kind, x, y) {
    if (kind === 'T') {
      return '<polygon class="tc-badge" points="' + x + ',' + (y - 0.5) + ' ' +
        (x + 0.54) + ',' + (y + 0.42) + ' ' + (x - 0.54) + ',' + (y + 0.42) + '"/>';
    }
    if (kind === 'A') {
      return '<rect class="tc-badge" x="' + (x - 0.3) + '" y="' + (y - 0.48) +
        '" width="0.6" height="0.96" rx="0.14"/>';
    }
    if (kind === 'B') {
      return '<rect class="tc-badge" x="' + (x - 0.48) + '" y="' + (y - 0.3) +
        '" width="0.96" height="0.6" rx="0.14"/>';
    }
    return '<rect class="tc-badge" x="' + (x - 0.42) + '" y="' + (y - 0.42) +
      '" width="0.84" height="0.84" rx="0.16"/>';
  }

  /* One whole card: plate, frame, shapes, dots and the middle badge. */
  function tactaCardInner(card, ow, oh, extra) {
    const blocks = Tacta.blocksOf(card);
    const dots = Tacta.dotsOf(card);
    const cw = Tacta.W, ch = Tacta.H;
    let out = '<rect class="tc-plate" x="0" y="0" width="' + cw + '" height="' + ch + '" rx="0.38"/>';
    blocks.forEach(b => { out += tactaShape(b); });
    dots.forEach(di => {
      const cx = ((di % ow) | 0) + 0.5, cy = (((di / ow) | 0) + 0.5);
      out += tactaDot(cx, cy);
    });
    out += tactaBadge(blocks.length ? blocks[0].k : 'S', cw / 2, ch / 2) +
      '<text class="tc-num" x="' + (cw / 2) + '" y="' + (ch / 2) + '">' + card.num + '</text>' +
      '<rect class="tc-frame" x="0" y="0" width="' + cw + '" height="' + ch + '" rx="0.38"/>';
    return '<g class="tc-gcard o' + card.owner + (extra ? ' ' + extra : '') + '">' + out + '</g>';
  }

  /* A standalone svg of one card — the tray and the drag ghost use this. */
  function tactaCardSvg(card, cls) {
    const ow = Tacta.orW(card.rot), oh = Tacta.orH(card.rot);
    const pad = 0.1;
    return '<svg class="tc-cardsvg" viewBox="' + (-pad) + ' ' + (-pad) + ' ' +
      (ow + pad * 2) + ' ' + (oh + pad * 2) + '">' +
      tactaCardInner(card, ow, oh, cls || '') + '</svg>';
  }

  /* The base card: every shape in every position the set uses, so any card
     can line up with it. */
  function tactaStartInner() {
    const cw = Tacta.W, ch = Tacta.H;
    let out = '<rect class="tc-plate tc-platestart" x="0" y="0" width="' + cw +
      '" height="' + ch + '" rx="0.38"/>';
    Tacta.BASE_POSITIONS.forEach(b => { out += tactaShape(b, 'tc-guide'); });
    out += '<rect class="tc-startmark" x="' + (cw / 2 - 0.62) + '" y="' + (ch / 2 - 0.62) +
      '" width="1.24" height="1.24" rx="0.22"/>';
    return out;
  }

  /* The whole pile, painted bottom to top, so a card laid later covers
     whatever it lands on. */
  function tactaArt(st) {
    let out = '<g transform="translate(' + st.startC + ',' + st.startR + ')">' + tactaStartInner() + '</g>';
    const lastIdx = st.stack.length - 1;
    st.stack.forEach((id, k) => {
      const card = Tacta.cardOf(st, id);
      out += '<g transform="translate(' + card.c + ',' + card.r + ')">' +
        tactaCardInner(card, Tacta.orW(card.rot), Tacta.orH(card.rot),
          k === lastIdx ? 'last' : '') + '</g>';
    });
    return out;
  }

  function tactaSide(st, players, pi) {
    const p = players[pi] || {};
    const t = Tacta.tally(st);
    const cap = Tacta.TOTAL_DOTS;
    const pct = Math.round(100 * t.visible[pi] / cap);
    return '<div class="tc-side p' + pi + '" id="tcSide' + pi + '">' +
      '<div class="player-avatar">' + avatarSvg(p.avatar) + '</div>' +
      '<div class="tc-side-info">' +
        '<div class="tc-side-name">' + esc(p.name || '—') + '</div>' +
        '<div class="tc-dots"><b id="tcDots' + pi + '">' + t.visible[pi] + '</b>' +
          '<span>/' + cap + ' dots</span></div>' +
      '</div>' +
      '<div class="tc-dotbar p' + pi + '"><i id="tcFill' + pi + '" style="width:' + pct + '%"></i></div>' +
      '</div>';
  }

  function tactaTray(pi, players) {
    const p = players[pi] || {};
    return '<div class="tc-tray p' + pi + '" id="tcTray' + pi + '">' +
      '<div class="tc-tray-head" id="tcTrayHead' + pi + '">' + esc(p.name || '—') + '</div>' +
      '<div class="tc-list" id="tcList' + pi + '"></div>' +
      '</div>';
  }

  function tactaGame(st, players) {
    const n = st.board;
    let cells = '';
    for (let i = 0; i < n * n; i++) cells += '<div class="tc-c" data-i="' + i + '"></div>';
    app().innerHTML =
      '<div class="screen tc-screen">' +
        '<div class="tc-head">' +
          tactaSide(st, players, 0) +
          '<div class="tc-mid">' +
            '<div class="tc-turn" id="tcTurn"></div>' +
            '<div class="tc-sub" id="tcSub"></div>' +
            '<div class="tc-clock">Time <b id="timer">0:00</b></div>' +
          '</div>' +
          tactaSide(st, players, 1) +
        '</div>' +
        '<div class="tc-body">' +
          tactaTray(0, players) +
          '<div class="tc-board-wrap" id="tcBoardWrap">' +
            '<div class="tc-stage" id="tcStage">' +
              '<div class="tc-board" id="tcBoard" style="--n:' + n + '">' +
                '<svg class="tc-art" id="tcArt" viewBox="0 0 ' + n + ' ' + n + '" ' +
                  'preserveAspectRatio="none" aria-hidden="true"></svg>' +
                cells +
              '</div>' +
            '</div>' +
          '</div>' +
          tactaTray(1, players) +
        '</div>' +
        '<div class="tc-bottom stick-foot">' +
          '<div class="tc-status" id="tcStatus"></div>' +
          '<div class="tc-foot">' +
            '<button class="btn ghost tc-act" id="tcRotate" title="Turn the selected card 90° (R)">Rotate</button>' +
            '<button class="btn ghost tc-act" id="tcFlip" title="Mirror the selected card (M)">Flip</button>' +
            '<span class="tc-zoom">' +
              '<button class="btn ghost" id="tcZoomOut" title="Zoom out">−</button>' +
              '<span class="tc-zlabel" id="tcZoomLevel">100%</span>' +
              '<button class="btn ghost" id="tcZoomIn" title="Zoom in">+</button>' +
              '<button class="btn ghost" id="tcZoomFit" title="Fit the whole table">Fit</button>' +
            '</span>' +
            '<span class="tc-hint">Drag a card onto the table. Tap it to turn 90°, right-click to mirror. ' +
              'Square on square, rectangle on rectangle, triangle on triangle — ' +
              'and a printed shape buries any dot under it.</span>' +
            HOME_BTN +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* Repaints the pile. Cheap: at most ~15 cards. */
  function tactaPaint(st) {
    const art = document.getElementById('tcArt');
    if (!art) return;
    art.innerHTML = tactaArt(st);
  }

  function tactaTrays(st, players) {
    [0, 1].forEach(pi => {
      const list = document.getElementById('tcList' + pi);
      const head = document.getElementById('tcTrayHead' + pi);
      const box = document.getElementById('tcTray' + pi);
      if (!list) return;
      const p = players[pi] || {};
      const ids = Tacta.handOf(st, pi);
      const live = st.status === 'playing';
      const mine = live && st.turn === pi;
      if (head) {
        head.textContent = (p.name || '—') + ' · ' + ids.length +
          (ids.length === 1 ? ' card' : ' cards');
      }
      if (box) box.classList.toggle('off', !mine);
      list.innerHTML = ids.length
        ? ids.map(id => {
            const card = Tacta.cardOf(st, id);
            return '<button class="tc-card' + (mine ? '' : ' dim') + '" data-card="' + id + '">' +
              tactaCardSvg(card) + '</button>';
          }).join('')
        : '<div class="tc-empty">Every card is down</div>';
    });
  }

  function tactaTurn(st, players) {
    const p = players[st.turn] || {};
    const me = players[0] || {}, you = players[1] || {};
    const t = Tacta.tally(st);
    const cap = Tacta.TOTAL_DOTS;
    const nameEl = document.getElementById('tcTurn');
    if (nameEl) nameEl.textContent = (p.name || '—') + ' to play';
    [0, 1].forEach(pi => {
      const el = document.getElementById('tcSide' + pi);
      if (el) el.classList.toggle('on', st.status === 'playing' && st.turn === pi);
      const num = document.getElementById('tcDots' + pi);
      if (num) num.textContent = t.visible[pi];
      const fill = document.getElementById('tcFill' + pi);
      if (fill) fill.style.width = Math.round(100 * t.visible[pi] / cap) + '%';
    });
    const sub = document.getElementById('tcSub');
    if (sub) {
      sub.textContent = st.status === 'playing'
        ? 'Cards left — ' + esc(me.name || 'P1') + ' ' + Tacta.handOf(st, 0).length +
          ' · ' + esc(you.name || 'P2') + ' ' + Tacta.handOf(st, 1).length
        : '';
    }
  }

  function tactaResult(st, res, players) {
    const sidesHtml = [0, 1].map(pi => {
      const s = res.scores[pi];
      const key = 'dots · ' + res.perDot + ' pts each' + (s.bonus ? ' +' + s.bonus + ' win' : '');
      return duelSide(players, [0, 1], pi, pi === 0 ? 'b' : 'w',
        { v: s.visible, win: res.winner === pi }, key, s.points, true,
        pi === 0 ? 'Red cards' : 'Blue cards');
    }).join('<div class="duel-vs">vs</div>');
    const headline = res.status === 'draw'
      ? (res.reason === 'stuck'
        ? 'A draw — neither tray could add another card'
        : 'A draw — the same number of dots stayed in sight')
      : esc((players[res.winner] || {}).name || '—') +
        (res.reason === 'stuck' ? ' wins on dots in sight' : ' kept the most dots in sight');
    boardResultScreen(headline, sidesHtml, [
      { v: res.moves, k: 'Cards played' },
      { v: res.covered, k: 'Dots covered' },
      { v: fmtTime(res.seconds), k: 'Time' }
    ], 'Rematch');
  }

  /* ---------------- player history ---------------- */  /* ---------------- number slide ---------------- */

  /* Difficulty page shared by the two solo puzzles: a title, a blurb and one
     card per level with a 1-3 difficulty meter. */
  function puzzleDiff(head, sub, levels, sel, attr, stat) {
    const cards = levels.map((lv, i) => {
      let rank = '';
      for (let k = 0; k < 3; k++) rank += '<i class="' + (k <= i ? 'on' : '') + '"></i>';
      return '<button class="diff-card ' + (sel === lv.key ? 'selected' : '') + '" ' +
        attr + '="' + lv.key + '" style="--i:' + i + '">' +
        '<div class="diff-name">' + esc(lv.label) + '</div>' +
        '<div class="diff-desc">' + esc(lv.desc) + '</div>' +
        '<div class="diff-dots">' + rank + '</div>' +
        '<div class="diff-stat">' + esc(stat(lv)) + '</div>' +
        '</button>';
    }).join('');

    app().innerHTML =
      '<div class="screen">' +
        '<h1 class="page-title">' + esc(head) + '</h1>' +
        '<p class="page-sub">' + esc(sub) + '</p>' +
        '<div class="section-label">Difficulty</div>' +
        '<div class="diffs">' + cards + '</div>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="backHome">Back</button>' +
          '<button class="btn primary" id="startBtn"' + (sel ? '' : ' disabled') + '>Start game</button>' +
        '</div>' +
      '</div>';
  }

  function slideDifficulty(selected) {
    puzzleDiff('Number Slide',
      'Slide a number into the empty square. Put every number back in order, ' +
      'with the empty square in the bottom-right corner. Every puzzle is made by ' +
      'sliding, so it can always be solved.',
      Slide.LEVELS, selected, 'data-slevel',
      lv => (lv.n * lv.n - 1) + ' numbers · par ' + fmtTime(lv.par));
  }

  function slideGame(st) {
    const tiles = st.size - 1;
    app().innerHTML =
      '<div class="screen slide-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="moveCount">0</b><span>moves</span></div>' +
          '<button class="mine-face" id="slideNew" title="Scramble again" aria-label="Scramble again">↻</button>' +
          '<div class="mine-stat"><b id="timer">0:00</b><span>time</span></div>' +
        '</div>' +
        '<div class="slide-wrap">' +
          '<div class="slide-grid" id="slideGrid" style="--n:' + st.n + '"></div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + esc(st.label) + ' · ' + tiles + ' numbers · par ' +
            fmtTime(st.par) + '</span>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="slideStatus">Tap a number next to the gap to slide it, ' +
          'or use the arrow keys — the number moves in the direction you press.</div>' +
      '</div>';

    buildSlideTiles(st);
  }

  /* Tiles are absolutely positioned and moved with a transform, so a slide is a
     plain CSS transition rather than a re-layout. */
  function buildSlideTiles(st) {
    const grid = document.getElementById('slideGrid');
    if (!grid) return;
    let html = '';
    for (let i = 0; i < st.size; i++) {
      if (st.board[i] === Slide.BLANK) continue;
      html += '<button class="slide-tile" data-at="' + i + '" data-v="' + st.board[i] + '">' +
        '<span>' + st.board[i] + '</span></button>';
    }
    grid.innerHTML = html;
    slideSync(st, null);
  }

  /* Re-seat every tile from the model. Nothing is rebuilt, so the tiles that did
     not move simply stay put and the one that did glides across. */
  function slideSync(st, res) {
    const grid = document.getElementById('slideGrid');
    if (!grid) return;
    const n = st.n;
    const tiles = {};
    Array.prototype.forEach.call(grid.children, el => { tiles[el.dataset.v] = el; });
    for (let i = 0; i < st.size; i++) {
      const v = st.board[i];
      if (v === Slide.BLANK) continue;
      const el = tiles[v];
      if (!el) continue;
      el.style.setProperty('--cx', (i % n));
      el.style.setProperty('--cy', ((i / n) | 0));
      const home = (i === v - 1);
      el.classList.toggle('home', home);
      el.classList.toggle('can', Slide.canSlide(st, i));
      el.dataset.at = i;
    }
    const mv = document.getElementById('moveCount');
    if (mv) mv.textContent = String(st.moves);
    if (res && res.moved && res.solved) {
      const s = document.getElementById('slideStatus');
      if (s) s.textContent = 'Solved in ' + st.moves + ' moves!';
    }
  }

  function slideResult(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? 'Solved — ' + esc(res.label) + ' in ' + esc(fmtTime(res.seconds))
            : 'Not finished yet') + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base × ' + res.speed.toFixed(2) +
            ' speed · par ' + fmtTime(res.par) + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.moves +
            '</div><div class="k">Moves</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.home + '/' + res.total +
            '</div><div class="k">Numbers home</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="slideAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- sudoku ---------------- */

  function sudokuDifficulty(selected) {
    puzzleDiff('Sudoku',
      'Fill the grid so every row, every column and every 3 × 3 box holds the ' +
      'numbers 1 to 9 exactly once. Every puzzle is checked to have a single ' +
      'solution, so there is only ever one way to finish it.',
      Sudoku.LEVELS, selected, 'data-sulevel',
      lv => 'about ' + (lv.clues - 1) + ' numbers given · par ' + fmtTime(lv.par));
  }

  function suCellClass(st, i, bad) {
    let cls = 'su-c';
    if (st.given[i]) cls += ' given';
    else if (st.grid[i]) cls += ' entry';
    const r = (i / 9) | 0, c = i % 9;
    if (c % 3 === 2 && c < 8) cls += ' br';
    if (r % 3 === 2 && r < 8) cls += ' bb';
    if (bad[i]) cls += ' bad';
    return cls;
  }

  function sudokuGame(st) {
    const cells = [];
    for (let i = 0; i < st.size; i++) {
      cells.push('<button class="' + suCellClass(st, i, new Array(st.size).fill(false)) +
        '" data-i="' + i + '"></button>');
    }
    let pad = '';
    for (let v = 1; v <= 9; v++) pad += '<button class="su-key" data-v="' + v + '">' + v + '</button>';
    pad += '<button class="su-key erase" data-v="0" title="Erase (Backspace)">⌫</button>';

    app().innerHTML =
      '<div class="screen su-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="suLeft">' + (st.size - st.clues) + '</b><span>to fill</span></div>' +
          '<button class="mine-face" id="suNew" title="New puzzle" aria-label="New puzzle">↻</button>' +
          '<div class="mine-stat"><b id="timer">0:00</b><span>time</span></div>' +
        '</div>' +
        '<div class="su-wrap">' +
          '<div class="su-grid" id="suGrid">' + cells.join('') + '</div>' +
          '<div class="su-side">' +
            '<div class="su-pad" id="suPad">' + pad + '</div>' +
            '<button class="btn ghost su-notes" id="suNotes">Pencil marks: off</button>' +
            '<div class="chess-status" id="suStatus">Tap a square, then a number. ' +
              'Keys 1-9 write, Backspace clears, arrows move, N toggles pencil marks.</div>' +
          '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + esc(st.label) + ' · ' + st.clues + ' numbers given · par ' +
            fmtTime(st.par) + '</span>' +
          HOME_BTN +
        '</div>' +
      '</div>';
  }

  /* Repaint the board from the model, plus the light highlighting that makes a
     9 × 9 grid readable: the selected square, its row/column/box, and every
     square holding the same number. */
  function sudokuSync(st) {
    const grid = document.getElementById('suGrid');
    if (!grid) return;
    const bad = Sudoku.conflicts(st);
    const sel = st.sel;
    const selRow = sel >= 0 ? (sel / 9) | 0 : -1;
    const selCol = sel >= 0 ? sel % 9 : -1;
    const selBox = sel >= 0 ? (((sel / 9) | 0) / 3 | 0) * 3 + (((sel % 9) / 3) | 0) : -1;
    const selVal = sel >= 0 ? st.grid[sel] : 0;

    for (let i = 0; i < st.size; i++) {
      const el = grid.children[i];
      if (!el) continue;
      const v = st.grid[i];
      const r = (i / 9) | 0, c = i % 9;
      const box = (r / 3 | 0) * 3 + ((c / 3) | 0);
      let cls = suCellClass(st, i, bad);
      if (sel >= 0 && i !== sel && (r === selRow || c === selCol || box === selBox)) cls += ' peer';
      if (selVal && v === selVal && i !== sel) cls += ' same';
      if (st.wrong[i] && !v) cls += ' was-wrong';
      if (i === sel) cls += ' sel';
      if (el.className !== cls) el.className = cls;

      const notes = st.notes[i];
      let html = '';
      if (v) html = String(v);
      else if (notes) {
        html = '<span class="su-notes-grid">';
        for (let d = 1; d <= 9; d++) {
          html += '<i>' + ((notes >> (d - 1)) & 1 ? d : '') + '</i>';
        }
        html += '</span>';
      }
      if (el.innerHTML !== html) el.innerHTML = html;
    }

    const left = document.getElementById('suLeft');
    if (left) left.textContent = String(st.size - Sudoku.filled(st));

    const pad = document.getElementById('suPad');
    if (pad) {
      Array.prototype.forEach.call(pad.children, btn => {
        const v = Number(btn.dataset.v);
        btn.classList.toggle('done', v > 0 && Sudoku.placed(st, v) >= 9);
      });
    }
    const nb = document.getElementById('suNotes');
    if (nb) {
      nb.textContent = 'Pencil marks: ' + (st.notesOn ? 'on' : 'off');
      nb.classList.toggle('active', st.notesOn);
    }
  }

  function sudokuResult(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? 'Solved — ' + esc(res.label) + ' in ' + esc(fmtTime(res.seconds))
            : 'Not finished yet') + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base' +
            (res.cleanBonus ? ' (incl. +' + res.cleanBonus + ' clean)' : '') +
            ' × ' + res.speed.toFixed(2) + ' speed · par ' + fmtTime(res.par) + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + res.mistakes +
            '</div><div class="k">Wrong numbers</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.clues +
            '</div><div class="k">Numbers given</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="suAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- nonogram ---------------- */

  function nonogramDifficulty(selected) {
    puzzleDiff('Nonogram',
      'The numbers beside each row and above each column are the lengths of that ' +
      'line\'s runs of shaded squares, in order. Shade the squares that satisfy ' +
      'every clue at once. Every puzzle here can be finished by logic alone — ' +
      'there is never any need to guess.',
      Nonogram.LEVELS, selected, 'data-nglevel',
      lv => lv.n + ' × ' + lv.n + ' · par ' + fmtTime(lv.par));
  }

  /* The grid, plus a clue strip on the top and left, has to fit the screen. */
  function ngCell(st) {
    const n = st.n;
    const avail = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6, 660);
    return Math.max(13, Math.min(36, Math.floor(avail / (n + 2.4))));
  }

  function ngClue(list, cls, line) {
    return '<div class="ng-clue ' + cls + '" data-line="' + line + '">' +
      list.map(v => '<b>' + v + '</b>').join('') + '</div>';
  }

  function nonogramGame(st) {
    const n = st.n, c = ngCell(st);
    let top = '', left = '';
    for (let i = 0; i < n; i++) top += ngClue(st.clues.cols[i], 'ng-clue-top', 'c' + i);
    for (let i = 0; i < n; i++) left += ngClue(st.clues.rows[i], 'ng-clue-left', 'r' + i);
    let cells = '';
    for (let i = 0; i < n * n; i++) {
      const col = i % n, row = (i / n) | 0;
      let cls = 'ng-c';
      if (col % 5 === 4 && col < n - 1) cls += ' c5';
      if (row % 5 === 4 && row < n - 1) cls += ' r5';
      cells += '<button class="' + cls + '" data-i="' + i + '"></button>';
    }

    app().innerHTML =
      '<div class="screen ng-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="ngShaded">0</b><span>shaded</span></div>' +
          '<button class="mine-face" id="ngNew" title="New picture" aria-label="New picture">↻</button>' +
          '<div class="mine-stat"><b id="timer">0:00</b><span>time</span></div>' +
        '</div>' +
        '<div class="ng-wrap" id="ngWrap" style="--n:' + n + ';--c:' + c + 'px">' +
          '<div class="ng-corner"></div>' +
          '<div class="ng-top">' + top + '</div>' +
          '<div class="ng-left">' + left + '</div>' +
          '<div class="ng-grid" id="ngGrid">' + cells + '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + n + ' × ' + n +
            ' · par ' + fmtTime(st.par) + '</span>' +
          '<button class="btn ghost" id="ngMode">Shade: on</button>' +
          '<button class="btn ghost" id="ngClear">Clear marks</button>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="ngStatus">Drag across squares to shade them. ' +
          'Switch to the cross tool to note squares that must stay blank.</div>' +
      '</div>';
  }

  function nonogramSync(st) {
    const grid = document.getElementById('ngGrid');
    if (!grid) return;
    const states = Nonogram.lineStates(st);
    const marks = st.marks;
    for (let i = 0; i < marks.length; i++) {
      const el = grid.children[i];
      if (!el) continue;
      const cls = 'ng-c' +
        (marks[i] === Nonogram.FILLED ? ' on' : (marks[i] === Nonogram.EMPTY ? ' cross' : '')) +
        ((i % st.n) % 5 === 4 && (i % st.n) < st.n - 1 ? ' c5' : '') +
        ((((i / st.n) | 0) % 5) === 4 && ((i / st.n) | 0) < st.n - 1 ? ' r5' : '');
      if (el.className !== cls) el.className = cls;
    }
    const wrap = document.getElementById('ngWrap');
    if (wrap) {
      for (let i = 0; i < st.n; i++) {
        const col = wrap.querySelector('.ng-clue-top[data-line="c' + i + '"]');
        if (col) {
          col.classList.toggle('done', states.cols[i] === 'done');
          col.classList.toggle('over', states.cols[i] === 'over');
        }
        const row = wrap.querySelector('.ng-clue-left[data-line="r' + i + '"]');
        if (row) {
          row.classList.toggle('done', states.rows[i] === 'done');
          row.classList.toggle('over', states.rows[i] === 'over');
        }
      }
    }
    const sh = document.getElementById('ngShaded');
    if (sh) sh.textContent = String(Nonogram.filledCount(st));
    const mb = document.getElementById('ngMode');
    if (mb) mb.textContent = st.mode === 'mark' ? 'Shade: off (crosses)' : 'Shade: on';
  }

  function nonogramResult(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? 'Solved — ' + esc(res.label) + ' in ' + esc(fmtTime(res.seconds))
            : 'Not finished yet') + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base × ' + res.speed.toFixed(2) +
            ' speed · par ' + fmtTime(res.par) + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.n + ' × ' + res.n +
            '</div><div class="k">Picture size</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.shaded + '/' + res.total +
            '</div><div class="k">Squares shaded</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="ngAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 2048 ---------------- */

  function g2048Difficulty(selected) {
    puzzleDiff('2048',
      'Swipe or use the arrow keys. Every tile slides as far as it can, and two ' +
      'equal numbers that meet merge into their sum. One new tile appears after ' +
      'each move — get to the goal tile before the grid jams.',
      G2048.LEVELS, selected, 'data-g8level',
      lv => lv.label + ' · goal ' + lv.goal);
  }

  /* Grey steps for the tile ramp: small numbers stay light, big ones go black.
     The value is always printed, so nothing depends on the shade alone. */
  function g2048Tier(v) {
    const steps = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    const i = steps.indexOf(v);
    return i < 0 ? 11 : i + 1;
  }

  function g2048Game(st) {
    let cells = '';
    for (let i = 0; i < st.board.length; i++) cells += '<div class="g8-c" data-i="' + i + '"></div>';
    app().innerHTML =
      '<div class="screen g8-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="g8Score">0</b><span>score</span></div>' +
          '<button class="mine-face" id="g8New" title="New grid" aria-label="New grid">↻</button>' +
          '<div class="mine-stat"><b id="g8Best">0</b><span>biggest · goal ' + st.goal + '</span></div>' +
        '</div>' +
        '<div class="g8-wrap" id="g8Wrap">' +
          '<div class="g8-grid" id="g8Grid" style="--n:' + st.n + '">' + cells + '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + esc(st.label) + ' · goal ' + st.goal +
            ' · ' + st.moves + ' moves</span>' +
          '<button class="btn ghost" id="g8Up">↑</button>' +
          '<button class="btn ghost" id="g8Down">↓</button>' +
          '<button class="btn ghost" id="g8Left">←</button>' +
          '<button class="btn ghost" id="g8Right">→</button>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="g8Status">Swipe the grid, or use the arrow keys ' +
          'or the buttons below.</div>' +
      '</div>';
  }

  function g2048Sync(st, res) {
    const grid = document.getElementById('g8Grid');
    if (!grid) return;
    for (let i = 0; i < st.board.length; i++) {
      const el = grid.children[i];
      if (!el) continue;
      const v = st.board[i];
      const txt = v ? String(v) : '';
      const cls = 'g8-c' + (v ? ' t' + g2048Tier(v) : '') +
        (res && res.merged && res.merged.indexOf(i) >= 0 ? ' merge' : '') +
        (res && res.spawned === i ? ' new' : '');
      if (el.textContent !== txt) el.textContent = txt;
      if (el.className !== cls) el.className = cls;
    }
    const sc = document.getElementById('g8Score');
    if (sc) sc.textContent = String(st.score);
    const bs = document.getElementById('g8Best');
    if (bs) bs.textContent = String(G2048.bestTile(st));
    const mv = document.querySelector('.g8-screen .mine-level');
    if (mv) {
      mv.textContent = st.label + ' · goal ' + st.goal + ' · ' + st.moves + ' moves';
    }
  }

  function g2048Result(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? 'Reached ' + res.best + ' — ' + esc(res.label)
            : 'Jammed at ' + res.best + ' of ' + res.goal) + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base × ' +
            Math.min(1, res.best / res.goal).toFixed(2) + ' of the goal' +
            (res.clearBonus ? ' +' + res.clearBonus + ' cleared' : '') +
            '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.best +
            '</div><div class="k">Biggest tile</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + res.moves +
            '</div><div class="k">Moves</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.merges +
            '</div><div class="k">Merges</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="g8AgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- typing sprint ---------------- */

  function typingDifficulty(selected) {
    puzzleDiff('Typing Sprint',
      'Retype the passage exactly as it is written. A character goes dark when ' +
      'you get it right and red when you do not. Your score comes from words per ' +
      'minute against the level target, plus a bonus for a completely clean run. ' +
      'The passages are the same ones Word Fill uses.',
      Typing.LEVELS, selected, 'data-tylevel',
      lv => 'target ' + lv.wpm + ' wpm');
  }

  /* One span per character so a single wrong key can be marked. */
  function typingChars(st) {
    const target = st.target;
    const typed = st.typed;
    let out = '';
    for (let i = 0; i < target.length; i++) {
      let cls = 'ty-ch';
      if (i < typed.length) cls += typed[i] === target[i] ? ' ok' : ' bad';
      else if (i === typed.length) cls += ' next';
      /* a plain space, NOT &nbsp; — a non-breaking space would stop the whole
         passage from ever wrapping onto a second line */
      const ch = target[i] === '&' ? '&amp;' : (target[i] === '<' ? '&lt;' : target[i]);
      out += '<span class="' + cls + '">' + ch + '</span>';
    }
    return out;
  }

  function typingGame(st) {
    app().innerHTML =
      '<div class="screen ty-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="tyWpm">0</b><span>words / min</span></div>' +
          '<button class="mine-face" id="tyNew" title="Another passage" aria-label="Another passage">↻</button>' +
          '<div class="mine-stat"><b id="tyAcc">100%</b><span>accuracy</span></div>' +
        '</div>' +
        '<h2 class="ty-title">' + esc(st.title) + '</h2>' +
        '<div class="ty-wrap" id="tyWrap">' +
          '<p class="ty-text" id="tyText">' + typingChars(st) + '</p>' +
          '<textarea class="ty-input" id="tyInput" autocomplete="off" autocapitalize="off" ' +
            'autocorrect="off" spellcheck="false" aria-label="Type the passage"></textarea>' +
        '</div>' +
        '<div class="progress-bar"><i id="tyBar" style="width:0%"></i></div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + esc(st.label) + ' · target ' + st.wpmTarget +
            ' wpm · ' + st.target.length + ' characters</span>' +
          '<span class="mine-level" id="timer">0:00</span>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="tyStatus">Start typing — the box is already focused.</div>' +
      '</div>';
  }

  function typingSync(st) {
    const text = document.getElementById('tyText');
    if (text) text.innerHTML = typingChars(st);
    const bar = document.getElementById('tyBar');
    if (bar) bar.style.width = (Typing.progress(st) * 100).toFixed(1) + '%';
    const live = Typing.live(st, st.elapsedMs || 0);
    const w = document.getElementById('tyWpm');
    if (w) w.textContent = String(Math.round(live.wpm));
    const a = document.getElementById('tyAcc');
    if (a) a.textContent = Math.round(live.accuracy * 100) + '%';
    /* keep the caret in view on a long passage */
    const wrap = document.getElementById('tyWrap');
    const next = text && text.querySelector('.ty-ch.next');
    if (wrap && next) {
      const r = next.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      if (r.top < wr.top + 8 || r.bottom > wr.bottom - 8) {
        wrap.scrollTop += r.top - wr.top - wrap.clientHeight / 2;
      }
    }
  }

  function typingResult(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.done
            ? Math.round(res.wpm) + ' wpm at ' + Math.round(res.accuracy * 100) + '% accuracy'
            : 'Not finished yet') + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base × ' + res.speed.toFixed(2) +
            ' speed (target ' + res.wpmTarget + ' wpm)' +
            (res.clean ? ' +20 clean' : '') + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + res.correct + '/' + res.total +
            '</div><div class="k">Characters right</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.errors +
            '</div><div class="k">Wrong keys</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="tyAgainBtn">Another passage</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- code break ---------------- */

  function codebreakDifficulty(selected) {
    puzzleDiff('Code Break',
      'A secret code hides behind the dashes. Every guess is answered with two ' +
      'counts: how many digits are the right number in the right place, and how ' +
      'many are the right number in the wrong place. Work the code out before ' +
      'your guesses run out.',
      CodeBreak.LEVELS, selected, 'data-cblevel',
      lv => lv.len + ' digits · ' + lv.tries + ' guesses');
  }

  function cbPegs(row) {
    let out = '';
    for (let i = 0; i < row.bulls; i++) out += '<i class="cb-peg bull"></i>';
    for (let i = 0; i < row.cows; i++) out += '<i class="cb-peg cow"></i>';
    const spare = Math.max(0, row.guess.length - row.bulls - row.cows);
    for (let i = 0; i < spare; i++) out += '<i class="cb-peg none"></i>';
    return out;
  }

  function codebreakGame(st) {
    let rows = '';
    for (let i = 0; i < st.maxTries; i++) {
      const r = st.rows[i];
      rows += '<div class="cb-row' + (i === st.rows.length ? ' current' : '') + '">' +
        '<span class="cb-no">' + (i + 1) + '</span>' +
        '<span class="cb-digits">' + (r
          ? r.guess.map(d => '<b>' + d + '</b>').join('')
          : (i === st.rows.length
            ? st.entry.map(d => '<b' + (d < 0 ? ' class="blank"' : '') + '>' + (d < 0 ? '' : d) + '</b>').join('')
            : '<b class="blank"></b>'.repeat(st.len))) + '</span>' +
        '<span class="cb-pegs">' + (r ? cbPegs(r) : '') + '</span>' +
        '</div>';
    }
    let pad = '';
    for (let d = 0; d < st.alphabet; d++) pad += '<button class="cb-key" data-d="' + d + '">' + d + '</button>';
    pad += '<button class="cb-key" data-cmd="back" title="Backspace">⌫</button>';
    pad += '<button class="cb-key wide" data-cmd="clear" title="Clear the row">Clear</button>';
    pad += '<button class="cb-key go" data-cmd="go" title="Submit (Enter)">Guess</button>';

    app().innerHTML =
      '<div class="screen cb-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="cbLeft">' + st.maxTries + '</b><span>guesses left</span></div>' +
          '<button class="mine-face" id="cbNew" title="New code" aria-label="New code">↻</button>' +
          '<div class="mine-stat"><b id="timer">0:00</b><span>time</span></div>' +
        '</div>' +
        '<div class="cb-wrap">' +
          '<div class="cb-rows" id="cbRows">' + rows + '</div>' +
          '<div class="cb-side">' +
            '<div class="cb-pad" id="cbPad">' + pad + '</div>' +
            '<div class="cb-legend">' +
              '<span><i class="cb-peg bull"></i> right digit, right place</span>' +
              '<span><i class="cb-peg cow"></i> right digit, wrong place</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + st.len + ' slots · digits 0-' + (st.alphabet - 1) +
            (st.repeats ? ' · repeats allowed' : ' · no repeats') + '</span>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="cbStatus">Type digits or tap the pad, then Guess.</div>' +
      '</div>';
  }

  function codebreakSync(st) {
    const wrap = document.getElementById('cbRows');
    if (wrap) {
      for (let i = 0; i < st.maxTries; i++) {
        const row = wrap.children[i];
        if (!row) continue;
        row.classList.toggle('current', i === st.rows.length && st.status === 'playing');
        row.classList.toggle('done', i < st.rows.length);
        const r = st.rows[i];
        const digits = row.querySelector('.cb-digits');
        if (digits) {
          if (r) {
            const html = r.guess.map(d => '<b>' + d + '</b>').join('');
            if (digits.innerHTML !== html) digits.innerHTML = html;
          } else if (i === st.rows.length) {
            const html = st.entry.map((d, k) =>
              '<b' + (d < 0 ? ' class="blank"' + (k === st.cursor ? ' data-cursor="1"' : '') : '') + '>' +
              (d < 0 ? '' : d) + '</b>').join('');
            if (digits.innerHTML !== html) digits.innerHTML = html;
          }
        }
        const pegs = row.querySelector('.cb-pegs');
        if (pegs) {
          const html = r ? cbPegs(r) : '';
          if (pegs.innerHTML !== html) pegs.innerHTML = html;
        }
      }
    }
    const left = document.getElementById('cbLeft');
    if (left) left.textContent = String(st.maxTries - st.rows.length);
    const gone = CodeBreak.ruledOut(st);
    const pad = document.getElementById('cbPad');
    if (pad) {
      Array.prototype.forEach.call(pad.children, b => {
        const d = Number(b.dataset.d);
        if (b.dataset.d == null || b.dataset.d === '') return;
        b.classList.toggle('gone', !!gone[d]);
      });
    }
  }

  function codebreakResult(st, res) {
    const secret = res.secret.map(d => '<b>' + d + '</b>').join('');
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? 'Cracked it in ' + res.guesses + (res.guesses === 1 ? ' guess' : ' guesses')
            : 'Out of guesses — the code was') + '</div>' +
          '<div class="cb-reveal">' + secret + '</div>' +
          '<div class="score-breakdown">' + (res.solved
            ? res.base + ' base × ' + res.speed.toFixed(2) + ' speed +' + res.spareBonus + ' spare guesses'
            : 'no points this time — scores are only ever added') + '</div>' +
        '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.guesses + '/' + res.maxTries +
            '</div><div class="k">Guesses used</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.len +
            '</div><div class="k">Digits</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="cbAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- word ladder ---------------- */

  function ladderDifficulty(selected) {
    puzzleDiff('Word Ladder',
      'Turn the first word into the last one, changing exactly one letter at a ' +
      'time. Every rung in between has to be a real word. Walk it in as few steps ' +
      'as the puzzle allows to keep the bonus.',
      Ladder.LEVELS, selected, 'data-lalevel',
      lv => lv.n + ' letters · ' + lv.minPath + '-' + lv.maxPath + ' steps');
  }

  const ladderCur = st => st.ladder[st.ladder.length - 1];

  function ladderGame(st) {
    app().innerHTML =
      '<div class="screen la-screen">' +
        '<div class="mine-head">' +
          '<div class="mine-stat"><b id="laSteps">0</b><span>steps</span></div>' +
          '<button class="mine-face" id="laNew" title="New ladder" aria-label="New ladder">↻</button>' +
          '<div class="mine-stat"><b id="laPar">' + st.par + '</b><span>fewest possible</span></div>' +
        '</div>' +
        '<div class="la-goal">' +
          '<span class="la-word start">' + esc(st.startWord) + '</span>' +
          '<span class="la-arrow">→</span>' +
          '<span class="la-word target">' + esc(st.target) + '</span>' +
        '</div>' +
        '<div class="la-wrap">' +
          '<div class="la-rungs" id="laRungs"></div>' +
          '<div class="la-entry">' +
            '<input class="la-input" id="laInput" type="text" autocomplete="off" ' +
              'autocapitalize="off" autocorrect="off" spellcheck="false" ' +
              'maxlength="' + st.size + '" placeholder="' + st.size + ' letters" ' +
              'aria-label="Your next word" />' +
            '<button class="btn primary" id="laGo">Add</button>' +
            '<button class="btn ghost" id="laHint">Hint</button>' +
            '<button class="btn ghost" id="laUndo">Undo</button>' +
          '</div>' +
        '</div>' +
        '<div class="mine-foot">' +
          '<span class="mine-level">' + st.size + ' letters · par ' + st.par +
            ' steps · ' + esc(st.startWord) + ' to ' + esc(st.target) + '</span>' +
          '<span class="mine-level" id="timer">0:00</span>' +
          HOME_BTN +
        '</div>' +
        '<div class="chess-status" id="laStatus">Change one letter, and every rung ' +
          'must be a real word.</div>' +
      '</div>';
    ladderSync(st);
  }

  function ladderSync(st) {
    const box = document.getElementById('laRungs');
    if (!box) return;
    /* newest rung on top; the changed letter is picked out against the rung below */
    const rev = st.ladder.slice().reverse();
    const html = rev.map((w, k) => {
      const prev = rev[k + 1];
      let letters = '';
      for (let i = 0; i < st.size; i++) {
        letters += (prev && prev[i] !== w[i])
          ? '<b>' + esc(w[i]) + '</b>'
          : '<span>' + esc(w[i]) + '</span>';
      }
      return '<div class="la-rung' + (k === 0 ? ' current' : '') +
        (w === st.target ? ' target' : '') +
        (w === st.startWord ? ' start' : '') + '">' + letters + '</div>';
    }).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
    const steps = document.getElementById('laSteps');
    if (steps) steps.textContent = String(st.ladder.length - 1);
  }

  function ladderResult(st, res) {
    app().innerHTML =
      '<div class="screen board-result">' +
        '<div class="score-hero">' +
          '<div class="score-num" id="scoreNum">+0</div>' +
          '<div class="score-label">' + (res.solved
            ? esc(res.startWord) + ' to ' + esc(res.target) + ' in ' + res.steps + ' steps'
            : 'Not finished yet') + '</div>' +
          '<div class="score-breakdown">' + res.base + ' base × ' +
            Math.min(1, res.par / Math.max(res.par, res.steps)).toFixed(2) + ' of the par chain' +
            (res.optimal ? ' +30 shortest possible' : '') +
            (res.hints ? ' · ' + res.hints + ' hint' + (res.hints === 1 ? '' : 's') : '') +
            '</div>' +
        '</div>' +
        '<div class="la-final">' + res.ladder.map((w, i) =>
          '<span class="la-word' + (i === 0 ? ' start' : '') +
          (i === res.ladder.length - 1 ? ' target' : '') + '">' + esc(w) + '</span>' +
          (i < res.ladder.length - 1 ? '<span class="la-arrow">→</span>' : '')
        ).join('') + '</div>' +
        '<div class="stats three">' +
          '<div class="stat" style="--i:0"><div class="v">' + res.steps + '/' + res.par +
            '</div><div class="k">Steps vs par</div></div>' +
          '<div class="stat" style="--i:1"><div class="v">' + fmtTime(res.seconds) +
            '</div><div class="k">Time</div></div>' +
          '<div class="stat" style="--i:2"><div class="v">' + res.hints +
            '</div><div class="k">Hints used</div></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn primary" id="laAgainBtn">Play again</button>' +
          '<button class="btn ghost" id="homeBtn">Home</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- player history ---------------- */
  function historyModal(player) {
    const root = document.getElementById('modalRoot');
    const list = player.history || [];
    const rows = list.length
      ? list.map(g => {
          if (g.mode === 'mine') {
            const lv = Mine.cfgOf(g.difficulty);
            return '<div class="hrow">' +
              '<div class="hrow-main">' + esc(lv.label) + '</div>' +
              '<div class="hrow-sub">Minesweeper · ' + esc(shortDate(g.at)) + ' · ' +
                (g.outcome === 'win' ? 'cleared' : 'boom') + '</div>' +
              '<div class="hrow-right"><b>' + (g.points > 0 ? '+' + g.points : '0') + '</b>' +
                '<span>' + g.correct + '/' + g.total + ' · ' + fmtTime(g.seconds) + '</span></div>' +
              '</div>';
          }
          if (SOLO_ENGINES[g.mode]) {
            const info = HIST_MODES[g.mode];
            const lv = SOLO_ENGINES[g.mode]().cfgOf(g.difficulty);
            return '<div class="hrow">' +
              '<div class="hrow-main">' + esc(info.name) + ' · ' + esc(lv.label) + '</div>' +
              '<div class="hrow-sub">' + esc(shortDate(g.at)) + ' · ' +
                (g.outcome === 'win' ? 'finished' : 'unfinished') + '</div>' +
              '<div class="hrow-right"><b>' + (g.points > 0 ? '+' + g.points : '0') + '</b>' +
                '<span>' + info.score + g.myScore + ' · ' + fmtTime(g.seconds) + '</span></div>' +
              '</div>';
          }
          const info = HIST_MODES[g.mode];
          if (info) {
            const tag = g.outcome === 'win' ? 'win' : (g.outcome === 'lose' ? 'loss' : 'draw');
            const detail = g.mode === 'math'
              ? (MathGame.DIFF[g.difficulty] || { label: g.difficulty }).label
              : (g.mode === 'chess' ? 'Standard' : String(g.difficulty).split('x').join(' × '));
            const tally = g.mode === 'math'
              ? 'opp ' + g.myScore
              : info.score + g.myScore + ' : ' + g.oppScore;
            return '<div class="hrow">' +
              '<div class="hrow-main">vs ' + esc(g.opponent || '?') + '</div>' +
              '<div class="hrow-sub">' + info.name + ' · ' + esc(detail) +
                ' · ' + esc(shortDate(g.at)) + ' · ' + tag + '</div>' +
              '<div class="hrow-right"><b>' + (g.points >= 0 ? '+' : '') + g.points + '</b>' +
                '<span>' + tally + ' · ' + fmtTime(g.seconds) + '</span></div>' +
              '</div>';
          }
          const d = DIFFICULTY[g.difficulty] || DIFFICULTY.easy;
          return '<div class="hrow">' +
            '<div class="hrow-main">' + esc(g.passage || 'Untitled') + '</div>' +
            '<div class="hrow-sub">' + esc(d.label) + ' · ' + esc(shortDate(g.at)) +
              (g.perfect ? ' · perfect' : '') + '</div>' +
            '<div class="hrow-right"><b>+' + g.points + '</b>' +
              '<span>' + g.correct + '/' + g.total + ' · ' + fmtTime(g.seconds) +
              ' · ×' + Number(g.speed || 1).toFixed(2) + '</span></div>' +
            '</div>';
        }).join('')
      : '<div class="empty" style="margin:0">No games recorded yet.</div>';

    root.hidden = false;
    root.innerHTML =
      '<div class="modal history-modal">' +
        '<div class="history-head">' +
          '<div class="player-avatar">' + avatarSvg(player.avatar) + '</div>' +
          '<div>' +
            '<h3>' + esc(player.name) + '</h3>' +
            '<div class="player-meta">' + (player.score || 0) + ' total points · best ' +
              (player.best || 0) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="history-stats">' +
          '<div><b>' + (player.games || 0) + '</b><span>games</span></div>' +
          '<div><b>' + fmtDuration(player.totalMs || 0) + '</b><span>played</span></div>' +
          '<div><b>' + (player.best || 0) + '</b><span>best</span></div>' +
          '<div><b>' + (player.perfect || 0) + '</b><span>perfect</span></div>' +
        '</div>' +
        '<div class="history-list">' + rows + '</div>' +
        '<div class="modal-actions"><button class="btn primary" id="histClose">Close</button></div>' +
      '</div>';

    const close = () => { root.hidden = true; root.innerHTML = ''; };
    root.querySelector('#histClose').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); });
  }

  /* ---------------- add-player modal ---------------- */
  function addPlayerModal(onCreate) {
    const root = document.getElementById('modalRoot');
    let avatar = AVATARS[0].id;
    root.hidden = false;
    root.innerHTML =
      '<div class="modal">' +
        '<h3>New player</h3>' +
        '<div class="field">' +
          '<label>Name</label>' +
          '<input type="text" id="pName" maxlength="16" placeholder="e.g. Mia" />' +
        '</div>' +
        '<div class="field">' +
          '<label>Avatar</label>' +
          '<div class="avatar-grid" id="avatarGrid">' +
            AVATARS.map((a, i) =>
              '<button class="avatar-opt ' + (a.id === avatar ? 'selected' : '') + '" data-av="' + a.id + '" ' +
              'title="' + a.id + '" style="animation-delay:' + (i * 25) + 'ms">' +
              avatarSvg(a.id) + '</button>').join('') +
          '</div>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" id="modalCancel">Cancel</button>' +
          '<button class="btn primary" id="modalSave">Create</button>' +
        '</div>' +
      '</div>';

    const close = () => { root.hidden = true; root.innerHTML = ''; };

    root.querySelector('#avatarGrid').addEventListener('click', e => {
      const btn = e.target.closest('[data-av]');
      if (!btn) return;
      avatar = btn.dataset.av;
      root.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('selected', b === btn));
    });
    root.querySelector('#modalCancel').addEventListener('click', close);
    root.querySelector('#modalSave').addEventListener('click', () => {
      const name = root.querySelector('#pName').value.trim();
      if (!name) { root.querySelector('#pName').focus(); return; }
      close();
      onCreate(name, avatar);
    });
    root.addEventListener('click', e => { if (e.target === root) close(); });
    root.querySelector('#pName').addEventListener('keydown', e => {
      if (e.key === 'Enter') root.querySelector('#modalSave').click();
    });
    setTimeout(() => { const el = root.querySelector('#pName'); if (el) el.focus(); }, 30);
  }

  return { home, homeUpdate, difficulty, mathDifficulty, game, mathGame, result, mathResult,
    chessGame, chessResult, promotionModal, addPlayerModal, historyModal, mindPopover,
    goban, syncStones, markWinLine, boardSetup, showGoTerritory,
    gomokuGame, gomokuResult, goGame, goResult,
    mineDifficulty, mineGame, mineSync, mineResult,
    slideDifficulty, slideGame, slideSync, slideResult,
    sudokuDifficulty, sudokuGame, sudokuSync, sudokuResult,
    nonogramDifficulty, nonogramGame, nonogramSync, nonogramResult,
    g2048Difficulty, g2048Game, g2048Sync, g2048Result,
    typingDifficulty, typingGame, typingSync, typingResult,
    codebreakDifficulty, codebreakGame, codebreakSync, codebreakResult,
    ladderDifficulty, ladderGame, ladderSync, ladderResult,
    wordstackSetup, wordstackGame, wsPaint, wsPreview, wsTrays, wsTurn, wordstackResult,
    tactaGame, tactaPaint, tactaTrays, tactaTurn, tactaResult, tactaCardSvg,
    esc, fmtTime, fmtDuration };
})();
