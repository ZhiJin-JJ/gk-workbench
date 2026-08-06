/* ========== 工具函数 ========== */
(function () {
  const App = (window.App = window.App || {});

  const pad = (n) => String(n).padStart(2, '0');

  const U = {
    uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
    /** Date -> 'YYYY-MM-DD' */
    key(d) {
      const x = d instanceof Date ? d : new Date(d);
      return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    },
    today() {
      return U.key(new Date());
    },
    /** 'YYYY-MM-DD' -> Date(本地 0 点) */
    parse(k) {
      const [y, m, d] = String(k).split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    },
    addDays(k, n) {
      const d = U.parse(k);
      d.setDate(d.getDate() + n);
      return U.key(d);
    },
    /** 相差天数 b - a */
    diffDays(a, b) {
      return Math.round((U.parse(b) - U.parse(a)) / 86400000);
    },
    weekday(k) {
      return '日一二三四五六'[U.parse(k).getDay()];
    },
    fmtDate(k, style) {
      const d = U.parse(k);
      if (style === 'md') return `${d.getMonth() + 1}月${d.getDate()}日`;
      if (style === 'mdw') return `${d.getMonth() + 1}月${d.getDate()}日 周${U.weekday(k)}`;
      if (style === 'short') return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      return k;
    },
    clock(sec) {
      sec = Math.max(0, Math.round(sec));
      return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
    },
    /** 小时数 -> "2h30m" */
    hm(h) {
      const t = Math.round((Number(h) || 0) * 60);
      const H = Math.floor(t / 60);
      const M = t % 60;
      if (!H) return `${M}分钟`;
      return M ? `${H}小时${M}分` : `${H}小时`;
    },
    num(v, def) {
      const n = Number(v);
      return isFinite(n) ? n : def === undefined ? 0 : def;
    },
    pct(a, b) {
      if (!b) return 0;
      return Math.round((a / b) * 1000) / 10;
    },
    clamp(v, a, b) {
      return Math.min(b, Math.max(a, v));
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    /** 简单模板 -> DOM */
    el(html) {
      const t = document.createElement('template');
      t.innerHTML = String(html).trim();
      return t.content.firstElementChild;
    },
    /** 正确率配色 */
    accColor(p) {
      if (p >= 85) return '#5FBBA3';
      if (p >= 70) return '#7FA9DE';
      if (p >= 55) return '#EFAE6E';
      return '#E7799A';
    },
    /** 近 n 天日期数组 */
    lastDays(n, end) {
      const out = [];
      const e = end || U.today();
      for (let i = n - 1; i >= 0; i--) out.push(U.addDays(e, -i));
      return out;
    },
    /** 近 n 月 'YYYY-MM' */
    lastMonths(n) {
      const out = [];
      const d = new Date();
      d.setDate(1);
      for (let i = n - 1; i >= 0; i--) {
        const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
        out.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`);
      }
      return out;
    },
    monthDays(year, month /* 0-based */) {
      return new Date(year, month + 1, 0).getDate();
    },
    sum(arr, f) {
      return arr.reduce((s, x) => s + (f ? f(x) : x), 0);
    },
    groupBy(arr, f) {
      const m = {};
      arr.forEach((x) => {
        const k = f(x);
        (m[k] = m[k] || []).push(x);
      });
      return m;
    },
    sortDesc(arr, f) {
      return arr.slice().sort((a, b) => (f(b) > f(a) ? 1 : f(b) < f(a) ? -1 : 0));
    },
    debounce(fn, ms) {
      let t;
      return function () {
        clearTimeout(t);
        const a = arguments;
        t = setTimeout(() => fn.apply(this, a), ms || 200);
      };
    },
    pad,
    /** 复制文本到剪贴板，返回 Promise<boolean> */
    async copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    },
  };

  App.u = U;
})();
