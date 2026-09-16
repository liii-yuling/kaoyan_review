/*!
 * views/subject.js —— 单个科目主页
 * 路由： #/subject/<subjectCode>
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  KY.views.subject = function (ctx, mount) {
    var subject = ctx.params[0] || 'english1';
    if (KY.SUBJECTS.indexOf(subject) < 0) {
      mount.innerHTML = ui.empty('科目不存在', '未知科目代码：' + subject,
        '<a class="btn btn-primary" href="#/dashboard">回到总览</a>');
      return;
    }

    var subName = KY.subjectName(subject);
    ui.setTitle(subName);

    var mastery = KY.store.getMastery();
    var wrongbook = KY.store.getWrongbook().filter(function (w) { return w.subject === subject; });
    var modules = KY.getModules(subject);
    var bankCount = KY.bank.countBySubject(subject);

    /* ---- 模块表 ---- */
    var rows = [];
    modules.forEach(function (m) {
      var pool = KY.bank.byModule(m.id);
      var sum = 0, weak = 0, tested = 0;
      m.points.forEach(function (p) {
        var mm = mastery[p.id];
        var s = mm && typeof mm.score === 'number' ? mm.score : 0.35;
        sum += s;
        if (s < 0.6) weak++;
        if (mm && mm.attempts) tested++;
      });
      var avg = m.points.length ? sum / m.points.length : 0;
      var wrongCount = wrongbook.filter(function (w) { return w.module === m.id && !w.mastered; }).length;
      rows.push({
        module: m,
        poolSize: pool.length,
        avg: avg,
        weak: weak,
        tested: tested,
        pointCount: m.points.length,
        wrongCount: wrongCount
      });
    });

    var moduleHtml = rows.map(function (r) {
      return '' +
        '<div class="item">' +
        '<div class="item-head">' +
        '<b style="font-size:14px;color:var(--text)">' + esc(r.module.name) + '</b>' +
        (r.module.desc ? '<span>' + esc(r.module.desc) + '</span>' : '') +
        '<span class="spacer"></span>' +
        (r.wrongCount ? ui.tag(r.wrongCount + ' 错题待攻克', 'tag-err') : '') +
        '</div>' +
        '<div class="row" style="margin-bottom:8px">' +
        '<span style="font-size:12.5px;color:var(--text-3);flex:0 0 48px">掌握度</span>' +
        '<span style="flex:1;max-width:280px">' + ui.masteryBar(r.avg) + '</span>' +
        '<b style="font-size:13px">' + U.pct(r.avg) + '</b>' +
        '<span style="font-size:12px;color:var(--text-3)">题库 ' + r.poolSize + ' 题 · 考点 ' +
        r.pointCount + ' 个 · 未掌握 ' + r.weak + ' 个</span>' +
        '</div>' +
        '<div class="row tight">' +
        '<a class="btn btn-sm btn-primary" href="#/review?mode=weak&subject=' + subject + '&module=' + encodeURIComponent(r.module.id) + '">练这个板块</a>' +
        '<a class="btn btn-sm" href="#/bank?subject=' + subject + '&module=' + encodeURIComponent(r.module.id) + '">看题目（' + r.poolSize + '）</a>' +
        (r.wrongCount ? '<a class="btn btn-sm" href="#/wrongbook?subject=' + subject + '">看错题（' + r.wrongCount + '）</a>' : '') +
        '</div>' +
        '</div>';
    }).join('');

    /* ---- 该科薄弱考点 ---- */
    var weak = KY.recommender.weakPoints(subject).slice(0, 10);
    var weakHtml = weak.map(function (w) {
      return '<div class="mastery-row">' +
        '<span class="nm" title="' + esc(w.moduleName + ' / ' + w.name) + '">' + esc(w.name) + '</span>' +
        '<span>' + ui.masteryBar(w.score) + '</span>' +
        '<span class="sc">' + U.pct(w.score) + '</span>' +
        '</div>';
    }).join('');

    /* ---- 该科最近错题 ---- */
    var recentWrong = wrongbook.slice(0, 6);
    var recentWrongHtml = recentWrong.length ? recentWrong.map(function (w) {
      return '<div class="item" style="padding:10px 13px">' +
        '<div class="item-head" style="margin-bottom:4px">' +
        ui.tag(KY.getErrorType(w.errorType).name) +
        '<span class="spacer"></span><span>' + U.fmtRelative(w.createdAt) + '</span>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-2)">' + esc(U.truncate(w.stem, 76)) + '</div>' +
        '<div style="margin-top:6px">' + ui.knowledgeChips(w.knowledge) + '</div>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-3);font-size:13px;margin:0">本科目还没有错题记录。</p>';

    var isEnglish = subject === 'english1';
    var papers = KY.bank.papers(subject);
    var userCount = KY.bank.bySubject(subject).filter(function (x) { return x.userImported; }).length;
    var videoBound = KY.bank.bySubject(subject).filter(function (x) { return KY.video.hasBvid(x); }).length;

    mount.innerHTML = '' +
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">' + ui.subTag(subject) + ' ' + esc(subName) + '</h3>' +
      '<p class="card-sub" style="margin:0">题库 ' + bankCount + ' 题' +
      (userCount ? '（含我导入的 ' + userCount + ' 题）' : '') +
      ' · 板块 ' + modules.length +
      ' 个 · 考点 ' + KY.getPoints(subject).length + ' 个 · 错题 ' + wrongbook.length + ' 条' +
      (videoBound ? ' · 已绑视频 ' + videoBound + ' 题' : '') +
      (papers.length ? ' · 真题套卷 ' + papers.length + ' 套' : '') + '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row">' +
      '<a class="btn btn-primary" href="#/review?mode=weak&subject=' + subject + '">本科目专项练</a>' +
      '<a class="btn" href="#/bank?subject=' + subject + '">题库</a>' +
      '<a class="btn" href="#/import">导入题库</a>' +
      (isEnglish ? '<a class="btn" href="#/papers">真题墙 + B站详解</a>' : '') +
      '</div></div>' +
      (isEnglish
        ? '<div class="hint-box">英语一栏目是<b>真题墙</b>布局：每道题都配「查看答案与详解」跳转按钮，' +
        '答案块里带 B站视频入口（支持一题绑多个视频）。想自己做一遍就用「考试模式」，那里不会渲染任何答案。</div>'
        : '<div class="hint-box">题库里的每道题都能用「查看答案与详解」按钮展开答案、解析与视频。' +
        '想补充自己的题库，点右上角「导入题库」，支持 Excel/CSV 与 JSON。</div>') +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">板块掌握情况</h3>' +
      '<p class="card-sub">点击「练这个板块」会按该板块内你的薄弱考点推题</p>' +
      moduleHtml +
      '</div>' +
      '<div>' +
      '<div class="card">' +
      '<h3 class="card-title">本科目最薄弱的 10 个考点</h3>' +
      '<p class="card-sub">掌握度低于 60% 即为未掌握，会被优先推送</p>' +
      weakHtml +
      '<div style="margin-top:12px"><a class="btn btn-primary btn-sm" href="#/review?mode=weak&subject=' + subject + '">按这些考点推题</a></div>' +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">本科目最近错题</h3>' +
      recentWrongHtml +
      '<div style="margin-top:12px"><a class="btn btn-sm" href="#/wrongbook?subject=' + subject + '">进入错题本</a>' +
      '<a class="btn btn-sm btn-primary" style="margin-left:6px" href="#/wrongbook?action=upload&subject=' + subject + '">上传错题</a></div>' +
      '</div>' +
      '</div>' +
      '</div>';
  };
})(window);
