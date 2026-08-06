/* ========== 八大板块 · 刷题 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    w = App.w;

  function weekStart() {
    const d = new Date();
    const wd = (d.getDay() + 6) % 7; // 周一为首日
    return u.addDays(u.today(), -wd);
  }

  function render(view) {
    const today = u.today();
    const ws = weekStart();
    const tAll = store.statOf(store.state.practice);
    const tToday = store.rangeStat(today, today);
    const tWeek = store.rangeStat(ws, today);

    const root = u.el(`<div>
      <div class="page-head"><div class="grow"><h1>刷题板块</h1><div class="sub">八大板块 · 记录每次做题与正确率</div></div>
        <button class="icon-btn" data-rec>${ui.icon('plus', 18)}</button></div>

      <div class="card">
        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat" style="background:linear-gradient(135deg,#F58AAB,#D5578A)"><div class="v">${tToday.count}</div><div class="k">今日题量</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#A98BD4,#7B5FC0)"><div class="v">${tWeek.count}</div><div class="k">本周题量</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#5FBBA3,#2F9C82)"><div class="v">${tAll.count ? tAll.acc : 0}<small>%</small></div><div class="k">累计正确率</div></div>
        </div>
      </div>

      <div class="sec-head" style="padding:0 4px"><div class="sec-title"><i class="dot"></i>选择板块</div><span class="tiny muted">点击卡片查看详情</span></div>
      <div class="mod-grid" data-grid></div>

      <div class="card" style="margin-top:14px">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>近 14 天题量与正确率</div></div>
        <div data-chart></div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>最近记录</div></div>
        <div data-recs></div>
      </div>
    </div>`);

    root.querySelector('[data-rec]').onclick = () => w.practiceDialog(null, App.render);

    const grid = root.querySelector('[data-grid]');
    store.MODULES.forEach((m) => {
      const st = store.statOf(store.state.practice.filter((p) => p.moduleId === m.id));
      const tdy = store.statOf(store.practiceOn(today, m.id));
      const card = u.el(`<div class="mod-card" style="background:linear-gradient(140deg,${m.color},${shade(m.color, -22)})">
        <div class="nm">${u.esc(m.name)}<span class="cat">${u.esc(m.cat)}</span></div>
        <div class="st"><span>今日 <b>${tdy.count}</b> 题</span><span>累计 ${st.count} 题 · ${st.count ? st.acc : 0}%</span></div>
      </div>`);
      card.onclick = () => (location.hash = '#/module/' + m.id);
      grid.appendChild(card);
    });

    const recs = root.querySelector('[data-recs]');
    const list = u.sortDesc(store.state.practice, (p) => p.date + ' ' + p.createdAt).slice(0, 8);
    if (!list.length) recs.appendChild(u.el('<div class="empty"><div class="big">还没有刷题记录</div>点右上角「+」记录本次刷题</div>'));
    list.forEach((p) => recs.appendChild(recItem(p)));

    view.innerHTML = '';
    view.appendChild(root);

    const days = u.lastDays(14);
    App.charts.line(root.querySelector('[data-chart]'), {
      labels: days.map((d) => u.fmtDate(d, 'short')),
      series: [
        { name: '题量', color: '#E7799A', data: days.map((d) => store.rangeStat(d, d).count) },
        { name: '正确率%', color: '#7FA9DE', data: days.map((d) => (store.rangeStat(d, d).count ? store.rangeStat(d, d).acc : null)) },
      ],
      height: 176,
      fill: false,
    });
  }

  function recItem(p) {
    const m = store.module(p.moduleId);
    const acc = u.pct(p.correct, p.count);
    const it = u.el(`<div class="rec-item">
      <div class="dt"><div class="d" style="color:${m.color}">${u.parse(p.date).getDate()}</div><div class="m">${u.parse(p.date).getMonth() + 1}月</div></div>
      <div class="info">
        <div class="l1">${u.esc(m.name)} · ${p.count} 题</div>
        <div class="l2">对 ${p.correct} 题${p.minutes ? ' · 用时 ' + p.minutes + ' 分钟' : ''}${p.note ? ' · ' + u.esc(p.note) : ''}</div>
      </div>
      <span class="acc-pill" style="background:${u.accColor(acc)}22;color:${u.accColor(acc)}">${acc}%</span>
      <button class="icon-btn plain" data-del>${ui.icon('trash', 16)}</button>
    </div>`);
    it.querySelector('[data-del]').onclick = async () => {
      if (await ui.confirm({ title: '删除记录', text: '确定删除这条刷题记录？', danger: true })) {
        store.delPractice(p.id);
        App.render();
      }
    };
    return it;
  }

  function detail(view, id) {
    const m = store.module(id);
    const today = u.today();
    const ws = weekStart();
    const all = store.state.practice.filter((p) => p.moduleId === id);
    const stAll = store.statOf(all);
    const stToday = store.statOf(all.filter((p) => p.date === today));
    const stWeek = store.statOf(all.filter((p) => p.date >= ws));

    const root = u.el(`<div>
      <div class="page-head"><button class="icon-btn" data-back>${ui.icon('left', 18)}</button>
        <div class="grow"><h1>${u.esc(m.name)}</h1><div class="sub">${u.esc(m.cat)} · 共 ${all.length} 次记录</div></div></div>

      <div class="mod-hero" style="background:linear-gradient(140deg,${m.color},${shade(m.color, -24)})">
        <div class="nm">${u.esc(m.name)}</div>
        <div class="grid">
          <div class="g"><div class="v">${stToday.count}</div><div class="k">今日题量</div></div>
          <div class="g"><div class="v">${stWeek.count}</div><div class="k">本周题量</div></div>
          <div class="g"><div class="v">${stAll.count ? stAll.acc : 0}%</div><div class="k">累计正确率</div></div>
        </div>
      </div>

      <button class="btn primary block" data-rec style="margin-bottom:14px">${ui.icon('plus', 17)}记录本次刷题</button>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>近 14 天趋势</div></div>
        <div data-chart></div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>历史记录</div>
          <span class="tiny muted">累计 ${stAll.count} 题 · ${u.hm(stAll.minutes / 60)}</span></div>
        <div data-recs></div>
      </div>
    </div>`);

    root.querySelector('[data-back]').onclick = () => (location.hash = '#/modules');
    root.querySelector('[data-rec]').onclick = () => w.practiceDialog(id, App.render);

    const recs = root.querySelector('[data-recs]');
    const list = u.sortDesc(all, (p) => p.date + ' ' + p.createdAt);
    if (!list.length) recs.appendChild(u.el('<div class="empty"><div class="big">暂无记录</div>点击上方按钮记录本次刷题</div>'));
    list.slice(0, 40).forEach((p) => recs.appendChild(recItem(p)));

    view.innerHTML = '';
    view.appendChild(root);

    const days = u.lastDays(14);
    App.charts.line(root.querySelector('[data-chart]'), {
      labels: days.map((d) => u.fmtDate(d, 'short')),
      series: [
        { name: '题量', color: m.color, data: days.map((d) => store.statOf(all.filter((p) => p.date === d)).count) },
        { name: '正确率%', color: '#7FA9DE', data: days.map((d) => { const s = store.statOf(all.filter((p) => p.date === d)); return s.count ? s.acc : null; }) },
      ],
      height: 176,
      fill: false,
    });
  }

  /** 颜色加深/变浅 */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = u.clamp(((n >> 16) & 255) + amt, 0, 255);
    const g = u.clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = u.clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  App.pages.modules = { render, detail, shade, weekStart };
})();
