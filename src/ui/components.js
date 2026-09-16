/*!
 * components.js —— 共享 UI 组件
 * 挂载：KY.ui
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});
  var U = KY.util;
  var esc = U.escapeHtml;

  /* ---------------- 小标签 ---------------- */

  function subTag(subject) {
    return '<span class="sub-tag sub-' + esc(subject) + '">' + esc(KY.subjectName(subject)) + '</span>';
  }

  function tag(text, cls) {
    return '<span class="tag' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</span>';
  }

  function knowledgeChips(ids, opts) {
    opts = opts || {};
    if (!ids || !ids.length) return '<span class="chip muted">未分类</span>';
    return '<span class="knowledge-chips">' + ids.map(function (pid) {
      var n = KY.getTaxNode(pid);
      var name = n ? n.point.name : pid;
      var title = n ? (n.subjectName + ' / ' + n.moduleName + ' / ' + n.point.name) : pid;
      if (opts.clickable) {
        return '<span class="chip clickable" data-point="' + esc(pid) + '" title="' + esc(title) + '">' + esc(name) + '</span>';
      }
      return '<span class="chip" title="' + esc(title) + '">' + esc(name) + '</span>';
    }).join('') + '</span>';
  }

  function masteryBar(score, showText) {
    var s = U.clamp(typeof score === 'number' ? score : 0.35, 0, 1);
    var cls = s >= 0.75 ? 'bar-ok' : (s >= 0.6 ? 'bar-warn' : 'bar-err');
    var html = '<span class="bar ' + cls + '" title="掌握度 ' + U.pct(s) + '"><span style="width:' +
      (s * 100).toFixed(1) + '%"></span></span>';
    if (showText) {
      html = '<div class="row tight" style="gap:8px">' + html +
        '<span class="mono" style="font-size:12px;color:var(--text-3);flex:0 0 34px;text-align:right">' +
        U.pct(s) + '</span></div>';
    }
    return html;
  }

  function masteryLabel(score) {
    var s = typeof score === 'number' ? score : 0.35;
    if (s >= 0.85) return tag('已掌握', 'tag-ok');
    if (s >= 0.6) return tag('基本掌握', 'tag-warn');
    if (s >= 0.3) return tag('未掌握', 'tag-err');
    return tag('薄弱', 'tag-err');
  }

  /* ---------------- 统计块 ---------------- */

  function stat(num, label, extraHtml) {
    return '<div class="stat"><div class="num">' + num + '</div><div class="lbl">' + esc(label) + '</div>' +
      (extraHtml || '') + '</div>';
  }

  /* ---------------- 题目卡片 ---------------- */

  /* ---------------- 答案文本与可折叠答案块 ---------------- */

  /** 把题目答案格式化成人类可读文本 */
  function answerText(q) {
    if (q.type === 'blank') return (q.answer || []).join('  |  ') || '见解析';
    if (q.type === 'subjective') return (q.answer || []).join('；') || '见解析';
    return U.normalizeKeys(q.answer).join('') || '见解析';
  }

  /**
   * 可折叠的答案与详解块（默认 hidden）。
   * 用于「题目浏览 / 真题墙」这类模式：先看题，点「查看答案与详解」再展开并滚动到此处。
   * 考试与练习作答中绝不渲染这个块，否则等于把答案摆在学生面前。
   */
  function collapsibleAnswer(q, opts) {
    var h = '<div class="q-answer" id="ans-' + esc(q.id) + '" hidden>';
    h += '<div class="q-answer-inner">';
    h += '<div class="answer-box ok">';
    h += '<div class="line"><span class="k">正确答案：</span><b style="color:var(--ok);font-size:15px">' +
      esc(answerText(q)) + '</b></div>';
    if (q.explanation) {
      h += '<div class="exp"><b>解析</b>\n' + esc(q.explanation) + '</div>';
    } else {
      h += '<div class="exp" style="color:var(--text-3)">（这道题还没有录入解析）</div>';
    }
    if (q.knowledge && q.knowledge.length) {
      h += '<div class="line" style="margin-top:9px"><span class="k">考点：</span>' + knowledgeChips(q.knowledge) + '</div>';
    }
    if (q.source) {
      h += '<div class="line"><span class="k">来源：</span>' + esc(q.source) + '</div>';
    }
    h += '</div>';
    if (opts.answerJumpVideo !== false) {
      h += KY.video.renderBlock(q, { embed: opts.embedVideo });
    }
    h += '</div></div>';
    return h;
  }

  /**
   * 题目卡片
   *
   * @param {Object} q 题目
   * @param {Object} opts
   *   index          题号（从 1 开始）
   *   value          当前作答（选项 key 数组，或填空题字符串数组）
   *   mode           'answer' 作答中 | 'review' 已判分展示
   *   result         'correct' | 'wrong' | 'blank'（review 模式用）
   *   answerJump     true = 答案默认收起，卡片底部给「查看答案与详解」跳转按钮
   *                  （题库浏览 / 真题墙用；考试与练习必须传 false，否则等于泄题）
   *   showVideo      是否显示 B站详解块（review 模式用；answerJump 模式视频在答案块里）
   *   showExplanation 是否展示解析
   *   sectionName    所属板块名
   *   scoreText      分值文本，如 '2 分'
   *   extraFoot      底部附加 HTML
   */
  function questionCard(q, opts) {
    opts = opts || {};
    var mode = opts.mode || 'answer';
    var reviewing = mode === 'review';
    var value = opts.value;
    var html = '';

    var cls = 'q-card';
    if (reviewing && opts.result) cls += ' ' + opts.result;

    html += '<div class="' + cls + '" id="q-' + esc(q.id) + '" data-qid="' + esc(q.id) + '">';

    /* 头部 */
    html += '<div class="q-head">';
    if (opts.index) html += '<span class="q-no">第 ' + opts.index + ' 题</span>';
    if (q.subject) html += subTag(q.subject);
    if (q.type) {
      var typeName = { single: '单选', multi: '多选', judge: '判断', blank: '填空', 'cloze-item': '完形填空', subjective: '主观题' }[q.type] || q.type;
      html += tag(typeName);
    }
    if (q.year) html += tag(q.year + ' 真题', 'tag-real');
    if (q.userImported) html += tag('我导入的', 'tag-brand');
    if (q.difficulty && opts.showDifficulty !== false) html += tag('难度 ' + '★'.repeat(q.difficulty));
    if (opts.sectionName) html += '<span>' + esc(opts.sectionName) + '</span>';
    if (opts.scoreText) html += '<span>' + esc(opts.scoreText) + '</span>';
    html += '<span class="spacer"></span>';
    if (reviewing && opts.result) {
      html += opts.result === 'correct' ? tag('✓ 正确', 'tag-ok')
        : (opts.result === 'blank' ? tag('未作答', 'tag-warn') : tag('✗ 错误', 'tag-err'));
    }
    html += '</div>';

    /*
     * 阅读原文（英语阅读题专用）。
     * 放在题干**之前** —— 阅读题必须"先读文章再做题"。
     * 用原生 <details> 折叠：默认收起，列表里不会被大段英文淹没，
     * 需要时点开；不需要任何 JS，考试模式下也不影响作答。
     */
    if (q.passage) {
      html += '<details class="q-passage">' +
        '<summary>📄 阅读原文（点开查看）</summary>' +
        '<div class="q-passage-body">' + esc(q.passage).replace(/\n+/g, '<br>') + '</div>' +
        '</details>';
    }

    /* 题干 */
    html += '<div class="q-stem">' + U.renderStem(q) + '</div>';

    /* 作答区 */
    if (q.type === 'blank') {
      var refCount = Math.max((q.answer || []).length, 1);
      var vals = Array.isArray(value) ? value : [];
      html += '<div class="blank-inputs">';
      for (var i = 0; i < refCount; i++) {
        var v = vals[i] === undefined || vals[i] === null ? '' : String(vals[i]);
        var bl = null;
        if (reviewing && opts.blanks && opts.blanks[i]) bl = opts.blanks[i];
        var inputCls = '';
        if (bl) inputCls = bl.ok ? 'is-answer' : 'is-chosen-wrong';
        html += '<div class="blank-row">';
        html += '<span class="idx">第 ' + (i + 1) + ' 空</span>';
        html += '<input type="text" class="' + inputCls + '" name="ans-' + esc(q.id) + '-' + i + '"' +
          ' value="' + esc(v) + '"' + (reviewing ? ' disabled' : '') +
          ' placeholder="填写答案">';
        if (bl) {
          html += '<span class="tag ' + (bl.ok ? 'tag-ok' : 'tag-err') + '">参考：' + esc(bl.ref) + '</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    } else if (q.type === 'subjective') {
      var sv = Array.isArray(value) ? value.join('\n') : (value || '');
      if (reviewing && opts.selfAssess) {
        // 自评模式：显示参考答案要点 + 勾选评分点
        html += '<div class="answer-box"><div class="line"><span class="k">我的作答：</span></div>' +
          '<div style="white-space:pre-wrap;margin:6px 0">' + (sv ? U.renderUserText(sv) : '<span style="color:var(--text-3)">（未作答）</span>') + '</div></div>';
        var rubric = q.rubric || [];
        if (rubric.length) {
          var rubricTotal = rubric.reduce(function (s, rb) { return s + (rb.score || 0); }, 0);
          html += '<div class="answer-box"><b>评分要点（勾选你答对的点）</b>' +
            '<div style="font-size:12px;color:var(--text-3);margin-top:3px">' +
            '要点合计 ' + U.fmtScore(rubricTotal) + ' 分，勾选后按比例折算为本题满分</div>' +
            '<ul class="rubric-list">';
          rubric.forEach(function (rb, idx) {
            var marks = (opts.rubricScores && opts.rubricScores[q.id]) || {};
            html += '<li><label class="checkbox"><input type="checkbox" data-rubric="' + esc(q.id) + '" data-rubric-idx="' + idx + '"' +
              (marks[idx] ? ' checked' : '') + '><span>' + esc(rb.point) +
              ' <b style="color:var(--brand)">(' + U.fmtScore(rb.score || 0) + ' 分)</b></span></label></li>';
          });
          html += '</ul></div>';
        } else {
          html += '<div class="answer-box"><b>自评</b><div class="row" style="margin-top:8px">' +
            '<label class="radio"><input type="radio" name="self-' + esc(q.id) + '" data-self="' + esc(q.id) + '" value="1"' +
            ((opts.rubricScores && opts.rubricScores[q.id] && opts.rubricScores[q.id][0] === 1) ? ' checked' : '') + '>完全正确</label>' +
            '<label class="radio"><input type="radio" name="self-' + esc(q.id) + '" data-self="' + esc(q.id) + '" value="0.5"' +
            ((opts.rubricScores && opts.rubricScores[q.id] && opts.rubricScores[q.id][0] === 0.5) ? ' checked' : '') + '>部分正确</label>' +
            '<label class="radio"><input type="radio" name="self-' + esc(q.id) + '" data-self="' + esc(q.id) + '" value="0"' +
            '>完全不会</label></div></div>';
        }
      } else if (reviewing) {
        html += '<div class="answer-box"><div class="line"><span class="k">我的作答：</span></div>' +
          '<div style="white-space:pre-wrap">' + (sv ? U.renderUserText(sv) : '<span style="color:var(--text-3)">（未作答）</span>') + '</div>' +
          (opts.selfScore !== undefined && opts.selfScore !== null
            ? '<div class="line" style="margin-top:8px"><span class="k">自评得分：</span><b style="color:var(--brand)">' + U.fmtScore(opts.selfScore) + '</b></div>'
            : '') +
          '</div>';
      } else {
        html += '<textarea name="ans-' + esc(q.id) + '" rows="6" placeholder="在此作答（主观题，交卷后按评分要点自评）">' + esc(sv) + '</textarea>';
      }
    } else {
      /* 客观选择题 */
      var chosen = U.normalizeKeys(value);
      var correct = U.normalizeKeys(q.answer);
      html += '<div class="opts">';
      (q.options || []).forEach(function (o) {
        var k = o.key;
        var isChosen = chosen.indexOf(k) >= 0;
        var isAns = correct.indexOf(k) >= 0;
        var cls2 = 'opt';
        if (reviewing) {
          cls2 += ' disabled';
          if (isAns) cls2 += ' is-answer';
          if (isChosen && !isAns) cls2 += ' is-chosen-wrong';
        } else if (isChosen) {
          cls2 += ' selected';
        }
        var inputType = q.type === 'multi' ? 'checkbox' : 'radio';
        html += '<label class="' + cls2 + '">';
        if (!reviewing) {
          html += '<input type="' + inputType + '" name="ans-' + esc(q.id) + '" value="' + esc(k) + '"' +
            (isChosen ? ' checked' : '') + '>';
        }
        html += '<span class="key">' + esc(k) + '</span><span class="txt">' + esc(o.text) + '</span>';
        html += '</label>';
      });
      html += '</div>';
    }

    /* 可折叠答案块（题库浏览 / 真题墙模式） */
    if (!reviewing && opts.answerJump) {
      html += '<div class="q-foot">';
      html += '<button class="btn btn-sm btn-primary" data-jump-answer="' + esc(q.id) + '">' +
        '查看答案与详解 ↓</button>';
      html += '<span class="q-foot-hint">建议先自己做完，再点开对照思路</span>';
      html += '</div>';
      html += collapsibleAnswer(q, opts);
    }

    /* 判分结果 / 解析 */
    if (reviewing) {
      var ansText = answerText(q);
      html += '<div class="answer-box ' + (opts.result === 'correct' ? 'ok' : (opts.result === 'wrong' ? 'no' : '')) + '">';
      if (opts.result !== 'blank') {
        html += '<div class="line"><span class="k">你的作答：</span><b>' +
          (U.normalizeKeys(value).join('') || (Array.isArray(value) ? value.join(' | ') : (value || '—'))) + '</b></div>';
      }
      html += '<div class="line"><span class="k">正确答案：</span><b style="color:var(--ok)">' + esc(ansText || '见解析') + '</b></div>';
      if (opts.gradeDetail) html += '<div class="line"><span class="k">判分：</span>' + esc(opts.gradeDetail) + '</div>';
      if (q.explanation && opts.showExplanation !== false) {
        html += '<div class="exp"><b>解析</b>\n' + esc(q.explanation) + '</div>';
      }
      if (q.knowledge && q.knowledge.length) {
        html += '<div class="line" style="margin-top:9px"><span class="k">考点：</span>' + knowledgeChips(q.knowledge) + '</div>';
      }
      html += '</div>';
    } else if (q.type === 'subjective' && opts.showRubricHint !== false) {
      /* 作答时不透题，只提示题量与题型 */
    }

    /* B站详解 */
    if (opts.showVideo) {
      html += KY.video.renderBlock(q, { embed: opts.embedVideo });
    }

    if (opts.extraFoot) html += opts.extraFoot;

    html += '</div>';
    return html;
  }

  /**
   * 从 DOM 读取某题的作答。
   * 选择题：勾选的 key 数组；填空题：按空顺序的字符串数组；主观题：字符串。
   */
  function readAnswer(q, root) {
    root = root || document;
    var card = root.querySelector('[data-qid="' + cssEscape(q.id) + '"]') || root;

    if (q.type === 'subjective') {
      var ta = card.querySelector('textarea[name="ans-' + cssEscape(q.id) + '"]');
      return ta ? ta.value : '';
    }

    if (q.type === 'blank') {
      var out = [];
      var i = 0;
      while (true) {
        var inp = card.querySelector('input[name="ans-' + cssEscape(q.id) + '-' + i + '"]');
        if (!inp) break;
        out.push(inp.value);
        i++;
      }
      return out;
    }

    var checked = card.querySelectorAll('input[name="ans-' + cssEscape(q.id) + '"]:checked');
    var keys = [];
    Array.prototype.forEach.call(checked, function (el) { keys.push(el.value); });
    return keys.sort();
  }

  /** 读取当前视图内全部题目的作答，返回 { questionId: answer } */
  function readAllAnswers(questions, root) {
    var out = {};
    questions.forEach(function (q) { out[q.id] = readAnswer(q, root); });
    return out;
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, '\\$&');
  }

  /** 已作答判断 */
  function isAnswered(q, val) {
    if (q.type === 'subjective') return String(val || '').trim().length > 0;
    if (Array.isArray(val)) return val.some(function (v) { return String(v || '').trim().length > 0; });
    return String(val || '').trim().length > 0;
  }

  /* ---------------- 弹窗 ---------------- */

  /**
   * @param {Object} cfg { title, body, footer, wide, narrow, onMount }
   * @returns {{close:Function, el:Element}}
   */
  function modal(cfg) {
    cfg = cfg || {};
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    var cls = 'modal' + (cfg.wide ? ' wide' : '') + (cfg.narrow ? ' narrow' : '');
    mask.innerHTML =
      '<div class="' + cls + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(cfg.title || '') + '</h3><span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" data-modal-close>✕</button></div>' +
      '<div class="modal-body"></div>' +
      (cfg.footer ? '<div class="modal-foot"></div>' : '') +
      '</div>';

    var bodyEl = mask.querySelector('.modal-body');
    if (typeof cfg.body === 'string') bodyEl.innerHTML = cfg.body;
    else if (cfg.body instanceof Node) bodyEl.appendChild(cfg.body);

    if (cfg.footer) {
      var footEl = mask.querySelector('.modal-foot');
      if (typeof cfg.footer === 'string') footEl.innerHTML = cfg.footer;
      else if (cfg.footer instanceof Node) footEl.appendChild(cfg.footer);
    }

    function close() {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    mask.addEventListener('click', function (e) {
      if (e.target === mask) close();
      if (e.target.closest && e.target.closest('[data-modal-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    document.body.style.overflow = 'hidden';

    if (typeof cfg.onMount === 'function') cfg.onMount(mask, close);

    var firstInput = mask.querySelector('input:not([type=hidden]), textarea, select');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 30);

    return { close: close, el: mask };
  }

  /** 确认对话框，返回 Promise<boolean> */
  function confirm(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var m = modal({
        title: opts.title || '请确认',
        narrow: true,
        body: '<p style="margin:0;font-size:14px;line-height:1.75">' + esc(message).replace(/\n/g, '<br>') + '</p>',
        footer: '<button class="btn" data-modal-close>取消</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + esc(opts.okText || '确定') + '</button>',
        onMount: function (mask, close) {
          mask.querySelector('[data-yes]').addEventListener('click', function () {
            close();
            resolve(true);
          });
          mask.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-modal-close]')) resolve(false);
          });
        }
      });
      void m;
    });
  }

  /** 提示信息框 */
  function alertBox(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      modal({
        title: opts.title || '提示',
        narrow: true,
        body: '<div style="font-size:14px;line-height:1.75;white-space:pre-wrap">' + esc(message) + '</div>',
        footer: '<button class="btn btn-primary" data-modal-close>知道了</button>',
        onMount: function (mask, close) {
          mask.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-modal-close]')) { close(); resolve(); }
          });
        }
      });
    });
  }

  /* ---------------- 空状态 ---------------- */

  function empty(title, desc, actionHtml) {
    return '<div class="empty-state"><h2>' + esc(title) + '</h2>' +
      (desc ? '<p>' + esc(desc) + '</p>' : '') +
      (actionHtml || '') + '</div>';
  }

  /* ---------------- 页面标题 ---------------- */

  function setTitle(text) {
    var el = document.getElementById('page-title');
    if (el) el.textContent = text;
    document.title = text + ' · 考研定制化复习';
  }

  /* ---------------- 「查看答案与详解」跳转 ---------------- */

  /**
   * 全局事件委托：任何 [data-jump-answer="<qid>"] 的按钮都能展开/收起
   * 对应的 #ans-<qid> 答案块，并把视口滚到答案处。
   */
  KY.bindAnswerJumpDelegation = function () {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest('[data-jump-answer]');
      if (!btn) return;
      e.preventDefault();

      var qid = btn.getAttribute('data-jump-answer');
      var box = document.getElementById('ans-' + qid);
      if (!box) {
        U.toast('找不到这道题的答案块', 'error');
        return;
      }

      var wasHidden = box.hasAttribute('hidden');
      if (wasHidden) {
        box.removeAttribute('hidden');
        btn.textContent = '收起答案与详解 ↑';
        btn.classList.remove('btn-primary');
        // 等浏览器完成布局再滚动，否则滚动位置会偏
        setTimeout(function () {
          if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
      } else {
        box.setAttribute('hidden', '');
        btn.textContent = '查看答案与详解 ↓';
        btn.classList.add('btn-primary');
        if (btn.scrollIntoView) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  KY.ui = {
    subTag: subTag,
    tag: tag,
    knowledgeChips: knowledgeChips,
    masteryBar: masteryBar,
    masteryLabel: masteryLabel,
    stat: stat,
    questionCard: questionCard,
    answerText: answerText,
    collapsibleAnswer: collapsibleAnswer,
    readAnswer: readAnswer,
    readAllAnswers: readAllAnswers,
    isAnswered: isAnswered,
    modal: modal,
    confirm: confirm,
    alertBox: alertBox,
    empty: empty,
    setTitle: setTitle,
    esc: esc
  };
})(window);
