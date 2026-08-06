/* ========== UI 基础：图标 / 弹窗 / 提示 / 滚轮选择器 ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  /* ---------------- 图标 ---------------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M8 7h8M8 11h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 2v5M16 2v5M3 10h18"/>',
    file: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5M9 13h6M9 17h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6.5" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-2.72 1.13V21a2 2 0 1 1-4 0v-.11A1.6 1.6 0 0 0 7.9 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 3 14.6a2 2 0 1 1 0-4h.11A1.6 1.6 0 0 0 4.6 7.9l-.06-.06A2 2 0 1 1 7.37 5l.06.06A1.6 1.6 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 2.6 1.29l.06-.06A2 2 0 1 1 19.46 8.2l-.06.06A1.6 1.6 0 0 0 19.4 11H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.49.99z"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 3v13M7 11l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 20V7M7 12l5-5 5 5M4 3h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    flame: '<path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.7-3 1.5-4 .2 1.5 1 2.4 2 2.4 1.4 0 1.9-1.6 1.5-7.4z"/><path d="M7 13a5 5 0 0 0 10 0"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    trend: '<path d="M3 16l5.5-6 4 4L21 5"/><path d="M15 5h6v6"/>',
    refresh: '<path d="M3.5 12a8.5 8.5 0 0 1 14.6-6M20.5 12a8.5 8.5 0 0 1-14.6 6"/><path d="M18 2v5h-5M6 22v-5h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 18l5-5 4 3.5L16.5 13 20 16.5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    note: '<path d="M5 3h14v18l-7-4-7 4z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    text: '<path d="M5 5h14M5 10h14M5 15h9"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    login: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h10M17 9l3 3-3 3"/>',
    exit: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 12H3M10 12l-3-3M10 12l-3 3"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14v7M14 19h7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  };
  function icon(name, size, cls) {
    const d = P[name] || P.star;
    return `<svg class="${cls || ''}" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, ms) {
    const root = document.getElementById('toast-root');
    const t = u.el(`<div class="toast">${u.esc(msg)}</div>`);
    root.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .25s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 260);
    }, ms || 1700);
  }

  /* ---------------- 白色弹窗 ---------------- */
  /**
   * sheet({title, body:HTMLString|Node, footer:[{text,cls,onClick(close)}], center, onMount(root,close)})
   */
  function sheet(opt) {
    const root = document.getElementById('modal-root');
    const mask = u.el(`<div class="mask ${opt.center ? 'center' : ''}"></div>`);
    const box = u.el(`<div class="sheet ${opt.center ? 'center-box' : ''}">
      ${opt.center ? '' : '<div class="grab"></div>'}
      <div class="sheet-head">
        <div class="sheet-title"><i class="bar"></i>${u.esc(opt.title || '')}</div>
        <button class="icon-btn plain" data-close>${icon('x', 20)}</button>
      </div>
      <div class="sheet-body"></div>
      <div class="sheet-foot"></div>
    </div>`);
    const bodyEl = box.querySelector('.sheet-body');
    if (typeof opt.body === 'string') bodyEl.innerHTML = opt.body;
    else if (opt.body) bodyEl.appendChild(opt.body);

    const footEl = box.querySelector('.sheet-foot');
    const close = () => {
      mask.style.animation = 'fade .16s reverse';
      setTimeout(() => mask.remove(), 140);
      opt.onClose && opt.onClose();
    };
    (opt.footer || []).forEach((f) => {
      const b = u.el(`<button class="btn ${f.cls || ''}">${f.icon ? icon(f.icon, 17) : ''}${u.esc(f.text)}</button>`);
      b.onclick = () => f.onClick && f.onClick(close, box);
      footEl.appendChild(b);
    });
    if (!(opt.footer || []).length) footEl.remove();

    box.querySelector('[data-close]').onclick = close;
    mask.onclick = (e) => {
      if (e.target === mask && opt.maskClose !== false) close();
    };
    mask.appendChild(box);
    root.appendChild(mask);
    opt.onMount && opt.onMount(box, close);
    return { close, box };
  }

  function confirm(opt) {
    return new Promise((res) => {
      sheet({
        title: opt.title || '确认',
        center: true,
        body: `<div class="small muted" style="line-height:1.7;white-space:pre-line">${u.esc(opt.text || '')}</div>`,
        footer: [
          { text: opt.cancelText || '取消', cls: 'ghost', onClick: (c) => (c(), res(false)) },
          { text: opt.okText || '确定', cls: opt.danger ? 'danger' : 'primary', onClick: (c) => (c(), res(true)) },
        ],
        onClose: () => res(false),
      });
    });
  }

  /* ---------------- 图片查看 ---------------- */
  async function viewImage(id) {
    const url = await App.media.url(id);
    const v = u.el(`<div class="viewer"><img src="${url}"></div>`);
    v.onclick = () => v.remove();
    document.body.appendChild(v);
  }

  /* ---------------- 滚轮选择器 ---------------- */
  const ITEM_H = 42;
  /**
   * wheelPick({title, wheels:[{values:[..], value, unit}], onOk(vals)})
   */
  function wheelPick(opt) {
    const wrap = u.el('<div></div>');
    if (opt.desc) wrap.appendChild(u.el(`<div class="small muted center" style="margin-bottom:6px">${u.esc(opt.desc)}</div>`));
    const wheels = u.el('<div class="wheels"></div>');
    wrap.appendChild(wheels);
    if (opt.extra) wrap.appendChild(u.el('<div>' + opt.extra + '</div>'));

    const picks = [];
    opt.wheels.forEach((w, wi) => {
      const col = u.el('<div class="wheel"></div>');
      const spacer = (210 - ITEM_H) / 2;
      col.appendChild(u.el(`<div style="height:${spacer}px"></div>`));
      w.values.forEach((v) => col.appendChild(u.el(`<div class="wi">${u.esc(w.format ? w.format(v) : v)}</div>`)));
      col.appendChild(u.el(`<div style="height:${spacer}px"></div>`));
      wheels.appendChild(col);
      if (w.unit) wheels.appendChild(u.el(`<div class="wheel-unit">${u.esc(w.unit)}</div>`));

      let idx = Math.max(0, w.values.indexOf(w.value));
      picks[wi] = w.values[idx];
      const items = () => col.querySelectorAll('.wi');
      const mark = (i) => {
        items().forEach((el, k) => el.classList.toggle('act', k === i));
      };
      let t;
      col.addEventListener('scroll', () => {
        const i = u.clamp(Math.round(col.scrollTop / ITEM_H), 0, w.values.length - 1);
        mark(i);
        picks[wi] = w.values[i];
        clearTimeout(t);
        t = setTimeout(() => {
          col.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
        }, 120);
        opt.onChange && opt.onChange(picks.slice());
      });
      setTimeout(() => {
        col.scrollTop = idx * ITEM_H;
        mark(idx);
      }, 30);
    });

    return sheet({
      title: opt.title || '选择',
      body: wrap,
      footer: [
        { text: '取消', cls: 'ghost', onClick: (c) => c() },
        {
          text: '确定',
          cls: 'primary',
          onClick: (c) => {
            opt.onOk && opt.onOk(picks.slice());
            c();
          },
        },
      ],
      onMount: opt.onMount,
    });
  }

  App.ui = { icon, toast, sheet, confirm, wheelPick, viewImage };
})();
