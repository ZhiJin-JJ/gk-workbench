/* ========== 语音转文字（完全离线 Whisper：库/wasm/模型全部同源打包） ========== */
(function () {
  const App = (window.App = window.App || {});

  // 模型 ID 必须包含完整命名空间：Xenova/whisper-tiny
  const MODEL_ID = 'Xenova/whisper-tiny';

  // 基于当前页面 URL 计算资源绝对路径（兼容 GitHub Pages 子路径 /gk-workbench/ 与本地 /）
  function assetUrl(rel) {
    let p = location.pathname;
    if (!p.endsWith('/')) p = p.substring(0, p.lastIndexOf('/') + 1);
    return location.origin + p + rel;
  }

  const TF_URL = assetUrl('js/vendor/transformers.js?v=3');
  const WASM_DIR = assetUrl('js/vendor/');
  const MODEL_ROOT = assetUrl('models');

  // ★ 诊断拦截器：捕获任何返回 HTML（404 软页面）的模型文件请求，直接显示到页面
  function installFetchProbe() {
    if (window.__asrProbeInstalled) return;
    window.__asrProbeInstalled = true;
    const orig = window.fetch.bind(window);
    window.fetch = async function (url, opts) {
      const resp = await orig(url, opts);
      const u = typeof url === 'string' ? url : url && url.url;
      if (
        u &&
        u.includes('whisper-tiny') &&
        !u.endsWith('.onnx') &&
        !u.endsWith('.wasm') &&
        !u.endsWith('.bin')
      ) {
        const ct = resp.headers.get('content-type') || '';
        if (resp.ok && ct.includes('text/html')) {
          const msg = '模型文件返回 HTML（应为 JSON/文本）：\n' + u;
          console.error('[ASR诊断]', msg);
          if (App.toast) App.toast(msg, 'error', 15000);
        }
      }
      return resp;
    };
  }

  let pipeP = null;
  let tfModule = null;

  async function loadTF() {
    if (tfModule) return tfModule;
    installFetchProbe();
    // 从同源 vendor 目录加载 transformers.js
    tfModule = await import(/* @vite-ignore */ TF_URL);
    const { env } = tfModule;

    // ★ 完全离线配置 ★
    env.allowRemoteModels = false;      // 禁止从 HuggingFace CDN 下载
    env.allowLocalModels = true;        // 显式允许加载本地模型
    env.localModelPath = MODEL_ROOT;    // 模型从此目录加载（同源）
    // 单线程：GitHub Pages 无 COOP/COEP，SharedArrayBuffer 不可用
    env.backends.onnx.wasm.numThreads = 1;
    // wasm 从同源 vendor 目录加载
    env.backends.onnx.wasm.wasmPaths = WASM_DIR;

    return tfModule;
  }

  async function probeLocal() {
    try {
      const url = MODEL_ROOT + '/' + MODEL_ID + '/config.json';
      const r = await fetch(url, { method: 'HEAD' });
      if (!r.ok) return false;
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
      const { pipeline } = T;

      const hasLocal = await probeLocal();
      if (!hasLocal) {
        throw new Error(
          '本地模型文件未找到（models/Xenova/whisper-tiny/config.json）。\n' +
          '可能原因：GitHub Pages 尚未完成部署，请刷新页面重试。'
        );
      }

      // 使用标准模型 ID（含命名空间），localModelPath 会自动定位到同源目录
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        MODEL_ID,
        {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: (p) => onProgress && onProgress(p),
        }
      );
      return transcriber;
    })();
    try {
      return await pipeP;
    } catch (e) {
      pipeP = null;
      // 完整显示原始报错，便于定位
      throw new Error(
        '语音转文字引擎加载失败。\n原因：\n' + (e && e.message ? e.message : e) +
        '\n\n建议：刷新页面重试（首次需下载模型约 90MB，之后走缓存）'
      );
    }
  }

  const asr = {
    engine: 'whisper',
    get loading() {
      return !!pipeP;
    },
    /**
     * 把录音 blob 转写成文字（纯本地推理，不依赖任何云端服务）。
     * @param {Blob} blob 录音音频
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
