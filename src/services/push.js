/*!
 * push.js —— 错题推送引擎（运营者挑题 → 使用者一键收进错题本）
 * 挂载：KY.push
 *
 * 为什么是"推送"而不是"直接写进她的错题本"：
 *   她的错题本存在她自己浏览器里，运营者碰不到（不租服务器的必然结果）。
 *   所以设计成：运营者发布清单 → 她点一下「全部收下」→ 数据进她自己的错题本，
 *   之后完全归她自己管，照常参与错题复习与推题。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  var ADDED_KEY = 'pushAdded';

  /* ================================================================== */
  /* 读取共享推送                                                        */
  /* ================================================================== */

  function getShared() {
    var sp = KY.sharedWrongPush;
    if (Array.isArray(sp)) return { updatedAt: '', title: '', items: sp };
    if (!sp || typeof sp !== 'object') return { updatedAt: '', title: '', items: [] };
    return {
      updatedAt: sp.updatedAt || '',
      title: sp.title || '',
      items: Array.isArray(sp.items) ? sp.items : []
    };
  }

  function getMeta() {
    return KY.sharedWrongPushMeta || { builtAt: '', count: 0, source: 'empty' };
  }

  /* ================================================================== */
  /* 文本解析                                                            */
  /* ================================================================== */

  /**
   * 每行：`题目ID 或 题干关键词 | 备注`
   * @returns {{ items:Array<{questionId,note,question,source}>, errors:Array }}
   */
  function parseText(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var items = [];
    var errors = [];
    var seen = Object.create(null);

    lines.forEach(function (line, i) {
      var raw = line.trim();
      if (!raw || raw.charAt(0) === '#' || (raw.charAt(0) === '/' && raw.charAt(1) === '/')) return;

      var parts = raw.split(/\s*[|｜]\s*/);
      var key = (parts[0] || '').trim();
      var note = parts.slice(1).join(' | ').trim();

      if (!key) {
        errors.push('第 ' + (i + 1) + ' 行：没有写题目');
        return;
      }

      var q = KY.bank.get(key) || KY.bank.get(key.replace(/[\s:：>-]+/g, ''));

      if (!q) {
        var hits = KY.bank.search(key, { limit: 6 });
        if (hits.length === 1) {
          q = hits[0];
        } else if (hits.length > 1) {
          errors.push('第 ' + (i + 1) + ' 行：「' + U.truncate(key, 22) + '」匹配到 ' + hits.length +
            ' 道题，请改用题目 ID。候选：' + hits.slice(0, 3).map(function (x) { return x.id; }).join(' / '));
          return;
        }
      }

      if (!q) {
        errors.push('第 ' + (i + 1) + ' 行：题库里找不到「' + U.truncate(key, 26) + '」');
        return;
      }

      if (seen[q.id]) {
        errors.push('第 ' + (i + 1) + ' 行：这道题前面已经写过了（' + q.id + '），已跳过');
        return;
      }
      seen[q.id] = 1;

      items.push({
        questionId: q.id,
        note: note,
        question: q,
        source: q.source || ''
      });
    });

    return { items: items, errors: errors };
  }

  /* ================================================================== */
  /* 导出共享文件                                                        */
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

  function cleanForExport(items) {
    return (items || []).map(function (it) {
      return { questionId: it.questionId, note: it.note || '', addedAt: it.addedAt || '' };
    });
  }

  function buildSharedJs(items, opts) {
    opts = opts || {};
    var clean = cleanForExport(items);
    var builtAt = nowStamp();

    var header = [
      '/*!',
      ' * push.shared.js —— 共享错题推送（运营者挑题，使用者一键收下）',
      ' *',
      ' * 本文件由「运营台 → 错题推送 → 导出推送文件」自动生成。',
      ' * 生成时间：' + builtAt,
      ' * 题目数量：' + clean.length,
      opts.title ? (' * 标题：' + opts.title) : null,
      opts.note ? (' * 说明：' + opts.note) : null,
      ' *',
      ' * 她打开网站会看到「布置给我的错题」，点一下全部进她自己错题本，',
      ' * 然后照常参与错题复习与推题。',
      ' *',
      ' * 格式规范见 SCHEMA.md 第 12 节。',
      ' */',
      '(function (global) {',
      "  'use strict';",
      '  var KY = (global.KY = global.KY || {});',
      ''
    ].filter(function (x) { return x !== null; }).join('\n');

    var body = [
      '  KY.sharedWrongPush = ' + indent({
        updatedAt: builtAt,
        title: opts.title || '',
        note: opts.note || '',
        items: clean
      }, 2) + ';',
      '',
      '  KY.sharedWrongPushMeta = ' + indent({
        builtAt: builtAt,
        count: clean.length,
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
      type: 'kaoyan-shared-wrong-push',
      version: 1,
      exportedAt: new Date().toISOString(),
      title: opts.title || '',
      note: opts.note || '',
      items: cleanForExport(items)
    }, null, 2) + '\n';
  }

  /* ================================================================== */
  /* 使用者侧：查看与收下                                                */
  /* ================================================================== */

  function addedMap() {
    var m = KY.store.raw.get(ADDED_KEY, {});
    return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
  }

  function markAdded(ids) {
    var m = addedMap();
    (ids || []).forEach(function (id) { m[id] = Date.now(); });
    KY.store.raw.set(ADDED_KEY, m);
    KY.bus.emit('push:changed', m);
  }

  function resetAdded() {
    KY.store.raw.set(ADDED_KEY, {});
    KY.bus.emit('push:changed', {});
  }

  /** 是否已经收下过（她可能在别处已经收过） */
  function isReceived(questionId) {
    if (addedMap()[questionId]) return true;
    // 已经在错题本里的也算收过
    return KY.store.getWrongbook().some(function (w) { return w.questionId === questionId; });
  }

  /** 待处理（还没收下的）推送条目 */
  function pending() {
    return getShared().items.filter(function (it) { return !isReceived(it.questionId); });
  }

  /** 解析成带题目对象的形式，便于渲染（包含找不到的） */
  function resolved() {
    return getShared().items.map(function (it) {
      var q = KY.bank.get(it.questionId);
      return {
        questionId: it.questionId,
        note: it.note || '',
        addedAt: it.addedAt || '',
        question: q,
        missing: !q,
        received: isReceived(it.questionId)
      };
    });
  }

  /**
   * 把推送的错题收进她的错题本。
   * @returns {{ added:Number, skipped:Number, missing:Array, errors:Array }}
   */
  function receive(items) {
    var list = items || resolved();
    var toAdd = [];
    var skipped = 0;
    var missing = [];
    var errors = [];

    list.forEach(function (r) {
      var q = r.question || KY.bank.get(r.questionId);
      if (!q) { missing.push(r.questionId); return; }
      if (isReceived(r.questionId) && !r.force) { skipped++; return; }

      var item;
      try {
        item = KY.classifier.fromQuestion(q, '', r.note || '');
      } catch (e) {
        errors.push(r.questionId + '：' + (e.message || e));
        return;
      }
      item.source = '老师布置的错题' + (q.source ? '（' + q.source + '）' : '');
      item.pushedNote = r.note || '';
      item.pushedAt = Date.now();
      item.isPushed = true;
      toAdd.push(item);
    });

    var added = toAdd.length ? KY.store.addWrongItems(toAdd) : [];

    // 收下的错题要下调对应考点掌握度，这样推题会立刻盯上它们
    added.forEach(function (w) {
      (w.knowledge || []).forEach(function (pid) { KY.store.penalizePoint(pid, 0.10); });
    });
    markAdded(added.map(function (w) { return w.questionId; }));

    return { added: added.length, skipped: skipped, missing: missing, errors: errors };
  }

  KY.push = {
    getShared: getShared,
    getMeta: getMeta,
    parseText: parseText,
    buildSharedJs: buildSharedJs,
    buildSharedJson: buildSharedJson,
    resolved: resolved,
    pending: pending,
    isReceived: isReceived,
    receive: receive,
    markAdded: markAdded,
    resetAdded: resetAdded,
    addedMap: addedMap,
    cleanForExport: cleanForExport
  };
})(window);
