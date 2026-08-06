/* ========== 打卡日历 + 学习时长趋势 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    w = App.w;

  let cur = new Date(); // 当前显示月份
  let range = 'week'; // week | month | year

  function hourColor(h) {
    if (h >= 8) return ['#B33E6E', '#8E2A55'];
    if (h >= 6) return ['#D5578A', '#B33E6E'];
    if (h >= 4) return ['#E7799A', '#CF5D82'];
    if (h >= 2) return ['#F49BB6', '#E7799A'];
    return ['#F8C3D3', '#F2A9C0'];
  }

  function render(view) {
    const y = cur.getFullYear(),
      mo = cur.getMonth();
    const first = new Date(y, mo, 1);
    const days = u.monthDays(y, mo);
    const lead = (first.getDay() + 6) % 7; // 周一开头
    const today = u.today();

    const monthKeys = [];
    for (let d = 1; d <= days; d++) monthKeys.push(`${y}-${u.pad(mo + 1)}-${u.pad(d)}`);
    const cks = monthKeys.map((k) => store.checkinOn(k)).filter(Boolean);
    const totalH = u.sum(cks, (c) => c.hours);

    const root = u.el(`<div>
      <div class="page-head"><div class="grow"><h1>打卡日历</h1><div class="sub">点击日期打卡 · 滚轮选择学习时长</div></div>
        <button class="icon-btn" data-tdy>${ui.icon('flame', 18)}</button></div>

      <div class="card">
        <div class="cal-head">
          <button class="icon-btn plain" data-prev>${ui.icon('left', 18)}</button>
          <div class="mo">${y} 年 ${mo + 1} 月</div>
          <button class="icon-btn plain" data-next>${ui.icon('right', 18)}</button>
        </div>
        <div class="cal-week">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid" data-grid></div>
        <div class="cal-legend"><span>少</span>
          <i style="background:#F8C3D3"></i><i style="background:#F49BB6"></i><i style="background:#E7799A"></i><i style="background:#D5578A"></i><i style="background:#B33E6E"></i>
          <span>多</span></div>
        <div class="sum-grid">
          <div class="sum"><div class="v">${cks.length}</div><div class="k">打卡天数</div></div>
          <div class="sum"><div class="v">${Math.round(totalH * 10) / 10}</div><div class="k">总时长(h)</div></div>
          <div class="sum"><div class="v">${cks.length ? Math.round((totalH / cks.length) * 10) / 10 : 0}</div><div class="k">日均(h)</div></div>
          <div class="sum"><div class="v">${store.streak()}</div><div class="k">连续天数</div></div>
        </div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>学习时长趋势</div>
          <div class="chips" data-range>
            <button class="chip ${range === 'week' ? 'on' : ''}" data-r="week">每周</button>
            <button class="chip ${range === 'month' ? 'on' : ''}" data-r="month">每月</button>
            <button class="chip ${range === 'year' ? 'on' : ''}" data-r="year">每年</button>
          </div></div>
        <div data-chart></div>
        <div class="sum-grid" data-tsum style="grid-template-columns:repeat(3,1fr)"></div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>本月打卡明细</div></div>
        <div data-detail></div>
      </div>
    </div>`);

    /* 日历格子 */
    const grid = root.querySelector('[data-grid]');
    for (let i = 0; i < lead; i++) grid.appendChild(u.el('<div class="cal-cell blank"></div>'));
    monthKeys.forEach((k) => {
      const c = store.checkinOn(k);
      const isToday = k === today;
      const future = k > today;
      const cell = u.el(`<div class="cal-cell ${c ? 'on' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}"
        ${c ? `style="background:linear-gradient(140deg,${hourColor(c.hours)[0]},${hourColor(c.hours)[1]})"` : ''}>
        <span>${u.parse(k).getDate()}</span>${c ? `<span class="h">${c.hours}h</span>` : ''}</div>`);
      cell.onclick = () => w.checkinDialog(k, App.render);
      grid.appendChild(cell);
    });

    root.querySelector('[data-prev]').onclick = () => {
      cur = new Date(y, mo - 1, 1);
      App.render();
    };
    root.querySelector('[data-next]').onclick = () => {
      cur = new Date(y, mo + 1, 1);
      App.render();
    };
    root.querySelector('[data-tdy]').onclick = () => w.checkinDialog(today, App.render);
    root.querySelectorAll('[data-r]').forEach(
      (b) =>
        (b.onclick = () => {
          range = b.dataset.r;
          App.render();
        })
    );

    /* 明细 */
    const det = root.querySelector('[data-detail]');
    const list = cks.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!list.length) det.appendChild(u.el('<div class="empty"><div class="big">本月还没有打卡</div>点击上方日期即可打卡</div>'));
    list.forEach((c) => {
      const st = store.rangeStat(c.date, c.date);
      const it = u.el(`<div class="rec-item">
        <div class="dt"><div class="d">${u.parse(c.date).getDate()}</div><div class="m">周${u.weekday(c.date)}</div></div>
        <div class="info"><div class="l1">${u.hm(c.hours)}</div>
          <div class="l2">${st.count ? '做题 ' + st.count + ' 题 · 正确率 ' + st.acc + '%' : '未记录做题'}${c.note ? ' · ' + u.esc(c.note) : ''}</div></div>
        <button class="icon-btn plain" data-edit>${ui.icon('edit', 16)}</button>
      </div>`);
      it.querySelector('[data-edit]').onclick = () => w.checkinDialog(c.date, App.render);
      det.appendChild(it);
    });

    view.innerHTML = '';
    view.appendChild(root);
    drawTrend(root.querySelector('[data-chart]'), root.querySelector('[data-tsum]'));
  }

  function drawTrend(el, sumEl) {
    let labels = [],
      data = [],
      title = '';
    if (range === 'week') {
      // 近 8 周，每周合计
      const monday = App.pages.modules.weekStart();
      for (let i = 7; i >= 0; i--) {
        const ws = u.addDays(monday, -7 * i);
        const we = u.addDays(ws, 6);
        labels.push(u.fmtDate(ws, 'short'));
        data.push(Math.round(u.sum(store.state.checkins.filter((c) => c.date >= ws && c.date <= we), (c) => c.hours) * 10) / 10);
      }
      title = '近 8 周每周学习时长';
    } else if (range === 'month') {
      const months = u.lastMonths(12);
      labels = months.map((m) => m.slice(5) + '月');
      data = months.map((m) => Math.round(u.sum(store.state.checkins.filter((c) => c.date.startsWith(m)), (c) => c.hours) * 10) / 10);
      title = '近 12 个月每月学习时长';
    } else {
      const yNow = new Date().getFullYear();
      for (let i = 4; i >= 0; i--) {
        const yy = yNow - i;
        labels.push(yy + '年');
        data.push(Math.round(u.sum(store.state.checkins.filter((c) => c.date.startsWith(String(yy))), (c) => c.hours) * 10) / 10);
      }
      title = '近 5 年每年学习时长';
    }
    App.charts.line(el, { labels, series: [{ name: title, color: '#C77BB0', data }], suffix: 'h', height: 176 });
    const tot = u.sum(data);
    const nonZero = data.filter((d) => d > 0);
    sumEl.innerHTML = `<div class="sum"><div class="v">${Math.round(tot * 10) / 10}</div><div class="k">合计(h)</div></div>
      <div class="sum"><div class="v">${nonZero.length ? Math.round((tot / nonZero.length) * 10) / 10 : 0}</div><div class="k">平均(h)</div></div>
      <div class="sum"><div class="v">${Math.max.apply(null, data.concat([0]))}</div><div class="k">最高(h)</div></div>`;
  }

  App.pages.checkin = { render };
})();
