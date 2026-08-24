/* ==========================================================================
   ClimbMap V1.0 - catalogo oficial (somente leitura)
   Toda a leitura da base passa por aqui. Nenhuma tela remonta relacionamentos.
   ========================================================================== */

const Data = (function () {
  const base = typeof CLIMBMAP_BASE !== 'undefined' ? CLIMBMAP_BASE : { areas: [], categorias: [], competencias: [] };

  const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado', 'Especialista'];

  function byOrdem(a, b) {
    return (a.Ordem || 0) - (b.Ordem || 0);
  }

  const areas = base.areas.slice().sort(byOrdem);
  const categorias = base.categorias.slice().sort(byOrdem);
  const competencias = base.competencias.slice().sort(byOrdem);

  const areaById = {};
  areas.forEach(function (a) { areaById[a.Area_ID] = a; });

  const categoryById = {};
  categorias.forEach(function (c) { categoryById[c.Categoria_ID] = c; });

  const competenceById = {};
  competencias.forEach(function (c) { competenceById[c.Competencia_ID] = c; });

  const areaOrder = {};
  areas.forEach(function (a, i) { areaOrder[a.Area_ID] = a.Ordem || i + 1; });

  const categoryOrder = {};
  categorias.forEach(function (c, i) { categoryOrder[c.Categoria_ID] = c.Ordem || i + 1; });

  /* Ordenacao oficial: Area.Ordem -> Categoria.Ordem -> Competencia.Ordem */
  function officialSort(a, b) {
    const catA = categoryById[a.Categoria_ID];
    const catB = categoryById[b.Categoria_ID];
    const areaA = catA ? areaOrder[catA.Area_ID] || 999 : 999;
    const areaB = catB ? areaOrder[catB.Area_ID] || 999 : 999;
    if (areaA !== areaB) return areaA - areaB;
    const co = (categoryOrder[a.Categoria_ID] || 999) - (categoryOrder[b.Categoria_ID] || 999);
    if (co !== 0) return co;
    return (a.Ordem || 0) - (b.Ordem || 0);
  }

  const orderedCompetences = competencias.slice().sort(officialSort);

  function isActive(row) {
    return row.Ativo === true || row.Ativo === 'TRUE' || row.Ativo === 1 || row.Ativo === 'Sim';
  }

  function getActiveAreas() {
    return areas.filter(isActive);
  }

  function getCategoriesByArea(areaId) {
    return categorias.filter(function (c) {
      return isActive(c) && (!areaId || areaId === 'ALL' || c.Area_ID === areaId);
    }).sort(byOrdem);
  }

  function getCompetencesByCategory(categoryId) {
    return competencias.filter(function (c) {
      return isActive(c) && c.Categoria_ID === categoryId;
    }).sort(byOrdem);
  }

  function getActiveCompetences() {
    return orderedCompetences.filter(isActive);
  }

  function getCompetenceById(id) {
    return competenceById[id] || null;
  }

  function getCategoryById(id) {
    return categoryById[id] || null;
  }

  function getAreaById(id) {
    return areaById[id] || null;
  }

  /* Competencia + categoria + area em um unico objeto. */
  function getCompetenceFullContext(id) {
    const competence = getCompetenceById(id);
    if (!competence) return null;
    const category = getCategoryById(competence.Categoria_ID);
    const area = category ? getAreaById(category.Area_ID) : null;
    return { competence: competence, category: category, area: area };
  }

  function getAreaOfCompetence(competence) {
    const category = getCategoryById(competence.Categoria_ID);
    return category ? getAreaById(category.Area_ID) : null;
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function matchesQuery(competence, normalizedQuery) {
    if (!normalizedQuery) return true;
    const category = getCategoryById(competence.Categoria_ID);
    const haystack = normalize([
      competence.Competencia,
      competence.Descricao_Aprendizado,
      category ? category.Categoria : '',
      competence.Recursos_Recomendados
    ].join(' \u00b7 '));
    return normalizedQuery.split(/\s+/).every(function (token) {
      return haystack.indexOf(token) !== -1;
    });
  }

  /*
   * filters: { query, areaId, categoryId, nivel, status, hideCompleted }
   * "status" usa o estado pessoal (Storage). A ordem oficial e sempre preservada.
   */
  function filterCompetences(filters) {
    const f = filters || {};
    const normalizedQuery = normalize(f.query || '').trim();

    return getActiveCompetences().filter(function (comp) {
      const category = getCategoryById(comp.Categoria_ID);
      if (!category) return false;

      if (f.areaId && f.areaId !== 'ALL' && category.Area_ID !== f.areaId) return false;
      if (f.categoryId && f.categoryId !== 'ALL' && comp.Categoria_ID !== f.categoryId) return false;
      if (f.nivel && f.nivel !== 'ALL' && comp.Nivel !== f.nivel) return false;

      if ((f.status && f.status !== 'ALL') || f.hideCompleted) {
        const status = Storage.getCompetenceStatus(comp.Competencia_ID);
        if (f.status && f.status !== 'ALL' && status !== f.status) return false;
        if (f.hideCompleted && status === Storage.STATUS.COMPLETED) return false;
      }

      return matchesQuery(comp, normalizedQuery);
    });
  }

  /* Agrupa uma lista ja filtrada em Area -> Categoria, respeitando a ordem oficial. */
  function groupByAreaAndCategory(competences) {
    const areaMap = {};
    competences.forEach(function (comp) {
      const category = getCategoryById(comp.Categoria_ID);
      if (!category) return;
      const area = getAreaById(category.Area_ID);
      if (!area) return;
      if (!areaMap[area.Area_ID]) areaMap[area.Area_ID] = { area: area, categories: {} };
      const bucket = areaMap[area.Area_ID];
      if (!bucket.categories[category.Categoria_ID]) {
        bucket.categories[category.Categoria_ID] = { category: category, competences: [] };
      }
      bucket.categories[category.Categoria_ID].competences.push(comp);
    });

    return Object.keys(areaMap)
      .map(function (areaId) { return areaMap[areaId]; })
      .sort(function (a, b) { return (a.area.Ordem || 0) - (b.area.Ordem || 0); })
      .map(function (bucket) {
        return {
          area: bucket.area,
          categories: Object.keys(bucket.categories)
            .map(function (catId) { return bucket.categories[catId]; })
            .sort(function (a, b) { return (a.category.Ordem || 0) - (b.category.Ordem || 0); })
        };
      });
  }

  function getCompetencesByArea(areaId) {
    return getActiveCompetences().filter(function (comp) {
      const category = getCategoryById(comp.Categoria_ID);
      return category && category.Area_ID === areaId;
    });
  }

  return {
    meta: base.meta || {},
    version: base.version || '1.0',
    glossario: base.glossario || [],
    NIVEIS: NIVEIS,
    getActiveAreas: getActiveAreas,
    getCategoriesByArea: getCategoriesByArea,
    getCompetencesByCategory: getCompetencesByCategory,
    getCompetencesByArea: getCompetencesByArea,
    getActiveCompetences: getActiveCompetences,
    getCompetenceById: getCompetenceById,
    getCategoryById: getCategoryById,
    getAreaById: getAreaById,
    getAreaOfCompetence: getAreaOfCompetence,
    getCompetenceFullContext: getCompetenceFullContext,
    filterCompetences: filterCompetences,
    groupByAreaAndCategory: groupByAreaAndCategory,
    normalize: normalize
  };
})();
