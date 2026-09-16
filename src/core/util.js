/*!
 * util.js —— 通用工具函数
 * 挂载：KY.util
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var U = {};

  /* ---------------- 基础 ---------------- */

  U.uid = function (prefix) {
    return (prefix || 'id') + '-' +
      Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 8);
  };

  U.clamp = function (v, min, max) {
    return v < min ? min : (v > max ? max : v);
  };

  U.deepClone = function (obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(U.deepClone);
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = U.deepClone(obj[k]); });
    return out;
  };

  U.debounce = function (fn, wait) {
    var t = null;
    return function () {
      var self = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, wait || 200);
    };
  };

  U.throttle = function (fn, wait) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= (wait || 100)) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  };

  /* ---------------- HTML / 文本 ---------------- */

  U.escapeHtml = function (s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /**
   * 题目正文渲染：优先 stemHtml（受信任的题库内容），否则转义 stem 并保留换行。
   * 安全说明：stemHtml 只可能来自本地题库文件，不来自用户输入。
   */
  U.renderStem = function (q) {
    if (q && q.stemHtml) return q.stemHtml;
    return '<p>' + U.escapeHtml(q && q.stem).replace(/\n/g, '<br>') + '</p>';
  };

  /** 用户输入渲染：只转义，不解析 HTML */
  U.renderUserText = function (s) {
    return U.escapeHtml(s).replace(/\n/g, '<br>');
  };

  /** 把文本截断到 n 个字符 */
  U.truncate = function (s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  };

  /* ---------------- 答案归一化与比较 ---------------- */

  /** 全角转半角 */
  U.toHalfWidth = function (s) {
    return String(s || '').replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }).replace(/\u3000/g, ' ');
  };

  /**
   * 用于填空/主观比对：去空白、统一大小写、统一中英文标点。
   *
   * 重要：只丢掉「不可能是数学/公式语义」的标点。
   * 绝不能丢 . , < > / \ + - = * ^ % ' 等符号——
   * 早期版本把 < 和 > 一起去掉，导致 x<1 与 x>1 被判为相同答案；
   * 把 . 去掉则会让 1.5 与 15 相等。这两类都是致命的判分错误。
   */
  U.normalizeText = function (s) {
    return U.toHalfWidth(s)
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[。，、；：！？“”‘’（）【】《》〈〉…—～;:!?]/g, '')
      .trim();
  };

  /** 判断答案是否"像选项 key"（如 A / ABCD / A,C），用于推断题型 */
  U.looksLikeOptionKeys = function (v) {
    var keys = U.normalizeKeys(v);
    if (!keys.length || keys.length > 8) return false;
    return keys.every(function (k) { return /^[A-H]$/.test(k); });
  };

  /**
   * 归一化选项答案：去重、去空、统一大写、排序（多选无序）。
   * 会拆分 "AC" / "ABD" 这类连写答案——本系统的选项 key 恒为单个字母 A-H，
   * 所以连写必然是多个选项，拆开才能与题库里的 ['A','C'] 正确比对。
   */
  U.normalizeKeys = function (arr) {
    if (!Array.isArray(arr)) arr = (arr === null || arr === undefined || arr === '') ? [] : [arr];
    var seen = Object.create(null), out = [];
    function add(k) { if (k && !seen[k]) { seen[k] = 1; out.push(k); } }
    arr.forEach(function (raw) {
      var v = String(raw === null || raw === undefined ? '' : raw).trim().toUpperCase();
      if (!v) return;
      if (/^[A-H]{2,8}$/.test(v)) {
        v.split('').forEach(add);
      } else {
        add(v);
      }
    });
    return out.sort();
  };

  /**
   * 判分：返回 { correct: Boolean, partial: 0~1, detail }
   * q.type 为 single/multi/judge/cloze-item 时按选项 key 严格比对。
   * blank 时按空顺序做文本归一化比对，支持 blankTolerant（模糊包含）。
   */
  U.judge = function (q, userAnswer) {
    if (!q) return { correct: false, partial: 0, detail: '题目缺失' };

    if (q.type === 'subjective') {
      return { correct: false, partial: 0, detail: '主观题需自评' };
    }

    if (q.type === 'blank') {
      var ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      var ref = q.answer || [];
      var hit = 0, details = [];
      for (var i = 0; i < ref.length; i++) {
        var u = U.normalizeText(ua[i] === undefined || ua[i] === null ? '' : ua[i]);
        var r = U.normalizeText(ref[i]);
        var ok = u !== '' && (u === r || (q.blankTolerant && u.indexOf(r) >= 0));
        if (ok) hit++;
        details.push({ index: i, ok: ok, user: ua[i], ref: ref[i] });
      }
      var total = ref.length || 1;
      return {
        correct: hit === total && total > 0,
        partial: hit / total,
        detail: '答对 ' + hit + '/' + total + ' 空',
        blanks: details
      };
    }

    var uk = U.normalizeKeys(userAnswer);
    var rk = U.normalizeKeys(q.answer);
    if (!rk.length) return { correct: false, partial: 0, detail: '题目无参考答案' };

    var same = uk.length === rk.length && uk.every(function (k, i) { return k === rk[i]; });
    if (same) return { correct: true, partial: 1, detail: '正确' };

    // 多选题给部分分
    if (q.type === 'multi') {
      var good = uk.filter(function (k) { return rk.indexOf(k) >= 0; }).length;
      var wrong = uk.length - good;
      var partial = Math.max(0, (good - wrong) / rk.length);
      return { correct: false, partial: partial, detail: '对 ' + good + ' 项，错 ' + wrong + ' 项' };
    }

    return { correct: false, partial: 0, detail: '错误' };
  };

  /* ---------------- 格式化 ---------------- */

  U.fmtDate = function (ts, withTime) {
    if (!ts) return '—';
    var d = new Date(ts);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    var s = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    if (withTime) s += ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    return s;
  };

  U.fmtRelative = function (ts) {
    if (!ts) return '—';
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    var h = Math.floor(min / 60);
    if (h < 24) return h + ' 小时前';
    var d = Math.floor(h / 24);
    if (d < 30) return d + ' 天前';
    return U.fmtDate(ts);
  };

  U.fmtClock = function (seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return (h > 0 ? p(h) + ':' : '') + p(m) + ':' + p(s);
  };

  U.pct = function (v, digits) {
    return (v * 100).toFixed(digits === undefined ? 0 : digits) + '%';
  };

  U.fmtScore = function (v) {
    var n = Math.round(v * 10) / 10;
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1));
  };

  /* ---------------- 确定性伪随机（推题可复现） ---------------- */

  U.hashString = function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  };

  U.seededRandom = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  U.shuffle = function (arr, seed) {
    var a = arr.slice();
    var rnd = (seed === undefined) ? Math.random : U.seededRandom(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* ---------------- 文件 / 剪贴板 ---------------- */

  U.downloadText = function (filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  U.readFileAsText = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsText(file, 'utf-8');
    });
  };

  U.readFileAsDataURL = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(file);
    });
  };

  U.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
      document.body.removeChild(ta);
      resolve();
    });
  };

  /* ---------------- 简易 toast ---------------- */

  U.toast = function (msg, kind) {
    var host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add('toast-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 2400);
  };

  KY.util = U;
})(window);
