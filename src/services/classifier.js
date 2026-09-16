/*!
 * classifier.js —— 错题自动识别与归类引擎（本地规则版，离线可用）
 * 挂载：KY.classifier
 *
 * 能力：
 *  1. parseQuestion(text)  从 OCR/粘贴的文本里解析出题干、选项、答案、题号
 *  2. detectSubject(text)  判定属于哪一科
 *  3. classify({...})      归类到 module + knowledge points + 错因类型 + 生成错因总结
 *  4. fromQuestion(q, ua)  把练习/考试中做错的题直接转成错题条目
 *
 * 若在「设置」里启用了大模型，KY.ai 会在本地结果之上做一次增强，
 * 但本地引擎始终是兜底，保证断网也能用。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var U = KY.util;

  /* ================================================================== */
  /* 文本解析                                                            */
  /* ================================================================== */

  // 选项行： A. xxx / A、xxx / （A）xxx / A) xxx
  var OPTION_RE = /^[\s]*[（(\[]?([A-Ha-h])[）)\].、:：]\s*([^\n]+)$/;
  // 答案行： 答案：A / 【答案】AC / 正确答案是 B
  var ANSWER_RE = /(?:正确)?答案[\s:：是为]*[（(\[]?([A-Ha-h](?:\s*[,，、\/]?\s*[A-Ha-h])*)[）)\]]?/;
  // 题号行： 1. / 第1题 / (1)
  var QNO_RE = /^[\s]*[（(\[]?\s*(?:第\s*)?(\d{1,3})\s*(?:题)?\s*[）)\].、:：]\s*/;
  // 分节标题： 一、单项选择题 / 二、填空题
  var SECTION_RE = /^[\s]*[一二三四五六七八九十]+\s*[、.]\s*(.+)$/;

  /**
   * 从自由文本中解析题目结构。
   * 返回 { stem, options:[{key,text}], answer, qno, section, raw }
   */
  function parseQuestion(text) {
    var raw = String(text || '').replace(/\r\n?/g, '\n');
    var lines = raw.split('\n');

    var stemLines = [];
    var options = [];
    var answer = [];
    var qno = '';
    var section = '';
    var startedOptions = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      if (!trimmed) {
        if (!startedOptions) stemLines.push('');
        continue;
      }

      // 答案行（可能在任意位置）
      var am = trimmed.match(ANSWER_RE);
      if (am) {
        answer = U.normalizeKeys(am[1].replace(/[\s,，、\/]/g, '').split(''));
        continue;
      }

      // 题号
      if (!qno) {
        var qm = trimmed.match(QNO_RE);
        if (qm) {
          qno = qm[1];
          trimmed = trimmed.replace(QNO_RE, '').trim();
          if (!trimmed) continue;
        }
      }

      // 选项
      var om = trimmed.match(OPTION_RE);
      if (om) {
        startedOptions = true;
        options.push({ key: om[1].toUpperCase(), text: om[2].trim() });
        continue;
      }

      // 分节标题
      var sm = trimmed.match(SECTION_RE);
      if (sm && !startedOptions && stemLines.length === 0) {
        section = sm[1].trim();
        continue;
      }

      if (!startedOptions) stemLines.push(trimmed);
    }

    // 去掉选项区后面可能混入的解析文字
    var stem = stemLines.join('\n').trim();
    stem = stem.replace(/^[\s]*解析[\s:：][\s\S]*$/, '').trim();

    return {
      stem: stem,
      options: options,
      answer: answer,
      qno: qno,
      section: section,
      raw: raw
    };
  }

  /* ================================================================== */
  /* 关键词打分                                                          */
  /* ================================================================== */

  var CJK_RE = /[\u4e00-\u9fa5]/;

  /** 构造检索文本：保留空格（英文词边界用）+ 小写 + 半角 */
  function makeHaystack(text) {
    return U.toHalfWidth(String(text || '')).toLowerCase();
  }

  /**
   * 统计关键词命中次数。
   * 中文关键词：直接子串匹配。
   * 英文关键词：要求词边界，避免 "that" 命中 "whatsoever" 之类的假阳性。
   */
  function countHits(hay, keyword) {
    var kw = U.toHalfWidth(String(keyword || '')).toLowerCase();
    if (!kw) return 0;

    if (CJK_RE.test(kw)) {
      var c = 0, idx = 0;
      while ((idx = hay.indexOf(kw, idx)) >= 0) { c++; idx += kw.length; }
      return c;
    }

    // 英文/公式关键词
    var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var edgeStart = /^[a-z0-9]/.test(kw) ? '(?![a-z0-9])' : '';
    var edgeEnd = /[a-z0-9]$/.test(kw) ? '(?![a-z0-9])' : '';
    var re;
    try {
      re = new RegExp('(?<![a-z0-9])' + escaped + '(?![a-z0-9])', 'g');
    } catch (e) {
      // 老引擎不支持后行断言，退化处理
      re = new RegExp(escaped, 'g');
    }
    var m = hay.match(re);
    return m ? m.length : 0;
  }

  /** 关键词权重：越长越具体，权重越高 */
  function kwWeight(kw) {
    var len = String(kw).length;
    if (len >= 8) return 2.2;
    if (len >= 5) return 1.7;
    if (len >= 3) return 1.3;
    return 1.0;
  }

  /**
   * 给一组 points 打分。
   * return [{ pointId, name, score, hits:[{kw,count}] }]，按 score 降序
   */
  function scorePoints(hay, points) {
    var rows = [];
    points.forEach(function (p) {
      var total = 0;
      var hits = [];
      (p.keywords || []).forEach(function (kw) {
        var c = countHits(hay, kw);
        if (c > 0) {
          var w = kwWeight(kw) * c;
          total += w;
          hits.push({ kw: kw, count: c, w: w });
        }
      });
      if (total > 0) {
        hits.sort(function (a, b) { return b.w - a.w; });
        rows.push({ pointId: p.id, name: p.name, score: total, hits: hits });
      }
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows;
  }

  /* ================================================================== */
  /* 科目识别                                                            */
  /* ================================================================== */

  // 强特征：出现即大幅加权
  var SUBJECT_MARKERS = {
    english1: [
      { re: /\b(?:according to|the author|infer from|passage|paragraph|following statement)\b/i, w: 6 },
      { re: /\b(?:choose the best word|for each numbered blank|translate the following)\b/i, w: 8 },
      { re: /[a-z]{4,}\s+[a-z]{4,}\s+[a-z]{4,}\s+[a-z]{4,}/i, w: 2.5 } // 连续英文
    ],
    math1: [
      { re: /[∫∑∏√±≤≥≠∞∂]/, w: 5 },
      { re: /\b(?:lim|dx|dy|dz|dθ|dy\/dx|∂z\/∂x|det|tr\(|rank|diverge|converge)\b/i, w: 4 },
      { re: /(?:矩阵|行列式|特征值|极限|导数|积分|级数|概率|方差|期望)/, w: 5 },
      { re: /\^\{?-?\d|_\{?[a-z0-9]/i, w: 1.2 }
    ],
    signals: [
      { re: /(?:信号|系统|卷积|冲激|阶跃|傅里叶|拉普拉斯|拉氏|z\s*变换|频谱|抽样|奈奎斯特|极点|零状态|零输入)/, w: 5 },
      { re: /(?:δ\(|u\(t\)|u\(n\)|h\(t\)|h\(n\)|H\(s\)|H\(z\)|jω|s\s*域|z\s*域)/, w: 6 },
      { re: /(?:收敛域|ROC|稳定性|因果)/, w: 3 }
    ],
    politics: [
      { re: /(?:马克思主义|唯物|辩证|矛盾|生产力|生产关系|剩余价值|社会主义|新民主主义|改革开放|核心价值观|依法治国|习近平|党的|人民|社会存在)/, w: 5 },
      { re: /(?:毛泽东思想|中国特色|三个代表|科学发展观|五位一体|四个全面|二十大|不忘初心)/, w: 7 },
      { re: /(?:鸦片战争|辛亥革命|五四运动|抗日战争|十一届三中全会|近代史)/, w: 6 },
      { re: /(?:正确|错误|体现了|说明了|这表明)/, w: 0.6 }
    ]
  };

  function detectSubject(text, hint) {
    var hay = makeHaystack(text);
    var raw = String(text || '');
    var scores = {};

    KY.SUBJECTS.forEach(function (sub) {
      var s = 0;
      (SUBJECT_MARKERS[sub] || []).forEach(function (mk) {
        if (mk.re.test(raw) || mk.re.test(hay)) s += mk.w;
      });
      // 考点关键词命中
      var points = KY.getPoints(sub).map(function (x) { return x.point; });
      var rows = scorePoints(hay, points);
      s += rows.slice(0, 6).reduce(function (a, r) { return a + r.score; }, 0);
      scores[sub] = s;
    });

    if (hint && scores[hint] !== undefined) scores[hint] += 3;

    var best = null, bestScore = 0, total = 0;
    Object.keys(scores).forEach(function (k) {
      total += scores[k];
      if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    });

    return {
      subject: bestScore > 0 ? best : (hint || 'math1'),
      scores: scores,
      confidence: total > 0 ? (bestScore / total) : 0
    };
  }

  /* ================================================================== */
  /* 错因判定                                                            */
  /* ================================================================== */

  var ERROR_SIGNALS = [
    { type: 'calculation', w: 4, re: /(?:算错|计算错|计算失误|粗心算|加减|符号|算成|笔误|抄错|代入错|漏乘|漏除|通分|约分|小数点)/ },
    { type: 'formula', w: 4.5, re: /(?:公式记错|公式错|记错公式|公式不记得|定理记错|公式用错|忘了公式|结论记错)/ },
    { type: 'concept', w: 4, re: /(?:概念不清|不理解|没理解|定义不|不懂|混淆|搞混|分不清|性质记错|原理不懂|不会判断)/ },
    { type: 'reading', w: 4, re: /(?:看错题|审题|漏看|没看到|条件没用|答非所问|理解偏|看漏|单位没注意|问的是)/ },
    { type: 'method', w: 4, re: /(?:没思路|不会做|想不到|方法不对|思路错|不知道从哪|切入点|该用什么方法|没找到方法)/ },
    { type: 'vocab', w: 4.5, re: /(?:单词不认|生词|词义不|不认识这个词|术语不|专业词|词汇量)/ },
    { type: 'logic', w: 4, re: /(?:推理错|逻辑错|因果倒置|以偏概全|偷换概念|论证|前提错|推不出来)/ },
    { type: 'careless', w: 3.5, re: /(?:粗心|马虎|手滑|看串行|填错|涂错|选错行)/ }
  ];

  /**
   * 判定错因。
   * 依据：用户备注文本 + 作答与正确答案的关系 + 题型。
   */
  function detectErrorType(ctx) {
    var note = String(ctx.note || '');
    var hay = makeHaystack(note + ' ' + (ctx.stem || ''));
    var scores = {};

    ERROR_SIGNALS.forEach(function (sig) {
      if (sig.re.test(note)) scores[sig.type] = (scores[sig.type] || 0) + sig.w;
    });

    // 从作答差异推断
    var ua = U.normalizeKeys(ctx.myAnswer);
    var ca = U.normalizeKeys(ctx.correctAnswer);
    var type = ctx.type || 'single';

    if (ua.length && ca.length) {
      if (type === 'blank') {
        var uText = U.normalizeText((ctx.myAnswer || []).join ? (ctx.myAnswer || []).join('') : ctx.myAnswer);
        var cText = U.normalizeText((ctx.correctAnswer || []).join ? (ctx.correctAnswer || []).join('') : ctx.correctAnswer);
        if (uText && cText && uText === cText) scores.careless = (scores.careless || 0) + 1;
        else if (uText.length && cText.length && Math.abs(uText.length - cText.length) <= 1) {
          scores.calculation = (scores.calculation || 0) + 2;   // 差一点，多半是计算
        } else {
          scores.method = (scores.method || 0) + 1.2;
        }
      } else if (type === 'multi') {
        var extra = ua.filter(function (k) { return ca.indexOf(k) < 0; });
        var missing = ca.filter(function (k) { return ua.indexOf(k) < 0; });
        if (extra.length && !missing.length) scores.concept = (scores.concept || 0) + 2;      // 多选了不该选的
        else if (missing.length && !extra.length) scores.reading = (scores.reading || 0) + 1.6; // 漏选
        else if (extra.length && missing.length) scores.concept = (scores.concept || 0) + 1.2;
      } else {
        // 单选选错
        scores[type === 'single' || type === 'cloze-item' ? 'concept' : 'method'] =
          (scores[type === 'single' || type === 'cloze-item' ? 'concept' : 'method'] || 0) + 0.8;
      }
    }

    // 学科倾向
    if (ctx.subject === 'english1' && !Object.keys(scores).length) {
      scores.vocab = 0.7;
    }
    if (ctx.subject === 'signals' && !Object.keys(scores).length) {
      scores.method = 0.6;
    }

    var best = 'unknown', bestScore = 0;
    Object.keys(scores).forEach(function (k) {
      if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    });

    // 置信度不足时留待人工确认
    var confidence = bestScore >= 1.5 ? U.clamp(bestScore / 6, 0.2, 1) : 0;
    if (confidence < 0.25) return { type: 'unknown', confidence: confidence, scores: scores };

    return { type: best, confidence: confidence, scores: scores };
  }

  /* ================================================================== */
  /* 错因总结生成                                                        */
  /* ================================================================== */

  function buildSummary(info) {
    var et = KY.getErrorType(info.errorType);
    var lines = [];

    var knNames = info.knowledge.map(function (pid) {
      var n = KY.getTaxNode(pid);
      return n ? n.point.name : pid;
    });
    var modName = info.moduleName || '未识别板块';

    lines.push('【归属】' + KY.subjectName(info.subject) + ' · ' + modName);
    if (knNames.length) lines.push('【涉及考点】' + knNames.join('、'));
    lines.push('【错因判定】' + et.name + '（' + et.desc + '）');

    if (info.hits && info.hits.length) {
      var kw = info.hits.slice(0, 6).map(function (h) { return h.kw; });
      lines.push('【判定依据】题干/解析中出现关键特征：' + kw.join('、'));
    }
    if (info.note) lines.push('【你的备注】' + info.note);

    lines.push('【改进建议】' + et.advice);

    if (info.subject === 'english1' && knNames.length) {
      lines.push('【英语提分动作】把该题所在段落精读一遍，标出所有连接词与指代关系，再默写一遍正确选项的搭配。');
    }
    if (info.subject === 'math1') {
      lines.push('【数学提分动作】把该考点的定义/定理条件抄写一遍，然后不看答案独立重做本题，并额外做 2 道同考点变式题。');
    }
    if (info.subject === 'signals') {
      lines.push('【信号提分动作】把该考点涉及的基本变换对与性质整理成一张对照表（时域 ↔ 频域/复频域），并复算一遍本题的极点与收敛域。');
    }
    if (info.subject === 'politics') {
      lines.push('【政治提分动作】在教材上定位该考点的原文表述，把易混选项的错误表述单独摘录，做成"错误表述清单"。');
    }

    return lines.join('\n');
  }

  /* ================================================================== */
  /* 主入口                                                              */
  /* ================================================================== */

  /**
   * 归类一条错题。
   * @param {Object} input
   *   text          {String}  原文（OCR 结果或粘贴文本）
   *   subject       {String}  可选，用户已指定科目（会作为提示）
   *   module        {String}  可选，用户已指定模块
   *   knowledge     {String[]} 可选，用户已指定考点（指定后直接采用）
   *   myAnswer      {String|String[]} 我的错误作答
   *   correctAnswer {String|String[]} 正确答案
   *   note          {String}  用户备注（"为什么错"）
   *   type          {String}  题干题型
   *   imageData     {String}  可选，原图 dataURL
   * @returns {Object} 错题条目（可直接存入错题本，用户可再修正）
   */
  function classify(input) {
    input = input || {};
    var parsed = input.parsed || parseQuestion(input.text || '');
    var stem = input.stem || parsed.stem || String(input.text || '').trim();
    var options = input.options || parsed.options || [];
    var searchText = [stem, (options || []).map(function (o) { return o.key + ' ' + o.text; }).join(' ')].join('\n');

    // 1. 科目
    var sub = input.subject
      ? { subject: input.subject, scores: {}, confidence: 1 }
      : detectSubject(searchText, null);

    // 2. 模块 + 考点
    var modules = KY.getModules(sub.subject);
    var moduleId = input.module || '';
    var moduleName = '';
    var knowledge = [];
    var confidence = sub.confidence;
    var topHits = [];

    if (input.knowledge && input.knowledge.length) {
      // 用户已指定：只补全模块名
      knowledge = input.knowledge.slice();
      var n0 = KY.getTaxNode(knowledge[0]);
      if (n0) { moduleId = moduleId || n0.module.id; moduleName = n0.module.name; }
      confidence = 1;
    } else {
      var hay = makeHaystack(searchText);
      var bestModule = null, bestModuleScore = 0;

      modules.forEach(function (m) {
        var rows = scorePoints(hay, m.points);
        var s = rows.reduce(function (a, r) { return a + r.score; }, 0);
        if (s > bestModuleScore) { bestModuleScore = s; bestModule = { module: m, rows: rows }; }
      });

      if (bestModule) {
        moduleId = moduleId || bestModule.module.id;
        moduleName = bestModule.module.name;
        // 取该模块得分最高的考点；若与其他模块头部考点差距不大也一并纳入
        var picked = bestModule.rows.slice(0, 2).filter(function (r) { return r.score >= 1.0; });
        knowledge = picked.map(function (r) { return r.pointId; });
        topHits = (picked[0] && picked[0].hits) ? picked[0].hits : [];
        if (bestModuleScore > 0) {
          confidence = U.clamp(bestModuleScore / (bestModuleScore + 6), 0.15, 0.95);
        }
      }

      // 兜底：全科范围内再找一次
      if (!knowledge.length) {
        var allRows = scorePoints(hay, KY.getPoints(sub.subject).map(function (x) { return x.point; }));
        var good = allRows.slice(0, 2).filter(function (r) { return r.score >= 1.0; });
        knowledge = good.map(function (r) { return r.pointId; });
        if (knowledge.length) {
          var nm = KY.getTaxNode(knowledge[0]);
          if (nm) { moduleId = moduleId || nm.module.id; moduleName = nm.module.name; }
          topHits = good[0].hits || [];
        }
      }
    }

    if (!moduleId) { moduleId = modules[0] ? modules[0].id : ''; moduleName = modules[0] ? modules[0].name : ''; }

    // 3. 题型推断：不能只看有没有解析出选项。
    //    只有当作答"看起来像选项 key"时才按选择题处理；
    //    否则 x>1 这类填空答案会被误判成填空并套用"长度相近=计算失误"的启发式，导致错因判错。
    var guessType = input.type;
    if (!guessType) {
      if (options.length) {
        guessType = 'single';
      } else if (U.looksLikeOptionKeys(input.correctAnswer) || U.looksLikeOptionKeys(input.myAnswer)) {
        guessType = U.normalizeKeys(input.correctAnswer).length > 1 ? 'multi' : 'single';
      } else if (Array.isArray(input.myAnswer) || Array.isArray(input.correctAnswer)) {
        guessType = 'blank';
      } else {
        guessType = 'blank';
      }
    }

    // 4. 错因
    var err = detectErrorType({
      note: input.note || '',
      stem: stem,
      myAnswer: input.myAnswer,
      correctAnswer: input.correctAnswer || parsed.answer,
      type: guessType,
      subject: sub.subject
    });

    var summary = buildSummary({
      subject: sub.subject,
      moduleName: moduleName,
      knowledge: knowledge,
      errorType: err.type,
      hits: topHits,
      note: input.note || ''
    });

    var now = Date.now();
    return {
      id: U.uid('w'),
      subject: sub.subject,
      module: moduleId,
      stem: stem,
      options: options,
      myAnswer: Array.isArray(input.myAnswer) ? input.myAnswer.join('') : (input.myAnswer || ''),
      correctAnswer: U.normalizeKeys(input.correctAnswer || parsed.answer),
      explanation: input.explanation || '',
      imagePath: input.imageData || '',
      knowledge: knowledge,
      knowledgeConfirmed: !!(input.knowledge && input.knowledge.length),
      errorType: err.type,
      errorConfidence: err.confidence,
      errorScores: err.scores,
      errorSummary: summary,
      difficulty: input.difficulty || 3,
      createdAt: now,
      reviewCount: 0,
      lastReviewAt: 0,
      correctStreak: 0,
      mastered: false,
      source: input.source || '手动上传'
    };
  }

  /**
   * 把练习/考试中做错的题转成错题条目。
   */
  function fromQuestion(q, userAnswer, note) {
    var item = classify({
      subject: q.subject,
      module: q.module,
      knowledge: q.knowledge,
      stem: q.stem,
      options: q.options,
      myAnswer: userAnswer,
      correctAnswer: q.answer,
      explanation: q.explanation,
      note: note || '',
      type: q.type,
      difficulty: q.difficulty,
      source: q.source ? ('错题来源：' + q.source) : '练习中做错',
      parsed: { stem: q.stem, options: q.options || [], answer: q.answer || [] }
    });
    item.questionId = q.id;
    item.source = q.source || '练习中做错';
    item.year = q.year;
    item.video = q.video;
    item.knowledgeConfirmed = true;
    item.errorSummary = item.errorSummary.replace('【归属】', '【来源题目】' + (q.source || q.id) + '\n【归属】');
    return item;
  }

  /**
   * 批量归类：文本里有多道题时（按题号切分）逐题归类。
   */
  function classifyBatch(text, defaults) {
    var chunks = splitQuestions(text);
    return chunks.map(function (c) {
      var merged = {};
      Object.keys(defaults || {}).forEach(function (k) { merged[k] = defaults[k]; });
      merged.text = c;
      return classify(merged);
    });
  }

  /** 按"数字 + . 、"把长文本切成多道题 */
  function splitQuestions(text) {
    var raw = String(text || '').replace(/\r\n?/g, '\n');
    var lines = raw.split('\n');
    var chunks = [];
    var cur = [];
    var seenFirst = false;

    lines.forEach(function (line) {
      var isNew = QNO_RE.test(line.trim()) && line.trim().length > 2;
      if (isNew && (seenFirst || cur.length)) {
        var joined = cur.join('\n').trim();
        if (joined) chunks.push(joined);
        cur = [line];
        seenFirst = true;
      } else {
        cur.push(line);
        if (line.trim()) seenFirst = true;
      }
    });
    var last = cur.join('\n').trim();
    if (last) chunks.push(last);

    if (!chunks.length) chunks.push(raw.trim());
    return chunks;
  }

  KY.classifier = {
    parseQuestion: parseQuestion,
    detectSubject: detectSubject,
    detectErrorType: detectErrorType,
    scorePoints: scorePoints,
    countHits: countHits,
    makeHaystack: makeHaystack,
    classify: classify,
    classifyBatch: classifyBatch,
    fromQuestion: fromQuestion,
    splitQuestions: splitQuestions,
    buildSummary: buildSummary
  };
})(window);
