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

  const TF_URL = assetUrl('js/vendor/transformers.js?v=4');
  const WASM_DIR = assetUrl('js/vendor/');
  const MODEL_ROOT = assetUrl('models');

  // 在页面顶部显示诊断信息（不依赖 App.toast 是否已加载）
  function showDiag(msg) {
    let el = document.getElementById('asr-diag');
    if (!el) {
      el = document.createElement('div');
      el.id = 'asr-diag';
      el.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:999999;' +
        'background:#c00;color:#fff;padding:12px 16px;' +
        'white-space:pre-wrap;font-size:14px;line-height:1.5;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }

  // ★ 诊断拦截器：捕获任何返回 HTML（404 软页面）的资源请求，直接显示到页面
  function installFetchProbe() {
    if (window.__asrProbeInstalled) return;
    window.__asrProbeInstalled = true;
    const orig = window.fetch.bind(window);
    window.fetch = async function (url, opts) {
      const u = typeof url === 'string' ? url : url && url.url;
      const resp = await orig(url, opts);
      if (!u) return resp;
      const looksLikeAsset =
        /whisper-tiny|transformers\.js|\.wasm|\.onnx|\.bin|\.json|\.txt$/i.test(u);
      const ct = (resp.headers && resp.headers.get('content-type')) || '';
      if (looksLikeAsset && resp.ok && ct.includes('text/html')) {
        const msg = '资源返回 HTML（应为模型/脚本文件）：\n' + u + '\n请把这个 URL 复制给 AI。';
        console.error('[ASR诊断]', msg, { url: u, status: resp.status, ct });
        showDiag(msg);
        if (App.toast) App.toast(msg, 'error', 20000);
      }
      return resp;
    };
  }

  async function clearStaleCaches() {
    try {
      // 旧版 transformers-cache 可能缓存了错误的 HTML 响应，直接废弃
      await caches.delete('transformers-cache');
      await caches.delete('gk-workbench-v2');
    } catch (e) {
      // ignore
    }
  }

  let pipeP = null;
  let tfModule = null;

  async function loadTF() {
    if (tfModule) return tfModule;
    installFetchProbe();
    await clearStaleCaches();

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

    // 使用自定义版本缓存，避免旧版 transformers-cache 里的坏数据反复导致 JSON 解析错误
    env.useBrowserCache = false;
    env.useCustomCache = true;
    env.customCache = await (async () => {
      const cache = await caches.open('transformers-cache-asr-v1');
      const origPut = cache.put.bind(cache);
      cache.put = async (req, resp) => {
        const ct = (resp.headers && resp.headers.get('content-type')) || '';
        if (ct.includes('text/html')) {
          console.warn('[ASR缓存] 拒绝缓存 HTML:', req);
          return;
        }
        return origPut(req, resp);
      };
      return cache;
    })();

    return tfModule;
  }

  async function probeLocal() {
    try {
      const url = MODEL_ROOT + '/' + MODEL_ID + '/config.json';
      const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      if (!r.ok) return false;
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('text/html')) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function validateModelFiles() {
    const files = [
      'config.json',
      'preprocessor_config.json',
      'generation_config.json',
      'tokenizer_config.json',
      'tokenizer.json',
      'vocab.json',
      'merges.txt',
      'onnx/encoder_model_quantized.onnx',
      'onnx/decoder_model_merged_quantized.onnx',
    ];
    const base = MODEL_ROOT + '/' + MODEL_ID + '/';
    const bad = [];
    await Promise.all(
      files.map(async (f) => {
        try {
          const r = await fetch(base + f, { method: 'HEAD', cache: 'no-cache' });
          if (!r.ok) {
            bad.push(`${base + f} → HTTP ${r.status}`);
          } else {
            const ct = r.headers.get('content-type') || '';
            if (ct.includes('text/html')) bad.push(`${base + f} → 返回 HTML`);
          }
        } catch (e) {
          bad.push(`${base + f} → ${e && e.message ? e.message : e}`);
        }
      })
    );
    if (bad.length) {
      throw new Error(
        '以下模型文件无法访问（可能是路径错误或 Service Worker 把页面当成文件返回）：\n' +
        bad.join('\n')
      );
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
          '本地模型入口未找到：' + MODEL_ROOT + '/' + MODEL_ID + '/config.json\n' +
          '可能原因：GitHub Pages 尚未完成部署，请刷新页面重试。'
        );
      }

      // 预检所有必需模型文件，命中缺失文件时给出精确 URL
      await validateModelFiles();

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
