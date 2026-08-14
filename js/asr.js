/* ========== 语音转文字（纯浏览器原生方案，无需外部模型/网络） ========== */
(function () {
  const App = (window.App = window.App || {});

  /**
   * 浏览器原生语音识别（Chrome/Edge/部分国产浏览器支持）
   * 使用 Web Speech API 的 SpeechRecognition 接口，
   * 音频由浏览器直接发送到 Google/Microsoft 云端识别，
   * 无需本地加载模型文件。
   */
  function createNativeRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'zh-CN';

    let finalText = '';
    let interimText = '';
    let resolveFn = null;
    let rejectFn = null;
    let timer = null;

    rec.onresult = function (e) {
      interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += t;
        } else {
          interimText += t;
        }
      }
      if (resolveFn) {
        resolveFn({ text: finalText + interimText, interim: true });
      }
    };

    rec.onerror = function (e) {
      if (rejectFn) rejectFn(new Error('识别错误: ' + e.error));
    };

    rec.onend = function () {
      if (timer) clearTimeout(timer);
      if (resolveFn) {
        resolveFn({ text: finalText, interim: false, done: true });
      }
    };

    return {
      start() {
        finalText = '';
        interimText = '';
        rec.start();
      },
      stop() {
        rec.stop();
      },
      onResult(cb) {
        resolveFn = cb;
      },
      onError(cb) {
        rejectFn = cb;
      },
    };
  }

  const native = createNativeRecognizer();

  const asr = {
    engine: native ? 'browser' : 'none',
    get available() {
      return !!native;
    },
    get loading() {
      return false;
    },

    /**
     * 开始实时语音识别。
     * @param {{onResult?:(res:{text:string,interim:boolean,done?:boolean})=>void, onError?:(err:Error)=>void}} opt
     */
    start(opt) {
      opt = opt || {};
      if (!native) {
        if (opt.onError) {
          opt.onError(new Error('当前浏览器不支持语音识别，请使用 Chrome/Edge 浏览器'));
        }
        return;
      }
      native.onResult((res) => {
        if (opt.onResult) opt.onResult(res);
      });
      native.onError((err) => {
        if (opt.onError) opt.onError(err);
      });
      native.start();
    },

    stop() {
      if (native) native.stop();
    },
  };

  App.asr = asr;
})();
