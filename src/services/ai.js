/*!
 * ai.js —— 大模型增强（可选，预留接口）
 * 挂载：KY.ai
 *
 * 定位：本地规则引擎（KY.classifier）永远是可用的兜底。
 * 只有当用户在「设置 → AI 增强」里填好接口并启用后，
 * 才会额外调用大模型，对归类结果做一次纠错与错因总结润色。
 *
 * 任何失败都不阻塞流程：直接返回本地结果。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;

  function isEnabled() {
    var s = KY.store.getSettings().ai;
    return !!(s.enabled && s.endpoint && s.apiKey);
  }

  /** 构造一份"考点清单"给模型做选择题，避免模型自创不存在的考点 */
  function pointCatalog(subject) {
    var rows = [];
    KY.getModules(subject).forEach(function (m) {
      m.points.forEach(function (p) {
        rows.push({ module: m.name, moduleId: m.id, id: p.id, name: p.name });
      });
    });
    return rows;
  }

  function systemPrompt() {
    return [
      '你是一个考研错题分析助手。你会收到一道错题的信息，以及一份"允许使用的考点清单"。',
      '你的任务：',
      '1) 从清单中选出 1~2 个最贴切的考点 id（必须原样复制清单里的 id，不许自创）；',
      '2) 判断错因类型，只能从这些值里选：concept, formula, calculation, reading, method, vocab, logic, careless, unknown；',
      '3) 用中文写一段 3~5 行的错因总结与改进建议，具体、可执行，不要套话。',
      '必须只输出一个 JSON 对象，不要 markdown 代码块，格式：',
      '{"knowledge":["id1"],"errorType":"concept","summary":"..."}'
    ].join('\n');
  }

  function callApi(messages, timeoutMs) {
    var s = KY.store.getSettings().ai;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 45000) : null;

    return fetch(s.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + s.apiKey
      },
      body: JSON.stringify({
        model: s.model || 'deepseek-chat',
        messages: messages,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('AI 接口返回 ' + r.status + '：' + U.truncate(t, 200));
        });
      }
      return r.json();
    }).then(function (j) {
      var c = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
      return typeof c === 'string' ? c : JSON.stringify(c);
    });
  }

  /** 从模型输出里稳妥地抽出 JSON */
  function extractJson(text) {
    if (!text) return null;
    var s = String(text).trim();
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(s); }
    catch (e) {
      var m = s.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch (e2) { return null; } }
      return null;
    }
  }

  /**
   * 增强一条错题归类结果。
   * @param {Object} item KY.classifier.classify 的产物
   * @returns {Promise<Object>} 增强后的 item（失败时原样返回）
   */
  function enhance(item) {
    if (!isEnabled()) return Promise.resolve(item);

    var catalog = pointCatalog(item.subject);
    var payload = {
      subject: KY.subjectName(item.subject),
      stem: U.truncate(item.stem, 1200),
      options: (item.options || []).map(function (o) { return o.key + '. ' + o.text; }),
      myAnswer: item.myAnswer,
      correctAnswer: item.correctAnswer,
      note: item.note || '',
      localGuess: { knowledge: item.knowledge, errorType: item.errorType },
      allowedPoints: catalog
    };

    return callApi([
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: JSON.stringify(payload) }
    ]).then(function (text) {
      var j = extractJson(text);
      if (!j) throw new Error('AI 返回内容不是合法 JSON');

      var validIds = Object.create(null);
      catalog.forEach(function (c) { validIds[c.id] = 1; });

      var kn = (j.knowledge || []).filter(function (id) { return validIds[id]; });
      if (kn.length) {
        item.knowledge = kn.slice(0, 2);
        var n = KY.getTaxNode(item.knowledge[0]);
        if (n) { item.module = n.module.id; }
      }

      var allowedErr = KY.ERROR_TYPES.map(function (e) { return e.id; });
      if (j.errorType && allowedErr.indexOf(j.errorType) >= 0) {
        item.errorType = j.errorType;
      }

      if (j.summary && String(j.summary).trim()) {
        item.errorSummary = item.errorSummary +
          '\n\n【AI 增强分析】\n' + String(j.summary).trim();
        item.aiEnhanced = true;
      }

      item.aiMeta = { enhancedAt: Date.now() };
      return item;
    }).catch(function (e) {
      console.warn('[ai] 增强失败，沿用本地规则结果：', e);
      item.aiError = e && e.message ? e.message : String(e);
      return item;
    });
  }

  /** 连接测试，供设置页使用 */
  function testConnection() {
    if (!isEnabled()) {
      return Promise.reject(new Error('请先启用 AI 增强并填写接口地址与 API Key'));
    }
    return callApi([
      { role: 'system', content: '你是一个测试助手，只输出 JSON。' },
      { role: 'user', content: '返回 {"ok":true}' }
    ], 20000).then(function (text) {
      var j = extractJson(text);
      if (!j) throw new Error('接口可达，但返回内容不是 JSON：' + U.truncate(text, 120));
      return { ok: true, raw: j };
    });
  }

  KY.ai = {
    isEnabled: isEnabled,
    enhance: enhance,
    testConnection: testConnection,
    pointCatalog: pointCatalog,
    extractJson: extractJson
  };
})(window);
