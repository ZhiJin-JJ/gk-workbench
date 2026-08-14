/* ========== 设置 · 数据备份 · 计划模板 ========== */
(function () {
  const App = (window.App = window.App || {});
  App.pages = App.pages || {};
  const u = App.u,
    ui = App.ui,
    store = App.store,
    media = App.media,
    w = App.w;

  function fileName(ext) {
    const d = new Date();
    return `公考工作台备份_${d.getFullYear()}${u.pad(d.getMonth() + 1)}${u.pad(d.getDate())}_${u.pad(d.getHours())}${u.pad(d.getMinutes())}.${ext}`;
  }

  async function saveBlob(blob, name) {
    // 1) 桌面 / 支持文件系统 API：可自选保存位置
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }] });
        const ws = await h.createWritable();
        await ws.write(blob);
        await ws.close();
        return '已保存到所选位置';
      } catch (e) {
        if (e && e.name === 'AbortError') return '';
      }
    }
    // 2) 手机浏览器：触发下载，文件进入「下载」目录（手机文件管理器可见）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
    return '已导出到手机「下载」目录';
  }

  async function shareBlob(blob, name) {
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '公考工作台备份' });
        return true;
      }
    } catch (e) {}
    return false;
  }

  async function exportData(withMedia) {
    ui.toast('正在打包数据…');
    const data = {
      app: 'gk-workbench',
      version: 1,
      exportedAt: new Date().toISOString(),
      withMedia: !!withMedia,
      state: store.state,
      media: withMedia ? await media.exportAll() : [],
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = fileName('json');
    const msg = await saveBlob(blob, name);
    if (msg) {
      store.state.settings.lastBackup = new Date().toISOString();
      store.save();
      ui.sheet({
        title: '导出成功',
        center: true,
        body: `<div class="small" style="line-height:1.8">文件名：<b>${u.esc(name)}</b><br>大小：约 ${(blob.size / 1024 / 1024).toFixed(2)} MB<br>${u.esc(msg)}<br><span class="muted">可再「分享保存」到微信 / 网盘 / 手机任意文件夹</span></div>`,
        footer: [
          { text: '完成', cls: 'ghost', onClick: (c) => c() },
          {
            text: '分享保存',
            cls: 'primary',
            onClick: async (c) => {
              const ok = await shareBlob(blob, name);
              if (!ok) ui.toast('当前设备不支持系统分享');
              c();
            },
          },
        ],
      });
    }
  }

  function importData() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (!data || !data.state) return ui.toast('文件格式不正确');
        const s = data.state;
        const ok = await ui.confirm({
          title: '导入备份',
          text: `备份时间：${(data.exportedAt || '').slice(0, 16).replace('T', ' ')}\n包含：刷题 ${(s.practice || []).length} 条 / 错题 ${(s.mistakes || []).length} 条 / 复盘 ${(s.reviews || []).length} 条 / 试卷 ${(s.papers || []).length} 套 / 打卡 ${(s.checkins || []).length} 天。\n导入将覆盖当前全部数据，确定继续？`,
          okText: '覆盖导入',
          danger: true,
        });
        if (!ok) return;
        if (data.media && data.media.length) await media.importAll(data.media);
        store.replaceAll(s);
        ui.toast('导入成功');
        App.render();
      } catch (e) {
        ui.toast('导入失败：' + e.message);
      }
    };
    inp.click();
  }

  function tplDialog(existing) {
    const t = existing || { title: '', items: [] };
    const body = u.el(`<div>
      <div class="field"><label>模板名称</label><input class="input" data-t value="${u.esc(t.title)}" placeholder="如 工作日常规计划"></div>
      <div class="field"><label>计划内容（每行一项）</label><textarea class="textarea" data-i style="min-height:150px" placeholder="言语理解 30 题&#10;资料分析 15 题&#10;错题复盘 15 分钟">${u.esc((t.items || []).join('\n'))}</textarea></div>
    </div>`);
    ui.sheet({
      title: existing ? '编辑模板' : '新建计划模板',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存',
          cls: 'primary',
          onClick: (close) => {
            const title = body.querySelector('[data-t]').value.trim();
            const items = body
              .querySelector('[data-i]')
              .value.split('\n')
              .map((x) => x.trim())
              .filter(Boolean);
            if (!title) return ui.toast('请填写模板名称');
            if (!items.length) return ui.toast('请至少填写一项计划');
            if (existing) {
              existing.title = title;
              existing.items = items;
            } else {
              store.state.templates.push({ id: u.uid(), title, items });
            }
            store.save();
            close();
            App.render();
          },
        },
      ],
    });
  }

  function accountCard() {
    const synced = App.sync && App.sync.loggedIn;
    if (synced) {
      return u.el(`<div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>账号与同步</div>
          <span class="tiny muted">已连接</span></div>
        <div class="list-item" style="cursor:default">
          <span class="ic" style="background:linear-gradient(135deg,#7FA9DE,#4E7FC1)">${ui.icon('user', 17)}</span>
          <span class="tt"><span class="a">${u.esc(App.sync.username)}</span><span class="b">数据已自动同步到云端，换设备登录即可恢复</span></span>
        </div>
        <div class="grid2" style="margin-top:10px">
          <button class="btn" data-syncnow>${ui.icon('refresh', 16)}立即同步</button>
          <button class="btn ghost" data-logout>${ui.icon('exit', 16)}退出登录</button>
        </div>
      </div>`);
    }
    return u.el(`<div class="card">
      <div class="sec-head"><div class="sec-title"><i class="dot"></i>账号与同步</div>
        <span class="tiny muted">未登录</span></div>
      <div class="small muted" style="margin-bottom:11px;line-height:1.7">登录后，刷题 / 错题 / 打卡等数据会自动同步到云端，手机与电脑实时一致。账号以「用户名+密码」注册即用。</div>
      <div class="field"><label>用户名</label><input class="input" data-user placeholder="用于登录的账号名"></div>
      <div class="field"><label>密码</label><input class="input" type="password" data-pass placeholder="至少 4 位"></div>
      <div class="grid2" style="margin-top:6px">
        <button class="btn primary" data-login>${ui.icon('login', 16)}登录</button>
        <button class="btn" data-register>${ui.icon('plus', 16)}注册新账号</button>
      </div>
      <div class="tiny muted" data-syncmsg style="margin-top:8px;min-height:16px"></div>
    </div>`);
  }

  async function render(view) {
    const s = store.state;
    const root = u.el(`<div>
      <div class="page-head"><button class="icon-btn" data-back>${ui.icon('left', 18)}</button>
        <div class="grow"><h1>设置</h1><div class="sub">数据备份 · 计划模板 · 考试管理</div></div></div>

      <div data-account></div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>手机扫码打开</div></div>
        <div class="small muted" style="margin-bottom:10px;line-height:1.7">用手机相机或微信扫描下方二维码，即可在手机上打开本工作台。建议打开后「添加到主屏幕」变成 App。</div>
        <div style="text-align:center"><canvas id="qr-canvas" style="width:200px;height:200px;border:1px solid #eee;border-radius:10px;background:#fff"></canvas></div>
        <div class="tiny muted" style="text-align:center;margin-top:8px" id="qr-url">生成中…</div>
        <button class="btn ghost block" data-copyurl style="margin-top:10px">${ui.icon('link', 16)}复制访问地址（发给微信好友）</button>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>数据备份</div>
          <span class="tiny muted">${s.settings.lastBackup ? '上次备份 ' + s.settings.lastBackup.slice(0, 10) : '尚未备份'}</span></div>
        <div class="small muted" style="margin-bottom:11px;line-height:1.7">导出为 JSON 文件保存到手机，换机或清缓存后可一键恢复。完整备份包含错题照片与语音条。</div>
        <div class="grid2">
          <button class="btn primary" data-exp-all>${ui.icon('download', 16)}完整备份</button>
          <button class="btn" data-exp-lite>${ui.icon('save', 16)}仅数据(小)</button>
        </div>
        <button class="btn ghost block" data-imp style="margin-top:10px">${ui.icon('upload', 16)}从备份文件恢复</button>
        <div class="divider"></div>
        <div class="tiny muted" data-usage>正在统计存储占用…</div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>学习计划模板</div>
          <button class="sec-more" data-newtpl>${ui.icon('plus', 14)}新建</button></div>
        <div data-tpls></div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>考试倒计时管理</div>
          <button class="sec-more" data-newexam>${ui.icon('plus', 14)}添加</button></div>
        <div data-exams></div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>偏好</div></div>
        <label class="list-item" style="cursor:pointer">
          <span class="ic" style="background:linear-gradient(135deg,#5FBBA3,#2F9C82)">${ui.icon('clock', 17)}</span>
          <span class="tt"><span class="a">刷题自动计入打卡时长</span><span class="b">记录刷题时默认勾选「计入当日学习时长」</span></span>
          <input type="checkbox" data-auto ${s.settings.autoCheckin ? 'checked' : ''} style="width:20px;height:20px;accent-color:#E0658F">
        </label>
        <div class="list-item" style="cursor:default">
          <span class="ic" style="background:linear-gradient(135deg,#8E7FE0,#6A4EC1)">${ui.icon('mic', 17)}</span>
          <span class="tt"><span class="a">语音转文字</span><span class="b">本地离线 Whisper 识别（首次需下载模型约 60MB，之后走缓存）</span></span>
        </div>
        <div class="list-item" data-clear style="cursor:pointer">
          <span class="ic" style="background:linear-gradient(135deg,#F09A9A,#E06B6B)">${ui.icon('trash', 17)}</span>
          <span class="tt"><span class="a" style="color:#D65A5A">清空全部数据</span><span class="b">删除所有记录与媒体，操作不可恢复</span></span>
          ${ui.icon('right', 16)}
        </div>
      </div>

      <div class="card">
        <div class="sec-head"><div class="sec-title"><i class="dot"></i>使用小贴士</div></div>
        <div class="small muted" style="line-height:1.9">
          · 数据全部保存在手机本地浏览器中，不联网、不上传；建议每周做一次完整备份。<br>
          · 录音与拍照需在 <b>HTTPS</b> 或 <b>localhost</b> 环境下授权使用。<br>
          · 语音转文字使用本地离线 Whisper 模型（无需联网识别，结果直接填入知识点）；首次使用会下载约数十 MB 模型，请保持网络畅通。<br>
          · 添加到手机主屏后，可像 App 一样全屏使用。
        </div>
      </div>
    </div>`);

    root.querySelector('[data-back]').onclick = () => history.back();
    root.querySelector('[data-exp-all]').onclick = () => exportData(true);
    root.querySelector('[data-exp-lite]').onclick = () => exportData(false);
    root.querySelector('[data-imp]').onclick = importData;
    root.querySelector('[data-newtpl]').onclick = () => tplDialog(null);
    root.querySelector('[data-newexam]').onclick = () => w.examDialog(null, App.render);
    root.querySelector('[data-auto]').onchange = (e) => {
      s.settings.autoCheckin = e.target.checked;
      store.save();
      ui.toast('已更新');
    };
    root.querySelector('[data-clear]').onclick = async () => {
      if (
        await ui.confirm({
          title: '清空全部数据',
          text: '所有刷题、错题、复盘、打卡、试卷与媒体文件都将被删除，且无法恢复。建议先导出备份。',
          okText: '仍要清空',
          danger: true,
        })
      ) {
        await media.clear();
        store.reset();
        ui.toast('已清空');
        location.hash = '#/home';
      }
    };

    const tplBox = root.querySelector('[data-tpls]');
    if (!s.templates.length) tplBox.appendChild(u.el('<div class="empty">还没有模板，点击右上角新建</div>'));
    s.templates.forEach((t) => {
      const c = u.el(`<div class="tpl-card">
        <div class="th"><div class="n">${u.esc(t.title)}</div>
          <button class="icon-btn plain" data-e>${ui.icon('edit', 16)}</button>
          <button class="icon-btn plain" data-d>${ui.icon('trash', 16)}</button></div>
        <ul>${t.items.map((i) => `<li>${u.esc(i)}</li>`).join('')}</ul>
        <button class="btn mini primary" data-use style="margin-top:8px">导入今日计划</button>
      </div>`);
      c.querySelector('[data-e]').onclick = () => tplDialog(t);
      c.querySelector('[data-d]').onclick = async () => {
        if (await ui.confirm({ title: '删除模板', text: '确定删除该计划模板？', danger: true })) {
          s.templates = s.templates.filter((x) => x.id !== t.id);
          store.save();
          App.render();
        }
      };
      c.querySelector('[data-use]').onclick = () => {
        t.items.forEach((i) => store.addPlan(u.today(), i));
        ui.toast('已导入今日计划');
      };
      tplBox.appendChild(c);
    });

    const exBox = root.querySelector('[data-exams]');
    if (!s.exams.length) exBox.appendChild(u.el('<div class="empty">还没有考试，点击右上角添加</div>'));
    s.exams
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .forEach((e) => {
        const c = store.EXAM_COLORS[e.colorIndex || 0];
        const it = u.el(`<div class="list-item">
        <span class="ic" style="background:linear-gradient(135deg,${c[0]},${c[1]})">${ui.icon('flame', 17)}</span>
        <span class="tt"><span class="a">${u.esc(e.name)}</span><span class="b">${u.esc(e.type)} · ${u.fmtDate(e.date, 'mdw')} · 还有 ${u.diffDays(u.today(), e.date)} 天</span></span>
        <button class="icon-btn plain" data-e>${ui.icon('edit', 16)}</button>
        <button class="icon-btn plain" data-d>${ui.icon('trash', 16)}</button>
      </div>`);
        it.querySelector('[data-e]').onclick = () => w.examDialog(e, App.render);
        it.querySelector('[data-d]').onclick = async () => {
          if (await ui.confirm({ title: '删除考试', text: '确定删除该倒计时？', danger: true })) {
            store.delExam(e.id);
            App.render();
          }
        };
        exBox.appendChild(it);
      });

    const accBox = root.querySelector('[data-account]');
    accBox.appendChild(accountCard());
    const acc = accBox.firstElementChild;
    const msg = acc.querySelector('[data-syncmsg]');
    const setMsg = (t, ok) => {
      if (msg) {
        msg.textContent = t;
        msg.style.color = ok === false ? '#D65A5A' : ok === true ? '#2F9C82' : '';
      }
    };
    if (App.sync && App.sync.loggedIn) {
      acc.querySelector('[data-syncnow]').onclick = async () => {
        try {
          await store.pullFromCloud();
          setMsg('已从云端拉取最新数据', true);
          App.render();
        } catch (e) {
          setMsg('同步失败：' + (e.message || e), false);
        }
      };
      acc.querySelector('[data-logout]').onclick = () => {
        App.sync.logout();
        ui.toast('已退出登录');
        App.render();
      };
    } else {
      const doAuth = async (mode) => {
        const username = acc.querySelector('[data-user]').value.trim();
        const password = acc.querySelector('[data-pass]').value;
        if (username.length < 2) return setMsg('用户名至少 2 个字符', false);
        if (password.length < 4) return setMsg('密码至少 4 位', false);
        try {
          setMsg('处理中…');
          if (mode === 'register') await App.sync.register(username, password);
          else await App.sync.login(username, password);
          // 登录成功：拉取云端状态（新设备以云端为准）
          await store.pullFromCloud();
          ui.toast('登录成功，已同步云端数据');
          App.render();
        } catch (e) {
          setMsg((mode === 'register' ? '注册失败：' : '登录失败：') + (e.message || e), false);
        }
      };
      acc.querySelector('[data-login]').onclick = () => doAuth('login');
      acc.querySelector('[data-register]').onclick = () => doAuth('register');
    }

    // 生成访问二维码
    (async () => {
      const canvas = root.querySelector('#qr-canvas');
      const urlEl = root.querySelector('#qr-url');
      if (!canvas || !window.QRCode) return;
      const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      const publicUrl = ((window.APP_CONFIG && window.APP_CONFIG.publicUrl) || '').trim();

      let url = '';
      if (native) {
        // APK 是离线安装包，没有本地服务器，只能用已配置的公网地址
        url = publicUrl;
      } else {
        url = location.origin;
        try {
          const r = await fetch('./api/lan');
          const d = await r.json();
          if (d && d.lan && d.lan.indexOf('127.0.0.1') === -1) url = d.lan;
        } catch {}
        // 有公网地址时优先用它（跨网络也能扫），否则用局域网地址（需同 WiFi）
        if (publicUrl) url = publicUrl;
      }

      if (!url) {
        // 离线 APK 且未配置地址：不生成无效二维码，给出说明
        canvas.remove();
        urlEl.innerHTML =
          '本应用为离线安装包，没有可分享的网络地址。<br>如需在手机浏览器打开，请先部署网页版，并在 <b>js/config.js</b> 的 <code>publicUrl</code> 填写其地址。';
        const copyBtn0 = root.querySelector('[data-copyurl]');
        if (copyBtn0) copyBtn0.remove();
        return;
      }

      urlEl.textContent = url;
      const copyBtn = root.querySelector('[data-copyurl]');
      if (copyBtn) copyBtn.onclick = async () => {
        const ok = await u.copyText(url);
        ui.toast(ok ? '已复制，去微信粘贴发给好友吧' : '复制失败，请手动长按地址复制');
      };
      try {
        window.QRCode.draw(canvas, url, { scale: 5, margin: 3 });
        // 转成 img 以便手机长按保存/识别
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = 'width:200px;height:200px;border:1px solid #eee;border-radius:10px;background:#fff';
        img.alt = '扫码打开公考工作台';
        canvas.parentNode.replaceChild(img, canvas);
      } catch (e) {
        urlEl.textContent = '二维码生成失败：' + (e.message || e);
      }
    })();

    view.innerHTML = '';
    view.appendChild(root);

    media.usage().then((x) => {
      const local = new Blob([JSON.stringify(s)]).size;
      const el = root.querySelector('[data-usage]');
      if (el)
        el.textContent = `本地数据 ${(local / 1024).toFixed(1)} KB · 媒体文件 ${x.count} 个（${(x.bytes / 1024 / 1024).toFixed(2)} MB） · 刷题 ${s.practice.length} 条 / 错题 ${s.mistakes.length} 条 / 复盘 ${s.reviews.length} 条 / 试卷 ${s.papers.length} 套`;
    });
  }

  App.pages.settings = { render, exportData };
})();
