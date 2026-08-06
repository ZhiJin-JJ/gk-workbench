/* ========== 每日复盘 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    w = App.w,
    media = App.media;

  let filter = 'all';

  function card(r, refresh, compact) {
    const mod = store.module(r.moduleId);
    const items = r.items || [];
    const shown = compact ? items.slice(0, 1) : items;
    const el = u.el(`<div class="entry" style="border-left-color:${mod.color}">
      <div class="eh">
        <span class="tag" style="background:${mod.color}1f;color:${mod.color}">${u.esc(mod.name)}</span>
        <span class="tag" style="background:#A98BD41f;color:#7B5FC0">${items.length} 条</span>
        <span class="date">${u.fmtDate(r.date, 'md')}</span>
      </div>
      <div data-items></div>
      ${r.text ? `<div class="kv" style="margin-top:8px"><span class="k">总结</span><span class="v">${u.esc(r.text)}</span></div>` : ''}
      <div data-photos class="photo-grid" style="margin-top:9px"></div>
      <div data-audios style="margin-top:9px"></div>
      <div class="foot">
        <button class="btn mini ghost" data-edit>${ui.icon('edit', 14)}编辑</button>
        <button class="btn mini ghost" data-del style="margin-left:auto">${ui.icon('trash', 14)}</button>
      </div>
    </div>`);

    const ibox = el.querySelector('[data-items]');
    shown.forEach((it, i) => {
      ibox.appendChild(
        u.el(`<div class="rv-item">
        <div class="small strong"><span class="idx">${i + 1}</span>${u.esc(it.q || '（未填题目）')}</div>
        ${it.a ? `<div class="kv"><span class="k">答案</span><span class="v">${u.esc(it.a)}</span></div>` : ''}
        ${it.k ? `<div class="kv"><span class="k">知识点</span><span class="v">${u.esc(it.k)}</span></div>` : ''}
      </div>`)
      );
    });
    if (compact && items.length > shown.length) ibox.appendChild(u.el(`<div class="tiny muted center" style="margin-top:6px">还有 ${items.length - shown.length} 条…</div>`));

    const pbox = el.querySelector('[data-photos]');
    (r.photos || []).forEach((id) => {
      const img = u.el('<img class="photo-thumb" alt="复盘图片">');
      media.url(id).then((url) => (img.src = url));
      img.onclick = () => ui.viewImage(id);
      pbox.appendChild(img);
    });
    const abox = el.querySelector('[data-audios]');
    (r.audios || []).forEach((a) => abox.appendChild(w.voiceBar(a)));

    el.querySelector('[data-edit]').onclick = () => w.reviewDialog(r, refresh);
    el.querySelector('[data-del]').onclick = async () => {
      if (await ui.confirm({ title: '删除复盘', text: '删除后不可恢复，确定吗？', danger: true })) {
        (r.photos || []).forEach((id) => media.del(id));
        (r.audios || []).forEach((a) => media.del(a.id));
        store.delReview(r.id);
        refresh && refresh();
      }
    };
    return el;
  }

  function render(view) {
    const all = store.state.reviews;
    const month = u.today().slice(0, 7);
    const monthList = all.filter((r) => r.date.startsWith(month));
    const days = new Set(monthList.map((r) => r.date)).size;

    const root = u.el(`<div>
      <div class="page-head"><div class="grow"><h1>每日复盘</h1><div class="sub">本月复盘 ${days} 天 · ${monthList.length} 篇</div></div></div>
      <div class="card tight"><div class="chips" data-chips></div></div>
      <div data-list></div>
    </div>`);

    const chips = root.querySelector('[data-chips]');
    [{ id: 'all', name: '全部' }].concat(store.MODULES.map((m) => ({ id: m.id, name: m.name }))).forEach((o) => {
      const c = u.el(`<button class="chip ${filter === o.id ? 'on' : ''}">${o.name}</button>`);
      c.onclick = () => {
        filter = o.id;
        App.render();
      };
      chips.appendChild(c);
    });

    let list = all.slice();
    if (filter !== 'all') list = list.filter((r) => r.moduleId === filter);
    list = u.sortDesc(list, (r) => r.date + ' ' + r.createdAt);

    const box = root.querySelector('[data-list]');
    if (!list.length) box.appendChild(u.el('<div class="card"><div class="empty"><div class="big">还没有复盘记录</div>按「题目 ~ 答案 ~ 知识点与思考」记录，支持拍照与语音条</div></div>'));

    const groups = u.groupBy(list, (r) => r.date);
    Object.keys(groups)
      .sort()
      .reverse()
      .forEach((d) => {
        box.appendChild(u.el(`<div class="sec-head" style="padding:0 4px;margin-top:6px"><div class="sec-title" style="font-size:14px"><i class="dot"></i>${u.fmtDate(d, 'mdw')}</div><span class="tiny muted">${groups[d].length} 篇</span></div>`));
        groups[d].forEach((r) => box.appendChild(card(r, App.render)));
      });

    view.innerHTML = '';
    view.appendChild(root);
    const fab = u.el(`<button class="fab">${ui.icon('plus', 24)}</button>`);
    fab.onclick = () => w.reviewDialog(null, App.render);
    view.appendChild(fab);
  }

  App.pages.review = { render, card };
})();
