/*!
 * views/papers.js —— 英语一历年真题墙 + 逐题 B站详解
 * 路由： #/papers                       真题墙（套卷卡片 + 考点目录）
 *        #/papers/<paperId>             套卷详情（题目 + 「查看答案与详解」跳转）
 *
 * 视觉与交互借鉴 zhentiqiang.com 的真题墙：
 *   科目/年份卡片墙、考点目录、"显示题号/显示难度"开关、一题多讲视频。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var HERO_SLOGANS = [
    ['▦', '历年真题，尽收眼底'],
    ['▶', '名师视频，一题多讲'],
    ['☑', '刷题记录，一目了然']
  ];

  function heroHtml() {
    return '<div class="hero">' +
      '<h2>英语（一）历年真题墙</h2>' +
      '<p>按年份与板块汇编的真题精练卷，每道题都配「查看答案与详解」跳转与 B站视频讲解入口。' +
      '支持限时考试模式与自动判分。</p>' +
      '<div class="slogans">' +
      HERO_SLOGANS.map(function (s) {
        return '<span>' + s[0] + ' ' + s[1] + '</span>';
      }).join('') +
      '</div>' +
      '</div>';
  }

  /* ================================================================== */
  /* 真题墙（列表）                                                      */
  /* ================================================================== */

  function renderList(mount, ctx) {
    ui.setTitle('历年真题 · 英语一');

    var q = ctx.query || {};
    var showNo = q.no !== '0';
    var showDiff = q.diff !== '0';

    var papers = KY.bank.papers('english1');
    var exams = KY.store.getExams();
    var realQs = KY.bank.bySubject('english1').filter(function (x) { return x.year; });

    if (!papers.length) {
      mount.innerHTML = heroHtml() + ui.empty(
        '还没有可用的真题套卷',
        '套卷由题库里带 year 字段的真题自动汇编。当前题库没有标注年份的英语一真题——' +
        '你可以在「题库导入」里把带年份的真题导进来，套卷会自动生成。',
        '<a class="btn btn-primary" href="#/import">去导入题库</a>'
      );
      return;
    }

    /* ---- 套卷卡片墙 ---- */
    var cards = papers.map(function (p) {
      var qs = KY.bank.paperQuestions(p);
      var score = KY.bank.paperScore(p);
      var done = exams.filter(function (e) { return e.paperId === p.id; });
      var best = done.length ? done.reduce(function (a, b) {
        return (b.total.got / Math.max(1, b.total.full)) > (a.total.got / Math.max(1, a.total.full)) ? b : a;
      }) : null;
      var videoCount = qs.filter(function (it) { return KY.video.hasBvid(it.question); }).length;
      var isByModule = !!p.isByModule;

      return '<a class="wall-card" href="#/papers/' + encodeURIComponent(p.id) + '">' +
        '<div class="wall-cover" style="background:linear-gradient(135deg,#4f7cff,#7a5cf0)">' +
        esc(isByModule ? '分板块' : (p.year + '')) +
        '<span class="yrs">' + (isByModule ? '跨年份汇编' : '考研英语一') + '</span>' +
        (isByModule ? '<span class="wall-badge">主力卷</span>' : '') +
        '</div>' +
        '<div class="wall-body">' +
        '<div class="ttl">' + esc(isByModule ? '历年真题 · 分板块精练卷' : (p.year + ' 年真题精练卷')) + '</div>' +
        '<div class="sub">' + esc(U.truncate(p.note || '', 64)) + '</div>' +
        '<div class="metrics">' +
        '<span>题量 <b>' + qs.length + '</b></span>' +
        '<span>总分 <b>' + U.fmtScore(score) + '</b></span>' +
        '<span>板块 <b>' + p.sections.length + '</b></span>' +
        '<span>已绑视频 <b>' + videoCount + '</b></span>' +
        (best ? '<span style="color:var(--ok)">最好 <b>' + U.fmtScore(best.total.got) + '</b></span>' : '') +
        '</div>' +
        '</div>' +
        '</a>';
    }).join('');

    /* ---- 按年份的紧凑列表 ---- */
    var yearRows = papers.map(function (p) {
      var qs = KY.bank.paperQuestions(p);
      var done = exams.filter(function (e) { return e.paperId === p.id; });
      return '<a class="wall-paper" href="#/papers/' + encodeURIComponent(p.id) + '">' +
        '<span class="yr">' + esc(p.isByModule ? '全部' : (p.year + '')) + '</span>' +
        '<span class="info">' +
        '<span class="t">' + esc(p.isByModule ? '历年真题 · 分板块精练卷' : (p.year + ' 年考研英语（一）真题精练卷')) + '</span>' +
        '<span class="d">' + qs.length + ' 题 · ' + (p.durationMin || 180) + ' 分钟 · 已练 ' + done.length + ' 次</span>' +
        '</span>' +
        '<span class="btn btn-sm">逐题详解 →</span>' +
        '</a>';
    }).join('');

    /* ---- 考点目录 ---- */
    var byPoint = {};
    realQs.forEach(function (x) {
      (x.knowledge || []).forEach(function (p) { byPoint[p] = (byPoint[p] || 0) + 1; });
    });
    var pointRows = Object.keys(byPoint).map(function (pid) {
      var n = KY.getTaxNode(pid);
      return { pid: pid, name: n ? n.point.name : pid, module: n ? n.moduleName : '', count: byPoint[pid] };
    }).sort(function (a, b) { return b.count - a.count; });

    var catalogHtml = pointRows.length
      ? '<div class="grid grid-3" style="gap:10px">' + pointRows.map(function (r) {
        return '<a class="item" style="margin:0;padding:10px 12px;text-decoration:none;color:inherit" ' +
          'href="#/bank?subject=english1&point=' + encodeURIComponent(r.pid) + '&ans=1">' +
          '<div style="font-size:13.5px;font-weight:600;margin-bottom:3px">' + esc(r.name) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-3)">' + esc(r.module) + ' · ' + r.count + ' 道真题</div>' +
          '</a>';
      }).join('') + '</div>'
      : '<p style="color:var(--text-3);font-size:13px;margin:0">题库里还没有带年份的英语一真题。</p>';

    /* ---- 渲染 ---- */
    mount.innerHTML = heroHtml() +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">真题墙</h3>' +
      '<p class="card-sub" style="margin:0">共 ' + papers.length + ' 套 · 收录 ' + realQs.length +
      ' 道标注年份的真题，覆盖 ' + Object.keys(byPoint).length + ' 个考点</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="display-toggles">' +
      '<label class="checkbox"><input type="checkbox" id="t-no"' + (showNo ? ' checked' : '') + '>显示题号</label>' +
      '<label class="checkbox"><input type="checkbox" id="t-diff"' + (showDiff ? ' checked' : '') + '>显示难度</label>' +
      '</div>' +
      '</div>' +
      '<div class="wall-grid">' + cards + '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">按年份浏览</h3>' +
      '<p class="card-sub">点进去逐题看解析与视频</p>' +
      yearRows +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">考点目录</h3>' +
      '<p class="card-sub" style="margin:0">点考点直接看该考点的真题</p></div></div>' +
      catalogHtml +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">关于这些套卷</h3>' +
      '<div class="hint-box" style="margin-bottom:10px">' +
      '按年份与板块从题库里带 <code>year</code> 字段的真题自动汇编，<b>是真题精选卷，不是考场完整原卷</b>' +
      '（完整原卷每套 52 题 / 100 分）。往题库补题，套卷会自动变长。' +
      '</div>' +
      '<div class="hint-box">' +
      '<b>关于 B站 视频：</b>点每道题的「查看答案与详解」，答案块底部就有视频入口。' +
      '默认走 B站搜索（关键词按题目与考点自动生成，真实可点）；' +
      '你也可以把常看的讲解视频 BV 号绑上去，<b>一道题可以绑多个（一题多讲）</b>，之后直接内嵌播放。' +
      '批量绑定入口在「设置与备份 → 视频绑定管理」。' +
      '</div>' +
      '</div>';

    /* ---- 事件 ---- */
    mount.querySelector('#t-no').addEventListener('change', function () {
      KY.router.go('papers', { query: { no: this.checked ? '1' : '0', diff: showDiff ? '1' : '0' } });
    });
    mount.querySelector('#t-diff').addEventListener('change', function () {
      KY.router.go('papers', { query: { no: showNo ? '1' : '0', diff: this.checked ? '1' : '0' } });
    });
  }

  /* ================================================================== */
  /* 套卷详情                                                            */
  /* ================================================================== */

  function renderDetail(mount, paperId, ctx) {
    var paper = KY.bank.paper(paperId);
    if (!paper) {
      mount.innerHTML = ui.empty('套卷不存在', '找不到套卷：' + paperId,
        '<a class="btn btn-primary" href="#/papers">返回真题墙</a>');
      return;
    }

    ui.setTitle(paper.title);

    var q = ctx.query || {};
    var showNo = q.no !== '0';
    var showDiff = q.diff !== '0';
    var onlyVideo = q.vid === '1';

    var items = KY.bank.paperQuestions(paper);
    if (onlyVideo) items = items.filter(function (it) { return KY.video.hasBvid(it.question); });

    var score = KY.bank.paperScore(paper);
    var boundTotal = KY.bank.paperQuestions(paper).filter(function (it) { return KY.video.hasBvid(it.question); }).length;

    /* 板块分组 */
    var sectionsHtml = (paper.sections || []).map(function (sec) {
      var secItems = items.filter(function (it) { return it.section && it.section.id === sec.id; });
      if (!secItems.length) return '';
      return '<div class="section-head">' +
        '<h3>' + esc(sec.name) + '</h3>' +
        '<p>' + esc(sec.desc || '') + (onlyVideo ? '' : ' · 本卷该板块 ' + secItems.length + ' 题') + '</p>' +
        '</div>' +
        secItems.map(function (it) {
          return ui.questionCard(it.question, {
            index: showNo ? (KY.bank.paperQuestions(paper).indexOf(it) + 1) : 0,
            mode: 'answer',
            answerJump: true,
            value: undefined,
            showDifficulty: showDiff,
            showVideo: false,
            embedVideo: KY.store.getSettings().video.preferEmbed,
            scoreText: U.fmtScore(it.score) + ' 分',
            sectionName: ''
          });
        }).join('');
    }).join('');

    mount.innerHTML = '' +
      '<div class="row" style="margin-bottom:14px">' +
      '<a class="btn btn-sm" href="#/papers">← 返回真题墙</a>' +
      '<span class="spacer"></span>' +
      '<a class="btn btn-primary btn-sm" href="#/exam?paper=' + encodeURIComponent(paper.id) + '">考试模式做这套（隐藏答案）</a>' +
      '<button class="btn btn-sm" id="expand-all">展开全部答案</button>' +
      '<button class="btn btn-sm" id="collapse-all">收起全部答案</button>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">' + esc(paper.title) + '</h3>' +
      '<p class="card-sub">' + esc(paper.note || '') + '</p>' +
      '<div class="paper-meta">' +
      '<span>题量 <b>' + KY.bank.paperQuestions(paper).length + '</b></span>' +
      '<span>总分 <b>' + U.fmtScore(score) + '</b></span>' +
      '<span>建议时长 <b>' + (paper.durationMin || 180) + ' 分钟</b></span>' +
      '<span>板块 <b>' + (paper.sections || []).length + '</b></span>' +
      '<span>已绑视频 <b>' + boundTotal + '</b></span>' +
      '</div>' +
      '<div class="display-toggles" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">' +
      '<label class="checkbox"><input type="checkbox" id="d-no"' + (showNo ? ' checked' : '') + '>显示题号</label>' +
      '<label class="checkbox"><input type="checkbox" id="d-diff"' + (showDiff ? ' checked' : '') + '>显示难度</label>' +
      '<label class="checkbox"><input type="checkbox" id="d-vid"' + (onlyVideo ? ' checked' : '') + '>只看已绑视频的题</label>' +
      '</div>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">' +
      '每道题答案默认收起。点题目下方的「<b>查看答案与详解 ↓</b>」即可展开正确答案、解析、考点与 B站视频，' +
      '并自动滚动到该处。想真正做一遍请点上方「考试模式做这套」——那里不会渲染任何答案。' +
      '</div>' +
      '</div>' +

      (items.length ? sectionsHtml
        : ui.empty('没有匹配的题目', onlyVideo ? '这套卷子里还没有绑定任何视频。' : '这套卷子没有题目。'));
    void q;

    /* 事件 */
    function go(patch) {
      var next = {
        no: showNo ? '1' : '0',
        diff: showDiff ? '1' : '0',
        vid: onlyVideo ? '1' : '0'
      };
      Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
      var query = {};
      Object.keys(next).forEach(function (k) { if (next[k] && next[k] !== '0') query[k] = next[k]; });
      KY.router.go('papers', { params: [paper.id], query: query });
    }

    mount.querySelector('#d-no').addEventListener('change', function () { go({ no: this.checked ? '1' : '0' }); });
    mount.querySelector('#d-diff').addEventListener('change', function () { go({ diff: this.checked ? '1' : '0' }); });
    mount.querySelector('#d-vid').addEventListener('change', function () { go({ vid: this.checked ? '1' : '0' }); });

    mount.querySelector('#expand-all').addEventListener('click', function () {
      var boxes = mount.querySelectorAll('.q-answer[hidden]');
      Array.prototype.forEach.call(boxes, function (b) { b.removeAttribute('hidden'); });
      var btns = mount.querySelectorAll('[data-jump-answer]');
      Array.prototype.forEach.call(btns, function (b) {
        b.textContent = '收起答案与详解 ↑';
        b.classList.remove('btn-primary');
      });
      U.toast('已展开全部答案', 'success');
    });

    mount.querySelector('#collapse-all').addEventListener('click', function () {
      var boxes = mount.querySelectorAll('.q-answer:not([hidden])');
      Array.prototype.forEach.call(boxes, function (b) { b.setAttribute('hidden', ''); });
      var btns = mount.querySelectorAll('[data-jump-answer]');
      Array.prototype.forEach.call(btns, function (b) {
        b.textContent = '查看答案与详解 ↓';
        b.classList.add('btn-primary');
      });
    });
  }

  KY.views.papers = function (ctx, mount) {
    if (ctx.params[0]) renderDetail(mount, decodeURIComponent(ctx.params[0]), ctx);
    else renderList(mount, ctx);
  };
})(window);
