/* ========== 语音转文字（完全离线 Whisper：库/wasm/模型全部同源打包，零外部请求） ========== */
(function () {
  const App = (window.App = window.App || {});
  const u = App.u;

  const MODEL = 'whisper-tiny';

  // 基于当前页面 URL 计算资源绝对路径（兼容 GitHub Pages 子路径 /gk-workbench/ 与本地 /）
  function assetUrl(rel) {
    let p = location.pathname;
    if (!p.endsWith('/')) p = p.substring(0, p.lastIndexOf('/') + 1);
    return location.origin + p + rel;
  }

  const LOCAL_PATH = assetUrl('models/' + MODEL);
  const TF_URL = assetUrl('js/vendor/transformers.js');
  const WASM_DIR = assetUrl('js/vendor/'); // 末尾带斜杠，供 onnxruntime 加载 wasm

  let pipeP = null;
  let tfModule = null;

  async function loadTF() {
    if (tfModule) return tfModule;
    // 从同源 vendor 目录加载 transformer.js（其 wasm 也来自同源，不触发任何 CDN 请求）
    tfModule = await import(/* @vite-ignore */ TF_URL);
    const { env } = tfModule;
    // ★ 完全离线：禁止一切远程下载
    env.allowRemoteModels = false;
    // ★ 显式允许本地模型（3.x 要求必须显式开启）
    env.allowLocalModels = true;
    // 强制单线程（GitHub Pages 默认无 COOP/COEP 跨源隔离头，多线程 wasm 不可用）
    env.backends.onnx.wasm.numThreads = 1;
    // 显式指定 wasm 同源目录
    env.backends.onnx.wasm.wasmPaths = WASM_DIR;
    return tfModule;
  }

  // 检测同源模型是否真正可用（排除 Pages 的 HTML 404 页面）
  async function probeLocal() {
    try {
      const r = await fetch(LOCAL_PATH + '/config.json', { method: 'HEAD' });
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
          '本地模型文件未找到（models/whisper-tiny/）。\n' +
          '可能原因：GitHub Pages 尚未完成部署，请刷新页面重试。'
        );
      }

      const transcriber = await pipeline(
        'automatic-speech-recognition',
        LOCAL_PATH,
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
      throw new Error(
        '语音转文字引擎加载失败。\n' +
        '原因：' +
        (e.message ? e.message.slice(0, 300) : e) +
        '\n\n建议：刷新页面重试（首次需下载模型，约数十 MB）'
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
