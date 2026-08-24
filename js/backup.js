/* ==========================================================================
   ClimbMap V1.0 - backup
   Exporta e importa o estado pessoal em JSON. Nada do backup e executado:
   o conteudo e sempre tratado como dado.
   ========================================================================== */

const Backup = (function () {
  const BACKUP_SCHEMA_VERSION = 1;
  const APP_VERSION = '1.0';

  function buildBackup() {
    const state = Storage.getState();
    return {
      app: 'ClimbMap',
      backupSchemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      baseVersion: Data.version,
      exportedAt: Storage.nowIso(),
      state: {
        schemaVersion: state.schemaVersion || Storage.SCHEMA_VERSION,
        progress: state.progress,
        personalCards: state.personalCards,
        preferences: state.preferences
      }
    };
  }

  function fileName(date) {
    const d = date || new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return 'climbmap_backup_' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json';
  }

  function exportBackup() {
    const payload = JSON.stringify(buildBackup(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    UI.showToast('Backup exportado.');
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /* Validacao estrutural. Retorna { ok, error, backup, summary }. */
  function validateBackup(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return { ok: false, error: 'O arquivo não é um JSON válido.' };
    }
    if (!isPlainObject(parsed)) {
      return { ok: false, error: 'O arquivo não tem o formato esperado de backup.' };
    }
    if (parsed.app !== 'ClimbMap') {
      return { ok: false, error: 'Este arquivo não é um backup do ClimbMap.' };
    }
    if (parsed.backupSchemaVersion == null) {
      return { ok: false, error: 'O backup não informa a versão do schema.' };
    }
    if (!isPlainObject(parsed.state)) {
      return { ok: false, error: 'O backup não contém o bloco de estado.' };
    }
    if (!isPlainObject(parsed.state.progress)) {
      return { ok: false, error: 'O progresso do backup não está em um formato válido.' };
    }
    if (!Array.isArray(parsed.state.personalCards)) {
      return { ok: false, error: 'Os cards pessoais do backup não estão em um formato válido.' };
    }

    const normalized = Storage.normalizeState(parsed.state);

    return {
      ok: true,
      backup: parsed,
      state: normalized,
      summary: {
        baseVersion: parsed.baseVersion || '—',
        exportedAt: parsed.exportedAt || null,
        progressCount: Object.keys(normalized.progress).length,
        cardCount: normalized.personalCards.length
      }
    };
  }

  /* Substitui integralmente o estado atual. Nunca faz merge. */
  function importBackup(validated) {
    Storage.replaceState(validated.state);
    UI.showToast('Backup importado com sucesso.');
  }

  /* ---------- Modal ---------- */

  function openBackupModal() {
    const exportSection = UI.el('section', { className: 'modal-section' }, [
      UI.el('h3', { className: 'modal-section-title', text: 'Exportar Backup' }),
      UI.el('p', { className: 'modal-text', text: 'Baixe um arquivo com seu progresso e cards pessoais.' }),
      UI.el('button', {
        className: 'btn btn--primary',
        text: 'Exportar Backup',
        attrs: { type: 'button' },
        on: { click: exportBackup }
      })
    ]);

    const importSection = UI.el('section', { className: 'modal-section' }, [
      UI.el('h3', { className: 'modal-section-title', text: 'Importar Backup' }),
      UI.el('p', { className: 'modal-text', text: 'Restaure um backup existente. Os dados atuais deste navegador serão substituídos.' }),
      UI.el('button', {
        className: 'btn btn--secondary',
        text: 'Selecionar arquivo',
        attrs: { type: 'button' },
        on: {
          click: function () {
            const input = document.getElementById('backup-file-input');
            input.value = '';
            input.click();
          }
        }
      })
    ]);

    UI.openModal({
      title: 'Backup dos seus dados',
      wide: true,
      body: [
        UI.el('p', {
          className: 'modal-text',
          text: 'Seu progresso fica armazenado somente neste navegador. Exporte um backup para poder restaurá-lo ou levá-lo para outro computador.'
        }),
        exportSection,
        importSection
      ],
      footer: [
        UI.el('button', { className: 'btn btn--secondary', text: 'Fechar', attrs: { type: 'button' }, on: { click: UI.closeModal } })
      ]
    });
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = function () {
      UI.showToast('Não foi possível ler o arquivo selecionado.', 'error');
    };
    reader.onload = function () {
      const result = validateBackup(String(reader.result || ''));
      if (!result.ok) {
        UI.showToast(result.error, 'error');
        openInvalidModal(result.error);
        return;
      }
      openSummaryModal(result);
    };
    reader.readAsText(file);
  }

  function openInvalidModal(message) {
    UI.openModal({
      title: 'Backup inválido',
      body: [
        UI.el('p', { className: 'modal-text', text: message }),
        UI.el('p', { className: 'modal-text', text: 'Nenhum dado deste navegador foi alterado. Selecione um arquivo exportado pelo ClimbMap.' })
      ],
      footer: [
        UI.el('button', { className: 'btn btn--secondary', text: 'Fechar', attrs: { type: 'button' }, on: { click: UI.closeModal } })
      ]
    });
  }

  function openSummaryModal(result) {
    const s = result.summary;
    const summaryBox = UI.el('div', { className: 'summary-box' }, [
      UI.el('strong', { className: 'summary-line', text: 'Backup ClimbMap' }),
      UI.el('span', { className: 'summary-line', text: 'Base: V' + s.baseVersion }),
      UI.el('span', { className: 'summary-line', text: 'Exportado em: ' + (UI.formatDateTime(s.exportedAt) || '—') }),
      UI.el('span', { className: 'summary-line', text: s.progressCount + ' competências com progresso' }),
      UI.el('span', { className: 'summary-line', text: s.cardCount + ' cards pessoais' })
    ]);

    UI.openModal({
      title: 'Backup selecionado',
      wide: true,
      body: [
        UI.el('p', { className: 'modal-text', text: 'Confira o conteúdo do arquivo antes de substituir os dados deste navegador.' }),
        summaryBox
      ],
      footer: [
        UI.el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: UI.closeModal } }),
        UI.el('button', {
          className: 'btn btn--primary',
          text: 'Importar e substituir dados',
          attrs: { type: 'button' },
          on: { click: function () { openConfirmModal(result); } }
        })
      ]
    });
  }

  function openConfirmModal(result) {
    UI.openModal({
      title: 'Substituir dados atuais?',
      body: UI.el('p', {
        className: 'modal-text',
        text: 'Todo o progresso, cards pessoais e preferências atualmente armazenados neste navegador serão substituídos pelo backup selecionado.'
      }),
      footer: [
        UI.el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: UI.closeModal } }),
        UI.el('button', {
          className: 'btn btn--primary',
          text: 'Importar Backup',
          attrs: { type: 'button' },
          on: {
            click: function () {
              importBackup(result);
              UI.closeModal();
            }
          }
        })
      ]
    });
  }

  return {
    openBackupModal: openBackupModal,
    exportBackup: exportBackup,
    validateBackup: validateBackup,
    importBackup: importBackup,
    handleFile: handleFile,
    fileName: fileName,
    buildBackup: buildBackup
  };
})();
