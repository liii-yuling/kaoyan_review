/*!
 * views/wrongbook.js —— 错题本
 * 路由： #/wrongbook                      列表
 *        #/wrongbook?action=upload        直接打开上传
 *        #/wrongbook?subject=math1        按科目筛选
 *
 * 核心流程：上传（图片 OCR / 粘贴文本 / 手填）→ 本地规则引擎自动归类 →
 *          用户确认或修正考点与错因 → 入库 → 参与掌握度计算与推题
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  /* 列表页筛选状态 */
  var F = { subject: '', module: '', errorType: '', status: 'active', keyword: '' };

  /* ================================================================== */
  /* 考点选择器                                                          */
  /* ================================================================== */

  /**
   * 生成考点下拉选择器（按模块分组）。
   * @param {String} subject 限定科目，'' 表示全部
   * @param {String[]} selected 已选考点 id
   * @param {String} namePrefix 生成 name 属性前缀
   */
  function pointSelectHtml(subject, selected, namePrefix) {
    selected = selected || [];
    var subjects = subject ? [subject] : KY.SUBJECTS;
    var groups = subjects.map(function (sub) {
      var opts = KY.getModules(sub).map(function (m) {
        return '<optgroup label="' + esc(KY.subjectName(sub) + ' / ' + m.name) + '">' +
          m.points.map(function (p) {
            return '<option value="' + esc(p.id) + '"' +
              (selected.indexOf(p.id) >= 0 ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '</optgroup>';
      }).join('');
      return opts;
    }).join('');
    return '<select name="' + esc(namePrefix) + '" multiple size="10" ' +
      'style="min-height:180px">' + groups + '</select>' +
      '<span class="hint">按住 Ctrl / Cmd 可多选；选错考点会直接影响后续推题质量，请确认后再保存。</span>';
  }

  /** 读取多选 select 的值 */
  function readMultiSelect(el) {
    if (!el) return [];
    return Array.prototype.filter.call(el.options, function (o) { return o.selected; })
      .map(function (o) { return o.value; });
  }

  /* ================================================================== */
  /* 上传弹窗                                                            */
  /* ================================================================== */

  function openUpload(mount, presetSubject) {
    var settings = KY.store.getSettings();
    var ocrMode = settings.ocr.mode;
    var ocrDiag = KY.ocr.diagnose();

    var body = '' +
      '<div class="segmented" id="upload-tabs" style="margin-bottom:16px">' +
      '<button class="on" data-tab="text">粘贴 / 输入文字</button>' +
      '<button data-tab="image">上传图片（拍照截图）</button>' +
      '<button data-tab="manual">手动逐项填写</button>' +
      '</div>' +

      /* --- 文本上传 --- */
      '<div data-pane="text">' +
      '<label class="field"><span class="lbl">把错题内容粘贴到这里（可直接从网页/PDF/文档复制）</span>' +
      '<textarea id="up-text" rows="10" placeholder="例：&#10;1. 设函数 f(x) = x^3 - 3x，求 f(x) 的极值。&#10;A. 极大值 f(-1)=2，极小值 f(1)=-2&#10;B. ...&#10;答案：A&#10;&#10;（一次粘贴多道题也可以，系统会按题号自动拆分）"></textarea>' +
      '<span class="hint">支持一次粘贴多道题：按「1.」「2.」这样的题号自动拆分，逐题归类。</span></label>' +
      '</div>' +

      /* --- 图片上传 --- */
      '<div data-pane="image" style="display:none">' +
      (ocrMode === 'off'
        ? '<div class="hint-box warn">图片识别当前已关闭。请到「设置 → 图片识别」开启，或改用「粘贴文字」。</div>'
        : '') +
      '<div class="dropzone" id="dropzone">' +
      '<div class="big">📷</div>' +
      '<div>点击选择图片，或把图片拖到这里</div>' +
      '<div class="hint">支持 JPG / PNG / WebP / GIF；' +
      (ocrMode === 'tesseract' ? '本地识别，首次使用需联网下载语言包' : '通过你配置的接口识别') + '</div>' +
      '</div>' +
      '<input type="file" id="file-input" accept="image/*" multiple style="display:none">' +
      '<div id="img-preview"></div>' +
      '<div class="ocr-status" id="ocr-status"></div>' +
      '<label class="field" style="margin-top:12px"><span class="lbl">识别结果（请务必检查并修正错别字）</span>' +
      '<textarea id="up-ocr-text" rows="8" placeholder="识别后的文字会显示在这里，可直接编辑"></textarea></label>' +
      '<div class="hint-box" style="margin:0">' + esc(ocrDiag.note || '') + '</div>' +
      '</div>' +

      /* --- 手动填写 --- */
      '<div data-pane="manual" style="display:none">' +
      '<label class="field"><span class="lbl">题干</span>' +
      '<textarea id="up-manual-stem" rows="5" placeholder="题干文字"></textarea></label>' +
      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">我的错误作答</span>' +
      '<input type="text" id="up-manual-mine" placeholder="例：B 或 计算得到 3"></label>' +
      '<label class="field"><span class="lbl">正确答案</span>' +
      '<input type="text" id="up-manual-correct" placeholder="例：A 或 2"></label>' +
      '</div>' +
      '</div>' +

      /* --- 公共字段 --- */
      '<hr style="border:none;border-top:1px solid var(--border);margin:18px 0">' +

      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">科目</span>' +
      '<select id="up-subject">' +
      (presetSubject ? '' : '<option value="">自动识别</option>') +
      KY.SUBJECTS.map(function (s) {
        return '<option value="' + s + '"' + (s === presetSubject ? ' selected' : '') + '>' + KY.subjectName(s) + '</option>';
      }).join('') +
      '</select>' +
      '<span class="hint">不选则用规则引擎自动判定；判定不准时可在这里锁定。</span></label>' +

      '<label class="field"><span class="lbl">我的错误作答</span>' +
      '<input type="text" id="up-mine" placeholder="选填，例：B / AC / 计算结果"></label>' +

      '<label class="field"><span class="lbl">正确答案</span>' +
      '<input type="text" id="up-correct" placeholder="选填，例：A / AC"></label>' +

      '<label class="field"><span class="lbl">为什么错（你自己的话，选填但强烈建议填）</span>' +
      '<input type="text" id="up-note" placeholder="例：公式记错了 / 算到一半符号搞错 / 单词不认识"></label>' +
      '</div>' +

      '<div class="hint-box">' +
      '<b>会自动做什么：</b>系统用本地规则引擎把这道题归类到具体考点，判定错因类型，生成错因总结与改进建议。' +
      '保存前你可以逐项修改——<b>你的修正比自动判定更准，也更影响后续推题。</b>' +
      (KY.ai.isEnabled() ? '<br><b>AI 增强已开启</b>，会在本地结果之上再做一次纠错。' : '') +
      '</div>';

    var footer = '<button class="btn" data-modal-close>取消</button>' +
      '<button class="btn btn-primary" id="do-classify">识别并归类</button>';

    var m = ui.modal({
      title: '上传错题',
      wide: true,
      body: body,
      footer: footer,
      onMount: function (mask, close) {
        var currentText = function () {
          var pane = mask.querySelector('[data-pane]:not([style*="display: none"])');
          // 以当前激活 tab 为准
          var active = mask.querySelector('#upload-tabs button.on').getAttribute('data-tab');
          if (active === 'image') {
            var t = mask.querySelector('#up-ocr-text').value.trim();
            if (t) return t;
          }
          if (active === 'manual') {
            return mask.querySelector('#up-manual-stem').value.trim();
          }
          return mask.querySelector('#up-text').value.trim();
          void pane;
        };

        /* tab 切换 */
        mask.querySelector('#upload-tabs').addEventListener('click', function (e) {
          var b = e.target.closest('button[data-tab]');
          if (!b) return;
          Array.prototype.forEach.call(mask.querySelectorAll('#upload-tabs button'), function (x) {
            x.classList.toggle('on', x === b);
          });
          var tab = b.getAttribute('data-tab');
          Array.prototype.forEach.call(mask.querySelectorAll('[data-pane]'), function (p) {
            p.style.display = p.getAttribute('data-pane') === tab ? '' : 'none';
          });
        });

        /* 手动填写模式：把 stem 同步给通用字段 */
        mask.querySelector('#up-manual-stem').addEventListener('input', function () {
          void this.value;
        });

        /* 图片上传 */
        var dz = mask.querySelector('#dropzone');
        var fi = mask.querySelector('#file-input');
        if (dz && fi) {
          dz.addEventListener('click', function () { fi.click(); });
          dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
          dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
          dz.addEventListener('drop', function (e) {
            e.preventDefault();
            dz.classList.remove('over');
            if (e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          });
          fi.addEventListener('change', function () {
            if (fi.files && fi.files.length) handleFiles(fi.files);
          });
        }

        var ocrResults = [];

        function handleFiles(files) {
          var arr = Array.prototype.slice.call(files);
          ocrResults = [];
          var preview = mask.querySelector('#img-preview');
          var status = mask.querySelector('#ocr-status');
          preview.innerHTML = '';
          arr.forEach(function (f) {
            if (!/^image\//.test(f.type)) return;
            var img = document.createElement('img');
            img.className = 'preview-img';
            img.src = URL.createObjectURL(f);
            preview.appendChild(img);
          });

          status.innerHTML = '准备识别 ' + arr.length + ' 张图片…<div class="bar bar-brand"><span style="width:0%"></span></div>';
          var barEl = status.querySelector('.bar > span');

          var chain = Promise.resolve();
          arr.forEach(function (f, i) {
            chain = chain.then(function () {
              status.innerHTML = '正在识别第 ' + (i + 1) + ' / ' + arr.length + ' 张…' +
                '<div class="bar bar-brand"><span style="width:0%"></span></div>';
              var b2 = status.querySelector('.bar > span');
              return KY.ocr.recognize(f, function (ratio) {
                if (b2) b2.style.width = ((i + ratio) / arr.length * 100).toFixed(0) + '%';
              }).then(function (r) {
                ocrResults.push(r);
                if (r.warning) U.toast(r.warning, 'warn');
              }).catch(function (err) {
                U.toast('识别失败：' + err.message, 'error');
                throw err;
              });
            });
          });

          chain.then(function () {
            if (barEl) barEl.style.width = '100%';
            var text = ocrResults.map(function (r) { return r.text; }).filter(Boolean).join('\n\n');
            mask.querySelector('#up-ocr-text').value = text;
            var confs = ocrResults.map(function (r) { return r.confidence; }).filter(function (c) { return typeof c === 'number'; });
            var avg = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : null;
            status.innerHTML = '✅ 识别完成' + (avg !== null ? '（平均置信度 ' + U.pct(avg) + '）' : '') +
              '。<b>请检查下方文本并修正错别字</b>——OCR 一定会有识别错误，改对了分类才准。';
            if (!text) {
              status.innerHTML += '<div class="hint-box warn" style="margin-top:8px">没有识别出文字。建议截图更清晰、或改用手动输入。</div>';
            }
          }).catch(function () {
            status.innerHTML = '识别中断。你可以手动输入题干。';
          });
        }

        /* 识别并归类 */
        mask.querySelector('#do-classify').addEventListener('click', function () {
          var text = currentText();
          if (!text) {
            U.toast('请先提供题目内容', 'error');
            return;
          }

          var subjSel = mask.querySelector('#up-subject');
          var subject = subjSel ? subjSel.value : '';

          var defaults = {
            subject: subject || undefined,
            myAnswer: (mask.querySelector('#up-mine').value || '').trim() || undefined,
            correctAnswer: (mask.querySelector('#up-correct').value || '').trim() || undefined,
            note: (mask.querySelector('#up-note').value || '').trim() || undefined
          };

          var chunks = KY.classifier.splitQuestions(text).filter(function (c) { return c.trim().length > 3; });
          if (!chunks.length) {
            U.toast('内容太短，无法归类', 'error');
            return;
          }

          var items = chunks.map(function (c) {
            var d = {};
            Object.keys(defaults).forEach(function (k) { if (defaults[k] !== undefined) d[k] = defaults[k]; });
            d.text = c;
            var it = KY.classifier.classify(d);
            // 保留原图（仅第一张，且限制体积）
            if (ocrResults[0] && ocrResults[0].dataUrl && ocrResults[0].dataUrl.length < 200000 && chunks.length === 1) {
              it.imagePath = ocrResults[0].dataUrl;
            }
            it.source = '上传（' + (subject ? KY.subjectName(subject) : '自动识别') + '）';
            return it;
          });

          close();
          openReviewDraft(mount, items);
        });
      }
    });
    void m;
  }

  /* ================================================================== */
  /* 归类确认弹窗（保存前的最后一道人工关卡）                             */
  /* ================================================================== */

  function openReviewDraft(mount, items) {
    var idx = 0;
    var closeFn = null;

    function renderOne(mask) {
      var it = items[idx];
      var et = KY.getErrorType(it.errorType);
      var knNames = (it.knowledge || []).map(function (pid) {
        var n = KY.getTaxNode(pid);
        return n ? n.point.name : pid;
      }).join('、');

      var confPct = Math.round((it.errorConfidence || 0) * 100);
      var confTag = confPct >= 60 ? ui.tag('识别置信度 ' + confPct + '%', 'tag-ok')
        : (confPct >= 30 ? ui.tag('识别置信度 ' + confPct + '%（建议核对）', 'tag-warn')
          : ui.tag('置信度低，请手动指定', 'tag-err'));

      var html = '' +
        '<div class="row" style="margin-bottom:12px">' +
        '<b>第 ' + (idx + 1) + ' / ' + items.length + ' 条</b>' +
        '<span class="spacer"></span>' + confTag +
        '<span class="tag">' + esc(KY.subjectName(it.subject)) + '</span>' +
        '</div>' +

        '<div class="hint-box ok" style="white-space:pre-wrap;font-size:12.5px">' + esc(it.errorSummary) + '</div>' +

        '<label class="field"><span class="lbl">题干（可编辑）</span>' +
        '<textarea id="d-stem" rows="4">' + esc(it.stem) + '</textarea></label>' +

        (it.options && it.options.length
          ? '<div class="field"><span class="lbl">识别到的选项（可编辑，格式：每行 A. 内容）</span>' +
          '<textarea id="d-options" rows="' + Math.min(8, it.options.length + 1) + '">' +
          esc(it.options.map(function (o) { return o.key + '. ' + o.text; }).join('\n')) + '</textarea></div>'
          : '') +

        '<div class="grid grid-2">' +
        '<label class="field"><span class="lbl">我的错误作答</span>' +
        '<input type="text" id="d-mine" value="' + esc(it.myAnswer || '') + '"></label>' +
        '<label class="field"><span class="lbl">正确答案</span>' +
        '<input type="text" id="d-correct" value="' + esc((it.correctAnswer || []).join('')) + '"></label>' +
        '</div>' +

        '<label class="field"><span class="lbl">科目</span>' +
        '<select id="d-subject">' + KY.SUBJECTS.map(function (s) {
          return '<option value="' + s + '"' + (s === it.subject ? ' selected' : '') + '>' + KY.subjectName(s) + '</option>';
        }).join('') + '</select></label>' +

        '<label class="field"><span class="lbl">考点（自动判定的结果 <b>' + esc(knNames || '无') +
        '</b>，请核对）</span>' + pointSelectHtml(it.subject, it.knowledge, 'd-points') + '</label>' +

        '<label class="field"><span class="lbl">错因类型（自动判定：<b>' + esc(et.name) + '</b>）</span>' +
        '<select id="d-errtype">' + KY.ERROR_TYPES.map(function (e) {
          return '<option value="' + e.id + '"' + (e.id === it.errorType ? ' selected' : '') + '>' +
            e.name + ' —— ' + e.desc + '</option>';
        }).join('') + '</select></label>' +

        '<label class="field"><span class="lbl">错因总结与改进建议（可编辑）</span>' +
        '<textarea id="d-summary" rows="8">' + esc(it.errorSummary) + '</textarea></label>' +

        '<label class="field"><span class="lbl">难度</span>' +
        '<select id="d-diff">' + [1, 2, 3, 4, 5].map(function (n) {
          return '<option value="' + n + '"' + (n === it.difficulty ? ' selected' : '') + '>' +
            '★'.repeat(n) + '（' + n + '）</option>';
        }).join('') + '</select></label>';

      mask.querySelector('.modal-body').innerHTML = html;

      /* 科目变化时重建考点选择器（并尽量保留已选） */
      mask.querySelector('#d-subject').addEventListener('change', function () {
        var sub = this.value;
        var prev = readMultiSelect(mask.querySelector('[name="d-points"]'));
        var wrap = mask.querySelector('[name="d-points"]').parentNode;
        var tmp = document.createElement('div');
        tmp.innerHTML = pointSelectHtml(sub, prev, 'd-points');
        wrap.replaceChild(tmp.firstChild, mask.querySelector('[name="d-points"]'));
        // 修正隐藏的 hint 节点
        void wrap;
      });

      /* 底部按钮 */
      var foot = mask.querySelector('.modal-foot');
      foot.innerHTML =
        '<span style="font-size:12.5px;color:var(--text-3);align-self:center;margin-right:auto">' +
        '第 ' + (idx + 1) + ' / ' + items.length + ' 条</span>' +
        (idx > 0 ? '<button class="btn" id="d-prev">上一条</button>' : '') +
        '<button class="btn" id="d-skip">跳过这条</button>' +
        (idx < items.length - 1
          ? '<button class="btn btn-primary" id="d-next">保存并下一条</button>'
          : '<button class="btn btn-primary" id="d-save">保存全部并入库</button>');

      function collect() {
        var stem = mask.querySelector('#d-stem').value.trim();
        var optsEl = mask.querySelector('#d-options');
        var options = [];
        if (optsEl) {
          optsEl.value.split('\n').forEach(function (line) {
            var mm = line.match(/^\s*([A-Ha-h])[.、:：)]\s*(.+)$/);
            if (mm) options.push({ key: mm[1].toUpperCase(), text: mm[2].trim() });
          });
        }
        var subject = mask.querySelector('#d-subject').value;
        var points = readMultiSelect(mask.querySelector('[name="d-points"]'));
        it.stem = stem;
        it.options = options.length ? options : it.options;
        it.myAnswer = mask.querySelector('#d-mine').value.trim();
        it.correctAnswer = U.normalizeKeys(mask.querySelector('#d-correct').value.replace(/[\s,，、\/]/g, '').split(''));
        it.subject = subject;
        it.knowledge = points;
        it.knowledgeConfirmed = true;
        it.errorType = mask.querySelector('#d-errtype').value;
        it.errorSummary = mask.querySelector('#d-summary').value;
        it.difficulty = parseInt(mask.querySelector('#d-diff').value, 10) || 3;
        if (points.length) {
          var n = KY.getTaxNode(points[0]);
          if (n) it.module = n.module.id;
        }
        return it;
      }

      function persist(next) {
        var item = collect();
        if (!item.stem) { U.toast('题干不能为空', 'error'); return false; }
        if (!item.knowledge.length) { U.toast('请至少选择一个考点', 'error'); return false; }
        items[idx] = item;
        if (next) { idx++; renderOne(mask); }
        return true;
      }

      var nextBtn = mask.querySelector('#d-next');
      if (nextBtn) nextBtn.addEventListener('click', function () { persist(true); });

      var saveBtn = mask.querySelector('#d-save');
      if (saveBtn) saveBtn.addEventListener('click', function () {
        if (!persist(false)) return;
        commitAll();
      });

      var prevBtn = mask.querySelector('#d-prev');
      if (prevBtn) prevBtn.addEventListener('click', function () { if (persist(false)) { idx--; renderOne(mask); } });

      mask.querySelector('#d-skip').addEventListener('click', function () {
        items.splice(idx, 1);
        if (!items.length) {
          // 必须走 close()，否则 document.body 的滚动锁不会被释放
          if (closeFn) closeFn(); else mask.remove();
          U.toast('已取消全部保存', 'info');
          return;
        }
        if (idx >= items.length) idx = items.length - 1;
        renderOne(mask);
      });
    }

    function commitAll() {
      var added = KY.store.addWrongItems(items);
      // 上报掌握度惩罚
      added.forEach(function (w) {
        (w.knowledge || []).forEach(function (pid) { KY.store.penalizePoint(pid, 0.10); });
      });
      if (closeFn) closeFn();
      U.toast('已入库 ' + added.length + ' 条错题，并已更新相关考点掌握度', 'success');
      KY.router.refresh();
    }

    ui.modal({
      title: '确认归类结果（建议逐条核对）',
      wide: true,
      body: '<div id="draft-body"></div>',
      footer: '',
      onMount: function (mask, close) {
        closeFn = close;
        renderOne(mask);
      }
    });
  }

  /* ================================================================== */
  /* 错题详情弹窗                                                        */
  /* ================================================================== */

  function openDetail(mount, item) {
    var knNames = (item.knowledge || []).map(function (pid) {
      var n = KY.getTaxNode(pid);
      return n ? n.point.name : pid;
    }).join('、');

    var body = '' +
      '<div class="row" style="margin-bottom:12px">' +
      ui.subTag(item.subject) +
      ui.tag(KY.getErrorType(item.errorType).name) +
      ui.tag('上传于 ' + U.fmtDate(item.createdAt, true)) +
      ui.tag('复习 ' + (item.reviewCount || 0) + ' 次') +
      (item.mastered ? ui.tag('已掌握', 'tag-ok') : ui.tag('待攻克', 'tag-err')) +
      '</div>' +

      (item.imagePath
        ? '<div style="margin-bottom:12px"><img class="preview-img" src="' + item.imagePath + '" alt="错题原图"></div>'
        : '') +

      '<label class="field"><span class="lbl">题干</span>' +
      '<textarea id="x-stem" rows="4">' + esc(item.stem) + '</textarea></label>' +

      (item.options && item.options.length
        ? '<div class="field"><span class="lbl">选项</span><div class="opts">' +
        item.options.map(function (o) {
          var isAns = U.normalizeKeys(item.correctAnswer).indexOf(o.key) >= 0;
          return '<div class="opt disabled' + (isAns ? ' is-answer' : '') + '">' +
            '<span class="key">' + esc(o.key) + '</span><span class="txt">' + esc(o.text) + '</span></div>';
        }).join('') + '</div></div>'
        : '') +

      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">我的错误作答</span>' +
      '<input type="text" id="x-mine" value="' + esc(item.myAnswer || '') + '"></label>' +
      '<label class="field"><span class="lbl">正确答案</span>' +
      '<input type="text" id="x-correct" value="' + esc(U.normalizeKeys(item.correctAnswer).join('')) + '"></label>' +
      '</div>' +

      '<label class="field"><span class="lbl">考点（当前：' + esc(knNames || '无') + '）</span>' +
      pointSelectHtml(item.subject, item.knowledge, 'x-points') + '</label>' +

      '<label class="field"><span class="lbl">错因类型</span>' +
      '<select id="x-errtype">' + KY.ERROR_TYPES.map(function (e) {
        return '<option value="' + e.id + '"' + (e.id === item.errorType ? ' selected' : '') + '>' +
          e.name + ' —— ' + e.desc + '</option>';
      }).join('') + '</select></label>' +

      '<label class="field"><span class="lbl">错因总结与改进建议</span>' +
      '<textarea id="x-summary" rows="9">' + esc(item.errorSummary) + '</textarea></label>' +

      '<div class="row">' +
      '<button class="btn btn-sm" id="x-regen">按当前考点与错因重新生成总结</button>' +
      '<button class="btn btn-sm" id="x-ai"' + (KY.ai.isEnabled() ? '' : ' disabled title="请先在设置中启用 AI 增强"') +
      '>AI 增强分析</button>' +
      '</div>';

    var footer = '<button class="btn btn-danger" id="x-delete">删除</button>' +
      '<span class="spacer" style="flex:1"></span>' +
      '<button class="btn" data-modal-close>关闭</button>' +
      '<button class="btn btn-primary" id="x-save">保存修改</button>';

    ui.modal({
      title: '错题详情',
      wide: true,
      body: body,
      footer: footer,
      onMount: function (mask, close) {
        mask.querySelector('#x-subject-fix');
        mask.querySelector('#x-regen').addEventListener('click', function () {
          var points = readMultiSelect(mask.querySelector('[name="x-points"]'));
          var errType = mask.querySelector('#x-errtype').value;
          var note = '';
          var n = points.length ? KY.getTaxNode(points[0]) : null;
          var summary = KY.classifier.buildSummary({
            subject: item.subject,
            moduleName: n ? n.module.name : '',
            knowledge: points,
            errorType: errType,
            hits: [],
            note: note
          });
          mask.querySelector('#x-summary').value = summary;
          U.toast('已按当前选择重新生成总结', 'success');
        });

        var aiBtn = mask.querySelector('#x-ai');
        if (aiBtn && !aiBtn.disabled) {
          aiBtn.addEventListener('click', function () {
            var points = readMultiSelect(mask.querySelector('[name="x-points"]'));
            var probe = {
              id: item.id,
              subject: item.subject,
              stem: mask.querySelector('#x-stem').value,
              options: item.options,
              myAnswer: mask.querySelector('#x-mine').value,
              correctAnswer: U.normalizeKeys(mask.querySelector('#x-correct').value.split('')),
              note: '',
              knowledge: points,
              errorType: mask.querySelector('#x-errtype').value,
              errorSummary: mask.querySelector('#x-summary').value,
              module: item.module
            };
            aiBtn.disabled = true;
            aiBtn.textContent = '分析中…';
            KY.ai.enhance(probe).then(function (r) {
              mask.querySelector('#x-summary').value = r.errorSummary;
              if (r.knowledge && r.knowledge.length) {
                var wrap = mask.querySelector('[name="x-points"]').parentNode;
                var tmp = document.createElement('div');
                tmp.innerHTML = pointSelectHtml(r.subject, r.knowledge, 'x-points');
                wrap.replaceChild(tmp.firstChild, mask.querySelector('[name="x-points"]'));
              }
              if (r.errorType) mask.querySelector('#x-errtype').value = r.errorType;
              aiBtn.disabled = false;
              aiBtn.textContent = 'AI 增强分析';
              U.toast(r.aiError ? ('AI 失败：' + r.aiError) : 'AI 分析已应用', r.aiError ? 'error' : 'success');
            });
          });
        }

        mask.querySelector('#x-save').addEventListener('click', function () {
          var points = readMultiSelect(mask.querySelector('[name="x-points"]'));
          if (!points.length) { U.toast('请至少选择一个考点', 'error'); return; }
          var n = KY.getTaxNode(points[0]);
          KY.store.updateWrongItem(item.id, {
            stem: mask.querySelector('#x-stem').value.trim(),
            myAnswer: mask.querySelector('#x-mine').value.trim(),
            correctAnswer: U.normalizeKeys(mask.querySelector('#x-correct').value.replace(/[\s,，、\/]/g, '').split('')),
            knowledge: points,
            knowledgeConfirmed: true,
            module: n ? n.module.id : item.module,
            errorType: mask.querySelector('#x-errtype').value,
            errorSummary: mask.querySelector('#x-summary').value
          });
          U.toast('已保存', 'success');
          close();
          KY.router.refresh();
        });

        mask.querySelector('#x-delete').addEventListener('click', function () {
          ui.confirm('确定删除这条错题吗？此操作不可撤销。', { danger: true, okText: '删除' })
            .then(function (ok) {
              if (!ok) return;
              KY.store.removeWrongItem(item.id);
              U.toast('已删除', 'success');
              close();
              KY.router.refresh();
            });
        });
      }
    });
  }

  /* ================================================================== */
  /* 列表页                                                              */
  /* ================================================================== */

  KY.views.wrongbook = function (ctx, mount) {
    ui.setTitle('错题本');

    var q = ctx.query || {};
    if (q.subject) F.subject = q.subject;
    if (q.status) F.status = q.status;

    var all = KY.store.getWrongbook();

    /* 统计 */
    var bySubject = {};
    KY.SUBJECTS.forEach(function (s) { bySubject[s] = { total: 0, active: 0, mastered: 0 }; });
    all.forEach(function (w) {
      if (!bySubject[w.subject]) bySubject[w.subject] = { total: 0, active: 0, mastered: 0 };
      bySubject[w.subject].total++;
      if (w.mastered) bySubject[w.subject].mastered++;
      else bySubject[w.subject].active++;
    });

    /* 筛选 */
    var list = all.filter(function (w) {
      if (F.subject && w.subject !== F.subject) return false;
      if (F.module && w.module !== F.module) return false;
      if (F.errorType && w.errorType !== F.errorType) return false;
      if (F.status === 'active' && w.mastered) return false;
      if (F.status === 'mastered' && !w.mastered) return false;
      if (F.keyword) {
        var hay = U.normalizeText(w.stem + ' ' + (w.errorSummary || '') + ' ' + (w.source || ''));
        if (hay.indexOf(U.normalizeText(F.keyword)) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    /* 科目切换条 */
    var tabsHtml = '<div class="segmented" id="wb-subject-tabs">' +
      '<button class="' + (F.subject === '' ? 'on' : '') + '" data-sub="">全部（' + all.length + '）</button>' +
      KY.SUBJECTS.map(function (s) {
        var c = bySubject[s] || { total: 0, active: 0 };
        return '<button class="' + (F.subject === s ? 'on' : '') + '" data-sub="' + s + '">' +
          KY.subjectName(s) + '（' + c.active + '）</button>';
      }).join('') + '</div>';

    /* 模块下拉 */
    var moduleOptions = '<option value="">全部板块</option>';
    var modules = F.subject ? KY.getModules(F.subject) : [];
    modules.forEach(function (m) {
      var cnt = all.filter(function (w) { return w.module === m.id; }).length;
      if (!cnt) return;
      moduleOptions += '<option value="' + esc(m.id) + '"' + (F.module === m.id ? ' selected' : '') + '>' +
        esc(m.name) + '（' + cnt + '）</option>';
    });

    /* 列表渲染 */
    var listHtml = list.length ? list.map(function (w) {
      var n = KY.getTaxNode((w.knowledge || [])[0]);
      return '' +
        '<div class="item" data-wid="' + esc(w.id) + '">' +
        '<div class="item-head">' +
        ui.subTag(w.subject) +
        ui.tag(KY.getErrorType(w.errorType).name) +
        (n ? ui.tag(n.moduleName) : '') +
        (w.mastered ? ui.tag('已掌握', 'tag-ok') : '') +
        '<span class="spacer"></span>' +
        '<span>' + U.fmtRelative(w.createdAt) + '</span>' +
        '</div>' +
        '<div class="item-stem">' + esc(w.stem) + '</div>' +
        '<div style="margin-bottom:9px">' + ui.knowledgeChips(w.knowledge) + '</div>' +
        '<div class="item-foot">' +
        '<button class="btn btn-sm btn-primary" data-w-act="review" data-wid="' + esc(w.id) + '">复习这个考点</button>' +
        '<button class="btn btn-sm" data-w-act="detail" data-wid="' + esc(w.id) + '">查看 / 修正归类</button>' +
        (w.mastered
          ? '<button class="btn btn-sm" data-w-act="unmaster" data-wid="' + esc(w.id) + '">标记为待攻克</button>'
          : '<button class="btn btn-sm" data-w-act="master" data-wid="' + esc(w.id) + '">标记已掌握</button>') +
        '<span class="spacer"></span>' +
        '<button class="btn btn-sm btn-danger" data-w-act="delete" data-wid="' + esc(w.id) + '">删除</button>' +
        '</div></div>';
    }).join('') : ui.empty(
      all.length ? '当前筛选条件下没有错题' : '错题本还是空的',
      all.length
        ? '试试切换科目或把筛选条件放宽。'
        : '把做错的题拍照或粘贴进来，系统会自动识别考点、判定错因，并推送同考点的题给你练。',
      '<button class="btn btn-primary btn-lg" id="empty-upload">上传第一道错题</button>'
    );

    /* 错因分布 */
    var errCounts = {};
    all.filter(function (w) { return !w.mastered; }).forEach(function (w) {
      errCounts[w.errorType] = (errCounts[w.errorType] || 0) + 1;
    });
    var errRows = KY.ERROR_TYPES.map(function (e) {
      var c = errCounts[e.id] || 0;
      return c ? '<div class="mastery-row"><span class="nm">' + esc(e.name) +
        ' <span style="color:var(--text-3);font-size:11.5px">' + esc(e.desc) + '</span></span>' +
        '<span>' + ui.masteryBar(c / Math.max(1, all.length)) + '</span>' +
        '<span class="sc">' + c + ' 条</span></div>' : '';
    }).join('');

    var unsettled = all.filter(function (w) { return !w.knowledgeConfirmed; }).length;

    mount.innerHTML = '' +
      (unsettled ? '<div class="hint-box warn"><b>' + unsettled + ' 条错题还没人工确认归类。</b>' +
        '自动识别的考点可能不准，确认后推题才精准。<button class="btn btn-sm" id="confirm-all" style="margin-left:8px">逐条确认</button></div>' : '') +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">错题本</h3>' +
      '<p class="card-sub" style="margin:0">共 ' + all.length + ' 条 · 待攻克 ' +
      all.filter(function (w) { return !w.mastered; }).length + ' 条 · 已掌握 ' +
      all.filter(function (w) { return w.mastered; }).length + ' 条</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row">' +
      '<button class="btn btn-primary" id="btn-upload">上传错题</button>' +
      '<button class="btn" id="btn-export">导出备份</button>' +
      '<button class="btn" id="btn-import">导入备份</button>' +
      '</div></div>' +

      '<div class="row" style="margin-bottom:12px">' + tabsHtml + '</div>' +

      '<div class="filters">' +
      '<select id="f-module">' + moduleOptions + '</select>' +
      '<select id="f-errtype"><option value="">全部错因</option>' +
      KY.ERROR_TYPES.map(function (e) {
        return '<option value="' + e.id + '"' + (F.errorType === e.id ? ' selected' : '') + '>' + e.name + '</option>';
      }).join('') + '</select>' +
      '<select id="f-status">' +
      ['active|待攻克', 'mastered|已掌握', '|全部'].map(function (x) {
        var p = x.split('|');
        return '<option value="' + p[0] + '"' + (F.status === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join('') + '</select>' +
      '<input type="search" id="f-kw" placeholder="搜索题干/错因…" value="' + esc(F.keyword) + '">' +
      '<button class="btn btn-sm" id="f-reset">重置</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-primary" id="review-all">按全部错题考点推题</button>' +
      '</div>' +

      (errRows ? '<div style="margin-top:8px"><div style="font-size:12.5px;color:var(--text-3);margin-bottom:6px">待攻克错题的错因分布</div>' + errRows + '</div>' : '') +
      '</div>' +

      '<div id="wb-list">' + listHtml + '</div>';

    /* ================= 事件 ================= */

    function rerender() { KY.router.refresh(); }

    mount.querySelector('#btn-upload').addEventListener('click', function () { openUpload(mount, F.subject); });
    var eu = mount.querySelector('#empty-upload');
    if (eu) eu.addEventListener('click', function () { openUpload(mount, F.subject); });

    mount.querySelector('#wb-subject-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sub]');
      if (!b) return;
      F.subject = b.getAttribute('data-sub');
      F.module = '';
      rerender();
    });

    mount.querySelector('#f-module').addEventListener('change', function () { F.module = this.value; rerender(); });
    mount.querySelector('#f-errtype').addEventListener('change', function () { F.errorType = this.value; rerender(); });
    mount.querySelector('#f-status').addEventListener('change', function () { F.status = this.value; rerender(); });
    mount.querySelector('#f-kw').addEventListener('input', U.debounce(function () {
      F.keyword = this.value;
      rerender();
    }, 400));
    mount.querySelector('#f-reset').addEventListener('click', function () {
      F = { subject: '', module: '', errorType: '', status: 'active', keyword: '' };
      rerender();
    });

    /* 列表操作 */
    mount.querySelector('#wb-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-w-act]');
      if (!b) return;
      var act = b.getAttribute('data-w-act');
      var id = b.getAttribute('data-wid');
      var item = KY.store.getWrongbook().filter(function (w) { return w.id === id; })[0];
      if (!item) return;

      if (act === 'detail') { openDetail(mount, item); return; }

      if (act === 'review') {
        var pts = (item.knowledge || []).join(',');
        KY.router.go('review', { query: { mode: 'wrong', points: pts, subject: item.subject } });
        return;
      }

      if (act === 'master') {
        KY.store.updateWrongItem(id, { mastered: true });
        (item.knowledge || []).forEach(function (pid) { KY.store.recordPointResult(pid, true, 0.8); });
        U.toast('已标记为掌握，掌握度已上调', 'success');
        rerender();
        return;
      }

      if (act === 'unmaster') {
        KY.store.updateWrongItem(id, { mastered: false, correctStreak: 0 });
        rerender();
        return;
      }

      if (act === 'delete') {
        ui.confirm('确定删除这条错题吗？', { danger: true, okText: '删除' }).then(function (ok) {
          if (!ok) return;
          KY.store.removeWrongItem(id);
          U.toast('已删除', 'success');
          rerender();
        });
      }
    });

    /* 逐条确认未确认的归类 */
    var ca = mount.querySelector('#confirm-all');
    if (ca) {
      ca.addEventListener('click', function () {
        var pending = KY.store.getWrongbook().filter(function (w) { return !w.knowledgeConfirmed; });
        if (!pending.length) { U.toast('没有待确认的错题', 'info'); return; }
        openReviewDraft(mount, pending);
      });
    }

    /* 按全部错题考点推题 */
    mount.querySelector('#review-all').addEventListener('click', function () {
      var pts = {};
      all.filter(function (w) { return !w.mastered; }).forEach(function (w) {
        (w.knowledge || []).forEach(function (p) { pts[p] = 1; });
      });
      var arr = Object.keys(pts);
      if (!arr.length) { U.toast('错题本里还没有可用的考点信息', 'error'); return; }
      KY.router.go('review', {
        query: {
          mode: 'wrong',
          points: arr.slice(0, 30).join(','),
          subject: F.subject || ''
        }
      });
    });

    /* 导入导出 */
    mount.querySelector('#btn-export').addEventListener('click', function () {
      var payload = {
        type: 'kaoyan-wrongbook',
        version: 1,
        exportedAt: new Date().toISOString(),
        wrongbook: KY.store.getWrongbook(),
        mastery: KY.store.getMastery()
      };
      U.downloadText('错题本备份-' + U.fmtDate(Date.now()) + '.json', JSON.stringify(payload, null, 2));
      U.toast('已导出备份文件', 'success');
    });

    mount.querySelector('#btn-import').addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', function () {
        var f = input.files[0];
        if (!f) return;
        U.readFileAsText(f).then(function (text) {
          var data;
          try { data = JSON.parse(text); }
          catch (err) { U.toast('备份文件不是合法 JSON', 'error'); return; }
          if (!data || !Array.isArray(data.wrongbook)) { U.toast('不是有效的错题本备份文件', 'error'); return; }
          return ui.confirm('将导入 ' + data.wrongbook.length + ' 条错题（同 id 的会跳过）。确定吗？', { okText: '导入' })
            .then(function (ok) {
              if (!ok) return;
              var added = KY.store.addWrongItems(data.wrongbook);
              if (data.mastery && typeof data.mastery === 'object') {
                var cur = KY.store.getMastery();
                Object.keys(data.mastery).forEach(function (k) {
                  var a = cur[k], b = data.mastery[k];
                  if (!a) { cur[k] = b; return; }
                  if ((b.attempts || 0) > (a.attempts || 0)) cur[k] = b;
                });
                KY.store.setMastery(cur);
              }
              U.toast('已导入 ' + added.length + ' 条错题', 'success');
              KY.router.refresh();
            });
        }).catch(function (err) {
          U.toast('读取文件失败：' + err.message, 'error');
        });
      });
      input.click();
    });

    /* URL 里带 action=upload 时自动打开上传 */
    if (q.action === 'upload') {
      var url = location.hash;
      history.replaceState(null, '', location.pathname + location.search + '#/wrongbook' +
        (F.subject ? '?subject=' + F.subject : ''));
      void url;
      openUpload(mount, F.subject);
    }
  };
})(window);
