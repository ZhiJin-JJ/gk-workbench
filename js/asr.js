/* ========== 语音转文字（本地离线 Whisper，纯前端，无需 API key / 无需联网识别） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  // 模型名（可在 js/config.js 用 asrModel 覆盖）
  const MODEL =
    ((window.APP_CONFIG && window.APP_CONFIG.asrModel) || '').trim() ||
    'Xenova/whisper-tiny';

  // 同源模型路径（GitHub Pages 直接提供，无需外部下载）
  const LOCAL_PATH = '/models/' + MODEL.replace(/^.*\//, '');

  // transformers.js ESM CDN（多源回退）— 仅加载推理库本身
  const CDNS = [
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2',
    'https://esm.sh/@huggingface/transformers@3.5.2',
    'https://unpkg.com/@huggingface/transformers@3.5.2',
  ];

  let pipeP = null;

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
   * 检测同源模型是否可用（GitHub Pages 已部署 config.json）
   */
  async function probeLocal() {
    try {
      const r = await fetch(LOCAL_PATH + '/config.json', { method: 'HEAD' });
      if (!r.ok) return false;
      // 二次验证：确保不是 HTML 页面（GitHub Pages 404 会返回自定义 HTML）
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('text/html')) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function loadPipeline(onProgress) {
    if (pipeP) return pipeP;
    pipeP = (async () => {
      const T = await loadTF();
      const { pipeline, env } = T;

      // ★ 关键：禁止远程下载，强制纯本地加载
      env.allowRemoteModels = false;

      // 必须检测到同源模型才继续（否则直接报错，不尝试远程）
      const hasLocal = await probeLocal();
      if (!hasLocal) {
        throw new Error(
          '本地模型文件未找到（/models/whisper-tiny/）。' +
          '可能原因：\n' +
          '1. GitHub Pages 尚未完成部署（刚推送后需等待 1-2 分钟）\n' +
          '2. 未开启 GitHub Pages 或未选择 GitHub Actions 部署\n' +
          '请稍后刷新页面重试。'
        );
      }

      // 用绝对路径让 transformers.js 从同源加载全部文件
      const modelId = location.origin + LOCAL_PATH;
      console.log('[ASR] 使用同源模型（纯本地模式）:', modelId);

      const transcriber = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: (p) => {
            onProgress && onProgress(p);
          },
        }
      );
      return transcriber;
    })();
    try {
      return await pipeP;
    } catch (e) {
      pipeP = null;
      throw new Error(
        '语音转文字引擎加载失败。\n' +
        '原因：' +
        (e.message ? e.message.slice(0, 300) : e) +
        '\n\n建议：\n' +
        '1. 刷新页面重试（确认 Pages 已完成部署）\n' +
        '2. 或切换到「浏览器原生」引擎（设置页 → 语音转文字引擎）'
      );
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
     * @param {{onProgress?:(p:any)=>void}} opt 进度回调
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
