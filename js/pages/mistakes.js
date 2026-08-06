/* ========== 错题记录 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    w = App.w,
    media = App.media;

  let filter = 'all';
  let kw = '';

  function card(m, refresh, compact) {
    const mod = store.module(m.moduleId);
    const el = u.el(`<div class="entry" style="border-left-color:${mod.color}">
      <div class="eh">
        <span class="tag" style="background:${mod.color}1f;color:${mod.color}">${u.esc(mod.name)}</span>
        ${m.mastered ? '<span class="tag" style="background:#5FBBA31f;color:#2F9C82">已掌握</span>' : ''}
        <span class="date">${u.fmtDate(m.date, 'md')}</span>
      </div>
      ${m.title ? `<div class="q">${u.esc(m.title)}</div>` : ''}
      ${m.mine || m.answer ? `<div class="kv"><span class="k">答案</span><span class="v">${m.mine ? '我选 ' + u.esc(m.mine) + '　' : ''}${m.answer ? '正确 ' + u.esc(m.answer) : ''}</span></div>` : ''}
      ${m.knowledge ? `<div class="kv"><span class="k">知识点</span><span class="v">${u.esc(m.knowledge)}</span></div>` : ''}
      <div data-photos class="photo-grid" style="margin-top:9px"></div>
      <div data-audios style="margin-top:9px"></div>
      <div class="foot">
        <button class="btn mini ${m.mastered ? 'ghost' : ''}" data-master>${ui.icon('check', 14)}${m.mastered ? '取消掌握' : '标记掌握'}</button>
        <button class="btn mini ghost" data-edit>${ui.icon('edit', 14)}编辑</button>
        <button class="btn mini ghost" data-del style="margin-left:auto">${ui.icon('trash', 14)}</button>
      </div>
    </div>`);

    const pbox = el.querySelector('[data-photos]');
    (m.photos || []).forEach((id) => {
      const img = u.el('<img class="photo-thumb" alt="错题图片">');
      media.url(id).then((url) => (img.src = url));
      img.onclick = () => ui.viewImage(id);
      pbox.appendChild(img);
    });
    const abox = el.querySelector('[data-audios]');
    (m.audios || []).forEach((a) => abox.appendChild(w.voiceBar(a)));

    el.querySelector('[data-master]').onclick = () => {
      store.updMistake(m.id, { mastered: !m.mastered });
      refresh && refresh();
    };
    el.querySelector('[data-edit]').onclick = () => w.mistakeDialog(m, refresh);
    el.querySelector('[data-del]').onclick = async () => {
      if (await ui.confirm({ title: '删除错题', text: '删除后不可恢复，确定吗？', danger: true })) {
        (m.photos || []).forEach((id) => media.del(id));
        (m.audios || []).forEach((a) => media.del(a.id));
        store.delMistake(m.id);
        refresh && refresh();
      }
    };
    if (compact) el.style.marginBottom = '10px';
    return el;
  }

  function render(view) {
    const all = store.state.mistakes;
    const root = u.el(`<div>
      <div class="page-head"><div class="grow"><h1>错题记录</h1><div class="sub">共 ${all.length} 条 · 未掌握 ${all.filter((m) => !m.mastered).length} 条</div></div></div>
      <div class="card tight">
        <input class="input" data-kw placeholder="搜索题目 / 知识点…" value="${u.esc(kw)}">
        <div class="chips" style="margin-top:10px" data-chips></div>
      </div>
      <div data-list></div>
    </div>`);

    const chips = root.querySelector('[data-chips]');
    const opts = [{ id: 'all', name: '全部' }, { id: 'todo', name: '未掌握' }].concat(store.MODULES.map((m) => ({ id: m.id, name: m.name })));
    opts.forEach((o) => {
      const c = u.el(`<button class="chip ${filter === o.id ? 'on' : ''}">${o.name}</button>`);
      c.onclick = () => {
        filter = o.id;
        App.render();
      };
      chips.appendChild(c);
    });
    const kwInp = root.querySelector('[data-kw]');
    kwInp.oninput = u.debounce(() => {
      kw = kwInp.value.trim();
      App.render();
      const n = document.querySelector('[data-kw]');
      if (n) (n.focus(), n.setSelectionRange(n.value.length, n.value.length));
    }, 400);

    let list = all.slice();
    if (filter === 'todo') list = list.filter((m) => !m.mastered);
    else if (filter !== 'all') list = list.filter((m) => m.moduleId === filter);
    if (kw) list = list.filter((m) => (m.title + ' ' + (m.knowledge || '') + ' ' + (m.answer || '')).toLowerCase().includes(kw.toLowerCase()));

    const box = root.querySelector('[data-list]');
    if (!list.length) box.appendChild(u.el('<div class="card"><div class="empty"><div class="big">没有匹配的错题</div>点击右下角「+」添加，可拍照、录语音条并自动转文字</div></div>'));
    list.forEach((m) => box.appendChild(card(m, App.render)));

    view.innerHTML = '';
    view.appendChild(root);

    const fab = u.el(`<button class="fab">${ui.icon('plus', 24)}</button>`);
    fab.onclick = () => w.mistakeDialog(null, App.render);
    view.appendChild(fab);
  }

  App.pages.mistakes = { render, card };
})();
