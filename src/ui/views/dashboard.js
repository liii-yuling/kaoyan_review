/*!
 * views/dashboard.js —— 总览（真题墙风格）
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var SUBJECT_ICON = { english1: '英', math1: '数', signals: '信', politics: '政' };

  KY.views.dashboard = function (ctx, mount) {
    ui.setTitle('总览');

    var stats = KY.bank.stats();
    var wrongbook = KY.store.getWrongbook();
    var mastery = KY.store.getMastery();
    var exams = KY.store.getExams();
    var profile = KY.store.getProfile();
    var userBank = KY.importer.getUserBank();

    /* ---- 考试倒计时 ---- */
    var countdownHtml = '';
    if (profile.examDate) {
      var d = new Date(profile.examDate + 'T00:00:00');
      var days = Math.ceil((d.getTime() - Date.now()) / 86400000);
      if (!isNaN(days)) {
        countdownHtml = '<div class="stat"><div class="num" style="color:' +
          (days < 60 ? 'var(--err)' : 'var(--brand)') + '">' + (days > 0 ? days : 0) +
          '<span style="font-size:14px;font-weight:500"> 天</span></div>' +
          '<div class="lbl">距 ' + esc(profile.examDate) + '</div></div>';
      }
    } else {
      countdownHtml = '<div class="stat"><div class="num" style="color:var(--text-3);font-size:19px">未设置</div>' +
        '<div class="lbl"><a href="#/settings">去设置考试日期</a></div></div>';
    }

    /* ---- 科目数据 ---- */
    var subjectRows = KY.SUBJECTS.map(function (sub) {
      var pts = KY.getPoints(sub);
      var sum = 0, weak = 0, untested = 0;
      pts.forEach(function (x) {
        var m = mastery[x.point.id];
        var sc = m && typeof m.score === 'number' ? m.score : 0.35;
        sum += sc;
        if (sc < 0.6) weak++;
        if (!m || !m.attempts) untested++;
      });
      var qs = KY.bank.bySubject(sub);
      var years = qs.map(function (x) { return x.year; }).filter(Boolean).sort(function (a, b) { return a - b; });
      var realCount = years.length;
      return {
        subject: sub,
        name: KY.subjectName(sub),
        avg: pts.length ? sum / pts.length : 0,
        weak: weak,
        untested: untested,
        totalPoints: pts.length,
        bankCount: qs.length,
        userCount: qs.filter(function (x) { return x.userImported; }).length,
        realCount: realCount,
        yearRange: years.length ? (years[0] === years[years.length - 1]
          ? (years[0] + '') : (years[0] + '–' + years[years.length - 1])) : '',
        wrongCount: wrongbook.filter(function (w) { return w.subject === sub && !w.mastered; }).length,
        videoBound: qs.filter(function (x) { return KY.video.hasBvid(x); }).length,
        papers: KY.bank.papers(sub).length
      };
    });

    /* ---- 科目墙卡片 ---- */
    var SUBJECT_BG = {
      english1: 'linear-gradient(135deg,#4f7cff,#6a5bf0)',
      math1: 'linear-gradient(135deg,#12a06a,#3ec98f)',
      signals: 'linear-gradient(135deg,#e08a2e,#f0b357)',
      politics: 'linear-gradient(135deg,#db4a45,#ef7570)'
    };

    var wallCards = subjectRows.map(function (r) {
      return '<a class="wall-card" href="#/subject/' + r.subject + '">' +
        '<div class="wall-cover" style="background:' + SUBJECT_BG[r.subject] + '">' +
        SUBJECT_ICON[r.subject] +
        '<span class="yrs">' + (r.yearRange ? (r.yearRange + ' 真题 ' + r.realCount + ' 题') : (r.bankCount + ' 题题库')) + '</span>' +
        (r.papers ? '<span class="wall-badge">' + r.papers + ' 套卷</span>' : '') +
        '</div>' +
        '<div class="wall-body">' +
        '<div class="ttl">' + esc(r.name) + '</div>' +
        '<div class="sub">' +
        (r.wrongCount ? (r.wrongCount + ' 道错题待攻克 · ') : '暂无待攻克错题 · ') +
        '未掌握 ' + r.weak + ' 个考点' +
        '</div>' +
        '<div style="margin:9px 0 6px">' + ui.masteryBar(r.avg) + '</div>' +
        '<div class="metrics">' +
        '<span>掌握度 <b>' + U.pct(r.avg) + '</b></span>' +
        '<span>题库 <b>' + r.bankCount + '</b>' + (r.userCount ? ' (+' + r.userCount + ')' : '') + '</span>' +
        '<span>已绑视频 <b>' + r.videoBound + '</b></span>' +
        '</div>' +
        '</div>' +
        '</a>';
    }).join('');

    /* ---- 今日推送预览 ---- */
    var daily = KY.recommender.recommend({ mode: 'daily', count: 5 });
    var dailyHtml;
    if (!daily.items.length) {
      dailyHtml = '<p style="color:var(--text-3);font-size:13px;margin:0">题库为空，请先到「题库导入」灌题。</p>';
    } else {
      dailyHtml = daily.items.map(function (it, i) {
        var q = it.question;
        return '<div class="item" style="margin-bottom:8px;padding:10px 13px">' +
          '<div class="item-head" style="margin-bottom:4px">' +
          '<span class="q-no">' + (i + 1) + '</span>' + ui.subTag(q.subject) +
          (q.year ? ui.tag(q.year + ' 真题', 'tag-real') : '') +
          (q.difficulty ? ui.tag('难度 ' + '★'.repeat(q.difficulty)) : '') +
          '</div>' +
          '<div style="font-size:13px;color:var(--text-2);line-height:1.6">' +
          esc(U.truncate(q.stem, 90)) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-3);margin-top:5px">📌 ' + esc(it.reason) + '</div>' +
          '</div>';
      }).join('');
    }

    /* ---- 最近错题 ---- */
    var recent = wrongbook.slice(0, 5);
    var recentHtml = recent.length
      ? recent.map(function (w) {
        return '<div class="item" style="margin-bottom:8px;padding:10px 13px">' +
          '<div class="item-head" style="margin-bottom:4px">' +
          ui.subTag(w.subject) + ui.tag(KY.getErrorType(w.errorType).name) +
          '<span class="spacer"></span><span>' + U.fmtRelative(w.createdAt) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text-2)">' + esc(U.truncate(w.stem, 80)) + '</div>' +
          '<div style="margin-top:6px">' + ui.knowledgeChips(w.knowledge, { clickable: false }) + '</div>' +
          '</div>';
      }).join('')
      : '<p style="color:var(--text-3);font-size:13px;margin:0">错题本还是空的。去「错题本 → 上传错题」把做错的题拍照或粘贴进来，系统会自动识别考点与错因。</p>';

    /* ---- 最近成绩 ---- */
    var examsHtml = exams.length
      ? '<table class="tbl"><thead><tr><th>试卷</th><th>得分</th><th class="num">正确率</th><th class="num">用时</th><th>时间</th></tr></thead><tbody>' +
      exams.slice(0, 6).map(function (e) {
        return '<tr><td>' + esc(U.truncate(e.title, 34)) + '</td>' +
          '<td><b>' + U.fmtScore(e.total.got) + '</b> / ' + U.fmtScore(e.total.full) + '</td>' +
          '<td class="num">' + U.pct(e.objective.accuracy) + '</td>' +
          '<td class="num">' + U.fmtClock(e.durationUsedSec || 0) + '</td>' +
          '<td>' + U.fmtDate(e.finishedAt, true) + '</td></tr>';
      }).join('') + '</tbody></table>'
      : '<p style="color:var(--text-3);font-size:13px;margin:0">还没有考试记录。去「考试模式」用真题或智能组卷做一次限时训练。</p>';

    /* ---- 今日计划（运营者布置的） ---- */
    var todayRes = KY.plan.resolveToday();
    var planCardHtml = '';
    if (todayRes.plan) {
      var tps = KY.plan.planStats(todayRes.plan);
      var pendingPushN = KY.push.pending().length;
      var undone = todayRes.plan.tasks.filter(function (t) {
        return !KY.plan.isDone(todayRes.plan.id, t.id);
      }).slice(0, 4);

      planCardHtml = '<div class="card" style="border-color:#cddaff">' +
        '<div class="card-head">' +
        '<div><h3 class="card-title">☑ 今日计划 · ' + esc(todayRes.plan.title) + '</h3>' +
        '<p class="card-sub" style="margin:0">完成 ' + tps.done + ' / ' + tps.total +
        (tps.estMin ? (' · 预计 ' + tps.doneMin + ' / ' + tps.estMin + ' 分钟') : '') +
        (pendingPushN ? (' · <b style="color:var(--err)">另有 ' + pendingPushN + ' 道布置的错题待收下</b>') : '') +
        '</p></div>' +
        '<span class="spacer"></span>' +
        '<div style="min-width:120px">' + ui.masteryBar(tps.pct) + '</div>' +
        '<a class="btn btn-sm btn-primary" href="#/plan">打开今日计划</a>' +
        '</div>' +
        (undone.length
          ? undone.map(function (t) {
            var km = { practice: '✎', exam: '⏱', plain: '☑' }[t.kind] || '☑';
            return '<div class="plan-task">' +
              '<label class="checkbox plan-check">' +
              '<input type="checkbox" data-plan-task="' + esc(todayRes.plan.id) + '|' + esc(t.id) + '">' +
              '<span class="plan-text">' + km + ' ' + esc(t.text) + '</span></label>' +
              '<span class="plan-meta">' +
              (t.subject ? ui.subTag(t.subject) : '') +
              (t.estMin ? ui.tag(t.estMin + ' 分钟') : '') +
              '</span></div>';
          }).join('')
          : '<div class="hint-box ok" style="margin:0">今天的任务都完成了 🎉</div>') +
        '</div>';
    } else {
      planCardHtml = '<div class="card">' +
        '<h3 class="card-title">☑ 今日计划</h3>' +
        '<p class="card-sub" style="margin:0">还没有收到计划。发布者发布后，你刷新页面就能看到今天该做什么。</p>' +
        '</div>';
    }

    /* ---- 渲染 ---- */
    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>考研定制化复习' + (profile.name ? ('，' + esc(profile.name)) : '') + '</h2>' +
      '<p>' + KY.SUBJECTS.map(function (x) { return KY.subjectName(x); }).join(' · ') +
      ' 四科一站式复习：错题自动归类、按未掌握考点推题、真题逐题视频详解、限时模考自动判分。</p>' +
      '<div class="slogans">' +
      '<span>▦ 历年真题，尽收眼底</span>' +
      '<span>▶ 名师视频，一题多讲</span>' +
      '<span>✎ 错题归类，自动总结</span>' +
      '<span>☑ 刷题记录，一目了然</span>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-4" style="margin-bottom:18px">' +
      countdownHtml +
      ui.stat(stats.total, '题库总题量（真题 ' + stats.realCount +
        ' 题' + (userBank.length ? ' · 自建 ' + userBank.length + ' 题' : '') + '）') +
      ui.stat(wrongbook.filter(function (w) { return !w.mastered; }).length, '待攻克错题') +
      ui.stat(exams.length, '累计模考次数') +
      '</div>' +

      planCardHtml +

      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">四科真题墙</h3>' +
      '<p class="card-sub" style="margin:0">点科目进入该科的板块掌握、真题套卷与错题</p></div>' +
      '<span class="spacer"></span>' +
      '<a class="btn btn-sm" href="#/progress">掌握度报告</a>' +
      '<a class="btn btn-sm" href="#/import">导入题库</a>' +
      '</div>' +
      '<div class="wall-grid">' + wallCards + '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">今日定制推送</h3>' +
      '<p class="card-sub" style="margin:0">系统按你的薄弱考点、错题分布与遗忘曲线实时生成</p></div></div>' +
      dailyHtml +
      '<div style="margin-top:12px"><a class="btn btn-primary" href="#/review">开始今日推送</a> ' +
      '<a class="btn" href="#/review?mode=wrong">只练错题考点</a></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">最近上传的错题</h3>' +
      '<p class="card-sub" style="margin:0">' + (wrongbook.length ? '共 ' + wrongbook.length + ' 条' : '') + '</p></div>' +
      '<span class="spacer"></span><a class="btn btn-sm btn-primary" href="#/wrongbook?action=upload">上传错题</a></div>' +
      recentHtml +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">最近模考成绩</h3></div>' +
      '<span class="spacer"></span><a class="btn btn-sm" href="#/exam">去考试</a></div>' +
      examsHtml +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">快捷入口</h3>' +
      '<div class="row" style="margin-top:10px">' +
      '<a class="btn" href="#/papers">英语一真题墙 + B站逐题详解</a>' +
      '<a class="btn" href="#/review?mode=weak">未掌握考点专项</a>' +
      '<a class="btn" href="#/bank">题库检索</a>' +
      '<a class="btn btn-primary" href="#/import">题库导入（CSV/JSON）</a>' +
      '<a class="btn" href="#/wrongbook">错题本</a>' +
      '<a class="btn" href="#/exam">考试模式</a>' +
      '<a class="btn" href="#/settings">视频绑定管理</a>' +
      '</div></div>';

    /* 首页的今日计划卡片也能直接打勾 */
    mount.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.hasAttribute || !t.hasAttribute('data-plan-task')) return;
      var parts = t.getAttribute('data-plan-task').split('|');
      KY.plan.setDone(parts[0], parts[1], t.checked);
      KY.router.refresh();
    });
  };
})(window);
