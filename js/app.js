/* ==========================================================================
   ClimbMap V1.0 - aplicacao
   Hash routing, render das telas e eventos globais.
   ========================================================================== */

const App = (function () {
  const ROUTES = {
    inicio: Views.renderHome,
    catalogo: Views.renderCatalog,
    kanban: Views.renderKanban,
    progresso: Views.renderProgress
  };

  const DEFAULT_ROUTE = 'inicio';
  let currentRoute = DEFAULT_ROUTE;

  function routeFromHash() {
    const raw = String(window.location.hash || '').replace(/^#\/?/, '').trim();
    return ROUTES[raw] ? raw : DEFAULT_ROUTE;
  }

  function updateNav() {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item[data-route]'), function (item) {
      const active = item.getAttribute('data-route') === currentRoute;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function render(keepScroll) {
    const scrollY = window.scrollY;
    const view = UI.clear(document.getElementById('view'));
    Views.closeAllMenus();
    (ROUTES[currentRoute] || ROUTES[DEFAULT_ROUTE])(view);
    updateNav();
    document.title = 'ClimbMap';
    if (keepScroll) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
  }

  function rerender() {
    render(true);
    UI.refreshDrawer();
  }

  function navigate() {
    const next = routeFromHash();
    const changed = next !== currentRoute;
    currentRoute = next;
    closeSidebar();
    render(!changed);
  }

  /* ---------- Sidebar em telas menores ---------- */

  function openSidebar() {
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('sidebar-scrim').hidden = false;
    document.getElementById('btn-menu').setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('sidebar-scrim').hidden = true;
    document.getElementById('btn-menu').setAttribute('aria-expanded', 'false');
  }

  /* ---------- Eventos globais ---------- */

  function bindEvents() {
    window.addEventListener('hashchange', navigate);

    document.getElementById('drawer-close').addEventListener('click', UI.closeDrawer);
    document.getElementById('drawer-overlay').addEventListener('click', UI.closeDrawer);
    document.getElementById('modal-close').addEventListener('click', UI.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', UI.closeModal);

    document.getElementById('btn-backup').addEventListener('click', Backup.openBackupModal);

    document.getElementById('backup-file-input').addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      Backup.handleFile(file);
    });

    document.getElementById('btn-menu').addEventListener('click', function () {
      const isOpen = document.getElementById('sidebar').classList.contains('is-open');
      if (isOpen) closeSidebar(); else openSidebar();
    });
    document.getElementById('sidebar-scrim').addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (UI.isModalOpen()) { UI.closeModal(); return; }
      if (UI.isDrawerOpen()) { UI.closeDrawer(); return; }
      Views.closeAllMenus();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.menu-wrap')) Views.closeAllMenus();
    });

    Storage.subscribe(rerender);
  }

  let started = false;

  function init() {
    if (started) return;
    started = true;
    Storage.loadState();
    bindEvents();
    currentRoute = routeFromHash();
    if (!window.location.hash) window.location.hash = '#' + DEFAULT_ROUTE;
    render(false);
  }

  return {
    init: init,
    render: render,
    rerender: rerender,
    navigate: navigate,
    get currentRoute() { return currentRoute; }
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
