/*!
 * resources.js —— 资料库引擎
 * 挂载：KY.resources
 *
 * 职责：
 *   1. 把运营者粘贴的网盘链接文本解析成结构化资料条目
 *      （自动识别类型、科目、网盘平台、提取码、时长）
 *   2. 导出成 src/data/resources.shared.js（跟着网站发布）
 *   3. 给使用者侧提供按科目/类型分组、搜索、复制的能力
 *
 * 设计取向：链接是运营者手写的，格式写法要尽量宽容；
 *           但"没有链接"或"没有标题"这种硬错误必须报出来，不能静默丢条目。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  /* ================================================================== */
  /* 网盘平台识别                                                        */
  /* ================================================================== */

  var PROVIDERS = [
    { name: '百度网盘', re: /pan\.baidu\.com|yun\.baidu\.com/i, code: true },
    { name: '阿里云盘', re: /aliyundrive\.com|alipan\.com/i, code: false },
    { name: '夸克网盘', re: /pan\.quark\.cn|drive\.uc\.cn/i, code: false },
    { name: '天翼云盘', re: /cloud\.189\.cn/i, code: true },
    { name: '腾讯微云', re: /weiyun\.com/i, code: false },
    { name: '移动云盘', re: /caiyun\.139\.com|yun\.139\.com/i, code: true },
    { name: '蓝奏云', re: /lanzou[a-z]?\.com|lanzn\.com/i, code: true },
    { name: '123云盘', re: /123pan\.com|123684\.com/i, code: false },
    { name: '迅雷云盘', re: /pan\.xunlei\.com/i, code: true },
    { name: 'OneDrive', re: /1drv\.ms|onedrive\.live\.com/i, code: false },
    { name: 'Google Drive', re: /drive\.google\.com/i, code: false },
    { name: '坚果云', re: /jianguoyun\.com/i, code: false },
    { name: '奶牛快传', re: /cowtransfer\.com/i, code: false },
    { name: 'B站', re: /bilibili\.com|b23\.tv/i, code: false },
    /* 小鹅通：考研机构常用的课程/直播托管平台（xetslk.com、*.xet.citv.cn） */
    { name: '小鹅通', re: /xetslk\.com|xet\.citv\.cn|xet\.cn/i, code: false },
    { name: 'YouTube', re: /youtube\.com|youtu\.be/i, code: false }
  ];

  function detectProvider(url) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].re.test(url)) return PROVIDERS[i].name;
    }
    return '';
  }

  /* ================================================================== */
  /* 类型识别                                                            */
  /* ================================================================== */

  var KIND_ALIASES = {
    video: ['视频', '网课', '课程', 'video', '录像', '讲课'],
    doc: ['文档', '资料', '讲义', '笔记', 'pdf', 'word', 'doc', '卷子', '试卷', '习题'],
    image: ['图片', '截图', '照片', 'image', 'img'],
    link: ['链接', '网址', 'link', '网页']
  };

  var KIND_META = {
    video: { name: '视频', icon: '▶', cls: 'tag-err' },
    doc: { name: '文档', icon: '▤', cls: 'tag-brand' },
    image: { name: '图片', icon: '▣', cls: 'tag-warn' },
    link: { name: '链接', icon: '↗', cls: '' }
  };

  function canonKind(v) {
    var k = U.normalizeText(v);
    if (!k) return '';
    var keys = Object.keys(KIND_ALIASES);
    for (var i = 0; i < keys.length; i++) {
      if (KIND_ALIASES[keys[i]].some(function (a) { return U.normalizeText(a) === k; })) return keys[i];
    }
    return '';
  }

  /** 没写类型时，从标题猜 */
  function inferKind(title) {
    var t = String(title || '');
    if (/讲义|笔记|文档|资料|PDF|pdf|卷|题|答案|解析|大纲|词汇|作文/.test(t)) return 'doc';
    if (/视频|网课|课程|讲解|班|讲|课/.test(t)) return 'video';
    if (/截图|照片|图片/.test(t)) return 'image';
    return 'link';
  }

  /* ================================================================== */
  /* 解析                                                                */
  /* ================================================================== */

  var URL_RE = /https?:\/\/[^\s|<>"'）)】\]]+/i;
  var CODE_RE = /(?:提取码|访问码|密码|提取密码|code|pwd)\s*[:：]?\s*([A-Za-z0-9]{2,10})/i;
  /*
   * 时长正则注意：不能用 \b 收尾。
   * 「45分钟」的「钟」是 CJK 字符，JS 正则的 \b 把它当非单词字符，
   * 所以 /分钟\b/ 在字符串末尾反而匹配不上——早期版本就栽在这里，
   * 导致所有时长都识别不出来。
   */
  var DUR_HOUR_RE = /(\d+(?:\.\d+)?)\s*(?:个?\s*小时|hr|h)\s*(?:(\d+)\s*(?:分钟|分|min(?:ute)?s?))?/i;
  var DUR_MIN_RE = /(\d+)\s*(?:分钟|分|min(?:ute)?s?)/i;
  var DAY_RE = /^#+\s*(.+)$/;
  var SUBJ_LINE_RE = /^(?:科目|学科)\s*[:：]\s*(.+)$/;
  /* 二维码视频专用：章节 / 知识点。必须是独立分段（用 | 隔开）才认，
     否则标题里出现"章节"两个字就会被误当成字段。 */
  var CHAPTER_SEG_RE = /^(?:章节|章|chapter)\s*[:：]\s*(.+)$/i;
  var POINTS_SEG_RE = /^(?:知识点|考点|重点|points?)\s*[:：]\s*(.+)$/i;

  function parseDuration(text) {
    var hm = text.match(DUR_HOUR_RE);
    if (hm) {
      var mins = Math.round(parseFloat(hm[1]) * 60) + (hm[2] ? parseInt(hm[2], 10) : 0);
      return { min: mins, text: hm[0].replace(/\s+/g, '') };
    }
    var mm = text.match(DUR_MIN_RE);
    if (mm) return { min: parseInt(mm[1], 10), text: mm[0].replace(/\s+/g, '') };
    return null;
  }

  function normUrl(u) {
    var s = String(u || '').trim();
    // 去掉中文标点粘连
    return s.replace(/[，。；、）)】\]》]+$/, '');
  }

  /**
   * 解析资料库文本。
   * @returns {{ items:Array, errors:Array, stats:Object }}
   */
  function parseText(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var items = [];
    var errors = [];
    var curSubject = '';
    var seq = 0;

    lines.forEach(function (line, i) {
      var raw = line.trim();
      if (!raw) return;
      if (raw.charAt(0) === '/' && raw.charAt(1) === '/') return;   // 注释
      if (raw.charAt(0) === ';') return;

      /* 科目行：# 数学一  或  科目: 数学一 */
      var dm = raw.match(DAY_RE);
      var sm = raw.match(SUBJ_LINE_RE);
      if (sm) {
        var s1 = KY.importer.canonSubject(sm[1]) || KY.importer.subjectFromText(sm[1]);
        if (s1) { curSubject = s1; return; }
      }
      if (dm) {
        var head = dm[1].trim();
        var s2 = KY.importer.canonSubject(head) || KY.importer.subjectFromText(head);
        if (s2) { curSubject = s2; return; }
        // #开头但不是科目：当作分组标题，忽略（不报错）
        return;
      }

      /* 条目行 */
      var urlMatch = raw.match(URL_RE);
      if (!urlMatch) {
        errors.push('第 ' + (i + 1) + ' 行：没找到 http/https 链接，已跳过 —— ' + U.truncate(raw, 40));
        return;
      }
      var url = normUrl(urlMatch[0]);

      var rest = raw.replace(urlMatch[0], '\u0001');
      var segs = rest.split(/\s*[|｜]\s*/).map(function (s) { return s.trim(); }).filter(Boolean);

      var kind = '';
      var title = '';
      var noteParts = [];
      var code = '';
      var duration = null;
      var chapter = '';
      var points = [];

      segs.forEach(function (seg, idx) {
        if (seg.indexOf('\u0001') >= 0) {
          // 链接所在段，剩下的碎片可能是备注
          var tail = seg.replace('\u0001', '').trim();
          if (tail) {
            // 链接旁边常跟着「提取码 xxxx」
            var cm0 = tail.match(CODE_RE);
            if (cm0 && !code) { code = cm0[1]; tail = tail.replace(cm0[0], '').trim(); }
            if (tail) noteParts.push(tail);
          }
          return;
        }
        /* 章节 / 知识点字段（二维码视频导出时会带上） */
        var chm = seg.match(CHAPTER_SEG_RE);
        if (chm && !chapter) { chapter = chm[1].trim(); return; }
        var ptm = seg.match(POINTS_SEG_RE);
        if (ptm && !points.length) {
          points = ptm[1].split(/[、,，;；\/]+/).map(function (x) { return x.trim(); })
            .filter(Boolean);
          return;
        }
        var k = canonKind(seg);
        if (k && !kind && idx === 0) { kind = k; return; }
        var cm = seg.match(CODE_RE);
        if (cm && !code) {
          code = cm[1];
          var leftover = seg.replace(cm[0], '').trim();
          if (leftover) noteParts.push(leftover);
          return;
        }
        var du = parseDuration(seg);
        if (du && !duration) { duration = du; return; }
        if (!title && idx <= 1) { title = seg; return; }
        noteParts.push(seg);
      });

      if (!title) {
        // 链接前面没有标题时，用域名兜底并提示
        var host = '';
        try { host = url.replace(/^https?:\/\//, '').split('/')[0]; } catch (e) { host = ''; }
        title = host || '（未命名资料）';
        errors.push('第 ' + (i + 1) + ' 行：没有写标题，已用域名「' + title + '」代替，建议补上');
      }

      if (!kind) kind = inferKind(title);
      var provider = detectProvider(url);
      if (!curSubject) {
        var s3 = KY.importer.subjectFromText(title);
        if (!s3) {
          errors.push('第 ' + (i + 1) + ' 行：「' + U.truncate(title, 20) +
            '」认不出科目，已归入"未分类"。可以在前面加一行「# 数学一」');
        }
      }

      seq++;
      items.push({
        id: 'r' + (U.hashString(U.normalizeText(title) + '#' + seq) % 1000000).toString(36),
        kind: kind,
        title: title,
        subject: curSubject || KY.importer.subjectFromText(title) || '',
        url: url,
        code: code,
        provider: provider,
        duration: duration ? duration.text : '',
        durationMin: duration ? duration.min : 0,
        note: noteParts.join(' · '),
        tags: [],
        chapter: chapter,
        points: points
      });
    });
    /* id 去重 */
    var seen = Object.create(null);
    items.forEach(function (it) {
      if (seen[it.id]) {
        var n = 1;
        while (seen[it.id + '-' + n]) n++;
        it.id = it.id + '-' + n;
      }
      seen[it.id] = 1;
    });

    var byKind = {}, bySubject = {}, totalMin = 0;
    items.forEach(function (it) {
      byKind[it.kind] = (byKind[it.kind] || 0) + 1;
      var s = it.subject || 'none';
      bySubject[s] = (bySubject[s] || 0) + 1;
      totalMin += it.durationMin || 0;
    });

    return {
      items: items,
      errors: errors,
      stats: {
        count: items.length,
        byKind: byKind,
        bySubject: bySubject,
        totalMin: totalMin,
        withCode: items.filter(function (x) { return x.code; }).length
      }
    };
  }

  /* ================================================================== */
  /* 读取与查询                                                          */
  /* ================================================================== */

  function getShared() {
    var r = KY.sharedResources;
    if (Array.isArray(r)) return { updatedAt: '', note: '', items: r };
    if (!r || typeof r !== 'object') return { updatedAt: '', note: '', items: [] };
    return {
      updatedAt: r.updatedAt || '',
      note: r.note || '',
      items: Array.isArray(r.items) ? r.items : []
    };
  }

  function getMeta() {
    return KY.sharedResourcesMeta || {
      builtAt: '', count: 0, byKind: {}, bySubject: {}, source: 'empty'
    };
  }

  function all() { return getShared().items.slice(); }

  function hasAny() { return all().length > 0; }

  function kindMeta(kind) { return KIND_META[kind] || KIND_META.link; }

  /**
   * 过滤。
   * @param {Object} f { subject, kind, keyword }
   */
  function filter(f) {
    f = f || {};
    var kw = U.normalizeText(f.keyword || '');
    return all().filter(function (it) {
      if (f.subject && it.subject !== f.subject) return false;
      if (f.kind && it.kind !== f.kind) return false;
      if (!kw) return true;
      var hay = U.normalizeText([it.title, it.note, it.provider, it.subject, it.tags.join(' ')].join(' '));
      return hay.indexOf(kw) >= 0;
    });
  }

  /** 按科目分组，用于展示 */
  function grouped(f) {
    var list = filter(f);
    var map = Object.create(null);
    list.forEach(function (it) {
      var k = it.subject || '';
      (map[k] || (map[k] = [])).push(it);
    });
    var order = KY.SUBJECTS.filter(function (s) { return map[s]; });
    if (map['']) order = order.concat(['']);
    return order.map(function (s) {
      return {
        subject: s,
        subjectName: s ? KY.subjectName(s) : '未分类',
        items: map[s]
      };
    });
  }

  /** 一句话统计，给页面顶部用 */
  function summary() {
    var list = all();
    var byKind = {}, bySubject = {}, totalMin = 0;
    list.forEach(function (it) {
      byKind[it.kind] = (byKind[it.kind] || 0) + 1;
      var s = it.subject || 'none';
      bySubject[s] = (bySubject[s] || 0) + 1;
      totalMin += it.durationMin || 0;
    });
    return {
      count: list.length,
      byKind: byKind,
      bySubject: bySubject,
      totalMin: totalMin,
      videoMin: list.reduce(function (a, x) { return a + (x.kind === 'video' ? (x.durationMin || 0) : 0); }, 0),
      subjects: KY.SUBJECTS.filter(function (s) { return bySubject[s]; }).length
    };
  }

  /** 复制用文本：标题 + 链接 + 提取码 */
  function copyText(it) {
    var lines = [it.title, it.url];
    if (it.code) lines.push('提取码：' + it.code);
    if (it.note) lines.push('说明：' + it.note);
    return lines.join('\n');
  }

  /* ================================================================== */
  /* 章节 / 知识点推断（二维码视频用）                                    */
  /* ================================================================== */

  /**
   * 用题库自带的 keywords 去匹配文字，推断这段文字在讲哪些考点。
   *
   * 为什么这么干：二维码里只有链接，没有"这是第几章、考什么"。
   * 与其编一个知识点，不如拿 taxonomy 里已经写好的关键词去撞 ——
   * 撞上了就是有依据的，撞不上就返回空，让运营者自己填。
   *
   * @returns {Array<{id,name,subject,module,score,matched}>} 按相关度降序
   */
  function inferPoints(text, subject, limit) {
    var s = U.normalizeText(text);
    if (!s) return [];
    var subs = subject ? [subject] : KY.SUBJECTS;
    var hits = [];

    subs.forEach(function (sub) {
      (KY.getPoints(sub) || []).forEach(function (entry) {
        var p = entry.point;
        var kws = p.keywords || [];
        var score = 0;
        var matched = [];
        kws.forEach(function (kw) {
          var k = U.normalizeText(kw);
          if (!k) return;
          if (s.indexOf(k) >= 0) {
            // 长关键词更有信息量，权重高一点
            score += k.length >= 3 ? 2 : 1;
            matched.push(kw);
          }
        });
        if (score > 0) {
          hits.push({
            id: p.id,
            name: p.name,
            subject: sub,
            module: entry.module ? entry.module.name : '',
            moduleId: entry.module ? entry.module.id : '',
            score: score,
            matched: matched
          });
        }
      });
    });

    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'zh');
    });
    return hits.slice(0, limit || 5);
  }

  /**
   * 把二维码识别结果转成资料条目。
   * @param rows Array<{subject,chapter,title,url,context,pageNo,points,note}>
   */
  function buildQrItems(rows, opts) {
    opts = opts || {};
    var items = [];
    var seen = Object.create(null);

    (rows || []).forEach(function (r) {
      if (!r || !r.url) return;
      var subject = r.subject || '';
      var chapter = r.chapter || '';
      var title = r.title || chapter || ('视频' + (r.pageNo ? ('（第 ' + r.pageNo + ' 页）') : ''));

      var key = U.normalizeText(subject + '|' + title + '|' + r.url);
      var id = 'r' + (U.hashString(key) % 1000000).toString(36);
      if (seen[id]) {
        var n = 1;
        while (seen[id + '-' + n]) n++;
        id = id + '-' + n;
      }
      seen[id] = 1;

      items.push({
        id: id,
        kind: 'video',
        title: title,
        subject: subject,
        url: r.url,
        code: '',
        provider: detectProvider(r.url) || '',
        duration: '',
        durationMin: 0,
        note: r.note || (r.pageNo ? ('来自第 ' + r.pageNo + ' 页二维码') : '来自二维码'),
        tags: [],
        /* 以下三个字段是二维码视频特有的，普通资料条目没有也不影响。
           points 统一存"显示名"字符串 —— 发布出去的文件不依赖题库内部 id，
           以后 taxonomy 调整了也不会让已发布的视频条目失效。 */
        chapter: chapter,
        points: pointNames(r.points),
        fromQr: true
      });
    });

    return items;
  }

  /** points 可能是 [{id,name}] / ['名字'] / 混合，统一取显示名 */
  function pointNames(list) {
    return (list || []).map(function (p) {
      if (!p) return '';
      return typeof p === 'string' ? p : (p.name || '');
    }).filter(Boolean);
  }

  /**
   * 把一个资料条目还原成清单文本行。
   * 运营台里"把二维码视频并进资料清单"就靠它 —— 让二维码流程和手写流程
   * 汇合到同一个文本、同一条导出链路，不产生第二套数据来源。
   */
  function itemToLine(it) {
    if (!it || !it.url) return '';
    var segs = [kindMeta(it.kind).name, it.title || ''];
    if (it.chapter) segs.push('章节: ' + it.chapter);
    var pts = pointNames(it.points);
    if (pts.length) segs.push('知识点: ' + pts.join('、'));
    segs.push(it.url);
    if (it.code) segs.push('提取码: ' + it.code);
    if (it.note && !it.fromQr) segs.push(it.note);
    return segs.join(' | ');
  }

  /** 一批条目 → 清单文本（供运营台追加到文本框） */
  function itemsToText(items) {
    return (items || []).map(itemToLine).filter(Boolean).join('\n');
  }

  /** 把一个条目渲染成给人看的文本（方便运营台里核对/复制） */
  function qrItemToText(it) {
    var lines = [];
    if (it.chapter) lines.push('章节：' + it.chapter);
    lines.push('标题：' + it.title);
    lines.push('链接：' + it.url);
    if (it.points && it.points.length) {
      lines.push('知识点：' + it.points.map(function (p) {
        return typeof p === 'string' ? p : (p.name || '');
      }).filter(Boolean).join('、'));
    }
    return lines.join('\n');
  }

  /* ================================================================== */
  /* 导出                                                                */
  /* ================================================================== */

  function nowStamp() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function indent(obj, spaces) {
    var pad = new Array(spaces + 1).join(' ');
    return JSON.stringify(obj, null, 2).split('\n').map(function (line, i) {
      return i === 0 ? line : pad + line;
    }).join('\n');
  }

  function statsOf(items) {
    var byKind = {}, bySubject = {};
    (items || []).forEach(function (it) {
      if (!it) return;
      byKind[it.kind] = (byKind[it.kind] || 0) + 1;
      var s = it.subject || 'none';
      bySubject[s] = (bySubject[s] || 0) + 1;
    });
    return { byKind: byKind, bySubject: bySubject };
  }

  function buildSharedJs(items, opts) {
    opts = opts || {};
    var list = items || [];
    var st = statsOf(list);
    var builtAt = nowStamp();
    var kindLine = Object.keys(st.byKind).map(function (k) {
      return kindMeta(k).name + ' ' + st.byKind[k];
    }).join(' · ') || '（空）';

    var header = [
      '/*!',
      ' * resources.shared.js —— 共享资料库（运营者维护，使用者查看）',
      ' *',
      ' * 本文件由「运营台 → 资料库 → 导出资料库文件」自动生成。',
      ' * 生成时间：' + builtAt,
      ' * 条目数量：' + list.length + '（' + kindLine + '）',
      opts.note ? (' * 说明：' + opts.note) : null,
      ' *',
      ' * 这里放的是**网盘链接入口**，不是视频文件本身——',
      ' * GitHub 单文件硬上限 100 MB，且服务条款禁止当大文件存储用。',
      ' *',
      ' * 格式规范见 SCHEMA.md 第 13 节。手改也行，但更推荐在运营台里改完重新导出。',
      ' */',
      '(function (global) {',
      "  'use strict';",
      '  var KY = (global.KY = global.KY || {});',
      ''
    ].filter(function (x) { return x !== null; }).join('\n');

    var body = [
      '  KY.sharedResources = ' + indent({
        updatedAt: builtAt,
        note: opts.note || '',
        items: list
      }, 2) + ';',
      '',
      '  KY.sharedResourcesMeta = ' + indent({
        builtAt: builtAt,
        count: list.length,
        byKind: st.byKind,
        bySubject: st.bySubject,
        source: opts.source || 'console'
      }, 2) + ';',
      '})(window);',
      ''
    ].join('\n');

    return header + '\n' + body;
  }

  function buildSharedJson(items, opts) {
    opts = opts || {};
    return JSON.stringify({
      type: 'kaoyan-shared-resources',
      version: 1,
      exportedAt: new Date().toISOString(),
      note: opts.note || '',
      items: items || []
    }, null, 2) + '\n';
  }

  KY.resources = {
    PROVIDERS: PROVIDERS,
    KIND_META: KIND_META,
    detectProvider: detectProvider,
    canonKind: canonKind,
    inferKind: inferKind,
    parseText: parseText,
    parseDuration: parseDuration,
    getShared: getShared,
    getMeta: getMeta,
    all: all,
    hasAny: hasAny,
    kindMeta: kindMeta,
    filter: filter,
    grouped: grouped,
    summary: summary,
    copyText: copyText,
    inferPoints: inferPoints,
    buildQrItems: buildQrItems,
    qrItemToText: qrItemToText,
    pointNames: pointNames,
    itemToLine: itemToLine,
    itemsToText: itemsToText,
    buildSharedJs: buildSharedJs,
    buildSharedJson: buildSharedJson
  };
})(window);
