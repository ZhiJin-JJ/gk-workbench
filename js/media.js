/* ========== 媒体：图片(IndexedDB) / 录音语音条 / 语音转文字 ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  /* ---------------- IndexedDB ---------------- */
  const DB_NAME = 'gk_workbench_media';
  const STORE = 'media';
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbp;
  }

  function tx(mode) {
    return db().then((d) => d.transaction(STORE, mode).objectStore(STORE));
  }

  const urlCache = {};

  const media = {
    async put(blob, meta) {
      const id = u.uid();
      const st = await tx('readwrite');
      await new Promise((res, rej) => {
        const r = st.put({ id, blob, type: blob.type, meta: meta || {}, createdAt: Date.now() });
        r.onsuccess = res;
        r.onerror = () => rej(r.error);
      });
      return id;
    },
    async get(id) {
      const st = await tx('readonly');
      return new Promise((res, rej) => {
        const r = st.get(id);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
    },
    async url(id) {
      if (urlCache[id]) return urlCache[id];
      const rec = await media.get(id);
      if (!rec) return '';
      const url = URL.createObjectURL(rec.blob);
      urlCache[id] = url;
      return url;
    },
    async del(id) {
      if (urlCache[id]) {
        URL.revokeObjectURL(urlCache[id]);
        delete urlCache[id];
      }
      const st = await tx('readwrite');
      st.delete(id);
    },
    async all() {
      const st = await tx('readonly');
      return new Promise((res, rej) => {
        const r = st.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    },
    async usage() {
      const list = await media.all();
      return { count: list.length, bytes: list.reduce((s, x) => s + (x.blob ? x.blob.size : 0), 0) };
    },
    async exportAll(ids) {
      const list = await media.all();
      const want = ids ? new Set(ids) : null;
      const out = [];
      for (const rec of list) {
        if (want && !want.has(rec.id)) continue;
        out.push({ id: rec.id, type: rec.type, meta: rec.meta, data: await blobToB64(rec.blob) });
      }
      return out;
    },
    async importAll(arr) {
      if (!arr || !arr.length) return 0;
      const st = await tx('readwrite');
      let n = 0;
      for (const it of arr) {
        try {
          st.put({ id: it.id, blob: b64ToBlob(it.data, it.type), type: it.type, meta: it.meta || {}, createdAt: Date.now() });
          n++;
        } catch (e) {}
      }
      return n;
    },
    async clear() {
      const st = await tx('readwrite');
      st.clear();
      Object.keys(urlCache).forEach((k) => {
        URL.revokeObjectURL(urlCache[k]);
        delete urlCache[k];
      });
    },
  };

  function blobToB64(blob) {
    return new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1] || '');
      fr.readAsDataURL(blob);
    });
  }
  function b64ToBlob(b64, type) {
    const bin = atob(b64 || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'application/octet-stream' });
  }

  /* ---------------- 拍照 / 选图 ---------------- */
  function compress(file, max) {
    max = max || 1400;
    return new Promise((res) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob(
          (b) => {
            URL.revokeObjectURL(url);
            res(b || file);
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        res(file);
      };
      img.src = url;
    });
  }

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  /** 打开相机/相册，返回媒体 id 数组 */
  async function pickPhotos(useCamera) {
    // 原生 APK 环境：用 @capacitor/camera 原生相机/相册，自带权限与相机调用，最可靠
    if (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
      try {
        const photo = await window.Capacitor.Plugins.Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: 'DataUrl',
          source: useCamera ? 'CAMERA' : 'PROMPT',
          saveToGallery: true, // 同时存入系统相册
        });
        // Android 上 base64String 有时为空，回退用 dataUrl 解析
        let b64 = photo && photo.base64String;
        if (!b64 && photo && photo.dataUrl) b64 = String(photo.dataUrl).split(',')[1];
        if (!b64) {
          ui.toast('拍照获取图片失败，请重试');
          return [];
        }
        const blob = b64ToBlob(b64, 'image/jpeg');
        const compressed = await compress(blob);
        const id = await media.put(compressed, { kind: 'photo', name: 'camera.jpg' });
        return [id];
      } catch (e) {
        // 用户取消选择或权限被拒：返回空，不抛错
        return [];
      }
    }
    // 浏览器 / 回退：网页 input 方案
    return new Promise((res) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.multiple = !useCamera;
      if (useCamera) inp.capture = 'environment';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = async () => {
        const ids = [];
        for (const f of Array.from(inp.files || [])) {
          const blob = await compress(f);
          ids.push(await media.put(blob, { kind: 'photo', name: f.name }));
        }
        inp.remove();
        res(ids);
      };
      // 取消选择时清理
      window.addEventListener('focus', () => setTimeout(() => { if (inp.parentNode && !inp.files.length) { inp.remove(); res([]); } }, 800), { once: true });
      inp.click();
    });
  }

  /* ---------------- 语音识别 ---------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speech = {
    // 原生环境用 @capacitor-community/speech-recognition 插件（识别逻辑由 createRecorder 内部的 nativeAsrRecorder 接管）
    native: isNative() && !!(window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition),
    supported: isNative()
      ? !!(window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition)
      : !!SR,
    create(onResult, onEnd) {
      if (isNative()) return null; // 原生识别由 createRecorder 内部处理，不重复创建
      if (!SR) return null;
      const r = new SR();
      r.lang = 'zh-CN';
      r.continuous = true;
      r.interimResults = true;
      let finalText = '';
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim += t;
        }
        onResult && onResult(finalText, interim);
      };
      r.onerror = () => {};
      r.onend = () => {
        onEnd && onEnd(finalText);
      };
      return r;
    },
  };

  /* ---------------- 录音器 ---------------- */
  function createRecorder() {
    if (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) {
      return nativeAsrRecorder();
    }
    let mr = null,
      stream = null,
      chunks = [],
      ac = null,
      analyser = null,
      raf = 0,
      startAt = 0;

    const api = {
      levels: new Array(28).fill(4),
      onTick: null, // (seconds, levels)
      async start() {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        let mime = '';
        const cand = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        for (const c of cand) {
          if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
            mime = c;
            break;
          }
        }
        mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        mr.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
        mr.start(200);
        startAt = Date.now();

        try {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          const src = ac.createMediaStreamSource(stream);
          analyser = ac.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          const loop = () => {
            analyser.getByteFrequencyData(buf);
            let s = 0;
            for (let i = 0; i < 40; i++) s += buf[i];
            const lv = u.clamp(Math.round((s / 40 / 255) * 34) + 4, 4, 36);
            api.levels.push(lv);
            api.levels.shift();
            api.onTick && api.onTick((Date.now() - startAt) / 1000, api.levels);
            raf = requestAnimationFrame(loop);
          };
          loop();
        } catch (e) {}
      },
      get seconds() {
        return startAt ? (Date.now() - startAt) / 1000 : 0;
      },
      stop() {
        return new Promise((res) => {
          if (!mr) return res(null);
          const dur = (Date.now() - startAt) / 1000;
          mr.onstop = async () => {
            cleanup();
            const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/webm' });
            if (!blob.size) return res(null);
            const id = await media.put(blob, { kind: 'audio', dur });
            res({ id, dur, size: blob.size });
          };
          try {
            mr.stop();
          } catch (e) {
            cleanup();
            res(null);
          }
        });
      },
      cancel() {
        try {
          mr && mr.state !== 'inactive' && mr.stop();
        } catch (e) {}
        cleanup();
      },
    };

    function cleanup() {
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ac && ac.state !== 'closed') ac.close().catch(() => {});
      stream = null;
      ac = null;
      analyser = null;
    }

    return api;
  }

  /* ---------------- 原生语音识别录音器（安卓麦克风独占，仅识别、不另录音频） ---------------- */
  function nativeAsrRecorder() {
    const P = window.Capacitor.Plugins.SpeechRecognition;
    const api = {
      levels: new Array(28).fill(6),
      onTick: null, // (seconds, levels)
      onResult: null, // (finalText, interim)
      _t0: 0,
      _timer: 0,
      _handle: null,
      _text: '',
      get seconds() {
        return this._t0 ? (Date.now() - this._t0) / 1000 : 0;
      },
      async start() {
        const a = await P.available().catch(() => null);
        if (!a || !a.available) throw new Error('设备不支持语音识别');
        await P.requestPermissions().catch(() => {});
        this._handle = await P.addListener('partialResults', (d) => {
          const m = (d && d.matches) || [];
          if (!m.length) return;
          this._text = m[0];
          if (api.onResult) api.onResult(this._text, '');
          const lv = 10 + Math.round(Math.random() * 16);
          api.levels.push(lv);
          api.levels.shift();
          if (api.onTick) api.onTick(api.seconds, api.levels);
        });
        await P.start({ language: 'zh-CN', partialResults: true, popup: false, maxResults: 1 });
        this._t0 = Date.now();
        this._timer = setInterval(() => {
          const lv = 8 + Math.round(Math.random() * 14);
          api.levels.push(lv);
          api.levels.shift();
          if (api.onTick) api.onTick(api.seconds, api.levels);
        }, 200);
      },
      stop() {
        clearInterval(this._timer);
        return new Promise((res) => {
          const done = () => {
            if (this._handle) {
              try { this._handle.remove(); } catch (e) {}
              this._handle = null;
            }
            res({ id: null, dur: api.seconds, size: 0 });
          };
          P.stop().catch(() => {}).finally(done);
        });
      },
      cancel() {
        clearInterval(this._timer);
        try {
          P.stop().catch(() => {});
          if (this._handle) { this._handle.remove().catch(() => {}); this._handle = null; }
        } catch (e) {}
      },
    };
    return api;
  }

  App.media = Object.assign(media, { pickPhotos, compress, speech, createRecorder, blobToB64, b64ToBlob, recordSupported: isNative() ? true : !!(navigator.mediaDevices && window.MediaRecorder) });
})();
