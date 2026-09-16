/*!
 * views/plan.js —— 今日计划（使用者视角）
 * 路由： #/plan
 *
 * 她打开就看到今天该做什么，逐项打勾；刷题任务可以直接跳去刷题，
 * 考试任务可以直接开始考试；运营者布置的错题可以一键收进自己的错题本。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var KIND_META = {
    practice: { icon: '✎', name: '刷题', cls: 'tag-brand' },
    exam: { icon: '⏱', name: '考试', cls: 'tag-err' },
    plain: { icon: '☑', name: '任务', cls: '' }
  };

  /* ================================================================== */
  /* 渲染一个任务                                                        */
  /* ================================================================== */

  function taskHtml(plan, task) {
    var done = KY.plan.isDone(plan.id, task.id);
    var km = KIND_META[task.kind] || KIND_META.plain;
    var html = '';

    html += '<div class="plan-task' + (done ? ' done' : '') + '">';
    html += '<label class="checkbox plan-check">' +
      '<input type="checkbox" data-plan-task="' + esc(plan.id) + '|' + esc(task.id) + '"' +
      (done ? ' checked' : '') + '>' +
      '<span class="plan-text">' + esc(task.text) + '</span>' +
      '</label>';

    html += '<span class="plan-meta">';
    if (task.kind !== 'plain') html += ui.tag(km.icon + ' ' + km.name, km.cls);
    if (task.subject) html += ui.subTag(task.subject);
    if (task.estMin) html += ui.tag(task.estMin + ' 分钟');
    if (task.count) html += ui.tag(task.count + ' 题');
    html += '</span>';

    html += '<span class="plan-actions">';
    if (task.kind === 'practice') {
      var q = { mode: 'subject', subject: task.subject, count: task.count || 10 };
      if (task.points && task.points.length) q.points = task.points.join(',');
      else q.mode = 'weak';
      var href = '#/review?mode=' + q.mode + '&subject=' + encodeURIComponent(task.subject || '') +
        (q.points ? ('&points=' + encodeURIComponent(q.points)) : '') + '&count=' + q.count;
      html += '<a class="btn btn-sm btn-primary" href="' + href + '">去刷题</a>';
    } else if (task.kind === 'exam') {
      var exHref = task.paperId
        ? ('#/exam?paper=' + encodeURIComponent(task.paperId))
        : ('#/exam' + (task.subject ? ('?subject=' + task.subject) : ''));
      html += '<a class="btn btn-sm btn-primary" href="' + exHref + '">开始考试</a>';
      if (task.paperTitle) {
        html += '<a class="btn btn-sm btn-ghost" href="#/papers/' + encodeURIComponent(task.paperId) +
          '">看解析</a>';
      }
    }
    html += '</span>';
    html += '</div>';

    if (task.points && task.points.length) {
      html += '<div class="plan-points">' + ui.knowledgeChips(task.points) + '</div>';
    }

    return html;
  }

  /* ================================================================== */
  /* 主视图                                                              */
  /* ================================================================== */

  KY.views.plan = function (ctx, mount) {
    ui.setTitle('今日计划');

    var shared = KY.plan.getShared();
    var meta = KY.plan.getMeta();
    var today = KY.plan.resolveToday();
    var overall = KY.plan.overall();

    /* ---------- 没有任何计划 ---------- */
    if (!KY.plan.hasPlan()) {
      mount.innerHTML = '' +
        '<div class="hero">' +
        '<h2>今日计划</h2>' +
        '<p>这里会显示运营者给你安排的每日任务，做完直接打勾就行。</p>' +
        '<div class="slogans">' +
        '<span>☑ 每日任务清单</span>' +
        '<span>✎ 一键去刷题</span>' +
        '<span>⏱ 一键开始考试</span>' +
        '</div>' +
        '</div>' +
        ui.empty('还没有收到计划',
          '运营者还没发布每日计划。等他发布后，你刷新页面就会出现「有新版本」，' +
          '点一下刷新就能看到今天该做什么了。',
          '<a class="btn" href="#/dashboard">先去总览</a> <a class="btn" href="#/review">自己先刷题</a>');
      return;
    }

    /* ---------- 布置给我的错题 ---------- */
    var pushed = KY.push.resolved();
    var pendingPush = pushed.filter(function (r) { return !r.received; });
    var pushMeta = KY.push.getMeta();
    var pushShared = KY.push.getShared();

    var pushHtml = '';
    if (pushed.length) {
      pushHtml = '<div class="card" style="border-color:#f6c9c9;background:#fffafa">' +
        '<div class="card-head">' +
        '<div><h3 class="card-title">📌 ' + esc(pushShared.title || '布置给你的错题') +
        '（' + pushed.length + ' 题）</h3>' +
        '<p class="card-sub" style="margin:0">' +
        (pushShared.note ? esc(pushShared.note) + ' · ' : '') +
        (pendingPush.length
          ? ('还有 <b>' + pendingPush.length + '</b> 题没收下，收下后会进你的错题本并参与复习推送')
          : '已经全部收下 ✓ 它们都在你的错题本里') +
        (pushMeta.builtAt ? ' · 发布于 ' + esc(pushMeta.builtAt) : '') +
        '</p></div>' +
        '<span class="spacer"></span>' +
        (pendingPush.length
          ? '<button class="btn btn-primary" id="receive-all">全部收下（' + pendingPush.length + '）</button>'
          : '') +
        '</div>' +

        pushed.map(function (r) {
          return '<div class="item" style="margin-bottom:8px;padding:10px 13px;' +
            (r.received ? 'opacity:.62' : '') + '">' +
            '<div class="item-head" style="margin-bottom:4px">' +
            (r.received ? ui.tag('已收下', 'tag-ok') : ui.tag('待收下', 'tag-err')) +
            (r.question ? ui.subTag(r.question.subject) : '') +
            (r.missing ? ui.tag('题库里找不到这道题', 'tag-err') : '') +
            '<span class="spacer"></span>' +
            '<button class="btn btn-sm' + (r.received ? '' : ' btn-primary') + '" ' +
            'data-receive="' + esc(r.questionId) + '"' + (r.missing ? ' disabled' : '') + '>' +
            (r.received ? '再收一次' : '收下') + '</button>' +
            '</div>' +
            (r.note ? '<div class="push-note">💬 ' + esc(r.note) + '</div>' : '') +
            '<div style="font-size:13px;color:var(--text-2);line-height:1.6">' +
            esc(r.question ? U.truncate(r.question.stem, 110) : r.questionId) + '</div>' +
            '</div>';
        }).join('') +
        '</div>';
    }

    /* ---------- 今日任务 ---------- */
    var tp = today.plan;
    var ts = KY.plan.planStats(tp);
    var reasonText = {
      'matched-date': '已按日期匹配到今天',
      'next-unfinished': '今天没有指定日期的计划，这是你还没做完的第一天',
      'all-done': '所有计划都完成了，这里是最后一天（可以回头复习）',
      'empty': ''
    }[today.reason] || '';

    var todayHtml = '' +
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">' + esc(tp.title) + '</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (tp.date ? ('日期 ' + esc(tp.date) + ' · ') : '') +
      '第 ' + esc(tp.dayIndex) + ' 天 · ' +
      '完成 ' + ts.done + ' / ' + ts.total +
      (ts.estMin ? ' · 预计 ' + ts.doneMin + ' / ' + ts.estMin + ' 分钟' : '') +
      (reasonText ? ' · ' + esc(reasonText) : '') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      '<div style="min-width:140px">' + ui.masteryBar(ts.pct) + '</div>' +
      '</div>' +
      (tp.tasks.length
        ? tp.tasks.map(function (t) { return taskHtml(tp, t); }).join('')
        : '<p style="color:var(--text-3);font-size:13px;margin:0">这一天还没有任务。</p>') +
      (ts.allDone
        ? '<div class="hint-box ok" style="margin-top:12px;margin-bottom:0">' +
        '🎉 今天的任务全部完成。可以点下面的「下一份计划」往下走，或者去错题本复习一下。</div>'
        : '') +
      '</div>';

    /* ---------- 全部计划 ---------- */
    var allDaysHtml = KY.plan.allPlans().map(function (p, i) {
      var s = KY.plan.planStats(p);
      var isToday = tp && p.id === tp.id;
      return '<div class="plan-day' + (isToday ? ' current' : '') + '" data-day="' + i + '">' +
        '<div class="plan-day-head">' +
        '<b>' + esc(p.title) + '</b>' +
        (isToday ? ui.tag('今天', 'tag-brand') : '') +
        (p.date ? ui.tag(p.date) : '') +
        ui.tag(s.done + '/' + s.total) +
        (s.allDone ? ui.tag('已完成', 'tag-ok') : '') +
        '<span class="spacer"></span>' +
        '<span style="min-width:110px">' + ui.masteryBar(s.pct) + '</span>' +
        '</div>' +
        '<div class="plan-day-body"' + (isToday ? '' : ' hidden') + '>' +
        (p.tasks.length
          ? p.tasks.map(function (t) { return taskHtml(p, t); }).join('')
          : '<p style="color:var(--text-3);font-size:13px;margin:0">没有任务</p>') +
        '</div>' +
        '</div>';
    }).join('');

    /* ---------- 渲染 ---------- */
    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>今日计划' + (tp.date === KY.plan.todayStr() ? '' : '（' + esc(KY.plan.todayStr()) + '）') + '</h2>' +
      '<p>运营者安排的每日任务。做完一项勾一项，进度存在你自己的浏览器里。' +
      '刷题和考试任务可以直接点按钮跳过去。</p>' +
      '<div class="slogans">' +
      '<span>☑ 今日 ' + ts.done + '/' + ts.total + ' 项</span>' +
      '<span>▦ 整体 ' + U.pct(overall.pct) + '（' + overall.done + '/' + overall.total + ' 项）</span>' +
      (overall.daysDone ? '<span>✔ 已完成 ' + overall.daysDone + ' 天</span>' : '') +
      (meta.builtAt ? '<span>计划发布于 ' + esc(meta.builtAt) + '</span>' : '') +
      '</div>' +
      '</div>' +

      todayHtml +
      pushHtml +

      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">全部计划（' +
      KY.plan.allPlans().length + ' 天）</h3>' +
      '<p class="card-sub" style="margin:0">点某一天可以展开看它的任务</p></div>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm" id="reset-progress">重打勾（清空我的进度）</button>' +
      '</div>' +
      allDaysHtml +
      '</div>';

    /* ---------- 事件 ---------- */

    mount.addEventListener('change', function (e) {
      var t = e.target;
      if (!t.hasAttribute || !t.hasAttribute('data-plan-task')) return;
      var parts = t.getAttribute('data-plan-task').split('|');
      KY.plan.setDone(parts[0], parts[1], t.checked);
      var row = t.closest ? t.closest('.plan-task') : null;
      if (row) row.classList.toggle('done', t.checked);
      // 更新进度条与今日计数：直接刷新视图最省事
      KY.router.refresh();
    });

    mount.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;

      var day = t.closest('[data-day]');
      if (day && !t.closest('button') && !t.closest('a') && !t.closest('label')) {
        var body = day.querySelector('.plan-day-body');
        if (body) body.hidden = !body.hidden;
        return;
      }

      var rec = t.closest('[data-receive]');
      if (rec) {
        var qid = rec.getAttribute('data-receive');
        var one = pushed.filter(function (r) { return r.questionId === qid; });
        one.forEach(function (r) { r.force = true; });
        var res = KY.push.receive(one);
        if (res.added) {
          U.toast('已收进你的错题本，并已按考点下调掌握度、加入复习推送', 'success');
        } else if (res.missing.length) {
          U.toast('题库里找不到这道题，无法收下', 'error');
        } else {
          U.toast('这道题已经在你的错题本里了', 'info');
        }
        KY.router.refresh();
        return;
      }

      if (t.closest('#receive-all')) {
        ui.confirm('把运营者布置的 ' + pendingPush.length + ' 道错题全部收进你的错题本？\n\n' +
          '收下后它们会按考点参与你的错题复习与推题。', { okText: '全部收下' }).then(function (ok) {
            if (!ok) return;
            var res = KY.push.receive(pendingPush);
            U.toast('已收下 ' + res.added + ' 题' +
              (res.missing.length ? ('，' + res.missing.length + ' 题在题库里找不到') : ''),
              res.added ? 'success' : 'info');
            KY.router.refresh();
          });
        return;
      }

      if (t.closest('#reset-progress')) {
        ui.confirm('清空你在计划上打的所有勾？任务本身不会消失。', { danger: true, okText: '清空' })
          .then(function (ok) {
            if (!ok) return;
            KY.plan.resetProgress();
            U.toast('已清空打勾进度', 'success');
            KY.router.refresh();
          });
      }
    });
  };
})(window);
