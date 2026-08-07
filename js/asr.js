/* ========== 语音转文字（本地离线 Whisper，纯前端，无需 API key / 无需联网识别） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  // 模型：可在 js/config.js 用 window.APP_CONFIG.asrModel 覆盖（默认中文多语言量化版）
  const MODEL =
    ((window.APP_CONFIG && window.APP_CONFIG.asrModel) || 'Xenova/whisper-base').trim() ||
    'Xenova/whisper-base';

  // transformers.js 的 ESM CDN（多源回退，提升大陆可达性）
  const CDNS = [
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2',
    'https://esm.sh/@huggingface/transformers@3.5.2',
  ];

  // 模型权重走国内镜像，避免 huggingface.co 在大陆不可达
  const MIRROR = 'https://hf-mirror.com';

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
    throw new Error('识别引擎脚本加载失败：' + (lastErr && lastErr.message ? lastErr.message : lastErr));
  }

  async function loadPipeline(onProgress) {
    if (pipeP) return pipeP;
    pipeP = (async () => {
      const T = await loadTF();
      const { pipeline, env } = T;
      env.allowRemoteModels = true;
      try {
        env.remoteHost = MIRROR;
      } catch (e) {}
      progressCb = onProgress || null;
      const transcriber = await pipeline('automatic-speech-recognition', MODEL, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p) => {
          progressCb && progressCb(p);
        },
      });
      return transcriber;
    })();
    try {
      return await pipeP;
    } catch (e) {
      pipeP = null; // 允许下次重试加载
      throw e;
    }
  }

  const asr = {
    engine: 'whisper', // 'whisper' | 'browser'
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
