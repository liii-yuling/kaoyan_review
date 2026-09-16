/*!
 * views/progress.js —— 掌握度报告
 * 路由： #/progress[?subject=]
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  KY.views.progress = function (ctx, mount) {
    var q = ctx.query || {};
    var subject = q.subject || '';
    ui.setTitle('掌握度报告');

    var mastery = KY.store.getMastery();
    var wrongbook = KY.store.getWrongbook();
    var exams = KY.store.getExams();
    var practice = KY.store.getPracticeHistory();

    /* ---- 总体 ---- */
    var allPoints = [];
    (subject ? [subject] : KY.SUBJECTS).forEach(function (sub) {
      KY.getPoints(sub).forEach(function (x) {
        var m = mastery[x.point.id];
        allPoints.push({
          pid: x.point.id,
          name: x.point.name,
          module: x.module.name,
          moduleId: x.module.id,
          subject: sub,
          score: m && typeof m.score === 'number' ? m.score : 0.35,
          attempts: (m && m.attempts) || 0,
          correct: (m && m.correct) || 0,
          lastAt: (m && m.lastAt) || 0
        });
      });
    });

    var tested = allPoints.filter(function (p) { return p.attempts > 0; });
    var mastered = allPoints.filter(function (p) { return p.score >= 0.75; });
    var unmastered = allPoints.filter(function (p) { return p.score < 0.6; });
    var untouched = allPoints.filter(function (p) { return p.attempts === 0; });
    var avg = allPoints.length ? allPoints.reduce(function (a, p) { return a + p.score; }, 0) / allPoints.length : 0;

    /* ---- 分科 ---- */
    var subRows = (subject ? [subject] : KY.SUBJECTS).map(function (sub) {
      var pts = allPoints.filter(function (p) { return p.subject === sub; });
      var a = pts.length ? pts.reduce(function (x, p) { return x + p.score; }, 0) / pts.length : 0;
      var w = pts.filter(function (p) { return p.score < 0.6; }).length;
      var t = pts.filter(function (p) { return p.attempts > 0; }).length;
      var wrong = wrongbook.filter(function (x) { return x.subject === sub && !x.mastered; }).length;
      return { sub: sub, avg: a, weak: w, tested: t, total: pts.length, wrong: wrong };
    });

    var subRowsHtml = subRows.map(function (r) {
      var color = r.avg >= 0.75 ? 'var(--ok)' : (r.avg >= 0.6 ? 'var(--warn)' : 'var(--err)');
      return '<tr>' +
        '<td>' + ui.subTag(r.sub) + '</td>' +
        '<td style="min-width:140px">' + ui.masteryBar(r.avg) + '</td>' +
        '<td class="num" style="color:' + color + ';font-weight:700">' + U.pct(r.avg) + '</td>' +
        '<td class="num">' + r.tested + ' / ' + r.total + '</td>' +
        '<td class="num">' + r.weak + '</td>' +
        '<td class="num">' + r.wrong + '</td>' +
        '<td><a class="btn btn-sm btn-ghost" href="#/subject/' + r.sub + '">详情</a></td>' +
        '</tr>';
    }).join('');

    /* ---- 分模块 ---- */
    var moduleRows = [];
    (subject ? [subject] : KY.SUBJECTS).forEach(function (sub) {
      KY.getModules(sub).forEach(function (m) {
        var pts = allPoints.filter(function (p) { return p.moduleId === m.id; });
        if (!pts.length) return;
        var a = pts.reduce(function (x, p) { return x + p.score; }, 0) / pts.length;
        var w = pts.filter(function (p) { return p.score < 0.6; }).length;
        moduleRows.push({ sub: sub, module: m, avg: a, weak: w, total: pts.length });
      });
    });
    moduleRows.sort(function (a, b) { return a.avg - b.avg; });

    var moduleHtml = moduleRows.map(function (r) {
      return '<div class="mastery-row">' +
        '<span class="nm" title="' + esc(KY.subjectName(r.sub) + ' / ' + r.module.name) + '">' +
        ui.subTag(r.sub) + ' ' + esc(r.module.name) + '</span>' +
        '<span>' + ui.masteryBar(r.avg) + '</span>' +
        '<span class="sc">' + U.pct(r.avg) + '</span>' +
        '</div>';
    }).join('');

    /* ---- 最薄弱的 20 个考点 ---- */
    var weakest = allPoints.slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 20);
    var weakestHtml = weakest.map(function (p) {
      return '<div class="mastery-row">' +
        '<span class="nm" title="' + esc(p.module + ' / ' + p.name) + '">' +
        esc(p.name) + ' <span style="color:var(--text-3);font-size:11.5px">' +
        esc(KY.subjectName(p.subject)) + ' · ' + esc(p.module) + '</span></span>' +
        '<span>' + ui.masteryBar(p.score) + '</span>' +
        '<span class="sc">' + U.pct(p.score) + '</span>' +
        '</div>';
    }).join('');

    /* ---- 错因统计 ---- */
    var errCount = {};
    wrongbook.forEach(function (w) {
      var k = w.errorType || 'unknown';
      errCount[k] = (errCount[k] || 0) + 1;
    });
    var errHtml = KY.ERROR_TYPES.filter(function (e) { return errCount[e.id]; }).map(function (e) {
      var c = errCount[e.id];
      return '<div class="mastery-row">' +
        '<span class="nm">' + esc(e.name) + ' <span style="color:var(--text-3);font-size:11.5px">' +
        esc(e.desc) + '</span></span>' +
        '<span>' + ui.masteryBar(c / Math.max(1, wrongbook.length)) + '</span>' +
        '<span class="sc">' + c + ' 条</span>' +
        '</div>';
    }).join('') || '<p style="color:var(--text-3);font-size:13px;margin:0">还没有错题数据。</p>';

    /* ---- 趋势 ---- */
    var trendSrc = exams.map(function (e) {
      return { at: e.finishedAt, label: e.title, ratio: e.total.full ? e.total.got / e.total.full : 0 };
    }).concat(practice.map(function (p) {
      return { at: p.at, label: '练习（' + (p.mode || '') + '）', ratio: p.accuracy || 0 };
    })).sort(function (a, b) { return a.at - b.at; }).slice(-20);

    var trendHtml = trendSrc.length
      ? '<div class="row" style="align-items:flex-end;gap:5px;height:130px;padding:8px 0">' +
      trendSrc.map(function (t) {
        var h = Math.max(4, t.ratio * 110);
        var color = t.ratio >= 0.8 ? 'var(--ok)' : (t.ratio >= 0.6 ? 'var(--warn)' : 'var(--err)');
        return '<div style="flex:1;min-width:9px;text-align:center" title="' +
          esc(U.fmtDate(t.at) + ' ' + t.label + ' ' + U.pct(t.ratio)) + '">' +
          '<div style="height:' + h + 'px;background:' + color + ';border-radius:3px 3px 0 0"></div>' +
          '<div style="font-size:9px;color:var(--text-3);margin-top:3px">' +
          esc(U.fmtDate(t.at).slice(5)) + '</div></div>';
      }).join('') + '</div>'
      : '<p style="color:var(--text-3);font-size:13px;margin:0">做一次练习或模考后，这里会显示成绩趋势。</p>';

    mount.innerHTML = '' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">掌握度总览</h3>' +
      '<p class="card-sub" style="margin:0">掌握度 = 作答结果 + 错题上报的累积估计；低于 60% 视为未掌握，会被优先推送</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="segmented">' +
      '<button class="' + (subject === '' ? 'on' : '') + '" data-psub="">全部</button>' +
      KY.SUBJECTS.map(function (s) {
        return '<button class="' + (subject === s ? 'on' : '') + '" data-psub="' + s + '">' + KY.subjectName(s) + '</button>';
      }).join('') + '</div>' +
      '</div>' +

      '<div class="grid grid-4">' +
      ui.stat(U.pct(avg), '总体掌握度') +
      ui.stat(mastered.length, '已掌握考点（≥75%）') +
      ui.stat(unmastered.length, '未掌握考点（<60%）') +
      ui.stat(untouched.length, '从未练过的考点') +
      '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">分科掌握度</h3>' +
      '<table class="tbl"><thead><tr><th>科目</th><th>掌握度</th><th class="num">数值</th>' +
      '<th class="num">已练/总</th><th class="num">未掌握</th><th class="num">待攻克错题</th><th></th></tr></thead>' +
      '<tbody>' + subRowsHtml + '</tbody></table>' +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">成绩趋势（最近 20 次）</h3>' +
      trendHtml +
      '<div style="font-size:12px;color:var(--text-3)">绿 ≥80%，黄 60~80%，红 &lt;60%</div>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">板块掌握度（由弱到强）</h3>' +
      '<p class="card-sub">从上往下就是你应该攻克的顺序</p>' +
      moduleHtml +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">错因分布</h3>' +
      '<p class="card-sub">看清自己是"不会"还是"马虎"，复习策略完全不同</p>' +
      errHtml +
      (errCount.careless || errCount.calculation
        ? '<div class="hint-box warn" style="margin-top:12px">你的错题里「计算失误 / 粗心」占比不低——' +
        '这类失分靠"交卷前专项检查"就能捞回来，比补知识点性价比高得多。</div>'
        : '') +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">最薄弱的 20 个考点</h3>' +
      '<p class="card-sub" style="margin:0">点右侧按钮可以只针对这些考点推题</p></div>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm" id="p-drill-top5">练最强 5 个薄弱点</button>' +
      '<button class="btn btn-sm btn-primary" id="p-drill-all">针对全部薄弱点推 20 题</button>' +
      '</div>' +
      weakestHtml +
      '</div>';

    /* ---- 事件 ---- */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('[data-psub]');
      if (b) {
        KY.router.go('progress', { query: { subject: b.getAttribute('data-psub') } });
      }
    });

    document.getElementById('p-drill-top5').addEventListener('click', function () {
      var pts = weakest.slice(0, 5).map(function (p) { return p.pid; });
      KY.router.go('review', { query: { mode: 'subject', points: pts.join(','), count: 10 } });
    });

    document.getElementById('p-drill-all').addEventListener('click', function () {
      var pts = unmastered.slice(0, 30).map(function (p) { return p.pid; });
      if (!pts.length) { U.toast('暂时没有未掌握考点', 'info'); return; }
      KY.router.go('review', { query: { mode: 'subject', points: pts.join(','), count: 20 } });
    });

    void tested;
  };
})(window);
