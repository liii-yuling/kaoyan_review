/*!
 * qr.js —— 二维码识别（政治视频那种"扫码看课"的二维码）
 * 挂载：KY.qr
 *
 * 为什么需要一个真库：QR 解码（定位图案、纠错、掩膜）没法用几十行代码糊出来，
 * 硬写只会得到"有时能读、有时读出乱码"的假实现。所以和 pdf.js 一样按需从 CDN
 * 懒加载 jsQR —— 不联网就用不了，但绝不会瞎猜内容。
 *
 * 能做什么：
 *   1. 图片文件（截图/拍照）里的二维码 → 链接
 *   2. PDF 里每页的二维码 → 链接（按页渲染成画布再解码）
 *   3. 一页有多个二维码时，逐个解码（找到后涂黑再找）
 *
 * 诚实边界：二维码里**只有链接**，没有"这是第几章"。
 * 章节名只能来自二维码所在页面的文字或人工指定 —— 见 KY.qr.guessChapter。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var VERSION = '1.4.0';
  var CDN_LIST = [
    'https://cdn.jsdelivr.net/npm/jsqr@' + VERSION + '/dist/jsQR.js',
    'https://unpkg.com/jsqr@' + VERSION + '/dist/jsQR.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jsQR/' + VERSION + '/jsQR.min.js'
  ];

  var lib = null;
  var loading = null;
  var injected = null;

  /* ================================================================== */
  /* 懒加载                                                              */
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
        var L = global.jsQR;
        if (typeof L !== 'function') throw new Error('jsQR 已加载但没注册成全局函数');
        lib = L;
        return lib;
      }).catch(function (e) {
        loading = null;   // 允许下次重试（比如先断网后联网）
        throw new Error('无法加载二维码识别引擎（首次使用需要联网）。原始错误：' + e.message);
      });
    })();

    return loading;
  }

  /** 测试注入：传 null 恢复真实加载 */
  function setLib(fake) { injected = fake || null; lib = null; loading = null; }

  /* ================================================================== */
  /* 单张画布解码                                                        */
  /* ================================================================== */

  /**
   * 从 canvas / ImageData 里解出二维码内容。
   * @returns {Promise<Array<String>>} 解到的文本（可能多个，可能为空数组）
   */
  function decodeCanvas(canvas, opts) {
    opts = opts || {};
    var max = opts.max || 8;          // 一页最多找几个，防止死循环
    return loadLib().then(function (jsQR) {
      var w = canvas.width, h = canvas.height;
      if (!w || !h) return [];
      var ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取画布上下文');

      var out = [];
      var seen = Object.create(null);

      for (var round = 0; round < max; round++) {
        var img;
        try {
          img = ctx.getImageData(0, 0, w, h);
        } catch (e) {
          throw new Error('读取画布像素失败（可能是跨域图片污染了画布）：' + e.message);
        }
        var res = null;
        try {
          res = jsQR(img.data, w, h, { inversionAttempts: round === 0 ? 'dontInvert' : 'attemptBoth' });
        } catch (e) {
          res = null;
        }
        if (!res || !res.data) break;
        if (!seen[res.data]) { seen[res.data] = 1; out.push(res.data); }

        // 把这一个二维码涂黑，再找下一个
        var loc = res.location || {};
        var xs = [loc.topLeftCorner, loc.topRightCorner, loc.bottomLeftCorner, loc.bottomRightCorner]
          .filter(Boolean).map(function (p) { return [p.x, p.y]; });
        if (!xs.length) break;
        var minX = Math.min.apply(null, xs.map(function (p) { return p[0]; }));
        var maxX = Math.max.apply(null, xs.map(function (p) { return p[0]; }));
        var minY = Math.min.apply(null, xs.map(function (p) { return p[1]; }));
        var maxY = Math.max.apply(null, xs.map(function (p) { return p[1]; }));
        var pad = 8;
        ctx.fillStyle = '#000';
        ctx.fillRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
      }
      return out;
    });
  }

  /* ================================================================== */
  /* 从图片文件解码                                                      */
  /* ================================================================== */

  function fileToCanvas(file, maxSide) {
    maxSide = maxSide || 1600;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = 1;
        if (img.width > maxSide || img.height > maxSide) {
          scale = Math.min(maxSide / img.width, maxSide / img.height);
        }
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        var ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('无法创建画布')); return; }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('图片打不开（格式不支持或文件损坏）'));
      };
      img.src = url;
    });
  }

  /** 图片文件 → 二维码文本数组 */
  function decodeImageFile(file, opts) {
    return fileToCanvas(file).then(function (c) { return decodeCanvas(c, opts); });
  }

  /* ================================================================== */
  /* 从 PDF 解码（逐页）                                                 */
  /* ================================================================== */

  function renderPageToCanvas(page, scale) {
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
    if (!ctx) return Promise.reject(new Error('无法创建画布'));
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return canvas;
    });
  }

  /**
   * PDF → 每页的二维码。
   * @param input  File / ArrayBuffer / {arrayBuffer()} 
   * @param opts   { scale, maxPages, onProgress(pageNo,total,phase), textOf(pageNo) }
   * @returns {Promise<{pages:Array<{no,urls,context}>, stats:Object}>}
   */
  function decodePdf(input, opts) {
    opts = opts || {};
    var scale = opts.scale || 2.5;     // 二维码对分辨率敏感，2.5 是清晰度和速度的折中
    var pages = [];
    var errors = [];

    return Promise.all([loadLib(), KY.pdf.loadLib()]).then(function (both) {
      var pdfjsLib = both[1];
      var toBuffer = input.arrayBuffer ? input.arrayBuffer() : Promise.resolve(input);
      return toBuffer.then(function (buf) {
        return pdfjsLib.getDocument({ data: buf }).promise;
      }).then(function (doc) {
        var total = doc.numPages;
        if (opts.maxPages && total > opts.maxPages) total = opts.maxPages;
        var chain = Promise.resolve();
        for (var i = 1; i <= total; i++) {
          (function (pageNo) {
            chain = chain.then(function () {
              if (opts.onProgress) opts.onProgress(pageNo, total, 'render');
              return doc.getPage(pageNo).then(function (page) {
                return renderPageToCanvas(page, scale).then(function (canvas) {
                  if (opts.onProgress) opts.onProgress(pageNo, total, 'decode');
                  return decodeCanvas(canvas).then(function (urls) {
                    return { no: pageNo, urls: urls, context: opts.textOf ? (opts.textOf(pageNo) || '') : '' };
                  });
                });
              }).catch(function (e) {
                errors.push('第 ' + pageNo + ' 页：' + e.message);
                return { no: pageNo, urls: [], context: '', error: e.message };
              });
            }).then(function (res) {
              pages.push(res);   // 必须收进来，否则 assemble 拿到空数组
              return res;
            });
          })(i);
        }
        return chain.then(function () {
          return { pages: pages, stats: statsOf(pages, errors, doc.numPages) };
        });
      });
    });
  }

  function statsOf(pages, errors, docPages) {
    var withQr = pages.filter(function (p) { return p.urls && p.urls.length; });
    var total = pages.reduce(function (a, p) { return a + ((p.urls && p.urls.length) || 0); }, 0);
    return {
      docPages: docPages || pages.length,
      pages: pages.length,
      withQr: withQr.length,
      codes: total,
      unique: uniq(pages.reduce(function (a, p) { return a.concat(p.urls || []); }, [])).length,
      errors: errors,
      emptyPages: pages.filter(function (p) { return !p.urls || !p.urls.length; })
        .map(function (p) { return p.no; })
    };
  }

  function uniq(arr) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /* ================================================================== */
  /* 视频链接识别与章节/知识点推断                                        */
  /* ================================================================== */

  var BV_RE = /BV[0-9A-Za-z]{10}/;

  /** 从二维码文本里认出是不是链接，是视频就标出来 */
  function classify(text) {
    var s = String(text || '').trim();
    if (!s) return { url: '', kind: 'unknown', bvid: '', provider: '' };
    var url = '';
    /*
     * 只吃 ASCII 的 URL 合法字符。
     * 早期用的是"排除若干标点"的写法，结果「链接，扫码看课」里的中文
     * 被一起吞进 URL（全角逗号不在排除表里），生成的链接直接打不开。
     */
    var m = s.match(/https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/i);
    if (m) url = m[0].replace(/[.,;:]+$/, '');
    /* 有些二维码里塞的是裸 BV 号 */
    var bv = s.match(BV_RE);
    if (!url && bv) url = 'https://www.bilibili.com/video/' + bv[0];
    if (!url) return { url: '', kind: 'text', bvid: bv ? bv[0] : '', provider: '', raw: s };

    var provider = KY.resources.detectProvider(url);
    var bvid = url.match(BV_RE);
    return {
      url: url,
      kind: (provider === 'B站' || bvid) ? 'video' : 'link',
      bvid: bvid ? bvid[0] : '',
      provider: provider,
      raw: s
    };
  }

  /* 章节标题：第X章 / 第X节 / Chapter N，取最像标题的那一行 */
  var CHAPTER_RE = /(第\s*[0-9一二三四五六七八九十百]+\s*[章节讲部篇]\s*[^\n]{0,40})/;

  /**
   * 从页面文字里猜章节名。
   * 猜不到就返回空字符串 —— 宁可留空让她手动填，也不编一个假的章节名。
   */
  function guessChapter(text) {
    var s = String(text || '');
    if (!s.trim()) return '';
    var m = s.match(CHAPTER_RE);
    if (m) return m[1].replace(/\s+/g, ' ').trim();

    /* 没有"第X章"时，退而求其次：找一行短的、不像题干的当标题 */
    var lines = s.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    for (var i = 0; i < Math.min(lines.length, 6); i++) {
      var l = lines[i];
      if (l.length >= 4 && l.length <= 30 && !/\d+[.、．]/.test(l) && !/^[A-D][.、．]/.test(l)) {
        return l;
      }
    }
    return '';
  }

  KY.qr = {
    VERSION: VERSION,
    CDN_LIST: CDN_LIST,
    loadLib: loadLib,
    setLib: setLib,
    decodeCanvas: decodeCanvas,
    decodeImageFile: decodeImageFile,
    decodePdf: decodePdf,
    fileToCanvas: fileToCanvas,
    classify: classify,
    guessChapter: guessChapter,
    uniq: uniq
  };
})(window);
