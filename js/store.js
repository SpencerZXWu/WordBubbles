/* ============================================================
   WordBubbles — local persistence (players, scores, theme)
   ============================================================ */
const Store = (() => {
  const KEY = 'wordbubbles.v1';
  let state = null;

  function defaults() {
    return { players: [], currentPlayerId: null, theme: 'light', version: 1 };
  }

  function load() {
    try {
      state = JSON.parse(localStorage.getItem(KEY)) || null;
    } catch (e) {
      state = null;
    }
    if (!state || typeof state !== 'object') state = defaults();
    if (!Array.isArray(state.players)) state.players = [];
    if (!state.theme) state.theme = 'light';
    // migrate older saves so every player has the newer fields
    state.players.forEach(p => {
      if (typeof p.score !== 'number') p.score = 0;
      if (typeof p.best !== 'number') p.best = 0;
      if (typeof p.games !== 'number') p.games = 0;
      if (typeof p.perfect !== 'number') p.perfect = 0;
      if (typeof p.totalMs !== 'number') p.totalMs = 0;
      if (!Array.isArray(p.history)) p.history = [];
      p.history.forEach(e => { if (!e.mode) e.mode = 'words'; });
    });
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* storage may be unavailable */ }
  }

  function uid() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const api = {
    init() { load(); return state; },
    get state() { return state; },
    save,

    getPlayers() { return state.players; },
    getPlayer(id) { return state.players.find(p => p.id === id) || null; },
    getCurrent() { return api.getPlayer(state.currentPlayerId); },

    addPlayer(name, avatar) {
      const player = {
        id: uid(),
        name: (name || 'Player').trim(),
        avatar: avatar || AVATARS[0].id,
        score: 0,
        best: 0,
        games: 0,
        perfect: 0,
        totalMs: 0,
        history: [],
        createdAt: Date.now()
      };
      state.players.push(player);
      state.currentPlayerId = player.id;
      save();
      return player;
    },

    deletePlayer(id) {
      state.players = state.players.filter(p => p.id !== id);
      if (state.currentPlayerId === id) state.currentPlayerId = null;
      save();
    },

    selectPlayer(id) {
      if (api.getPlayer(id)) { state.currentPlayerId = id; save(); }
    },

    /** Record a finished game for a player and return the updated player. */
    recordGame(id, rec) {
      const p = api.getPlayer(id);
      if (!p) return null;
      const points = rec.points || 0;
      p.score = (p.score || 0) + points;
      p.games = (p.games || 0) + 1;
      p.best = Math.max(p.best || 0, points);
      if (rec.perfect) p.perfect = (p.perfect || 0) + 1;
      p.totalMs = (p.totalMs || 0) + Math.max(0, Math.round((rec.seconds || 0) * 1000));
      p.history = p.history || [];
      p.history.unshift({
        at: Date.now(),
        mode: rec.mode || 'words',
        difficulty: rec.difficulty || 'easy',
        points: points,
        seconds: rec.seconds || 0,
        /* word-fill rounds */
        passage: rec.passage || '',
        correct: rec.correct || 0,
        total: rec.total || 0,
        speed: rec.speed || 1,
        mindUsed: rec.mindUsed || 0,
        perfect: !!rec.perfect,
        /* math duels */
        opponent: rec.opponent || '',
        myScore: typeof rec.myScore === 'number' ? rec.myScore : 0,
        oppScore: typeof rec.oppScore === 'number' ? rec.oppScore : 0,
        outcome: rec.outcome || ''
      });
      if (p.history.length > 100) p.history.length = 100;
      save();
      return p;
    },

    setTheme(theme) { state.theme = theme; save(); }
  };

  return api;
})();
