/*!
 * operator.js —— 运营台口令门（把她挡在管理界面之外）
 * 挂载：KY.operator
 *
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *  为什么需要它：
 *    原先「运营台」在侧栏里对所有人可见，她点一下就能看到题库导入、
 *    发布口令、导出共享题库这些管理功能 —— 那些是"你用的"，不该给她看。
 *
 *  ⚠ 它到底有多强（必须说清楚，别产生虚假的安全感）：
 *    这是**纯前端的门**。网站没有服务端，所有代码都是公开的，
 *    会按 F12 的人可以直接改浏览器里的标志位进来。
 *    它能挡住的是：随手点侧栏、误入管理界面、以及"知道网址就能改口令"。
 *    真要挡住会技术的人，只有两条路：
 *      ① 发布时干脆不把运营台打进 dist（见 tools/release.js 的 --no-console）
 *      ② 上 Cloudflare Access 之类的真访问控制（见 部署说明.md）
 *
 *  口令不存明文，只存 sha256(账号 \0 口令 \0 盐)，和登录口令同一套算法。
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var TOKEN_KEY = 'ky.v1.operatorUnlocked';
  var DEFAULT_SALT = 'kaoyan-operator-v1';
  var DEFAULT_USER = 'operator';

  /* ================================================================== */
  /* 配置                                                                */
  /* ================================================================== */

  function config() {
    var c = KY.sharedOperator || {};
    return {
      enabled: c.enabled !== false && !!c.passHash,
      user: c.user || DEFAULT_USER,
      salt: c.salt || DEFAULT_SALT,
      passHash: c.passHash || '',
      hint: c.hint || ''
    };
  }

  function isRequired() { return config().enabled; }

  /* ================================================================== */
  /* 令牌（解锁状态）                                                     */
  /* ================================================================== */

  function safeStore(name) {
    try { return global[name] || null; } catch (e) { return null; }
  }

  function readToken() {
    var ls = safeStore('localStorage');
    var ss = safeStore('sessionStorage');
    try {
      var v = ls && ls.getItem(TOKEN_KEY);
      if (v) return v;
      v = ss && ss.getItem(TOKEN_KEY);
      return v || '';
    } catch (e) { return ''; }
  }

  function writeToken(value, sessionOnly) {
    var ls = safeStore('localStorage');
    var ss = safeStore('sessionStorage');
    try {
      if (sessionOnly) {
        if (ss) ss.setItem(TOKEN_KEY, value);
        if (ls) ls.removeItem(TOKEN_KEY);
      } else {
        if (ls) ls.setItem(TOKEN_KEY, value);
        if (ss) ss.removeItem(TOKEN_KEY);
      }
    } catch (e) { /* 隐私模式下写不了，那就只在本页有效 */ }
  }

  /* ================================================================== */
  /* 解锁 / 上锁                                                          */
  /* ================================================================== */

  function isUnlocked() {
    var c = config();
    if (!c.enabled) return true;          // 没设口令 = 不锁（便于首次配置）
    var t = readToken();
    return !!t && t === c.passHash;
  }

  /**
   * 尝试解锁。
   * @returns {{ok:Boolean, reason:String}}
   */
  function tryUnlock(user, pass, remember) {
    var c = config();
    if (!c.enabled) return { ok: true, reason: '' };
    if (!pass) return { ok: false, reason: 'empty' };

    var inputHash = KY.auth.hashCred(user || c.user, pass, c.salt);
    if (inputHash !== c.passHash) {
      return { ok: false, reason: 'badpass' };
    }
    writeToken(c.passHash, remember === false);
    if (KY.bus && KY.bus.emit) KY.bus.emit('operator:changed', { unlocked: true });
    return { ok: true, reason: '' };
  }

  /** 退出运营模式：立刻上锁，并把侧栏入口收回去 */
  function lock() {
    writeToken('', false);
    writeToken('', true);
    if (KY.bus && KY.bus.emit) KY.bus.emit('operator:changed', { unlocked: false });
    return true;
  }

  /* ================================================================== */
  /* 口令门界面（渲染进视图的挂载点，不是全屏遮罩）                        */
  /* ================================================================== */

  function renderGate(mount, onUnlock) {
    var esc = KY.util.escapeHtml;
    var c = config();

    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>运营台</h2>' +
      '<p>这里是你（运营者）用的管理界面：发布题库、写每日计划、整理资料库、设访问口令。' +
      '它需要单独的口令才能进入。</p>' +
      '</div>' +
      '<div class="card" style="max-width:460px">' +
      '<div class="card-head"><div><h3 class="card-title">🔒 需要运营口令</h3>' +
      '<p class="card-sub" style="margin:0">这道口令和她的登录密码是分开的，她不知道就打不开。</p>' +
      '</div></div>' +
      '<form id="op-form" autocomplete="off">' +
      '<label class="field"><span class="lbl">运营口令</span>' +
      '<input type="password" id="op-pass" autocomplete="current-password" placeholder="运营口令"></label>' +
      '<label class="checkbox" style="margin-bottom:14px">' +
      '<input type="checkbox" id="op-remember" checked>在这台设备上记住（你自己电脑上勾上）</label>' +
      '<div id="op-msg" class="gate-msg"></div>' +
      '<button class="btn btn-primary" type="submit" id="op-submit" style="width:100%">进入运营台</button>' +
      '</form>' +
      (c.hint ? '<div class="gate-hint">' + esc(c.hint) + '</div>' : '') +
      '<div class="gate-foot">口令只存在你的浏览器里，不会上传。' +
      '忘了口令？删掉 src/data/operator.shared.js 里的 passHash 重新生成即可。</div>' +
      '</div>';

    var form = mount.querySelector('#op-form');
    var passEl = mount.querySelector('#op-pass');
    var msgEl = mount.querySelector('#op-msg');
    var btn = mount.querySelector('#op-submit');
    if (passEl) setTimeout(function () { passEl.focus(); }, 60);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var remember = mount.querySelector('#op-remember');
      var res = tryUnlock(c.user, passEl ? passEl.value : '', remember ? remember.checked : true);
      if (res.ok) {
        KY.util.toast('已进入运营台', 'success');
        if (typeof onUnlock === 'function') onUnlock();
        return;
      }
      var msg = { empty: '口令不能为空。', badpass: '口令不对。' }[res.reason] || '进不去。';
      if (msgEl) msgEl.textContent = msg;
      if (passEl) { passEl.value = ''; passEl.focus(); }
      if (btn) { btn.disabled = true; setTimeout(function () { btn.disabled = false; }, 900); }
    });
  }

  /* ================================================================== */
  /* 导航入口显隐                                                        */
  /* ================================================================== */

  function syncNav() {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('nav-console');
    if (!el) return;
    var show = isUnlocked();
    el.style.display = show ? '' : 'none';
    /* 锁着的时候连"系统"那一组标题也一起藏掉，别留个空标题引人好奇 */
    var grp = document.getElementById('nav-group-system');
    if (grp) grp.style.display = show ? '' : 'none';
  }

  KY.operator = {
    config: config,
    isRequired: isRequired,
    isUnlocked: isUnlocked,
    tryUnlock: tryUnlock,
    lock: lock,
    renderGate: renderGate,
    syncNav: syncNav,
    hashCred: function (pass, user) {
      var c = config();
      return KY.auth.hashCred(user || c.user, pass, c.salt);
    },
    /** 测试用：清掉解锁状态 */
    _reset: function () { writeToken('', false); writeToken('', true); },
    /**
     * 测试用：直接把状态设成解锁/未解锁。
     * 不校验口令 —— 测试不该依赖具体口令，否则你一改口令测试就红。
     */
    _setUnlocked: function (v) {
      var c = config();
      writeToken(v ? (c.passHash || 'test') : '', false);
      writeToken(v ? (c.passHash || 'test') : '', true);
    }
  };
})(window);
