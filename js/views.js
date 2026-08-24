/* ==========================================================================
   ClimbMap V1.0 - telas
   Inicio, Catalogo, Kanban e Meu Progresso.
   ========================================================================== */

const Views = (function () {
  const el = UI.el;
  const S = Storage.STATUS;

  const catalogFilters = { query: '', areaId: 'ALL', categoryId: 'ALL', nivel: 'ALL', status: 'ALL' };
  const progressFilters = { areaId: 'ALL', categoryId: 'ALL', nivel: 'ALL', status: 'ALL', hideCompleted: false };

  let searchFocus = null; // guarda posicao do cursor da busca entre renders
  let searchTimer = null;

  /* ---------- Blocos reutilizaveis ---------- */

  function pageHead(title, subtitle, extras, aside) {
    const left = el('div', {}, [
      el('h1', { className: 'page-title', text: title }),
      subtitle ? el('p', { className: 'page-sub', text: subtitle }) : null,
      extras || null
    ]);
    return el('header', { className: 'page-head' }, [
      el('div', { className: 'page-head-row' }, [left, aside || null])
    ]);
  }

  function sectionHead(title, actionNode, hint) {
    return el('div', { className: 'section-head' }, [
      el('div', {}, [
        el('h2', { className: 'section-title', text: title }),
        hint ? el('p', { className: 'section-hint', text: hint }) : null
      ]),
      actionNode || null
    ]);
  }

  function emptyBlock(title, text, actions) {
    return el('div', { className: 'empty' }, [
      el('p', { className: 'empty-title', text: title }),
      el('p', { text: text }),
      actions && actions.length ? el('div', { className: 'empty-actions' }, actions) : null
    ]);
  }

  function goButton(label, route, variant) {
    return el('a', {
      className: 'btn btn--' + (variant || 'primary'),
      text: label,
      attrs: { href: '#' + route }
    });
  }

  function competenceMiniCard(comp) {
    const context = Data.getCompetenceFullContext(comp.Competencia_ID);
    const status = Storage.getCompetenceStatus(comp.Competencia_ID);
    return el('button', {
      className: 'mini-card',
      attrs: { type: 'button', 'data-area': context.area ? context.area.Area_ID : '' },
      on: { click: function () { UI.openCompetenceDrawer(comp.Competencia_ID); } }
    }, [
      el('div', { className: 'badge-row' }, [UI.statusBadge(status), UI.levelBadge(comp.Nivel)]),
      el('p', { className: 'mini-card-title', text: comp.Competencia }),
      el('p', {
        className: 'mini-card-meta',
        text: (context.area ? context.area.Area_Atuacao : '') + ' · ' + (context.category ? context.category.Categoria : '')
      })
    ]);
  }

  function statusesOf(competences) {
    return Storage.getProgressSummary(competences);
  }

  /* ==========================================================================
     INICIO
     ========================================================================== */

  function renderHome(root) {
    const all = Data.getActiveCompetences();
    const summary = statusesOf(all);

    root.appendChild(pageHead(
      'Meu ClimbMap',
      'Seu mapa de competências e estudos.',
      el('p', { className: 'page-tag', text: 'Base V' + Data.version })
    ));

    /* KPIs */
    const kpis = [
      ['Total de Competências', UI.formatNumber(summary.total)],
      ['Concluídas', UI.formatNumber(summary.completed)],
      ['Em Andamento', UI.formatNumber(summary.inProgress)],
      ['Stand By', UI.formatNumber(summary.standby)],
      ['% Concluído', UI.formatPercent(summary.pct)]
    ];
    root.appendChild(el('div', { className: 'kpi-grid' }, kpis.map(function (kpi) {
      return el('div', { className: 'card' }, [
        el('p', { className: 'kpi-label', text: kpi[0] }),
        el('p', { className: 'kpi-value', text: kpi[1] })
      ]);
    })));

    /* Progresso por área */
    const areaSection = el('section', { className: 'section' }, [sectionHead('Progresso por área')]);
    const areaList = el('div', { className: 'area-list' });
    Data.getActiveAreas().forEach(function (area) {
      const comps = Data.getCompetencesByArea(area.Area_ID);
      const s = statusesOf(comps);
      areaList.appendChild(el('div', { className: 'card', attrs: { 'data-area': area.Area_ID } }, [
        el('div', { className: 'area-row-head' }, [
          el('div', {}, [
            el('p', { className: 'area-name', text: area.Area_Atuacao }),
            el('p', {
              className: 'area-line',
              text: UI.formatNumber(s.completed) + ' de ' + UI.formatNumber(s.total) + ' competências concluídas'
            })
          ]),
          el('p', { className: 'area-pct', text: UI.formatPercent(s.pct) })
        ]),
        UI.progressBar(s.pct),
        el('p', {
          className: 'area-breakdown',
          text: s.completed + ' concluídas · ' + s.inProgress + ' em andamento · ' + s.standby + ' em Stand By'
        })
      ]));
    });
    areaSection.appendChild(areaList);
    root.appendChild(areaSection);

    /* Estou estudando agora */
    const inProgress = all.filter(function (c) { return Storage.getCompetenceStatus(c.Competencia_ID) === S.IN_PROGRESS; });
    const studying = el('section', { className: 'section' }, [
      sectionHead('Estou estudando agora', inProgress.length > 6
        ? el('a', { className: 'link-button', text: 'Ver todos no Kanban', attrs: { href: '#kanban' } })
        : null)
    ]);
    if (!inProgress.length) {
      studying.appendChild(emptyBlock(
        'Nenhuma competência em andamento.',
        'Encontre uma competência no Catálogo e comece seus estudos.',
        [goButton('Explorar Catálogo', 'catalogo')]
      ));
    } else {
      studying.appendChild(el('div', { className: 'mini-grid' }, inProgress.slice(0, 6).map(competenceMiniCard)));
    }
    root.appendChild(studying);

    /* Próximos estudos */
    const standby = all.filter(function (c) { return Storage.getCompetenceStatus(c.Competencia_ID) === S.STANDBY; });
    const next = el('section', { className: 'section' }, [
      sectionHead('Próximos estudos', standby.length
        ? el('a', { className: 'link-button', text: 'Ver Kanban', attrs: { href: '#kanban' } })
        : null)
    ]);
    if (!standby.length) {
      next.appendChild(emptyBlock(
        'Sua fila de estudos está vazia.',
        'Use o Catálogo para adicionar competências ao Stand By.',
        [goButton('Explorar Catálogo', 'catalogo', 'secondary')]
      ));
    } else {
      next.appendChild(el('div', { className: 'mini-grid' }, standby.slice(0, 4).map(competenceMiniCard)));
    }
    root.appendChild(next);

    /* Últimas conquistas */
    const completed = all
      .filter(function (c) { return Storage.getCompetenceStatus(c.Competencia_ID) === S.COMPLETED; })
      .sort(function (a, b) {
        const da = Storage.getCompletedAt(a.Competencia_ID) || '';
        const db = Storage.getCompletedAt(b.Competencia_ID) || '';
        return db.localeCompare(da);
      });

    const wins = el('section', { className: 'section' }, [sectionHead('Últimas conquistas')]);
    if (!completed.length) {
      wins.appendChild(emptyBlock('Ainda não há conquistas.', 'Suas competências concluídas aparecerão aqui.'));
    } else {
      const list = el('div', { className: 'card-grid' });
      completed.slice(0, 5).forEach(function (comp) {
        const context = Data.getCompetenceFullContext(comp.Competencia_ID);
        list.appendChild(el('button', {
          className: 'mini-card',
          attrs: { type: 'button' },
          on: { click: function () { UI.openCompetenceDrawer(comp.Competencia_ID); } }
        }, [
          el('p', { className: 'mini-card-title', text: comp.Competencia }),
          el('p', {
            className: 'mini-card-meta',
            text: (context.area ? context.area.Area_Atuacao : '') + ' · Concluído em ' +
              UI.formatDate(Storage.getCompletedAt(comp.Competencia_ID))
          })
        ]));
      });
      wins.appendChild(list);
    }
    root.appendChild(wins);
  }

  /* ==========================================================================
     CATALOGO
     ========================================================================== */

  function selectField(labelText, id, options, value, onChange) {
    const select = el('select', {
      className: 'select',
      attrs: { id: id },
      on: { change: function (e) { onChange(e.target.value); } }
    }, options.map(function (opt) {
      return el('option', { text: opt.label, attrs: { value: opt.value, selected: opt.value === value } });
    }));
    return el('div', { className: 'field' }, [
      el('label', { className: 'field-label', text: labelText, attrs: { for: id } }),
      select
    ]);
  }

  function areaOptions() {
    return [{ value: 'ALL', label: 'Todas' }].concat(Data.getActiveAreas().map(function (a) {
      return { value: a.Area_ID, label: a.Area_Atuacao };
    }));
  }

  function categoryOptions(areaId) {
    return [{ value: 'ALL', label: 'Todas' }].concat(Data.getCategoriesByArea(areaId).map(function (c) {
      return { value: c.Categoria_ID, label: c.Categoria };
    }));
  }

  function nivelOptions() {
    return [{ value: 'ALL', label: 'Todos' }].concat(Data.NIVEIS.map(function (n) {
      return { value: n, label: n };
    }));
  }

  function statusOptions() {
    return [
      { value: 'ALL', label: 'Todos' },
      { value: S.OPEN, label: 'Aberto' },
      { value: S.STANDBY, label: 'Stand By' },
      { value: S.IN_PROGRESS, label: 'Em Andamento' },
      { value: S.COMPLETED, label: 'Concluído' }
    ];
  }

  /* Se a Area mudar e a Categoria atual nao pertencer a ela, volta para Todas. */
  function reconcileCategory(filters) {
    if (filters.categoryId === 'ALL') return;
    const category = Data.getCategoryById(filters.categoryId);
    if (!category || (filters.areaId !== 'ALL' && category.Area_ID !== filters.areaId)) {
      filters.categoryId = 'ALL';
    }
  }

  function clearCatalogFilters() {
    catalogFilters.query = '';
    catalogFilters.areaId = 'ALL';
    catalogFilters.categoryId = 'ALL';
    catalogFilters.nivel = 'ALL';
    catalogFilters.status = 'ALL';
    App.rerender();
  }

  function renderCatalog(root) {
    root.appendChild(pageHead('Catálogo', 'Explore todas as competências oficiais do ClimbMap.'));

    const searchInput = el('input', {
      className: 'input',
      attrs: { type: 'search', id: 'catalog-search', placeholder: 'Buscar competências...', value: catalogFilters.query, 'aria-label': 'Buscar competências' },
      on: {
        input: function (e) {
          const value = e.target.value;
          searchFocus = e.target.selectionStart == null ? value.length : e.target.selectionStart;
          window.clearTimeout(searchTimer);
          searchTimer = window.setTimeout(function () {
            catalogFilters.query = value;
            App.rerender();
          }, 200);
        }
      }
    });

    const searchWrap = el('div', { className: 'search-wrap' }, [
      el('span', { className: 'search-icon' }, [UI.icon('M11 11m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M20 20l-4.5-4.5', 18)]),
      searchInput
    ]);

    const filtersBox = el('div', { className: 'filters' }, [
      searchWrap,
      el('div', { className: 'filters-row' }, [
        selectField('Área', 'f-area', areaOptions(), catalogFilters.areaId, function (value) {
          catalogFilters.areaId = value;
          reconcileCategory(catalogFilters);
          App.rerender();
        }),
        selectField('Categoria', 'f-cat', categoryOptions(catalogFilters.areaId), catalogFilters.categoryId, function (value) {
          catalogFilters.categoryId = value;
          App.rerender();
        }),
        selectField('Nível', 'f-nivel', nivelOptions(), catalogFilters.nivel, function (value) {
          catalogFilters.nivel = value;
          App.rerender();
        }),
        selectField('Status', 'f-status', statusOptions(), catalogFilters.status, function (value) {
          catalogFilters.status = value;
          App.rerender();
        })
      ])
    ]);

    const results = Data.filterCompetences(catalogFilters);

    filtersBox.appendChild(el('div', { className: 'filters-foot' }, [
      el('p', {
        className: 'result-count',
        text: UI.formatNumber(results.length) + (results.length === 1 ? ' competência encontrada' : ' competências encontradas')
      }),
      el('button', { className: 'link-button', text: 'Limpar filtros', attrs: { type: 'button' }, on: { click: clearCatalogFilters } })
    ]));

    root.appendChild(filtersBox);

    if (!results.length) {
      const empty = el('section', { className: 'section' }, [
        emptyBlock(
          'Nenhuma competência encontrada.',
          'Tente alterar sua busca ou remover alguns filtros.',
          [el('button', { className: 'btn btn--secondary', text: 'Limpar filtros', attrs: { type: 'button' }, on: { click: clearCatalogFilters } })]
        )
      ]);
      root.appendChild(empty);
      restoreSearchFocus(searchInput);
      return;
    }

    const groups = Data.groupByAreaAndCategory(results);
    const showAreaTitles = catalogFilters.areaId === 'ALL';
    const listWrap = el('div', {});

    groups.forEach(function (group) {
      if (showAreaTitles) {
        listWrap.appendChild(el('h2', {
          className: 'group-area-title',
          text: group.area.Area_Atuacao,
          attrs: { 'data-area': group.area.Area_ID }
        }));
      }
      group.categories.forEach(function (bucket) {
        listWrap.appendChild(el('section', { className: 'group-cat' }, [
          el('h3', { className: 'group-cat-title', text: bucket.category.Categoria }),
          el('p', {
            className: 'group-cat-desc',
            text: bucket.competences.length + (bucket.competences.length === 1 ? ' competência' : ' competências')
          }),
          el('div', { className: 'group-cat-list' }, [
            el('div', { className: 'comp-grid' }, bucket.competences.map(catalogCard))
          ])
        ]));
      });
    });

    root.appendChild(listWrap);
    restoreSearchFocus(searchInput);
  }

  function restoreSearchFocus(input) {
    if (searchFocus == null) return;
    const position = searchFocus;
    searchFocus = null;
    input.focus();
    try { input.setSelectionRange(position, position); } catch (err) { /* type=search pode nao suportar */ }
  }

  function catalogCard(comp) {
    const context = Data.getCompetenceFullContext(comp.Competencia_ID);
    const status = Storage.getCompetenceStatus(comp.Competencia_ID);
    const pathText = catalogFilters.areaId === 'ALL'
      ? (context.area ? context.area.Area_Atuacao + ' · ' : '') + (context.category ? context.category.Categoria : '')
      : (context.category ? context.category.Categoria : '');

    return el('article', {
      className: 'comp-card',
      attrs: {
        tabindex: '0',
        role: 'button',
        'aria-label': comp.Competencia,
        'data-area': context.area ? context.area.Area_ID : ''
      },
      on: {
        click: function () { UI.openCompetenceDrawer(comp.Competencia_ID); },
        keydown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            UI.openCompetenceDrawer(comp.Competencia_ID);
          }
        }
      }
    }, [
      el('div', { className: 'badge-row' }, [UI.levelBadge(comp.Nivel), UI.statusBadge(status)]),
      el('h4', { className: 'comp-card-title', text: comp.Competencia }),
      el('p', { className: 'comp-card-desc', text: comp.Descricao_Aprendizado || '' }),
      el('div', { className: 'comp-card-foot' }, [
        el('span', { className: 'comp-card-path', text: pathText }),
        el('span', { className: 'comp-card-cta', text: 'Ver competência' })
      ])
    ]);
  }

  /* ==========================================================================
     KANBAN
     ========================================================================== */

  const KANBAN_COLUMNS = [
    { status: S.STANDBY, label: 'Stand By' },
    { status: S.IN_PROGRESS, label: 'Em Andamento' },
    { status: S.COMPLETED, label: 'Concluído' }
  ];

  function renderKanban(root) {
    root.appendChild(pageHead(
      'Kanban',
      'Organize suas competências e estudos pessoais.',
      null,
      el('button', {
        className: 'btn btn--primary',
        text: '+ Novo card',
        attrs: { type: 'button' },
        on: { click: function () { UI.openPersonalCardModal(null); } }
      })
    ));

    const competences = Data.getActiveCompetences();
    const cards = Storage.getPersonalCards();

    const byStatus = {};
    KANBAN_COLUMNS.forEach(function (col) { byStatus[col.status] = { competences: [], cards: [] }; });

    competences.forEach(function (comp) {
      const status = Storage.getCompetenceStatus(comp.Competencia_ID);
      if (byStatus[status]) byStatus[status].competences.push(comp);
    });
    cards.slice().sort(function (a, b) {
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    }).forEach(function (card) {
      if (byStatus[card.status]) byStatus[card.status].cards.push(card);
    });

    const totalItems = KANBAN_COLUMNS.reduce(function (acc, col) {
      return acc + byStatus[col.status].competences.length + byStatus[col.status].cards.length;
    }, 0);

    if (!totalItems) {
      root.appendChild(el('section', { className: 'section' }, [
        emptyBlock(
          'Seu planejamento está vazio.',
          'Adicione competências pelo Catálogo ou crie um card pessoal para começar.',
          [
            goButton('Explorar Catálogo', 'catalogo'),
            el('button', {
              className: 'btn btn--secondary',
              text: '+ Novo card',
              attrs: { type: 'button' },
              on: { click: function () { UI.openPersonalCardModal(null); } }
            })
          ]
        )
      ]));
    }

    const board = el('div', { className: 'kanban-board' });

    KANBAN_COLUMNS.forEach(function (col) {
      const bucket = byStatus[col.status];
      const count = bucket.competences.length + bucket.cards.length;

      const list = el('div', { className: 'kanban-list' });
      bucket.competences.forEach(function (comp) { list.appendChild(competenceKanbanCard(comp, col.status)); });
      bucket.cards.forEach(function (card) { list.appendChild(personalKanbanCard(card)); });
      if (!count) list.appendChild(el('p', { className: 'kanban-empty', text: 'Nenhum item nesta coluna.' }));

      const column = el('section', {
        className: 'kanban-col',
        attrs: { 'data-status': col.status, 'aria-label': col.label },
        on: {
          dragover: function (e) {
            e.preventDefault();
            column.classList.add('is-dragover');
          },
          dragleave: function () { column.classList.remove('is-dragover'); },
          drop: function (e) {
            e.preventDefault();
            column.classList.remove('is-dragover');
            handleDrop(e, col.status);
          }
        }
      }, [
        el('div', { className: 'kanban-col-head' }, [
          el('h2', { className: 'kanban-col-title', text: col.label }),
          el('span', { className: 'kanban-count', text: String(count) })
        ]),
        list
      ]);

      board.appendChild(column);
    });

    root.appendChild(el('section', { className: 'section' }, [board]));
  }

  function handleDrop(event, targetStatus) {
    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }
    if (!payload || !payload.kind || !payload.id) return;

    if (payload.kind === 'competence') {
      if (Storage.getCompetenceStatus(payload.id) === targetStatus) return;
      Storage.setCompetenceStatus(payload.id, targetStatus);
      UI.showToast('Competência movida para ' + UI.statusLabel(targetStatus) + '.');
    } else if (payload.kind === 'card') {
      const card = Storage.getPersonalCardById(payload.id);
      if (!card || card.status === targetStatus) return;
      Storage.setPersonalCardStatus(payload.id, targetStatus);
      UI.showToast('Card pessoal movido para ' + UI.statusLabel(targetStatus) + '.');
    }
  }

  function makeDraggable(node, payload) {
    node.setAttribute('draggable', 'true');
    node.addEventListener('dragstart', function (e) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      node.classList.add('is-dragging');
    });
    node.addEventListener('dragend', function () { node.classList.remove('is-dragging'); });
  }

  function menuButton(items) {
    const wrap = el('div', { className: 'menu-wrap' });
    const menu = el('div', { className: 'menu' }, items.map(function (item) {
      if (item.separator) return el('div', { className: 'menu-sep' });
      return el('button', {
        className: 'menu-item' + (item.danger ? ' menu-item--danger' : ''),
        text: item.label,
        attrs: { type: 'button' },
        on: {
          click: function (e) {
            e.stopPropagation();
            closeAllMenus();
            item.onSelect();
          }
        }
      });
    }));
    menu.hidden = true;

    const trigger = el('button', {
      className: 'icon-button',
      attrs: { type: 'button', 'aria-label': 'Ações do card', 'aria-haspopup': 'true' },
      on: {
        click: function (e) {
          e.stopPropagation();
          const willOpen = menu.hidden;
          closeAllMenus();
          menu.hidden = !willOpen;
        }
      }
    }, [UI.icon('M12 6.5v.01M12 12v.01M12 17.5v.01', 18)]);

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    return wrap;
  }

  function closeAllMenus() {
    Array.prototype.forEach.call(document.querySelectorAll('.menu'), function (menu) { menu.hidden = true; });
  }

  function statusMenuItems(currentStatus, onMove) {
    const items = [];
    [S.STANDBY, S.IN_PROGRESS, S.COMPLETED].forEach(function (status) {
      if (status === currentStatus) return;
      items.push({
        label: 'Mover para ' + UI.statusLabel(status),
        onSelect: function () { onMove(status); }
      });
    });
    return items;
  }

  function competenceKanbanCard(comp, status) {
    const context = Data.getCompetenceFullContext(comp.Competencia_ID);
    const items = statusMenuItems(status, function (next) {
      Storage.setCompetenceStatus(comp.Competencia_ID, next);
      UI.showToast('Competência movida para ' + UI.statusLabel(next) + '.');
    });
    items.push({ separator: true });
    items.push({
      label: 'Voltar para Aberto',
      onSelect: function () {
        Storage.setCompetenceStatus(comp.Competencia_ID, S.OPEN);
        UI.showToast('Competência voltou para Aberto.');
      }
    });
    items.push({
      label: 'Ver competência',
      onSelect: function () { UI.openCompetenceDrawer(comp.Competencia_ID); }
    });

    const card = el('article', {
      className: 'kcard',
      attrs: { 'data-area': context.area ? context.area.Area_ID : '' }
    }, [
      el('div', { className: 'kcard-top' }, [
        UI.tagBadge('COMPETÊNCIA'),
        menuButton(items)
      ]),
      el('h3', {
        className: 'kcard-title',
        text: comp.Competencia,
        attrs: { tabindex: '0', role: 'button' },
        on: {
          click: function () { UI.openCompetenceDrawer(comp.Competencia_ID); },
          keydown: function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              UI.openCompetenceDrawer(comp.Competencia_ID);
            }
          }
        }
      }),
      el('p', {
        className: 'kcard-meta',
        text: (context.area ? context.area.Area_Atuacao : '') + ' · ' + (context.category ? context.category.Categoria : '')
      }),
      el('div', { className: 'kcard-foot' }, [UI.levelBadge(comp.Nivel)])
    ]);

    makeDraggable(card, { kind: 'competence', id: comp.Competencia_ID });
    return card;
  }

  function personalKanbanCard(card) {
    const items = statusMenuItems(card.status, function (next) {
      Storage.setPersonalCardStatus(card.id, next);
      UI.showToast('Card pessoal movido para ' + UI.statusLabel(next) + '.');
    });
    items.push({ separator: true });
    items.push({ label: 'Editar card', onSelect: function () { UI.openPersonalCardModal(card.id); } });
    items.push({ label: 'Excluir card', danger: true, onSelect: function () { UI.confirmDeletePersonalCard(card.id); } });

    const foot = el('div', { className: 'kcard-foot' });
    if (card.status === S.COMPLETED && card.completedAt) {
      foot.appendChild(el('span', { className: 'kcard-meta', text: 'Concluído em ' + UI.formatDate(card.completedAt) }));
    }
    const url = UI.safeUrl(card.url);
    if (url) {
      const link = UI.externalLink(url, 'Abrir link');
      link.className = 'kcard-link';
      link.addEventListener('click', function (e) { e.stopPropagation(); });
      foot.appendChild(link);
    }

    const node = el('article', { className: 'kcard' }, [
      el('div', { className: 'kcard-top' }, [
        UI.tagBadge('PESSOAL · ' + UI.cardTypeLabel(card.type).toUpperCase()),
        menuButton(items)
      ]),
      el('h3', {
        className: 'kcard-title',
        text: card.title,
        attrs: { tabindex: '0', role: 'button' },
        on: {
          click: function () { UI.openPersonalCardModal(card.id); },
          keydown: function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              UI.openPersonalCardModal(card.id);
            }
          }
        }
      }),
      card.description ? el('p', { className: 'kcard-meta', text: card.description }) : null,
      foot
    ]);

    makeDraggable(node, { kind: 'card', id: card.id });
    return node;
  }

  /* ==========================================================================
     MEU PROGRESSO
     ========================================================================== */

  function clearProgressFilters() {
    progressFilters.areaId = 'ALL';
    progressFilters.categoryId = 'ALL';
    progressFilters.nivel = 'ALL';
    progressFilters.status = 'ALL';
    progressFilters.hideCompleted = false;
    App.rerender();
  }

  function renderProgress(root) {
    root.appendChild(pageHead(
      'Meu Progresso',
      'Visualize o que você já concluiu e o que ainda existe no seu mapa de competências.'
    ));

    const all = Data.getActiveCompetences();
    const globalSummary = statusesOf(all);

    if (!globalSummary.completed && !globalSummary.inProgress && !globalSummary.standby) {
      root.appendChild(el('p', {
        className: 'notice',
        text: 'Você ainda não iniciou seu mapa. Explore o Catálogo para escolher as primeiras competências.'
      }));
    }

    /* Filtros */
    const filtersBox = el('div', { className: 'filters section' }, [
      el('div', { className: 'filters-row' }, [
        selectField('Área', 'p-area', areaOptions(), progressFilters.areaId, function (value) {
          progressFilters.areaId = value;
          reconcileCategory(progressFilters);
          App.rerender();
        }),
        selectField('Categoria', 'p-cat', categoryOptions(progressFilters.areaId), progressFilters.categoryId, function (value) {
          progressFilters.categoryId = value;
          App.rerender();
        }),
        selectField('Nível', 'p-nivel', nivelOptions(), progressFilters.nivel, function (value) {
          progressFilters.nivel = value;
          App.rerender();
        }),
        selectField('Status', 'p-status', statusOptions(), progressFilters.status, function (value) {
          progressFilters.status = value;
          App.rerender();
        })
      ]),
      el('div', { className: 'filters-foot' }, [
        el('label', { className: 'switch' }, [
          el('input', {
            attrs: { type: 'checkbox', checked: progressFilters.hideCompleted },
            on: {
              change: function (e) {
                progressFilters.hideCompleted = e.target.checked;
                App.rerender();
              }
            }
          }),
          el('span', { className: 'switch-track', attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: 'Mostrar apenas não concluídas' })
        ]),
        el('button', { className: 'link-button', text: 'Limpar filtros', attrs: { type: 'button' }, on: { click: clearProgressFilters } })
      ])
    ]);
    root.appendChild(filtersBox);

    /* Resumo por área */
    if (progressFilters.areaId === 'ALL') {
      const cards = el('div', { className: 'area-cards' }, Data.getActiveAreas().map(function (area) {
        const s = statusesOf(Data.getCompetencesByArea(area.Area_ID));
        return el('button', {
          className: 'card area-card',
          attrs: { type: 'button', 'data-area': area.Area_ID },
          on: {
            click: function () {
              progressFilters.areaId = area.Area_ID;
              reconcileCategory(progressFilters);
              App.rerender();
            }
          }
        }, [
          el('p', { className: 'area-card-title', text: area.Area_Atuacao }),
          el('p', { className: 'area-card-big', text: UI.formatPercent(s.pct) }),
          el('p', { className: 'area-card-sub', text: s.completed + ' de ' + s.total + ' concluídas' }),
          UI.progressBar(s.pct),
          el('p', {
            className: 'area-card-stats',
            text: s.inProgress + ' em andamento · ' + s.standby + ' em Stand By · ' + s.open + ' abertas'
          })
        ]);
      }));
      root.appendChild(el('section', { className: 'section' }, [sectionHead('Resumo por área'), cards]));
    }

    /* Legenda */
    const legend = el('div', { className: 'legend' }, [S.OPEN, S.STANDBY, S.IN_PROGRESS, S.COMPLETED].map(UI.statusBadge));
    root.appendChild(el('section', { className: 'section' }, [
      sectionHead('Mapa de competências', null, 'Organizado por Área, Categoria e Nível.'),
      legend
    ]));

    /* Mapa */
    const filtered = Data.filterCompetences(progressFilters);
    if (!filtered.length) {
      root.appendChild(emptyBlock(
        'Nenhuma competência encontrada.',
        'Tente alterar os filtros para ver outra parte do seu mapa.',
        [el('button', { className: 'btn btn--secondary', text: 'Limpar filtros', attrs: { type: 'button' }, on: { click: clearProgressFilters } })]
      ));
      return;
    }

    const groups = Data.groupByAreaAndCategory(filtered);
    const mapWrap = el('div', {});

    groups.forEach(function (group) {
      mapWrap.appendChild(el('h3', {
        className: 'map-area-title',
        text: group.area.Area_Atuacao,
        attrs: { 'data-area': group.area.Area_ID }
      }));
      group.categories.forEach(function (bucket) {
        const s = statusesOf(bucket.competences);
        const block = el('section', {
          className: 'map-cat',
          attrs: { 'data-area': group.area.Area_ID }
        }, [
          el('div', { className: 'map-cat-head' }, [
            el('h4', { className: 'map-cat-title', text: bucket.category.Categoria }),
            el('p', {
              className: 'map-cat-meta',
              text: s.total + (s.total === 1 ? ' competência · ' : ' competências · ') + s.completed + ' concluídas'
            })
          ]),
          el('div', { className: 'map-cat-bar' }, [UI.progressBar(s.pct)])
        ]);

        Data.NIVEIS.forEach(function (nivel) {
          const cells = bucket.competences.filter(function (c) { return c.Nivel === nivel; });
          if (!cells.length) return;
          block.appendChild(el('div', { className: 'map-level' }, [
            el('p', { className: 'map-level-title', text: nivel }),
            el('div', { className: 'map-cells' }, cells.map(function (comp) {
              return mapCell(comp, group.area, nivel);
            }))
          ]));
        });

        mapWrap.appendChild(block);
      });
    });

    root.appendChild(mapWrap);
  }

  function mapCell(comp, area, nivel) {
    const status = Storage.getCompetenceStatus(comp.Competencia_ID);
    const label = comp.Competencia + ' · ' + area.Area_Atuacao + ' · ' + nivel + ' · ' + UI.statusLabel(status);
    return el('button', {
      className: 'map-cell',
      attrs: { type: 'button', 'data-status': status, title: label, 'aria-label': label },
      on: { click: function () { UI.openCompetenceDrawer(comp.Competencia_ID); } }
    }, [
      el('span', { className: 'map-cell-mark', text: UI.statusMark(status), attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'map-cell-name', text: comp.Competencia })
    ]);
  }

  return {
    renderHome: renderHome,
    renderCatalog: renderCatalog,
    renderKanban: renderKanban,
    renderProgress: renderProgress,
    closeAllMenus: closeAllMenus,
    catalogFilters: catalogFilters,
    progressFilters: progressFilters
  };
})();
