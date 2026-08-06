/* ========== 首页 · 工作台 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    w = App.w;

  function greet() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了，注意休息';
    if (h < 11) return '早安，今天也要上岸';
    if (h < 14) return '午安，稳住节奏';
    if (h < 18) return '下午好，继续冲';
    if (h < 23) return '晚上好，收个尾';
    return '晚安，明天继续';
  }

  function countdownCard(e) {
    const c = store.EXAM_COLORS[e.colorIndex || 0] || store.EXAM_COLORS[0];
    const d = u.diffDays(u.today(), e.date);
    const card = u.el(`<div class="cd-card" style="background:linear-gradient(135deg,${c[0]},${c[1]})">
      <button class="rm icon-btn plain" style="color:#fff">${ui.icon('edit', 15)}</button>
      <div class="t"><span class="type">${u.esc(e.type)}</span></div>
      <div class="t" style="margin-top:6px">${u.esc(e.name)}</div>
      <div class="n">${d > 0 ? d : d === 0 ? '今天' : Math.abs(d)}${d > 0 ? '<small>天</small>' : d < 0 ? '<small>天前</small>' : ''}</div>
      <div class="d">${u.fmtDate(e.date, 'mdw')}${d > 0 ? ' · 冲刺中' : d === 0 ? ' · 考试日，加油！' : ' · 已结束'}</div>
    </div>`);
    card.querySelector('.rm').onclick = (ev) => {
      ev.stopPropagation();
      ui.sheet({
        title: u.esc(e.name),
        center: true,
        body: `<div class="small muted">${u.fmtDate(e.date, 'mdw')} · ${u.esc(e.type)}</div>`,
        footer: [
          {
            text: '删除',
            cls: 'danger',
            onClick: async (c2) => {
              c2();
              if (await ui.confirm({ title: '删除考试', text: '确定删除该倒计时？', danger: true })) {
                store.delExam(e.id);
                App.render();
              }
            },
          },
          {
            text: '编辑',
            cls: 'primary',
            onClick: (c2) => {
              c2();
              w.examDialog(e, App.render);
            },
          },
        ],
      });
    };
    return card;
  }

  function render(view) {
    const s = store.state;
    const today = u.today();
    const st = store.statOf(store.practiceOn(today));
    const ck = store.checkinOn(today);
    const plans = store.plansOn(today);
    const donePlans = plans.filter((p) => p.done).length;
    const reviews = s.reviews.filter((r) => r.date === today);

    const root = u.el('<div></div>');

    /* 头部 */
    const hero = u.el(`<div class="home-hero">
      <div>
        <div class="hi">${greet()}</div>
        <div class="date">${u.fmtDate(today, 'mdw')} · 连续打卡 ${store.streak()} 天</div>
      </div>
      <div class="acts">
        <button class="icon-btn" data-go-cal>${ui.icon('calendar', 18)}</button>
        <button class="icon-btn" data-set>${ui.icon('gear', 18)}</button>
      </div>
    </div>`);
    hero.querySelector('[data-set]').onclick = () => (location.hash = '#/settings');
    hero.querySelector('[data-go-cal]').onclick = () => (location.hash = '#/checkin');
    root.appendChild(hero);

    /* 倒计时 */
    const cdCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>考试倒计时</div>
        <button class="sec-more" data-add>${ui.icon('plus', 14)}添加</button></div>
      <div class="scroll-x" data-list></div>
    </div>`);
    const list = cdCard.querySelector('[data-list]');
    const exams = s.exams.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!exams.length) list.appendChild(u.el('<div class="empty" style="width:100%"><div class="big">还没有考试倒计时</div>点击右上角「添加」，国考 / 省考 / 事业编都能单独设置</div>'));
    exams.forEach((e) => list.appendChild(countdownCard(e)));
    const addCd = u.el(`<button class="cd-add">${ui.icon('plus', 20)}新增</button>`);
    addCd.onclick = () => w.examDialog(null, App.render);
    list.appendChild(addCd);
    cdCard.querySelector('[data-add]').onclick = () => w.examDialog(null, App.render);
    root.appendChild(cdCard);

    /* 今日数据 */
    const statCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>今日数据</div>
        <button class="sec-more" data-more>全部统计${ui.icon('right', 13)}</button></div>
      <div class="stat-grid">
        <div class="stat" style="background:linear-gradient(135deg,#F58AAB,#D5578A)"><div class="v">${st.count}</div><div class="k">做题数</div></div>
        <div class="stat" style="background:linear-gradient(135deg,#7FA9DE,#4E7FC1)"><div class="v">${st.count ? st.acc : 0}<small>%</small></div><div class="k">正确率</div></div>
        <div class="stat" style="background:linear-gradient(135deg,#5FBBA3,#2F9C82)"><div class="v">${ck ? ck.hours : 0}<small>h</small></div><div class="k">学习时长</div></div>
        <div class="stat" style="background:linear-gradient(135deg,#A98BD4,#7B5FC0)" data-ck><div class="v">${ck ? '✓' : '+'}</div><div class="k">${ck ? '已打卡' : '去打卡'}</div></div>
      </div>
      <button class="btn primary block" data-rec style="margin-top:12px">${ui.icon('plus', 17)}记录本次刷题</button>
    </div>`);
    statCard.querySelector('[data-more]').onclick = () => (location.hash = '#/modules');
    statCard.querySelector('[data-ck]').onclick = () => w.checkinDialog(today, App.render);
    statCard.querySelector('[data-rec]').onclick = () => w.practiceDialog(null, App.render);
    root.appendChild(statCard);

    /* 今日计划 */
    const planCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>今日计划</div>
        <button class="sec-more" data-tpl>${ui.icon('list', 14)}从模板导入</button></div>
      <div class="plan-progress"><div class="bar-track"><div class="bar-fill" style="width:${plans.length ? (donePlans / plans.length) * 100 : 0}%"></div></div>
        <span class="pct">${donePlans}/${plans.length}</span></div>
      <div data-plans></div>
      <div class="plan-add-row">
        <input class="input" data-new placeholder="添加一项计划，如：资料分析 20 题">
        <button class="btn primary" data-addplan>${ui.icon('plus', 16)}</button>
      </div>
    </div>`);
    const planBox = planCard.querySelector('[data-plans]');
    if (!plans.length) planBox.appendChild(u.el('<div class="empty"><div class="big">今天还没有计划</div>自己制定计划，完成后点击可划横线</div>'));
    plans.forEach((p) => {
      const it = u.el(`<div class="plan-item ${p.done ? 'done' : ''}">
        <div class="check ${p.done ? 'on' : ''}">${ui.icon('check', 13)}</div>
        <div class="txt">${u.esc(p.text)}${p.done && p.doneAt ? `<div class="meta">完成于 ${new Date(p.doneAt).getHours()}:${u.pad(new Date(p.doneAt).getMinutes())}</div>` : ''}</div>
        <button class="icon-btn plain" data-del>${ui.icon('trash', 16)}</button>
      </div>`);
      const toggle = () => {
        store.togglePlan(p.id);
        App.render();
      };
      it.querySelector('.check').onclick = toggle;
      it.querySelector('.txt').onclick = toggle;
      it.querySelector('[data-del]').onclick = () => {
        store.delPlan(p.id);
        App.render();
      };
      planBox.appendChild(it);
    });
    const newInp = planCard.querySelector('[data-new]');
    const addPlan = () => {
      const t = newInp.value.trim();
      if (!t) return;
      store.addPlan(today, t);
      App.render();
    };
    planCard.querySelector('[data-addplan]').onclick = addPlan;
    newInp.onkeydown = (e) => e.key === 'Enter' && addPlan();
    planCard.querySelector('[data-tpl]').onclick = () => tplPicker(today);
    root.appendChild(planCard);

    /* 每日复盘（今日计划下方，最近错题上方） */
    const rvCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>每日复盘</div>
        <div class="row"><button class="sec-more" data-add>${ui.icon('plus', 14)}新增</button>
        <button class="sec-more" data-more>全部${ui.icon('right', 13)}</button></div></div>
      <div data-box></div>
    </div>`);
    const rvBox = rvCard.querySelector('[data-box]');
    if (!reviews.length) rvBox.appendChild(u.el('<div class="empty"><div class="big">今天还没有复盘</div>题目 ~ 答案 ~ 知识点与思考，支持拍照与语音条</div>'));
    reviews.slice(0, 2).forEach((r) => rvBox.appendChild(App.pages.review.card(r, App.render, true)));
    rvCard.querySelector('[data-add]').onclick = () => w.reviewDialog(null, App.render);
    rvCard.querySelector('[data-more]').onclick = () => (location.hash = '#/review');
    root.appendChild(rvCard);

    /* 最近错题 */
    const msCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>最近错题</div>
        <div class="row"><button class="sec-more" data-add>${ui.icon('plus', 14)}新增</button>
        <button class="sec-more" data-more>全部${ui.icon('right', 13)}</button></div></div>
      <div data-box></div>
    </div>`);
    const msBox = msCard.querySelector('[data-box]');
    if (!s.mistakes.length) msBox.appendChild(u.el('<div class="empty"><div class="big">还没有错题记录</div>支持拍照、语音条与语音转文字</div>'));
    s.mistakes.slice(0, 3).forEach((m) => msBox.appendChild(App.pages.mistakes.card(m, App.render, true)));
    msCard.querySelector('[data-add]').onclick = () => w.mistakeDialog(null, App.render);
    msCard.querySelector('[data-more]').onclick = () => (location.hash = '#/mistakes');
    root.appendChild(msCard);

    /* 近 7 天学习时长 */
    const days = u.lastDays(7);
    const chartCard = u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>近 7 天学习时长</div>
        <button class="sec-more" data-more>更多趋势${ui.icon('right', 13)}</button></div>
      <div data-chart></div>
    </div>`);
    chartCard.querySelector('[data-more]').onclick = () => (location.hash = '#/checkin');
    root.appendChild(chartCard);

    /* 悬浮按钮：扫码打开 */
    const fab = u.el(`<button class="fab-qr" title="扫码打开">${ui.icon('qr', 18)}</button>`);
    fab.onclick = () => openQrSheet();
    root.appendChild(fab);

    view.innerHTML = '';
    view.appendChild(root);
    App.charts.line(chartCard.querySelector('[data-chart]'), {
      labels: days.map((d) => u.fmtDate(d, 'short')),
      series: [{ name: '学习时长', color: '#E7799A', data: days.map((d) => (store.checkinOn(d) || {}).hours || 0) }],
      suffix: 'h',
      height: 150,
    });
  }

  function openQrSheet() {
    const body = u.el(`<div style="text-align:center">
      <div class="small muted" style="margin-bottom:10px;line-height:1.7">用手机相机或微信扫描二维码，即可在手机上打开本工作台。打开后建议「添加到主屏幕」变成 App。</div>
      <canvas id="qr-canvas-home" style="width:220px;height:220px;border:1px solid #eee;border-radius:12px;background:#fff"></canvas>
      <div class="tiny muted" id="qr-url-home" style="margin-top:8px">生成中…</div>
      <button class="btn ghost block" data-copyurl style="margin-top:10px">${ui.icon('link', 16)}复制访问地址（发给微信好友）</button>
    </div>`);
    ui.sheet({ title: '手机扫码打开', center: true, body, footer: [{ text: '关闭', cls: 'ghost', onClick: (c) => c() }] });
    // 弹窗挂载后再生成（canvas 此时已在 DOM 中）
    setTimeout(async () => {
      const canvas = document.getElementById('qr-canvas-home');
      const urlEl = document.getElementById('qr-url-home');
      if (!canvas || !window.QRCode) return;
      let url = location.origin;
      try {
        const r = await fetch('./api/lan');
        const d = await r.json();
        if (d && d.lan && d.lan.indexOf('127.0.0.1') === -1) url = d.lan;
      } catch {}
      if (urlEl) urlEl.textContent = url;
      const copyBtn = document.querySelector('[data-copyurl]');
      if (copyBtn) copyBtn.onclick = async () => {
        const ok = await u.copyText(url);
        ui.toast(ok ? '已复制，去微信粘贴发给好友吧' : '复制失败，请手动长按地址复制');
      };
      try {
        window.QRCode.draw(canvas, url, { scale: 6, margin: 3 });
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = 'width:220px;height:220px;border:1px solid #eee;border-radius:12px;background:#fff';
        img.alt = '扫码打开公考工作台';
        if (canvas.parentNode) canvas.parentNode.replaceChild(img, canvas);
      } catch (e) {
        if (urlEl) urlEl.textContent = '二维码生成失败：' + (e.message || e);
      }
    }, 50);
  }

  function tplPicker(date) {
    const s = store.state;
    const body = u.el('<div></div>');
    if (!s.templates.length) body.appendChild(u.el('<div class="empty">还没有计划模板，可在「设置 · 学习计划模板」中新建</div>'));
    s.templates.forEach((t) => {
      const c = u.el(`<div class="tpl-card">
        <div class="th"><div class="n">${u.esc(t.title)}</div><button class="btn mini primary" data-use>导入今日</button></div>
        <ul>${t.items.map((i) => `<li>${u.esc(i)}</li>`).join('')}</ul>
      </div>`);
      c.querySelector('[data-use]').onclick = () => {
        t.items.forEach((i) => store.addPlan(date, i));
        ui.toast(`已导入 ${t.items.length} 项计划`);
        document.querySelectorAll('.mask').forEach((m) => m.remove());
        App.render();
      };
      body.appendChild(c);
    });
    ui.sheet({ title: '从模板导入计划', body, footer: [{ text: '去管理模板', cls: 'ghost', onClick: (c) => (c(), (location.hash = '#/settings')) }] });
  }

  App.pages.home = { render };
})();
