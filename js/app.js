// Hash router + shell (role switch, bottom nav, live refresh).
(function () {
  const A = window.BatoiAPI, U = window.UI;
  const view = document.getElementById('view');
  const nav = document.getElementById('bottomnav');
  const app = document.getElementById('app');
  let current = null, cleanup = null;

  const NAVS = {
    travel: [['#/', 'Search', 'search', /^\/(results|trip|checkout|hire|hirecheckout)?$/], ['#/trips', 'My trips', 'ticket', /^\/(trips|ticket)/], ['#/alerts', 'Alerts', 'bell', /^\/alerts/]],
    drive: [['#/drive', 'Home', 'home', /^\/drive(\/trip|\/hire)?(\/|$)/], ['#/drive/requests', 'Requests', 'inbox', /^\/drive\/requests/], ['#/drive/post', 'Post trip', 'plus', /^\/drive\/post/]],
    admin: []
  };

  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    return { path: path || '/', query: new URLSearchParams(qs || '') };
  }
  function render(keepScroll) {
    const { path, query } = parse();
    const r = window.Batoi.routes.find((x) => x.re.test(path)) || window.Batoi.routes[0];
    const params = path.match(r.re).slice(1).map(decodeURIComponent);
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    const y = window.scrollY;
    current = { r, params, query, path };
    app.classList.toggle('wide', r.role === 'admin');
    document.querySelectorAll('.roles a').forEach((a) => a.classList.toggle('on', a.dataset.role === r.role));
    renderNav(r.role, path);
    try {
      cleanup = r.fn(view, params, query) || null;
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="card"><h2>Something went wrong</h2><p class="muted">' + U.esc(e.message) + '</p><a class="btn" href="#/">Go home</a></div>';
    }
    window.scrollTo(0, keepScroll ? y : 0);
  }
  function renderNav(role, path) {
    const items = NAVS[role] || [];
    nav.style.display = items.length ? '' : 'none';
    nav.innerHTML = items.map(([href, label, icon, re]) => {
      const badge = role === 'travel' && icon === 'bell' && A.unread() ? '<span class="dot">' + A.unread() + '</span>' :
        role === 'drive' && icon === 'inbox' && window.Batoi.driverId && A.openRequests(window.Batoi.driverId).length ? '<span class="dot">' + A.openRequests(window.Batoi.driverId).length + '</span>' : '';
      return '<a href="' + href + '" class="' + (re.test(path) ? 'on' : '') + '">' + U.ICON[icon] + label + badge + '</a>';
    }).join('');
  }

  window.addEventListener('hashchange', () => render(false));
  window.addEventListener('batoi:change', () => {
    if (!current) return;
    renderNav(current.r.role, current.path);
    if (current.r.live) render(true);
  });
  render(false);
})();
