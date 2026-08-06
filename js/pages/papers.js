/* ========== 试卷分析 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store;

  let type = '行测';

  function totals(p) {
    const secs = p.sections || [];
    const cnt = u.sum(secs, (s) => u.num(s.count));
    const cor = u.sum(secs, (s) => u.num(s.correct));
    return { cnt, cor, acc: u.pct(cor, cnt) };
  }

  function paperCard(p) {
    const cfg = store.PAPER_TYPES[p.type] || store.PAPER_TYPES['行测'];
    const t = totals(p);
    const rate = u.pct(u.num(p.score), u.num(p.full) || cfg.full);
    const el = u.el(`<div class="paper-card">
      <div class="ph">
        <span class="tag" style="background:${cfg.color}1f;color:${cfg.color}">${u.esc(p.type)}</span>
        <div class="nm ellipsis">${u.esc(p.name)}</div>
        <div class="score" style="color:${cfg.color}">${p.score}<small>/${u.num(p.full) || cfg.full}</small></div>
      </div>
      <div class="meta">
        <span>${u.fmtDate(p.date, 'mdw')}</span>
        ${p.minutes ? `<span>用时 ${p.minutes} 分钟</span>` : ''}
        ${t.cnt ? `<span>${t.cor}/${t.cnt} 题 · 正确率 <b style="color:${u.accColor(t.acc)}">${t.acc}%</b></span>` : ''}
        <span>得分率 ${rate}%</span>
      </div>
      <div class="sec-bars" data-bars></div>
      ${p.mistakeNote ? `<div class="kv" style="margin-top:9px"><span class="k">错题</span><span class="v">${u.esc(p.mistakeNote)}</span></div>` : ''}
      ${p.forgotten ? `<div class="kv" style="margin-top:4px"><span class="k">遗忘知识点</span><span class="v">${u.esc(p.forgotten)}</span></div>` : ''}
      <div class="foot">
        <button class="btn mini ghost" data-edit>${App.ui.icon('edit', 14)}编辑</button>
        <button class="btn mini ghost" data-del style="margin-left:auto">${App.ui.icon('trash', 14)}</button>
      </div>
    </div>`);

    const bars = el.querySelector('[data-bars]');
    (p.sections || []).forEach((s) => {
      const full = u.num(s.full);
      const pctScore = full ? u.pct(u.num(s.score), full) : s.count ? u.pct(u.num(s.correct), u.num(s.count)) : 0;
      bars.appendChild(
        u.el(`<div class="sec-bar">
        <div class="l"><span>${u.esc(s.name)}</span><span>${full ? s.score + '/' + full + ' 分' : ''}${s.count ? '　' + s.correct + '/' + s.count + ' 题' : ''} · ${pctScore}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${u.clamp(pctScore, 0, 100)}%;background:linear-gradient(90deg,${cfg.color}99,${cfg.color})"></div></div>
      </div>`)
      );
    });

    el.querySelector('[data-edit]').onclick = () => paperDialog(p, App.render);
    el.querySelector('[data-del]').onclick = async () => {
      if (await ui.confirm({ title: '删除试卷', text: '确定删除这套试卷记录？', danger: true })) {
        store.delPaper(p.id);
        App.render();
      }
    };
    return el;
  }

  function render(view) {
    const all = store.state.papers;
    const list = u.sortDesc(all.filter((p) => p.type === type), (p) => p.date + ' ' + p.createdAt);
    const chron = list.slice().reverse();

    const root = u.el(`<div>
      <div class="page-head"><div class="grow"><h1>试卷分析</h1><div class="sub">共 ${all.length} 套 · ${u.esc(type)} ${list.length} 套</div></div></div>
      <div class="card tight"><div class="chips" data-types></div></div>
      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>${u.esc(type)} 成绩趋势</div>
          <span class="tiny muted">${chron.length ? '最近 ' + Math.min(12, chron.length) + ' 套' : '暂无数据'}</span></div>
        <div data-chart></div>
      </div>
      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>各板块正确率趋势</div></div>
        <div data-chart2></div>
      </div>
      <div data-list></div>
    </div>`);

    const chips = root.querySelector('[data-types]');
    Object.keys(store.PAPER_TYPES).forEach((t) => {
      const c = u.el(`<button class="chip ${type === t ? 'on' : ''}">${t}</button>`);
      c.onclick = () => {
        type = t;
        App.render();
      };
      chips.appendChild(c);
    });

    const box = root.querySelector('[data-list]');
    if (!list.length) box.appendChild(u.el(`<div class="card"><div class="empty"><div class="big">还没有${u.esc(type)}试卷记录</div>点击右下角「+」录入试卷名称、日期、分数、用时与各板块得分</div></div>`));
    list.forEach((p) => box.appendChild(paperCard(p)));

    view.innerHTML = '';
    view.appendChild(root);

    const cfg = store.PAPER_TYPES[type];
    const recent = chron.slice(-12);
    App.charts.line(root.querySelector('[data-chart]'), {
      labels: recent.map((p) => u.fmtDate(p.date, 'short')),
      series: [
        { name: '分数', color: cfg.color, data: recent.map((p) => u.num(p.score)) },
        { name: '正确率%', color: '#7FA9DE', data: recent.map((p) => (totals(p).cnt ? totals(p).acc : null)) },
      ],
      height: 180,
      fill: false,
    });

    // 各板块正确率 / 得分率趋势
    const secNames = [];
    recent.forEach((p) => (p.sections || []).forEach((s) => { if (s.name && secNames.indexOf(s.name) < 0) secNames.push(s.name); }));
    const palette = ['#E7799A', '#A98BD4', '#7FA9DE', '#5FBBA3', '#EFAE6E', '#C77BB0', '#8FBB6B', '#F2957B'];
    App.charts.line(root.querySelector('[data-chart2]'), {
      labels: recent.map((p) => u.fmtDate(p.date, 'short')),
      series: secNames.slice(0, 6).map((n, i) => ({
        name: n,
        color: palette[i % palette.length],
        data: recent.map((p) => {
          const s = (p.sections || []).find((x) => x.name === n);
          if (!s) return null;
          if (u.num(s.count)) return u.pct(u.num(s.correct), u.num(s.count));
          if (u.num(s.full)) return u.pct(u.num(s.score), u.num(s.full));
          return null;
        }),
      })),
      suffix: '%',
      height: 180,
      fill: false,
      yMin: 0,
      yMax: 100,
    });

    const fab = u.el(`<button class="fab">${ui.icon('plus', 24)}</button>`);
    fab.onclick = () => paperDialog(null, App.render);
    view.appendChild(fab);
  }

  /* ---------------- 录入 / 编辑试卷 ---------------- */
  function paperDialog(existing, onDone) {
    const e = existing || {};
    let ptype = e.type || type;
    let secs = (e.sections || (store.PAPER_TYPES[ptype] || {}).sections.map((n) => ({ name: n, score: '', full: '', count: '', correct: '' }))).map((x) => Object.assign({}, x));

    const body = u.el(`<div>
      <div class="field"><label>试卷名称</label><input class="input" data-name value="${u.esc(e.name || '')}" placeholder="如 2026 国考行测模拟卷（一）"></div>
      <div class="field"><label>试卷类型</label><div class="chips" data-types></div></div>
      <div class="grid2">
        <div class="field"><label>做题日期</label><input type="date" class="input" data-date value="${e.date || u.today()}"></div>
        <div class="field"><label>做题时间（分钟）</label><input type="number" inputmode="numeric" class="input" data-min value="${e.minutes || ''}" placeholder="如 120"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>得分</label><input type="number" inputmode="decimal" class="input" data-score value="${e.score != null ? e.score : ''}" placeholder="如 72.5"></div>
        <div class="field"><label>满分</label><input type="number" inputmode="decimal" class="input" data-full value="${e.full || (store.PAPER_TYPES[ptype] || {}).full || 100}"></div>
      </div>
      <div class="field">
        <label>各板块得分情况</label>
        <div class="sec-head-row"><span>板块</span><span>得分</span><span>满分</span><span>题数</span><span>对题</span><span></span></div>
        <div data-secs></div>
        <div class="row" style="margin-top:8px">
          <button class="btn mini ghost" data-addsec>${App.ui.icon('plus', 14)}添加板块</button>
          <span class="tiny muted" data-acc></span>
        </div>
      </div>
      <div class="field"><label>错题备注</label><textarea class="textarea" data-mnote placeholder="如：资料分析第 3 篇整体错、言语细节题 5 错 2">${u.esc(e.mistakeNote || '')}</textarea></div>
      <div class="field"><label>遗忘 / 待补知识点</label><textarea class="textarea" data-forget placeholder="如：增长率公式、行政诉讼受案范围、成语「不刊之论」">${u.esc(e.forgotten || '')}</textarea></div>
    </div>`);

    const $ = (s) => body.querySelector(s);
    const typesBox = $('[data-types]');
    Object.keys(store.PAPER_TYPES).forEach((t) => {
      const c = u.el(`<button class="chip ${ptype === t ? 'on' : ''}">${t}</button>`);
      c.onclick = () => {
        ptype = t;
        typesBox.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c));
        $('[data-full]').value = store.PAPER_TYPES[t].full;
        if (!existing) {
          secs = store.PAPER_TYPES[t].sections.map((n) => ({ name: n, score: '', full: '', count: '', correct: '' }));
          renderSecs();
        }
      };
      typesBox.appendChild(c);
    });

    const secBox = $('[data-secs]');
    const updAcc = () => {
      const cnt = u.sum(secs, (s) => u.num(s.count));
      const cor = u.sum(secs, (s) => u.num(s.correct));
      $('[data-acc]').textContent = cnt ? `合计 ${cor}/${cnt} 题 · 正确率 ${u.pct(cor, cnt)}%` : '填写题数与对题数可自动计算正确率';
    };
    const renderSecs = () => {
      secBox.innerHTML = '';
      secs.forEach((s, i) => {
        const row = u.el(`<div class="sec-row">
          <input class="input nm" value="${u.esc(s.name)}" placeholder="板块">
          <input class="input" type="number" inputmode="decimal" value="${s.score}" placeholder="分">
          <input class="input" type="number" inputmode="decimal" value="${s.full}" placeholder="满">
          <input class="input" type="number" inputmode="numeric" value="${s.count}" placeholder="题">
          <input class="input" type="number" inputmode="numeric" value="${s.correct}" placeholder="对">
          <button class="icon-btn plain" data-x>${App.ui.icon('x', 15)}</button>
        </div>`);
        const ins = row.querySelectorAll('input');
        ['name', 'score', 'full', 'count', 'correct'].forEach((k, ki) => {
          ins[ki].oninput = () => {
            s[k] = ins[ki].value;
            updAcc();
          };
        });
        row.querySelector('[data-x]').onclick = () => {
          secs.splice(i, 1);
          renderSecs();
        };
        secBox.appendChild(row);
      });
      updAcc();
    };
    renderSecs();
    $('[data-addsec]').onclick = () => {
      secs.push({ name: '', score: '', full: '', count: '', correct: '' });
      renderSecs();
    };

    ui.sheet({
      title: existing ? '编辑试卷' : '录入试卷成绩',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存',
          cls: 'primary',
          icon: 'check',
          onClick: (close) => {
            const rec = {
              name: $('[data-name]').value.trim(),
              type: ptype,
              date: $('[data-date]').value || u.today(),
              minutes: u.num($('[data-min]').value),
              score: u.num($('[data-score]').value),
              full: u.num($('[data-full]').value) || (store.PAPER_TYPES[ptype] || {}).full,
              sections: secs.filter((s) => s.name),
              mistakeNote: $('[data-mnote]').value.trim(),
              forgotten: $('[data-forget]').value.trim(),
            };
            if (!rec.name) return ui.toast('请填写试卷名称');
            existing ? store.updPaper(existing.id, rec) : store.addPaper(rec);
            type = ptype;
            ui.toast('试卷已保存');
            close();
            onDone && onDone();
          },
        },
      ],
    });
  }

  App.pages.papers = { render, paperDialog };
})();
