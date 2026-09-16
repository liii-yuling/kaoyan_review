/*!
 * papertext.js —— 真题原文解析器
 * 挂载：KY.papertext
 *
 * 用途：把从 PDF/Word/网页里复制出来的"整卷真题原文"解析成结构化题目，
 *       再交给 KY.importer 的流水线（校验 → 自动归类 → 逐行审查 → 导出）。
 *
 * 为什么不直接凭记忆写题库：
 *   我没有真题原文，硬写只会产出"看起来像真题的错误内容"。
 *   对复习工具来说这比没有更糟——她会把错的背进去。
 *   所以这里做的是"把你手上的资料快速变成题库"的工具。
 *
 * 支持的原文写法（尽量宽容，真实卷子格式五花八门）：
 *
 *   一、单项选择题            ← 分节标题，用来推断板块
 *   1. 当 x→0 时，下列无穷小中阶数最高的是（  ）
 *   A. x^2
 *   B. sin x
 *   答案：D
 *   解析：x^3 是三阶无穷小…
 *
 *   2、设函数 f(x)=…            ← 题号也认「2、」「(2)」「第2题」
 *   ①… ②…
 *   【答案】B   【解析】…
 *
 *   【文章】                     ← 阅读材料块，会附加给后面所有题目
 *   …原文…
 *   【题目】
 *   21. …
 *
 * 也支持把答案单独贴在"答案区"里：
 *   1-5 ABCDB   6-10 ACBDA      ← 区间写法
 *   11.A 12.B 13.C              ← 逐题写法
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  /* ================================================================== */
  /* 各类标记                                                            */
  /* ================================================================== */

  // 题号：1. / 1、/ 1) / （1） / 第1题.
  var Q_RE = /^\s*(?:第\s*)?[（(\[]?\s*(\d{1,3})\s*[）)\]]?\s*(?:题)?\s*[.、．)）:：]?\s+(?=\S)|^\s*(?:第\s*)?[（(\[]\s*(\d{1,3})\s*[）)\]]\s*(?=\S)|^\s*(\d{1,3})\s*[.、．]\s*(?=\S)/;

  // 选项：A. / A、/ （A） / A) / A:
  var OPT_RE = /^\s*[（(\[]?\s*([A-Ha-h])\s*[）)\]]?\s*[.、．)）:：]\s*(.+)$/;

  // 答案行
  var ANS_RE = /^\s*[【\[]?\s*(?:正确)?(?:参考)?答案\s*[】\]]?\s*[:：]?\s*(.*)$/;
  // 解析行
  var EXP_RE = /^\s*[【\[]?\s*(?:解析|详解|解答|【解析】|评析)\s*[】\]]?\s*[:：]?\s*(.*)$/;
  // 分节标题
  var SEC_RE = /^\s*(?:[一二三四五六七八九十]+\s*[、.．]|Section\s+[IVXAB]+\b|Part\s+[A-C]\b|第\s*[一二三四五六七八九十]+\s*部分)\s*(.*)$/i;
  // 文章块
  var ART_START_RE = /^\s*[【\[]\s*(?:文章|原文|阅读材料|材料|passage)\s*[】\]]\s*[:：]?\s*$/i;
  var ART_END_RE = /^\s*[【\[]\s*(?:题目|问题|quest?ions?)\s*[】\]]\s*[:：]?\s*$/i;

  function isQuestionStart(line) {
    if (OPT_RE.test(line)) return false;
    var m = line.match(Q_RE);
    if (!m) return false;
    // 排除「2020年」这类误判：题号后面必须还有内容
    var rest = line.replace(Q_RE, '').trim();
    return rest.length > 0;
  }

  function qNumberOf(line) {
    var m = line.match(Q_RE);
    if (!m) return 0;
    return parseInt(m[1] || m[2] || m[3], 10) || 0;
  }

  /* ================================================================== */
  /* 答案区解析                                                          */
  /* ================================================================== */

  /**
   * 解析独立答案区。
   * 支持：
   *   1-5 ABCDB   6-10 ACBDA
   *   11.A 12.B 13.C
   *   21-25 BCDAB
   *   1. A  2. B
   * @returns {{ map:Object, ranges:Number, singles:Number, leftovers:Array }}
   */
  function parseAnswerKey(text) {
    var s = String(text || '').replace(/\r\n?/g, '\n');
    var map = Object.create(null);
    var ranges = 0, singles = 0;
    var leftovers = [];

    // 1) 区间 + 连写字母：1-5 ABCDB
    var rangeRe = /(\d{1,3})\s*[-–—~至到]\s*(\d{1,3})\s*[.、．:：]?\s*([A-Ha-h]{2,60})/g;
    var m;
    while ((m = rangeRe.exec(s)) !== null) {
      var from = parseInt(m[1], 10);
      var to = parseInt(m[2], 10);
      var letters = m[3].toUpperCase().split('');
      if (to < from) { var t = from; from = to; to = t; }
      var n = to - from + 1;
      if (letters.length < n) {
        leftovers.push('区间 ' + m[1] + '-' + m[2] + ' 只给了 ' + letters.length + ' 个答案，需要 ' + n + ' 个');
        n = letters.length;
      }
      for (var i = 0; i < n; i++) {
        if (!map[from + i]) map[from + i] = letters[i];
      }
      ranges++;
    }

    // 2) 逐题：11.A / 11 A / 11、AB
    var singleRe = /(?:^|[\s，,;；、])(\d{1,3})\s*[.、．)）:：]?\s*([A-Ha-h]{1,8})(?=[\s，,;；、]|$)/g;
    while ((m = singleRe.exec(s)) !== null) {
      var no = parseInt(m[1], 10);
      // 已被区间填过的跳过（区间更可靠）
      if (!map[no]) {
        map[no] = m[2].toUpperCase();
        singles++;
      }
    }

    // 3) 剩下的非字母答案（数学填空题那种）逐行捡
    s.split('\n').forEach(function (line) {
      // 先把已经识别过的区间/字母对从行里抹掉，避免重复
      var stripped = line
        .replace(/(\d{1,3})\s*[-–—~至到]\s*(\d{1,3})\s*[.、．:：]?\s*[A-Ha-h]{2,60}/g, ' ')
        .replace(/(?:^|[\s，,;；、])(\d{1,3})\s*[.、．)）:：]?\s*[A-Ha-h]{1,8}(?=[\s，,;；、]|$)/g, ' ');
      var re = /(?:^|[\s，,;；、])(\d{1,3})\s*[.、．)）:：]\s*([^\s，,；;、]{1,40})/g;
      var mm;
      while ((mm = re.exec(stripped)) !== null) {
        var k = parseInt(mm[1], 10);
        if (!map[k]) { map[k] = mm[2]; singles++; }
      }
    });

    return { map: map, ranges: ranges, singles: singles, leftovers: leftovers };
  }

  /**
   * 把答案表还原成文本，塞回答案输入框。
   * 这么做是为了让"拖一个答案 PDF"和"手打答案"走同一条解析路径 ——
   * 不新增第二套合并逻辑，就不会出现两条路结果不一致的问题。
   */
  function answerKeyToText(map) {
    var nos = Object.keys(map || {}).map(Number).filter(function (n) {
      return !isNaN(n);
    }).sort(function (a, b) { return a - b; });
    if (!nos.length) return '';
    var lines = [];
    var buf = [];
    nos.forEach(function (n) {
      buf.push(n + '.' + map[n]);
      if (buf.length === 10) { lines.push(buf.join('  ')); buf = []; }
    });
    if (buf.length) lines.push(buf.join('  '));
    return lines.join('\n');
  }

  /** 答案表里有哪些题号 */
  function answerNumbers(map) {
    return Object.keys(map || {}).map(Number).filter(function (n) { return !isNaN(n); })
      .sort(function (a, b) { return a - b; });
  }

  /**
   * 核对"题目"和"答案"对不对得上。
   * 这是从两份独立 PDF 合并时最容易出错的地方，必须显式报出来：
   * 哪些题没答案、哪些答案没题目、答案比题目多还是少。
   */
  function answerCoverage(records, map) {
    var nums = answerNumbers(map);
    var have = Object.create(null);
    (records || []).forEach(function (r) {
      if (r && r._no != null) have[r._no] = 1;
    });
    var qNos = Object.keys(have).map(Number).sort(function (a, b) { return a - b; });
    var answerSet = Object.create(null);
    nums.forEach(function (n) { answerSet[n] = 1; });

    var missing = qNos.filter(function (n) { return !answerSet[n]; });     // 有题没答案
    var extra = nums.filter(function (n) { return !have[n]; });            // 有答案没题
    var filled = (records || []).filter(function (r) {
      return r && r.answer && r.answer.length;
    }).length;

    return {
      questions: (records || []).length,
      answered: filled,
      answerCount: nums.length,
      questionNumbers: qNos,
      answerNumbers: nums,
      missing: missing,      // 题目缺答案
      extra: extra,          // 答案多出来（可能题号从中间开始，也可能答案件里有别的卷子）
      complete: qNos.length > 0 && missing.length === 0
    };
  }

  /** 一句话描述覆盖率，给界面提示用 */
  function coverageText(cov) {
    if (!cov) return '';
    if (!cov.questions) return '还没有解析出题目';
    var parts = ['共 ' + cov.questions + ' 题，已配答案 ' + cov.answered + ' 题'];
    if (cov.missing.length) {
      parts.push('缺答案：第 ' + cov.missing.slice(0, 20).join('、') +
        (cov.missing.length > 20 ? ' 等 ' + cov.missing.length + ' 题' : ' 题'));
    } else if (cov.answerCount) {
      parts.push('全部题目都有答案');
    }
    if (cov.extra.length) {
      parts.push('答案件多出 ' + cov.extra.length + ' 个题号（第 ' +
        cov.extra.slice(0, 10).join('、') + (cov.extra.length > 10 ? ' …' : '') + '），没对上题目');
    }
    return parts.join('；');
  }

  /* ================================================================== */
  /* 题型推断                                                            */
  /* ================================================================== */

  function inferType(stem, options, answer) {
    if (options && options.length) {
      return (answer && answer.length > 1) ? 'multi' : 'single';
    }
    var t = String(stem || '');
    if (/_{2,}|（\s*）|\(\s*\)|填空/.test(t)) {
      // 有括号但没选项 → 填空
      return /填空/.test(t) ? 'blank' : 'blank';
    }
    if (/计算|证明|求解|解答|讨论|求|论述|分析|说明|翻译|作文|简述/.test(t)) return 'subjective';
    return 'blank';
  }

  /* ================================================================== */
  /* 主解析                                                              */
  /* ================================================================== */

  /**
   * @param {String} text 题干+选项（可含答案与解析，也可只含题）
   * @param {Object} ctx  { subject, year, source, module, answers(答案区文本), passage(阅读材料) }
   * @returns {{ records:Array, errors:Array, stats:Object }}
   */
  function parse(text, ctx) {
    ctx = ctx || {};
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var keyMap = ctx.answers ? parseAnswerKey(ctx.answers).map : Object.create(null);

    var records = [];
    var errors = [];
    var cur = null;
    var mode = 'stem';          // stem | explanation
    var curSection = '';
    var curPassage = String(ctx.passage || '').trim();
    var inArticle = false;
    var articleBuf = [];

    function flush() {
      if (!cur) return;
      finishRecord(cur);
      records.push(cur);
      cur = null;
    }

    function finishRecord(r) {
      /* 答案：题目里写的优先，其次答案区 */
      if ((!r.answer || !r.answer.length) && keyMap[r.no]) {
        r.answer = parseAnswerValue(keyMap[r.no]);
        r.answerSrc = 'key';
      }
      if (!r.answerSrc) r.answerSrc = (r.answer && r.answer.length) ? 'inline' : '';
      /* 组装 */
      r.stem = r.stemLines.join('\n').trim();
      r.explanation = r.expLines.join('\n').trim();
      delete r.stemLines;
      delete r.expLines;
      // 注意：r.no 不在这里删——输出时要拿它填 _no
    }

    lines.forEach(function (line, i) {
      var raw = line;
      var trimmed = line.trim();

      /* ---- 注释行（PDF 提取时用来插页码标记） ---- */
      if (trimmed.indexOf('//') === 0 || trimmed.indexOf(';;') === 0) return;

      /* ---- 阅读材料块 ---- */
      if (ART_START_RE.test(trimmed)) { inArticle = true; articleBuf = []; return; }
      if (ART_END_RE.test(trimmed)) {
        if (inArticle && articleBuf.length) curPassage = articleBuf.join('\n').trim();
        inArticle = false;
        return;
      }
      if (inArticle) { articleBuf.push(raw); return; }

      /* ---- 分节标题 ---- */
      var sm = trimmed.match(SEC_RE);
      if (sm && !isQuestionStart(trimmed) && !OPT_RE.test(trimmed)) {
        flush();
        curSection = sm[1] ? (sm[0].trim()) : trimmed;
        return;
      }

      /* ---- 新题 ---- */
      if (isQuestionStart(trimmed)) {
        flush();
        cur = {
          no: qNumberOf(trimmed),
          stemLines: [],
          expLines: [],
          options: [],
          answer: [],
          section: curSection,
          passage: curPassage,
          _line: i + 1
        };
        mode = 'stem';
        var rest = trimmed.replace(Q_RE, '').trim();
        if (rest) cur.stemLines.push(rest);
        return;
      }

      if (!cur) {
        // 题目之前的内容：当作可能的阅读材料或忽略
        if (trimmed && !/^[-=_*·—\s]+$/.test(trimmed) && trimmed.length > 30) {
          // 长段落且还没开始出题 → 视为阅读材料
          if (!curPassage) curPassage = trimmed;
        }
        return;
      }

      /* ---- 选项 ---- */
      var om = trimmed.match(OPT_RE);
      if (om && mode !== 'explanation') {
        cur.options.push({ key: om[1].toUpperCase(), text: om[2].trim() });
        return;
      }

      /* ---- 答案行 ---- */
      var am = trimmed.match(ANS_RE);
      if (am) {
        var v = (am[1] || '').trim();
        cur.answer = parseAnswerValue(v);
        cur.answerSrc = 'inline';
        mode = 'stem';
        return;
      }

      /* ---- 解析行 ---- */
      var em = trimmed.match(EXP_RE);
      if (em) {
        mode = 'explanation';
        var first = (em[1] || '').trim();
        if (first) cur.expLines.push(first);
        return;
      }

      /* ---- 普通行 ---- */
      if (!trimmed) return;
      if (mode === 'explanation') cur.expLines.push(trimmed);
      else cur.stemLines.push(trimmed);
    });

    flush();

    /* ---------------- 组装成 importer 兼容记录 ---------------- */
    var out = [];
    var missingAnswer = [];
    var noOptions = [];

    records.forEach(function (r) {
      var answerRaw = (r.answer && r.answer.length) ? r.answer : null;

      var stem = r.stem;
      if (r.passage) stem = '【阅读材料】\n' + r.passage + '\n\n' + stem;

      var type = inferType(r.stem, r.options, answerRaw);

      if (!answerRaw || !answerRaw.length) {
        missingAnswer.push('第 ' + (r._line || '?') + ' 行起（题号 ' + (r.no || '?') + '）没有答案');
      }
      if (['single', 'multi'].indexOf(type) >= 0 && !r.options.length) {
        noOptions.push('题号 ' + (r.no || '?') + ' 推断为选择题但没有选项');
        type = 'blank';
      }

      out.push({
        subject: ctx.subject || '',
        module: ctx.module || '',
        type: type,
        stem: stem,
        options: r.options,
        answer: answerRaw || [],
        explanation: r.explanation || '',
        source: ctx.source || (ctx.year ? (ctx.year + ' 年真题') : '真题原文录入'),
        year: ctx.year || '',
        difficulty: ctx.difficulty || 3,
        section: r.section || '',
        answerSrc: r.answerSrc || '',
        _no: r.no
      });
    });
    var byType = {}, bySection = {};
    out.forEach(function (q) {
      byType[q.type] = (byType[q.type] || 0) + 1;
      if (q.section) bySection[q.section] = (bySection[q.section] || 0) + 1;
    });

    return {
      records: out,
      errors: errors,
      warnings: missingAnswer.concat(noOptions),
      stats: {
        count: out.length,
        byType: byType,
        bySection: bySection,
        withAnswer: out.filter(function (q) { return q.answer && q.answer.length; }).length,
        withOptions: out.filter(function (q) { return q.options && q.options.length; }).length,
        withExplanation: out.filter(function (q) { return q.explanation; }).length,
        withPassage: out.filter(function (q) { return q.stem.indexOf('【阅读材料】') === 0; }).length,
        keyUsed: out.filter(function (q) { return q.answerSrc === 'key'; }).length,
        numbers: out.map(function (q) { return q._no; }).filter(Boolean)
      }
    };
  }

  /**
   * 把「答案」那一行的内容解析成答案数组。
   * 选择题 → 选项字母数组；其余 → 文本（填空题按 | 或 空格 分空）
   */
  function parseAnswerValue(v) {
    var s = String(v || '').trim();
    if (!s) return [];
    s = s.replace(/^[【\[（(]|[】\]）)]$/g, '').trim();

    // 纯字母（A / AB / A,C / A、B）
    var letters = s.replace(/[\s,，、;；\/|]/g, '');
    if (/^[A-Ha-h]{1,8}$/.test(letters)) {
      return U.normalizeKeys(letters);
    }
    // 形如 "A. 因为…" → 取开头的字母
    var m = s.match(/^([A-Ha-h])(?:\s*[．.、)）:：]|\s|$)/);
    if (m) return U.normalizeKeys(m[1]);

    // 其余按空切分（填空题多空）
    return s.split(/[|｜]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  KY.papertext = {
    parse: parse,
    parseAnswerKey: parseAnswerKey,
    parseAnswerValue: parseAnswerValue,
    answerKeyToText: answerKeyToText,
    answerNumbers: answerNumbers,
    answerCoverage: answerCoverage,
    coverageText: coverageText,
    inferType: inferType,
    isQuestionStart: isQuestionStart
  };
})(window);
