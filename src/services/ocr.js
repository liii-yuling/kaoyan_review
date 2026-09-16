/*!
 * ocr.js —— 图片识别适配层
 * 挂载：KY.ocr
 *
 * 三种模式（在「设置 → 图片识别」里切换）：
 *   'off'        关闭：只允许粘贴/输入文字
 *   'tesseract'  浏览器本地识别（默认）：按需从 CDN 加载 tesseract.js，支持中英文
 *   'api'        调用兼容 OpenAI 格式的视觉大模型接口（需要填 endpoint / key / model）
 *
 * 无论哪种模式，识别结果都会先填入可编辑的文本框由用户确认，
 * 因为 OCR 一定有错字，让用户改比让用户重来更省事。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  var CDN_LIST = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
    'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js',
    'https://fastly.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
  ];

  var loaded = false;
  var loading = null;
  var workerCache = null;
  var workerLang = '';

  /** 动态加载脚本，逐个 CDN 重试 */
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = function () { resolve(url); };
      s.onerror = function () { reject(new Error('加载失败：' + url)); };
      document.head.appendChild(s);
    });
  }

  function ensureTesseract() {
    if (loaded && global.Tesseract) return Promise.resolve(global.Tesseract);
    if (loading) return loading;

    loading = (function () {
      var chain = Promise.reject(new Error('start'));
      CDN_LIST.forEach(function (url) {
        chain = chain.catch(function () { return loadScript(url); });
      });
      return chain.then(function () {
        if (!global.Tesseract) throw new Error('tesseract.js 已加载但未注册全局对象');
        loaded = true;
        return global.Tesseract;
      }).catch(function (e) {
        loading = null;
        throw new Error('无法加载本地 OCR 引擎（需要联网首次下载）。你可以在「设置」里改用 API 模式，或直接手动粘贴题目文字。原始错误：' + e.message);
      });
    })();

    return loading;
  }

  /** tesseract 语言包代码转换 */
  function normalizeLang(lang) {
    var s = String(lang || 'chi_sim+eng').replace(/\s/g, '');
    if (!s) s = 'chi_sim+eng';
    return s;
  }

  /**
   * 本地 OCR。
   * @param {File|Blob|String} input 图片文件或 dataURL
   */
  function recognizeTesseract(input, onProgress) {
    var settings = KY.store.getSettings();
    var lang = normalizeLang(settings.ocr.lang);

    return ensureTesseract().then(function (T) {
      // 复用 worker，避免每次都重新加载语言包
      if (workerCache && workerLang === lang) return workerCache;

      var killPrev = workerCache
        ? workerCache.terminate().catch(function () { return null; })
        : Promise.resolve(null);

      return killPrev.then(function () {
        return T.createWorker(lang, 1, {
          logger: function (m) {
            if (typeof onProgress === 'function' && m && m.status === 'recognizing text') {
              onProgress(m.progress || 0, m.status);
            }
          }
        });
      }).then(function (w) {
        workerCache = w;
        workerLang = lang;
        return w;
      });
    }).then(function (worker) {
      return worker.recognize(input);
    }).then(function (res) {
      var text = (res && res.data && res.data.text) ? res.data.text : '';
      var conf = (res && res.data && typeof res.data.confidence === 'number') ? res.data.confidence : null;
      return {
        text: cleanup(text),
        confidence: conf === null ? null : conf / 100,
        engine: 'tesseract'
      };
    });
  }

  /** API OCR（OpenAI 兼容的 vision 接口） */
  function recognizeApi(dataUrl, onProgress) {
    var s = KY.store.getSettings().ocr;
    if (!s.endpoint || !s.apiKey) {
      return Promise.reject(new Error('API 模式需要在「设置」里填写接口地址与 API Key'));
    }
    if (typeof onProgress === 'function') onProgress(0.1, 'requesting');

    var body = {
      model: s.model || 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请把这张考研题目图片中的所有文字完整、准确地转录出来，保持原有的行结构。' +
              '要求：1) 不要翻译；2) 不要解题；3) 保留题号、选项标号（A. B. C. D.）和公式符号；' +
              '4) 只输出转录文本，不要任何额外说明。'
          },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }],
      temperature: 0
    };

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;

    return fetch(s.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + s.apiKey
      },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('接口返回 ' + r.status + '：' + U.truncate(t, 300));
        });
      }
      return r.json();
    }).then(function (j) {
      var content = j && j.choices && j.choices[0] && j.choices[0].message
        ? j.choices[0].message.content : '';
      if (typeof content !== 'string') {
        // 某些实现返回数组
        content = Array.isArray(content)
          ? content.map(function (c) { return c.text || ''; }).join('')
          : String(content || '');
      }
      if (typeof onProgress === 'function') onProgress(1, 'done');
      return { text: cleanup(content), confidence: null, engine: 'api' };
    });
  }

  /** 清理 OCR 常见噪声 */
  function cleanup(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, '')
      .trim();
  }

  /**
   * 统一入口。
   * @param {File|Blob} file
   * @param {Function} onProgress (ratio, status)
   * @returns {Promise<{text, confidence, engine, dataUrl}>}
   */
  function recognize(file, onProgress) {
    var settings = KY.store.getSettings();

    if (settings.ocr.mode === 'off') {
      return Promise.reject(new Error('图片识别已在设置中关闭，请直接粘贴题目文字'));
    }

    var dataUrlPromise = (typeof file === 'string')
      ? Promise.resolve(file)
      : U.readFileAsDataURL(file);

    return dataUrlPromise.then(function (dataUrl) {
      if (settings.ocr.mode === 'api') {
        return recognizeApi(dataUrl, onProgress).then(function (r) {
          r.dataUrl = dataUrl;
          return r;
        });
      }
      return recognizeTesseract(dataUrl, onProgress).then(function (r) {
        r.dataUrl = dataUrl;
        return r;
      });
    }).then(function (r) {
      if (!r.text) {
        r.warning = '识别结果为空。图片可能太模糊、太小，或者主要是手写体。建议手动输入或换一张更清晰的截图。';
      }
      return r;
    });
  }

  /** 环境自检：能否联网、OCR 是否可用 */
  function diagnose() {
    var s = KY.store.getSettings().ocr;
    return {
      mode: s.mode,
      online: global.navigator ? global.navigator.onLine : null,
      tesseractReady: !!(loaded && global.Tesseract),
      lang: normalizeLang(s.lang),
      apiConfigured: !!(s.endpoint && s.apiKey),
      note: s.mode === 'tesseract'
        ? '本地识别首次使用需联网下载语言包（约 15MB），之后浏览器会缓存。'
        : (s.mode === 'api' ? '识别通过你填写的接口完成，图片会上传到该接口。' : '图片识别已关闭。')
    };
  }

  KY.ocr = {
    recognize: recognize,
    recognizeTesseract: recognizeTesseract,
    recognizeApi: recognizeApi,
    diagnose: diagnose,
    cleanup: cleanup
  };
})(window);
