/*!
 * bank.js —— 题库仓储（统一访问四科题库与套卷）
 * 挂载：KY.bank
 *
 * 惰性建立索引，题库变化时调用 KY.bank.rebuild()。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var byId = Object.create(null);
  var all = [];
  var bySubject = Object.create(null);
  var byModule = Object.create(null);
  var byPoint = Object.create(null);
  var papersById = Object.create(null);
  var allPapers = [];
  var built = false;
  var sharedConflicts = [];   // 共享题库里与内置题 id 冲突、因而未生效的题目 id

  function ensure() { if (!built) bank.rebuild(); }

  function push(map, key, val) {
    (map[key] || (map[key] = [])).push(val);
  }

  var bank = {
    /** 重建全部索引 */
    rebuild: function () {
      byId = Object.create(null);
      all = [];
      bySubject = Object.create(null);
      byModule = Object.create(null);
      byPoint = Object.create(null);
      papersById = Object.create(null);
      allPapers = [];

      var banks = KY.banks || {};
      KY.SUBJECTS.forEach(function (sub) {
        var list = banks[sub];
        if (!Array.isArray(list)) {
          console.warn('[bank] 缺少题库：' + sub);
          return;
        }
        list.forEach(function (q) {
          if (!q || !q.id) return;
          if (byId[q.id]) {
            console.warn('[bank] 题目 id 重复，已跳过后者：' + q.id);
            return;
          }
          q.subject = q.subject || sub;
          byId[q.id] = q;
          all.push(q);
          push(bySubject, q.subject, q);
          if (q.module) push(byModule, q.module, q);
          (q.knowledge || []).forEach(function (pid) { push(byPoint, pid, q); });
        });
      });

      /* ------------------------------------------------------------------
       * 共享题库：随网站一起发布的题库（src/data/bank.shared.js → KY.sharedBank）
       *
       * 与"个人题库"的区别：
       *   共享题库是发布者统一维护的，所有使用者刷新页面就能拿到；
       *   个人题库存在各人自己的浏览器里，只对他自己可见。
       *
       * 合并优先级（先插入者胜，后来的同 id 会被跳过）：
       *   内置题库  >  共享题库  >  个人题库
       * 这样发布者更新共享题库后，使用者即使本地有同 id 的旧副本，也会拿到新版。
       * ------------------------------------------------------------------ */
      var shared = (KY && KY.sharedBank) || [];
      sharedConflicts = [];
      if (Array.isArray(shared)) {
        shared.forEach(function (q) {
          if (!q || !q.id || !q.subject) return;
          if (byId[q.id]) {
            // 注意：这里不能静默跳过。发布者把 id 写重了是常见错误，
            // 而那些题会"看起来发布了其实没生效"，所以记下来供界面提示。
            sharedConflicts.push(q.id);
            console.warn('[bank] 共享题库的 id 与内置题目重复，已保留内置版本：' + q.id);
            return;
          }
          // 一道题只能属于一个来源层：显式清掉另一个标记，避免被重复统计
          delete q.userImported;
          q.sharedImported = true;
          byId[q.id] = q;
          all.push(q);
          push(bySubject, q.subject, q);
          if (q.module) push(byModule, q.module, q);
          (q.knowledge || []).forEach(function (pid) { push(byPoint, pid, q); });
        });
      }

      // 个人自己导入的题库（存在本机浏览器里）
      var userBank = (KY.store && KY.store.raw) ? KY.store.raw.get('userBank', []) : [];
      if (Array.isArray(userBank)) {
        userBank.forEach(function (q) {
          if (!q || !q.id) return;
          if (byId[q.id]) {
            // 同 id 时保留共享题库的版本（发布者维护的那份更新），个人副本会被忽略
            return;
          }
          delete q.sharedImported;
          q.userImported = true;
          if (!q.subject) return;
          byId[q.id] = q;
          all.push(q);
          push(bySubject, q.subject, q);
          if (q.module) push(byModule, q.module, q);
          (q.knowledge || []).forEach(function (pid) { push(byPoint, pid, q); });
        });
      }

      var papers = KY.papers || {};
      Object.keys(papers).forEach(function (sub) {
        var list = papers[sub];
        if (!Array.isArray(list)) return;
        list.forEach(function (p) {
          if (!p || !p.id) return;
          if (papersById[p.id]) return;
          papersById[p.id] = p;
          allPapers.push(p);
        });
      });

      built = true;

      // 英语一真题套卷依赖题库内容，题库变了要重新汇编
      if (typeof KY.papers.rebuildAll === 'function') {
        try {
          KY.papers.rebuildAll();
          papersById = Object.create(null);
          allPapers = [];
          Object.keys(KY.papers).forEach(function (sub) {
            var list = KY.papers[sub];
            if (!Array.isArray(list)) return;
            list.forEach(function (p) {
              if (!p || !p.id || papersById[p.id]) return;
              papersById[p.id] = p;
              allPapers.push(p);
            });
          });
        } catch (e) {
          console.warn('[bank] 重新汇编英语一真题套卷失败：', e);
        }
      }

      return { questions: all.length, papers: allPapers.length };
    },

    /* ---------------- 题目查询 ---------------- */

    all: function () { ensure(); return all.slice(); },
    get: function (id) { ensure(); return byId[id] || null; },
    has: function (id) { ensure(); return !!byId[id]; },
    count: function () { ensure(); return all.length; },
    countBySubject: function (sub) { ensure(); return (bySubject[sub] || []).length; },

    /** 随网站发布出去的共享题库（原始数组，未经索引） */
    shared: function () {
      return Array.isArray(KY.sharedBank) ? KY.sharedBank.slice() : [];
    },
    /**
     * 共享题库里"实际生效"的题数（与 stats().sharedCount 同口径）。
     * 注意：如果共享题库文件里有题目的 id 与内置题库重复，那些题不会生效，
     * 因此这个数字可能小于文件里的题目总数；差异见 sharedConflictIds()。
     */
    sharedCount: function () {
      ensure();
      var n = 0;
      all.forEach(function (q) { if (q.sharedImported) n++; });
      return n;
    },
    /** 共享题库文件里包含的题目总数（未经去重） */
    sharedFileCount: function () {
      return Array.isArray(KY.sharedBank) ? KY.sharedBank.length : 0;
    },
    /** 因 id 与内置题冲突而未生效的共享题 id */
    sharedConflictIds: function () { ensure(); return sharedConflicts.slice(); },
    /** 本机导入的个人题库 */
    personal: function () {
      var list = (KY.store && KY.store.raw) ? KY.store.raw.get('userBank', []) : [];
      return Array.isArray(list) ? list : [];
    },

    bySubject: function (sub) { ensure(); return (bySubject[sub] || []).slice(); },
    byModule: function (moduleId) { ensure(); return (byModule[moduleId] || []).slice(); },
    byPoint: function (pointId) { ensure(); return (byPoint[pointId] || []).slice(); },

    /** 某科目下某模块 */
    bySubjectModule: function (sub, moduleId) {
      return bank.bySubject(sub).filter(function (q) { return q.module === moduleId; });
    },

    /**
     * 展开套卷的全部题目，返回 [{ question, section, score }]
     * 内联题目（inlineQuestions）会被合并进题干池。
     */
    paperQuestions: function (paper) {
      if (!paper) return [];
      var inlineMap = Object.create(null);
      (paper.inlineQuestions || []).forEach(function (q) { inlineMap[q.id] = q; });

      var out = [];
      (paper.sections || []).forEach(function (sec) {
        (sec.questions || []).forEach(function (qid) {
          var q = inlineMap[qid] || bank.get(qid);
          if (!q) {
            console.warn('[bank] 套卷 ' + paper.id + ' 引用了不存在的题目：' + qid);
            return;
          }
          out.push({
            question: q,
            section: sec,
            score: (sec.scorePerQuestion !== undefined && sec.scorePerQuestion !== null)
              ? sec.scorePerQuestion
              : (q.score || 1)
          });
        });
      });
      return out;
    },

    paperScore: function (paper) {
      return bank.paperQuestions(paper).reduce(function (s, it) { return s + (it.score || 0); }, 0);
    },

    /* ---------------- 套卷查询 ---------------- */

    papers: function (subject) {
      ensure();
      if (!subject) return allPapers.slice();
      return allPapers.filter(function (p) { return p.subject === subject; })
        .sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    },
    paper: function (id) { ensure(); return papersById[id] || null; },

    /* ---------------- 检索 ---------------- */

    /**
     * 关键词检索题目。
     * opts: { subject, module, knowledge, type, yearFrom, yearTo, realOnly, limit }
     */
    search: function (keyword, opts) {
      ensure();
      opts = opts || {};
      var kw = KY.util.normalizeText(keyword || '');
      var pool = opts.subject ? bank.bySubject(opts.subject) : all.slice();

      return pool.filter(function (q) {
        if (opts.module && q.module !== opts.module) return false;
        if (opts.type && q.type !== opts.type) return false;
        if (opts.knowledge && (q.knowledge || []).indexOf(opts.knowledge) < 0) return false;
        if (opts.realOnly && !q.year) return false;
        if (opts.yearFrom && (!q.year || q.year < opts.yearFrom)) return false;
        if (opts.yearTo && (!q.year || q.year > opts.yearTo)) return false;
        if (!kw) return true;
        var hay = [q.stem, q.source, (q.tags || []).join(' '), (q.options || []).map(function (o) { return o.text; }).join(' ')]
          .join(' ');
        return KY.util.normalizeText(hay).indexOf(kw) >= 0;
      }).slice(0, opts.limit || 200);
    },

    /* ---------------- 统计 ---------------- */

    stats: function () {
      ensure();
      var out = {
        total: all.length, bySubject: {}, byModule: {}, byType: {},
        realCount: 0, videoReady: 0,
        sharedCount: 0, userCount: 0,
        sharedFileCount: bank.sharedFileCount(),
        sharedConflictCount: sharedConflicts.length
      };
      // 视频绑定在运行时数据里，一次性读出来，避免每条题目都读一次 localStorage
      var ov = (KY.store && KY.store.raw) ? KY.store.raw.get('videoOverrides', {}) : {};
      all.forEach(function (q) {
        out.bySubject[q.subject] = (out.bySubject[q.subject] || 0) + 1;
        out.byModule[q.module] = (out.byModule[q.module] || 0) + 1;
        out.byType[q.type] = (out.byType[q.type] || 0) + 1;
        if (q.year) out.realCount++;
        if (q.userImported) out.userCount = (out.userCount || 0) + 1;
        if (q.sharedImported) out.sharedCount = (out.sharedCount || 0) + 1;
        var o = ov[q.id];
        var hasRuntime = !!(o && ((Array.isArray(o.list) && o.list.length) || o.bvid));
        if ((q.video && q.video.bvid) || hasRuntime) out.videoReady++;
      });
      return out;
    },

    /** 某科目的考点覆盖情况：[{ point, module, count }] */
    coverage: function (subject) {
      ensure();
      var rows = [];
      KY.getModules(subject).forEach(function (m) {
        m.points.forEach(function (p) {
          rows.push({
            pointId: p.id,
            pointName: p.name,
            moduleId: m.id,
            moduleName: m.name,
            count: (byPoint[p.id] || []).length
          });
        });
      });
      return rows;
    }
  };

  KY.bank = bank;
})(window);
