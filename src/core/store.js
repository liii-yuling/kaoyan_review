/*!
 * store.js —— 本地持久化（localStorage + 内存兜底）
 * 挂载：KY.store
 *
 * 设计要点：
 *  - 单用户本地应用，数据全部存在使用者自己的浏览器里，不上传任何服务器。
 *  - 某些浏览器在 file:// 下禁用 localStorage，此时自动降级为内存存储，
 *    并在界面上提示用户导出备份（避免"以为存上了其实丢了"）。
 *  - 所有 key 统一前缀 ky.v1.
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var PREFIX = 'ky.v1.';

  var memory = Object.create(null);
  var backend = 'memory';
  var backendError = '';

  // 探测 localStorage 是否真正可写
  (function probe() {
    try {
      var k = PREFIX + '__probe';
      global.localStorage.setItem(k, '1');
      if (global.localStorage.getItem(k) !== '1') throw new Error('readback failed');
      global.localStorage.removeItem(k);
      backend = 'localStorage';
    } catch (e) {
      backend = 'memory';
      backendError = (e && e.message) ? e.message : String(e);
    }
  })();

  var store = {
    /** 'localStorage' 或 'memory' */
    backend: function () { return backend; },
    backendError: function () { return backendError; },
    /** 是否能在刷新后保留数据 */
    persistent: function () { return backend === 'localStorage'; },

    key: function (name) { return PREFIX + name; },

    /**
     * 读取。返回 undefined 表示从未写入过。
     * 用 JSON 序列化，能安全存对象/数组。
     */
    get: function (name, fallback) {
      var raw;
      if (backend === 'localStorage') {
        try { raw = global.localStorage.getItem(PREFIX + name); }
        catch (e) { raw = null; }
      } else {
        raw = (name in memory) ? memory[name] : null;
      }
      if (raw === null || raw === undefined) {
        return fallback === undefined ? undefined : fallback;
      }
      try { return JSON.parse(raw); }
      catch (e) {
        console.warn('[store] JSON 解析失败，已忽略损坏数据：', name, e);
        return fallback === undefined ? undefined : fallback;
      }
    },

    set: function (name, value) {
      var raw = JSON.stringify(value);
      if (backend === 'localStorage') {
        try {
          global.localStorage.setItem(PREFIX + name, raw);
          return true;
        } catch (e) {
          // 常见原因：配额满。降级并告警，避免整个应用崩掉。
          backend = 'memory';
          backendError = 'localStorage 写入失败（可能已满）：' + (e && e.message ? e.message : e);
          if (KY.util) KY.util.toast('浏览器本地存储写入失败，已切换为临时存储，请及时导出备份', 'error');
        }
      }
      memory[name] = raw;
      return false;
    },

    remove: function (name) {
      if (backend === 'localStorage') {
        try { global.localStorage.removeItem(PREFIX + name); } catch (e) { /* 忽略 */ }
      }
      delete memory[name];
    },

    /** 列出本应用写入的所有 key（不含前缀） */
    keys: function () {
      var out = [];
      if (backend === 'localStorage') {
        try {
          for (var i = 0; i < global.localStorage.length; i++) {
            var k = global.localStorage.key(i);
            if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
          }
        } catch (e) { /* 忽略 */ }
      } else {
        Object.keys(memory).forEach(function (k) { out.push(k); });
      }
      return out.sort();
    },

    /** 读取全部应用数据为一个对象（用于导出备份） */
    dump: function () {
      var out = {};
      store.keys().forEach(function (k) { out[k] = store.get(k); });
      return out;
    },

    /** 从备份对象恢复（merge=true 时与现有数据合并，false 时整体覆盖） */
    restore: function (obj, merge) {
      if (!obj || typeof obj !== 'object') throw new Error('备份文件格式不正确');
      if (!merge) {
        store.keys().forEach(function (k) { store.remove(k); });
      }
      var n = 0;
      Object.keys(obj).forEach(function (k) {
        if (k === '__probe') return;
        store.set(k, obj[k]);
        n++;
      });
      return n;
    },

    /** 清空本应用的全部数据 */
    clearAll: function () {
      store.keys().forEach(function (k) { store.remove(k); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 领域数据访问层                                                       */
  /* ------------------------------------------------------------------ */

  var DEFAULT_SETTINGS = {
    ocr: {
      // 'off' | 'tesseract' | 'api'
      mode: 'tesseract',
      lang: 'chi_sim+eng',
      apiKey: '',
      endpoint: '',
      model: ''
    },
    ai: {
      // 预留：接入大模型后，错题归类与错因总结会走 AI，否则走本地规则引擎
      enabled: false,
      apiKey: '',
      endpoint: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat'
    },
    video: {
      preferEmbed: false // true 时优先内嵌播放器，false 时新窗口打开
    },
    study: {
      dailyNewQuestions: 12, // 每日推送新题上限
      reviewRatio: 0.6       // 错题复习中"未掌握考点"推题占比
    }
  };

  function deepMerge(base, patch) {
    var out = KY.util.deepClone(base);
    if (!patch || typeof patch !== 'object') return out;
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], v);
      } else if (v !== undefined) {
        out[k] = KY.util.deepClone(v);
      }
    });
    return out;
  }

  var data = {
    /* ---- 存储引擎状态（UI 需要知道数据是否能持久保存） ---- */
    backend: function () { return store.backend(); },
    backendError: function () { return store.backendError(); },
    /** 是否能刷新后保留数据（false 时页面必须提示用户导出备份） */
    persistent: function () { return store.persistent(); },

    /* ---- 用户档案 ---- */
    getProfile: function () {
      return store.get('profile', { name: '', targetSchool: '', examDate: '', createdAt: Date.now() });
    },
    setProfile: function (p) {
      var cur = data.getProfile();
      var next = deepMerge(cur, p);
      store.set('profile', next);
      return next;
    },

    /* ---- 设置 ---- */
    getSettings: function () {
      return deepMerge(DEFAULT_SETTINGS, store.get('settings', {}));
    },
    setSettings: function (patch) {
      var next = deepMerge(data.getSettings(), patch);
      store.set('settings', next);
      return next;
    },

    /* ---- 错题本 ---- */
    getWrongbook: function () {
      var list = store.get('wrongbook', []);
      return Array.isArray(list) ? list : [];
    },
    setWrongbook: function (list) {
      store.set('wrongbook', Array.isArray(list) ? list : []);
      KY.bus.emit('wrongbook:changed', { count: (list || []).length });
    },
    addWrongItems: function (items) {
      var list = data.getWrongbook();
      var ids = Object.create(null);
      list.forEach(function (w) { ids[w.id] = 1; });
      var added = [];
      items.forEach(function (it) {
        if (!it.id) it.id = KY.util.uid('w');
        if (!ids[it.id]) { list.unshift(it); ids[it.id] = 1; added.push(it); }
      });
      data.setWrongbook(list);
      return added;
    },
    updateWrongItem: function (id, patch) {
      var list = data.getWrongbook();
      var idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
      if (idx < 0) return null;
      list[idx] = deepMerge(list[idx], patch);
      data.setWrongbook(list);
      return list[idx];
    },
    removeWrongItem: function (id) {
      data.setWrongbook(data.getWrongbook().filter(function (w) { return w.id !== id; }));
    },

    /* ---- 掌握度 ---- */
    getMastery: function () {
      var m = store.get('mastery', {});
      return (m && typeof m === 'object') ? m : {};
    },
    setMastery: function (m) {
      store.set('mastery', m || {});
      KY.bus.emit('mastery:changed', m);
    },
    getPointMastery: function (pointId) {
      var m = data.getMastery()[pointId];
      if (!m) return { score: 0.35, attempts: 0, correct: 0, lastAt: 0, streak: 0 };
      return m;
    },
    /** 答对/答错后更新掌握度。correct=null 表示仅记录一次作答（主观题自评用 partial） */
    recordPointResult: function (pointId, correct, weight) {
      var m = data.getMastery();
      var cur = m[pointId] || { score: 0.35, attempts: 0, correct: 0, lastAt: 0, streak: 0 };
      var w = (weight === undefined || weight === null) ? 1 : weight;
      var s = typeof cur.score === 'number' ? cur.score : 0.35;
      if (correct) {
        s = s + (1 - s) * 0.25 * w;
        cur.streak = (cur.streak || 0) + 1;
      } else {
        s = s + (0 - s) * 0.35 * w;
        cur.streak = 0;
      }
      cur.score = KY.util.clamp(s, 0, 1);
      cur.attempts = (cur.attempts || 0) + 1;
      if (correct) cur.correct = (cur.correct || 0) + 1;
      cur.lastAt = Date.now();
      m[pointId] = cur;
      data.setMastery(m);
      return cur;
    },
    /** 错题本新增该考点错题时的惩罚 */
    penalizePoint: function (pointId, amount) {
      var m = data.getMastery();
      var cur = m[pointId] || { score: 0.35, attempts: 0, correct: 0, lastAt: 0, streak: 0 };
      cur.score = KY.util.clamp((typeof cur.score === 'number' ? cur.score : 0.35) - (amount === undefined ? 0.10 : amount), 0, 1);
      cur.lastAt = Date.now();
      m[pointId] = cur;
      data.setMastery(m);
      return cur;
    },

    /* ---- 练习会话 ---- */
    getPracticeHistory: function () {
      var h = store.get('practice', []);
      return Array.isArray(h) ? h : [];
    },
    addPracticeSession: function (sess) {
      var h = data.getPracticeHistory();
      h.unshift(sess);
      store.set('practice', h.slice(0, 200));
      KY.bus.emit('practice:changed', sess);
    },

    /* ---- 考试成绩 ---- */
    getExams: function () {
      var e = store.get('exams', []);
      return Array.isArray(e) ? e : [];
    },
    addExamRecord: function (rec) {
      var e = data.getExams();
      e.unshift(rec);
      store.set('exams', e.slice(0, 200));
      KY.bus.emit('exam:changed', rec);
    },

    /* ---- B站视频绑定覆盖 ---- */
    getVideoOverrides: function () {
      var v = store.get('videoOverrides', {});
      return (v && typeof v === 'object') ? v : {};
    },
    setVideoOverride: function (questionId, bvid, title) {
      var v = data.getVideoOverrides();
      if (!bvid) delete v[questionId];
      else v[questionId] = { bvid: bvid, title: title || '' };
      store.set('videoOverrides', v);
      KY.bus.emit('video:changed', { questionId: questionId });
      return v;
    },

    /* ---- 收藏 / 生词本等扩展位（后续功能预留） ---- */
    getCollection: function (name) {
      var c = store.get('col.' + name, []);
      return Array.isArray(c) ? c : [];
    },
    setCollection: function (name, list) {
      store.set('col.' + name, Array.isArray(list) ? list : []);
      KY.bus.emit('collection:changed', { name: name });
    },
    toggleCollection: function (name, value) {
      var list = data.getCollection(name);
      var i = list.indexOf(value);
      if (i >= 0) list.splice(i, 1); else list.push(value);
      data.setCollection(name, list);
      return i < 0;
    },

    /* ---- 原始读写（扩展用） ---- */
    raw: store,
    DEFAULTS: DEFAULT_SETTINGS
  };

  KY.store = data;
})(window);
