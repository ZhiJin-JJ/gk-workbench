/* ========== 跨设备同步层（账号 + 远程状态推拉） ========== */
(function () {
  const App = (window.App = window.App || {});

  const API_BASE = './api'; // 同源，Capacitor/浏览器通用
  const SKEY = 'gk_sync_session_v1';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SKEY) || 'null');
    } catch {
      return null;
    }
  }
  function setSession(s) {
    if (s) localStorage.setItem(SKEY, JSON.stringify(s));
    else localStorage.removeItem(SKEY);
  }

  async function req(path, method, body) {
    const s = getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (s && s.token) headers['Authorization'] = 'Bearer ' + s.token;
    const r = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.error || '请求失败');
      err.code = r.status;
      throw err;
    }
    return data;
  }

  const sync = {
    get session() {
      return getSession();
    },
    get loggedIn() {
      return !!getSession();
    },
    get username() {
      const s = getSession();
      return s ? s.username : '';
    },
    async register(username, password) {
      const d = await req('/register', 'POST', { username, password });
      setSession({ token: d.token, username: d.username });
      return d;
    },
    async login(username, password) {
      const d = await req('/login', 'POST', { username, password });
      setSession({ token: d.token, username: d.username });
      return d;
    },
    logout() {
      setSession(null);
    },
    /** 拉取云端状态 */
    async pull() {
      return req('/state', 'GET');
    },
    /** 推送本地状态 */
    async push(state) {
      return req('/state', 'PUT', { state, updatedAt: Date.now() });
    },
  };

  App.sync = sync;
})();
