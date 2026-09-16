/*!
 * views/review.js —— 定制化知识推送 / 错题复习
 * 路由： #/review?mode=weak|wrong|daily&subject=&module=&points=a,b&count=10
 *
 * 这是"错题复习"的主入口：按未掌握考点推题，做完立刻判分、更新掌握度、
 * 答错的题一键进错题本。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var PS = null; // { items, answers, submitted, report, opts }

  function parseOpts(query) {
    var opts = {
      mode: query.mode || 'weak',
      subject: query.subject || '',
      module: query.module || '',
      points: query.points ? String(query.points).split(',').filter(Boolean) : null,
      count: parseInt(query.count, 10) || 10,
      difficulty: parseInt(query.difficulty, 10) || 0
    };
    if (opts.count < 1) opts.count = 1;
    if (opts.count > 50) opts.count = 50;
    return opts;
  }

  function buildSession(opts) {
    var rec;
    if (opts.points && opts.points.length) {
      rec = KY.recommender.recommend({
        mode: 'subject',
        subject: opts.subject || undefined,
        count: opts.count,
        targetPoints: opts.points,
        difficulty: opts.difficulty || undefined
      });
    } else {
      rec = KY.recommender.recommend({
        mode: opts.mode,
        subject: opts.subject || undefined,
        count: opts.count,
        difficulty: opts.difficulty || undefined
      });
      if (opts.module) {
        var inModule = rec.items.filter(function (it) { return it.question.module === opts.module; });
        if (inModule.length >= Math.min(3, opts.count)) rec.items = inModule;
      }
    }
    return rec;
  }

  var MODE_INFO = {
    weak: { name: '未掌握考点专项', desc: '优先推送你掌握度最低的考点对应的题目，难度贴合你当前水平。' },
    wrong: { name: '错题考点强化', desc: '只推送你错题本里出现过的考点，用于针对性补漏。' },
    daily: { name: '每日定制推送', desc: '混合"未掌握考点 + 没做过的新题 + 需要复习的旧题"，适合每天固定练一组。' },
    subject: { name: '指定考点推送', desc: '围绕你指定的考点推送题目。' }
  };

  /* ================================================================== */
  /* 渲染                                                                */
  /* ================================================================== */

  function renderSetup(mount, opts) {
    ui.setTitle('定制化推送');

    /* 预览：本次会推什么 */
    var rec = buildSession(opts);
    PS = { items: rec.items, answers: {}, submitted: false, report: null, opts: opts };

    var info = MODE_INFO[opts.mode] || MODE_INFO.weak;

    if (!rec.items.length) {
      mount.innerHTML = ui.empty('暂时没有可推送的题目',
        '题库里没有匹配当前条件的题目。可能是题库未加载，或筛选条件过窄。',
        '<a class="btn btn-primary" href="#/review?mode=daily">换成每日推送</a> ' +
        '<a class="btn" href="#/bank">去题库检索</a>');
      return;
    }

    var reasonsHtml = rec.items.map(function (it, i) {
      var q = it.question;
      return '<div class="item" style="padding:10px 13px;margin-bottom:7px">' +
        '<div class="item-head" style="margin-bottom:4px">' +
        '<span class="q-no">' + (i + 1) + '</span>' + ui.subTag(q.subject) +
        (q.year ? ui.tag(q.year + ' 真题', 'tag-real') : ui.tag('模拟/习题')) +
        ui.tag('难度 ' + '★'.repeat(q.difficulty || 3)) +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-2);line-height:1.6">' + esc(U.truncate(q.stem, 100)) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-3);margin-top:5px">📌 ' + esc(it.reason) + '</div>' +
        '<div style="margin-top:6px">' + ui.knowledgeChips(q.knowledge) + '</div>' +
        '</div>';
    }).join('');

    /* 本次涉及的薄弱考点 */
    var involvedPoints = {};
    rec.items.forEach(function (it) {
      (it.question.knowledge || []).forEach(function (p) { involvedPoints[p] = 1; });
    });
    var pointRows = Object.keys(involvedPoints).map(function (pid) {
      var n = KY.getTaxNode(pid);
      var m = KY.store.getPointMastery(pid);
      return { pid: pid, name: n ? n.point.name : pid, module: n ? n.module.name : '', score: m.score };
    }).sort(function (a, b) { return a.score - b.score; });

    var pointsHtml = pointRows.map(function (r) {
      return '<div class="mastery-row">' +
        '<span class="nm">' + esc(r.name) + ' <span style="color:var(--text-3);font-size:11.5px">' +
        esc(r.module) + '</span></span>' +
        '<span>' + ui.masteryBar(r.score) + '</span>' +
        '<span class="sc">' + U.pct(r.score) + '</span>' +
        '</div>';
    }).join('');

    var et = KY.getErrorType;
    var wrongPoints = {};
    KY.store.getWrongbook().forEach(function (w) {
      (w.knowledge || []).forEach(function (p) { wrongPoints[p] = (wrongPoints[p] || 0) + 1; });
    });
    var coverCount = pointRows.filter(function (r) { return wrongPoints[r.pid]; }).length;

    mount.innerHTML = '' +
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">' + esc(info.name) + '</h3>' +
      '<p class="card-sub" style="margin:0">' + esc(info.desc) + '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn" id="regen">换一批</button>' +
      '<button class="btn" id="change-count">调整题量</button>' +
      '</div></div>' +

      '<div class="grid grid-4" style="margin-bottom:14px">' +
      ui.stat(rec.items.length, '本次推题数') +
      ui.stat(pointRows.length, '覆盖考点（含 ' + coverCount + ' 个错题考点）') +
      ui.stat(rec.meta.weakPointCount, '全科未掌握考点总数') +
      ui.stat(rec.meta.targetDifficulty, '适配难度（目标）') +
      '</div>' +

      '<div class="row">' +
      '<button class="btn btn-primary btn-lg" id="start">开始作答</button>' +
      '<a class="btn" href="#/review?mode=daily">每日推送</a>' +
      '<a class="btn" href="#/review?mode=wrong">错题考点强化</a>' +
      '<a class="btn" href="#/wrongbook">回错题本</a>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">本次会练到这些考点</h3>' +
      '<p class="card-sub">按掌握度从低到高排列</p>' +
      pointsHtml +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">题目预览</h3>' +
      '<p class="card-sub">已隐藏答案与选项，开始作答后显示</p>' +
      reasonsHtml +
      '</div>' +
      '</div>';

    mount.querySelector('#start').addEventListener('click', function () { renderAnswering(mount); });

    mount.querySelector('#regen').addEventListener('click', function () {
      // 换一批：排除当前这批
      var exclude = PS.items.map(function (it) { return it.question.id; });
      var seed = Date.now();
      var rec2 = KY.recommender.recommend({
        mode: opts.points ? 'subject' : opts.mode,
        subject: opts.subject || undefined,
        count: opts.count,
        targetPoints: opts.points || undefined,
        excludeIds: exclude,
        seed: seed
      });
      if (!rec2.items.length) {
        // 池子不够就允许重复
        rec2 = KY.recommender.recommend({
          mode: opts.points ? 'subject' : opts.mode,
          subject: opts.subject || undefined,
          count: opts.count,
          targetPoints: opts.points || undefined,
          seed: seed
        });
      }
      PS.items = rec2.items;
      U.toast('已换一批（' + rec2.items.length + ' 题）', 'success');
      renderSetup(mount, opts);
    });

    mount.querySelector('#change-count').addEventListener('click', function () {
      ui.modal({
        title: '调整本次题量',
        narrow: true,
        body: '<label class="field"><span class="lbl">题量</span>' +
          '<select id="c-count">' + [5, 10, 15, 20, 30, 50].map(function (n) {
            return '<option value="' + n + '"' + (n === opts.count ? ' selected' : '') + '>' + n + ' 题</option>';
          }).join('') + '</select></label>' +
          '<label class="field"><span class="lbl">目标难度（0 = 自动适配）</span>' +
          '<select id="c-diff">' + [0, 1, 2, 3, 4, 5].map(function (n) {
            return '<option value="' + n + '"' + (n === opts.difficulty ? ' selected' : '') + '>' +
              (n === 0 ? '自动适配我的水平' : '★'.repeat(n)) + '</option>';
          }).join('') + '</select></label>',
        footer: '<button class="btn" data-modal-close>取消</button><button class="btn btn-primary" id="c-ok">应用</button>',
        onMount: function (mask, close) {
          mask.querySelector('#c-ok').addEventListener('click', function () {
            var n = parseInt(mask.querySelector('#c-count').value, 10);
            var d = parseInt(mask.querySelector('#c-diff').value, 10);
            close();
            var newOpts = {};
            Object.keys(opts).forEach(function (k) { newOpts[k] = opts[k]; });
            newOpts.count = n;
            newOpts.difficulty = d;
            renderSetup(mount, newOpts);
          });
        }
      });
    });

    void et;
  }

  /* ---------------- 作答中 ---------------- */

  function renderAnswering(mount) {
    var opts = PS.opts;
    ui.setTitle('作答中 · ' + (MODE_INFO[opts.mode] || MODE_INFO.weak).name);
    var settings = KY.store.getSettings();

    var html = '' +
      '<div class="exam-bar">' +
      '<div><div class="timer" id="pr-timer" style="font-size:17px">00:00</div>' +
      '<div style="font-size:11.5px;color:var(--text-3)">已用时间</div></div>' +
      '<div class="progress-mini">' +
      '<div style="font-size:11.5px;color:var(--text-3);margin-bottom:4px">已答 <b id="pr-done">0</b> / ' + PS.items.length + '</div>' +
      '<div class="bar bar-brand"><span id="pr-bar" style="width:0%"></span></div>' +
      '</div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm" id="pr-quit">退出</button>' +
      '<button class="btn btn-primary" id="pr-submit">提交并判分</button>' +
      '</div></div>' +

      '<div class="hint-box">这一组题按你的薄弱考点生成。做完点「提交并判分」，答错的题会一键加入错题本。</div>';

    html += PS.items.map(function (it, i) {
      return ui.questionCard(it.question, {
        index: i + 1,
        mode: 'answer',
        answerJump: false,            // 作答中不渲染答案块
        value: PS.answers[it.question.id],
        showVideo: false
      });
    }).join('');

    mount.innerHTML = html;

    var startTs = Date.now();
    var timerEl = document.getElementById('pr-timer');
    var tickId = setInterval(function () {
      if (timerEl) timerEl.textContent = U.fmtClock(Math.floor((Date.now() - startTs) / 1000));
    }, 1000);

    function collect() {
      PS.items.forEach(function (it) {
        var card = mount.querySelector('[data-qid="' + it.question.id + '"]');
        if (card) PS.answers[it.question.id] = ui.readAnswer(it.question, card);
      });
    }

    function updateProgress() {
      collect();
      var done = 0;
      PS.items.forEach(function (it, i) {
        var ok = ui.isAnswered(it.question, PS.answers[it.question.id]);
        if (ok) done++;
        var card = mount.querySelector('[data-qid="' + it.question.id + '"]');
        if (card) {
          Array.prototype.forEach.call(card.querySelectorAll('.opt'), function (el) {
            var inp = el.querySelector('input');
            el.classList.toggle('selected', !!(inp && inp.checked));
          });
        }
      });
      var d = document.getElementById('pr-done');
      var b = document.getElementById('pr-bar');
      if (d) d.textContent = String(done);
      if (b) b.style.width = (PS.items.length ? done / PS.items.length * 100 : 0) + '%';
    }

    mount.addEventListener('change', function (e) {
      if (e.target.closest && e.target.closest('.opt, .blank-inputs, textarea')) updateProgress();
    });
    mount.addEventListener('input', U.debounce(function (e) {
      if (e.target.closest && e.target.closest('.blank-inputs, textarea')) updateProgress();
    }, 120));

    document.getElementById('pr-quit').addEventListener('click', function () {
      ui.confirm('退出会丢失本次作答，确定吗？', { danger: true, okText: '退出' }).then(function (ok) {
        if (!ok) return;
        clearInterval(tickId);
        PS = null;
        KY.router.go('review', { query: { mode: opts.mode, subject: opts.subject } });
      });
    });

    document.getElementById('pr-submit').addEventListener('click', function () {
      collect();
      var blank = PS.items.filter(function (it) { return !ui.isAnswered(it.question, PS.answers[it.question.id]); });
      var msg = blank.length ? ('还有 ' + blank.length + ' 道题没作答，未作答按错题处理。确定提交吗？')
        : '确定提交并判分吗？';
      ui.confirm(msg, { okText: '提交' }).then(function (ok) {
        if (!ok) return;
        clearInterval(tickId);
        finish(mount, Math.floor((Date.now() - startTs) / 1000));
      });
    });

    updateProgress();
    void settings;

    return function cleanup() { clearInterval(tickId); };
  }

  /* ---------------- 判分结果 ---------------- */

  function finish(mount, usedSec) {
    var ids = PS.items.map(function (it) { return it.question.id; });
    var report = KY.grader.gradeQuestions(ids, PS.answers, {
      id: U.uid('practice'),
      title: '定制化推送练习',
      subject: PS.opts.subject || null
    });
    report.durationUsedSec = usedSec;
    PS.report = report;
    PS.submitted = true;

    /* 更新掌握度 + 作答历史 */
    report.items.forEach(function (it) {
      if (it.subjective) return;
      var kn = it.question.knowledge || [];
      kn.forEach(function (pid) { KY.store.recordPointResult(pid, it.grade.correct, 1); });
      KY.recommender.markSeen(it.question.id, it.grade.correct);
    });

    KY.store.addPracticeSession({
      id: report.id,
      mode: PS.opts.mode,
      subject: PS.opts.subject || 'all',
      total: report.objective.total,
      correct: report.objective.correctCount,
      accuracy: report.objective.accuracy,
      durationUsedSec: usedSec,
      at: Date.now()
    });

    renderResult(mount);
  }

  function renderResult(mount) {
    ui.setTitle('练习结果');
    var report = PS.report;

    var wrong = report.items.filter(function (it) { return !it.subjective && it.answered && !it.grade.correct; });
    var blanks = report.items.filter(function (it) { return !it.subjective && !it.answered; });
    var correct = report.items.filter(function (it) { return !it.subjective && it.grade.correct; });
    var pct = report.objective.total ? report.objective.correctCount / report.objective.total : 0;

    /* 掌握度变化提示 */
    var improved = [], dropped = [];
    (report.weakPoints || []).forEach(function (w) { dropped.push(w); });

    mount.innerHTML = '' +
      '<div class="result-hero">' +
      '<div class="big">' + U.pct(pct) + '<small> 正确率</small></div>' +
      '<div class="sub">答对 ' + report.objective.correctCount + ' / ' + report.objective.total +
      ' · 错题 ' + wrong.length + ' · 未作答 ' + blanks.length +
      ' · 用时 ' + U.fmtClock(report.durationUsedSec || 0) + '</div>' +
      '</div>' +

      '<div class="row" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" id="add-wrong">把 ' + (wrong.length + blanks.length) + ' 道错题加入错题本</button>' +
      '<button class="btn" id="again">再来一组（同考点）</button>' +
      '<button class="btn" id="again-new">换一批新题</button>' +
      '<a class="btn" href="#/progress">看掌握度变化</a>' +
      '<a class="btn" href="#/dashboard">回总览</a>' +
      '</div>' +

      (wrong.length + blanks.length === 0
        ? '<div class="hint-box ok"><b>全对！</b>这些考点的掌握度已上调。建议点「换一批新题」继续扩大覆盖，或去「掌握度报告」看看下一步该攻克什么。</div>'
        : '<div class="hint-box warn">错题请务必点上面的按钮加入错题本——只有进了错题本，系统才会在后续推送里持续针对它们出题。</div>') +

      (dropped.length ? '<div class="card">' +
        '<h3 class="card-title">本组暴露的失分考点</h3>' +
        '<p class="card-sub">这些考点的掌握度已被下调，会优先出现在下次推送里</p>' +
        dropped.map(function (w) {
          return '<div class="mastery-row"><span class="nm">' + esc(w.name) +
            ' <span style="color:var(--text-3);font-size:11.5px">' + esc(w.moduleName) + '</span></span>' +
            '<span>' + ui.masteryBar(KY.store.getPointMastery(w.pointId).score) + '</span>' +
            '<span class="sc">' + U.pct(KY.store.getPointMastery(w.pointId).score) + '</span></div>';
        }).join('') +
        '<div style="margin-top:12px"><button class="btn btn-primary btn-sm" id="drill-weak">针对这些考点再练 10 题</button></div>' +
        '</div>' : '') +

      (wrong.length + blanks.length ? '<div class="card">' +
        '<h3 class="card-title">错题与未作答（' + (wrong.length + blanks.length) + ' 题）</h3>' +
        wrong.concat(blanks).map(function (it) {
          return ui.questionCard(it.question, {
            index: report.items.indexOf(it) + 1,
            mode: 'review',
            value: it.userAnswer,
            result: it.answered ? 'wrong' : 'blank',
            showExplanation: true,
            showVideo: !!it.question.video,
            embedVideo: KY.store.getSettings().video.preferEmbed,
            blanks: it.grade.blanks,
            gradeDetail: it.grade.detail
          });
        }).join('') + '</div>' : '') +

      (correct.length ? '<div class="card">' +
        '<h3 class="card-title">答对（' + correct.length + ' 题）</h3>' +
        '<p class="card-sub">点开可复习解析与 B站讲解</p>' +
        correct.map(function (it) {
          return ui.questionCard(it.question, {
            index: report.items.indexOf(it) + 1,
            mode: 'review',
            value: it.userAnswer,
            result: 'correct',
            showExplanation: true,
            showVideo: !!it.question.video,
            embedVideo: KY.store.getSettings().video.preferEmbed
          });
        }).join('') + '</div>' : '');

    var aw = document.getElementById('add-wrong');
    if (aw) {
      aw.addEventListener('click', function () {
        var items = wrong.concat(blanks).map(function (it) {
          return KY.classifier.fromQuestion(it.question, it.userAnswer, '');
        });
        if (!items.length) { U.toast('没有错题', 'info'); return; }
        var added = KY.store.addWrongItems(items);
        added.forEach(function (w) {
          (w.knowledge || []).forEach(function (pid) { KY.store.penalizePoint(pid, 0.10); });
        });
        U.toast('已加入错题本 ' + added.length + ' 条', 'success');
        aw.disabled = true;
        aw.textContent = '已加入错题本 ✓';
      });
    }

    document.getElementById('again').addEventListener('click', function () {
      var pts = PS.items.reduce(function (a, it) {
        (it.question.knowledge || []).forEach(function (p) { if (a.indexOf(p) < 0) a.push(p); });
        return a;
      }, []);
      var opts = PS.opts;
      PS = null;
      KY.router.go('review', {
        query: {
          mode: 'subject',
          subject: opts.subject,
          points: pts.slice(0, 25).join(','),
          count: opts.count
        }
      });
    });

    document.getElementById('again-new').addEventListener('click', function () {
      var opts = PS.opts;
      PS = null;
      KY.router.go('review', { query: { mode: 'daily', subject: opts.subject, count: opts.count } });
    });

    var dw = document.getElementById('drill-weak');
    if (dw) {
      dw.addEventListener('click', function () {
        var pts = failedPoints(report);
        var subj = report.subject || PS.opts.subject || '';
        PS = null;
        KY.router.go('review', {
          query: { mode: 'subject', subject: subj, points: pts.join(','), count: 10 }
        });
      });
    }
  }

  function failedPoints(report) {
    var out = [];
    (report.weakPoints || []).forEach(function (w) { if (out.indexOf(w.pointId) < 0) out.push(w.pointId); });
    return out;
  }

  /* ================================================================== */
  /* 入口                                                                */
  /* ================================================================== */

  KY.views.review = function (ctx, mount) {
    var q = ctx.query || {};
    var opts = parseOpts(q);

    // 已提交且条件未变 → 继续展示成绩单。
    // 否则页面上任何一次 router.refresh()（例如点「绑定视频」）都会把结果冲掉。
    if (PS && PS.submitted && PS.report &&
      String(PS.opts.mode) === String(opts.mode) &&
      String(PS.opts.subject) === String(opts.subject) &&
      String(PS.opts.points || '') === String(opts.points || '')) {
      renderResult(mount);
      return;
    }

    PS = null;
    renderSetup(mount, opts);
  };
})(window);
