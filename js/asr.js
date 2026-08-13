/* ========== 语音转文字（本地离线 Whisper，纯前端，无需 API key / 无需联网识别） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  // 模型：可在 js/config.js 用 window.APP_CONFIG.asrModel 覆盖（默认中文小模型）
  const MODEL =
    ((window.APP_CONFIG && window.APP_CONFIG.asrModel) || '').trim() ||
    'Xenova/whisper-tiny';

  // transformers.js 的 ESM CDN（多源回退）
  const CDNS = [
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2',
    'https://esm.sh/@huggingface/transformers@3.5.2',
    'https://unpkg.com/@huggingface/transformers@3.5.2',
  ];

  // 模型权重镜像列表（按优先级排序，依次尝试）
  const MIRRORS = [
    { host: 'https://hf-mirror.com', label: '国内镜像' },
    { host: 'https://huggingface.co', label: '官方源' },
  ];

  let pipeP = null;
  let progressCb = null;

  async function loadTF() {
    let lastErr = null;
    for (const url of CDNS) {
      try {
        const m = await import(/* @vite-ignore */ url);
        if (m && m.pipeline) return m;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error('识别引擎脚本加载失败，请检查网络后重试');
  }

  /**
   * 检测响应是否为 HTML（说明拿到了错误页面而非模型 JSON）
   */
  async function fetchJSON(url) {
    const r = await fetch(url);
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = (await r.text()).slice(0, 200);
      throw new Error(
        text.startsWith('<') ? '服务器返回了网页而非模型数据（可能镜像不可达或路径错误）' : '非 JSON 响应：' + ct
      );
    }
    return r.json();
  }

  async function loadPipeline(onProgress) {
    if (pipeP) return pipeP;
    pipeP = (async () => {
      const T = await loadTF();
      const { pipeline, env } = T;
      env.allowRemoteModels = true;

      // 按顺序尝试每个镜像，直到能成功下载模型配置
      let lastErr = null;
      for (const mirror of MIRRORS) {
        try {
          // 先探测该镜像是否能返回有效 JSON（避免后面才报晦涩的 "<!DOCTYPE" 错误）
          const probeUrl = mirror.host + '/' + MODEL + '/resolve/main/config.json';
          await fetchJSON(probeUrl);

          // 探测通过，用此镜像加载完整 pipeline
          env.remoteHost = mirror.host;
          progressCb = onProgress || null;
          const transcriber = await pipeline('automatic-speech-recognition', MODEL, {
            device: 'wasm',
            dtype: 'q8',
            progress_callback: (p) => {
              progressCb && progressCb(p);
            },
          });
          return transcriber;
        } catch (e) {
          lastErr = e;
          console.warn('[ASR] 镜像 ' + mirror.label + '(' + mirror.host + ') 不可用:', e.message || e);
          continue;
        }
      }
      // 所有镜像都失败
      throw new Error(
        '所有模型下载源均不可达。\n' +
        '原因：' +
        (lastErr && lastErr.message ? lastErr.message : '网络异常或被拦截') +
        '\n\n建议：\n' +
        '1. 确认手机/电脑可访问外网（不要用公司内网）\n' +
        '2. 切换到「浏览器原生」引擎（设置 → 语音转文字引擎）\n' +
        '3. 或在 WiFi 下重试'
      );
    })();
    try {
      return await pipeP;
    } catch (e) {
      pipeP = null; // 允许下次重试加载
      throw e;
    }
  }

  const asr = {
    engine: 'whisper',
    get loading() {
      return !!pipeP;
    },
    /**
     * 把录音 blob 转写成文字。
     * @param {Blob} blob 录音音频（webm/opus 等浏览器可解码格式）
     * @param {{onProgress?:(p:any)=>void}} opt 进度回调（模型下载时触发）
     * @returns {Promise<string>}
     */
    async transcribe(blob, opt) {
      opt = opt || {};
      const transcriber = await loadPipeline(opt.onProgress);
      const url = URL.createObjectURL(blob);
      try {
        const out = await transcriber(url, {
          chunk_length_s: 30,
          stride_length_s: 5,
          language: 'chinese',
          task: 'transcribe',
          return_timestamps: false,
        });
        return (out && out.text ? out.text : '').trim();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    },
  };

  App.asr = asr;
})();
