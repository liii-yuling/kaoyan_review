/*!
 * math.js —— 数学公式渲染（LaTeX → 排版好的公式）
 * 挂载：KY.math
 *
 * 为什么现在才加：
 *   题库一开始写的是纯文本公式（∫₀ˣ、x→0⁺ 这种），并且明确规定
 *   "页面不加载 MathJax/KaTeX，禁止 $...$ 语法"。那是当时没有 LaTeX
 *   素材时的取舍。现在要导入的真题素材全是标准 LaTeX
 *   （$\lim_{x\to\infty}\left[\frac{x^2}{...}\right]^x$），
 *   不渲染的话她看到的就是一串反斜杠，所以这里把这个约定改成：
 *   **有 $ 就渲染，没有 $ 的原样显示**——纯文本老题完全不受影响。
 *
 * 引擎：KaTeX 0.18.7（MIT），和 pdf.js / jsQR 一样按需从 CDN 懒加载。
 *   首次用到公式时需要联网；加载失败不影响其它功能，公式退化成原文。
 *
 * 容错：throwOnError 设为 false。这批素材是 OCR 出来的，难免有坏公式；
 *   坏公式会以红色原文显示，而不是让整个页面炸掉 —— 出错了能看见，
 *   比白屏好。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var VERSION = '0.18.7';
  var BASE = [
    'https://cdn.jsdelivr.net/npm/katex@' + VERSION + '/dist/',
    'https://unpkg.com/katex@' + VERSION + '/dist/',
    'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + VERSION + '/'
  ];

  var DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ];

  /* 这些标签里的 $ 是代码/原文，不能当公式渲染 */
  var IGNORED_TAGS = ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'];

  var ready = null;      // 加载完成的 Promise
  var failed = null;     // 上一次失败原因
  var observed = null;   // MutationObserver
  var pending = null;    // 防抖定时器

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

  var cssLoaded = false;
  function loadCss() {
    if (cssLoaded) return;
    cssLoaded = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = BASE[0] + 'katex.min.css';
    l.onerror = function () {
      /* 主 CDN 挂了就退回第二个；CSS 失败不致命，只是排版难看 */
      var l2 = document.createElement('link');
      l2.rel = 'stylesheet';
      l2.href = BASE[1] + 'katex.min.css';
      document.head.appendChild(l2);
    };
    document.head.appendChild(l);
  }

  function tryEach(file) {
    var chain = Promise.reject(new Error('start'));
    BASE.forEach(function (base) {
      chain = chain.catch(function () { return loadScript(base + file); });
    });
    return chain;
  }

  function loadLib() {
    if (global.renderMathInElement && global.katex) return Promise.resolve(global.katex);
    if (ready) return ready;

    ready = (function () {
      loadCss();
      return tryEach('katex.min.js').then(function () {
        if (!global.katex) throw new Error('katex 已加载但没注册全局对象');
        /* auto-render 依赖 katex，必须后加载 */
        return tryEach('contrib/auto-render.min.js');
      }).then(function () {
        if (typeof global.renderMathInElement !== 'function') {
          throw new Error('auto-render 已加载但没注册 renderMathInElement');
        }
        failed = null;
        return global.katex;
      }).catch(function (e) {
        ready = null;        // 允许下次重试（先断网后联网）
        failed = e.message;
        throw new Error('无法加载公式渲染引擎（首次用到公式需要联网）。原始错误：' + e.message);
      });
    })();

    return ready;
  }

  /* ================================================================== */
  /* 渲染                                                                */
  /* ================================================================== */

  /** 快速判断这块内容里有没有公式，避免无谓地遍历整个 DOM */
  function maybeHasMath(root) {
    if (!root) return false;
    var t = root.textContent || '';
    if (!t) return false;
    return t.indexOf('$') >= 0 || t.indexOf('\\(') >= 0 || t.indexOf('\\[') >= 0;
  }

  /**
   * 渲染 root 子树里的 LaTeX。
   * 没有公式、或引擎没加载好时，静默返回 —— 绝不因为公式问题影响页面。
   */
  function render(root) {
    var el = root || document.getElementById('view');
    if (!el || !el.isConnected) return Promise.resolve(false);
    if (!maybeHasMath(el)) return Promise.resolve(false);
    if (!isEnabled()) return Promise.resolve(false);

    return loadLib().then(function () {
      try {
        global.renderMathInElement(el, {
          delimiters: DELIMITERS,
          ignoredTags: IGNORED_TAGS,
          throwOnError: false,
          errorColor: '#c0392b',
          strict: false,          // OCR 素材里有各种不规范的 LaTeX，放宽
          trust: false,
          maxSize: 50
        });
        return true;
      } catch (e) {
        /* 单个公式坏掉不应该让整页挂掉 */
        if (global.console && console.warn) console.warn('[math] 渲染失败', e);
        return false;
      }
    }).catch(function (e) {
      if (global.console && console.warn) console.warn('[math]', e.message);
      return false;
    });
  }

  /* ================================================================== */
  /* 自动渲染：路由切换 + 页面内部重绘                                    */
  /* ================================================================== */

  /*
   * 只在 route:after 上渲染是不够的：很多视图会在原地重绘
   * （解析预览、切标签页、展开列表），那些新内容不会触发路由事件。
   * 所以再加一个挂在 #view 上的 MutationObserver。
   * KaTeX 自己渲染时也会改 DOM，用 .katex 判断避免自己触发自己。
   */
  function scheduleRender() {
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () {
      pending = null;
      render(document.getElementById('view'));
    }, 60);
  }

  function startObserver() {
    if (observed || typeof MutationObserver === 'undefined') return;
    var view = document.getElementById('view');
    if (!view) return;

    observed = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var t = records[i].target;
        /* KaTeX 生成的内容不看 */
        if (t && t.closest && t.closest('.katex')) continue;
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && n.classList && n.classList.contains('katex')) continue;
          scheduleRender();
          return;
        }
      }
    });
    observed.observe(view, { childList: true, subtree: true });
  }

  /* ================================================================== */
  /* 开关（设置页 / 离线时可以关掉）                                      */
  /* ================================================================== */

  var enabled = true;

  function isEnabled() { return enabled; }
  function setEnabled(v) { enabled = !!v; }

  function status() {
    return {
      version: VERSION,
      loaded: !!(global.katex && global.renderMathInElement),
      enabled: enabled,
      error: failed,
      cdn: BASE[0]
    };
  }

  KY.math = {
    VERSION: VERSION,
    BASE: BASE,
    DELIMITERS: DELIMITERS,
    loadLib: loadLib,
    render: render,
    renderAll: function () { return render(document.getElementById('view')); },
    maybeHasMath: maybeHasMath,
    scheduleRender: scheduleRender,
    startObserver: startObserver,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    status: status,
    /** 测试注入用：喂一个假的 katex + renderMathInElement */
    _setLib: function (fakeKatex, fakeRender) {
      global.katex = fakeKatex;
      global.renderMathInElement = fakeRender;
      ready = fakeKatex ? Promise.resolve(fakeKatex) : null;
      failed = null;
    },
    _reset: function () {
      ready = null; failed = null; cssLoaded = false;
      delete global.katex;
      delete global.renderMathInElement;
    }
  };
})(window);
