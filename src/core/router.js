/*!
 * router.js —— hash 路由
 * 挂载：KY.router
 *
 * 路由形如： #/wrongbook/math1        -> { name:'wrongbook', params:['math1'], query:{} }
 *           #/practice?subject=math1  -> { name:'practice', params:[], query:{subject:'math1'} }
 *
 * 用法：
 *   KY.router.add('wrongbook', function(ctx, mount){ ... });
 *   KY.router.start();
 *   KY.router.go('practice', { query:{ subject:'math1' } });
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var routes = Object.create(null);
  var ctx = { name: '', params: [], query: {}, path: '/' };
  var currentCleanup = null;
  var started = false;
  var notFound = null;

  function parseHash() {
    var raw = global.location.hash || '';
    if (raw.charAt(0) === '#') raw = raw.slice(1);
    if (!raw) raw = '/';
    var qIdx = raw.indexOf('?');
    var pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    var qPart = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
    var segs = pathPart.split('/').filter(function (s) { return s.length > 0; });
    var query = {};
    if (qPart) {
      qPart.split('&').forEach(function (kv) {
        if (!kv) return;
        var i = kv.indexOf('=');
        var k = i >= 0 ? kv.slice(0, i) : kv;
        var v = i >= 0 ? kv.slice(i + 1) : '';
        try { query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
        catch (e) { query[k] = v; }
      });
    }
    return {
      name: segs.length ? segs[0] : 'dashboard',
      params: segs.slice(1),
      query: query,
      path: '/' + segs.join('/')
    };
  }

  function dispatch() {
    var next = parseHash();
    ctx = next;

    // 清理上一个视图
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (e) { console.warn('[router] 清理上一视图出错', e); }
      currentCleanup = null;
    }

    var mountEl = document.getElementById('view');
    if (!mountEl) return;

    /*
     * 关键：换掉 mount 元素本身，而不是只清 innerHTML。
     *
     * 视图里会把事件监听挂在 mount 上（mount.addEventListener('click', ...)）。
     * 如果只清 innerHTML，mount 元素还是同一个，监听器会随着每次切页不断累积——
     * 访问 5 次后再点一下，同一个处理函数会执行 5 遍。
     * 用一个全新的同 id 元素替换它，旧元素连同它身上的监听器一起被回收。
     */
    if (mountEl.parentNode) {
      var fresh = mountEl.cloneNode(false);
      mountEl.parentNode.replaceChild(fresh, mountEl);
      mountEl = fresh;
    }
    mountEl.innerHTML = '';
    mountEl.scrollTop = 0;

    var handler = routes[next.name] || notFound;
    if (!handler) {
      mountEl.innerHTML = '<div class="empty-state"><h2>页面不存在</h2><p>没有找到路由 <code>' +
        KY.util.escapeHtml(next.name) + '</code></p><p><a class="btn" href="#/dashboard">回到总览</a></p></div>';
    } else {
      try {
        currentCleanup = handler(next, mountEl) || null;
      } catch (e) {
        console.error('[router] 视图渲染失败：' + next.name, e);
        mountEl.innerHTML = '<div class="empty-state"><h2>页面渲染出错</h2><pre class="err">' +
          KY.util.escapeHtml(e && e.stack ? e.stack : String(e)) + '</pre>' +
          '<p><a class="btn" href="#/dashboard">回到总览</a></p></div>';
      }
    }

    // 更新导航高亮
    var links = document.querySelectorAll('[data-nav]');
    Array.prototype.forEach.call(links, function (a) {
      var n = a.getAttribute('data-nav');
      a.classList.toggle('active', n === next.name);
    });

    KY.bus.emit('route:after', next);
  }

  var router = {
    add: function (name, handler) {
      routes[name] = handler;
    },
    setNotFound: function (fn) { notFound = fn; },
    start: function () {
      if (started) return;
      started = true;
      global.addEventListener('hashchange', dispatch);
      dispatch();
    },
    /** 当前上下文 */
    current: function () { return ctx; },
    /** 跳转。replace=true 时不新增历史记录 */
    go: function (name, opts) {
      opts = opts || {};
      var path = '/' + name;
      if (opts.params && opts.params.length) path += '/' + opts.params.map(encodeURIComponent).join('/');
      var qs = '';
      if (opts.query) {
        var parts = [];
        Object.keys(opts.query).forEach(function (k) {
          var v = opts.query[k];
          if (v === undefined || v === null || v === '') return;
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
        });
        if (parts.length) qs = '?' + parts.join('&');
      }
      var hash = '#' + path + qs;
      if (opts.replace) {
        global.location.replace(global.location.pathname + global.location.search + hash);
      } else if (global.location.hash === hash) {
        dispatch();
      } else {
        global.location.hash = hash;
      }
    },
    /** 重新渲染当前路由 */
    refresh: function () { dispatch(); }
  };

  KY.router = router;
})(window);
