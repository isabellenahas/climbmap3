/* ==========================================================================
   ClimbMap V1.0 - componentes de interface
   Drawer de competencia, modais, toasts, badges e helpers de DOM.
   Textos de dados sempre entram por textContent.
   ========================================================================== */

const UI = (function () {
  const S = Storage.STATUS;

  const STATUS_LABEL = {
    OPEN: 'Aberto',
    STANDBY: 'Stand By',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído'
  };

  /* Marcadores textuais: o status nunca depende so da cor. */
  const STATUS_MARK = {
    OPEN: '○',
    STANDBY: '◔',
    IN_PROGRESS: '▶',
    COMPLETED: '✓'
  };

  const CARD_TYPE_LABEL = {
    COURSE: 'Curso',
    BOOK: 'Livro',
    CERTIFICATION: 'Certificação',
    ARTICLE: 'Artigo',
    VIDEO: 'Vídeo',
    OTHER: 'Outro'
  };

  /* ---------- DOM helpers ---------- */

  function el(tag, options, children) {
    const node = document.createElement(tag);
    const opts = options || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (key) {
        const value = opts.attrs[key];
        if (value === false || value == null) return;
        node.setAttribute(key, value === true ? '' : String(value));
      });
    }
    if (opts.on) {
      Object.keys(opts.on).forEach(function (evt) {
        node.addEventListener(evt, opts.on[evt]);
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children == null) return;
    const list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child == null || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function icon(path, size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || 18);
    svg.setAttribute('height', size || 18);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
  }

  /* ---------- Formatacao ---------- */

  function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  function formatPercent(value) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0) + '%';
  }

  function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function statusLabel(status) {
    return STATUS_LABEL[status] || STATUS_LABEL.OPEN;
  }

  function cardTypeLabel(type) {
    return CARD_TYPE_LABEL[type] || CARD_TYPE_LABEL.OTHER;
  }

  /* ---------- Badges e barras ---------- */

  function statusBadge(status) {
    return el('span', { className: 'badge', attrs: { 'data-status': status } }, [
      el('span', { className: 'status-mark', text: STATUS_MARK[status] || STATUS_MARK.OPEN, attrs: { 'aria-hidden': 'true' } }),
      el('span', { text: statusLabel(status) })
    ]);
  }

  function neutralBadge(text) {
    return el('span', { className: 'badge badge--neutral', text: text });
  }

  /* Badge de nivel: escala visual propria, separada das cores de status. */
  function levelBadge(nivel) {
    return el('span', {
      className: 'badge badge--nivel',
      text: nivel,
      attrs: { 'data-nivel': nivel }
    });
  }

  function tagBadge(text) {
    return el('span', { className: 'badge badge--tag', text: text });
  }

  function progressBar(pct) {
    const fill = el('div', { className: 'progress-fill' });
    fill.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
    return el('div', {
      className: 'progress-track',
      attrs: {
        role: 'progressbar',
        'aria-valuenow': Math.round(pct || 0),
        'aria-valuemin': '0',
        'aria-valuemax': '100'
      }
    }, [fill]);
  }

  /* ---------- URLs ---------- */

  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
      return null;
    } catch (err) {
      return null;
    }
  }

  function externalLink(url, label) {
    return el('a', {
      text: label || url,
      attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' }
    });
  }

  /* Preserva o texto original do campo e apenas transforma URLs em links. */
  function renderResourceText(text) {
    const fragment = document.createDocumentFragment();
    const parts = String(text || '').split(/(https?:\/\/[^\s|]+)/g);
    parts.forEach(function (part) {
      if (!part) return;
      const url = /^https?:\/\//.test(part) ? safeUrl(part) : null;
      if (url) {
        fragment.appendChild(externalLink(url, part));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    return fragment;
  }

  function resourceList(raw) {
    const items = String(raw || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    const list = el('div', { className: 'resource-list' });
    if (!items.length) {
      list.appendChild(el('p', { className: 'drawer-text', text: String(raw || '') }));
      return list;
    }
    items.forEach(function (item) {
      const line = el('div', { className: 'resource-item' });
      line.appendChild(renderResourceText(item));
      list.appendChild(line);
    });
    return list;
  }

  /* ---------- Toasts ---------- */

  function showToast(message, variant) {
    const stack = document.getElementById('toast-stack');
    const toast = el('div', { className: 'toast' + (variant === 'error' ? ' toast--error' : ''), text: message });
    stack.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3600);
  }

  /* ---------- Modal ---------- */

  let modalPreviousFocus = null;

  function openModal(config) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const titleNode = document.getElementById('modal-title');
    const bodyNode = clear(document.getElementById('modal-body'));
    const footerNode = clear(document.getElementById('modal-footer'));

    if (modal.hidden) modalPreviousFocus = document.activeElement;

    titleNode.textContent = config.title || '';
    appendChildren(bodyNode, config.body);
    appendChildren(footerNode, config.footer);
    footerNode.hidden = !config.footer;

    modal.className = 'modal' + (config.wide ? ' modal--wide' : '');
    overlay.hidden = false;
    modal.hidden = false;
    document.body.classList.add('no-scroll');

    const focusTarget = config.focus || modal.querySelector('input, textarea, select, button');
    if (focusTarget) focusTarget.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    overlay.hidden = true;
    modal.hidden = true;
    clear(document.getElementById('modal-body'));
    clear(document.getElementById('modal-footer'));
    if (!isDrawerOpen()) document.body.classList.remove('no-scroll');
    if (modalPreviousFocus && document.contains(modalPreviousFocus)) modalPreviousFocus.focus();
    modalPreviousFocus = null;
  }

  function isModalOpen() {
    return !document.getElementById('modal').hidden;
  }

  function confirmDialog(config) {
    openModal({
      title: config.title,
      body: el('p', { className: 'modal-text', text: config.text }),
      footer: [
        el('button', {
          className: 'btn btn--secondary',
          text: config.cancelLabel || 'Cancelar',
          attrs: { type: 'button' },
          on: { click: closeModal }
        }),
        el('button', {
          className: 'btn ' + (config.danger ? 'btn--danger' : 'btn--primary'),
          text: config.confirmLabel || 'Confirmar',
          attrs: { type: 'button' },
          on: {
            click: function () {
              closeModal();
              if (typeof config.onConfirm === 'function') config.onConfirm();
            }
          }
        })
      ]
    });
  }

  /* ---------- Drawer de competencia ---------- */

  let openCompetenceId = null;
  let drawerPreviousFocus = null;

  function isDrawerOpen() {
    return !document.getElementById('drawer').hidden;
  }

  function openCompetenceDrawer(competenceId) {
    const context = Data.getCompetenceFullContext(competenceId);
    if (!context) return;
    if (!isDrawerOpen()) drawerPreviousFocus = document.activeElement;
    openCompetenceId = competenceId;

    document.getElementById('drawer-overlay').hidden = false;
    document.getElementById('drawer').hidden = false;
    document.body.classList.add('no-scroll');

    renderDrawer();
    document.getElementById('drawer-close').focus();
  }

  function closeDrawer() {
    openCompetenceId = null;
    document.getElementById('drawer-overlay').hidden = true;
    document.getElementById('drawer').hidden = true;
    if (!isModalOpen()) document.body.classList.remove('no-scroll');
    if (drawerPreviousFocus && document.contains(drawerPreviousFocus)) drawerPreviousFocus.focus();
    drawerPreviousFocus = null;
  }

  function refreshDrawer() {
    if (openCompetenceId && isDrawerOpen()) renderDrawer();
  }

  function drawerSection(title, contentNodes) {
    return el('section', { className: 'drawer-section' }, [
      el('h3', { className: 'drawer-section-title', text: title })
    ].concat(Array.isArray(contentNodes) ? contentNodes : [contentNodes]));
  }

  function hasContent(value) {
    return value != null && String(value).trim() !== '';
  }

  function isNone(value) {
    const v = String(value == null ? '' : value).trim().toLowerCase();
    return v === '' || v === 'nenhuma' || v === 'nenhum';
  }

  function renderDrawer() {
    const context = Data.getCompetenceFullContext(openCompetenceId);
    if (!context) return;
    const comp = context.competence;
    const status = Storage.getCompetenceStatus(comp.Competencia_ID);

    const badges = clear(document.getElementById('drawer-badges'));
    badges.appendChild(levelBadge(comp.Nivel));
    badges.appendChild(statusBadge(status));

    document.getElementById('drawer-title').textContent = comp.Competencia;
    document.getElementById('drawer-context').textContent =
      (context.area ? context.area.Area_Atuacao : '') + ' · ' + (context.category ? context.category.Categoria : '');

    const body = clear(document.getElementById('drawer-body'));

    /* Status e acoes */
    const actionsWrap = el('div', { className: 'drawer-actions' });
    const statusBlock = [];
    if (status === S.COMPLETED) {
      const completedAt = Storage.getCompletedAt(comp.Competencia_ID);
      statusBlock.push(el('p', {
        className: 'drawer-note',
        text: 'Concluído em ' + (formatDate(completedAt) || '—')
      }));
    }
    statusBlock.push(actionsWrap);
    body.appendChild(drawerSection('Status e ações', statusBlock));

    buildDrawerActions(actionsWrap, comp.Competencia_ID, status);

    /* Conteudo oficial */
    if (hasContent(comp.Descricao_Aprendizado)) {
      body.appendChild(drawerSection('O que aprender', el('p', { className: 'drawer-text', text: comp.Descricao_Aprendizado })));
    }
    if (hasContent(comp.Carga_Horaria_Estimada)) {
      body.appendChild(drawerSection('Carga horária estimada', el('p', { className: 'drawer-text', text: comp.Carga_Horaria_Estimada })));
    }
    if (hasContent(comp.Pre_Requisitos)) {
      body.appendChild(drawerSection('Pré-requisitos', el('p', { className: 'drawer-text', text: comp.Pre_Requisitos })));
    }
    if (hasContent(comp.Recursos_Recomendados)) {
      body.appendChild(drawerSection('Recursos recomendados', resourceList(comp.Recursos_Recomendados)));
    }
    if (!isNone(comp.Certificacao_Basica)) {
      body.appendChild(drawerSection('Certificação Básica', el('p', { className: 'drawer-text', text: comp.Certificacao_Basica })));
    }
    if (!isNone(comp.Certificacao_Robusta)) {
      body.appendChild(drawerSection('Certificação Robusta', el('p', { className: 'drawer-text', text: comp.Certificacao_Robusta })));
    }
    if (hasContent(comp.Observacoes)) {
      body.appendChild(drawerSection('Observações', el('p', { className: 'drawer-text', text: comp.Observacoes })));
    }
  }

  function actionButton(label, variant, onClick) {
    return el('button', {
      className: 'btn btn--' + variant,
      text: label,
      attrs: { type: 'button' },
      on: { click: onClick }
    });
  }

  function buildDrawerActions(wrap, id, status) {
    function move(next, message) {
      Storage.setCompetenceStatus(id, next);
      showToast(message);
    }

    if (status === S.OPEN) {
      wrap.appendChild(actionButton('Iniciar agora', 'primary', function () {
        move(S.IN_PROGRESS, 'Competência movida para Em Andamento.');
      }));
      wrap.appendChild(actionButton('Adicionar ao Stand By', 'secondary', function () {
        move(S.STANDBY, 'Competência adicionada ao Stand By.');
      }));
      return;
    }

    if (status === S.STANDBY) {
      wrap.appendChild(actionButton('Iniciar', 'primary', function () {
        move(S.IN_PROGRESS, 'Competência movida para Em Andamento.');
      }));
      wrap.appendChild(actionButton('Voltar para Aberto', 'secondary', function () {
        move(S.OPEN, 'Competência voltou para Aberto.');
      }));
      return;
    }

    if (status === S.IN_PROGRESS) {
      wrap.appendChild(actionButton('Marcar como Concluído', 'primary', function () {
        move(S.COMPLETED, 'Competência marcada como concluída.');
      }));
      wrap.appendChild(actionButton('Mover para Stand By', 'secondary', function () {
        move(S.STANDBY, 'Competência movida para Stand By.');
      }));
      wrap.appendChild(actionButton('Voltar para Aberto', 'secondary', function () {
        move(S.OPEN, 'Competência voltou para Aberto.');
      }));
      return;
    }

    wrap.appendChild(actionButton('Voltar para Em Andamento', 'primary', function () {
      move(S.IN_PROGRESS, 'Competência voltou para Em Andamento.');
    }));
    wrap.appendChild(actionButton('Voltar para Aberto', 'secondary', function () {
      confirmDialog({
        title: 'Voltar para Aberto?',
        text: 'A data de conclusão desta competência será removida.',
        confirmLabel: 'Voltar para Aberto',
        onConfirm: function () { move(S.OPEN, 'Competência voltou para Aberto.'); }
      });
    }));
  }

  /* ---------- Modal de card pessoal ---------- */

  function openPersonalCardModal(cardId) {
    const card = cardId ? Storage.getPersonalCardById(cardId) : null;
    const isEdit = !!card;

    const titleInput = el('input', {
      className: 'input',
      attrs: { type: 'text', id: 'pc-title', maxlength: '160', placeholder: 'Ex.: Curso de Power BI', value: card ? card.title : '' }
    });
    const titleError = el('p', { className: 'error-text', text: 'Informe um título para o card.' });
    titleError.hidden = true;

    const typeSelect = el('select', { className: 'select', attrs: { id: 'pc-type' } },
      Storage.CARD_TYPES.map(function (type) {
        return el('option', {
          text: cardTypeLabel(type),
          attrs: { value: type, selected: card && card.type === type }
        });
      })
    );

    const urlInput = el('input', {
      className: 'input',
      attrs: { type: 'url', id: 'pc-url', placeholder: 'https://', value: card ? card.url : '' }
    });

    const statusSelect = el('select', { className: 'select', attrs: { id: 'pc-status' } },
      [S.STANDBY, S.IN_PROGRESS, S.COMPLETED].map(function (status) {
        return el('option', {
          text: statusLabel(status),
          attrs: { value: status, selected: card ? card.status === status : status === S.STANDBY }
        });
      })
    );

    const descInput = el('textarea', {
      className: 'textarea',
      attrs: { id: 'pc-desc', rows: '3', placeholder: 'Opcional' },
      text: card ? card.description : ''
    });

    const body = el('div', { className: 'form-grid' }, [
      el('div', { className: 'field' }, [
        el('label', { className: 'field-label', text: 'Título', attrs: { for: 'pc-title' } }),
        titleInput,
        titleError
      ]),
      el('div', { className: 'field' }, [
        el('label', { className: 'field-label', text: 'Tipo', attrs: { for: 'pc-type' } }),
        typeSelect
      ]),
      el('div', { className: 'field' }, [
        el('label', { className: 'field-label', text: 'Link', attrs: { for: 'pc-url' } }),
        urlInput,
        el('p', { className: 'field-hint', text: 'Opcional. Use um endereço iniciado por http ou https.' })
      ]),
      el('div', { className: 'field' }, [
        el('label', { className: 'field-label', text: 'Status', attrs: { for: 'pc-status' } }),
        statusSelect
      ]),
      el('div', { className: 'field' }, [
        el('label', { className: 'field-label', text: 'Descrição', attrs: { for: 'pc-desc' } }),
        descInput
      ])
    ]);

    function submit() {
      const title = titleInput.value.trim();
      if (!title) {
        titleError.hidden = false;
        titleInput.classList.add('input-error');
        titleInput.focus();
        return;
      }
      const url = urlInput.value.trim();
      if (url && !safeUrl(url)) {
        showToast('O link informado não é um endereço http ou https válido.', 'error');
        urlInput.focus();
        return;
      }
      const payload = {
        title: title,
        type: typeSelect.value,
        url: url,
        status: statusSelect.value,
        description: descInput.value.trim()
      };
      if (isEdit) {
        Storage.updatePersonalCard(card.id, payload);
        showToast('Card pessoal atualizado.');
      } else {
        Storage.createPersonalCard(payload);
        showToast('Card pessoal criado.');
      }
      closeModal();
    }

    titleInput.addEventListener('input', function () {
      titleError.hidden = true;
      titleInput.classList.remove('input-error');
    });

    const footer = [];
    if (isEdit) {
      footer.push(el('button', {
        className: 'btn btn--danger',
        text: 'Excluir',
        attrs: { type: 'button' },
        on: {
          click: function () {
            confirmDeletePersonalCard(card.id);
          }
        }
      }));
    }
    footer.push(el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: closeModal } }));
    footer.push(el('button', {
      className: 'btn btn--primary',
      text: isEdit ? 'Salvar card' : 'Criar card',
      attrs: { type: 'button' },
      on: { click: submit }
    }));

    openModal({
      title: isEdit ? 'Editar card pessoal' : 'Novo card pessoal',
      body: body,
      footer: footer,
      focus: titleInput
    });
  }

  function confirmDeletePersonalCard(cardId) {
    confirmDialog({
      title: 'Excluir card pessoal?',
      text: 'Este card pessoal será removido permanentemente.',
      confirmLabel: 'Excluir card',
      danger: true,
      onConfirm: function () {
        Storage.deletePersonalCard(cardId);
        showToast('Card pessoal excluído.');
      }
    });
  }

  return {
    el: el,
    clear: clear,
    icon: icon,
    appendChildren: appendChildren,
    formatNumber: formatNumber,
    formatPercent: formatPercent,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    statusLabel: statusLabel,
    statusMark: function (status) { return STATUS_MARK[status] || STATUS_MARK.OPEN; },
    cardTypeLabel: cardTypeLabel,
    statusBadge: statusBadge,
    neutralBadge: neutralBadge,
    levelBadge: levelBadge,
    tagBadge: tagBadge,
    progressBar: progressBar,
    safeUrl: safeUrl,
    externalLink: externalLink,
    resourceList: resourceList,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    isModalOpen: isModalOpen,
    confirmDialog: confirmDialog,
    openCompetenceDrawer: openCompetenceDrawer,
    closeDrawer: closeDrawer,
    refreshDrawer: refreshDrawer,
    isDrawerOpen: isDrawerOpen,
    openPersonalCardModal: openPersonalCardModal,
    confirmDeletePersonalCard: confirmDeletePersonalCard
  };
})();
