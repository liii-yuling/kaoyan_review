/*!
 * recommender.js —— 定制化推题引擎
 * 挂载：KY.recommender
 *
 * 推送逻辑（见 SCHEMA.md §6）：
 *   优先级 = (1 - 掌握度) × 真题加权 × 难度匹配 × 新鲜度 × 遗忘衰减
 * 支持的模式：
 *   'weak'    未掌握考点专项（错题复习主模式）
 *   'wrong'   只围绕错题本里出现过的考点
 *   'daily'   每日定制推送（混合：未掌握 + 新题 + 复习）
 *   'exam'    模拟考试（按套卷或按科目组卷）
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  /* ---------------- 作答历史（用于去重与新鲜度） ---------------- */

  function getSeen() {
    var s = KY.store.raw.get('seen', {});
    return (s && typeof s === 'object') ? s : {};
  }
  function markSeen(questionId, correct) {
    var s = getSeen();
    var cur = s[questionId] || { count: 0, correct: 0, lastAt: 0 };
    cur.count++;
    if (correct) cur.correct++;
    cur.lastAt = Date.now();
    s[questionId] = cur;
    KY.store.raw.set('seen', s);
  }
  function seenInfo(questionId) {
    return getSeen()[questionId] || null;
  }

  /* ---------------- 掌握度与弱点 ---------------- */

  /** 某科目的考点掌握度列表，按掌握度升序（最弱在前） */
  function weakPoints(subject) {
    var mastery = KY.store.getMastery();
    var rows = [];
    KY.getPoints(subject).forEach(function (x) {
      var m = mastery[x.point.id] || { score: 0.35, attempts: 0, correct: 0, lastAt: 0 };
      rows.push({
        pointId: x.point.id,
        name: x.point.name,
        moduleId: x.module.id,
        moduleName: x.module.name,
        subject: subject,
        score: typeof m.score === 'number' ? m.score : 0.35,
        attempts: m.attempts || 0,
        correct: m.correct || 0,
        lastAt: m.lastAt || 0,
        poolSize: KY.bank.byPoint(x.point.id).length
      });
    });
    rows.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return b.poolSize - a.poolSize;
    });
    return rows;
  }

  /** 未掌握考点（score < 0.6） */
  function unmasteredPoints(subject) {
    return weakPoints(subject).filter(function (r) { return r.score < 0.6; });
  }

  /* ---------------- 打分 ---------------- */

  function masteryOf(pointId) {
    var m = KY.store.getMastery()[pointId];
    return m && typeof m.score === 'number' ? m.score : 0.35;
  }

  /**
   * 给单道题打分。分数越高越该推。
   * opts: { targetDifficulty, nowTs, preferReal }
   */
  function scoreQuestion(q, opts) {
    opts = opts || {};
    var kn = (q.knowledge || []).length ? q.knowledge : [null];

    // 取该题所有考点里"最薄弱"的那个作为基准
    var worst = 1;
    kn.forEach(function (pid) {
      if (!pid) return;
      var s = masteryOf(pid);
      if (s < worst) worst = s;
    });
    if (worst === 1) worst = 0.45; // 无考点信息的题目给中性值

    var weakness = 1 - worst;                       // 越弱越高

    // 真题加权：真题价值更高
    var real = q.year ? 1.35 : 1.0;

    // 难度匹配：与目标难度差值越小越高
    var target = opts.targetDifficulty || 3;
    var d = q.difficulty || 3;
    var difficultyFit = 1 - Math.abs(d - target) * 0.13;
    if (difficultyFit < 0.35) difficultyFit = 0.35;

    // 新鲜度 / 遗忘衰减：做过的题降权，很久没做的略微回升
    var seen = seenInfo(q.id);
    var freshness = 1;
    if (seen) {
      var days = (Date.now() - seen.lastAt) / 86400000;
      if (seen.correct > 0 && seen.count >= 2) {
        freshness = 0.28 + Math.min(days, 30) * 0.016;  // 已掌握过的，靠时间慢慢回升
      } else {
        freshness = 0.72 + Math.min(days, 14) * 0.02;   // 做错过但还没巩固的，优先重做
      }
      if (seen.correct === 0) freshness += 0.15;        // 一直做错，权重再加
    }

    // 随机抖动，避免每次推送顺序完全一致
    var jitter = 0.9 + (U.hashString(q.id) % 200) / 1000;

    var score = weakness * real * difficultyFit * freshness * jitter;

    return {
      score: score,
      parts: { weakness: weakness, real: real, difficultyFit: difficultyFit, freshness: freshness, jitter: jitter }
    };
  }

  /* ---------------- 推题主入口 ---------------- */

  /**
   * @param {Object} opts
   *   mode        'weak' | 'wrong' | 'daily' | 'subject'
   *   subject     限定科目（可选）
   *   count       需要题目数量，默认 10
   *   difficulty  目标难度 1~5（可选；默认按薄弱考点的历史难度推断）
   *   targetPoints 指定考点 id 数组（可选，优先级最高）
   *   excludeIds  需要排除的题目 id
   *   includeSeen 是否允许重复推送做过的题，默认 false（但严重薄弱的允许）
   *   seed        随机种子（可选，用于固定一套题）
   * @returns {{ items: Array, meta: Object }}
   */
  function recommend(opts) {
    opts = opts || {};
    var mode = opts.mode || 'weak';
    var subjects = opts.subject ? [opts.subject] : KY.SUBJECTS.slice();
    var count = opts.count || 10;
    var exclude = Object.create(null);
    (opts.excludeIds || []).forEach(function (id) { exclude[id] = 1; });

    var mastery = KY.store.getMastery();
    var wrongbook = KY.store.getWrongbook();

    /* --- 候选池 --- */
    var pool = [];
    subjects.forEach(function (sub) {
      pool = pool.concat(KY.bank.bySubject(sub));
    });
    if (!pool.length) return { items: [], meta: { reason: '题库为空' } };

    /* --- 模式过滤与加权 --- */
    var wrongPoints = Object.create(null);
    wrongbook.forEach(function (w) {
      (w.knowledge || []).forEach(function (pid) { wrongPoints[pid] = (wrongPoints[pid] || 0) + 1; });
    });

    var unmastered = Object.create(null);
    subjects.forEach(function (sub) {
      KY.getPoints(sub).forEach(function (x) {
        var m = mastery[x.point.id];
        var s = m && typeof m.score === 'number' ? m.score : 0.35;
        if (s < 0.6) unmastered[x.point.id] = s;
      });
    });

    var candidates = pool.filter(function (q) {
      if (exclude[q.id]) return false;
      var kn = q.knowledge || [];
      if (opts.targetPoints && opts.targetPoints.length) {
        return kn.some(function (k) { return opts.targetPoints.indexOf(k) >= 0; });
      }
      if (mode === 'wrong') {
        return kn.some(function (k) { return wrongPoints[k] > 0; }) || (q.tags || []).indexOf('错题') >= 0;
      }
      if (mode === 'weak') {
        // 未掌握考点优先；若某科未掌握考点太少，允许纳入所有题以保证有题可推
        return true;
      }
      return true;
    });

    if (!candidates.length) {
      // 放宽：允许重复推送
      candidates = pool.filter(function (q) { return !exclude[q.id]; });
      if (!candidates.length) candidates = pool.slice();
    }

    /* --- 目标难度：按最薄弱考点的题目平均难度 --- */
    var targetDifficulty = opts.difficulty;
    if (!targetDifficulty) {
      var weakIds = Object.keys(unmastered);
      var ds = [];
      weakIds.forEach(function (pid) {
        KY.bank.byPoint(pid).forEach(function (q) { ds.push(q.difficulty || 3); });
      });
      if (ds.length) {
        targetDifficulty = Math.round(ds.reduce(function (a, b) { return a + b; }, 0) / ds.length);
      } else {
        targetDifficulty = 3;
      }
    }

    /* --- 打分排序 --- */
    var scored = candidates.map(function (q) {
      var r = scoreQuestion(q, { targetDifficulty: targetDifficulty });
      var s = r.score;

      // 模式修正
      var kn = q.knowledge || [];
      if (mode === 'wrong') {
        var hitCount = kn.reduce(function (a, k) { return a + (wrongPoints[k] || 0); }, 0);
        s *= (1 + Math.min(hitCount, 4) * 0.18);
      }
      if (mode === 'weak') {
        var hasUnmastered = kn.some(function (k) { return unmastered[k] !== undefined; });
        if (hasUnmastered) s *= 1.5;
        else s *= 0.55;
      }
      if (mode === 'daily') {
        var seen = seenInfo(q.id);
        if (!seen) s *= 1.25;             // 每日推送偏向没做过的新题
        if (kn.some(function (k) { return unmastered[k] !== undefined; })) s *= 1.3;
      }

      // 严重薄弱考点额外加权
      kn.forEach(function (k) {
        var m = mastery[k];
        if (m && m.score < 0.3) s *= 1.2;
      });

      return { q: q, score: s, parts: r.parts };
    });

    scored.sort(function (a, b) { return b.score - a.score; });

    /* --- 选题：兼顾去重与考点覆盖，避免一份练习全挤在同一个考点 --- */
    var picked = [];
    var pointUsage = Object.create(null);
    var moduleUsage = Object.create(null);

    for (var i = 0; i < scored.length && picked.length < count; i++) {
      var cand = scored[i];
      var kn = cand.q.knowledge || [];
      var primary = kn[0] || cand.q.module;
      var used = pointUsage[primary] || 0;
      var modUsed = moduleUsage[cand.q.module] || 0;

      // 每个考点最多 2 题；模块内最多不超过一半题量
      if (used >= 2) continue;
      if (modUsed >= Math.max(3, Math.ceil(count / 2))) continue;

      picked.push(cand);
      pointUsage[primary] = used + 1;
      moduleUsage[cand.q.module] = modUsed + 1;
    }

    // 数量不够就放宽限制补齐
    if (picked.length < count) {
      for (var j = 0; j < scored.length && picked.length < count; j++) {
        if (picked.indexOf(scored[j]) < 0) picked.push(scored[j]);
      }
    }

    if (opts.seed !== undefined && opts.seed !== null) {
      picked = U.shuffle(picked, opts.seed);
    }

    var items = picked.map(function (x) {
      return {
        question: x.q,
        score: Math.round(x.score * 1000) / 1000,
        reason: explainReason(x.q, unmastered, wrongPoints, mastery)
      };
    });

    return {
      items: items,
      meta: {
        mode: mode,
        subject: opts.subject || 'all',
        targetDifficulty: targetDifficulty,
        poolSize: pool.length,
        candidateSize: candidates.length,
        weakPointCount: Object.keys(unmastered).length
      }
    };
  }

  /** 生成"为什么推这道题"的说明，让推送可解释 */
  function explainReason(q, unmastered, wrongPoints, mastery) {
    var reasons = [];
    (q.knowledge || []).forEach(function (pid) {
      var n = KY.getTaxNode(pid);
      if (!n) return;
      var m = mastery[pid];
      var s = m && typeof m.score === 'number' ? m.score : 0.35;
      if (wrongPoints[pid]) reasons.push('错题本里有 ' + wrongPoints[pid] + ' 道「' + n.point.name + '」的错题');
      else if (s < 0.35) reasons.push('「' + n.point.name + '」掌握度很低（' + U.pct(s) + '）');
      else if (s < 0.6) reasons.push('「' + n.point.name + '」尚未巩固（' + U.pct(s) + '）');
    });
    if (q.year) reasons.push(q.year + ' 年真题');
    var seen = seenInfo(q.id);
    if (seen && seen.correct === 0) reasons.push('此前做过但答错，需要重做');
    else if (!seen) reasons.push('还没做过的新题');
    if (!reasons.length) reasons.push('补充练习');
    return reasons.join('；');
  }

  /**
   * 组一套模拟卷（考试模式用）：
   * 优先使用已存在的套卷；否则按科目从题库按模块配额组卷。
   */
  function buildMockPaper(subject, opts) {
    opts = opts || {};
    var modules = KY.getModules(subject);
    var totalTarget = opts.count || 20;
    var perModule = Math.max(1, Math.floor(totalTarget / Math.max(1, modules.length)));
    var picked = [];
    var mastery = KY.store.getMastery();

    modules.forEach(function (m) {
      var cands = KY.bank.byModule(m.id).map(function (q) {
        var worst = 1;
        (q.knowledge || []).forEach(function (pid) {
          var s = mastery[pid] && typeof mastery[pid].score === 'number' ? mastery[pid].score : 0.35;
          if (s < worst) worst = s;
        });
        if (worst === 1) worst = 0.5;
        return { q: q, s: (1 - worst) * (q.year ? 1.3 : 1) };
      }).sort(function (a, b) { return b.s - a.s; });

      // 每个模块尽量混合真题与模拟题
      var real = cands.filter(function (x) { return x.q.year; });
      var mock = cands.filter(function (x) { return !x.q.year; });
      var take = [];
      var i = 0;
      while (take.length < perModule && (i < real.length || i < mock.length)) {
        if (i < real.length) take.push(real[i].q);
        if (take.length < perModule && i < mock.length) take.push(mock[i].q);
        i++;
      }
      picked = picked.concat(take);
    });

    picked = U.shuffle(picked).slice(0, totalTarget);

    // 模块配额可能凑不满目标题量（模块数少于目标数时必然发生），
    // 这里用全科候补给补足，避免"要 15 题只给 7 题"。
    if (picked.length < totalTarget) {
      var usedIds = Object.create(null);
      picked.forEach(function (q) { usedIds[q.id] = 1; });
      var filler = KY.bank.bySubject(subject).map(function (q) {
        var worst = 1;
        (q.knowledge || []).forEach(function (pid) {
          var s = mastery[pid] && typeof mastery[pid].score === 'number' ? mastery[pid].score : 0.35;
          if (s < worst) worst = s;
        });
        if (worst === 1) worst = 0.5;
        return { q: q, s: (1 - worst) * (q.year ? 1.3 : 1) };
      }).filter(function (x) { return !usedIds[x.q.id]; })
        .sort(function (a, b) { return b.s - a.s; });

      for (var k = 0; k < filler.length && picked.length < totalTarget; k++) {
        picked.push(filler[k].q);
      }
      picked = U.shuffle(picked);
    }

    return {
      id: 'mock-' + subject + '-' + Date.now().toString(36),
      subject: subject,
      title: KY.subjectName(subject) + ' · 智能组卷模拟考',
      year: null,
      durationMin: opts.durationMin || 120,
      totalScore: picked.reduce(function (s, q) { return s + (q.score || 1); }, 0),
      isMock: true,
      sections: [{
        id: 'mock.s1',
        name: '综合部分',
        desc: '由系统根据你的薄弱考点自动组卷',
        scorePerQuestion: 1,
        questions: picked.map(function (q) { return q.id; })
      }]
    };
  }

  KY.recommender = {
    recommend: recommend,
    weakPoints: weakPoints,
    unmasteredPoints: unmasteredPoints,
    scoreQuestion: scoreQuestion,
    explainReason: explainReason,
    buildMockPaper: buildMockPaper,
    markSeen: markSeen,
    getSeen: getSeen,
    seenInfo: seenInfo
  };
})(window);
