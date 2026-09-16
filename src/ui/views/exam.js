/*!
 * views/exam.js —— 考试模式（限时作答 + 交卷自动判分）
 * 路由： #/exam                     选择试卷
 *        #/exam?paper=<paperId>     直接开始某套卷
 *        #/exam?subject=<subject>   按科目智能组卷
 *
 * 状态保存在模块内变量中；考试进行中会拦截刷新与路由跳转，避免误丢答案。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  /* ================================================================== */
  /* 会话状态                                                            */
  /* ================================================================== */

  var S = null; // { paper, items, answers, startTs, durationSec, timerId, phase, report, rubricScores, flagged }
  var beforeUnloadHandler = null;

  function clearTimer() {
    if (S && S.timerId) { clearInterval(S.timerId); S.timerId = null; }
  }

  function detachGuard() {
    if (beforeUnloadHandler) {
      global.removeEventListener('beforeunload', beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
  }

  function attachGuard() {
    if (beforeUnloadHandler) return;
    beforeUnloadHandler = function (e) {
      if (S && S.phase === 'running') {
        e.preventDefault();
        e.returnValue = '考试正在进行中，离开会丢失作答记录。';
        return e.returnValue;
      }
    };
    global.addEventListener('beforeunload', beforeUnloadHandler);
  }

  function remainingSec() {
    if (!S) return 0;
    var elapsed = Math.floor((Date.now() - S.startTs) / 1000);
    return Math.max(0, S.durationSec - elapsed);
  }

  /* ================================================================== */
  /* 选择试卷                                                            */
  /* ================================================================== */

  function renderSelect(mount, query) {
    ui.setTitle('考试模式');

    var enPapers = KY.bank.papers('english1');
    var exams = KY.store.getExams();
    var settings = KY.store.getSettings();

    var paperCards = enPapers.map(function (p) {
      var qs = KY.bank.paperQuestions(p);
      return '<div class="item" style="padding:13px 15px">' +
        '<div class="item-head">' + ui.tag(p.year + ' 年', 'tag-real') + ui.tag(qs.length + ' 题') +
        ui.tag((p.durationMin || 180) + ' 分钟') + '<span class="spacer"></span>' +
        ui.tag('总分 ' + U.fmtScore(KY.bank.paperScore(p))) + '</div>' +
        '<div style="font-weight:700;margin-bottom:8px">' + esc(p.title) + '</div>' +
        '<div class="row tight">' +
        '<button class="btn btn-sm btn-primary" data-start-paper="' + esc(p.id) + '">开始考试</button>' +
        '<a class="btn btn-sm" href="#/papers/' + encodeURIComponent(p.id) + '">先看解析</a>' +
        '</div></div>';
    }).join('');

    var subCards = KY.SUBJECTS.map(function (sub) {
      var n = KY.bank.countBySubject(sub);
      return '<div class="item" style="padding:13px 15px">' +
        '<div class="item-head">' + ui.subTag(sub) + ui.tag('题库 ' + n + ' 题') + '</div>' +
        '<div style="font-size:13px;color:var(--text-3);margin-bottom:8px">' +
        '按你的薄弱考点自动组卷，优先真题，题目难度贴合你当前水平。</div>' +
        '<button class="btn btn-sm btn-primary" data-start-mock="' + sub + '">智能组卷考试</button>' +
        '</div>';
    }).join('');

    var historyHtml = exams.length ? exams.slice(0, 15).map(function (e) {
      var pct = e.total.full ? e.total.got / e.total.full : 0;
      var color = pct >= 0.8 ? 'var(--ok)' : (pct >= 0.6 ? 'var(--warn)' : 'var(--err)');
      return '<tr>' +
        '<td>' + esc(U.truncate(e.title, 40)) + (e.total.pending ? ' ' + ui.tag('待自评', 'tag-warn') : '') + '</td>' +
        '<td><b style="color:' + color + '">' + U.fmtScore(e.total.got) + '</b> / ' + U.fmtScore(e.total.full) + '</td>' +
        '<td class="num">' + U.pct(e.objective.accuracy) + '</td>' +
        '<td class="num">' + e.objective.answeredCount + '/' + e.objective.total + '</td>' +
        '<td class="num">' + U.fmtClock(e.durationUsedSec || 0) + '</td>' +
        '<td>' + U.fmtDate(e.finishedAt, true) + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-view-report="' + esc(e.id) + '">查看报告</button></td>' +
        '</tr>';
    }).join('') : '';

    mount.innerHTML = '' +
      '<div class="hint-box">' +
      '<b>考试模式怎么用：</b>选一套卷子或让系统组卷 → 限时作答（到点自动交卷）→ 点交卷后客观题立即判分出分，' +
      '主观题进入自评面板按评分要点勾选 → 系统自动把错题写进错题本、更新各考点掌握度，并推送同考点题。' +
      '<br><b>提示：</b>考试过程中请勿刷新或关闭页面（系统会拦截提醒）。' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">英语一历年真题卷</h3>' +
      '<p class="card-sub">按年份汇编的精练卷，建议 180 分钟</p>' +
      (paperCards || '<p style="color:var(--text-3)">暂无可用套卷</p>') +
      '</div>' +

      '<div>' +
      '<div class="card">' +
      '<h3 class="card-title">智能组卷</h3>' +
      '<p class="card-sub">按薄弱考点 + 真题优先策略自动出卷</p>' +
      subCards +
      '<div class="row" style="margin-top:10px">' +
      '<label class="field" style="margin:0;flex:1"><span class="lbl">组卷题量</span>' +
      '<select id="mock-count">' +
      [10, 15, 20, 30].map(function (n) {
        return '<option value="' + n + '"' + (n === 15 ? ' selected' : '') + '>' + n + ' 题</option>';
      }).join('') +
      '</select></label>' +
      '<label class="field" style="margin:0;flex:1"><span class="lbl">限时</span>' +
      '<select id="mock-duration">' +
      [30, 60, 90, 120, 180].map(function (n) {
        return '<option value="' + n + '"' + (n === 60 ? ' selected' : '') + '>限时 ' + n + ' 分钟</option>';
      }).join('') +
      '</select></label>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">英语一全科模考</h3>' +
      '<p class="card-sub">从英语一题库跨板块随机组卷</p>' +
      '<button class="btn btn-primary" data-start-mock="english1">英语一智能组卷</button>' +
      '</div>' +
      '</div>' +
      '</div>' +

      (exams.length ? '<div class="card">' +
        '<div class="card-head"><h3 class="card-title">历史成绩</h3><span class="spacer"></span>' +
        '<button class="btn btn-sm btn-danger" id="clear-exams">清空记录</button></div>' +
        '<table class="tbl"><thead><tr><th>试卷</th><th>得分</th><th class="num">正确率</th>' +
        '<th class="num">已答</th><th class="num">用时</th><th>时间</th><th></th></tr></thead>' +
        '<tbody>' + historyHtml + '</tbody></table></div>' : '');

    /* ---- 事件 ---- */
    mount.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;

      var sp = t.closest('[data-start-paper]');
      if (sp) {
        var paper = KY.bank.paper(sp.getAttribute('data-start-paper'));
        if (paper) startPaper(mount, paper);
        return;
      }

      var sm = t.closest('[data-start-mock]');
      if (sm) {
        var sub = sm.getAttribute('data-start-mock');
        var countSel = document.getElementById('mock-count');
        var durSel = document.getElementById('mock-duration');
        var count = countSel ? parseInt(countSel.value, 10) : 15;
        var dur = durSel ? parseInt(durSel.value, 10) : 60;
        var mock = KY.recommender.buildMockPaper(sub, { count: count, durationMin: dur });
        if (!KY.bank.paperQuestions(mock).length) {
          U.toast('该科目题库为空，无法组卷', 'error');
          return;
        }
        startPaper(mount, mock);
        return;
      }

      var vr = t.closest('[data-view-report]');
      if (vr) {
        var id = vr.getAttribute('data-view-report');
        var rec = KY.store.getExams().filter(function (x) { return x.id === id; })[0];
        if (rec) { S = { phase: 'result', report: rec, answers: {}, rubricScores: {} }; renderResult(mount); }
        return;
      }

      if (t.closest('#clear-exams')) {
        ui.confirm('确定要清空全部考试记录吗？错题本与掌握度不受影响。', { danger: true, okText: '清空' })
          .then(function (ok) {
            if (!ok) return;
            KY.store.raw.set('exams', []);
            U.toast('已清空考试记录', 'success');
            KY.router.refresh();
          });
      }
    });

    if (query && query.paper) {
      var p = KY.bank.paper(query.paper);
      if (p) startPaper(mount, p);
    } else if (query && query.subject) {
      var mock2 = KY.recommender.buildMockPaper(query.subject, { count: 15, durationMin: 60 });
      if (KY.bank.paperQuestions(mock2).length) startPaper(mount, mock2);
    }
  }

  /* ================================================================== */
  /* 开始考试                                                            */
  /* ================================================================== */

  function startPaper(mount, paper) {
    var items = KY.bank.paperQuestions(paper);
    if (!items.length) {
      U.toast('这套卷子没有可用题目', 'error');
      return;
    }

    S = {
      paper: paper,
      items: items,
      answers: {},
      flagged: {},
      startTs: Date.now(),
      durationSec: (paper.durationMin || 60) * 60,
      timerId: null,
      phase: 'running',
      report: null,
      rubricScores: {}
    };

    attachGuard();
    renderRunning(mount);
  }

  /* ================================================================== */
  /* 作答界面                                                            */
  /* ================================================================== */

  function renderRunning(mount) {
    var paper = S.paper;
    ui.setTitle('考试中 · ' + paper.title);

    var settings = KY.store.getSettings();

    /* 板块与题目 */
    var sectionsHtml = (paper.sections || []).map(function (sec) {
      var secItems = S.items.filter(function (it) { return it.section && it.section.id === sec.id; });
      if (!secItems.length) return '';
      return '<div class="section-head">' +
        '<h3>' + esc(sec.name) + '</h3>' +
        '<p>' + esc(sec.desc || '') + ' · 共 ' + secItems.length + ' 题</p>' +
        '</div>' +
        secItems.map(function (it) {
          return ui.questionCard(it.question, {
            index: S.items.indexOf(it) + 1,
            mode: 'answer',
            answerJump: false,          // 考试中绝不渲染答案块
            value: S.answers[it.question.id],
            showVideo: false,
            scoreText: U.fmtScore(it.score) + ' 分'
          });
        }).join('');
    }).join('');

    /* 题号导航 */
    var navHtml = S.items.map(function (it, i) {
      return '<button data-goto="q-' + esc(it.question.id) + '" data-qid-nav="' + esc(it.question.id) + '">' +
        (i + 1) + '</button>';
    }).join('');

    mount.innerHTML = '' +
      '<div class="exam-bar">' +
      '<div><div class="timer" id="timer">--:--</div>' +
      '<div style="font-size:11.5px;color:var(--text-3)">剩余时间</div></div>' +
      '<div class="progress-mini">' +
      '<div style="font-size:11.5px;color:var(--text-3);margin-bottom:4px">' +
      '已答 <b id="answered-count">0</b> / ' + S.items.length + '</div>' +
      '<div class="bar bar-brand"><span id="answered-bar" style="width:0%"></span></div>' +
      '</div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm" id="toggle-nav">题目导航</button>' +
      '<button class="btn btn-sm" id="auto-save-note">提示</button>' +
      '<button class="btn btn-primary" id="submit-exam">交卷</button>' +
      '</div>' +
      '</div>' +

      '<div id="qnav-wrap" style="display:none"><div class="card tight"><div class="qnav">' + navHtml + '</div>' +
      '<div style="font-size:12px;color:var(--text-3)">蓝底 = 已作答；点题号跳到该题</div></div></div>' +

      '<div class="hint-box">' +
      '<b>' + esc(paper.title) + '</b> · 共 ' + S.items.length + ' 题 · 总分 ' +
      U.fmtScore(KY.bank.paperScore(paper)) + ' · 限时 ' + (paper.durationMin || 60) + ' 分钟' +
      (paper.isSelection || paper.isMock ? '<br>' + esc(paper.note || '') : '') +
      '</div>' +

      sectionsHtml;

    /* ---- 计时器 ---- */
    var timerEl = document.getElementById('timer');
    function tick() {
      var rem = remainingSec();
      if (timerEl) {
        timerEl.textContent = U.fmtClock(rem);
        timerEl.classList.toggle('mid', rem <= 600 && rem > 120);
        timerEl.classList.toggle('low', rem <= 120);
      }
      if (rem <= 0) {
        clearTimer();
        U.toast('考试时间到，系统自动交卷', 'warn');
        doSubmit(mount, true);
      }
    }
    clearTimer();
    S.timerId = setInterval(tick, 1000);
    tick();

    /* ---- 作答进度 ---- */
    function updateProgress() {
      var done = 0;
      S.items.forEach(function (it) {
        var card = mount.querySelector('[data-qid="' + it.question.id + '"]');
        if (!card) return;
        var v = ui.readAnswer(it.question, card);
        S.answers[it.question.id] = v;
        var ok = ui.isAnswered(it.question, v);
        if (ok) done++;
        var navBtn = mount.querySelector('[data-qid-nav="' + it.question.id + '"]');
        if (navBtn) navBtn.classList.toggle('done', ok);
        var opt = card.querySelectorAll('.opt.selected');
        Array.prototype.forEach.call(card.querySelectorAll('.opt'), function (el) {
          var inp = el.querySelector('input');
          el.classList.toggle('selected', !!(inp && inp.checked));
        });
        void opt;
      });
      var cnt = document.getElementById('answered-count');
      var bar = document.getElementById('answered-bar');
      if (cnt) cnt.textContent = String(done);
      if (bar) bar.style.width = (S.items.length ? (done / S.items.length * 100) : 0) + '%';
    }

    mount.addEventListener('change', function (e) {
      if (e.target.closest && e.target.closest('.opt, .blank-inputs, textarea')) updateProgress();
    });
    mount.addEventListener('input', U.debounce(function (e) {
      if (e.target.closest && e.target.closest('.blank-inputs, textarea')) updateProgress();
    }, 120));

    /* ---- 按钮 ---- */
    document.getElementById('toggle-nav').addEventListener('click', function () {
      var w = document.getElementById('qnav-wrap');
      w.style.display = w.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('auto-save-note').addEventListener('click', function () {
      ui.alertBox(
        '作答说明\n\n' +
        '1. 客观题（单选/多选/判断/填空）由系统自动判分。\n' +
        '2. 主观题交卷后进入自评面板，按评分要点勾选即可折算得分。\n' +
        '3. 交卷后错题会自动进入错题本，并更新各考点掌握度。\n' +
        '4. 考试过程中请勿刷新或关闭页面。',
        { title: '作答说明' }
      );
    });

    document.getElementById('submit-exam').addEventListener('click', function () {
      updateProgress();
      var unanswered = S.items.filter(function (it) { return !ui.isAnswered(it.question, S.answers[it.question.id]); });
      var msg = unanswered.length
        ? ('还有 ' + unanswered.length + ' 道题未作答，确定现在交卷吗？\n\n未作答的题目会按 0 分计入。')
        : '确定交卷吗？交卷后客观题立即判分。';
      ui.confirm(msg, { okText: '交卷', title: '确认交卷' }).then(function (ok) {
        if (ok) doSubmit(mount, false);
      });
    });

    mount.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var go = t.closest('[data-goto]');
      if (go) {
        var el = document.getElementById(go.getAttribute('data-goto'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    void settings;
    updateProgress();

    // 路由离开时停表
    return function cleanup() {
      clearTimer();
      // 若已不在 running 阶段则解除拦截
      if (!S || S.phase !== 'running') detachGuard();
    };
  }

  /* ================================================================== */
  /* 交卷判分                                                            */
  /* ================================================================== */

  function doSubmit(mount, auto) {
    if (!S || S.phase !== 'running') return;
    clearTimer();

    // 最后一次收集作答
    S.items.forEach(function (it) {
      var card = mount.querySelector('[data-qid="' + it.question.id + '"]');
      if (card) S.answers[it.question.id] = ui.readAnswer(it.question, card);
    });

    var usedSec = Math.floor((Date.now() - S.startTs) / 1000);

    var report = KY.grader.gradePaper(S.paper, S.answers);
    report.durationUsedSec = usedSec;
    report.autoSubmitted = !!auto;
    report.id = U.uid('exam');
    report.title = S.paper.title;
    report.subject = S.paper.subject;
    report.paperId = S.paper.id;

    // 客观题直接进错题本 + 更新掌握度
    var added = KY.grader.commitToProgress(report, { collectWrong: true });

    // 主观题自评期间先不入库，成绩先存
    S.report = report;
    S.addedWrong = added.length;
    S.phase = 'result';

    if (report.subjective.count > 0) {
      KY.store.addExamRecord(report);
      U.toast('客观题已判分，请完成主观题自评', 'success');
    } else {
      KY.store.addExamRecord(report);
      U.toast('交卷完成，得分 ' + U.fmtScore(report.total.got) + ' / ' + U.fmtScore(report.total.full), 'success');
    }

    detachGuard();
    renderResult(mount, true);
  }

  /* ================================================================== */
  /* 成绩报告                                                            */
  /* ================================================================== */

  function renderResult(mount, fresh) {
    var report = S.report;
    ui.setTitle('成绩报告 · ' + report.title);

    var pct = report.total.full ? report.total.got / report.total.full : 0;
    var pending = report.total.pending;

    /* ---- 主观题自评面板 ---- */
    var subjHtml = '';
    if (report.subjective.count > 0) {
      var subjItems = report.items.filter(function (it) { return it.subjective; });
      subjHtml = '<div class="card">' +
        '<div class="card-head"><div><h3 class="card-title">主观题自评（' + subjItems.length + ' 题）</h3>' +
        '<p class="card-sub" style="margin:0">勾选你实际写到的评分要点，系统按比例折算得分。自评完成后总分会自动更新。</p></div></div>' +
        subjItems.map(function (it) {
          return ui.questionCard(it.question, {
            index: report.items.indexOf(it) + 1,
            mode: 'review',
            value: it.userAnswer,
            selfAssess: true,
            rubricScores: S.rubricScores,
            showVideo: !!it.question.video,
            embedVideo: KY.store.getSettings().video.preferEmbed,
            sectionName: it.sectionName,
            scoreText: U.fmtScore(it.grade.full) + ' 分',
            result: null
          });
        }).join('') +
        '<div class="row"><button class="btn btn-primary" id="apply-self">保存自评并更新总分</button>' +
        '<span style="font-size:12.5px;color:var(--text-3)">当前主观题得分：<b id="subj-got">' +
        U.fmtScore(report.subjective.got) + '</b> / ' + U.fmtScore(report.subjective.full) + '</span></div>' +
        '</div>';
    }

    /* ---- 错题解析 ---- */
    var wrongItems = report.items.filter(function (it) {
      if (it.subjective) return false;
      return it.answered && !it.grade.correct;
    });
    var blankItems = report.items.filter(function (it) { return !it.subjective && !it.answered; });

    var wrongHtml = '';
    if (wrongItems.length || blankItems.length) {
      wrongHtml = '<div class="card">' +
        '<div class="card-head"><div><h3 class="card-title">错题与未作答（' +
        (wrongItems.length + blankItems.length) + ' 题）</h3>' +
        '<p class="card-sub" style="margin:0">这些题已自动加入错题本，系统会据此更新掌握度并推送同考点题</p></div></div>' +
        wrongItems.concat(blankItems).map(function (it) {
          return ui.questionCard(it.question, {
            index: report.items.indexOf(it) + 1,
            mode: 'review',
            value: it.userAnswer,
            result: it.answered ? 'wrong' : 'blank',
            showExplanation: true,
            showVideo: true,
            embedVideo: KY.store.getSettings().video.preferEmbed,
            blanks: it.grade.blanks,
            gradeDetail: it.grade.detail,
            sectionName: it.sectionName,
            scoreText: U.fmtScore(it.grade.full) + ' 分'
          });
        }).join('') +
        '</div>';
    }

    /* ---- 失分考点 ---- */
    var weakHtml = report.weakPoints.length ? report.weakPoints.map(function (w) {
      return '<div class="mastery-row">' +
        '<span class="nm">' + esc(w.name) + ' <span style="color:var(--text-3);font-size:11.5px">' +
        esc(w.moduleName) + '</span></span>' +
        '<span>' + ui.masteryBar(KY.store.getPointMastery(w.pointId).score) + '</span>' +
        '<span class="sc">-' + U.fmtScore(w.lost) + ' 分</span>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-3);font-size:13px;margin:0">本次没有失分考点，表现很好。</p>';

    /* ---- 全部题目（答对的） ---- */
    var correctItems = report.items.filter(function (it) { return !it.subjective && it.answered && it.grade.correct; });

    mount.innerHTML = '' +
      '<div class="result-hero">' +
      '<div class="big">' + U.fmtScore(report.total.got) + '<small> / ' + U.fmtScore(report.total.full) + ' 分</small></div>' +
      '<div class="sub">' + esc(report.title) + ' · 客观题正确率 ' + U.pct(report.objective.accuracy) +
      '（' + report.objective.correctCount + '/' + report.objective.total + '）' +
      ' · 用时 ' + U.fmtClock(report.durationUsedSec || 0) +
      (report.autoSubmitted ? ' · 到时自动交卷' : '') + '</div>' +
      '</div>' +

      '<div class="grid grid-4" style="margin-bottom:18px">' +
      ui.stat(U.fmtScore(report.objective.got), '客观题得分（满分 ' + U.fmtScore(report.objective.full) + '）') +
      ui.stat(report.objective.correctCount, '客观题答对') +
      ui.stat(wrongItems.length + blankItems.length, '错题 + 未作答') +
      ui.stat(pending ? '待自评' : U.fmtScore(report.subjective.got), '主观题得分（满分 ' + U.fmtScore(report.subjective.full) + '）') +
      '</div>' +

      '<div class="row" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" id="retry">再做一次这套卷</button>' +
      '<a class="btn" href="#/wrongbook">去错题本攻坚</a>' +
      '<a class="btn" href="#/review?mode=weak">同考点强化推送</a>' +
      '<a class="btn" href="#/exam">返回考试首页</a>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-ghost" id="print-report">打印/导出 PDF</button>' +
      '</div>' +

      (pending ? '<div class="hint-box warn">还有 ' + report.subjective.count +
        ' 道主观题等待自评，自评后总分会更新。当前总分只包含客观题。</div>' : '') +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">失分考点排行</h3>' +
      '<p class="card-sub">按失分多少排序，优先攻克前三个</p>' +
      weakHtml +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">接下来做什么</h3>' +
      '<ol style="font-size:13.5px;line-height:2;margin:0;padding-left:20px;color:var(--text-2)">' +
      '<li>把上面排行前 3 的考点，用「同考点强化推送」各做 3 道题。</li>' +
      '<li>回到错题本，把本次错题的"错因"改成你自己的真实原因（系统自动判定可能有偏差）。</li>' +
      '<li>英语题目点每题下方的「B站详解」，跟一遍讲解并记录生词。</li>' +
      '<li>3 天后重做本卷错题，检查是否真正掌握。</li>' +
      '</ol>' +
      '</div>' +
      '</div>' +

      subjHtml +
      wrongHtml +

      (correctItems.length ? '<div class="card">' +
        '<h3 class="card-title">答对的题（' + correctItems.length + ' 题）</h3>' +
        '<p class="card-sub">点开可看解析与 B站视频，巩固解题思路</p>' +
        correctItems.map(function (it) {
          return ui.questionCard(it.question, {
            index: report.items.indexOf(it) + 1,
            mode: 'review',
            value: it.userAnswer,
            result: 'correct',
            showExplanation: true,
            showVideo: !!it.question.video,
            embedVideo: KY.store.getSettings().video.preferEmbed,
            sectionName: it.sectionName,
            scoreText: U.fmtScore(it.grade.full) + ' 分'
          });
        }).join('') + '</div>' : '');

    /* ---- 事件 ---- */

    /* 自评勾选 */
    mount.addEventListener('change', function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.hasAttribute && t.hasAttribute('data-rubric')) {
        var qid = t.getAttribute('data-rubric');
        var idx = parseInt(t.getAttribute('data-rubric-idx'), 10);
        if (!S.rubricScores[qid]) S.rubricScores[qid] = {};
        S.rubricScores[qid][idx] = t.checked;
      }
      if (t.hasAttribute && t.hasAttribute('data-self')) {
        var qid2 = t.getAttribute('data-self');
        if (!S.rubricScores[qid2]) S.rubricScores[qid2] = {};
        S.rubricScores[qid2][0] = parseFloat(t.value);
      }
    });

    var applyBtn = document.getElementById('apply-self');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        KY.grader.applySelfAssessment(report, S.rubricScores);
        // 更新已存记录
        var exams = KY.store.getExams();
        var idx = exams.findIndex(function (x) { return x.id === report.id; });
        if (idx < 0) idx = 0;
        exams[idx] = report;
        KY.store.raw.set('exams', exams);
        // 主观题答得不好的考点也降掌握度
        report.items.forEach(function (it) {
          if (!it.subjective) return;
          var ok = it.grade.partial >= 0.6;
          (it.question.knowledge || []).forEach(function (pid) {
            KY.store.recordPointResult(pid, ok, 1);
          });
        });
        U.toast('自评已保存，总分：' + U.fmtScore(report.total.got) + ' / ' + U.fmtScore(report.total.full), 'success');
        renderResult(mount);
      });
    }

    var retry = document.getElementById('retry');
    if (retry) {
      retry.addEventListener('click', function () {
        var paper = KY.bank.paper(report.paperId);
        if (paper) { S = null; startPaper(mount, paper); }
        else U.toast('该套卷已不在题库中', 'error');
      });
    }

    var pr = document.getElementById('print-report');
    if (pr) pr.addEventListener('click', function () { global.print(); });

    if (fresh) global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================================================================== */
  /* 入口                                                                */
  /* ================================================================== */

  KY.views.exam = function (ctx, mount) {
    var q = ctx.query || {};

    // 恢复正在进行的考试
    if (S && S.phase === 'running' && !q.paper && !q.subject) {
      renderRunning(mount);
      return;
    }
    if (S && S.phase === 'result' && S.report) {
      renderResult(mount);
      return;
    }

    S = null;
    renderSelect(mount, q);
  };
})(window);
