/* ==========================================================================
   ClimbMap V1.0 - estado pessoal (localStorage)
   Guarda apenas o que e do usuario: progresso, cards pessoais e preferencias.
   O catalogo oficial nunca e duplicado aqui.
   ========================================================================== */

const Storage = (function () {
  const KEY = 'climbmap_state';
  const SCHEMA_VERSION = 1;

  const STATUS = {
    OPEN: 'OPEN',
    STANDBY: 'STANDBY',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
  };

  const PERSISTED_STATUSES = [STATUS.STANDBY, STATUS.IN_PROGRESS, STATUS.COMPLETED];

  const CARD_TYPES = ['COURSE', 'BOOK', 'CERTIFICATION', 'ARTICLE', 'VIDEO', 'OTHER'];

  const listeners = [];
  let state = emptyState();

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      progress: {},
      personalCards: [],
      preferences: {}
    };
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /* Normaliza qualquer estado vindo do localStorage ou de um backup. */
  function normalizeState(raw) {
    const safe = emptyState();
    if (!isPlainObject(raw)) return safe;

    if (isPlainObject(raw.progress)) {
      Object.keys(raw.progress).forEach(function (id) {
        const entry = raw.progress[id];
        if (!isPlainObject(entry)) return;
        if (PERSISTED_STATUSES.indexOf(entry.status) === -1) return;
        safe.progress[String(id)] = {
          status: entry.status,
          completedAt: entry.status === STATUS.COMPLETED && typeof entry.completedAt === 'string'
            ? entry.completedAt
            : null
        };
      });
    }

    if (Array.isArray(raw.personalCards)) {
      raw.personalCards.forEach(function (card) {
        if (!isPlainObject(card)) return;
        if (typeof card.title !== 'string' || !card.title.trim()) return;
        if (PERSISTED_STATUSES.indexOf(card.status) === -1) return;
        safe.personalCards.push({
          id: typeof card.id === 'string' && card.id ? card.id : newId(),
          title: String(card.title),
          type: CARD_TYPES.indexOf(card.type) !== -1 ? card.type : 'OTHER',
          url: typeof card.url === 'string' ? card.url : '',
          description: typeof card.description === 'string' ? card.description : '',
          status: card.status,
          completedAt: card.status === STATUS.COMPLETED && typeof card.completedAt === 'string'
            ? card.completedAt
            : null,
          createdAt: typeof card.createdAt === 'string' ? card.createdAt : nowIso(),
          updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : nowIso()
        });
      });
    }

    if (isPlainObject(raw.preferences)) {
      Object.keys(raw.preferences).forEach(function (k) {
        const v = raw.preferences[k];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          safe.preferences[k] = v;
        }
      });
    }

    return safe;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'card-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(KEY);
      state = raw ? normalizeState(JSON.parse(raw)) : emptyState();
    } catch (err) {
      state = emptyState();
    }
    return state;
  }

  function saveState() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      return false;
    }
  }

  function getState() {
    return state;
  }

  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (err) { /* um listener com erro nao derruba os demais */ }
    });
  }

  function commit() {
    saveState();
    notify();
  }

  /* ---------- Progresso de competencias oficiais ---------- */

  function getCompetenceStatus(id) {
    const entry = state.progress[id];
    return entry ? entry.status : STATUS.OPEN;
  }

  function getCompletedAt(id) {
    const entry = state.progress[id];
    return entry && entry.completedAt ? entry.completedAt : null;
  }

  /* ABERTO e implicito: voltar para Aberto remove o registro. */
  function setCompetenceStatus(id, status) {
    if (!id) return;
    if (status === STATUS.OPEN) {
      delete state.progress[id];
    } else if (status === STATUS.COMPLETED) {
      const previous = state.progress[id];
      state.progress[id] = {
        status: STATUS.COMPLETED,
        completedAt: previous && previous.completedAt ? previous.completedAt : nowIso()
      };
    } else if (PERSISTED_STATUSES.indexOf(status) !== -1) {
      state.progress[id] = { status: status, completedAt: null };
    } else {
      return;
    }
    commit();
  }

  /*
   * Resumo calculado em tempo real. Nunca gravado no localStorage.
   * Recebe a lista de competencias oficiais consideradas.
   */
  function getProgressSummary(competences) {
    const summary = {
      total: competences.length,
      completed: 0,
      inProgress: 0,
      standby: 0,
      open: 0,
      pct: 0
    };
    competences.forEach(function (comp) {
      const status = getCompetenceStatus(comp.Competencia_ID);
      if (status === STATUS.COMPLETED) summary.completed += 1;
      else if (status === STATUS.IN_PROGRESS) summary.inProgress += 1;
      else if (status === STATUS.STANDBY) summary.standby += 1;
      else summary.open += 1;
    });
    summary.pct = summary.total ? (summary.completed / summary.total) * 100 : 0;
    return summary;
  }

  /* ---------- Cards pessoais ---------- */

  function getPersonalCards() {
    return state.personalCards.slice();
  }

  function getPersonalCardById(id) {
    return state.personalCards.filter(function (c) { return c.id === id; })[0] || null;
  }

  function createPersonalCard(data) {
    const stamp = nowIso();
    const status = PERSISTED_STATUSES.indexOf(data.status) !== -1 ? data.status : STATUS.STANDBY;
    const card = {
      id: newId(),
      title: String(data.title || '').trim(),
      type: CARD_TYPES.indexOf(data.type) !== -1 ? data.type : 'OTHER',
      url: String(data.url || '').trim(),
      description: String(data.description || '').trim(),
      status: status,
      completedAt: status === STATUS.COMPLETED ? stamp : null,
      createdAt: stamp,
      updatedAt: stamp
    };
    state.personalCards.push(card);
    commit();
    return card;
  }

  function updatePersonalCard(id, data) {
    const card = getPersonalCardById(id);
    if (!card) return null;
    if (typeof data.title === 'string') card.title = data.title.trim();
    if (CARD_TYPES.indexOf(data.type) !== -1) card.type = data.type;
    if (typeof data.url === 'string') card.url = data.url.trim();
    if (typeof data.description === 'string') card.description = data.description.trim();
    if (PERSISTED_STATUSES.indexOf(data.status) !== -1) applyCardStatus(card, data.status);
    card.updatedAt = nowIso();
    commit();
    return card;
  }

  function applyCardStatus(card, status) {
    if (status === STATUS.COMPLETED) {
      card.completedAt = card.status === STATUS.COMPLETED && card.completedAt ? card.completedAt : nowIso();
    } else {
      card.completedAt = null;
    }
    card.status = status;
  }

  function setPersonalCardStatus(id, status) {
    const card = getPersonalCardById(id);
    if (!card || PERSISTED_STATUSES.indexOf(status) === -1) return null;
    applyCardStatus(card, status);
    card.updatedAt = nowIso();
    commit();
    return card;
  }

  function deletePersonalCard(id) {
    const before = state.personalCards.length;
    state.personalCards = state.personalCards.filter(function (c) { return c.id !== id; });
    if (state.personalCards.length !== before) commit();
  }

  /* ---------- Substituicao integral (importacao de backup) ---------- */

  function replaceState(rawState) {
    state = normalizeState(rawState);
    commit();
  }

  return {
    KEY: KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    STATUS: STATUS,
    CARD_TYPES: CARD_TYPES,
    loadState: loadState,
    saveState: saveState,
    getState: getState,
    subscribe: subscribe,
    getCompetenceStatus: getCompetenceStatus,
    setCompetenceStatus: setCompetenceStatus,
    getCompletedAt: getCompletedAt,
    getProgressSummary: getProgressSummary,
    getPersonalCards: getPersonalCards,
    getPersonalCardById: getPersonalCardById,
    createPersonalCard: createPersonalCard,
    updatePersonalCard: updatePersonalCard,
    setPersonalCardStatus: setPersonalCardStatus,
    deletePersonalCard: deletePersonalCard,
    replaceState: replaceState,
    normalizeState: normalizeState,
    nowIso: nowIso
  };
})();
