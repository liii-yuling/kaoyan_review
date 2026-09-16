/*!
 * pdf.js —— PDF 文本提取适配
 * 挂载：KY.pdf
 *
 * 用途：把文字版 PDF 真题整本拖进来，提取文字后交给 KY.papertext 解析成题目。
 *
 * 三条现实约束（很重要，决定了这个功能只能是"半自动"）：
 *   1. PDF 里的文字是带坐标的碎片，不是"行"。两栏排版常常串行，
 *      公式符号（数学卷尤其多）可能提取成乱码，选项字母可能与题干错位。
 *   2. 扫描件/图片型 PDF 没有文字层，提取结果是空的 —— 这时逐页渲染成图片走 OCR。
 *   3. 所以流程必须留"逐题核对"这一步。谁也不能保证提取是对的，
 *      把没核对的内容直接塞进题库，比没有更糟。
 *
 * 实现：懒加载 pdf.js（CDN，多源回退），首次使用需联网。加载失败不影响其它功能。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  var VERSION = '3.11.174';
  var CDN_LIST = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSION + '/legacy/build/pdf.min.js',
    'https://unpkg.com/pdfjs-dist@' + VERSION + '/legacy/build/pdf.min.js',
    'https://fastly.jsdelivr.net/npm/pdfjs-dist@' + VERSION + '/legacy/build/pdf.min.js'
  ];
  var WORKER_LIST = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSION + '/legacy/build/pdf.worker.min.js',
    'https://unpkg.com/pdfjs-dist@' + VERSION + '/legacy/build/pdf.worker.min.js',
    'https://fastly.jsdelivr.net/npm/pdfjs-dist@' + VERSION + '/legacy/build/pdf.worker.min.js'
  ];

  var lib = null;          // 已加载的 pdfjsLib
  var loading = null;      // 加载中的 Promise
  var injected = null;     // 测试注入
  var OCR_TIMEOUT_MS = 90000;   // 单页 OCR 超时：不能让它把整份 PDF 永久挂住

  /** 给 Promise 加超时，避免"某个环节永不返回"导致整条链卡死 */
  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('超时（超过 ' + Math.round(ms / 1000) + ' 秒没有结果）'));
      }, ms);
      p.then(function (v) {
        if (done) return;
        done = true; clearTimeout(t); resolve(v);
      }, function (e) {
        if (done) return;
        done = true; clearTimeout(t); reject(e);
      });
    });
  }

  /* ================================================================== */
  /* 加载 pdf.js                                                         */
  /* ================================================================== */

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

  function loadLib() {
    if (injected) return Promise.resolve(injected);
    if (lib) return Promise.resolve(lib);
    if (loading) return loading;

    loading = (function () {
      var chain = Promise.reject(new Error('start'));
      CDN_LIST.forEach(function (url) {
        chain = chain.catch(function () { return loadScript(url); });
      });
      return chain.then(function () {
        var L = global.pdfjsLib;
        if (!L) throw new Error('pdf.js 已加载但未注册全局对象');
        try {
          L.GlobalWorkerOptions.workerSrc = WORKER_LIST[0];
        } catch (e) { /* 忽略 */ }
        lib = L;
        return lib;
      }).catch(function (e) {
        loading = null;
        throw new Error('无法加载 PDF 解析引擎（首次使用需要联网）。原始错误：' + e.message);
      });
    })();

    return loading;
  }

  /** 测试注入（Node 里没有浏览器/Canvas，只能注入假实现来验证上层逻辑） */
  function setLib(fake) { injected = fake; if (fake) lib = null; }

  /* ================================================================== */
  /* 文本行重组                                                          */
  /* ================================================================== */

  /**
   * 把 pdf.js 的文本碎片拼成文本行。
   * 优先用 item.hasEOL；没有这个字段时按 y 坐标分行（容差 = 字号的一半）。
   * 按 y 分行是 PDF 文本提取的通用做法，能解决"碎片之间该不该换行"的问题。
   */
  function itemsToText(items) {
    if (!items || !items.length) return '';

    var hasEol = items.some(function (it) { return it && typeof it.hasEOL === 'boolean'; });
    if (hasEol) {
      return items.map(function (it) {
        return (it.str || '') + (it.hasEOL ? '\n' : '');
      }).join('');
    }

    // 按 y 分行
    var lines = [];
    items.forEach(function (it) {
      if (!it || !it.str) return;
      var tr = it.transform || [1, 0, 0, 1, 0, 0];
      var x = tr[4] || 0;
      var y = tr[5] || 0;
      var h = Math.abs(tr[3] || 10) || 10;
      var tol = Math.max(1.5, h * 0.5);
      var hit = null;
      for (var i = 0; i < lines.length; i++) {
        if (Math.abs(lines[i].y - y) <= tol) { hit = lines[i]; break; }
      }
      if (!hit) { hit = { y: y, parts: [] }; lines.push(hit); }
      hit.parts.push({ x: x, s: it.str });
    });

    lines.sort(function (a, b) { return b.y - a.y; });   // PDF 的 y 向下增大，所以降序
    return lines.map(function (ln) {
      ln.parts.sort(function (a, b) { return a.x - b.x; });
      return ln.parts.map(function (p) { return p.s; }).join('');
    }).join('\n');
  }

  /* ================================================================== */
  /* 提取                                                                */
  /* ================================================================== */

  /**
   * 提取 PDF 文本。没有文字层的页面自动走 OCR。
   * @param {File|ArrayBuffer} input
   * @param {Object} opts { maxPages, ocr:Boolean, onProgress(pageNo, total, phase), scale }
   * @returns {Promise<Object>} { pages:[{no, text, chars, usedOcr}], text, stats }
   */
  function extract(input, opts) {
    opts = opts || {};
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
    var MAX = opts.maxPages || 200;

    return loadLib().then(function (L) {
      var toBuffer = (input instanceof ArrayBuffer)
        ? Promise.resolve(input)
        : (input.arrayBuffer ? input.arrayBuffer() : U.readFileAsDataURL(input).then(function (d) {
          // 兜底：把 dataURL 转成 ArrayBuffer
          var base64 = String(d).split(',')[1] || '';
          var bin = global.atob ? global.atob(base64) : '';
          var buf = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          return buf.buffer;
        }));

      return toBuffer.then(function (buffer) {
        return L.getDocument({ data: buffer, disableAutoFetch: true, disableStream: false }).promise;
      }).then(function (doc) {
        var total = Math.min(doc.numPages, MAX);
        var pages = [];
        var chain = Promise.resolve();

        for (var i = 1; i <= total; i++) {
          (function (pageNo) {
            chain = chain.then(function () {
              onProgress(pageNo, total, 'text');
              return doc.getPage(pageNo).then(function (page) {
                return page.getTextContent().then(function (tc) {
                  var text = itemsToText(tc.items);
                  if (text.replace(/\s/g, '').length >= 20) {
                    return { no: pageNo, text: text, chars: text.length, usedOcr: false };
                  }
                  /* 文字层为空 → 是扫描件，渲染成图片走 OCR */
                  if (!opts.ocr) {
                    return { no: pageNo, text: '', chars: 0, usedOcr: false, empty: true };
                  }
                  onProgress(pageNo, total, 'ocr');
                  return withTimeout(renderAndOcr(page, pageNo, opts.scale || 2), OCR_TIMEOUT_MS)
                    .then(function (t) {
                      return { no: pageNo, text: t, chars: t.length, usedOcr: true };
                    }).catch(function (e) {
                      return { no: pageNo, text: '', chars: 0, usedOcr: false, error: e.message };
                    });
                });
              });
            }).then(function (res) {
              // 每页结果都要收进来——漏掉这行的话 assemble 会拿到空数组，
              // 表现为"提取了 0 页"（早期版本就栽在这里）
              pages.push(res);
              return res;
            });
          })(i);
        }

        return chain.then(function () {
          var out = assemble(pages);
          out.stats.docPages = doc.numPages;
          out.stats.truncated = doc.numPages > MAX;
          return out;
        });
      });
    });
  }

  /** 把页面渲染到 canvas 再交给 OCR（用于扫描件：没有文字层） */
  function renderAndOcr(page, pageNo, scale) {
    var viewport;
    try {
      viewport = page.getViewport({ scale: scale });
    } catch (e) {
      return Promise.reject(new Error('无法获取页面尺寸：' + e.message));
    }

    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('无法创建画布（浏览器不支持 canvas 2d）'));

    var task = page.render({ canvasContext: ctx, viewport: viewport });
    return task.promise.then(function () {
      return KY.ocr.recognizeTesseract(canvas);
    }).then(function (r) {
      return (r && r.text) || '';
    });
  }

  /**
   * 拼成可交给 KY.papertext 的文本。
   * 页面之间插入 `// ===== 第 N 页 =====` 注释行 —— papertext 会跳过以 // 开头的行，
   * 这样既方便人核对来源，又不会污染题干。
   */
  function assemble(pages) {
    var chunks = [];
    var ocrPages = [];
    var emptyPages = [];
    var errorPages = [];
    var chars = 0;

    pages.forEach(function (p) {
      var body = String(p.text || '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
      chars += body.length;
      if (p.usedOcr) ocrPages.push(p.no);
      if (!body) {
        if (p.error) errorPages.push(p.no + '（' + p.error + '）');
        else if (p.empty) emptyPages.push(p.no);
      }
      chunks.push('// ===== 第 ' + p.no + ' 页' + (p.usedOcr ? '（OCR 识别）' : '') + ' =====');
      chunks.push(body || '// （本页没有提取到文字）');
      chunks.push('');
    });

    return {
      pages: pages,
      text: chunks.join('\n'),
      stats: {
        pages: pages.length,
        chars: chars,
        ocrPages: ocrPages,
        ocrCount: ocrPages.length,
        emptyPages: emptyPages,
        errorPages: errorPages,
        scanned: pages.length > 0 && pages.every(function (p) { return !p.chars; })
      }
    };
  }

  /** 环境自检 */
  function diagnose() {
    return {
      ready: !!(lib || injected),
      online: global.navigator ? global.navigator.onLine : null,
      hasCanvas: (function () {
        try { return !!(document.createElement('canvas').getContext); } catch (e) { return false; }
      })(),
      note: '首次使用需联网下载 PDF 解析引擎（约 1MB），之后浏览器会缓存。'
    };
  }

  KY.pdf = {
    loadLib: loadLib,
    extract: extract,
    assemble: assemble,
    itemsToText: itemsToText,
    diagnose: diagnose,
    setLib: setLib,
    VERSION: VERSION
  };
})(window);
