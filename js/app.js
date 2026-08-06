/* ========== 路由与启动 ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u,
    ui = App.ui;

  const TABS = [
    { hash: '#/home', name: '首页', icon: 'home' },
    { hash: '#/modules', name: '刷题', icon: 'grid' },
    { hash: '#/review', name: '复盘', icon: 'note' },
    { hash: '#/mistakes', name: '错题', icon: 'book' },
    { hash: '#/checkin', name: '打卡', icon: 'calendar' },
    { hash: '#/papers', name: '试卷', icon: 'file' },
  ];

  function renderTabs(hash) {
    const bar = document.getElementById('tabbar');
    bar.innerHTML = '';
    TABS.forEach((t) => {
      const on = hash === t.hash || (t.hash === '#/modules' && hash.startsWith('#/module/'));
      const el = u.el(`<button class="tab ${on ? 'on' : ''}"><span class="ic">${ui.icon(t.icon, 20)}</span>${t.name}</button>`);
      el.onclick = () => (location.hash = t.hash);
      bar.appendChild(el);
    });
    bar.classList.toggle('hide', hash === '#/settings');
  }

  function render() {
    const view = document.getElementById('view');
    const hash = location.hash || '#/home';
    const y = window.scrollY;
    if (hash.startsWith('#/module/')) App.pages.modules.detail(view, hash.slice(9));
    else if (hash === '#/modules') App.pages.modules.render(view);
    else if (hash === '#/mistakes') App.pages.mistakes.render(view);
    else if (hash === '#/review') App.pages.review.render(view);
    else if (hash === '#/checkin') App.pages.checkin.render(view);
    else if (hash === '#/papers') App.pages.papers.render(view);
    else if (hash === '#/settings') App.pages.settings.render(view);
    else App.pages.home.render(view);
    renderTabs(hash);
    window.scrollTo(0, Math.min(y, document.body.scrollHeight));
  }

  let lastHash = '';
  window.addEventListener('hashchange', () => {
    const changed = location.hash !== lastHash;
    lastHash = location.hash;
    render();
    if (changed) window.scrollTo(0, 0);
  });

  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/home';
    lastHash = location.hash;
    render();
  });

  App.render = render;
})();
