/*!
 * grader.js —— 判分引擎
 * 挂载：KY.grader
 *
 * 客观题（single/multi/judge/cloze-item/blank）自动判分；
 * 主观题（subjective）交卷后进入自评面板，按 rubric 逐点勾选折算得分。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  /** 该题型是否可自动判分 */
  function isAutoGradable(type) {
    return ['single', 'multi', 'judge', 'cloze-item', 'blank'].indexOf(type) >= 0;
  }

  /**
   * 判一道题。
   * @param {Object} question
   * @param {*} userAnswer
   * @param {Number} score 本题满分
   * @param {Object} opts
   *    opts.strictMulti  true = 多选题"多选/错选/少选均不得分"（考研真实评分规则，考试模式用）
   *                      false/省略 = 多选题给部分分（练习模式用，用于鼓励性反馈）
   * @returns {{ auto:Boolean, correct:Boolean, partial:Number, got:Number, full:Number, detail:String }}
   */
  function gradeOne(question, userAnswer, score, opts) {
    opts = opts || {};
    var full = (score === undefined || score === null) ? (question.score || 1) : score;

    if (!isAutoGradable(question.type)) {
      return {
        auto: false,
        correct: false,
        partial: 0,
        got: 0,
        full: full,
        detail: '主观题，交卷后自评'
      };
    }

    var j = U.judge(question, userAnswer);

    var ratio;
    if (question.type === 'multi') {
      if (j.correct) ratio = 1;
      else if (opts.strictMulti) ratio = 0;                       // 考试模式：少选/多选/错选均不得分
      else ratio = U.clamp(j.partial, 0, 1);                      // 练习模式：给部分分
    } else if (question.type === 'blank') {
      ratio = U.clamp(j.partial, 0, 1);                           // 填空题按空给分
    } else {
      ratio = j.correct ? 1 : 0;
    }

    var got = Math.round(ratio * full * 100) / 100;

    var detail = j.detail;
    if (question.type === 'multi' && !j.correct && opts.strictMulti) {
      detail = '多选题多选/少选/错选均不得分（考研评分规则）：' + j.detail;
    }

    return {
      auto: true,
      correct: j.correct,
      partial: ratio,
      got: got,
      full: full,
      detail: detail,
      blanks: j.blanks || null
    };
  }

  /**
   * 判一张套卷/一组题（考试模式：多选题按考研真实规则，少选/多选/错选均不得分）。
   * @param {Object} paper 套卷（含 sections）
   * @param {Object} answers { questionId: userAnswer }
   * @returns {Object} 成绩单
   */
  function gradePaper(paper, answers) {
    answers = answers || {};
    var items = KY.bank.paperQuestions(paper).map(function (it) {
      var q = it.question;
      var ua = answers[q.id];
      var g = gradeOne(q, ua, it.score, { strictMulti: true });
      return {
        questionId: q.id,
        question: q,
        sectionId: it.section ? it.section.id : '',
        sectionName: it.section ? it.section.name : '',
        userAnswer: ua,
        answered: ua !== undefined && ua !== null && !(Array.isArray(ua) && !ua.length) && ua !== '',
        grade: g,
        subjective: !g.auto
      };
    });

    return summarize(paper.id, items, paper);
  }

  /**
   * 判一组自由题目（练习/智能组卷：多选题给部分分，便于看到"对了几项"）。
   */
  function gradeQuestions(questionIds, answers, meta) {
    answers = answers || {};
    var items = questionIds.map(function (qid) {
      var q = KY.bank.get(qid);
      if (!q) return null;
      var ua = answers[qid];
      var g = gradeOne(q, ua, q.score || 1);
      return {
        questionId: qid,
        question: q,
        sectionId: '',
        sectionName: q.module,
        userAnswer: ua,
        answered: ua !== undefined && ua !== null && !(Array.isArray(ua) && !ua.length) && ua !== '',
        grade: g,
        subjective: !g.auto
      };
    }).filter(Boolean);

    return summarize((meta && meta.id) || 'practice', items, meta || {});
  }

  /** 汇总成绩单 */
  function summarize(id, items, paper) {
    var objective = items.filter(function (x) { return !x.subjective; });
    var subjective = items.filter(function (x) { return x.subjective; });

    var objFull = objective.reduce(function (s, x) { return s + x.grade.full; }, 0);
    var objGot = objective.reduce(function (s, x) { return s + x.grade.got; }, 0);
    var subjFull = subjective.reduce(function (s, x) { return s + x.grade.full; }, 0);

    var correctCount = objective.filter(function (x) { return x.grade.correct; }).length;
    var wrongItems = objective.filter(function (x) { return x.answered && !x.grade.correct; });
    var blankItems = objective.filter(function (x) { return !x.answered; });

    // 按考点汇总失分
    var byPoint = Object.create(null);
    wrongItems.concat(blankItems).forEach(function (x) {
      (x.question.knowledge || []).forEach(function (pid) {
        var n = KY.getTaxNode(pid);
        var key = pid;
        if (!byPoint[key]) {
          byPoint[key] = {
            pointId: pid,
            name: n ? n.point.name : pid,
            moduleName: n ? n.module.name : '',
            lost: 0,
            count: 0
          };
        }
        byPoint[key].lost += (x.grade.full - x.grade.got);
        byPoint[key].count += 1;
      });
    });

    var pointRows = Object.keys(byPoint).map(function (k) { return byPoint[k]; })
      .sort(function (a, b) { return b.lost - a.lost; });

    return {
      id: id,
      paperId: paper.id || id,
      title: paper.title || '练习',
      subject: paper.subject || null,
      finishedAt: Date.now(),
      durationUsedSec: paper.durationUsedSec || 0,
      items: items,
      objective: {
        full: objFull,
        got: Math.round(objGot * 100) / 100,
        correctCount: correctCount,
        total: objective.length,
        answeredCount: objective.length - blankItems.length,
        blankCount: blankItems.length,
        accuracy: objective.length ? correctCount / objective.length : 0
      },
      subjective: {
        full: subjFull,
        got: 0,
        count: subjective.length,
        items: subjective.map(function (x) { return x.questionId; })
      },
      total: {
        full: Math.round((objFull + subjFull) * 100) / 100,
        got: Math.round(objGot * 100) / 100,
        pending: subjective.length > 0
      },
      weakPoints: pointRows,
      wrongQuestionIds: wrongItems.map(function (x) { return x.questionId; }),
      blankQuestionIds: blankItems.map(function (x) { return x.questionId; })
    };
  }

  /**
   * 主观题自评打分。
   * @param {Object} report 成绩单
   * @param {Object} rubricScores { questionId: { rubricIndex: true/false } }
   * @returns {Object} 更新后的成绩单
   */
  function applySelfAssessment(report, rubricScores) {
    rubricScores = rubricScores || {};
    var subjGot = 0;

    report.items.forEach(function (it) {
      if (!it.subjective) return;
      var rubric = it.question.rubric || [];
      var marks = rubricScores[it.questionId] || {};
      var got = 0;

      if (rubric.length) {
        rubric.forEach(function (rb, idx) {
          if (marks[idx]) got += (rb.score || 0);
        });
        // rubric 总分可能与题目分值不一致，按比例缩放到题目满分
        var rubricTotal = rubric.reduce(function (s, rb) { return s + (rb.score || 0); }, 0);
        if (rubricTotal > 0 && it.grade.full > 0) {
          got = Math.round((got / rubricTotal) * it.grade.full * 100) / 100;
        }
        it.grade = {
          auto: false,
          correct: got >= it.grade.full * 0.6,
          partial: it.grade.full ? got / it.grade.full : 0,
          got: got,
          full: it.grade.full,
          detail: '自评：' + U.fmtScore(got) + ' / ' + U.fmtScore(it.grade.full)
        };
      } else {
        // 无 rubric：按 0 / 半分 / 满分 三档
        var lvl = marks[0];
        var ratio = lvl === 1 ? 1 : (lvl === 0.5 ? 0.5 : 0);
        got = Math.round(ratio * it.grade.full * 100) / 100;
        it.grade = {
          auto: false,
          correct: ratio >= 0.6,
          partial: ratio,
          got: got,
          full: it.grade.full,
          detail: '自评：' + U.fmtScore(got) + ' / ' + U.fmtScore(it.grade.full)
        };
      }
      it.selfAssessed = true;
      subjGot += it.grade.got;
    });

    report.subjective.got = Math.round(subjGot * 100) / 100;
    report.total.got = Math.round((report.objective.got + report.subjective.got) * 100) / 100;
    report.total.pending = false;
    report.selfAssessedAt = Date.now();
    return report;
  }

  /** 交卷后：把客观错题写入错题本，并更新掌握度 */
  function commitToProgress(report, opts) {
    opts = opts || {};
    var added = [];

    report.items.forEach(function (it) {
      if (it.subjective) return;
      if (!it.answered) return; // 未作答不计入错因分析（但下面单独处理）

      var q = it.question;
      var kn = q.knowledge || [];

      if (it.grade.correct) {
        kn.forEach(function (pid) { KY.store.recordPointResult(pid, true, 1); });
        KY.recommender.markSeen(q.id, true);
      } else {
        kn.forEach(function (pid) { KY.store.recordPointResult(pid, false, 1); });
        KY.recommender.markSeen(q.id, false);
        if (opts.collectWrong !== false) {
          added.push(KY.classifier.fromQuestion(q, it.userAnswer, opts.note || ''));
        }
      }
    });

    if (added.length) KY.store.addWrongItems(added);
    return added;
  }

  /** 练习模式：只记录掌握度，不自动进错题本（用户可手动加入） */
  function commitPractice(questionResults) {
    questionResults.forEach(function (r) {
      var kn = (r.question.knowledge || []);
      kn.forEach(function (pid) { KY.store.recordPointResult(pid, r.correct, 1); });
      KY.recommender.markSeen(r.question.id, r.correct);
    });
  }

  KY.grader = {
    isAutoGradable: isAutoGradable,
    gradeOne: gradeOne,
    gradePaper: gradePaper,
    gradeQuestions: gradeQuestions,
    applySelfAssessment: applySelfAssessment,
    commitToProgress: commitToProgress,
    commitPractice: commitPractice
  };
})(window);
