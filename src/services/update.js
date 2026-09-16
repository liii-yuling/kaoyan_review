/*!
 * update.js —— 新版本检测
 * 挂载：KY.update
 *
 * 解决的实际问题：
 *   "我把新版传上去，对方刷新就能看到"——这句话在浏览器缓存面前是不成立的。
 *   静态资源被缓存后，刷新拿到的可能还是旧文件。
 *   所以这里做三件事：
 *     1. 发布时给所有资源 URL 加上 ?v=<构建号>，让缓存必然失效（见 tools/release.js）
 *     2. 页面启动时用 no-store 拉一次 version.json，和自己这一版比对
 *     3. 发现新版的，在页面顶部挂一条提示，点一下就是强制刷新
 *
 * 设计约束：任何失败都必须静默——离线、file:// 打开、没有 version.json，
 *          都只是"检查不了更新"，绝不能让页面报错或卡住。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var CHECK_TIMEOUT = 8000;
  var LS_KEY = 'ky.v1.lastSeenBuild';

  var state = {
    remoteVersion: '',
    remoteNotes: '',
    remoteBuiltAt: '',
    hasUpdate: false,
    lastCheckedAt: 0,
    lastError: '',
    checking: false
  };

  function localBuild() {
    return KY.BUILD || 'dev';
  }

  function versionUrl() {
    // 加时间戳，绕过一切中间缓存
    return 'version.json?t=' + Date.now();
  }

  /**
   * 拉取服务器上的 version.json。
   * @returns {Promise<Object>} 失败时 reject，调用方负责静默处理
   */
  function fetchRemote() {
    if (typeof fetch !== 'function') return Promise.reject(new Error('当前环境不支持 fetch'));

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CHECK_TIMEOUT) : null;

    return fetch(versionUrl(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (timer) clearTimeout(timer);
      if (!j || !j.version) throw new Error('version.json 缺少 version 字段');
      return j;
    }).catch(function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  /**
   * 检查更新。
   * @param {Object} opts { silent:Boolean } silent 时失败不提示用户
   * @returns {Promise<Object>} state
   */
  function check(opts) {
    opts = opts || {};
    if (state.checking) return Promise.resolve(state);
    state.checking = true;

    return fetchRemote().then(function (remote) {
      state.checking = false;
      state.lastCheckedAt = Date.now();
      state.lastError = '';
      state.remoteVersion = remote.version;
      state.remoteNotes = remote.notes || '';
      state.remoteBuiltAt = remote.builtAt || '';
      state.hasUpdate = remote.version !== localBuild();

      try { KY.store.raw.set('lastSeenBuild', remote.version); } catch (e) { /* 忽略 */ }

      if (state.hasUpdate) showBanner();
      else hideBanner();

      return state;
    }).catch(function (e) {
      state.checking = false;
      state.lastCheckedAt = Date.now();
      state.lastError = e && e.message ? e.message : String(e);
      if (!opts.silent) console.warn('[update] 检查更新失败：' + state.lastError);
      return state;
    });
  }

  /* ---------------- 顶部提示条 ---------------- */

  var BANNER_ID = 'update-banner';

  function showBanner() {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById(BANNER_ID)) {
      updateBannerText();
      return;
    }
    var el = document.createElement('div');
    el.id = BANNER_ID;
    el.className = 'update-banner';
    el.innerHTML =
      '<span class="ub-ico">↑</span>' +
      '<span class="ub-text"></span>' +
      '<button class="btn btn-sm ub-btn" id="ub-reload">立即刷新</button>' +
      '<button class="btn btn-sm btn-ghost" id="ub-later">稍后</button>';
    document.body.appendChild(el);
    updateBannerText();

    var reload = document.getElementById('ub-reload');
    if (reload) {
      reload.addEventListener('click', function () {
        // 强制绕过缓存重新请求
        try {
          var url = global.location.href.replace(/#.*$/, '');
          global.location.replace(url + (url.indexOf('?') >= 0 ? '&' : '?') + '_v=' + Date.now());
        } catch (e) {
          global.location.reload();
        }
      });
    }
    var later = document.getElementById('ub-later');
    if (later) {
      later.addEventListener('click', function () {
        el.style.display = 'none';
      });
    }
  }

  function updateBannerText() {
    var el = document.getElementById(BANNER_ID);
    if (!el) return;
    var t = el.querySelector('.ub-text');
    if (!t) return;
    t.innerHTML = '<b>有新版本可用</b>（当前 ' + esc(localBuild()) + ' → 最新 ' +
      esc(state.remoteVersion) + '）' +
      (state.remoteNotes ? ' · ' + esc(state.remoteNotes) : '') +
      '<span class="ub-hint">你的错题和掌握度都保存在本机浏览器里，刷新不会丢。</span>';
  }

  function hideBanner() {
    if (typeof document === 'undefined') return;
    var el = document.getElementById(BANNER_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function esc(s) {
    return KY.util ? KY.util.escapeHtml(s) : String(s);
  }

  /**
   * 启动自动检查：页面加载完延迟几秒再查，不抢启动资源。
   * 只有通过 http(s) 打开时才查——file:// 下没有 version.json，查了只会报错。
   */
  function autoCheck() {
    try {
      var proto = global.location && global.location.protocol;
      if (proto !== 'http:' && proto !== 'https:') return;
    } catch (e) { return; }

    var delay = 2500;
    if (typeof setTimeout === 'function') {
      setTimeout(function () { check({ silent: true }); }, delay);
    }
  }

  KY.update = {
    check: check,
    autoCheck: autoCheck,
    localBuild: localBuild,
    state: function () { return state; },
    showBanner: showBanner,
    hideBanner: hideBanner
  };
})(window);
