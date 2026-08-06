/* ========== 轻量 SVG 图表（折线 / 面积 / 柱状） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  /**
   * line(container, {labels, series:[{name,color,data}], height, suffix, yMin, yMax, legend, fill})
   */
  function line(container, o) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.classList.add('chart');
    const draw = () => {
      const W = Math.max(240, el.clientWidth || 320);
      const H = o.height || 176;
      const padL = 30,
        padR = 12,
        padT = 12,
        padB = 22;
      const iw = W - padL - padR;
      const ih = H - padT - padB;
      const labels = o.labels || [];
      const series = (o.series || []).filter((s) => s && s.data);
      const nums = [].concat.apply([], series.map((s) => s.data.filter((v) => v != null && isFinite(v))));
      let lo = o.yMin != null ? o.yMin : Math.min.apply(null, nums.length ? nums : [0]);
      let hi = o.yMax != null ? o.yMax : Math.max.apply(null, nums.length ? nums : [1]);
      if (o.yMin == null) lo = Math.min(lo, 0);
      if (hi === lo) hi = lo + 1;
      const pad = (hi - lo) * 0.12;
      hi = o.yMax != null ? o.yMax : hi + pad;
      const n = labels.length;
      const X = (i) => padL + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
      const Y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih;

      let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
      // 网格 + y 轴
      const rows = 4;
      for (let r = 0; r <= rows; r++) {
        const y = padT + (ih * r) / rows;
        const val = hi - ((hi - lo) * r) / rows;
        svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="rgba(201,85,122,.12)" stroke-width="1" ${r === rows ? '' : 'stroke-dasharray="3 4"'}/>`;
        svg += `<text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" font-size="9.5" fill="#B9979F" text-anchor="end">${fmtNum(val)}</text>`;
      }
      // 序列
      series.forEach((s, si) => {
        const pts = [];
        s.data.forEach((v, i) => {
          if (v == null || !isFinite(v)) return;
          pts.push([X(i), Y(v)]);
        });
        if (!pts.length) return;
        const gid = `g${si}_${Math.random().toString(36).slice(2, 6)}`;
        const path = o.smooth === false ? 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') : smoothPath(pts);
        if (o.fill !== false && series.length <= 2) {
          svg += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${s.color}" stop-opacity=".30"/>
            <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>`;
          svg += `<path d="${path} L${pts[pts.length - 1][0].toFixed(1)},${padT + ih} L${pts[0][0].toFixed(1)},${padT + ih} Z" fill="url(#${gid})"/>`;
        }
        svg += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
        pts.forEach((p) => {
          svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${pts.length > 20 ? 2 : 3.2}" fill="#fff" stroke="${s.color}" stroke-width="2"/>`;
        });
      });
      // x 轴标签
      const step = Math.ceil(n / (W > 380 ? 7 : 6));
      labels.forEach((lb, i) => {
        if (n > 8 && i % step !== 0 && i !== n - 1) return;
        svg += `<text x="${X(i).toFixed(1)}" y="${H - 5}" font-size="9.5" fill="#B9979F" text-anchor="middle">${u.esc(lb)}</text>`;
      });
      svg += '</svg>';
      el.innerHTML = svg + '<div class="chart-tip"></div>';

      // 交互提示
      const tip = el.querySelector('.chart-tip');
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const i = u.clamp(Math.round(((x - padL) / (iw || 1)) * (n - 1)), 0, n - 1);
        const lines = series.map((s) => `${s.name}：${s.data[i] == null ? '—' : fmtNum(s.data[i]) + (o.suffix || '')}`).join('<br>');
        tip.innerHTML = `<b>${u.esc(labels[i] || '')}</b><br>${lines}`;
        tip.style.left = X(i) + 'px';
        tip.style.top = padT + 6 + 'px';
        tip.classList.add('on');
      };
      const off = () => tip.classList.remove('on');
      el.ontouchstart = onMove;
      el.ontouchmove = onMove;
      el.ontouchend = off;
      el.onmousemove = onMove;
      el.onmouseleave = off;

      if (o.legend !== false && series.length > 1) {
        el.appendChild(u.el(`<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${u.esc(s.name)}</span>`).join('')}</div>`));
      }
    };
    draw();
    const ro = new ResizeObserver(u.debounce(draw, 180));
    ro.observe(el);
  }

  function fmtNum(v) {
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1000) return Math.round(v / 100) / 10 + 'k';
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 10) / 10);
  }

  /** 简易柱状图 */
  function bars(container, o) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.classList.add('chart');
    const draw = () => {
      const W = Math.max(240, el.clientWidth || 320);
      const H = o.height || 150;
      const padL = 26,
        padR = 8,
        padT = 12,
        padB = 20;
      const iw = W - padL - padR,
        ih = H - padT - padB;
      const data = o.data || [];
      const hi = Math.max(1, Math.max.apply(null, data.map((d) => d.value || 0))) * 1.15;
      const bw = Math.max(6, Math.min(26, (iw / Math.max(1, data.length)) * 0.55));
      let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
      for (let r = 0; r <= 3; r++) {
        const y = padT + (ih * r) / 3;
        svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(201,85,122,.12)" stroke-dasharray="3 4"/>`;
        svg += `<text x="${padL - 5}" y="${y + 3.5}" font-size="9.5" fill="#B9979F" text-anchor="end">${fmtNum(hi - (hi * r) / 3)}</text>`;
      }
      data.forEach((d, i) => {
        const cx = padL + (iw / data.length) * (i + 0.5);
        const h = ((d.value || 0) / hi) * ih;
        const y = padT + ih - h;
        svg += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(2, h).toFixed(1)}" rx="${Math.min(6, bw / 2)}" fill="${d.color || '#E7799A'}" opacity=".9"/>`;
        svg += `<text x="${cx.toFixed(1)}" y="${H - 5}" font-size="9.5" fill="#B9979F" text-anchor="middle">${u.esc(d.label)}</text>`;
        if (d.value) svg += `<text x="${cx.toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="9.5" font-weight="700" fill="${d.color || '#C9557A'}" text-anchor="middle">${fmtNum(d.value)}</text>`;
      });
      svg += '</svg>';
      el.innerHTML = svg;
    };
    draw();
    new ResizeObserver(u.debounce(draw, 180)).observe(el);
  }

  App.charts = { line, bars };
})();
