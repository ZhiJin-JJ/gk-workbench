/* ========== 复合组件：语音条 / 录音 / 图片 / 各类记录弹窗 ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u,
    ui = App.ui,
    store = App.store,
    media = App.media;

  /* ---------------- 语音条（微信风格） ---------------- */
  function voiceBar(a, onDel) {
    const dur = Math.max(1, Math.round(a.dur || 1));
    const w = u.clamp(96 + dur * 4, 96, 230);
    const waves = new Array(14)
      .fill(0)
      .map((_, i) => `<i style="height:${6 + ((i * 5) % 13)}px;animation-delay:${(i % 7) * 0.08}s"></i>`)
      .join('');
    const row = u.el(`<div class="voice-row">
      ${a.id ? `<div class="voice-bar" style="width:${w}px">
        <span class="vb-play">${ui.icon('play', 18)}</span>
        <span class="waves">${waves}</span>
        <span class="vb-dur">${dur}"</span>
      </div>` : ''}
      ${a.text ? `<button class="icon-btn plain" data-t title="语音转文字">${ui.icon('text', 17)}</button>` : ''}
      ${onDel ? `<button class="icon-btn plain" data-d>${ui.icon('trash', 17)}</button>` : ''}
      ${a.text ? `<div class="voice-text">${u.esc(a.text)}</div>` : ''}
    </div>`);

    const bar = row.querySelector('.voice-bar');
    let audio = null;
    if (bar) {
      bar.onclick = async () => {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
          bar.classList.remove('playing');
          bar.querySelector('.vb-play').innerHTML = ui.icon('play', 18);
          return;
        }
        const url = await media.url(a.id);
        if (!url) return ui.toast('语音文件已丢失');
        audio = new Audio(url);
        audio.play().catch(() => ui.toast('播放失败'));
        bar.classList.add('playing');
        bar.querySelector('.vb-play').innerHTML = ui.icon('pause', 18);
        audio.onended = () => {
          bar.classList.remove('playing');
          bar.querySelector('.vb-play').innerHTML = ui.icon('play', 18);
        };
      };
    }
    const tBtn = row.querySelector('[data-t]');
    if (tBtn) {
      const tx = row.querySelector('.voice-text');
      tBtn.onclick = () => tx.classList.toggle('hide');
    }
    const dBtn = row.querySelector('[data-d]');
    if (dBtn) dBtn.onclick = () => onDel(a, row);
    return row;
  }

  /* ---------------- 录音弹窗（语音条 + 语音转文字） ---------------- */
  function recordDialog() {
    return new Promise((resolve) => {
      if (!media.recordSupported) {
        ui.toast('当前环境不支持录音（需 HTTPS 或 localhost）');
        return resolve(null);
      }
      const barsHtml = new Array(28).fill('<i></i>').join('');
      const body = u.el(`<div class="rec-wrap">
        <div class="rec-mic" data-mic>${ui.icon('mic', 38)}</div>
        <div class="rec-time" data-time>00:00</div>
        <div class="rec-live" data-live>${barsHtml}</div>
        <div class="small muted" data-hint>点击话筒开始录音，结束后自动保存语音条</div>
        <div class="rec-asr" data-asr><span class="im">${media.speech.supported ? '语音转文字结果将显示在这里…' : 'APK 内仅保存语音条；自动转文字请用手机浏览器打开本页'}</span></div>
      </div>`);

      let rec = null,
        sr = null,
        timer = 0,
        state = 'idle',
        forceWeb = false,
        finalText = '',
        interim = '';

      const micEl = body.querySelector('[data-mic]');
      const timeEl = body.querySelector('[data-time]');
      const liveEl = body.querySelector('[data-live]');
      const asrEl = body.querySelector('[data-asr]');
      const hintEl = body.querySelector('[data-hint]');
      const liveBars = liveEl.querySelectorAll('i');

      const paint = () => {
        asrEl.innerHTML = finalText || interim ? u.esc(finalText) + (interim ? `<span class="im">${u.esc(interim)}</span>` : '') : '<span class="im">语音转文字结果将显示在这里…</span>';
      };

      const start = async () => {
        try {
          rec = media.createRecorder();
          rec.onTick = (sec, levels) => {
            timeEl.textContent = u.clock(sec);
            liveBars.forEach((b, i) => (b.style.height = (levels[levels.length - liveBars.length + i] || 5) + 'px'));
          };
          // 原生环境：录音由 createRecorder 内部的原生录音器处理（仅录音，不转文字）
          if (media.speech.native && !forceWeb) {
            rec.onError = (msg) => ui.toast('录音：' + msg);
          }
          await rec.start();
          state = 'rec';
          micEl.classList.add('on');
          hintEl.textContent = media.speech.native && !forceWeb ? '正在录音…再次点击话筒结束（APK 内不自动转文字）' : '正在录音…再次点击话筒结束';
          // 浏览器环境：用 webkitSpeechRecognition 边录边识别
          if (!media.speech.native && media.speech.supported) {
            sr = media.speech.create((f, i) => {
              finalText = f;
              interim = i;
              paint();
            });
            try {
              sr.start();
            } catch (e) {}
          }
        } catch (e) {
          ui.toast('无法开始录音：' + (e.message || e.name));
        }
      };

      const finish = async (close) => {
        if (state !== 'rec') {
          close();
          return resolve(null);
        }
        state = 'done';
        micEl.classList.remove('on');
        try {
          sr && sr.stop();
        } catch (e) {}
        const r = await rec.stop();
        clearInterval(timer);
        close();
        const text = (finalText + interim).trim();
        // 原生平环境：语音条必有音频 id；浏览器：有音频或文字皆可
        if (!r || (!r.id && !text)) {
          ui.toast(media.speech.native ? '录音未生成，请重试' : '本次未识别到文字');
          return resolve(null);
        }
        resolve({ id: r.id, dur: r.dur, text });
      };

      const dlg = ui.sheet({
        title: '语音输入',
        body,
        maskClose: false,
        footer: [
          {
            text: '取消',
            cls: 'ghost',
            onClick: (c) => {
              try {
                sr && sr.abort && sr.abort();
              } catch (e) {}
              rec && rec.cancel();
              c();
              resolve(null);
            },
          },
          { text: '完成', cls: 'primary', icon: 'check', onClick: (c) => finish(c) },
        ],
      });

      micEl.onclick = () => {
        if (state === 'idle') start();
        else if (state === 'rec') finish(dlg.close);
      };
      // 自动开始：原生环境需用户手势触发权限弹窗，故不自动开始；浏览器保留自动开始
      if (!media.speech.native) setTimeout(start, 220);
    });
  }

  /* ---------------- 图片条 ---------------- */
  function photoStrip(ids, onChange) {
    const box = u.el('<div class="photo-grid"></div>');
    const render = () => {
      box.innerHTML = '';
      ids.forEach((id) => {
        const item = u.el(`<div class="photo-item"><img class="photo-thumb" alt="图片"><button class="del">${ui.icon('x', 12)}</button></div>`);
        media.url(id).then((url) => (item.querySelector('img').src = url));
        item.querySelector('img').onclick = () => ui.viewImage(id);
        item.querySelector('.del').onclick = async () => {
          ids.splice(ids.indexOf(id), 1);
          await media.del(id);
          render();
          onChange && onChange(ids);
        };
        box.appendChild(item);
      });
      const add = u.el(`<button class="photo-add">${ui.icon('camera', 20)}拍照/选图</button>`);
      add.onclick = async () => {
        const got = await media.pickPhotos(false);
        got.forEach((g) => ids.push(g));
        render();
        onChange && onChange(ids);
      };
      box.appendChild(add);
    };
    render();
    return box;
  }

  /* ---------------- 媒体编辑块（拍照 + 语音条 + 转文字 + 文本） ---------------- */
  /** value: {photos:[], audios:[{id,dur,text}]} */
  function mediaBlock(value, opt) {
    opt = opt || {};
    value.photos = value.photos || [];
    value.audios = value.audios || [];
    const wrap = u.el(`<div>
      <label style="display:block;font-size:12.5px;font-weight:800;color:var(--ink-2);margin-bottom:6px">${u.esc(opt.label || '图片 / 语音')}</label>
      <div data-photos></div>
      <div data-audios style="margin-top:9px"></div>
      <button class="btn mini ghost" data-rec style="margin-top:9px">${ui.icon('mic', 15)}按住说话·录语音条</button>
    </div>`);
    wrap.querySelector('[data-photos]').appendChild(photoStrip(value.photos));
    const abox = wrap.querySelector('[data-audios]');
    const renderAudios = () => {
      abox.innerHTML = '';
      value.audios.forEach((a) => {
        abox.appendChild(
          voiceBar(a, async (aa, row) => {
            value.audios.splice(value.audios.indexOf(aa), 1);
            await media.del(aa.id);
            row.remove();
          })
        );
      });
    };
    renderAudios();
    wrap.querySelector('[data-rec]').onclick = async () => {
      const r = await recordDialog();
      if (!r) return;
      value.audios.push(r);
      renderAudios();
      if (r.text && opt.onText) opt.onText(r.text);
      ui.toast(r.text ? '语音条已保存，已识别文字' : '语音条已保存');
    };
    return wrap;
  }

  /* ---------------- 板块选择 chips ---------------- */
  function moduleChips(selected, onPick) {
    const box = u.el('<div class="chips"></div>');
    store.MODULES.forEach((m) => {
      const c = u.el(`<button class="chip ${m.id === selected ? 'on' : ''}" data-id="${m.id}">${m.name}</button>`);
      c.onclick = () => {
        selected = m.id;
        box.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.dataset.id === m.id));
        onPick && onPick(m.id);
      };
      box.appendChild(c);
    });
    return box;
  }

  function dateInput(v) {
    return `<input type="date" class="input" value="${v || u.today()}">`;
  }

  /* ---------------- 记录本次刷题（白色弹窗） ---------------- */
  function practiceDialog(moduleId, onDone) {
    let mid = moduleId || store.MODULES[0].id;
    const m = store.module(mid);
    const body = u.el(`<div>
      <div class="field"><label>所属板块</label><div data-mods></div></div>
      <div class="field"><label>日期</label>${dateInput(u.today())}</div>
      <div class="grid2">
        <div class="field"><label>做题数目</label><input type="number" inputmode="numeric" class="input" data-count placeholder="如 30"></div>
        <div class="field"><label>正确数目</label><input type="number" inputmode="numeric" class="input" data-correct placeholder="如 24"></div>
      </div>
      <div class="field"><label>本次做题时间（分钟）</label>
        <input type="number" inputmode="numeric" class="input" data-min placeholder="如 35">
        <div class="chips" style="margin-top:8px">
          ${[10, 15, 20, 30, 45, 60, 90, 120].map((v) => `<button class="chip" data-q="${v}">${v}分</button>`).join('')}
        </div>
      </div>
      <div class="card tight" style="margin:0 0 12px;background:#FFF6F9;box-shadow:none;border:1px solid rgba(201,85,122,.12)">
        <div class="spread"><span class="small strong">本次正确率</span><span class="strong" data-acc style="font-size:20px;color:var(--rose-deep)">—</span></div>
      </div>
      <div class="field"><label>备注（可选）</label><textarea class="textarea" data-note style="min-height:56px" placeholder="例如：细节理解题错得多，速度偏慢"></textarea></div>
      <label class="row small" style="gap:8px;margin-bottom:2px">
        <input type="checkbox" data-ck ${store.state.settings.autoCheckin ? 'checked' : ''} style="width:17px;height:17px;accent-color:#E0658F">
        <span class="muted">同时计入当日打卡学习时长</span>
      </label>
    </div>`);

    body.querySelector('[data-mods]').appendChild(moduleChips(mid, (id) => (mid = id)));
    const $ = (s) => body.querySelector(s);
    const upd = () => {
      const c = u.num($('[data-count]').value),
        k = u.num($('[data-correct]').value);
      $('[data-acc]').textContent = c ? u.pct(k, c) + '%' : '—';
      if (c) $('[data-acc]').style.color = u.accColor(u.pct(k, c));
    };
    $('[data-count]').oninput = upd;
    $('[data-correct]').oninput = upd;
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => ($('[data-min]').value = b.dataset.q)));

    ui.sheet({
      title: '记录本次刷题',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存记录',
          cls: 'primary',
          icon: 'check',
          onClick: (close) => {
            const count = u.num($('[data-count]').value);
            const correct = u.num($('[data-correct]').value);
            const minutes = u.num($('[data-min]').value);
            const date = $('input[type=date]').value || u.today();
            if (!count) return ui.toast('请填写做题数目');
            if (correct > count) return ui.toast('正确数不能大于做题数');
            store.addPractice({ moduleId: mid, date, count, correct, minutes, note: $('[data-note]').value.trim() });
            if ($('[data-ck]').checked && minutes > 0) store.addStudyHours(date, Math.round((minutes / 60) * 100) / 100);
            ui.toast('已记录：' + store.module(mid).name + ' ' + count + ' 题');
            close();
            onDone && onDone();
          },
        },
      ],
    });
    setTimeout(() => body.querySelector('[data-count]').focus(), 300);
  }

  /* ---------------- 错题弹窗 ---------------- */
  function mistakeDialog(existing, onDone) {
    const e = existing || {};
    let mid = e.moduleId || store.MODULES[0].id;
    const val = { photos: (e.photos || []).slice(), audios: (e.audios || []).slice() };

    const body = u.el(`<div>
      <div class="field"><label>所属板块</label><div data-mods></div></div>
      <div class="field"><label>日期</label>${dateInput(e.date || u.today())}</div>
      <div class="field"><label>题目 / 错题描述</label><textarea class="textarea" data-title placeholder="题干、题号或简要描述">${u.esc(e.title || '')}</textarea></div>
      <div class="grid2">
        <div class="field"><label>我的答案</label><input class="input" data-mine value="${u.esc(e.mine || '')}" placeholder="如 B"></div>
        <div class="field"><label>正确答案</label><input class="input" data-ans value="${u.esc(e.answer || '')}" placeholder="如 D"></div>
      </div>
      <div class="field"><label>知识点 / 错因分析</label><textarea class="textarea" data-know placeholder="考点、易错点、正确思路">${u.esc(e.knowledge || '')}</textarea></div>
      <div class="field" data-media></div>
    </div>`);

    body.querySelector('[data-mods]').appendChild(moduleChips(mid, (id) => (mid = id)));
    const know = body.querySelector('[data-know]');
    body.querySelector('[data-media]').appendChild(
      mediaBlock(val, {
        label: '拍照题目 / 语音条（支持语音转文字）',
        onText: (t) => {
          know.value = (know.value ? know.value + '\n' : '') + t;
        },
      })
    );

    ui.sheet({
      title: existing ? '编辑错题' : '添加错题',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存',
          cls: 'primary',
          icon: 'check',
          onClick: (close) => {
            const rec = {
              moduleId: mid,
              date: body.querySelector('input[type=date]').value || u.today(),
              title: body.querySelector('[data-title]').value.trim(),
              mine: body.querySelector('[data-mine]').value.trim(),
              answer: body.querySelector('[data-ans]').value.trim(),
              knowledge: know.value.trim(),
              photos: val.photos,
              audios: val.audios,
            };
            if (!rec.title && !rec.photos.length && !rec.audios.length) return ui.toast('请至少填写题目或添加图片/语音');
            existing ? store.updMistake(existing.id, rec) : store.addMistake(rec);
            ui.toast('错题已保存');
            close();
            onDone && onDone();
          },
        },
      ],
    });
  }

  /* ---------------- 每日复盘弹窗 ---------------- */
  function reviewDialog(existing, onDone) {
    const e = existing || {};
    let mid = e.moduleId || store.MODULES[0].id;
    const val = { photos: (e.photos || []).slice(), audios: (e.audios || []).slice() };
    const items = (e.items && e.items.length ? e.items : [{ q: '', a: '', k: '' }]).map((x) => Object.assign({}, x));

    const body = u.el(`<div>
      <div class="field"><label>所属板块</label><div data-mods></div></div>
      <div class="field"><label>复盘日期</label>${dateInput(e.date || u.today())}</div>
      <div class="field">
        <label>复盘条目（题目 ~ 答案 ~ 知识点与思考）</label>
        <div data-items></div>
        <button class="btn mini ghost" data-add style="margin-top:8px">${ui.icon('plus', 15)}再加一条</button>
      </div>
      <div class="field"><label>今日总结（可选）</label><textarea class="textarea" data-text placeholder="今天的收获、待改进的地方…">${u.esc(e.text || '')}</textarea></div>
      <div class="field" data-media></div>
    </div>`);

    body.querySelector('[data-mods]').appendChild(moduleChips(mid, (id) => (mid = id)));
    const itemBox = body.querySelector('[data-items]');
    const renderItems = () => {
      itemBox.innerHTML = '';
      items.forEach((it, i) => {
        const row = u.el(`<div class="rv-item">
          <div class="spread" style="margin-bottom:6px">
            <span class="small strong"><span class="idx">${i + 1}</span>第 ${i + 1} 条</span>
            <button class="icon-btn plain" data-del>${ui.icon('trash', 16)}</button>
          </div>
          <input class="input" data-q placeholder="题目" style="margin-bottom:6px" value="${u.esc(it.q)}">
          <input class="input" data-a placeholder="答案" style="margin-bottom:6px" value="${u.esc(it.a)}">
          <textarea class="textarea" data-k placeholder="知识点与思考" style="min-height:58px">${u.esc(it.k)}</textarea>
        </div>`);
        row.querySelector('[data-q]').oninput = (ev) => (it.q = ev.target.value);
        row.querySelector('[data-a]').oninput = (ev) => (it.a = ev.target.value);
        row.querySelector('[data-k]').oninput = (ev) => (it.k = ev.target.value);
        row.querySelector('[data-del]').onclick = () => {
          if (items.length === 1) return ui.toast('至少保留一条');
          items.splice(i, 1);
          renderItems();
        };
        itemBox.appendChild(row);
      });
    };
    renderItems();
    body.querySelector('[data-add]').onclick = () => {
      items.push({ q: '', a: '', k: '' });
      renderItems();
    };

    const textEl = body.querySelector('[data-text]');
    body.querySelector('[data-media]').appendChild(
      mediaBlock(val, {
        label: '拍照 / 语音条（支持语音转文字）',
        onText: (t) => {
          const last = items[items.length - 1];
          if (last && !last.k) last.k = t, renderItems();
          else textEl.value = (textEl.value ? textEl.value + '\n' : '') + t;
        },
      })
    );

    ui.sheet({
      title: existing ? '编辑复盘' : '新增每日复盘',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存复盘',
          cls: 'primary',
          icon: 'check',
          onClick: (close) => {
            const rec = {
              moduleId: mid,
              date: body.querySelector('input[type=date]').value || u.today(),
              items: items.filter((x) => x.q || x.a || x.k),
              text: textEl.value.trim(),
              photos: val.photos,
              audios: val.audios,
            };
            if (!rec.items.length && !rec.text && !rec.photos.length && !rec.audios.length) return ui.toast('请填写至少一条内容');
            existing ? store.updReview(existing.id, rec) : store.addReview(rec);
            ui.toast('复盘已保存');
            close();
            onDone && onDone();
          },
        },
      ],
    });
  }

  /* ---------------- 考试倒计时弹窗 ---------------- */
  function examDialog(existing, onDone) {
    const e = existing || {};
    let type = e.type || '国考';
    let ci = e.colorIndex == null ? 0 : e.colorIndex;
    const body = u.el(`<div>
      <div class="field"><label>考试名称</label><input class="input" data-name value="${u.esc(e.name || '')}" placeholder="如 2027 国家公务员考试"></div>
      <div class="field"><label>考试类型</label><div class="chips" data-types>
        ${store.EXAM_TYPES.map((t) => `<button class="chip ${t === type ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}
      </div></div>
      <div class="field"><label>考试日期</label>${dateInput(e.date || u.addDays(u.today(), 60))}</div>
      <div class="field"><label>卡片颜色</label><div class="row wrap" data-colors>
        ${store.EXAM_COLORS.map((c, i) => `<button data-c="${i}" style="width:32px;height:32px;border-radius:11px;background:linear-gradient(135deg,${c[0]},${c[1]});box-shadow:${i === ci ? '0 0 0 3px rgba(201,85,122,.35)' : '0 3px 8px rgba(0,0,0,.12)'}"></button>`).join('')}
      </div></div>
    </div>`);
    body.querySelectorAll('[data-t]').forEach(
      (b) =>
        (b.onclick = () => {
          type = b.dataset.t;
          body.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b));
        })
    );
    body.querySelectorAll('[data-c]').forEach(
      (b) =>
        (b.onclick = () => {
          ci = +b.dataset.c;
          body.querySelectorAll('[data-c]').forEach((x, i) => (x.style.boxShadow = i === ci ? '0 0 0 3px rgba(201,85,122,.35)' : '0 3px 8px rgba(0,0,0,.12)'));
        })
    );

    ui.sheet({
      title: existing ? '编辑考试' : '添加考试倒计时',
      body,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '保存',
          cls: 'primary',
          onClick: (close) => {
            const name = body.querySelector('[data-name]').value.trim();
            const date = body.querySelector('input[type=date]').value;
            if (!name) return ui.toast('请填写考试名称');
            if (!date) return ui.toast('请选择考试日期');
            const rec = { name, type, date, colorIndex: ci };
            if (existing) Object.assign(existing, rec), store.save();
            else store.addExam(rec);
            close();
            onDone && onDone();
          },
        },
      ],
    });
  }

  /* ---------------- 打卡时长滚轮弹窗 ---------------- */
  function checkinDialog(date, onDone) {
    const cur = store.checkinOn(date);
    const hours = Array.from({ length: 19 }, (_, i) => i);
    const mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const curH = cur ? Math.floor(cur.hours) : 2;
    const curM = cur ? mins.reduce((p, c) => (Math.abs(c - Math.round((cur.hours % 1) * 60)) < Math.abs(p - Math.round((cur.hours % 1) * 60)) ? c : p), 0) : 0;

    let noteEl = null;
    ui.wheelPick({
      title: `${u.fmtDate(date, 'mdw')} 打卡`,
      desc: '滚动选择当天学习时长',
      wheels: [
        { values: hours, value: curH, unit: '小时' },
        { values: mins, value: curM, unit: '分钟', format: (v) => u.pad(v) },
      ],
      extra: `<div class="field" style="margin-top:10px"><label>今日备注（可选）</label><input class="input" data-note placeholder="今天学了什么…" value="${u.esc(cur ? cur.note || '' : '')}"></div>
        ${cur ? '<button class="btn mini ghost block" data-cancel style="margin-top:2px">取消当日打卡</button>' : ''}`,
      onMount: (box, close) => {
        noteEl = box.querySelector('[data-note]');
        const cb = box.querySelector('[data-cancel]');
        if (cb)
          cb.onclick = async () => {
            if (await ui.confirm({ title: '取消打卡', text: '确定要删除该日打卡记录吗？', danger: true })) {
              store.setCheckin(date, 0);
              close();
              ui.toast('已取消打卡');
              onDone && onDone();
            }
          };
      },
      onOk: (vals) => {
        const h = Math.round((vals[0] + vals[1] / 60) * 100) / 100;
        if (h <= 0) return ui.toast('请选择大于 0 的时长');
        store.setCheckin(date, h, noteEl ? noteEl.value.trim() : '');
        ui.toast(`${u.fmtDate(date, 'md')} 打卡 ${u.hm(h)}`);
        onDone && onDone();
      },
    });
  }

  App.w = { voiceBar, recordDialog, photoStrip, mediaBlock, moduleChips, practiceDialog, mistakeDialog, reviewDialog, examDialog, checkinDialog, dateInput };
})();
