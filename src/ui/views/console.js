/*!
 * views/console.js —— 运营台（发布者视角）
 * 路由： #/console
 *
 * 这是给"运营者"用的集中控制台：上传题库、写每日计划、挑错题推送、
 * 以及一个照做就行的发布清单（含根据你的 GitHub 用户名算出的网址）。
 *
 * 使用者（她）不需要看这一页，她只看「今日计划」。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var PLAN_TEMPLATE = [
    '# 第 1 天 ' + KY.plan.todayStr() + ' 打基础',
    '- 数学一 极限计算 20 题 @60',
    '- 英语一 阅读 2 篇 @50',
    '- 政治 马原 唯物辩证法 @30',
    '- 背昨天的生词 @15',
    '',
    '# 第 2 天',
    '- 数学一 洛必达 15 题 @45',
    '- 英语一 完形填空 逻辑衔接 10 题 @40',
    '- 信号与系统 拉普拉斯反变换 5 题 @50',
    '',
    '# 第 3 天 模拟考试日',
    '- 考试 2019 年英语一真题 @180',
    '- 复习这周的错题 @30'
  ].join('\n');

  var PLAN_HELP = '' +
    '以 <code>#</code> 开头 = 新的一天，可以写「第N天」「2025-06-01」和标题，顺序随意。<br>' +
    '以 <code>-</code> 开头 = 一条任务，行尾 <code>@60</code> 表示预计 60 分钟。<br>' +
    '任务里出现科目名（数学一/英语一/信号与系统/政治）→ 自动变成「去刷题」任务，' +
    '系统会从文字里找出对应考点，并识别「20 题」这样的题量。<br>' +
    '以「考试」开头 → 自动变成「开始考试」任务，识别到年份就挂到对应真题卷。<br>' +
    '想写死考点可以用方括号：<code>- [math1|m1.p.limit.eval] 极限 10 题 @30</code>；' +
    '指定套卷用 <code>[paper:en1-2019]</code>。';

  var RES_TEMPLATE = [
    '# 数学一',
    '视频 | 张宇高数基础班 第1讲 极限 | https://pan.baidu.com/s/1abc | 提取码: abcd | 45分钟 | 先看这个',
    '文档 | 高数讲义 第一章 | https://pan.baidu.com/s/1def | 提取码: 1234',
    '',
    '# 英语一',
    '视频 | 唐迟阅读基础 | https://pan.quark.cn/s/xyz'
  ].join('\n');

  /* ================================================================== */

  KY.views.console = function (ctx, mount) {
    ui.setTitle('运营台');

    var profile = KY.store.getProfile();
    // 默认值按实际部署填好；运营台里也可以随时改
    var ghUser = profile.githubUser || 'liii-yuling';
    var repoName = profile.repoName || 'kaoyan_review';

    var bankStats = KY.bank.stats();
    var planMeta = KY.plan.getMeta();
    var planOverall = KY.plan.overall();
    var pushMeta = KY.push.getMeta();
    var pushShared = KY.push.getShared();
    var pendingPush = KY.push.pending();
    var sharedConflicts = KY.bank.sharedConflictIds();

    var resMeta = KY.resources.getMeta();
    var resSum = KY.resources.summary();
    var authCfg = KY.auth.config();

    /* ------------------------------------------------------------------ */
    /* 分页签                                                              */
    /* ------------------------------------------------------------------ */

    var TABS = [
      { id: 'home', name: '总览', icon: '◉' },
      { id: 'plan', name: '每日计划', icon: '☑' },
      { id: 'push', name: '错题推送', icon: '📌' },
      { id: 'bank', name: '共享题库', icon: '📚' },
      { id: 'resources', name: '资料库', icon: '▦' },
      { id: 'auth', name: '访问口令', icon: '🔒' },
      { id: 'exam', name: '考试安排', icon: '⏱' },
      { id: 'about', name: '发布与部署', icon: '🚀' }
    ];

    var tab = (ctx.query && ctx.query.tab) || 'home';
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'home';

    function tabCount(id) {
      switch (id) {
        case 'plan': return planMeta.dayCount || 0;
        case 'push': return pushShared.items.length || 0;
        case 'bank': return bankStats.sharedCount || 0;
        case 'resources': return resSum.count || 0;
        case 'auth': return authCfg.enabled ? 1 : 0;
        case 'exam': return KY.bank.papers().length || 0;
        default: return 0;
      }
    }

    /* ------------------------------------------------------------------ */
    /* 待办清单                                                            */
    /* ------------------------------------------------------------------ */

    var todos = [];
    function T(level, text, targetTab, action) {
      todos.push({ level: level, text: text, tab: targetTab || '', action: action || '' });
    }

    if (sharedConflicts.length) {
      T('err', '有 ' + sharedConflicts.length + ' 道共享题因 id 与内置题重复而未生效（她看不到）',
        'bank', '去看冲突');
    }
    if (!(bankStats.sharedCount || 0)) {
      T('err', '还没有发布共享题库 —— 她目前只能看到内置的四科题目', 'bank', '去导入题库');
    } else {
      T('ok', '共享题库已发布 ' + bankStats.sharedCount + ' 题', 'bank', '');
    }

    if (!planMeta.dayCount) {
      T('err', '还没有发布每日计划 —— 她打开「今日计划」会看到"还没有收到计划"', 'plan', '去写计划');
    } else {
      T('ok', '每日计划已发布 ' + planMeta.dayCount + ' 天 / ' + planMeta.taskCount + ' 项任务',
        'plan', '继续编辑');
    }

    if (!resSum.count) {
      T('warn', '还没有发布资料库 —— 她看不到你的网盘视频和讲义', 'resources', '去整理资料');
    } else {
      T('ok', '资料库已发布 ' + resSum.count + ' 条' +
        (resSum.videoMin ? '，视频总时长约 ' + Math.round(resSum.videoMin / 60 * 10) / 10 + ' 小时' : ''),
        'resources', '继续编辑');
    }

    if (!pushShared.items.length) {
      T('warn', '还没有推送过错题 —— 你可以挑几道题指定她练', 'push', '去挑题');
    } else if (pendingPush.length) {
      T('warn', '推送的错题还有 ' + pendingPush.length + ' 道她没收下', 'push', '去看看');
    } else {
      T('ok', '推送的 ' + pushShared.items.length + ' 道错题她已全部收下', 'push', '');
    }

    if (!authCfg.enabled) {
      T('err', '访问口令门没启用 —— 任何人拿到网址都能直接进入', 'auth', '去启用');
    } else if (authCfg.user === 'yxt123') {
      T('warn', '口令还是初始的 yxt123 —— 建议改掉（太短，字典一秒就能猜出来）', 'auth', '去改口令');
    } else {
      T('ok', '访问口令已启用，账号 ' + authCfg.user, 'auth', '');
    }

    if (!repoName) {
      T('warn', '还没填仓库名 —— 填上才能算出她的访问网址', 'about', '去填');
    }

    var pendingTodo = todos.filter(function (x) { return x.level !== 'ok'; }).length;

    var todoHtml = '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">待办清单</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (pendingTodo ? ('还有 <b>' + pendingTodo + '</b> 项待处理') : '全部就绪 ✓') +
      '　·　发布流程：改内容 → <code>发布.cmd</code> → <code>推送.cmd</code></p></div>' +
      '</div>' +
      todos.map(function (x) {
        var dot = x.level === 'err' ? '🔴' : (x.level === 'warn' ? '🟡' : '🟢');
        return '<div class="con-todo ' + x.level + '">' +
          '<span class="dot">' + dot + '</span>' +
          '<span class="tx">' + esc(x.text) + '</span>' +
          (x.tab && x.action
            ? '<button class="btn btn-sm" data-gotab="' + x.tab + '">' + esc(x.action) + '</button>'
            : '') +
          '</div>';
      }).join('') +
      '</div>';

    var siteUrl = ghUser && repoName
      ? ('https://' + ghUser.toLowerCase() + '.github.io/' + repoName + '/')
      : '';

    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>运营台</h2>' +
      '<p>你的工作台：发布题库、写每日计划、挑错题推送、整理资料库、设访问口令。' +
      '改完点「导出…」→ 双击 <code>发布.cmd</code> → 双击 <code>推送.cmd</code>，她刷新就收到了。</p>' +
      '<div class="slogans">' +
      '<span>📚 题库 ' + (bankStats.sharedCount || 0) + ' 题</span>' +
      '<span>☑ 计划 ' + planMeta.dayCount + ' 天</span>' +
      '<span>📌 推送 ' + pushShared.items.length + ' 题</span>' +
      '<span>▦ 资料 ' + resSum.count + ' 条</span>' +
      '<span>🔒 口令' + (authCfg.enabled ? '已启用' : '未启用') + '</span>' +
      '<span>🏷 ' + esc(KY.BUILD || 'dev') + '</span>' +
      '</div>' +
      (siteUrl
        ? '<div class="con-url">她用的网址：<code>' + esc(siteUrl) + '</code>' +
        '<button class="btn btn-sm" id="c-copy-url2">复制网址</button>' +
        '<a class="btn btn-sm" href="' + esc(siteUrl) + '" target="_blank" rel="noopener">打开看看</a></div>'
        : '<div class="con-url">还没填仓库名，填上才能算出她的网址。' +
        '<button class="btn btn-sm" data-gotab="about">去填</button></div>') +
      '</div>' +

      /* 子导航 */
      '<div class="con-tabs" id="con-tabs">' +
      TABS.map(function (t) {
        var n = tabCount(t.id);
        return '<button class="' + (tab === t.id ? 'on' : '') + '" data-tab="' + t.id + '">' +
          '<span class="ico">' + t.icon + '</span>' + esc(t.name) +
          (n ? '<span class="cnt">' + n + '</span>' : '') +
          '</button>';
      }).join('') +
      '</div>' +

      '<div class="con-tab" data-tab="home">' +
      todoHtml +

      /* ============ 状态一览 ============ */
      (sharedConflicts.length
        ? '<div class="hint-box err"><b>⚠ 有 ' + sharedConflicts.length +
        ' 道共享题因 id 与内置题重复而未生效。</b>请到「题库导入」页看冲突列表并改 id，否则她看不到这些题。</div>'
        : '') +
      (pushShared.items.length && pendingPush.length === 0
        ? '<div class="hint-box ok">你推送的 ' + pushShared.items.length +
        ' 道错题她已经全部收下了。</div>'
        : '') +

      '<div class="grid grid-4" style="margin-bottom:18px">' +
      ui.stat(bankStats.sharedCount || 0, '共享题库（她能看到的）',
        '<div style="font-size:11.5px;color:var(--text-3);margin-top:4px">内置 ' +
        (bankStats.total - (bankStats.sharedCount || 0) - (bankStats.userCount || 0)) + ' 题</div>') +
      ui.stat(planMeta.dayCount || 0, '计划天数',
        '<div style="font-size:11.5px;color:var(--text-3);margin-top:4px">' +
        (planOverall.total ? ('她完成 ' + planOverall.done + '/' + planOverall.total) : '还没发布') + '</div>') +
      ui.stat(pushShared.items.length, '推送的错题',
        '<div style="font-size:11.5px;color:var(--text-3);margin-top:4px">' +
        (pushShared.items.length ? ('待她收下 ' + pendingPush.length) : '还没推送') + '</div>') +
      ui.stat(KY.bank.count(), '她那边题库总量') +
      '</div>' +

      /* ============ 部署与发布 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">发布清单（照着做就行）</h3>' +
      '<p class="card-sub" style="margin:0">每次改完内容，重复下面第 3~5 步</p></div>' +
      '<span class="spacer"></span>' +
      (siteUrl ? '<a class="btn btn-sm" href="' + esc(siteUrl) + '" target="_blank" rel="noopener">打开线上网站</a>' : '') +
      '</div>' +

      '<div class="grid grid-2" style="gap:12px;margin-bottom:12px">' +
      '<label class="field" style="margin:0"><span class="lbl">你的 GitHub 用户名</span>' +
      '<input type="text" id="c-ghuser" value="' + esc(ghUser) + '" placeholder="liii-yuling"></label>' +
      '<label class="field" style="margin:0"><span class="lbl">仓库名（英文，你自己起的那个）</span>' +
      '<input type="text" id="c-repo" value="' + esc(repoName) + '" placeholder="kaoyan_review"></label>' +
      '</div>' +
      (siteUrl
        ? '<div class="hint-box"><b>她用的网址就是：</b> <code id="c-url">' + esc(siteUrl) + '</code>' +
        '<button class="btn btn-sm" id="c-copy-url" style="margin-left:8px">复制</button></div>'
        : '<div class="hint-box warn">填上用户名和仓库名，我就能算出她要用的网址。</div>') +

      '<ol style="font-size:13.5px;line-height:2;color:var(--text-2);padding-left:22px">' +
      '<li>在下面三个编辑器里改内容（题库 / 计划 / 错题推送），每次改完点对应的「导出…」；</li>' +
      '<li>把导出的文件覆盖到项目里（计划是 <code>src/data/plan.shared.js</code>，' +
      '推送是 <code>src/data/push.shared.js</code>，题库见「题库导入」页）；' +
      '<br><span style="color:var(--text-3)">更省事：点「导出 JSON 到项目根目录」，' +
      '把得到的 <code>.json</code> 放进项目根目录，发布脚本会自动处理。</span></li>' +
      '<li>双击项目根目录的 <code>发布.cmd</code>（会先自检再打包）；</li>' +
      '<li>打开你的 GitHub 仓库网页 → <b>Add file → Upload files</b> → ' +
      '把 <code>dist</code> 文件夹<b>里面的内容</b>全选拖进去 → Commit；</li>' +
      '<li>等她刷新页面，顶部会出现「有新版本」提示条，点一下她就拿到新版了。' +
      '她的错题本和打勾进度不会丢。</li>' +
      '</ol>' +
      '<button class="btn" id="c-save">保存用户名与仓库名</button>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">' +
      '<b>上传时最容易搞错的一步：</b>要拖 <code>dist</code> <b>里面</b>的内容' +
      '（第一层应该能看到 <code>index.html</code>），<b>不要</b>把 <code>dist</code> 文件夹本身拖进去，' +
      '否则网址会打不开。详细说明见项目根目录 <code>部署说明.md</code>。' +
      '</div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="plan">' +

      /* ============ 每日计划编辑器 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">① 每日计划</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (planMeta.dayCount
        ? ('当前已发布 ' + planMeta.dayCount + ' 天 / ' + planMeta.taskCount + ' 项' +
          (planMeta.builtAt ? '，生成于 ' + esc(planMeta.builtAt) : ''))
        : '还没有发布计划 —— 她现在打开「今日计划」会看到"还没有收到计划"') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm" id="p-tpl">填入示例</button>' +
      '<button class="btn btn-sm" id="p-load">读回当前已发布的计划</button>' +
      '</div>' +
      '</div>' +

      '<div class="hint-box" style="font-size:12.5px">' + PLAN_HELP + '</div>' +

      '<label class="field"><span class="lbl">计划内容（直接在这里手写）</span>' +
      '<textarea id="p-text" rows="14" style="font-family:ui-monospace,monospace;font-size:13px" ' +
      'placeholder="' + esc(PLAN_TEMPLATE.split('\n')[0]) + '"></textarea></label>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="p-preview">解析预览</button>' +
      '<button class="btn" id="p-export">导出计划文件（plan.shared.js）</button>' +
      '<button class="btn" id="p-export-json">导出 JSON 到项目根目录</button>' +
      '</div>' +
      '<div id="p-result" style="margin-top:14px"></div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="push">' +

      /* ============ 错题推送编辑器 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">② 错题推送</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (pushShared.items.length
        ? ('当前推送 ' + pushShared.items.length + ' 题' +
          (pushMeta.builtAt ? '，发布于 ' + esc(pushMeta.builtAt) : '') +
          '，其中 ' + pendingPush.length + ' 题她还没收下')
        : '还没有推送错题') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm" id="w-load">读回当前已推送的清单</button>' +
      '</div>' +
      '</div>' +

      '<div class="hint-box" style="font-size:12.5px">' +
      '每行写「<b>题目 ID</b> 或 <b>题干关键词</b>」，也可以加备注：' +
      '<code>en1-2023-cloze-01 | 这道题的逻辑衔接你上次错了</code><br>' +
      '关键词写法只在能唯一匹配到一道题时生效。她点「全部收下」后，' +
      '这些题会带着你的备注进她的错题本，并自动归类考点、参与复习推送。' +
      '</div>' +

      '<div class="card tight" style="background:var(--panel-2);margin-bottom:12px">' +
      '<div class="row">' +
      '<input type="search" id="w-search" placeholder="在题库里搜题（题干关键词 / 科目 / 考点），点结果右侧「加入」" style="flex:1">' +
      '<button class="btn btn-sm" id="w-search-btn">搜索</button>' +
      '</div>' +
      '<div id="w-search-result" style="margin-top:10px"></div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">推送标题（她会看到）</span>' +
      '<input type="text" id="w-title" value="' + esc(pushShared.title || '') + '" ' +
      'placeholder="例如：本周重点攻克"></label>' +
      '<label class="field"><span class="lbl">给她的说明（可选）</span>' +
      '<input type="text" id="w-note" value="' + esc(pushShared.note || '') + '" ' +
      'placeholder="例如：这些是你上周错的，先重做一遍"></label>' +
      '</div>' +

      '<label class="field"><span class="lbl">推送清单</span>' +
      '<textarea id="w-text" rows="9" style="font-family:ui-monospace,monospace;font-size:13px" ' +
      'placeholder="en1-2023-cloze-01 | 逻辑衔接注意 however&#10;数学一 洛必达 | 昨天错在这里&#10;m1-2020-limit-01"></textarea></label>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="w-check">校验清单</button>' +
      '<button class="btn" id="w-export">导出推送文件（push.shared.js）</button>' +
      '<button class="btn" id="w-export-json">导出 JSON 到项目根目录</button>' +
      '</div>' +
      '<div id="w-result" style="margin-top:14px"></div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="bank">' +

      /* ============ 题库 ============ */
      '<div class="card">' +
      '<h3 class="card-title">③ 共享题库</h3>' +
      '<p class="card-sub">' +
      (bankStats.sharedCount
        ? ('已发布 ' + bankStats.sharedCount + ' 题，她能刷到')
        : '<b style="color:var(--warn)">还没有发布共享题库</b>——她目前只能看到内置的四科题目') +
      '</p>' +
      '<div class="hint-box">' +
      '共享题库的导入与导出在「题库导入」页：上传 CSV/Excel → 解析预览 → ' +
      '「导出为共享题库文件」→ 覆盖 <code>src/data/bank.shared.js</code> → 发布。' +
      '</div>' +
      '<a class="btn btn-primary" href="#/import">去题库导入</a> ' +
      '<a class="btn" href="#/bank">先看看题库里有什么</a>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="resources">' +

      /* ============ 资料库 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">④ 资料库（网盘链接）</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (resSum.count
        ? ('已发布 ' + resSum.count + ' 条' +
          (resMeta.builtAt ? '，生成于 ' + esc(resMeta.builtAt) : ''))
        : '还没有发布资料 —— 她打开「资料库」会看到"还没有收到资料"') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm" id="r-tpl">填入示例</button>' +
      '<button class="btn btn-sm" id="r-load">读回已发布的资料</button>' +
      '</div>' +
      '</div>' +

      '<div class="hint-box" style="font-size:12.5px">' +
      '<b>视频文件不要传进仓库</b>（GitHub 单文件硬上限 100 MB，一集网课就超；' +
      '服务条款也禁止当大文件存储用）。把<b>网盘链接</b>放这里就行。<br>' +
      '格式：以 <code># 科目名</code> 单独一行给后面的条目设科目；每条一行，用 <code>|</code> 分段：' +
      '<code>类型 | 标题 | 链接 | 提取码: xxxx | 时长 | 备注</code><br>' +
      '类型可写 视频/文档/图片/链接，不写会按标题自动判断。' +
      '网盘平台（百度网盘/夸克/阿里云盘/天翼…）会根据链接自动识别。' +
      '</div>' +

      '<label class="field"><span class="lbl">资料清单（直接在这里粘贴你的网盘链接）</span>' +
      '<textarea id="r-text" rows="12" style="font-family:ui-monospace,monospace;font-size:13px" ' +
      'placeholder="' + esc(RES_TEMPLATE) + '"></textarea></label>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="r-preview">解析预览</button>' +
      '<button class="btn" id="r-export">导出资料库文件（resources.shared.js）</button>' +
      '<button class="btn" id="r-export-json">导出 JSON 到项目根目录</button>' +
      '</div>' +
      '<div id="r-result" style="margin-top:14px"></div>' +
      '</div>' +

      /* ============ 二维码视频（政治扫码课） ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">④-b 二维码视频（扫码看课）</h3>' +
      '<p class="card-sub" style="margin:0">把带二维码的 PDF 或二维码截图拖进来，' +
      '自动解出视频链接，并尽量认出章节和重点</p></div>' +
      '</div>' +

      '<div class="hint-box" style="font-size:12.5px">' +
      '<b>二维码里只有链接，没有"这是第几章"。</b>所以章节和重点是这样推出来的：' +
      '① 从二维码所在那一页的文字里找「第X章 / 第X节」当章节名；' +
      '② 拿题库里政治考点的关键词去撞这一页的文字，撞上的列为重点。<br>' +
      '推不准是正常的 —— 并入清单后你可以在上面的文本框里直接改' +
      '（格式：<code>视频 | 标题 | 章节: 第三章 | 知识点: 实践、认识 | 链接</code>）。' +
      '<b>我不会凭空编章节名，认不出就留空。</b>' +
      '</div>' +

      '<div class="dropzone" id="qr-drop">' +
      '<div class="big">🔳</div>' +
      '<div>把 <b>带二维码的 PDF</b> 或 <b>二维码截图</b> 拖到这里，或点这里选择</div>' +
      '<div class="hint">首次使用需要联网加载识别引擎；PDF 会逐页渲染，页数多时比较慢</div>' +
      '</div>' +
      '<input type="file" id="qr-file" accept=".pdf,application/pdf,image/*" multiple style="display:none">' +
      '<div id="qr-status"></div>' +

      '<div class="row" style="margin-top:12px">' +
      '<label class="field" style="margin:0;max-width:220px"><span class="lbl">科目</span>' +
      '<select id="qr-subject">' +
      KY.SUBJECTS.map(function (s) {
        return '<option value="' + s + '"' + (s === 'politics' ? ' selected' : '') + '>' +
          esc(KY.subjectName(s)) + '</option>';
      }).join('') +
      '</select></label>' +
      '<button class="btn btn-primary" id="qr-merge" disabled>并进上面的资料清单</button>' +
      '<button class="btn btn-sm btn-ghost" id="qr-clear">清空识别结果</button>' +
      '</div>' +
      '<div id="qr-preview" style="margin-top:12px"></div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="auth">' +

      /* ============ 访问口令 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">⑤ 访问口令门</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (authCfg.enabled
        ? ('当前已启用，账号：<b>' + esc(authCfg.user) + '</b>')
        : '当前<b>未启用</b>——任何人都能直接打开网址') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      (authCfg.enabled
        ? '<button class="btn btn-sm" id="a-locknow">立即锁定本机（测试登录）</button>'
        : '') +
      '</div>' +

      '<div class="hint-box warn" style="font-size:12.5px">' +
      '<b>先说清楚这个门的强度：</b>它<b>只能挡住随手打开网址的人</b>（爬虫、误点链接的陌生人）。' +
      '<b>挡不住会按 F12 的人</b>——纯静态网站没有服务端，验证逻辑和代码全部公开，' +
      '而且仓库是 Public，任何人都能下载代码。<br>' +
      '需要真正的访问控制，见 <code>部署说明.md</code> 里的 <b>Cloudflare Access</b> 方案' +
      '（免费，真服务端鉴权，邮箱验证码）。' +
      '</div>' +

      '<div class="grid grid-3">' +
      '<label class="field"><span class="lbl">账号</span>' +
      '<input type="text" id="a-user" value="' + esc(authCfg.user) + '" placeholder="yxt123"></label>' +
      '<label class="field"><span class="lbl">新密码（留空则不修改）</span>' +
      '<input type="password" id="a-pass" placeholder="留空 = 保持原密码"></label>' +
      '<label class="field"><span class="lbl">门上的标题</span>' +
      '<input type="text" id="a-title" value="' + esc(authCfg.title) + '" placeholder="考研复习系统"></label>' +
      '</div>' +
      '<label class="field"><span class="lbl">给她的提示（可选，会显示在登录框下面）</span>' +
      '<input type="text" id="a-hint" value="' + esc(authCfg.hint) + '" placeholder="例如：忘了密码问我"></label>' +
      '<label class="switch" style="margin-bottom:14px">' +
      '<input type="checkbox" id="a-enabled"' + (authCfg.enabled ? ' checked' : '') + '>' +
      '<span class="track"></span><span>启用口令门</span></label>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="a-save">导出新的口令文件（auth.shared.js）</button>' +
      '<button class="btn" id="a-save-json">导出 JSON 到项目根目录</button>' +
      '</div>' +
      '<div class="alert-contacts"></div>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">' +
      '<b>重要：</b>改口令后要把导出的文件覆盖到 <code>src/data/auth.shared.js</code> 再发布。' +
      '一改口令，<b>所有已经登录的设备都会立刻被重新拦下</b>（包括你自己的手机），需要用新口令重新登录。' +
      '<br>口令不会明文存在文件里，只存 sha256（账号 + 口令 + 盐）。' +
      '<br><b>建议把 yxt123 换掉</b>——它太短，虽然哈希不可逆，但这么短的密码字典一秒就能猜出来。' +
      '</div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="exam">' +

      /* ============ 考试安排 ============ */
      '<div class="card">' +
      '<h3 class="card-title">⑥ 考试安排</h3>' +
      '<p class="card-sub">把考试也写进每日计划里，她就能一键开考</p>' +
      '<div class="hint-box">' +
      '在「每日计划」里写一条 <code>- 考试 2019 年英语一真题 @180</code>，' +
      '系统会自动挂到对应的真题卷，她那边会出现「开始考试」按钮，限时作答、自动判分。' +
      '<br>想指定具体套卷就写 <code>- [paper:english1-real-by-module] 真题精练 @120</code>。' +
      '</div>' +
      '<div class="row">' +
      '<span style="font-size:13px;color:var(--text-2)">现有套卷：</span>' +
      (KY.bank.papers().length
        ? KY.bank.papers().map(function (p) {
          return '<span class="tag" title="套卷 id：' + esc(p.id) + '">' + esc(p.title) + '</span>';
        }).join(' ')
        : '<span style="color:var(--text-3)">暂无套卷</span>') +
      '</div>' +
      '<div style="font-size:12.5px;color:var(--text-3);margin-top:8px">' +
      '鼠标停在套卷上可以看到它的 id，用在 <code>[paper:...]</code> 里。' +
      '她那边也可以自己在「考试模式」里智能组卷，不一定要你安排。' +
      '</div>' +
      '</div>' +

      '</div>' +

      '<div class="con-tab" data-tab="about">' +

      /* ============ 她的数据 ============ */
      '<div class="card">' +
      '<h3 class="card-title">⑦ 关于她的数据（务必了解）</h3>' +
      '<div class="hint-box warn">' +
      '<b>她的错题本、掌握度、打勾进度、考试成绩都在她自己的浏览器里，你这边看不到。</b><br>' +
      '这是"不租服务器、免费"的必然结果——没有数据库就没有双向同步。' +
      '所以：<br>' +
      '· 你能做的：发布题库、发布计划、推送错题给她（她一键收下）；<br>' +
      '· 你不能做的：直接看她的错题本、直接改她的掌握度；<br>' +
      '· 想了解她的情况：让她到「设置与备份 → 导出完整备份」把 JSON 发给你，' +
      '你在自己的浏览器里「导入并合并」就能看到她的全部数据。' +
      '</div>' +
      '</div>' +

      '</div>';   /* 关闭最后一个 con-tab（about） */

    /* ================= 事件 ================= */

    /* --- 分页签 --- */
    function goTab(id) {
      // 纯前端切换（不走路由重渲染），这样正在编辑的文本框内容不会被清掉
      Array.prototype.forEach.call(mount.querySelectorAll('.con-tab'), function (el) {
        el.classList.toggle('active', el.getAttribute('data-tab') === id);
      });
      Array.prototype.forEach.call(mount.querySelectorAll('#con-tabs button'), function (el) {
        el.classList.toggle('on', el.getAttribute('data-tab') === id);
      });
      // 同步地址栏，方便收藏/直达；replaceState 不会触发 hashchange，所以不会重渲染
      try { history.replaceState(null, '', '#/console?tab=' + id); } catch (e) { /* 忽略 */ }
      if (global.scrollTo) global.scrollTo({ top: 0, behavior: 'smooth' });
    }

    goTab(tab);

    mount.querySelector('#con-tabs').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#con-tabs [data-tab]');
      if (!b) return;
      goTab(b.getAttribute('data-tab'));
    });

    /* 待办清单 / 提示条里的「去处理」按钮 */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-gotab]');
      if (!b) return;
      goTab(b.getAttribute('data-gotab'));
    });

    var copy2 = mount.querySelector('#c-copy-url2');
    if (copy2) {
      copy2.addEventListener('click', function () {
        U.copyText(siteUrl).then(function () { U.toast('网址已复制', 'success'); });
      });
    }

    /* --- 资料库 --- */
    var resText = mount.querySelector('#r-text');

    mount.querySelector('#r-tpl').addEventListener('click', function () {
      resText.value = RES_TEMPLATE;
      U.toast('已填入示例，把链接换成你自己的就行', 'success');
    });

    mount.querySelector('#r-load').addEventListener('click', function () {
      var items = KY.resources.all();
      if (!items.length) { U.toast('当前还没有已发布的资料', 'info'); return; }
      var curSub = null, lines = [];
      items.forEach(function (it) {
        if (it.subject !== curSub) {
          curSub = it.subject;
          lines.push((curSub ? '# ' + KY.subjectName(curSub) : '# 未分类'));
        }
        var seg = [KY.resources.kindMeta(it.kind).name, it.title, it.url];
        if (it.code) seg.push('提取码: ' + it.code);
        if (it.duration) seg.push(it.duration);
        if (it.note) seg.push(it.note);
        lines.push(seg.join(' | '));
      });
      resText.value = lines.join('\n');
      U.toast('已读回当前资料，可以继续修改', 'success');
    });

    function renderResPreview(result) {
      var host = mount.querySelector('#r-result');
      var s = result.stats;
      if (!s.count) {
        host.innerHTML = '<div class="hint-box err">没解析出任何资料。' +
          '每行至少要有一个 http/https 链接，例如：<br>' +
          '<code>视频 | 张宇高数基础班 第1讲 | https://pan.baidu.com/s/1abc | 提取码: abcd</code></div>' +
          (result.errors.length
            ? '<div class="hint-box warn">' + result.errors.map(esc).join('<br>') + '</div>' : '');
        return;
      }
      var kindLine = Object.keys(s.byKind).map(function (k) {
        return KY.resources.kindMeta(k).name + ' ' + s.byKind[k];
      }).join(' · ');
      host.innerHTML =
        '<div class="hint-box ' + (result.errors.length ? 'warn' : 'ok') + '">' +
        '解析出 <b>' + s.count + '</b> 条资料（' + kindLine + '）' +
        (s.withCode ? '，其中 ' + s.withCode + ' 条带提取码' : '') +
        (s.totalMin ? '，视频总时长约 ' + Math.round(s.totalMin / 60 * 10) / 10 + ' 小时' : '') +
        (result.errors.length ? '；' + result.errors.length + ' 行有问题' : '') +
        '</div>' +
        (result.errors.length
          ? '<div class="hint-box warn" style="max-height:160px;overflow:auto">' +
          result.errors.map(function (e) { return '· ' + esc(e); }).join('<br>') + '</div>' : '') +
        '<table class="tbl"><thead><tr><th>类型</th><th>标题</th><th>科目</th><th>平台</th>' +
        '<th>提取码</th><th>时长</th><th>链接</th></tr></thead><tbody>' +
        result.items.map(function (it) {
          var km = KY.resources.kindMeta(it.kind);
          return '<tr>' +
            '<td>' + ui.tag(km.icon + ' ' + km.name, km.cls) + '</td>' +
            '<td>' + esc(U.truncate(it.title, 34)) +
            (it.note ? '<div style="font-size:11px;color:var(--text-3)">' + esc(it.note) + '</div>' : '') + '</td>' +
            '<td>' + (it.subject ? ui.subTag(it.subject) : ui.tag('未分类', 'tag-warn')) + '</td>' +
            '<td>' + (it.provider ? esc(it.provider) : '—') + '</td>' +
            '<td>' + (it.code ? '<code>' + esc(it.code) + '</code>' : '—') + '</td>' +
            '<td>' + (it.duration || '—') + '</td>' +
            '<td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis">' +
            esc(U.truncate(it.url, 34)) + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table>';
    }

    mount.querySelector('#r-preview').addEventListener('click', function () {
      if (!resText.value.trim()) { U.toast('先粘点内容', 'error'); return; }
      renderResPreview(KY.resources.parseText(resText.value));
    });

    mount.querySelector('#r-export').addEventListener('click', function () {
      var result = KY.resources.parseText(resText.value);
      if (!result.items.length) { U.toast('还没解析出资料，检查一下每行有没有链接', 'error'); return; }
      renderResPreview(result);
      U.downloadText('resources.shared.js',
        KY.resources.buildSharedJs(result.items, { source: 'console' }), 'text/javascript');
      ui.alertBox(
        '已生成资料库文件（' + result.stats.count + ' 条）。\n\n' +
        '1. 用它覆盖项目的 src/data/resources.shared.js\n' +
        '2. 双击 发布.cmd\n' +
        '3. 双击 推送.cmd\n\n' +
        '她刷新后就能在「资料库」里按科目浏览、一键复制提取码。',
        { title: '资料库文件已生成' }
      );
    });

    mount.querySelector('#r-export-json').addEventListener('click', function () {
      var result = KY.resources.parseText(resText.value);
      if (!result.items.length) { U.toast('还没解析出资料', 'error'); return; }
      U.downloadText('共享资料库.json',
        KY.resources.buildSharedJson(result.items, {}), 'application/json');
      ui.alertBox(
        '已生成 共享资料库.json。\n\n' +
        '放到项目根目录（和 发布.cmd 同一层），双击 发布.cmd —— 脚本会自动读取并打包。',
        { title: '共享资料库 JSON 已生成' }
      );
    });

    /* --- 二维码视频（政治扫码课） --- */

    var qrDrop = mount.querySelector('#qr-drop');
    var qrFile = mount.querySelector('#qr-file');
    var qrStatus = mount.querySelector('#qr-status');
    var qrPreview = mount.querySelector('#qr-preview');
    var qrMerge = mount.querySelector('#qr-merge');
    var qrRows = [];          // 识别出来的待并入条目

    function qrSay(html) { if (qrStatus) qrStatus.innerHTML = html; }

    function qrRenderPreview() {
      if (!qrRows.length) {
        qrPreview.innerHTML = '';
        qrMerge.disabled = true;
        return;
      }
      qrMerge.disabled = false;
      var withChapter = qrRows.filter(function (r) { return r.chapter; }).length;
      var withPoints = qrRows.filter(function (r) { return (r.points || []).length; }).length;

      qrPreview.innerHTML =
        '<div class="hint-box" style="font-size:12.5px">识别到 <b>' + qrRows.length +
        '</b> 个视频链接：认出章节 ' + withChapter + ' 个，认出重点 ' + withPoints + ' 个。' +
        (withChapter < qrRows.length
          ? '<br>有 ' + (qrRows.length - withChapter) + ' 个没认出章节（页面文字里没有「第X章」）。' +
            '并入清单后你自己补一下即可。'
          : '') +
        '</div>' +
        '<div class="qr-rows">' +
        qrRows.map(function (r, i) {
          var pts = (r.points || []).map(function (p) {
            return typeof p === 'string' ? p : (p.name || '');
          }).filter(Boolean);
          return '<div class="qr-row">' +
            '<div class="qr-row-head">' +
            '<span class="qr-idx">' + (i + 1) + '</span>' +
            '<span class="qr-chapter">' + (r.chapter ? esc(r.chapter) : '<em>未识别章节</em>') + '</span>' +
            (r.pageNo ? '<span class="qr-page">第 ' + r.pageNo + ' 页</span>' : '') +
            '</div>' +
            '<div class="qr-url mono">' + esc(U.truncate(r.url, 70)) + '</div>' +
            (pts.length
              ? '<div class="qr-points">重点：' + esc(pts.join('、')) + '</div>'
              : '<div class="qr-points qr-none">没匹配到重点</div>') +
            '</div>';
        }).join('') +
        '</div>';
    }

    function qrHandleFiles(files) {
      var arr = Array.prototype.slice.call(files);
      if (!arr.length) return;
      var subject = mount.querySelector('#qr-subject').value;

      var pdfs = arr.filter(function (f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; });
      var imgs = arr.filter(function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name); });

      if (!pdfs.length && !imgs.length) {
        U.toast('请拖 PDF 或二维码截图（png/jpg）', 'error');
        return;
      }

      qrRows = [];
      qrRenderPreview();
      qrSay('<div class="hint-box">正在准备识别 ' + arr.length + ' 个文件…</div>');

      var errors = [];

      /* 图片：没有页面文字，只能解出链接 —— 章节/重点留空，不编 */
      function doImages() {
        var i = 0;
        function next() {
          if (i >= imgs.length) return Promise.resolve();
          var f = imgs[i];
          qrSay('<div class="hint-box">正在识别图片 <b>' + esc(f.name) + '</b>（' +
            (i + 1) + '/' + imgs.length + '）…</div>');
          return KY.qr.decodeImageFile(f).then(function (urls) {
            urls.forEach(function (u) {
              var c = KY.qr.classify(u);
              if (!c.url) return;
              qrRows.push({
                subject: subject,
                chapter: '',
                title: f.name.replace(/\.[^.]+$/, ''),
                url: c.url,
                pageNo: 0,
                points: [],
                note: '来自图片 ' + f.name
              });
            });
            i++;
            return next();
          }).catch(function (e) {
            errors.push(esc(f.name) + '：' + esc(e.message));
            i++;
            return next();
          });
        }
        return next();
      }

      /* PDF：先提文字（用来推章节/重点），再逐页渲染解二维码 */
      function doPdfs() {
        var i = 0;
        function next() {
          if (i >= pdfs.length) return Promise.resolve();
          var f = pdfs[i];
          var pageText = Object.create(null);
          qrSay('<div class="hint-box">正在读 <b>' + esc(f.name) + '</b>（' +
            (i + 1) + '/' + pdfs.length + '）的文字…</div>');

          return KY.pdf.extract(f, {
            ocr: false,       // 二维码页通常有文字层；扫描件靠下面渲染解码即可
            onProgress: function (pageNo, total) {
              qrSay('<div class="hint-box">正在读 <b>' + esc(f.name) + '</b> 文字 ' +
                pageNo + '/' + total + ' 页…</div>');
            }
          }).then(function (r) {
            (r.pages || []).forEach(function (p) { pageText[p.no] = p.text || ''; });
            qrSay('<div class="hint-box">正在逐页识别 <b>' + esc(f.name) + '</b> 里的二维码…</div>');
            return KY.qr.decodePdf(f, {
              scale: 2.5,
              textOf: function (pageNo) { return pageText[pageNo] || ''; },
              onProgress: function (pageNo, total, phase) {
                qrSay('<div class="hint-box">正在识别 <b>' + esc(f.name) + '</b> 第 ' +
                  pageNo + '/' + total + ' 页' +
                  (phase === 'decode' ? ' · 解二维码…' : ' · 渲染页面…') + '</div>');
              }
            });
          }).then(function (res) {
            (res.pages || []).forEach(function (p) {
              var txt = p.context || pageText[p.no] || '';
              (p.urls || []).forEach(function (u) {
                var c = KY.qr.classify(u);
                if (!c.url) return;
                qrRows.push({
                  subject: subject,
                  chapter: KY.qr.guessChapter(txt),
                  title: '',
                  url: c.url,
                  pageNo: p.no,
                  points: KY.resources.inferPoints(txt, subject, 5),
                  note: f.name + ' 第 ' + p.no + ' 页'
                });
              });
            });
            if (res.stats && res.stats.codes === 0) {
              errors.push(esc(f.name) + ' 里没找到二维码');
            }
            (res.stats && res.stats.errors || []).forEach(function (x) { errors.push(esc(x)); });
            i++;
            return next();
          }).catch(function (e) {
            errors.push(esc(f.name) + '：' + esc(e.message));
            i++;
            return next();
          });
        }
        return next();
      }

      Promise.resolve()
        .then(doPdfs)
        .then(doImages)
        .then(function () {
          /* 去掉重复链接（同一页可能重复印同一个码） */
          var seen = Object.create(null);
          var uniq = [];
          qrRows.forEach(function (r) {
            if (seen[r.url]) return;
            seen[r.url] = 1;
            uniq.push(r);
          });
          var dup = qrRows.length - uniq.length;
          qrRows = uniq;
          qrRenderPreview();

          if (!qrRows.length) {
            qrSay('<div class="hint-box err"><b>没识别到任何视频二维码。</b><br>' +
              '常见原因：二维码太小（渲染分辨率不够）、页面是纯图片但渲染失败、' +
              '或者这些码不是链接。<br>可以试试把二维码单独截图再拖进来（截图要清楚、别裁掉三个角上的方块）。' +
              (errors.length ? '<br>出错：' + errors.join('；') : '') + '</div>');
            return;
          }
          qrSay('<div class="hint-box ok"><b>识别完成</b>：' + qrRows.length + ' 个视频链接' +
            (dup ? '（去重掉 ' + dup + ' 个重复的）' : '') +
            (errors.length ? '<br>部分文件出错：' + errors.join('；') : '') +
            '<br>确认下面没问题后，点「并进上面的资料清单」。</div>');
        });
    }

    if (qrDrop && qrFile) {
      qrDrop.addEventListener('click', function () { qrFile.click(); });
      qrDrop.addEventListener('dragover', function (e) {
        e.preventDefault(); qrDrop.classList.add('over');
      });
      qrDrop.addEventListener('dragleave', function () { qrDrop.classList.remove('over'); });
      qrDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        qrDrop.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) qrHandleFiles(e.dataTransfer.files);
      });
      qrFile.addEventListener('change', function () {
        if (qrFile.files && qrFile.files.length) qrHandleFiles(qrFile.files);
      });
    }

    qrMerge.addEventListener('click', function () {
      if (!qrRows.length) return;
      var items = KY.resources.buildQrItems(qrRows, {});
      var text = KY.resources.itemsToText(items);
      if (!text) { U.toast('没有可并入的内容', 'error'); return; }

      var box = mount.querySelector('#r-text');
      var cur = box.value.trim();
      box.value = cur ? (cur + '\n' + text) : text;
      /* 立刻解析一次，让她看到并入后清单长什么样 */
      renderResPreview(KY.resources.parseText(box.value));
      U.toast('已并入 ' + items.length + ' 个视频。核对无误后点「导出资料库文件」', 'success');
      qrRows = [];
      qrRenderPreview();
      qrSay('<div class="hint-box ok">已并入上面的清单。接下来点「解析预览」核对，' +
        '再点「导出资料库文件（resources.shared.js）」发布。</div>');
    });

    mount.querySelector('#qr-clear').addEventListener('click', function () {
      qrRows = [];
      qrRenderPreview();
      qrSay('');
    });

    /* --- 访问口令 --- */
    function authOpts() {
      var passEl = mount.querySelector('#a-pass');
      return {
        enabled: mount.querySelector('#a-enabled').checked,
        user: mount.querySelector('#a-user').value.trim(),
        pass: passEl ? passEl.value : '',
        salt: authCfg.salt,
        title: mount.querySelector('#a-title').value.trim(),
        hint: mount.querySelector('#a-hint').value.trim(),
        passHash: null
      };
    }

    function checkAuthOpts(o) {
      if (!o.user) { U.toast('账号不能为空', 'error'); return false; }
      if (o.enabled && !o.pass && !authCfg.passHash) {
        U.toast('第一次设置必须填密码', 'error');
        return false;
      }
      if (o.pass && o.pass.length < 6) {
        U.toast('密码太短了，建议至少 8 位（yxt123 这种太容易被猜）', 'error');
        return false;
      }
      return true;
    }

    /* 不填新密码 = 沿用旧哈希（只改标题/提示时不至于把口令改掉） */
    function authPayload(o) {
      var payload = {
        enabled: o.enabled, user: o.user, salt: o.salt,
        title: o.title, hint: o.hint
      };
      payload.passHash = o.pass ? KY.auth.hashCred(o.user, o.pass, o.salt) : authCfg.passHash;
      return payload;
    }

    mount.querySelector('#a-save').addEventListener('click', function () {
      var o = authOpts();
      if (!checkAuthOpts(o)) return;
      var payload = authPayload(o);
      U.downloadText('auth.shared.js', KY.auth.buildSharedJs({
        enabled: payload.enabled, user: payload.user, salt: payload.salt,
        passHash: payload.passHash, title: payload.title, hint: payload.hint
      }), 'text/javascript');
      ui.alertBox(
        '已生成新的口令文件。\n\n' +
        '1. 用它覆盖项目的 src/data/auth.shared.js\n' +
        '2. 双击 发布.cmd → 双击 推送.cmd\n\n' +
        '⚠ 发布之后，所有已经登录的设备都会被重新拦下，需要用新口令重新登录。' +
        (o.pass ? '' : '\n\n（你这次没填新密码，所以口令本身没变，只是改了标题/提示/启用状态。）'),
        { title: '口令文件已生成' }
      );
    });

    mount.querySelector('#a-save-json').addEventListener('click', function () {
      var o = authOpts();
      if (!checkAuthOpts(o)) return;
      var payload = authPayload(o);
      U.downloadText('共享口令.json', KY.auth.buildSharedJson({
        enabled: payload.enabled, user: payload.user, salt: payload.salt,
        passHash: payload.passHash, title: payload.title, hint: payload.hint
      }), 'application/json');
      ui.alertBox(
        '已生成 共享口令.json。\n\n' +
        '放到项目根目录（和 发布.cmd 同一层），双击 发布.cmd 即可。',
        { title: '共享口令 JSON 已生成' }
      );
    });

    var lockBtn = mount.querySelector('#a-locknow');
    if (lockBtn) {
      lockBtn.addEventListener('click', function () {
        KY.auth.lock();
        U.toast('已清除本机登录状态，正在显示登录界面…', 'success');
        setTimeout(function () { KY.app.showGate(); }, 400);
      });
    }

    /* --- 用户名与仓库名 --- */
    mount.querySelector('#c-save').addEventListener('click', function () {
      KY.store.setProfile({
        githubUser: mount.querySelector('#c-ghuser').value.trim(),
        repoName: mount.querySelector('#c-repo').value.trim().replace(/^\/+|\/+$/g, '')
      });
      U.toast('已保存，网址已更新', 'success');
      KY.router.refresh();
    });

    var copyBtn = mount.querySelector('#c-copy-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        U.copyText(siteUrl).then(function () { U.toast('网址已复制', 'success'); });
      });
    }

    /* --- 每日计划 --- */
    var planText = mount.querySelector('#p-text');

    mount.querySelector('#p-tpl').addEventListener('click', function () {
      planText.value = PLAN_TEMPLATE;
      U.toast('已填入示例，直接改就行', 'success');
    });

    mount.querySelector('#p-load').addEventListener('click', function () {
      var plans = KY.plan.allPlans();
      if (!plans.length) {
        U.toast('当前还没有已发布的计划', 'info');
        return;
      }
      // 反序列化回文本，方便你继续改
      var lines = [];
      plans.forEach(function (p) {
        lines.push('# ' + (p.dayIndex ? ('第 ' + p.dayIndex + ' 天 ') : '') +
          (p.date ? (p.date + ' ') : '') + (p.title || ''));
        (p.tasks || []).forEach(function (t) {
          var line = '- ' + t.text;
          if (t.kind === 'exam' && t.paperId) line = '- [paper:' + t.paperId + '] ' + t.text;
          else if (t.points && t.points.length) {
            line = '- [' + (t.subject || '') + '|' + t.points.join(',') + '] ' + t.text;
          }
          if (t.estMin) line += ' @' + t.estMin;
          lines.push(line);
        });
        lines.push('');
      });
      planText.value = lines.join('\n');
      U.toast('已读回当前计划，可以继续修改', 'success');
    });

    var lastPlans = null;

    function renderPlanPreview(result) {
      var host = mount.querySelector('#p-result');
      lastPlans = result.plans;

      if (!result.plans.length) {
        host.innerHTML = '<div class="hint-box err">没解析出任何计划。' +
          '至少要有一行 <code># 第 1 天</code> 和一行 <code>- 任务</code>。</div>' +
          (result.errors.length ? renderErrors(result.errors) : '');
        return;
      }

      var s = result.stats;
      host.innerHTML = '' +
        '<div class="hint-box ' + (result.errors.length ? 'warn' : 'ok') + '">' +
        '解析出 <b>' + s.dayCount + '</b> 天 / <b>' + s.taskCount + '</b> 项任务' +
        '（刷题 ' + (s.byKind.practice || 0) + ' · 考试 ' + (s.byKind.exam || 0) +
        ' · 普通 ' + (s.byKind.plain || 0) + '）' +
        (s.inferredCount ? '，其中 ' + s.inferredCount + ' 项是自动推断的，请核对' : '') +
        '</div>' +
        (result.errors.length ? renderErrors(result.errors) : '') +
        result.plans.map(function (p) {
          return '<div class="item" style="margin-bottom:10px">' +
            '<div class="item-head"><b>' + esc(p.title) + '</b>' +
            (p.date ? ui.tag(p.date) : '') + ui.tag('第 ' + p.dayIndex + ' 天') +
            ui.tag(p.tasks.length + ' 项') + '</div>' +
            (p.tasks.length
              ? '<table class="tbl" style="margin-top:6px"><thead><tr>' +
              '<th>任务</th><th>类型</th><th>科目</th><th>考点</th><th class="num">题量</th>' +
              '<th class="num">分钟</th><th>她的按钮</th></tr></thead><tbody>' +
              p.tasks.map(function (t) {
                var kindName = { practice: '刷题', exam: '考试', plain: '普通' }[t.kind];
                var btnText = t.kind === 'practice' ? '去刷题' : (t.kind === 'exam' ? '开始考试' : '打勾');
                return '<tr>' +
                  '<td>' + esc(U.truncate(t.text, 30)) +
                  (t.issues.length ? '<div style="color:var(--warn);font-size:11.5px">' +
                    esc(t.issues.join('；')) + '</div>' : '') + '</td>' +
                  '<td>' + ui.tag(kindName + (t.inferred ? '（推断）' : '')) + '</td>' +
                  '<td>' + (t.subject ? ui.subTag(t.subject) : '—') + '</td>' +
                  '<td style="font-size:11.5px">' + (t.points.length
                    ? t.points.map(function (pid) {
                      var n = KY.getTaxNode(pid);
                      return esc(n ? n.point.name : pid);
                    }).join('、')
                    : '—') + '</td>' +
                  '<td class="num">' + (t.count || '—') + '</td>' +
                  '<td class="num">' + (t.estMin || '—') + '</td>' +
                  '<td>' + btnText + (t.paperId ? '<div style="font-size:11px;color:var(--text-3)">' +
                    esc(t.paperTitle) + '</div>' : '') + '</td>' +
                  '</tr>';
              }).join('') +
              '</tbody></table>'
              : '<p style="color:var(--text-3);font-size:12.5px;margin:0">没有任务</p>') +
            '</div>';
        }).join('');
    }

    function renderErrors(errors) {
      return '<div class="hint-box err" style="max-height:180px;overflow:auto">' +
        errors.map(function (e) { return '· ' + esc(e); }).join('<br>') + '</div>';
    }

    mount.querySelector('#p-preview').addEventListener('click', function () {
      var text = planText.value;
      if (!text.trim()) { U.toast('先写点内容', 'error'); return; }
      renderPlanPreview(KY.plan.parseText(text));
    });

    mount.querySelector('#p-export').addEventListener('click', function () {
      var result = KY.plan.parseText(planText.value);
      if (!result.plans.length) {
        U.toast('还没解析出计划，先写「# 第 1 天」和「- 任务」', 'error');
        return;
      }
      renderPlanPreview(result);
      U.downloadText('plan.shared.js', KY.plan.buildSharedJs(result.plans, { source: 'console' }),
        'text/javascript');
      ui.alertBox(
        '已生成计划文件（' + result.stats.dayCount + ' 天 / ' + result.stats.taskCount + ' 项）。\n\n' +
        '接下来：\n' +
        '1. 用它覆盖项目的 src/data/plan.shared.js\n' +
        '2. 双击 发布.cmd\n' +
        '3. 把 dist 里的内容重新上传\n\n' +
        '她刷新后就能在「今日计划」里看到，并能逐项打勾。',
        { title: '计划文件已生成' }
      );
    });

    mount.querySelector('#p-export-json').addEventListener('click', function () {
      var result = KY.plan.parseText(planText.value);
      if (!result.plans.length) { U.toast('还没解析出计划', 'error'); return; }
      U.downloadText('共享计划.json', KY.plan.buildSharedJson(result.plans, {}), 'application/json');
      ui.alertBox(
        '已生成 共享计划.json。\n\n' +
        '把它放到项目根目录（和 发布.cmd 同一层），然后双击 发布.cmd —— ' +
        '发布脚本会自动读取它并打包进网站。你不用手动改 src 里的文件。',
        { title: '共享计划 JSON 已生成' }
      );
    });

    /* --- 错题推送 --- */
    var pushText = mount.querySelector('#w-text');

    mount.querySelector('#w-load').addEventListener('click', function () {
      var items = KY.push.getShared().items;
      if (!items.length) { U.toast('当前还没有推送清单', 'info'); return; }
      pushText.value = items.map(function (it) {
        return it.note ? (it.questionId + ' | ' + it.note) : it.questionId;
      }).join('\n');
      U.toast('已读回当前清单', 'success');
    });

    /* 题库挑题 */
    function doSearch() {
      var kw = mount.querySelector('#w-search').value.trim();
      var host = mount.querySelector('#w-search-result');
      if (!kw) { host.innerHTML = ''; return; }
      var hits = KY.bank.search(kw, { limit: 12 });
      if (!hits.length) {
        host.innerHTML = '<div class="hint-box warn" style="margin:0">没搜到题目，换个关键词试试。</div>';
        return;
      }
      host.innerHTML = '<div style="font-size:12px;color:var(--text-3);margin-bottom:6px">' +
        '找到 ' + hits.length + ' 题，点「加入」把题目 id 追加到下面的清单</div>' +
        hits.map(function (q) {
          return '<div class="row-status ok" style="align-items:center">' +
            '<span class="bd">' +
            '<div class="stem">' + esc(U.truncate(q.stem, 90)) + '</div>' +
            '<div class="meta">' + ui.subTag(q.subject) + ' <code>' + esc(q.id) + '</code> ' +
            (q.year ? ui.tag(q.year + ' 真题', 'tag-real') : '') + '</div>' +
            '</span>' +
            '<button class="btn btn-sm btn-primary" data-pick="' + esc(q.id) + '">加入</button>' +
            '</div>';
        }).join('');
    }

    mount.querySelector('#w-search-btn').addEventListener('click', doSearch);
    mount.querySelector('#w-search').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });

    mount.querySelector('#w-search-result').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-pick]');
      if (!b) return;
      var qid = b.getAttribute('data-pick');
      pushText.value = (pushText.value.trim() ? pushText.value.replace(/\s+$/, '') + '\n' : '') + qid;
      U.toast('已加入清单：' + qid, 'success');
    });

    function pushResult() {
      var parsed = KY.push.parseText(pushText.value);
      var host = mount.querySelector('#w-result');
      host.innerHTML =
        '<div class="hint-box ' + (parsed.errors.length ? 'warn' : 'ok') + '">' +
        '解析出 <b>' + parsed.items.length + '</b> 道题' +
        (parsed.errors.length ? '，' + parsed.errors.length + ' 行有问题' : '') + '</div>' +
        (parsed.errors.length ? renderErrors(parsed.errors) : '') +
        (parsed.items.length
          ? '<table class="tbl"><thead><tr><th>题目</th><th>你的备注</th><th>状态</th></tr></thead><tbody>' +
          parsed.items.map(function (it) {
            var received = KY.push.isReceived(it.questionId);
            return '<tr><td>' + esc(U.truncate(it.question.stem, 44)) +
              '<div style="font-size:11px;color:var(--text-3)">' + esc(it.questionId) + '</div></td>' +
              '<td>' + (it.note ? esc(it.note) : '<span style="color:var(--text-3)">—</span>') + '</td>' +
              '<td>' + (received ? ui.tag('她已收下', 'tag-ok') : ui.tag('等她收下', 'tag-warn')) + '</td>' +
              '</tr>';
          }).join('') + '</tbody></table>'
          : '');
      return parsed;
    }

    mount.querySelector('#w-check').addEventListener('click', function () { pushResult(); });

    mount.querySelector('#w-export').addEventListener('click', function () {
      var parsed = pushResult();
      if (!parsed.items.length) { U.toast('清单里还没有能识别的题目', 'error'); return; }
      var opts = {
        title: mount.querySelector('#w-title').value.trim(),
        note: mount.querySelector('#w-note').value.trim(),
        source: 'console'
      };
      U.downloadText('push.shared.js', KY.push.buildSharedJs(parsed.items, opts), 'text/javascript');
      ui.alertBox(
        '已生成推送文件（' + parsed.items.length + ' 题）。\n\n' +
        '1. 用它覆盖项目的 src/data/push.shared.js\n' +
        '2. 双击 发布.cmd\n' +
        '3. 把 dist 里的内容重新上传\n\n' +
        '她刷新后会看到「布置给你的错题」，点「全部收下」就进她自己的错题本。',
        { title: '推送文件已生成' }
      );
    });

    mount.querySelector('#w-export-json').addEventListener('click', function () {
      var parsed = KY.push.parseText(pushText.value);
      if (!parsed.items.length) { U.toast('清单里还没有能识别的题目', 'error'); return; }
      var opts = {
        title: mount.querySelector('#w-title').value.trim(),
        note: mount.querySelector('#w-note').value.trim()
      };
      U.downloadText('共享错题推送.json', KY.push.buildSharedJson(parsed.items, opts), 'application/json');
      ui.alertBox(
        '已生成 共享错题推送.json。\n\n' +
        '放到项目根目录 → 双击 发布.cmd，脚本会自动打包。',
        { title: '共享错题推送 JSON 已生成' }
      );
    });

    void ctx;
  };
})(window);
