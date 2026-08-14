/* ========== 数据存储（localStorage + 订阅） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;
  const KEY = 'gk_workbench_state_v1';

  /** 八大板块 */
  const MODULES = [
    { id: 'yanyu', name: '言语理解', short: '言语', color: '#E7799A', cat: '行测' },
    { id: 'luoji', name: '逻辑推理', short: '逻辑', color: '#A98BD4', cat: '行测' },
    { id: 'shuliang', name: '数量关系', short: '数量', color: '#7FA9DE', cat: '行测' },
    { id: 'ziliao', name: '资料分析', short: '资料', color: '#5FBBA3', cat: '行测' },
    { id: 'zhengzhi', name: '政治理论', short: '政治', color: '#F2957B', cat: '公基' },
    { id: 'changshi', name: '常识判断', short: '常识', color: '#E0B457', cat: '公基' },
    { id: 'zongying', name: '综合应用', short: '综应', color: '#C77BB0', cat: '综应' },
    { id: 'shenlun', name: '申论', short: '申论', color: '#8FBB6B', cat: '申论' },
  ];

  const EXAM_TYPES = ['国考', '省考', '事业编', '选调生', '教师编', '其他'];
  const EXAM_COLORS = [
    ['#F58AAB', '#D5578A'],
    ['#A98BD4', '#7B5FC0'],
    ['#7FA9DE', '#4E7FC1'],
    ['#5FBBA3', '#2F9C82'],
    ['#F2A97B', '#DE7C4C'],
    ['#E0B457', '#C48F27'],
    ['#C77BB0', '#A2568C'],
    ['#8FBB6B', '#6A9A46'],
  ];

  const PAPER_TYPES = {
    行测: { color: '#E7799A', full: 100, sections: ['言语理解', '逻辑推理', '数量关系', '资料分析', '常识判断'] },
    申论: { color: '#8FBB6B', full: 100, sections: ['归纳概括', '综合分析', '提出对策', '应用文写作', '大作文'] },
    综应: { color: '#C77BB0', full: 150, sections: ['辨析题', '案例分析', '材料作文', '公文写作'] },
    公基: { color: '#F2957B', full: 100, sections: ['政治理论', '法律常识', '经济常识', '人文科技', '时政'] },
  };

  const DEFAULT_STATE = {
    version: 1,
    exams: [],
    practice: [], // {id,moduleId,date,count,correct,minutes,note,createdAt}
    plans: [], // {id,date,text,done,doneAt,tag}
    templates: [
      { id: 't1', title: '工作日常规计划', items: ['言语理解 30 题', '资料分析 15 题', '判断推理 25 题', '常识 20 题', '申论素材积累 20 分钟', '错题复盘 15 分钟'] },
      { id: 't2', title: '周末强化计划', items: ['行测套卷 1 套（限时 120 分钟）', '试卷分析 + 错题整理', '申论大作文 1 篇', '综应案例分析 2 题', '本周错题重做'] },
    ],
    reviews: [], // {id,date,moduleId,items:[{q,a,k}],text,photos:[],audios:[],createdAt}
    mistakes: [], // {id,date,moduleId,title,answer,knowledge,text,photos:[],audios:[],mastered,createdAt}
    checkins: [], // {date,hours,note,createdAt}
    papers: [], // {id,name,type,date,score,full,minutes,sections:[],mistakeNote,forgotten,createdAt}
    settings: { autoCheckin: true, lastBackup: '', asrEngine: 'whisper' },
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const s = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), s);
    } catch (e) {
      console.warn('读取本地数据失败', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  const subs = [];
  function save(silent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('本地存储写入失败，可能空间已满：' + e.message);
    }
    if (!silent) subs.forEach((f) => f(state));
    scheduleSync();
  }

  /* ---------- 跨设备同步（本地优先，后台静默） ---------- */
  let syncing = false;
  const scheduleSync = (function () {
    let t;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(() => syncNow().catch(() => {}), 800);
    };
  })();
  async function syncNow() {
    const s = App.sync;
    if (!s || !s.loggedIn || syncing) return;
    syncing = true;
    try {
      await s.push(state);
    } catch (e) {
      if (e.code === 409) {
        // 云端更新：拉取覆盖（此处为简单全量策略）
        try {
          const r = await s.pull();
          if (r && r.state) {
            state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), r.state);
            localStorage.setItem(KEY, JSON.stringify(state));
            subs.forEach((f) => f(state));
          }
        } catch {}
      }
    } finally {
      syncing = false;
    }
  }
  // 登录后首次：拉取云端并合并（云端优先，因新设备多为空）
  async function pullFromCloud() {
    const s = App.sync;
    if (!s || !s.loggedIn) return false;
    try {
      const r = await s.pull();
      if (r && r.state) {
        state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), r.state);
        localStorage.setItem(KEY, JSON.stringify(state));
        subs.forEach((f) => f(state));
        return true;
      }
    } catch (e) {}
    return false;
  }

  const store = {
    MODULES,
    EXAM_TYPES,
    EXAM_COLORS,
    PAPER_TYPES,
    get state() {
      return state;
    },
    subscribe(fn) {
      subs.push(fn);
    },
    save,
    replaceAll(next) {
      state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), next || {});
      save();
    },
    reset() {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      save();
    },
    /** 登录后从云端拉取全量状态 */
    pullFromCloud,
    module(id) {
      return MODULES.find((m) => m.id === id) || { id: id, name: '未分类', short: '其他', color: '#B9979F', cat: '' };
    },

    /* ---------- 刷题 ---------- */
    addPractice(rec) {
      const r = Object.assign({ id: u.uid(), createdAt: Date.now() }, rec);
      state.practice.push(r);
      save();
      return r;
    },
    delPractice(id) {
      state.practice = state.practice.filter((p) => p.id !== id);
      save();
    },
    practiceOn(date, moduleId) {
      return state.practice.filter((p) => p.date === date && (!moduleId || p.moduleId === moduleId));
    },
    statOf(list) {
      const count = u.sum(list, (x) => u.num(x.count));
      const correct = u.sum(list, (x) => u.num(x.correct));
      const minutes = u.sum(list, (x) => u.num(x.minutes));
      return { count, correct, minutes, acc: u.pct(correct, count) };
    },
    rangeStat(fromDate, toDate, moduleId) {
      const list = state.practice.filter((p) => p.date >= fromDate && p.date <= toDate && (!moduleId || p.moduleId === moduleId));
      return store.statOf(list);
    },

    /* ---------- 计划 ---------- */
    plansOn(date) {
      return state.plans.filter((p) => p.date === date);
    },
    addPlan(date, text, tag) {
      const p = { id: u.uid(), date, text, tag: tag || '', done: false, doneAt: 0 };
      state.plans.push(p);
      save();
      return p;
    },
    togglePlan(id) {
      const p = state.plans.find((x) => x.id === id);
      if (p) {
        p.done = !p.done;
        p.doneAt = p.done ? Date.now() : 0;
        save();
      }
    },
    delPlan(id) {
      state.plans = state.plans.filter((p) => p.id !== id);
      save();
    },

    /* ---------- 打卡 ---------- */
    checkinOn(date) {
      return state.checkins.find((c) => c.date === date);
    },
    setCheckin(date, hours, note) {
      let c = store.checkinOn(date);
      if (hours <= 0) {
        state.checkins = state.checkins.filter((x) => x.date !== date);
        save();
        return null;
      }
      if (c) {
        c.hours = hours;
        c.note = note || '';
      } else {
        c = { date, hours, note: note || '', createdAt: Date.now() };
        state.checkins.push(c);
      }
      save();
      return c;
    },
    addStudyHours(date, hours) {
      const c = store.checkinOn(date);
      return store.setCheckin(date, Math.round(((c ? c.hours : 0) + hours) * 100) / 100, c ? c.note : '');
    },
    streak() {
      let n = 0;
      let d = u.today();
      if (!store.checkinOn(d)) d = u.addDays(d, -1);
      while (store.checkinOn(d)) {
        n++;
        d = u.addDays(d, -1);
      }
      return n;
    },

    /* ---------- 错题 / 复盘 ---------- */
    addMistake(m) {
      const r = Object.assign({ id: u.uid(), createdAt: Date.now(), mastered: false }, m);
      state.mistakes.unshift(r);
      save();
      return r;
    },
    updMistake(id, patch) {
      const m = state.mistakes.find((x) => x.id === id);
      if (m) Object.assign(m, patch), save();
      return m;
    },
    delMistake(id) {
      state.mistakes = state.mistakes.filter((m) => m.id !== id);
      save();
    },
    addReview(r) {
      const x = Object.assign({ id: u.uid(), createdAt: Date.now() }, r);
      state.reviews.unshift(x);
      save();
      return x;
    },
    updReview(id, patch) {
      const r = state.reviews.find((x) => x.id === id);
      if (r) Object.assign(r, patch), save();
      return r;
    },
    delReview(id) {
      state.reviews = state.reviews.filter((r) => r.id !== id);
      save();
    },

    /* ---------- 考试 ---------- */
    addExam(e) {
      const x = Object.assign({ id: u.uid() }, e);
      state.exams.push(x);
      save();
      return x;
    },
    delExam(id) {
      state.exams = state.exams.filter((e) => e.id !== id);
      save();
    },

    /* ---------- 试卷 ---------- */
    addPaper(p) {
      const x = Object.assign({ id: u.uid(), createdAt: Date.now() }, p);
      state.papers.push(x);
      save();
      return x;
    },
    updPaper(id, patch) {
      const p = state.papers.find((x) => x.id === id);
      if (p) Object.assign(p, patch), save();
      return p;
    },
    delPaper(id) {
      state.papers = state.papers.filter((p) => p.id !== id);
      save();
    },
  };

  App.store = store;
})();
