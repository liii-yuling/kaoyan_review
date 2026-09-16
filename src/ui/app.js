/*!
 * app.js —— 应用启动与全局装配
 */
(function (global) {
  'use strict';
  var KY = global.KY;

  /* ------------------------------------------------------------------ */
  /* 全局错误兜底                                                         */
  /*                                                                     */
  /* 使用者不是开发者，白屏对他毫无信息量。所以任何致命异常都要         */
  /* 直接画到页面上，并告诉他怎么办。                                    */
  /* ------------------------------------------------------------------ */

  function showFatal(title, detail) {
    var view = document.getElementById('view');
    if (!view) return;
    // 只在视图为空时接管，避免覆盖已经正常渲染出来的内容
    if (view.innerHTML && view.innerHTML.trim().length > 200) return;
    view.innerHTML =
      '<div class="card" style="border-color:#f4c9c9;background:#fffafa">' +
      '<h3 class="card-title" style="color:#c53030">⚠ ' + KY.util.escapeHtml(title) + '</h3>' +
      '<p style="font-size:13.5px;line-height:1.8;color:var(--text-2)">' +
      '页面在启动时遇到问题，功能暂时不可用。请把下面的信息截图反馈给开发者。</p>' +
      '<pre style="background:#f6f7fb;padding:12px;border-radius:6px;font-size:12px;overflow:auto;max-height:260px;color:#c53030">' +
      KY.util.escapeHtml(detail) + '</pre>' +
      '<p style="font-size:13px;color:var(--text-2)">可以先尝试：<b>按 Ctrl+F5 强制刷新</b>；' +
      '若仍然不行，说明是代码问题，不是你的操作问题。</p>' +
      '</div>';
  }

  var booted = false;

  global.addEventListener('error', function (e) {
    var msg = (e.error && e.error.stack) ? e.error.stack : (e.message || '未知错误');
    console.error('[全局错误]', e.error || e.message);
    if (!booted) showFatal('启动失败', msg);
  });
  global.addEventListener('unhandledrejection', function (e) {
    console.error('[未处理的 Promise 拒绝]', e.reason);
  });

  /* ------------------------------------------------------------------ */
  /* 侧栏状态                                                            */
  /* ------------------------------------------------------------------ */

  function refreshNavBadges() {
    var el = document.getElementById('nav-wrong-count');
    if (el) {
      var items = KY.store.getWrongbook();
      var pending = items.filter(function (w) { return !w.mastered; }).length;
      el.textContent = String(pending);
    }

    // 今日计划未完成项 + 待收下的"布置错题"
    var planEl = document.getElementById('nav-plan-badge');
    if (planEl) {
      var n = 0;
      try {
        var today = KY.plan.resolveToday();
        if (today.plan) {
          var s = KY.plan.planStats(today.plan);
          n = s.total - s.done;
        }
        n += KY.push.pending().length;
      } catch (e) { n = 0; }
      planEl.textContent = String(n);
      planEl.style.display = n > 0 ? '' : 'none';
    }

    var userEl = document.getElementById('topbar-user');
    if (userEl) {
      var p = KY.store.getProfile();
      userEl.textContent = p.name ? ('👤 ' + p.name) : '未设置姓名';
    }
  }

  function refreshStorageStatus() {
    var el = document.getElementById('storage-status');
    if (!el) return;
    if (KY.store.persistent()) {
      el.innerHTML = '<span class="dot dot-ok"></span>本地存储正常（数据保存在本机浏览器）';
    } else {
      el.innerHTML = '<span class="dot dot-warn"></span><b style="color:#e8a33d">临时存储模式</b>：刷新后数据会丢失，请到「设置」导出备份';
      el.title = KY.store.backendError();
    }
  }

  function refreshBankStatus() {
    var el = document.getElementById('bank-status');
    if (!el) return;
    var s = KY.bank.stats();
    var missing = KY.SUBJECTS.filter(function (sub) { return KY.bank.countBySubject(sub) === 0; });
    if (missing.length) {
      el.innerHTML = '题库 ' + s.total + ' 题 · <b style="color:#e8a33d">' + missing.length + ' 科缺失</b>';
      el.title = '未加载到题库文件：' + missing.join('、');
    } else {
      el.textContent = '题库 ' + s.total + ' 题 · 套卷 ' + KY.bank.papers().length + ' 套';
    }
  }

  /* ------------------------------------------------------------------ */
  /* 路由注册                                                            */
  /* ------------------------------------------------------------------ */

  function registerRoutes() {
    var R = KY.router;
    var V = KY.views;

    R.add('dashboard', V.dashboard);
    R.add('plan', V.plan);
    R.add('resources', V.resources);
    R.add('review', V.review);
    R.add('wrongbook', V.wrongbook);
    R.add('progress', V.progress);
    R.add('subject', V.subject);
    R.add('papers', V.papers);
    R.add('exam', V.exam);
    R.add('bank', V.bank);
    R.add('import', V.import);
    R.add('console', V.console);
    R.add('settings', V.settings);
    R.add('help', V.help);

    R.setNotFound(function (ctx, mount) {
      mount.innerHTML = KY.ui.empty('页面不存在', '没有找到路由 /' + ctx.name,
        '<a class="btn btn-primary" href="#/dashboard">回到总览</a>');
    });
  }

  /* ------------------------------------------------------------------ */
  /* 启动                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    try {
      bootInner();
      booted = true;
    } catch (e) {
      console.error('[app] 启动失败', e);
      showFatal('启动失败', e && e.stack ? e.stack : String(e));
    }
  }

  function bootInner() {
    // 1. 建立题库索引
    var info = KY.bank.rebuild();
    var missing = KY.SUBJECTS.filter(function (sub) { return KY.bank.countBySubject(sub) === 0; });
    if (missing.length) {
      console.warn('[app] 以下科目题库为空：' + missing.join('、') +
        '（对应 src/data/bank.<subject>.js 未加载或内容为空）');
    }

    // 2. 视图容器
    KY.views = KY.views || {};

    // 3. 全局能力
    KY.bindVideoDelegation();
    KY.bindAnswerJumpDelegation();

    // 4. 侧栏与状态
    refreshNavBadges();
    refreshStorageStatus();
    refreshBankStatus();

    KY.bus.on('wrongbook:changed', refreshNavBadges);
    KY.bus.on('route:after', function () {
      refreshNavBadges();
      refreshBankStatus();
    });

    // 5. 路由
    registerRoutes();
    KY.router.start();

    // 6. 检查有没有新版本（离线 / file:// 打开时静默跳过）
    if (KY.update && KY.update.autoCheck) KY.update.autoCheck();

    // 7. 访问口令门：没解锁就把界面盖住
    if (KY.auth && KY.auth.isRequired() && !KY.auth.isUnlocked()) showGate();

    console.log('[考研定制化复习] 启动完成', {
      版本: KY.BUILD || 'dev',
      题库: info.questions + ' 题',
      套卷: info.papers + ' 套',
      知识点: Object.keys(KY.taxIndex).length + ' 个',
      存储: KY.store.backend()
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ------------------------------------------------------------------ */
  /* 访问口令门                                                          */
  /*                                                                     */
  /* 说明：这是纯前端的门，只能挡住随手打开网址的人。                      */
  /* 会按 F12 的人可以直接改标志位进来——纯静态网站没有服务端，这是必然。  */
  /* 真正需要访问控制请看 部署说明.md 里的 Cloudflare Access 方案。        */
  /* ------------------------------------------------------------------ */

  var GATE_ID = 'auth-gate';

  function showGate() {
    if (typeof document === 'undefined') return;

    var cfg = KY.auth.config();
    document.body.classList.add('auth-locked');

    var mask = document.createElement('div');
    mask.id = GATE_ID;
    mask.className = 'gate-mask';
    mask.innerHTML =
      '<div class="gate-card">' +
      '<div class="gate-brand">📚</div>' +
      '<h2>' + KY.util.escapeHtml(cfg.title || '考研复习系统') + '</h2>' +
      '<p class="gate-sub">这是一个私人复习站点，请先登录。</p>' +
      '<form id="gate-form" autocomplete="off">' +
      '<label class="field"><span class="lbl">账号</span>' +
      '<input type="text" id="gate-user" autocomplete="username" placeholder="账号"></label>' +
      '<label class="field"><span class="lbl">密码</span>' +
      '<input type="password" id="gate-pass" autocomplete="current-password" placeholder="密码"></label>' +
      '<label class="checkbox" style="margin-bottom:14px">' +
      '<input type="checkbox" id="gate-remember" checked>在这台设备上记住我</label>' +
      '<div id="gate-msg" class="gate-msg"></div>' +
      '<button class="btn btn-primary btn-lg" id="gate-submit" type="submit" style="width:100%">进入</button>' +
      '</form>' +
      (cfg.hint ? '<div class="gate-hint">' + KY.util.escapeHtml(cfg.hint) + '</div>' : '') +
      '<div class="gate-foot">数据只保存在你自己的浏览器里，不会上传到任何服务器。</div>' +
      '</div>';
    document.body.appendChild(mask);

    var form = document.getElementById('gate-form');
    var userEl = document.getElementById('gate-user');
    var passEl = document.getElementById('gate-pass');
    var msgEl = document.getElementById('gate-msg');
    var submitEl = document.getElementById('gate-submit');
    if (!form) return;

    if (userEl) setTimeout(function () { userEl.focus(); }, 60);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = userEl ? userEl.value.trim() : '';
      var p = passEl ? passEl.value : '';
      var remember = document.getElementById('gate-remember');
      var res = KY.auth.tryUnlock(u, p, remember ? remember.checked : true);

      if (res.ok) {
        hideGate();
        KY.util.toast('欢迎回来', 'success');
        return;
      }

      var msg = {
        empty: '账号和密码都要填。',
        baduser: '账号不对。',
        badpass: '密码不对。',
        disabled: '口令门已关闭。'
      }[res.reason] || '登录失败。';
      if (msgEl) msgEl.textContent = msg;
      if (passEl) { passEl.value = ''; passEl.focus(); }
      if (submitEl) {
        submitEl.disabled = true;
        setTimeout(function () { submitEl.disabled = false; }, 900);
      }
    });
  }

  function hideGate() {
    if (typeof document === 'undefined') return;
    var el = document.getElementById(GATE_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.body.classList.remove('auth-locked');
  }

  KY.app = {
    refreshNavBadges: refreshNavBadges,
    refreshBankStatus: refreshBankStatus,
    showGate: showGate,
    hideGate: hideGate
  };
})(window);
