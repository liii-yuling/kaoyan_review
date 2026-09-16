/*!
 * plan.js —— 每日计划引擎
 * 挂载：KY.plan
 *
 * 职责：
 *   1. 把运营者手写的计划文本解析成结构化计划（自动识别科目、考点、题量、套卷）
 *   2. 导出成 src/data/plan.shared.js（跟着网站发布，使用者刷新即得）
 *   3. 解析"今天该做什么"
 *   4. 记录使用者的打勾进度（存在使用者自己的浏览器里）
 *
 * 设计取向：宁可少推断、也不要猜错。
 *   推断结果一律带 confidence 与 inferred 标记，运营台会把推断结果摊开让他核对。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  var PROGRESS_KEY = 'planProgress';

  /* ================================================================== */
  /* 读取共享计划                                                        */
  /* ================================================================== */

  function getShared() {
    var sp = KY.sharedPlan;
    // 容错：如果运营者手写成数组也认
    if (Array.isArray(sp)) return { updatedAt: '', note: '', plans: sp };
    if (!sp || typeof sp !== 'object') return { updatedAt: '', note: '', plans: [] };
    return {
      updatedAt: sp.updatedAt || '',
      note: sp.note || '',
      plans: Array.isArray(sp.plans) ? sp.plans : []
    };
  }

  function getMeta() {
    return KY.sharedPlanMeta || { builtAt: '', dayCount: 0, taskCount: 0, source: 'empty' };
  }

  function allPlans() {
    return getShared().plans.slice();
  }

  function hasPlan() {
    return allPlans().length > 0;
  }

  /* ================================================================== */
  /* 文本解析                                                            */
  /* ================================================================== */

  var DAY_RE = /^#+\s*/;
  var TASK_RE = /^[-*·•]\s+/;
  var DATE_RE = /(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/;
  var DAYNO_RE = /第\s*(\d+)\s*天/;
  var MIN_RE = /@\s*(\d+)\s*(?:分|分钟|min|mins)?\s*$/i;
  var COUNT_RE = /(\d+)\s*(?:道)?\s*题/;
  var EXPLICIT_RE = /\[([^\]]+)\]/;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /** 任务 id 由任务文本派生：这样运营者调整顺序不会让她的打勾位置错乱。
   *  同一段文字出现多次时用 occurrence 区分（重排相同文字不影响，因为内容一样）。 */
  function taskIdOf(text, occurrence) {
    var base = U.normalizeText(text).slice(0, 80);
    return 't' + (U.hashString(base + '#' + (occurrence || 0)) % 1000000).toString(36);
  }

  /* ------------------------------------------------------------------ */
  /* 科目识别：计划文字是人写的，直接按科目名匹配最可靠                  */
  /* ------------------------------------------------------------------ */

  /** 委托给 importer（同一套别名表，只维护一处） */
  function subjectFromText(text) {
    return KY.importer.subjectFromText(text);
  }

  /** 在给定科目的考点里找匹配（优先用考点名做子串匹配） */
  function matchPoints(text, subject, limit) {
    if (!subject) return [];
    var hay = U.normalizeText(text);
    var hits = [];
    KY.getPoints(subject).forEach(function (x) {
      var name = U.normalizeText(x.point.name);
      if (!name) return;
      // 考点名整体命中，或者去掉括号后的主干命中
      var main = name.replace(/[（(].*?[）)]/g, '');
      if (hay.indexOf(name) >= 0 || (main.length >= 3 && hay.indexOf(main) >= 0)) {
        hits.push({ id: x.point.id, name: x.point.name, weight: name.length });
      }
    });
    hits.sort(function (a, b) { return b.weight - a.weight; });
    return hits.slice(0, limit || 3).map(function (h) { return h.id; });
  }

  /** 找匹配的套卷（按年份 / 标题关键词 / 科目名） */
  function matchPaper(text) {
    var papers = KY.bank.papers();
    if (!papers.length) return null;
    var hay = U.normalizeText(text);
    var ym = text.match(/(\d{4})\s*年?/);
    var year = ym ? parseInt(ym[1], 10) : 0;
    var subj = subjectFromText(text);

    // 1) 标题直配
    for (var i = 0; i < papers.length; i++) {
      var t = U.normalizeText(papers[i].title);
      if (t && hay.indexOf(t) >= 0) return papers[i];
    }
    // 2) 年份匹配（科目一致优先，其次只看年份）
    if (year) {
      var sameYear = papers.filter(function (p) {
        return p.year === year || String(p.title).indexOf(String(year)) >= 0;
      });
      if (sameYear.length) {
        var withSub = sameYear.filter(function (p) { return !subj || p.subject === subj; });
        return (withSub[0] || sameYear[0]);
      }
    }
    // 3) 只按科目找（认不出科目时不要瞎挂，交给调用方给提示）
    if (subj) {
      var bySub = papers.filter(function (p) { return p.subject === subj; });
      if (bySub.length) return bySub[0];
    }
    return null;
  }

  /**
   * 解析一条任务行。
   * @param {String} raw 原始行
   * @param {Number} occurrence 同一段文字在这一天里第几次出现（用于派生稳定 id）
   * @returns {Object} task
   */
  function parseTaskLine(raw, occurrence) {
    var text = String(raw || '').replace(TASK_RE, '').trim();
    var issues = [];

    /* 预计分钟 */
    var estMin = 0;
    var mm = text.match(MIN_RE);
    if (mm) {
      estMin = parseInt(mm[1], 10) || 0;
      text = text.replace(MIN_RE, '').trim();
    }

    /* 显式标注：[paper:en1-2019] 或 [math1|m1.p.limit.eval,m1.p.limit.exist] */
    var paperId = '';
    var explicitSubject = '';
    var explicitPoints = [];
    var em = text.match(EXPLICIT_RE);
    if (em) {
      var inner = em[1].trim();
      text = text.replace(EXPLICIT_RE, ' ').replace(/\s+/g, ' ').trim();
      if (/^paper\s*:/i.test(inner)) {
        paperId = inner.replace(/^paper\s*:/i, '').trim();
        if (paperId && !KY.bank.paper(paperId)) {
          issues.push('指定的套卷 id「' + paperId + '」在题库里找不到');
          paperId = '';
        }
      } else {
        var parts = inner.split('|');
        explicitSubject = KY.importer.canonSubject(parts[0] || '');
        if (parts[1]) {
          var kn = KY.importer.canonKnowledge(parts[1], explicitSubject || '');
          explicitPoints = kn.ids;
          if (kn.unknown.length) issues.push('考点「' + kn.unknown.join('/') + '」不存在，已忽略');
        }
        if (!explicitSubject && !explicitPoints.length) {
          issues.push('方括号里的内容无法识别，已当作普通文字');
        }
      }
    }

    /* 任务类型 */
    var kind = 'plain';
    var subject = '';
    var points = [];
    var count = 0;
    var paper = null;
    var inferred = false;

    var looksExam = /^\s*(考试|测验|模考|测试)/.test(text) || /真题卷|套卷|模考/.test(text);

    if (paperId) {
      kind = 'exam';
      paper = KY.bank.paper(paperId);
    } else if (looksExam) {
      kind = 'exam';
      paper = matchPaper(text);
      if (!paper) {
        issues.push('认不出是哪套卷子，她会看到任务但点「开始考试」只能进组卷页');
      } else {
        inferred = true;
      }
    } else {
      // 计划文字是人写的，优先按科目名匹配；认不出再用关键词引擎兜底
      var named = subjectFromText(text);
      var det = KY.classifier.detectSubject(text, explicitSubject || named || null);
      subject = explicitSubject || named || det.subject;
      // 只有确实像"要练点什么"时才当刷题任务：出现科目名或题量
      var hasSubjectWord = !!explicitSubject || !!named || det.scores[det.subject] >= 3;
      var cm = text.match(COUNT_RE);
      if (cm) count = parseInt(cm[1], 10) || 0;

      if (hasSubjectWord || explicitPoints.length) {
        kind = 'practice';
        inferred = true;
        points = explicitPoints.length ? explicitPoints.slice() : matchPoints(text, subject, 2);
        if (!points.length) {
          issues.push('没识别出具体考点，她会看到任务但点「去刷题」只能按整科推题');
        }
      } else {
        kind = 'plain';
        subject = '';
      }
    }

    return {
      id: taskIdOf(text, occurrence),
      seq: occurrence,
      text: text,
      kind: kind,
      subject: subject || '',
      points: points,
      count: count,
      paperId: paper ? paper.id : '',
      paperTitle: paper ? paper.title : '',
      estMin: estMin,
      inferred: inferred && !explicitPoints.length && !paperId,
      issues: issues
    };
  }

  /**
   * 解析整份计划文本。
   * @returns {{ plans:Array, errors:Array, stats:Object }}
   */
  function parseText(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var plans = [];
    var errors = [];
    var cur = null;
    var seq = 0;
    var occur = Object.create(null);   // 每天内"同一段任务文字"的出现次数，用于派生稳定 id

    lines.forEach(function (line, i) {
      var raw = line.trim();
      if (!raw) return;
      if (raw.charAt(0) === '/' && raw.charAt(1) === '/') return;   // 注释

      if (DAY_RE.test(raw)) {
        occur = Object.create(null);
        var head = raw.replace(DAY_RE, '').trim();
        var date = '';
        var dm = head.match(DATE_RE);
        if (dm) {
          date = dm[1] + '-' + pad2(parseInt(dm[2], 10)) + '-' + pad2(parseInt(dm[3], 10));
          head = head.replace(DATE_RE, ' ').trim();
        }
        var dayNo = 0;
        var nm = head.match(DAYNO_RE);
        if (nm) {
          dayNo = parseInt(nm[1], 10) || 0;
          head = head.replace(DAYNO_RE, ' ').trim();
        }
        head = head.replace(/^[-—|·,，\s]+/, '').replace(/[-—|·,，\s]+$/, '').trim();

        cur = {
          id: date ? ('plan-' + date) : ('plan-' + (dayNo || (plans.length + 1))),
          date: date,
          dayIndex: dayNo || (plans.length + 1),
          title: head || (date ? date : ('第 ' + (dayNo || (plans.length + 1)) + ' 天')),
          tasks: []
        };
        plans.push(cur);
        return;
      }

      if (TASK_RE.test(raw)) {
        if (!cur) {
          // 没有 # 开头的日期行就直接写任务：自动建一天
          cur = {
            id: 'plan-' + (plans.length + 1),
            date: '',
            dayIndex: plans.length + 1,
            title: '第 ' + (plans.length + 1) + ' 天',
            tasks: []
          };
          plans.push(cur);
        }
        seq++;
        // 用"去掉标记与时长后的文字"统计出现次数，保证重排任务不会改变 id
        var ok = U.normalizeText(raw.replace(TASK_RE, '').replace(MIN_RE, '').trim());
        var occ = occur[ok] || 0;
        occur[ok] = occ + 1;
        var task = parseTaskLine(raw, occ);
        if (task.issues.length) {
          task.issues.forEach(function (msg) {
            errors.push('第 ' + (i + 1) + ' 行：' + msg + '（任务：' + U.truncate(task.text, 24) + '）');
          });
        }
        cur.tasks.push(task);
        return;
      }

      errors.push('第 ' + (i + 1) + ' 行：既不是「# 第N天」也不是「- 任务」，已忽略 —— ' + U.truncate(raw, 30));
    });

    // 同一 id 冲突（同一天写了两次）时加后缀
    var seen = Object.create(null);
    plans.forEach(function (p) {
      if (seen[p.id]) {
        p.id = p.id + '-' + (seen[p.id] + 1);
        errors.push('同一天出现了两次，已自动区分 id：' + p.title);
      }
      seen[p.id.split('-').slice(0, 3).join('-')] = (seen[p.id.split('-').slice(0, 3).join('-')] || 0) + 1;
    });

    var taskCount = plans.reduce(function (a, p) { return a + p.tasks.length; }, 0);
    var kindCount = plans.reduce(function (a, p) {
      p.tasks.forEach(function (t) { a[t.kind] = (a[t.kind] || 0) + 1; });
      return a;
    }, {});

    return {
      plans: plans,
      errors: errors,
      stats: {
        dayCount: plans.length,
        taskCount: taskCount,
        byKind: kindCount,
        inferredCount: plans.reduce(function (a, p) {
          return a + p.tasks.filter(function (t) { return t.inferred; }).length;
        }, 0)
      }
    };
  }

  /* ================================================================== */
  /* 导出共享文件                                                        */
  /* ================================================================== */

  function nowStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function indent(obj, spaces) {
    var pad = new Array(spaces + 1).join(' ');
    return JSON.stringify(obj, null, 2).split('\n').map(function (line, i) {
      return i === 0 ? line : pad + line;
    }).join('\n');
  }

  function buildSharedJs(plans, opts) {
    opts = opts || {};
    var list = plans || [];
    var builtAt = nowStamp();
    var taskCount = list.reduce(function (a, p) { return a + (p.tasks || []).length; }, 0);
    var withDate = list.filter(function (p) { return p.date; }).length;

    var header = [
      '/*!',
      ' * plan.shared.js —— 共享每日计划（运营者写，使用者看）',
      ' *',
      ' * 本文件由「运营台 → 每日计划 → 导出计划文件」自动生成。',
      ' * 生成时间：' + builtAt,
      ' * 天数：' + list.length + '　任务数：' + taskCount,
      ' *',
      ' * 覆盖项目里的 src/data/plan.shared.js，然后双击「发布.cmd」并上传 dist，',
      ' * 她刷新页面即可看到今天的任务并在页面上打勾。她的打勾进度存在她自己浏览器里。',
      ' *',
      ' * 格式规范见 SCHEMA.md 第 11 节。手改也行，但不建议。',
      ' */',
      '(function (global) {',
      "  'use strict';",
      '  var KY = (global.KY = global.KY || {});',
      ''
    ].join('\n');

    var body = [
      '  KY.sharedPlan = ' + indent({
        updatedAt: builtAt,
        note: opts.note || '',
        plans: list
      }, 2) + ';',
      '',
      '  KY.sharedPlanMeta = ' + indent({
        builtAt: builtAt,
        dayCount: list.length,
        taskCount: taskCount,
        withDateCount: withDate,
        source: opts.source || 'console'
      }, 2) + ';',
      '})(window);',
      ''
    ].join('\n');

    return header + '\n' + body;
  }

  function buildSharedJson(plans, opts) {
    opts = opts || {};
    return JSON.stringify({
      type: 'kaoyan-shared-plan',
      version: 1,
      exportedAt: new Date().toISOString(),
      note: opts.note || '',
      plans: plans || []
    }, null, 2) + '\n';
  }

  /* ================================================================== */
  /* 今天该做什么                                                        */
  /* ================================================================== */

  function todayStr(now) {
    var d = now ? new Date(now) : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function getProgress() {
    var p = KY.store.raw.get(PROGRESS_KEY, {});
    return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
  }

  function setProgress(obj) {
    KY.store.raw.set(PROGRESS_KEY, obj || {});
    KY.bus.emit('plan:changed', obj);
  }

  function keyOf(planId, taskId) { return planId + '::' + taskId; }

  function isDone(planId, taskId) {
    return !!getProgress()[keyOf(planId, taskId)];
  }

  function toggle(planId, taskId) {
    var p = getProgress();
    var k = keyOf(planId, taskId);
    if (p[k]) delete p[k]; else p[k] = Date.now();
    setProgress(p);
    return !!p[k];
  }

  function setDone(planId, taskId, done) {
    var p = getProgress();
    var k = keyOf(planId, taskId);
    if (done) p[k] = Date.now(); else delete p[k];
    setProgress(p);
  }

  /** 某天的完成情况 */
  function planStats(plan) {
    var tasks = (plan && plan.tasks) || [];
    var done = tasks.filter(function (t) { return isDone(plan.id, t.id); }).length;
    var estMin = tasks.reduce(function (a, t) { return a + (t.estMin || 0); }, 0);
    var doneMin = tasks.reduce(function (a, t) {
      return a + (isDone(plan.id, t.id) ? (t.estMin || 0) : 0);
    }, 0);
    return {
      total: tasks.length,
      done: done,
      pct: tasks.length ? done / tasks.length : 0,
      estMin: estMin,
      doneMin: doneMin,
      allDone: tasks.length > 0 && done === tasks.length
    };
  }

  /**
   * 解析"今天"该做哪一份计划。
   * 优先级：
   *   1. 有日期且等于今天 → 用它
   *   2. 否则按顺序找第一份"还没做完"的 → 用它（这样她永远有下一步可做）
   *   3. 都做完了 → 用最后一份
   * @returns {{ plan:Object|null, index:Number, reason:String, today:String }}
   */
  function resolveToday(now) {
    var plans = allPlans();
    var today = todayStr(now);
    if (!plans.length) return { plan: null, index: -1, reason: 'empty', today: today };

    for (var i = 0; i < plans.length; i++) {
      if (plans[i].date && plans[i].date === today) {
        return { plan: plans[i], index: i, reason: 'matched-date', today: today };
      }
    }

    for (var j = 0; j < plans.length; j++) {
      if (!planStats(plans[j]).allDone) {
        return { plan: plans[j], index: j, reason: 'next-unfinished', today: today };
      }
    }

    return { plan: plans[plans.length - 1], index: plans.length - 1, reason: 'all-done', today: today };
  }

  /** 整体进度（所有天） */
  function overall() {
    var plans = allPlans();
    var total = 0, done = 0, estMin = 0, doneMin = 0, daysDone = 0;
    plans.forEach(function (p) {
      var s = planStats(p);
      total += s.total; done += s.done;
      estMin += s.estMin; doneMin += s.doneMin;
      if (s.allDone) daysDone++;
    });
    return {
      dayCount: plans.length,
      daysDone: daysDone,
      total: total,
      done: done,
      pct: total ? done / total : 0,
      estMin: estMin,
      doneMin: doneMin
    };
  }

  /** 清空本机打勾进度（运营者换了新计划或她想重来时用） */
  function resetProgress() {
    setProgress({});
  }

  KY.plan = {
    getShared: getShared,
    getMeta: getMeta,
    allPlans: allPlans,
    hasPlan: hasPlan,
    parseText: parseText,
    parseTaskLine: parseTaskLine,
    matchPoints: matchPoints,
    matchPaper: matchPaper,
    buildSharedJs: buildSharedJs,
    buildSharedJson: buildSharedJson,
    todayStr: todayStr,
    resolveToday: resolveToday,
    getProgress: getProgress,
    setProgress: setProgress,
    isDone: isDone,
    setDone: setDone,
    toggle: toggle,
    planStats: planStats,
    overall: overall,
    resetProgress: resetProgress,
    taskIdOf: taskIdOf
  };
})(window);
