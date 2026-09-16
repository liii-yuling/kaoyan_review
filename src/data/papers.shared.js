/*!
 * papers.shared.js —— 历年真题套卷（四科通用，自动汇编）
 *
 * 设计（重要）：
 *   本文件不硬编码题目 id，而是在题库就绪后按"年份 + 板块"自动汇编套卷。
 *   往题库里追加带 year 字段的题目，套卷会自动变长，不需要改这里。
 *
 * 每科生成两类卷：
 *   1. 「分板块真题精练卷」—— 把该科所有带年份的真题按板块归拢，永远可用。
 *      这是主力卷：真题常分散在多个年份，逐年成套会导致每套只有一两题。
 *   2. 「某年真题精练卷」—— 仅当该年份题量足够（>= MIN_PER_YEAR）时才单独成卷。
 *
 * 诚实标注：我们拥有的是"真题精选"，不是考场完整原卷。
 *          卷子的 note 字段会明确写出题目性质与数量。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  KY.papers = KY.papers || {};

  var MIN_PER_YEAR = 4;   // 单年真题少于此数则不单独成卷

  /** 取某科的题库（优先走索引，这样使用者自己导入的真题也会被汇编进来） */
  function listOf(subject) {
    if (KY.bank && typeof KY.bank.bySubject === 'function' &&
      typeof KY.bank.count === 'function' && KY.bank.count() > 0) {
      return KY.bank.bySubject(subject);
    }
    return (KY.banks && KY.banks[subject]) || [];
  }

  function buildFor(subject) {
    var list = listOf(subject).filter(function (q) { return q.year; });
    if (!list.length) return [];

    var subName = KY.subjectName(subject);
    var modules = KY.getModules(subject);
    var moduleName = Object.create(null);
    var moduleOrder = modules.map(function (m) { moduleName[m.id] = m.name; return m.id; });

    function sectionFor(modId, questions, label) {
      return {
        id: label + '.' + modId,
        name: moduleName[modId] || modId,
        desc: '共 ' + questions.length + ' 题（' + label + '）',
        scorePerQuestion: 1,
        questions: questions.map(function (q) { return q.id; })
      };
    }

    var papers = [];

    /* ---------- 1. 分板块真题精练卷（主力卷） ---------- */
    var byModule = Object.create(null);
    list.forEach(function (q) {
      (byModule[q.module] || (byModule[q.module] = [])).push(q);
    });

    var sections = moduleOrder.filter(function (mid) { return byModule[mid] && byModule[mid].length; })
      .map(function (mid) {
        var qs = byModule[mid].slice().sort(function (a, b) { return b.year - a.year; });
        return sectionFor(mid, qs, '历年真题');
      });

    if (sections.length) {
      var years = list.map(function (q) { return q.year; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; })
        .sort(function (a, b) { return b - a; });
      var total = sections.reduce(function (s, sec) { return s + sec.questions.length; }, 0);

      papers.push({
        id: subject + '-real-by-module',
        subject: subject,
        title: subName + '历年真题 · 分板块精练卷',
        year: null,
        durationMin: Math.max(45, total * 6),
        totalScore: total,
        isSelection: true,
        isByModule: true,
        note: '把题库中所有标注年份的' + subName + '真题（' + total + ' 题，来自 ' +
          years.join('、') + ' 年）按板块归拢成一份可连续练习的卷子。' +
          '注意这是真题精选，不是任一考场原卷。',
        sections: sections
      });
    }

    /* ---------- 2. 单年真题精练卷（题量足够时） ---------- */
    var byYear = Object.create(null);
    list.forEach(function (q) {
      (byYear[q.year] || (byYear[q.year] = [])).push(q);
    });

    Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; })
      .forEach(function (year) {
        var qs = byYear[year];
        if (qs.length < MIN_PER_YEAR) return;

        var secs = moduleOrder.filter(function (mid) {
          return qs.some(function (q) { return q.module === mid; });
        }).map(function (mid) {
          return sectionFor(mid, qs.filter(function (q) { return q.module === mid; }), year + ' 年');
        });

        var tot = secs.reduce(function (s, sec) { return s + sec.questions.length; }, 0);

        papers.push({
          id: subject + '-' + year,
          subject: subject,
          title: year + ' 年' + subName + '真题精选卷',
          year: year,
          durationMin: Math.min(180, Math.max(45, tot * 8)),
          totalScore: tot,
          isSelection: true,
          note: '本卷收录题库中 ' + year + ' 年的' + subName + '真题共 ' + tot +
            ' 题；并非考场完整原卷。后续往题库补入该年份更多题目，本卷会自动变长。',
          sections: secs
        });
      });

    return papers;
  }

  function buildAll() {
    KY.SUBJECTS.forEach(function (sub) {
      KY.papers[sub] = buildFor(sub);
    });
  }

  buildAll();

  /** 题库变化后重新汇编全部科目的套卷 */
  KY.papers.rebuildAll = function () {
    buildAll();
    return KY.papers;
  };

  /** 兼容旧调用名（早期版本只有英语一） */
  KY.papers.rebuildEnglish1 = function () {
    KY.papers.english1 = buildFor('english1');
    return KY.papers.english1;
  };

  /** 某科有没有"带年份的真题"（没年份就说明还没录真题） */
  KY.papers.hasReal = function (subject) {
    return listOf(subject).some(function (q) { return q.year; });
  };

  /** 便于旧代码调用 */
  KY.papers.english1HasReal = function () { return KY.papers.hasReal('english1'); };
})(window);
