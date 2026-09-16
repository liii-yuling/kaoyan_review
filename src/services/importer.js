/*!
 * importer.js —— 题库导入引擎
 * 挂载：KY.importer
 *
 * 支持把使用者自带的题库灌进来：
 *   · JSON：本系统 schema / 裸数组 / {questions:[...]} / {banks:{...}} 都能认
 *   · CSV ：中文表头优先，同时兼容英文表头；标准 RFC4180 引号转义
 *   · 粘贴：直接贴 CSV 文本或 JSON 文本
 *
 * 关键设计：
 *   1. 导入的题目存在 localStorage 的 userBank 里，与内置题库合并，不动源码文件。
 *   2. 考点可以留空——留空时自动调用 KY.classifier 从题干推断，人工在预览界面确认。
 *   3. 逐行给结论：成功 / 自动补全了什么 / 哪一行错在哪，绝不静默丢数据。
 *   4. 一行一条视频链接也能一起进来：`B站视频` 列写 BV 号，导入时自动完成绑定。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  /* ================================================================== */
  /* 表头别名                                                            */
  /* ================================================================== */

  var HEADER_ALIASES = {
    id: ['id', '编号', '题目id', '题号id'],
    subject: ['subject', '科目', '学科'],
    module: ['module', '板块', '章节', '模块'],
    type: ['type', '题型', '类型'],
    stem: ['stem', '题干', '题目', '题目内容'],
    stemHtml: ['stemhtml', '题干html'],
    optionA: ['optiona', '选项a', 'a'],
    optionB: ['optionb', '选项b', 'b'],
    optionC: ['optionc', '选项c', 'c'],
    optionD: ['optiond', '选项d', 'd'],
    optionE: ['optione', '选项e', 'e'],
    optionF: ['optionf', '选项f', 'f'],
    optionG: ['optiong', '选项g', 'g'],
    optionH: ['optionh', '选项h', 'h'],
    answer: ['answer', '答案', '参考答案', '正确答案'],
    explanation: ['explanation', '解析', '详解', '答案解析'],
    knowledge: ['knowledge', '考点', '知识点', '考点id'],
    difficulty: ['difficulty', '难度'],
    source: ['source', '来源', '出处'],
    year: ['year', '年份', '真题年份'],
    tags: ['tags', '标签'],
    rubric: ['rubric', '评分要点', '评分标准'],
    score: ['score', '分值'],
    videoQuery: ['videoquery', 'b站关键词', '视频关键词', '讲解关键词'],
    video: ['video', 'b站视频', '视频', '视频链接', '讲解视频']
  };

  var SUBJECT_ALIASES = {
    english1: ['english1', '英语一', '英语（一）', '英语(一)', '英语', 'en1'],
    math1: ['math1', '数学一', '数学（一）', '数学(一)', '数学', 'm1'],
    signals: ['signals', '信号与系统', '信号', 'sig'],
    politics: ['politics', '政治', '考研政治', 'pol']
  };

  var TYPE_ALIASES = {
    single: ['single', '单选', '单项选择题', '单选题'],
    multi: ['multi', '多选', '多项选择', '多选题'],
    judge: ['judge', '判断', '判断题'],
    blank: ['blank', '填空', '填空题'],
    'cloze-item': ['cloze-item', '完形填空', '选词填空', '完型'],
    subjective: ['subjective', '主观', '主观题', '解答题', '作文', '翻译', '分析题', '计算题', '证明题']
  };

  function normKey(s) {
    return U.toHalfWidth(String(s || ''))
      .toLowerCase()
      .replace(/[\s_\-（）()【】\[\]]/g, '');
  }

  function buildHeaderMap() {
    var map = Object.create(null);
    Object.keys(HEADER_ALIASES).forEach(function (field) {
      HEADER_ALIASES[field].forEach(function (alias) {
        map[normKey(alias)] = field;
      });
    });
    return map;
  }
  var HEADER_MAP = buildHeaderMap();

  function canonSubject(v) {
    var k = normKey(v);
    if (!k) return '';
    var keys = Object.keys(SUBJECT_ALIASES);
    for (var i = 0; i < keys.length; i++) {
      if (SUBJECT_ALIASES[keys[i]].some(function (a) { return normKey(a) === k; })) return keys[i];
    }
    return '';
  }

  /* 按长度倒序，避免「数学」抢在「数学一」前面匹配 */
  var SUBJECT_INLINE_ALIASES = [
    ['signals', '信号与系统'], ['signals', '信号'],
    ['english1', '英语一'], ['english1', '英语（一）'], ['english1', '英语'],
    ['math1', '数学一'], ['math1', '数学（一）'], ['math1', '数学'],
    ['politics', '政治']
  ].sort(function (a, b) { return normKey(b[1]).length - normKey(a[1]).length; });

  /**
   * 从一段自由文字里认出科目名（用于计划任务、资料标题这类人写的文本）。
   * 认不出就返回 ''——不猜。canonSubject 要求整串完全匹配，这个函数是子串匹配。
   */
  function subjectFromText(text) {
    var hay = normKey(text);
    if (!hay) return '';
    for (var i = 0; i < SUBJECT_INLINE_ALIASES.length; i++) {
      if (hay.indexOf(normKey(SUBJECT_INLINE_ALIASES[i][1])) >= 0) return SUBJECT_INLINE_ALIASES[i][0];
    }
    return '';
  }

  function canonType(v) {
    var k = normKey(v);
    if (!k) return '';
    var keys = Object.keys(TYPE_ALIASES);
    for (var i = 0; i < keys.length; i++) {
      if (TYPE_ALIASES[keys[i]].some(function (a) { return normKey(a) === k; })) return keys[i];
    }
    return '';
  }

  /** 板块：接受 module id 或板块中文名 */
  function canonModule(v, subject) {    var raw = String(v || '').trim();
    if (!raw) return '';
    if (KY.taxIndex[raw]) return raw; // 误把考点填进板块列也救一下
    var subs = subject ? [subject] : KY.SUBJECTS;
    var k = normKey(raw);
    for (var i = 0; i < subs.length; i++) {
      var mods = KY.getModules(subs[i]);
      for (var j = 0; j < mods.length; j++) {
        if (mods[j].id === raw || normKey(mods[j].name) === k) return mods[j].id;
      }
    }
    return '';
  }

  /** 考点：接受 point id 或考点中文名，支持多值 */
  function canonKnowledge(v, subject) {
    var raw = String(v || '').trim();
    if (!raw) return { ids: [], unknown: [] };
    var parts = raw.split(/[|,，、;；\/\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var ids = [], unknown = [];
    var subs = subject ? [subject] : KY.SUBJECTS;

    parts.forEach(function (p) {
      if (KY.taxIndex[p]) { ids.push(p); return; }
      var k = normKey(p);
      var found = '';
      for (var i = 0; i < subs.length && !found; i++) {
        var pts = KY.getPoints(subs[i]);
        for (var j = 0; j < pts.length; j++) {
          if (normKey(pts[j].point.name) === k) { found = pts[j].point.id; break; }
        }
      }
      // 再宽松一点：包含匹配
      if (!found) {
        for (var a = 0; a < subs.length && !found; a++) {
          var pts2 = KY.getPoints(subs[a]);
          for (var b = 0; b < pts2.length; b++) {
            if (normKey(pts2[b].point.name).indexOf(k) >= 0 || k.indexOf(normKey(pts2[b].point.name)) >= 0) {
              found = pts2[b].point.id; break;
            }
          }
        }
      }
      if (found) ids.push(found); else unknown.push(p);
    });

    // 去重
    var seen = Object.create(null);
    ids = ids.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
    return { ids: ids, unknown: unknown };
  }

  /* ================================================================== */
  /* CSV 解析（RFC4180：支持引号包裹、内嵌逗号与换行、双写引号转义）      */
  /* ================================================================== */

  function parseCsv(text) {
    var s = String(text || '').replace(/^\uFEFF/, ''); // 去 BOM
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;

    while (i < s.length) {
      var c = s[i];

      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }

      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }

      field += c; i++;
    }
    // 最后一行
    if (field.length || row.length) { row.push(field); rows.push(row); }

    // 丢掉完全空行
    return rows.filter(function (r) {
      return r.some(function (x) { return String(x).trim().length > 0; });
    });
  }

  /* ================================================================== */
  /* 题型与答案推断                                                      */
  /* ================================================================== */

  function inferType(options, answer, declared) {
    if (declared) return declared;
    if (options.length) {
      var keys = U.normalizeKeys(answer);
      return keys.length > 1 ? 'multi' : 'single';
    }
    if (!String(answer || '').trim()) return 'subjective';
    return 'blank';
  }

  function parseAnswer(raw, type, options) {
    // JSON 里答案本来就是数组，直接用；CSV 里是字符串，按分隔符拆
    if (Array.isArray(raw)) {
      if (type === 'subjective' || type === 'blank') {
        return raw.map(function (x) { return String(x).trim(); }).filter(Boolean);
      }
      return U.normalizeKeys(raw);
    }
    var s = String(raw === null || raw === undefined ? '' : raw).trim();
    if (type === 'subjective') {
      // 主观题：参考答案要点
      return s ? s.split(/[|｜\n]/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
    }
    if (type === 'blank') {
      // 填空：按空分隔
      return s ? s.split(/[|｜\n]/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
    }
    // 选择题
    return U.normalizeKeys(s.replace(/[\s,，、\/;；]/g, ''));
  }

  /**
   * 取出选项。兼容三种写法：
   *   1) CSV 的 optionA..optionH 列
   *   2) JSON 的 options: [{key,text}, ...]（本系统的原生 schema）
   *   3) JSON 的 options: { A: '...', B: '...' } 或 options: ['...','...']
   */
  function extractOptions(raw) {
    var out = [];
    var seen = Object.create(null);

    function add(key, text) {
      var k = String(key || '').trim().toUpperCase();
      var t = String(text === null || text === undefined ? '' : text).trim();
      if (!/^[A-H]$/.test(k) || !t || seen[k]) return;
      seen[k] = 1;
      out.push({ key: k, text: t });
    }

    // 1) CSV 列
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(function (k) {
      var v = raw['option' + k];
      if (v !== undefined && v !== null && String(v).trim() !== '') add(k, v);
    });

    // 2)/3) JSON options
    var o = raw.options;
    if (Array.isArray(o)) {
      o.forEach(function (item, i) {
        if (item === null || item === undefined) return;
        if (typeof item === 'object') add(item.key || item.k || String.fromCharCode(65 + i), item.text || item.t || item.value);
        else add(String.fromCharCode(65 + i), item);
      });
    } else if (o && typeof o === 'object') {
      Object.keys(o).forEach(function (k) { add(k, o[k]); });
    }

    out.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    return out;
  }

  function parseRubric(raw, score, type) {
    if (type !== 'subjective') return undefined;
    if (raw === null || raw === undefined || raw === '') return undefined;

    // JSON 里 rubric 本来就是 [{point, score}]
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      var items0 = raw.map(function (r) {
        return { point: String(r.point || r.name || '').trim(), score: (typeof r.score === 'number' ? r.score : null) };
      }).filter(function (r) { return r.point; });
      if (!items0.length) return undefined;
      var none0 = items0.filter(function (r) { return r.score === null; }).length;
      if (none0) {
        var used0 = items0.reduce(function (a, r) { return a + (r.score || 0); }, 0);
        var each0 = Math.round((Math.max(0, (score || 10) - used0) / none0) * 100) / 100;
        items0.forEach(function (r) { if (r.score === null) r.score = each0; });
      }
      return items0;
    }

    var s = Array.isArray(raw)
      ? raw.map(function (x) { return String(x); }).join('|')
      : String(raw).trim();
    if (!s) return undefined;
    var items = s.split(/[|｜\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
    var out = [];
    var totalGiven = 0;
    items.forEach(function (item) {
      var m = item.match(/^(.*?)[:：]?\s*(\d+(?:\.\d+)?)\s*分?$/);
      if (m && m[1].trim()) {
        out.push({ point: m[1].trim(), score: parseFloat(m[2]) });
        totalGiven += parseFloat(m[2]);
      } else {
        out.push({ point: item, score: null });
      }
    });
    // 没写分值的，用总分平摊
    var noneCount = out.filter(function (r) { return r.score === null; }).length;
    if (noneCount) {
      var used = out.reduce(function (a, r) { return a + (r.score || 0); }, 0);
      var remain = Math.max(0, (score || 10) - used);
      var each = Math.round((remain / noneCount) * 100) / 100;
      out.forEach(function (r) { if (r.score === null) r.score = each; });
    }
    void totalGiven;
    return out;
  }

  function parseDifficulty(v) {
    var s = String(v || '').trim();
    if (!s) return 3;
    var stars = (s.match(/★|⭐|\*/g) || []).length;
    if (stars) return U.clamp(stars, 1, 5);
    var n = parseInt(s.replace(/[^\d]/g, ''), 10);
    if (isNaN(n)) return 3;
    // 兼容 1~10 分制
    if (n > 5 && n <= 10) n = Math.ceil(n / 2);
    return U.clamp(n, 1, 5);
  }

  function parseYear(v) {
    var n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
    if (isNaN(n) || n < 1990 || n > 2100) return undefined;
    return n;
  }

  /** 从"B站视频"列里抽出全部 BVID */
  function parseVideoLinks(raw) {
    var s = String(raw || '').trim();
    if (!s) return [];
    var out = [];
    var re = /BV[0-9A-Za-z]{10}/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (out.indexOf(m[0]) < 0) out.push(m[0]);
    }
    return out;
  }

  /* ================================================================== */
  /* 单条记录归一化                                                      */
  /* ================================================================== */

  /**
   * @param {Object} raw 原始键值对（键已归一化为 schema 字段）
   * @param {Number} index 行号（用于报错定位，1 起）
   * @param {Object} opts  { autoClassify:Boolean, defaultSubject:String }
   * @returns {Object} { question, issues[], videoLinks[] }
   */
  function normalizeOne(raw, index, opts) {
    opts = opts || {};
    var issues = [];
    var q = {};

    /* --- 科目 --- */
    var subject = canonSubject(raw.subject) || opts.defaultSubject || '';
    if (!subject) {
      // 用归类引擎猜
      var guess = KY.classifier.detectSubject([raw.stem, raw.answer, raw.explanation].join('\n'), null);
      subject = guess.subject;
      issues.push('科目未识别，已自动判定为「' + KY.subjectName(subject) + '」，请核对');
    }
    q.subject = subject;

    /* --- 题型 --- */
    var options = extractOptions(raw);

    var type = canonType(raw.type);
    if (raw.type && !type) {
      issues.push('题型「' + raw.type + '」无法识别，已按选项与答案自动推断');
      type = '';
    }
    type = inferType(options, raw.answer, type);
    q.type = type;

    /* --- 题干 --- */
    q.stem = String(raw.stem || '').trim();
    if (raw.stemHtml) q.stemHtml = String(raw.stemHtml).trim();
    if (!q.stem && !q.stemHtml) {
      issues.push('缺少题干，已跳过');
      return { question: null, issues: issues, fatal: true, videoLinks: [] };
    }

    /* --- 选项 --- */
    if (options.length) q.options = options;
    else if (['single', 'multi', 'judge', 'cloze-item'].indexOf(type) >= 0) {
      issues.push('该题型需要有选项，但一行选项都没读到，已跳过');
      return { question: null, issues: issues, fatal: true, videoLinks: [] };
    } else {
      q.options = [];
    }

    /* --- 答案 --- */
    q.answer = parseAnswer(raw.answer, type, q.options);
    if (!q.answer.length && type !== 'subjective') {
      issues.push('没有答案——每道题都必须有答案，已跳过。请在「答案」列补上');
      return { question: null, issues: issues, fatal: true, videoLinks: [] };
    }
    if (!q.answer.length && type === 'subjective') {
      issues.push('主观题没有参考答案要点，自评时只能按三档打分');
    }

    /* --- 选项键合法性 --- */
    if (['single', 'multi', 'judge', 'cloze-item'].indexOf(type) >= 0) {
      var keys = q.options.map(function (o) { return o.key; });
      var badAns = q.answer.filter(function (a) { return keys.indexOf(a) < 0; });
      if (badAns.length) {
        issues.push('答案里的 ' + badAns.join('/') + ' 不在选项 ' + keys.join('/') + ' 中，已剔除');
        q.answer = q.answer.filter(function (a) { return keys.indexOf(a) >= 0; });
      }
      if (!q.answer.length) {
        issues.push('剔除非法答案后没有剩余答案，已跳过');
        return { question: null, issues: issues, fatal: true, videoLinks: [] };
      }
      if (type === 'single' && q.answer.length > 1) {
        q.type = type = 'multi';
        issues.push('答案有 ' + q.answer.length + ' 项，题型已自动改为多选');
      }
    }

    /* --- 板块 --- */
    var modId = canonModule(raw.module, subject);
    if (!modId) {
      if (raw.module) issues.push('板块「' + raw.module + '」在本科目下找不到，稍后按考点推断');
    }

    /* --- 考点 --- */
    var kn = canonKnowledge(raw.knowledge, subject);
    if (kn.unknown.length) {
      issues.push('考点「' + kn.unknown.join('/') + '」在知识树里不存在，已忽略');
    }
    var autoClassified = false;
    if (!kn.ids.length && opts.autoClassify !== false) {
      // 用归类引擎从题干推断
      var classified = KY.classifier.classify({
        subject: subject,
        stem: q.stem,
        options: q.options,
        myAnswer: '',
        correctAnswer: q.answer,
        type: type,
        text: q.stem + '\n' + (q.options || []).map(function (o) { return o.key + ' ' + o.text; }).join('\n')
      });
      if (classified.knowledge && classified.knowledge.length) {
        kn.ids = classified.knowledge;
        autoClassified = true;
        issues.push('考点留空，已自动归类为「' + kn.ids.map(function (p) {
          var n = KY.getTaxNode(p); return n ? n.point.name : p;
        }).join('、') + '」，请核对');
        if (!modId) modId = classified.module;
      }
    }
    if (!kn.ids.length) {
      issues.push('无法确定考点，已跳过。请在「考点」列填考点名或考点 id');
      return { question: null, issues: issues, fatal: true, videoLinks: [] };
    }
    q.knowledge = kn.ids;

    /* --- 板块兜底 --- */
    if (!modId) {
      var n0 = KY.getTaxNode(q.knowledge[0]);
      modId = n0 ? n0.module.id : KY.getModules(subject)[0].id;
    }
    q.module = modId;

    /* --- 其它字段 --- */
    q.explanation = String(raw.explanation || '').trim();
    if (!q.explanation) issues.push('没有解析——建议补上，学生看的就是解析');
    q.difficulty = parseDifficulty(raw.difficulty);
    q.source = String(raw.source || '').trim() || '用户导入题库';
    var yr = parseYear(raw.year);
    if (yr) q.year = yr;
    if (raw.tags) {
      q.tags = String(raw.tags).split(/[|,，、;；\/\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    q.score = raw.score ? (parseFloat(raw.score) || 1) : (type === 'subjective' ? 10 : (type === 'multi' ? 2 : 1));

    var rubric = parseRubric(raw.rubric, q.score, type);
    if (rubric && rubric.length) q.rubric = rubric;

    /* --- id --- */
    var id = String(raw.id || '').trim();
    if (!id || !/^[A-Za-z0-9._-]+$/.test(id)) {
      if (id) issues.push('id「' + id + '」含非法字符，已自动生成新 id');
      id = 'user-' + subject + '-' + Date.now().toString(36) + '-' + index;
    }
    q.id = id;

    /* --- 视频 --- */
    var videoLinks = [];
    var videoQueryRaw = String(raw.videoQuery || '').trim();
    var seenBv = Object.create(null);
    function collectBv(x) {
      KY.video.parseBvids(String(x || '')).forEach(function (b) {
        if (!seenBv[b]) { seenBv[b] = 1; videoLinks.push(b); }
      });
    }

    if (raw.video && typeof raw.video === 'object' && !Array.isArray(raw.video)) {
      // JSON 原生 schema: video: { bvid, title, query } 或 { list: [{bvid}] }
      if (raw.video.bvid) collectBv(raw.video.bvid);
      if (Array.isArray(raw.video.list)) {
        raw.video.list.forEach(function (l) { if (l && l.bvid) collectBv(l.bvid); });
      }
      if (raw.video.query) videoQueryRaw = String(raw.video.query).trim();
      if (raw.video.title && !videoQueryRaw) videoQueryRaw = String(raw.video.title).trim();
    } else {
      collectBv(raw.video);
    }

    // videoOverrides 是运行时绑定，不属于题库数据，一并接受
    if (raw.videoOverrides) collectBv(JSON.stringify(raw.videoOverrides));

    if (videoQueryRaw) {
      q.video = { bvid: videoLinks[0] || '', title: '', query: videoQueryRaw };
    } else if (videoLinks.length) {
      q.video = { bvid: videoLinks[0], title: '', query: q.stem.slice(0, 40) };
    } else {
      // 关键词兜底：用考点名 + 科目
      var knName = KY.getTaxNode(q.knowledge[0]);
      q.video = {
        bvid: '',
        title: '',
        query: KY.subjectName(subject) + ' ' + (knName ? knName.point.name : '') + ' 真题讲解'
      };
    }

    return { question: q, issues: issues, autoClassified: autoClassified, videoLinks: videoLinks };
  }

  /* ================================================================== */
  /* 解析入口                                                            */
  /* ================================================================== */

  /** 把任意形状的 JSON 拍平成对象数组 */
  function flattenJson(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.questions)) return data.questions;
    if (Array.isArray(data.items)) return data.items;
    if (data.banks && typeof data.banks === 'object') {
      var out = [];
      Object.keys(data.banks).forEach(function (sub) {
        if (Array.isArray(data.banks[sub])) {
          data.banks[sub].forEach(function (q) {
            if (q && !q.subject) q = Object.assign({}, q, { subject: sub });
            out.push(q);
          });
        }
      });
      return out;
    }
    // 单个对象
    if (data.stem || data['题干']) return [data];
    return [];
  }

  /** JSON 记录：键可能是中文表头，统一映射成 schema 字段 */
  function mapKeys(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var field = HEADER_MAP[normKey(k)];
      out[field || k] = obj[k];
    });
    return out;
  }

  /**
   * 解析文本为待导入记录。
   * @returns {{ records:Array, format:String, warnings:Array }}
   */
  function parse(text, filename) {
    var s = String(text || '');
    var trimmed = s.replace(/^\uFEFF/, '').trim();
    var warnings = [];
    var rawList = [];
    var format = 'csv';

    var looksJson = trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{';
    if (looksJson || /\.json$/i.test(filename || '')) {
      var data;
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        // JSON 解析失败时退化为 CSV，但记下警告
        warnings.push('按 JSON 解析失败（' + e.message + '），已尝试按 CSV 解析');
        looksJson = false;
      }
      if (looksJson) {
        format = 'json';
        var flat = flattenJson(data);
        rawList = flat.map(function (o, i) {
          var m = mapKeys(o);
          if (!m.id && o && o.id) m.id = o.id;
          return { raw: m, line: i + 1 };
        });
      }
    }

    if (!looksJson) {
      format = 'csv';
      var rows = parseCsv(s);
      if (!rows.length) return { records: [], format: format, warnings: ['文件是空的'] };

      // 找表头行：第一行里能映射出至少 2 个已知字段
      var headerRow = rows[0];
      var mapped = headerRow.map(function (h) { return HEADER_MAP[normKey(h)] || ''; });
      var knownCount = mapped.filter(Boolean).length;
      if (knownCount < 2) {
        return {
          records: [],
          format: format,
          warnings: ['第一行看起来不是表头（只认出 ' + knownCount + ' 个已知列）。' +
            '请下载 CSV 模板，或确认表头包含：科目,题型,题干,答案,考点']
        };
      }

      for (var r = 1; r < rows.length; r++) {
        var obj = {};
        mapped.forEach(function (field, ci) {
          if (!field) return;
          obj[field] = rows[r][ci];
        });
        // 保留未映射的列名，便于报错时说清哪一列有问题
        rawList.push({ raw: obj, line: r + 1 });
      }
    }

    return { records: rawList, format: format, warnings: warnings };
  }

  /* ================================================================== */
  /* 预览与导入                                                          */
  /* ================================================================== */

  /**
   * 预览：逐条归一化 + 校验，不写任何数据。
   */
  function preview(text, filename, opts) {
    opts = opts || {};
    var parsed = parse(text, filename);
    var rows = [];

    parsed.records.forEach(function (rec, i) {
      var res;
      try {
        res = normalizeOne(rec.raw, rec.line || (i + 1), opts);
      } catch (e) {
        res = { question: null, issues: ['处理时异常：' + e.message], fatal: true };
      }
      rows.push({
        line: rec.line || (i + 1),
        ok: !!res.question && !res.fatal,
        question: res.question,
        issues: res.issues || [],
        autoClassified: !!res.autoClassified,
        videoLinks: res.videoLinks || []
      });
    });

    var okRows = rows.filter(function (r) { return r.ok; });
    return {
      format: parsed.format,
      warnings: parsed.warnings,
      rows: rows,
      summary: summarizeRows(rows)
    };
  }

  /** 把 rows 汇总成统计块（preview 与 previewRecords 共用） */
  function summarizeRows(rows) {
    var okRows = rows.filter(function (r) { return r.ok; });
    return {
      total: rows.length,
      ok: okRows.length,
      failed: rows.length - okRows.length,
      autoClassified: rows.filter(function (r) { return r.autoClassified; }).length,
      withAnswer: okRows.filter(function (r) { return (r.question.answer || []).length > 0; }).length,
      withExplanation: okRows.filter(function (r) { return r.question.explanation; }).length,
      withVideo: okRows.filter(function (r) { return (r.videoLinks || []).length > 0; }).length,
      bySubject: okRows.reduce(function (a, r) {
        var s = r.question.subject;
        a[s] = (a[s] || 0) + 1; return a;
      }, {})
    };
  }

  /**
   * 直接用"已经是 importer 字段名"的记录做预览。
   * 给 KY.papertext（真题原文解析）这类上游解析器复用，避免各写一套校验。
   * @param {Array} rawRecords 形如 [{subject,module,type,stem,options,answer,...}]
   * @param {Object} opts 传给 normalizeOne
   */
  function previewRecords(rawRecords, opts) {
    opts = opts || {};
    var rows = [];
    (rawRecords || []).forEach(function (raw, i) {
      var res;
      try {
        res = normalizeOne(raw, i + 1, opts);
      } catch (e) {
        res = { question: null, issues: ['处理时异常：' + e.message], fatal: true };
      }
      rows.push({
        line: i + 1,
        ok: !!res.question && !res.fatal,
        question: res.question,
        issues: res.issues || [],
        autoClassified: !!res.autoClassified,
        videoLinks: res.videoLinks || []
      });
    });
    return {
      format: opts.format || 'records',
      warnings: opts.warnings || [],
      rows: rows,
      summary: summarizeRows(rows)
    };
  }

  /**
   * 真正导入。写入 userBank，并把视频链接绑定到 videoOverrides。
   * @param {Object} previewResult KY.importer.preview 的返回值
   * @param {Object} opts { mode:'merge'|'replace', onlyOk:true }
   */
  function commit(previewResult, opts) {
    opts = opts || {};
    var incoming = previewResult.rows.filter(function (r) { return r.ok; }).map(function (r) { return r.question; });

    var existing = opts.mode === 'replace' ? [] : getUserBank();
    var byId = Object.create(null);
    existing.forEach(function (q) { byId[q.id] = q; });

    var added = 0, updated = 0;
    incoming.forEach(function (q) {
      if (byId[q.id]) { updated++; byId[q.id] = q; }
      else { byId[q.id] = q; added++; }
    });

    var list = Object.keys(byId).map(function (k) { return byId[k]; });
    KY.store.raw.set('userBank', list);

    // 视频绑定
    var bindCount = 0;
    previewResult.rows.forEach(function (r) {
      if (!r.ok || !r.videoLinks || !r.videoLinks.length) return;
      r.videoLinks.forEach(function (bvid) {
        if (KY.video.addLink(r.question.id, bvid, '')) bindCount++;
      });
    });

    // 重建题库索引
    KY.bank.rebuild();
    KY.bus.emit('bank:changed', { added: added, updated: updated });

    return { added: added, updated: updated, total: list.length, boundVideos: bindCount };
  }

  function getUserBank() {
    var list = KY.store.raw.get('userBank', []);
    return Array.isArray(list) ? list : [];
  }

  function clearUserBank() {
    KY.store.raw.set('userBank', []);
    KY.bank.rebuild();
    KY.bus.emit('bank:changed', { added: 0, updated: 0 });
  }

  function removeUserQuestion(id) {
    var list = getUserBank().filter(function (q) { return q.id !== id; });
    KY.store.raw.set('userBank', list);
    KY.bank.rebuild();
    KY.bus.emit('bank:changed', {});
    return list.length;
  }

  /* ================================================================== */
  /* CSV 模板                                                            */
  /* ================================================================== */

  var TEMPLATE_HEADERS = [
    '科目', '板块', '题型', '题干',
    '选项A', '选项B', '选项C', '选项D',
    '答案', '解析', '考点', '难度', '来源', '年份', '评分要点', '分值', 'B站关键词', 'B站视频'
  ];

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(rows) {
    return '\uFEFF' + rows.map(function (r) {
      return r.map(csvCell).join(',');
    }).join('\r\n') + '\r\n';
  }

  function csvTemplate() {
    var rows = [TEMPLATE_HEADERS];
    rows.push([
      '数学一', '高数·函数极限连续', '单选',
      '当 x→0 时，下列无穷小中阶数最高的是（  ）',
      'x^2', 'sin x', '1-cos x', 'x^3',
      'D', 'x^3 是 3 阶无穷小；x^2 是 2 阶；sin x 是 1 阶；1-cos x ~ x^2/2 是 2 阶。',
      '无穷小阶的比较', '★★★', '示例（可删除）', '', '', '', '考研数学一 无穷小阶的比较 讲解', ''
    ]);
    rows.push([
      '政治', '马原', '多选',
      '下列属于唯物辩证法总特征的有（  ）',
      '联系的普遍性', '发展的永恒性', '物质的可知性', '矛盾的特殊性',
      'AB', '唯物辩证法的总特征是联系的观点和发展的观点。',
      '唯物辩证法（联系发展矛盾）', '★★', '示例（可删除）', '', '', '', '考研政治 唯物辩证法 总特征 讲解', ''
    ]);
    rows.push([
      '英语一', '阅读理解 Part A', '单选',
      'The author implies that the gap year ______.',
      'is a waste of time', 'helps students mature', 'is only for the rich', 'should be banned',
      'B', '第二段提到 "students return with a clearer sense of purpose"，说明有助于成熟。',
      '推理判断题', '★★★★', '示例（可删除）', '2020', '', '2', '考研英语一 阅读 推理判断 讲解', ''
    ]);
    rows.push([
      '信号与系统', '拉普拉斯变换与复频域分析', '主观题',
      '已知 H(s) = 1/(s^2+3s+2)，求冲激响应 h(t)。',
      '', '', '', '',
      'h(t) = (e^(-t) - e^(-2t))u(t)',
      'H(s) = 1/[(s+1)(s+2)] = 1/(s+1) - 1/(s+2)，反变换得 h(t) = (e^(-t)-e^(-2t))u(t)。',
      '拉氏反变换（部分分式展开）', '★★★', '示例（可删除）', '',
      '正确写出部分分式展开:4|正确反变换得到 h(t):6', '10',
      '信号与系统 拉普拉斯反变换 部分分式 讲解', ''
    ]);
    return toCsv(rows);
  }

  /** 把当前「用户导入题库」导出成 CSV（便于在 Excel 里编辑后再导回） */
  function exportUserBankCsv() {
    var rows = [TEMPLATE_HEADERS];
    getUserBank().forEach(function (q) {
      var optMap = {};
      (q.options || []).forEach(function (o) { optMap[o.key] = o.text; });
      rows.push([
        KY.subjectName(q.subject),
        (KY.getTaxNode((q.knowledge || [])[0]) || {}).module ? KY.getTaxNode(q.knowledge[0]).moduleName : q.module,
        q.type,
        q.stem,
        optMap.A || '', optMap.B || '', optMap.C || '', optMap.D || '',
        (q.answer || []).join(q.type === 'blank' || q.type === 'subjective' ? '|' : ''),
        q.explanation || '',
        (q.knowledge || []).map(function (p) { var n = KY.getTaxNode(p); return n ? n.point.name : p; }).join('|'),
        '★'.repeat(q.difficulty || 3),
        q.source || '',
        q.year || '',
        (q.rubric || []).map(function (r) { return r.point + ':' + r.score; }).join('|'),
        q.score || '',
        (q.video && q.video.query) || '',
        KY.video.links(q).map(function (l) { return l.bvid; }).join('|')
      ]);
    });
    return toCsv(rows);
  }

  /* ================================================================== */
  /* 视频链接批量绑定解析                                                */
  /* ================================================================== */

  /**
   * 解析批量绑定文本。每行支持：
   *   en1-2023-cloze-01 BV1xx411c7mD
   *   en1-2023-cloze-01  https://www.bilibili.com/video/BV1xx411c7mD
   *   en1-2023-cloze-01  BV1xx411c7mD BV1yy411c7mE     ← 一题多讲
   *   「题干关键词 BV号」也可，但只在能唯一命中一道题时才生效。
   * 以 # 开头的行忽略。
   *
   * @returns {{ binds:Array<{qid,bvid,question}>, errors:Array<String> }}
   */
  function parseBulkBindings(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var binds = [];
    var errors = [];
    var seen = Object.create(null);

    lines.forEach(function (line, i) {
      var raw = line.trim();
      if (!raw || raw.charAt(0) === '#') return;

      var bvids = KY.video.parseBvids(raw);
      if (!bvids.length) {
        errors.push('第 ' + (i + 1) + ' 行：没找到 BV 号 —— ' + U.truncate(raw, 50));
        return;
      }

      // 剥掉 BV 号与网址，剩下的当题目标识
      var key = raw.replace(/BV[0-9A-Za-z]{10}/g, ' ')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[|,，、\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!key) {
        errors.push('第 ' + (i + 1) + ' 行：只有 BV 号，没说清是哪道题 —— ' +
          '请在前面写上题目 ID 或题干关键词');
        return;
      }

      var q = KY.bank.get(key) || KY.bank.get(key.replace(/[\s:：>-]+/g, ''));

      if (!q) {
        var hits = KY.bank.search(key, { limit: 6 });
        if (hits.length === 1) {
          q = hits[0];
        } else if (hits.length > 1) {
          errors.push('第 ' + (i + 1) + ' 行：「' + U.truncate(key, 24) + '」匹配到 ' + hits.length +
            ' 道题，请改用题目 ID。候选：' +
            hits.slice(0, 3).map(function (x) { return x.id; }).join(' / '));
          return;
        }
      }

      if (!q) {
        errors.push('第 ' + (i + 1) + ' 行：找不到题目「' + U.truncate(key, 30) + '」');
        return;
      }

      bvids.forEach(function (b) {
        var k = q.id + '|' + b;
        if (seen[k]) return;
        seen[k] = 1;
        binds.push({ qid: q.id, bvid: b, question: q });
      });
    });

    return { binds: binds, errors: errors };
  }

  /* ================================================================== */
  /* 共享题库：随网站一起发布的那一份                                    */
  /* ================================================================== */

  /** 去掉运行期标记，让导出的题库文件保持干净、diff 可读 */
  function sanitizeForExport(list) {
    return list.map(function (q) {
      var o = {};
      Object.keys(q).forEach(function (k) {
        if (k === 'userImported' || k === 'sharedImported') return;
        o[k] = q[k];
      });
      return o;
    }).sort(function (a, b) {
      if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
      if (a.module !== b.module) return a.module < b.module ? -1 : 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
  }

  function nowStamp() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /** 给 JSON 文本的每一行（除首行）加缩进，便于嵌进生成的 JS 文件 */
  function indent(obj, spaces) {
    var pad = new Array(spaces + 1).join(' ');
    return JSON.stringify(obj, null, 2).split('\n').map(function (line, i) {
      return i === 0 ? line : pad + line;
    }).join('\n');
  }

  /**
   * 生成 src/data/bank.shared.js 的完整内容。
   * 用它覆盖项目里那个文件，再跑一次发布，使用者刷新就能拿到这批题。
   */
  function buildSharedBankJs(list, opts) {
    opts = opts || {};
    var clean = sanitizeForExport(list || []);
    var builtAt = nowStamp();

    var bySubject = {};
    clean.forEach(function (q) { bySubject[q.subject] = (bySubject[q.subject] || 0) + 1; });
    var summary = Object.keys(bySubject).map(function (k) {
      return KY.subjectName(k) + ' ' + bySubject[k];
    }).join(' · ') || '（空）';

    var header = [
      '/*!',
      ' * bank.shared.js —— 共享题库（随网站一起发布，所有使用者都能看到）',
      ' *',
      ' * 本文件由「题库导入 → 导出为共享题库文件」自动生成。',
      ' * 生成时间：' + builtAt,
      ' * 题目数量：' + clean.length + '（' + summary + '）',
      opts.notes ? (' * 备注：' + opts.notes) : null,
      ' *',
      ' * 它和「个人题库」的区别：',
      ' *   · 共享题库（本文件）：跟着网站发布出去，所有使用者刷新页面就能拿到；',
      ' *   · 个人题库（浏览器本地）：使用者在「题库导入」页自己传的题，只有他自己看得到。',
      ' *',
      ' * 合并优先级：内置题库 > 共享题库 > 个人题库。',
      ' * 所以用本文件更新一道题（保持 id 不变）即可覆盖使用者手里的旧版本。',
      ' *',
      ' * 格式见 SCHEMA.md §3。手改也行，但更推荐改 CSV/JSON 后用导入页重新导出，避免写错格式。',
      ' */',
      '(function (global) {',
      "  'use strict';",
      '  var KY = (global.KY = global.KY || {});',
      ''
    ].filter(function (x) { return x !== null; }).join('\n');

    var body = [
      '  KY.sharedBank = ' + indent(clean, 2) + ';',
      '',
      '  KY.sharedBankMeta = ' + indent({
        builtAt: builtAt,
        count: clean.length,
        bySubject: bySubject,
        source: opts.source || 'import-page'
      }, 2) + ';',
      '})(window);',
      ''
    ].join('\n');

    return header + '\n' + body;
  }

  /** 生成共享题库 JSON（放到项目根目录「共享题库.json」，发布脚本会自动转换） */
  function buildSharedBankJson(list) {
    return JSON.stringify({
      type: 'kaoyan-shared-bank',
      version: 1,
      exportedAt: new Date().toISOString(),
      count: (list || []).length,
      questions: sanitizeForExport(list || [])
    }, null, 2) + '\n';
  }

  /** 当前已经发布出去的共享题库 */
  function getSharedBank() {
    return Array.isArray(KY.sharedBank) ? KY.sharedBank : [];
  }

  function getSharedBankMeta() {
    return KY.sharedBankMeta || { builtAt: '', count: 0, source: 'empty' };
  }

  /**
   * 从任意来源解析出一批"可发布的题目"。
   * @param {Object} previewResult KY.importer.preview 的产物（可选）
   * @param {String} source 'preview' | 'personal'
   */
  function collectPublishable(previewResult, source) {
    if (source === 'preview' && previewResult && previewResult.rows) {
      return previewResult.rows.filter(function (r) { return r.ok; }).map(function (r) { return r.question; });
    }
    return getUserBank();
  }

  KY.importer = {
    parse: parse,
    preview: preview,
    commit: commit,
    parseCsv: parseCsv,
    normalizeOne: normalizeOne,
    parseBulkBindings: parseBulkBindings,
    previewRecords: previewRecords,
    summarizeRows: summarizeRows,
    getUserBank: getUserBank,
    clearUserBank: clearUserBank,
    removeUserQuestion: removeUserQuestion,
    csvTemplate: csvTemplate,
    exportUserBankCsv: exportUserBankCsv,
    /* 共享题库 */
    buildSharedBankJs: buildSharedBankJs,
    buildSharedBankJson: buildSharedBankJson,
    getSharedBank: getSharedBank,
    getSharedBankMeta: getSharedBankMeta,
    collectPublishable: collectPublishable,
    sanitizeForExport: sanitizeForExport,
    TEMPLATE_HEADERS: TEMPLATE_HEADERS,
    canonSubject: canonSubject,
    canonKnowledge: canonKnowledge,
    canonModule: canonModule,
    subjectFromText: subjectFromText
  };
})(window);
