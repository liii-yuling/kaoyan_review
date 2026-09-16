/*!
 * views/import.js —— 题库导入
 * 路由： #/import
 *
 * 使用者自带题库的入口，支持 CSV / JSON / 直接粘贴。
 * 流程：选文件或粘贴 → 解析预览（逐行给结论）→ 确认导入 → 合并进题库。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var DRAFT = null;   // 最近一次 preview 的结果

  /** 真题原文格式示例（「看格式示例」按钮用） */
  var DEMO_PAPER = [
    '一、单项选择题',
    '',
    '1. 当 x→0 时，下列无穷小中阶数最高的是（  ）',
    'A. x^2',
    'B. sin x',
    'C. 1-cos x',
    'D. x^3',
    '答案：D',
    '解析：x^3 是三阶无穷小；x^2 是二阶；sin x ~ x 是一阶；1-cos x ~ x^2/2 是二阶。',
    '',
    '2、设 A 为 3 阶矩阵，|A| = 2，则 |2A| =（  ）',
    'A. 4',
    'B. 8',
    'C. 16',
    'D. 2',
    '【答案】C',
    '【解析】|kA| = k^n|A| = 2^3 × 2 = 16。',
    '',
    '三、解答题',
    '',
    '3. 计算定积分 ∫₀¹ x² dx，并说明所用公式。',
    '答案：1/3',
    '解析：∫₀¹ x² dx = [x³/3]₀¹ = 1/3，用的是牛顿-莱布尼茨公式。'
  ].join('\n');

  /* ================================================================== */
  /* 共享题库导出（模块级，预览区与顶部按钮共用）                        */
  /* ================================================================== */

  /**
   * 生成 bank.shared.js 并引导用户走完发布流程。
   * @param {Array} list 题目数组
   * @param {String} source 来源标记，写进文件头便于排查
   * @param {Boolean} merge true = 并入已发布的共享题库（逐年录题必须开，否则会互相覆盖）
   */
  function exportSharedFile(list, source, merge) {
    if (!list || !list.length) {
      U.toast('没有可导出的题目。先在本页上传题库，或先导入到个人题库', 'error');
      return;
    }

    var finalList = list;
    var mergedFrom = 0;
    if (merge) {
      var existing = KY.importer.sanitizeForExport(KY.importer.getSharedBank());
      var byId = Object.create(null);
      existing.forEach(function (q) { byId[q.id] = q; });
      mergedFrom = existing.length;
      // 新录入的同 id 覆盖旧的（方便改错后重发）
      list.forEach(function (q) { byId[q.id] = q; });
      finalList = Object.keys(byId).map(function (k) { return byId[k]; });
    }

    var js = KY.importer.buildSharedBankJs(finalList, { source: source });
    U.downloadText('bank.shared.js', js, 'text/javascript');

    ui.alertBox(
      '已生成共享题库文件。\n\n' +
      (merge
        ? ('· 本次新录入：' + list.length + ' 题\n' +
          '· 并入已有：' + mergedFrom + ' 题\n' +
          '· 合计：' + finalList.length + ' 题（同 id 的以本次为准）\n\n')
        : ('· 共 ' + finalList.length + ' 题（未并入已有内容，会覆盖掉之前的）\n\n')) +
      '接下来三步：\n' +
      '1. 用这个文件覆盖项目的 src/data/bank.shared.js\n' +
      '   （更省事的办法：点「导出 JSON 到项目根目录」，' +
      '把 共享题库.json 放到项目根目录，发布脚本会自动读它）\n' +
      '2. 双击项目根目录的「发布.cmd」\n' +
      '3. 双击「推送.cmd」\n\n' +
      '完成后，她刷新页面 → 顶部出现「有新版本」→ 点刷新，新题库就到手了。\n' +
      '她的错题和掌握度不会丢。',
      { title: '共享题库文件已生成' }
    );
  }

  /** 合并后的完整共享题库（给 JSON 导出用） */
  function mergedSharedList(list, merge) {
    if (!merge) return list;
    var existing = KY.importer.sanitizeForExport(KY.importer.getSharedBank());
    var byId = Object.create(null);
    existing.forEach(function (q) { byId[q.id] = q; });
    list.forEach(function (q) { byId[q.id] = q; });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  /* ================================================================== */
  /* 渲染                                                                */
  /* ================================================================== */

  KY.views.import = function (ctx, mount) {
    var q = ctx.query || {};
    ui.setTitle('题库导入');

    var userBank = KY.importer.getUserBank();
    var userBySubject = userBank.reduce(function (a, x) {
      a[x.subject] = (a[x.subject] || 0) + 1; return a;
    }, {});

    var sharedBank = KY.importer.getSharedBank();
    var sharedMeta = KY.importer.getSharedBankMeta();
    var sharedBySubject = sharedBank.reduce(function (a, x) {
      a[x.subject] = (a[x.subject] || 0) + 1; return a;
    }, {});
    var bankStats2 = KY.bank.stats();
    var sharedEffective = bankStats2.sharedCount || 0;
    var sharedConflicts = KY.bank.sharedConflictIds();

    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>题库导入</h2>' +
      '<p>把你手头已有的题库灌进来。支持 <b>CSV</b>、<b>JSON</b> 和<b>直接粘贴</b>；' +
      '考点列可以留空，系统会用归类引擎自动判定，你再核对一遍即可。</p>' +
      '<div class="slogans">' +
      '<span>📄 Excel 另存为 CSV 就能导</span>' +
      '<span>🎯 考点留空会自动归类</span>' +
      '<span>🌐 可发布为共享题库给别人</span>' +
      '</div>' +
      '</div>' +

      /* ---- 共享题库（发布给对方的那一份）---- */
      '<div class="card" style="border-color:#cddaff;background:#fafbff">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">🌐 共享题库 —— 发布给所有使用者</h3>' +
      '<p class="card-sub" style="margin:0">' +
      (sharedBank.length
        ? ('当前已发布 <b>' + sharedEffective + '</b> 题生效' +
          (sharedBank.length !== sharedEffective
            ? '（文件里共 ' + sharedBank.length + ' 题，有 ' + (sharedBank.length - sharedEffective) + ' 题未生效）'
            : '') +
          '（' + Object.keys(sharedBySubject).map(function (k) {
            return KY.subjectName(k) + ' ' + sharedBySubject[k];
          }).join(' · ') + '）' +
          (sharedMeta.builtAt ? ' · 生成于 ' + esc(sharedMeta.builtAt) : ''))
        : '当前共享题库是空的 —— 也就是说，<b>对方现在看不到你传的任何题</b>') +
      '</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<label class="checkbox" style="margin-right:10px" title="逐年录真题时必须勾上，否则这次的题会覆盖掉之前发布的">' +
      '<input type="checkbox" id="merge-shared" checked>并入已发布的共享题库</label>' +
      '<button class="btn btn-sm btn-primary" id="export-shared">用我已导入的题生成共享题库文件</button>' +
      '<button class="btn btn-sm" id="export-shared-json">导出 JSON 到项目根目录</button>' +
      '</div>' +
      '</div>' +

      '<div class="hint-box" style="margin-bottom:12px">' +
      '<b>为什么要有这一步：</b>你在本页导入的题，默认只存在<b>你自己浏览器</b>里，对方拿不到。' +
      '要让对方也看到，题库必须变成<b>网站文件的一部分</b>，跟着代码一起发布。所以这里分两层：' +
      '<br>· <b>共享题库</b>（本卡片）：跟着网站发布，所有使用者刷新即可获得；' +
      '<br>· <b>个人题库</b>（下面那个「导入这 N 题」按钮）：只存你自己浏览器，用于自己临时加题。' +
      '<br>合并优先级：<b>内置题 &gt; 共享题 &gt; 个人题</b>——用共享题库覆盖同 id 的题，就能更新对方手里的旧版本。' +
      '</div>' +

      (sharedConflicts.length
        ? '<div class="hint-box err"><b>⚠ 有 ' + sharedConflicts.length +
        ' 道共享题没有生效：它们的 id 和内置题库里的题重复了。</b>' +
        '系统优先保留内置题，所以这些题被忽略了——你以为发出去了，其实对方看不到。' +
        '<br>请给它们换一个不重复的 id（例如加 <code>my-</code> 前缀）后重新导出发布。' +
        '<br>冲突的 id：<code>' + esc(sharedConflicts.slice(0, 8).join('、')) +
        (sharedConflicts.length > 8 ? ' …等 ' + sharedConflicts.length + ' 个' : '') + '</code>' +
        '</div>'
        : '') +

      '<div class="grid grid-2" style="gap:12px">' +
      '<div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:12px 14px">' +
      '<b style="font-size:13.5px">发布流程（三步）</b>' +
      '<ol style="font-size:13px;line-height:1.95;color:var(--text-2);padding-left:20px;margin:8px 0 0">' +
      '<li>在本页上传题库并「解析并预览」，确认无误；</li>' +
      '<li>点预览结果里的「<b>导出为共享题库文件</b>」，得到 <code>bank.shared.js</code>；</li>' +
      '<li>用它覆盖项目的 <code>src/data/bank.shared.js</code> → 双击 <code>发布.cmd</code> → ' +
      '把 <code>dist</code> 里的内容重新上传。</li>' +
      '</ol>' +
      '<div style="font-size:12.5px;color:var(--text-3);margin-top:8px">' +
      '对方刷新页面 → 顶部出现「有新版本」→ 点刷新，新题库就到手了。' +
      '</div>' +
      '</div>' +
      '<div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:12px 14px">' +
      '<b style="font-size:13.5px">懒人做法（不用碰 src 目录）</b>' +
      '<ol style="font-size:13px;line-height:1.95;color:var(--text-2);padding-left:20px;margin:8px 0 0">' +
      '<li>点上面的「<b>导出 JSON 到项目根目录</b>」，得到 <code>共享题库.json</code>；</li>' +
      '<li>把它放到项目根目录（和 <code>发布.cmd</code> 同一层）；</li>' +
      '<li>双击 <code>发布.cmd</code> —— 发布脚本会自动读它并生成共享题库。</li>' +
      '</ol>' +
      '<div style="font-size:12.5px;color:var(--text-3);margin-top:8px">' +
      '注意：<code>共享题库.json</code> 是<b>整体替换</b>共享题库内容。要往共享题库里<b>追加</b>题目，' +
      '请先把旧 JSON 在导入页重新上传，和新题一起导出。' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      /* ---- 导入区 ---- */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">第一步：提供题库内容</h3>' +
      '<p class="card-sub" style="margin:0">两种录入方式，随便选一种</p></div></div>' +

      '<div class="segmented" id="imp-mode" style="margin-bottom:16px">' +
      '<button class="on" data-pmode="table">📄 表格 / JSON 文件</button>' +
      '<button data-pmode="paper">📝 真题原文（整卷粘贴）</button>' +
      '</div>' +

      /* ---- 真题原文 ---- */
      '<div data-ppane="paper" style="display:none">' +
      '<div class="hint-box">把真题原文<b>整卷粘进来</b>。系统会自动识别：' +
      '题号（<code>1.</code> <code>1、</code> <code>（1）</code>）、选项（<code>A.</code>）、' +
      '答案（<code>答案：B</code> / <code>【答案】B</code>）、解析（<code>解析：…</code>）、' +
      '分节标题（<code>一、单项选择题</code>），以及 <code>【文章】…【题目】</code> 阅读材料块。<br>' +
      '答案也可以单独贴在下面的「答案区」，支持 <code>1-5 ABCDB 6-10 ACBDA</code> 这种区间写法。' +
      '</div>' +

      '<div class="grid grid-3">' +
      '<label class="field"><span class="lbl">科目 <b style="color:var(--err)">*</b></span>' +
      '<select id="pp-subject"><option value="">请选择…</option>' +
      KY.SUBJECTS.map(function (s) {
        return '<option value="' + s + '">' + KY.subjectName(s) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span class="lbl">年份</span>' +
      '<input type="text" id="pp-year" placeholder="例如 2020"></label>' +
      '<label class="field"><span class="lbl">默认板块（可选）</span>' +
      '<select id="pp-module"><option value="">按考点自动判断</option></select></label>' +
      '</div>' +

      '<label class="field"><span class="lbl">来源</span>' +
      '<input type="text" id="pp-source" placeholder="例如 2020 年考研数学一真题"></label>' +

      '<label class="field"><span class="lbl">真题原文 <b style="color:var(--err)">*</b></span>' +
      '<div class="dropzone" id="pp-drop" style="margin-bottom:10px">' +
      '<div class="big">📄</div>' +
      '<div>把 <b>PDF 真题</b> 拖到这里（可多个），或点这里选择文件</div>' +
      '<div class="hint">文字版 PDF 直接提取文字；扫描件会自动逐页 OCR（较慢）</div>' +
      '</div>' +
      '<input type="file" id="pp-file" accept=".pdf,application/pdf" multiple style="display:none">' +
      '<div id="pp-pdf-status"></div>' +
      '<textarea id="pp-text" rows="14" style="font-family:ui-monospace,monospace;font-size:13px" ' +
      'placeholder="一、单项选择题&#10;1. 当 x→0 时，下列无穷小中阶数最高的是（  ）&#10;A. x^2&#10;B. sin x&#10;C. 1-cos x&#10;D. x^3&#10;答案：D&#10;解析：x^3 是三阶无穷小。"></textarea>' +
      '<span class="hint">可以直接粘，也可以拖 PDF。' +
      '<b>PDF 提取一定会丢格式、出错别字，务必在下面的预览里逐题核对。</b></span></label>' +

      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">答案区（可选）</span>' +
      '<div class="dropzone" id="pp-ansdrop" style="margin-bottom:8px;padding:12px">' +
      '<div>📄 把 <b>答案 PDF</b> 拖到这里</div>' +
      '<div class="hint">题目和答案是两份文件时用这个。会自动认出「1-5 ABCDB」「11.A」这类答案并填进下面的框</div>' +
      '</div>' +
      '<input type="file" id="pp-ansfile" accept=".pdf,application/pdf" multiple style="display:none">' +
      '<div id="pp-ans-status"></div>' +
      '<textarea id="pp-answers" rows="5" style="font-family:ui-monospace,monospace;font-size:13px" ' +
      'placeholder="1-5 ABCDB&#10;6-10 ACBDA&#10;11.A 12.B"></textarea>' +
      '<span class="hint">答案统一印在末尾时用这个，正文里就不用写答案了。' +
      '拖了答案 PDF 后再点「解析并预览」，会告诉你哪几题没配上答案。</span></label>' +
      '<label class="field"><span class="lbl">阅读材料（可选，英语阅读用）</span>' +
      '<textarea id="pp-passage" rows="5" ' +
      'placeholder="整段文章粘这里，会附加给这一批所有题目"></textarea>' +
      '<span class="hint">如果文章和题目是分开的 PDF，用这个字段最省事。</span></label>' +
      '</div>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="pp-parse">解析并预览</button>' +
      '<button class="btn btn-sm btn-ghost" id="pp-demo">看格式示例</button>' +
      '<button class="btn btn-sm btn-ghost" id="pp-clear">清空</button>' +
      '</div>' +
      '</div>' +

      /* ---- 表格 / JSON ---- */
      '<div data-ppane="table">' +
      '<div class="row" style="margin-bottom:12px">' +
      '<button class="btn btn-sm" id="dl-tpl">下载 CSV 模板</button>' +
      '<button class="btn btn-sm" id="show-tpl">模板长什么样</button>' +
      '</div>' +

      '<div class="dropzone" id="dropzone">' +
      '<div class="big">📥</div>' +
      '<div>点击选择文件，或把 <b>.csv / .json</b> 文件拖到这里</div>' +
      '<div class="hint">CSV 请用 UTF-8 编码（Excel 另存为「CSV UTF-8」）；也支持直接粘贴下面的文本框</div>' +
      '</div>' +
      '<input type="file" id="file-input" accept=".csv,.json,.txt,text/csv,application/json" style="display:none">' +

      '<label class="field" style="margin-top:14px"><span class="lbl">或者直接粘贴（CSV 文本 / JSON 文本）</span>' +
      '<textarea id="paste-area" rows="8" placeholder="科目,题型,题干,选项A,选项B,选项C,选项D,答案,解析,考点&#10;数学一,单选,当 x→0 时……,x^2,sin x,1-cos x,x^3,D,x^3 是三阶无穷小,无穷小阶的比较"></textarea></label>' +

      '<div class="row">' +
      '<button class="btn btn-primary" id="btn-parse">解析并预览</button>' +
      '<button class="btn" id="btn-clear-input">清空</button>' +
      '</div>' +
      '</div>' +

      '<div id="parse-msg" style="margin-top:12px"></div>' +
      '</div>' +

      /* ---- 用户题库管理 ---- */
      '<div>' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">我导入的题库</h3>' +
      '<p class="card-sub" style="margin:0">' + (userBank.length
        ? ('共 ' + userBank.length + ' 题，已合并进题库，会参与推题与考试')
        : '还没有导入过题目') + '</p></div></div>' +

      (userBank.length
        ? '<div class="grid grid-4" style="margin-bottom:12px">' +
        KY.SUBJECTS.map(function (s) {
          return ui.stat(userBySubject[s] || 0, KY.subjectName(s));
        }).join('') + '</div>'
        : '') +

      '<div class="row">' +
      '<button class="btn btn-sm" id="export-user"' + (userBank.length ? '' : ' disabled') + '>导出我导入的题库（CSV）</button>' +
      '<button class="btn btn-sm btn-danger" id="clear-user"' + (userBank.length ? '' : ' disabled') + '>清空我导入的题库</button>' +
      '</div>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">' +
      '导出的 CSV 可以直接在 Excel 里改，改完再导回来（同 id 的题目会被覆盖更新）。' +
      '所以「导出 → 编辑 → 导回」也是一个可用的批量改题流程。' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">格式速查</h3>' +
      '<div class="tpl-scroll"><table class="tbl tpl-table">' +
      '<thead><tr><th>列名</th><th>必填</th><th>说明</th></tr></thead><tbody>' +
      [
        ['科目', '是', '英语一 / 数学一 / 信号与系统 / 政治（也认 english1、math1 等代码）'],
        ['题型', '是', '单选 / 多选 / 填空 / 判断 / 主观题（完形填空也认）'],
        ['题干', '是', '题目正文，整段文字放一个单元格'],
        ['选项A~D', '选择题必填', '每个选项一个单元格，最多到 H'],
        ['答案', '是', '选择题写 A 或 AC；填空多空用 <code>|</code> 分隔；主观题写参考答案要点'],
        ['解析', '强烈建议', '学生点「查看答案与详解」时看到的就是它'],
        ['考点', '可留空', '写考点中文名或考点 id，多个用 <code>|</code> 分隔；<b>留空会自动归类</b>'],
        ['板块', '可留空', '写板块名或模块 id；留空时按考点推断'],
        ['难度', '可留空', '1~5 或 ★ 个数，默认 3'],
        ['来源 / 年份', '可留空', '真题请写清年份与出处，会显示「真题」标记'],
        ['评分要点', '主观题用', '格式：<code>要点:分值|要点:分值</code>，不写分值则按总分平摊'],
        ['分值', '可留空', '默认单选 1、多选 2、主观题 10'],
        ['B站关键词', '可留空', '「去B站看」用的搜索关键词，留空会自动生成'],
        ['B站视频', '可留空', '粘贴 BV 号（多个用 <code>|</code> 分隔），导入时自动完成绑定']
      ].map(function (r) {
        return '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div id="preview-host"></div>';

    /* ================= 事件 ================= */

    var dz = mount.querySelector('#dropzone');
    var fi = mount.querySelector('#file-input');

    if (dz && fi) {
      dz.addEventListener('click', function () { fi.click(); });
      dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
      dz.addEventListener('drop', function (e) {
        e.preventDefault();
        dz.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });
      fi.addEventListener('change', function () {
        if (fi.files && fi.files.length) handleFile(fi.files[0]);
      });
    }

    /* --- 录入模式切换 --- */
    var impMode = mount.querySelector('#imp-mode');
    impMode.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-pmode]');
      if (!b) return;
      var mode = b.getAttribute('data-pmode');
      Array.prototype.forEach.call(impMode.querySelectorAll('button'), function (x) {
        x.classList.toggle('on', x === b);
      });
      Array.prototype.forEach.call(mount.querySelectorAll('[data-ppane]'), function (p) {
        p.style.display = p.getAttribute('data-ppane') === mode ? '' : 'none';
      });
      mount.querySelector('#parse-msg').innerHTML = '';
    });

    /* --- 真题原文：科目变了就重建板块下拉 --- */
    function refreshModuleOptions() {
      var sub = mount.querySelector('#pp-subject').value;
      var sel = mount.querySelector('#pp-module');
      var html = '<option value="">按考点自动判断</option>';
      if (sub) {
        KY.getModules(sub).forEach(function (m) {
          html += '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>';
        });
      }
      sel.innerHTML = html;
    }
    mount.querySelector('#pp-subject').addEventListener('change', refreshModuleOptions);
    refreshModuleOptions();

    mount.querySelector('#pp-parse').addEventListener('click', function () { runPaperPreview(mount); });

    /* --- 拖 PDF：提取文字 → 自动解析 --- */
    var ppDrop = mount.querySelector('#pp-drop');
    var ppFile = mount.querySelector('#pp-file');

    function pdfStatus(html) {
      var el = mount.querySelector('#pp-pdf-status');
      if (el) el.innerHTML = html;
    }

    function handlePdfs(files) {
      var arr = Array.prototype.slice.call(files).filter(function (f) {
        return /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
      });
      if (!arr.length) { U.toast('请选择 PDF 文件', 'error'); return; }

      var allText = [];
      var summary = { pages: 0, chars: 0, ocr: 0, empty: 0, errors: [], names: [] };
      var i = 0;

      pdfStatus('<div class="hint-box">正在提取 ' + arr.length + ' 个 PDF…</div>');

      function next() {
        if (i >= arr.length) {
          mount.querySelector('#pp-text').value = allText.join('\n\n');
          pdfStatus('<div class="hint-box ' + (summary.chars ? 'warn' : 'err') + '">' +
            '<b>提取完成</b>：' + summary.names.length + ' 个文件 / ' + summary.pages + ' 页，共 ' +
            summary.chars + ' 字' +
            (summary.ocr ? '，其中 ' + summary.ocr + ' 页是 OCR 识别的' : '') +
            (summary.empty ? '，<b>' + summary.empty + ' 页没提取到文字</b>' : '') +
            (summary.errors.length ? '<br>出错：' + summary.errors.join('；') : '') +
            '<br><b>PDF 提取一定会丢格式、出错别字，请务必在下面逐题核对再入库。</b>' +
            '</div>');
          if (summary.chars) runPaperPreview(mount);
          else U.toast('PDF 里没有提取到文字，可能是扫描件且 OCR 失败', 'error');
          return;
        }

        var f = arr[i];
        summary.names.push(f.name);
        KY.pdf.extract(f, {
          ocr: true,
          onProgress: function (pageNo, total, phase) {
            pdfStatus('<div class="hint-box">正在处理 <b>' + esc(f.name) + '</b>（' +
              (i + 1) + '/' + arr.length + '）第 ' + pageNo + '/' + total + ' 页' +
              (phase === 'ocr' ? ' · OCR 识别中…' : ' · 提取文字') + '</div>');
          }
        }).then(function (r) {
          allText.push(r.text);
          summary.pages += r.stats.pages;
          summary.chars += r.stats.chars;
          summary.ocr += r.stats.ocrCount;
          summary.empty += (r.stats.emptyPages || []).length;
          (r.stats.errorPages || []).forEach(function (x) { summary.errors.push(esc(x)); });
          i++;
          next();
        }).catch(function (e) {
          summary.errors.push(esc(f.name) + '：' + esc(e.message));
          i++;
          next();
        });
      }

      next();
    }

    if (ppDrop && ppFile) {
      ppDrop.addEventListener('click', function () { ppFile.click(); });
      ppDrop.addEventListener('dragover', function (e) { e.preventDefault(); ppDrop.classList.add('over'); });
      ppDrop.addEventListener('dragleave', function () { ppDrop.classList.remove('over'); });
      ppDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        ppDrop.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) handlePdfs(e.dataTransfer.files);
      });
      ppFile.addEventListener('change', function () {
        if (ppFile.files && ppFile.files.length) handlePdfs(ppFile.files);
      });

      var diag = KY.pdf.diagnose();
      if (!diag.online) {
        pdfStatus('<div class="hint-box warn">当前显示离线，PDF 解析引擎需要联网首次加载，' +
          '可能无法使用。也可以直接把 PDF 里的文字复制粘贴到下面的框里。</div>');
      }
    }

    /* --- 拖答案 PDF：提取文字 → 抽答案 → 填进答案框 --- */
    var ppAnsDrop = mount.querySelector('#pp-ansdrop');
    var ppAnsFile = mount.querySelector('#pp-ansfile');

    function ansStatus(html) {
      var el = mount.querySelector('#pp-ans-status');
      if (el) el.innerHTML = html;
    }

    function handleAnswerPdfs(files) {
      var arr = Array.prototype.slice.call(files).filter(function (f) {
        return /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
      });
      if (!arr.length) { U.toast('请选择 PDF 文件', 'error'); return; }

      var textarea = mount.querySelector('#pp-answers');
      var merged = Object.create(null);
      /* 已有答案先读进来，PDF 里同题号的会覆盖它 */
      var existed = KY.papertext.parseAnswerKey(textarea.value).map;
      Object.keys(existed).forEach(function (k) { merged[k] = existed[k]; });

      var texts = [];
      var errors = [];
      var i = 0;

      ansStatus('<div class="hint-box">正在读取 ' + arr.length + ' 个答案 PDF…</div>');

      function next() {
        if (i >= arr.length) {
          var raw = texts.join('\n');
          if (!raw.trim()) {
            ansStatus('<div class="hint-box err"><b>答案 PDF 里没提取到文字。</b>' +
              '如果它是扫描件/照片，OCR 可能没认出来 —— 请把答案手工敲进下面的框。' +
              (errors.length ? '<br>出错：' + errors.join('；') : '') + '</div>');
            return;
          }
          var parsed = KY.papertext.parseAnswerKey(raw);
          var fromPdf = 0, overwrote = 0;
          Object.keys(parsed.map).forEach(function (k) {
            if (merged[k] !== undefined && merged[k] !== parsed.map[k]) overwrote++;
            if (merged[k] === undefined) fromPdf++;
            merged[k] = parsed.map[k];
          });
          var nums = KY.papertext.answerNumbers(merged);
          if (!nums.length) {
            ansStatus('<div class="hint-box err"><b>没认出任何答案。</b>' +
              '答案件里的题号格式可能不常见。把答案原文贴到下面的框里，' +
              '或者手工写成「1-5 ABCDB」「11.A」这样的形式。</div>');
            return;
          }
          textarea.value = KY.papertext.answerKeyToText(merged);

          /* 看一下答案的题号连不连续 —— 断号往往说明有页没读出来 */
          var gaps = [];
          for (var n = nums[0]; n < nums[nums.length - 1]; n++) {
            if (merged[n] === undefined) gaps.push(n);
          }

          ansStatus('<div class="hint-box ' + (gaps.length ? 'warn' : 'ok') + '">' +
            '<b>答案已填入</b>：共 ' + nums.length + ' 个（第 ' + nums[0] + '–' +
            nums[nums.length - 1] + ' 题）' +
            (fromPdf ? '，其中 ' + fromPdf + ' 个是新识别的' : '') +
            (overwrote ? '，<b>覆盖了 ' + overwrote + ' 个原有答案</b>' : '') +
            (gaps.length ? '<br><b>题号不连续</b>：缺 ' + gaps.length + ' 个（第 ' +
              gaps.slice(0, 15).join('、') + (gaps.length > 15 ? ' …' : '') +
              '），可能是答案件有页没读出来，请核对' : '') +
            (parsed.leftovers.length ? '<br>提示：' + esc(parsed.leftovers.join('；')) : '') +
            (errors.length ? '<br>出错：' + errors.join('；') : '') +
            '</div>');
          return;
        }

        var f = arr[i];
        KY.pdf.extract(f, {
          ocr: true,
          onProgress: function (pageNo, total, phase) {
            ansStatus('<div class="hint-box">正在读取答案 <b>' + esc(f.name) + '</b>（' +
              (i + 1) + '/' + arr.length + '）第 ' + pageNo + '/' + total + ' 页' +
              (phase === 'ocr' ? ' · OCR 识别中…' : '') + '</div>');
          }
        }).then(function (r) {
          texts.push(r.text);
          if ((r.stats.emptyPages || []).length) {
            errors.push(esc(f.name) + ' 有 ' + r.stats.emptyPages.length + ' 页没读到文字');
          }
          (r.stats.errorPages || []).forEach(function (x) { errors.push(esc(x)); });
          i++;
          next();
        }).catch(function (e) {
          errors.push(esc(f.name) + '：' + esc(e.message));
          i++;
          next();
        });
      }

      next();
    }

    if (ppAnsDrop && ppAnsFile) {
      ppAnsDrop.addEventListener('click', function () { ppAnsFile.click(); });
      ppAnsDrop.addEventListener('dragover', function (e) {
        e.preventDefault(); ppAnsDrop.classList.add('over');
      });
      ppAnsDrop.addEventListener('dragleave', function () { ppAnsDrop.classList.remove('over'); });
      ppAnsDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        ppAnsDrop.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) handleAnswerPdfs(e.dataTransfer.files);
      });
      ppAnsFile.addEventListener('change', function () {
        if (ppAnsFile.files && ppAnsFile.files.length) handleAnswerPdfs(ppAnsFile.files);
      });
    }

    mount.querySelector('#pp-demo').addEventListener('click', function () {
      ui.modal({
        title: '真题原文格式示例',
        wide: true,
        body: '<p style="font-size:13.5px;line-height:1.8;color:var(--text-2);margin-top:0">' +
          '照卷子的原样粘进来就行。下面这些写法都能认出来：</p>' +
          '<pre class="demo-pre">' + esc(DEMO_PAPER) + '</pre>' +
          '<div class="hint-box" style="margin-top:14px;margin-bottom:0">' +
          '<b>能识别的写法：</b><br>' +
          '· 题号：<code>1.</code> <code>2、</code> <code>（3）</code> <code>第4题</code><br>' +
          '· 选项：<code>A.</code> <code>A、</code> <code>（A）</code> <code>A)</code><br>' +
          '· 答案：<code>答案：D</code> <code>【答案】C</code> <code>正确答案 D</code>，或写在下面的答案区<br>' +
          '· 解析：<code>解析：…</code> <code>【解析】…</code>（可以多行）<br>' +
          '· 分节：<code>一、单项选择题</code> <code>Section I</code>（用来自动判断板块）<br>' +
          '· 阅读材料：<code>【文章】</code> … <code>【题目】</code>，或填在「阅读材料」框里' +
          '</div>',
        footer: '<button class="btn" data-modal-close>关闭</button>' +
          '<button class="btn btn-primary" id="pp-demo-fill">把这些填进文本框</button>',
        onMount: function (mask, close) {
          mask.querySelector('#pp-demo-fill').addEventListener('click', function () {
            mount.querySelector('#pp-text').value = DEMO_PAPER;
            mount.querySelector('#pp-answers').value = '';
            close();
            U.toast('已填入示例，点「解析并预览」看效果', 'success');
          });
        }
      });
    });

    mount.querySelector('#pp-clear').addEventListener('click', function () {
      mount.querySelector('#pp-text').value = '';
      mount.querySelector('#pp-answers').value = '';
      mount.querySelector('#pp-passage').value = '';
      mount.querySelector('#parse-msg').innerHTML = '';
      mount.querySelector('#preview-host').innerHTML = '';
      DRAFT = null;
    });

    mount.querySelector('#dl-tpl').addEventListener('click', function () {
      U.downloadText('题库导入模板.csv', KY.importer.csvTemplate(), 'text/csv');
      U.toast('模板已下载，用 Excel 打开填题即可', 'success');
    });

    mount.querySelector('#show-tpl').addEventListener('click', function () {
      var rows = KY.importer.csvTemplate().replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
      var head = KY.importer.parseCsv(rows[0])[0];
      ui.modal({
        title: 'CSV 模板示例',
        wide: true,
        body: '<p style="font-size:13.5px;line-height:1.8;color:var(--text-2);margin-top:0">' +
          '第一行是表头，从第二行开始每题一行。<b>示例行可以直接删掉</b>。</p>' +
          '<div class="tpl-scroll"><table class="tbl tpl-table"><thead><tr>' +
          head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          rows.slice(1).map(function (r) {
            var cells = KY.importer.parseCsv(r)[0] || [];
            return '<tr>' + cells.map(function (c) {
              return '<td>' + esc(c.length > 40 ? c.slice(0, 40) + '…' : c) + '</td>';
            }).join('') + '</tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<div class="hint-box" style="margin-top:14px;margin-bottom:0">' +
          '提示：Excel 里保存时选「CSV UTF-8（逗号分隔）」，否则中文会乱码。' +
          '单元格内容里如果有逗号或换行，请用英文双引号把整个单元格括起来（Excel 会自动做）。</div>',
        footer: '<button class="btn" data-modal-close>关闭</button>' +
          '<button class="btn btn-primary" id="tpl-dl">下载这个模板</button>',
        onMount: function (mask, close) {
          mask.querySelector('#tpl-dl').addEventListener('click', function () {
            U.downloadText('题库导入模板.csv', KY.importer.csvTemplate(), 'text/csv');
            close();
            U.toast('模板已下载', 'success');
          });
        }
      });
    });

    mount.querySelector('#btn-clear-input').addEventListener('click', function () {
      mount.querySelector('#paste-area').value = '';
      mount.querySelector('#parse-msg').innerHTML = '';
      DRAFT = null;
      mount.querySelector('#preview-host').innerHTML = '';
    });

    mount.querySelector('#btn-parse').addEventListener('click', function () {
      var text = mount.querySelector('#paste-area').value;
      if (!String(text).trim()) {
        U.toast('请先粘贴内容或选择文件', 'error');
        return;
      }
      runPreview(mount, text, 'pasted.csv');
    });

    mount.querySelector('#export-user').addEventListener('click', function () {
      U.downloadText('我导入的题库-' + U.fmtDate(Date.now()) + '.csv',
        KY.importer.exportUserBankCsv(), 'text/csv');
      U.toast('已导出（含视频绑定列，可直接改完再导回）', 'success');
    });

    /* ---- 共享题库：导出 ---- */
    function doExportShared(list, source) {
      var m = mount.querySelector('#merge-shared');
      exportSharedFile(list, source, m ? m.checked : true);
    }

    mount.querySelector('#export-shared').addEventListener('click', function () {
      // 优先导出"本机个人题库"；如果为空，但共享题库已有内容，则把共享题库原样再导出一次（便于追加）
      var list = KY.importer.getUserBank();
      if (!list.length) {
        var shared = KY.importer.getSharedBank();
        if (shared.length) {
          ui.confirm('你本机还没有导入过题目，但已发布的共享题库里有 ' + shared.length +
            ' 题。\n\n要把它导出来（便于在上面追加新题后再发布）吗？',
            { okText: '导出共享题库' }).then(function (ok) {
              if (ok) doExportShared(KY.importer.sanitizeForExport(shared), 'shared-existing');
            });
          return;
        }
      }
      doExportShared(list, 'personal');
    });

    mount.querySelector('#export-shared-json').addEventListener('click', function () {
      var list = KY.importer.getUserBank();
      if (!list.length) {
        var shared = KY.importer.getSharedBank();
        if (shared.length) {
          list = KY.importer.sanitizeForExport(shared);
        } else {
          U.toast('还没有可导出的题目', 'error');
          return;
        }
      }
      U.downloadText('共享题库.json', KY.importer.buildSharedBankJson(list), 'application/json');
      ui.alertBox(
        '已生成 共享题库.json（' + list.length + ' 题）。\n\n' +
        '把它放到项目根目录（和 发布.cmd 同一层），然后双击 发布.cmd —— ' +
        '发布脚本会自动读取它、生成共享题库内容，并打包进 dist。\n\n' +
        '这样你不需要手动改 src 目录里的任何文件。\n\n' +
        '注意：这个 JSON 是"整体替换"共享题库。要追加题目，' +
        '请先把已有的 JSON 在导入页重新上传，和新题一起导出。',
        { title: '共享题库 JSON 已生成' }
      );
    });

    mount.querySelector('#clear-user').addEventListener('click', function () {
      ui.confirm('这会删除你导入的全部 ' + userBank.length + ' 道题（内置题库不受影响）。\n\n建议先导出备份。确定清空吗？',
        { danger: true, okText: '清空' }).then(function (ok) {
          if (!ok) return;
          KY.importer.clearUserBank();
          U.toast('已清空你导入的题库', 'success');
          KY.router.refresh();
        });
    });

    /* 从 URL 直接进带文件？ */
    if (q.demo === '1') {
      mount.querySelector('#paste-area').value = KY.importer.csvTemplate();
      runPreview(mount, KY.importer.csvTemplate(), 'demo.csv');
    }
  };

  function handleFile(file) {
    if (!/\.(csv|json|txt)$/i.test(file.name)) {
      U.toast('只支持 .csv / .json / .txt 文件', 'error');
      return;
    }
    U.readFileAsText(file).then(function (text) {
      var mount = document.getElementById('view');
      runPreview(mount, text, file.name);
    }).catch(function (e) {
      U.toast('读取文件失败：' + e.message, 'error');
    });
  }

  /* ================================================================== */
  /* 预览与导入                                                          */
  /* ================================================================== */

  function runPreview(mount, text, filename) {
    var result;
    try {
      result = KY.importer.preview(text, filename, {});
    } catch (e) {
      mount.querySelector('#parse-msg').innerHTML =
        '<div class="hint-box err">解析失败：' + esc(e.message) + '</div>';
      return;
    }
    renderPreview(mount, result);
  }

  /**
   * 真题原文（整卷粘贴）→ 走同一条预览/入库/导出流水线。
   * 关键点：解析结果交给 KY.importer.previewRecords 做校验 + 考点自动归类，
   * 所以"真题原文"和"CSV/JSON"两种录入方式共用完全一样的下游逻辑。
   */
  function runPaperPreview(mount) {
    var subject = mount.querySelector('#pp-subject').value;
    var yearRaw = mount.querySelector('#pp-year').value.trim();
    var source = mount.querySelector('#pp-source').value.trim();
    var moduleId = mount.querySelector('#pp-module').value;
    var passage = mount.querySelector('#pp-passage').value;
    var answers = mount.querySelector('#pp-answers').value;
    var text = mount.querySelector('#pp-text').value;

    var msg = mount.querySelector('#parse-msg');

    if (!text.trim()) {
      msg.innerHTML = '<div class="hint-box err">请先把真题原文粘进文本框。</div>';
      return;
    }
    if (!subject) {
      msg.innerHTML = '<div class="hint-box err">请先选科目 —— 真题解析需要知道是哪一科。</div>';
      return;
    }

    var year = parseInt(yearRaw.replace(/[^\d]/g, ''), 10);
    if (yearRaw && (!year || year < 1990 || year > 2100)) {
      msg.innerHTML = '<div class="hint-box err">年份「' + esc(yearRaw) + '」看起来不对（应为 4 位数字）。</div>';
      return;
    }

    var parsed;
    try {
      parsed = KY.papertext.parse(text, {
        subject: subject,
        year: year || '',
        source: source || (year ? (year + ' 年' + KY.subjectName(subject) + '真题') : '真题原文录入'),
        module: moduleId || '',
        passage: passage,
        answers: answers
      });
    } catch (e) {
      msg.innerHTML = '<div class="hint-box err">解析失败：' + esc(e.message) + '</div>';
      return;
    }

    if (!parsed.records.length) {
      msg.innerHTML = '<div class="hint-box err">没解析出任何题目。<br>' +
        '每道题要以题号开头，例如 <code>1. 题干…</code> 或 <code>1、题干…</code>；' +
        '选项写 <code>A. …</code>；答案写 <code>答案：B</code> 或填在下面的「答案区」。</div>';
      return;
    }
    if (parsed.warnings.length) {
      parsed.records = parsed.records;   // 记录保留，警告下面会展示
    }

    var result = KY.importer.previewRecords(parsed.records, {
      format: 'paper',
      warnings: parsed.warnings,
      defaultSubject: subject
    });
    result.paperStats = parsed.stats;
    result.paperWarnings = parsed.warnings;

    /*
     * 答案核对。
     * 题目和答案是两份 PDF 时，最典型的翻车方式就是"看着都解析成功，
     * 其实一道答案都没配上"。所以这里把覆盖率显式打在答案框下面。
     * 注意：这个提示写在 #pp-ans-status，不走 renderPreview 的 msg ——
     * 否则会被预览渲染覆盖掉。
     */
    var cov = KY.papertext.answerCoverage(parsed.records,
      KY.papertext.parseAnswerKey(answers).map);
    result.paperCoverage = cov;
    var ansEl = mount.querySelector('#pp-ans-status');
    if (ansEl && cov.questions) {
      var ccls = cov.complete ? 'ok' : (cov.answered ? 'warn' : 'err');
      var chtml = '<div class="hint-box ' + ccls + '"><b>答案核对</b>：' +
        esc(KY.papertext.coverageText(cov));
      if (!cov.answered) {
        chtml += '<br>这批题目一个答案都没配上。如果答案在另一份 PDF 里，' +
          '把它拖到上面的「答案 PDF」框，再点一次「解析并预览」。';
      }
      chtml += '</div>';
      ansEl.innerHTML = chtml;
    }

    renderPreview(mount, result);
  }

  function renderPreview(mount, result) {
    var msg = mount.querySelector('#parse-msg');
    var host = mount.querySelector('#preview-host');
    DRAFT = result;

    if (!result.rows.length) {
      msg.innerHTML = '<div class="hint-box err">' +
        ((result.warnings && result.warnings.length)
          ? result.warnings.map(esc).join('<br>')
          : '没有解析出任何题目') +
        '<br><br>建议先点上面的「模板长什么样」看一眼格式。</div>';
      host.innerHTML = '';
      return;
    }

    var s = result.summary;
    msg.innerHTML = '<div class="hint-box ' + (s.failed ? 'warn' : 'ok') + '">' +
      '解析完成：共 ' + s.total + ' 行，<b>可导入 ' + s.ok + ' 题</b>' +
      (s.failed ? '，<b>' + s.failed + ' 行有问题</b>（见下方，修好再重来）' : '') +
      (result.warnings.length ? '<br>' + result.warnings.map(esc).join('<br>') : '') +
      '</div>';

    var subjectLine = Object.keys(s.bySubject).map(function (k) {
      return KY.subjectName(k) + ' ' + s.bySubject[k];
    }).join(' · ');

    host.innerHTML = '' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">第二步：核对解析结果</h3>' +
      '<p class="card-sub" style="margin:0">格式：' + esc(result.format.toUpperCase()) +
      ' · ' + esc(subjectLine) + '</p></div>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm" id="toggle-all-rows">展开全部 ' + result.rows.length + ' 行</button>' +
      '</div>' +

      '<div class="import-summary">' +
      ui.stat(s.ok, '可导入题目') +
      ui.stat(s.autoClassified, '考点自动归类（需核对）') +
      ui.stat(s.withAnswer + ' / ' + s.ok, '带答案') +
      ui.stat(s.withExplanation + ' / ' + s.ok, '带解析') +
      ui.stat(s.withVideo, '带视频链接') +
      ui.stat(s.failed, '需修正的行') +
      '</div>' +

      (s.autoClassified
        ? '<div class="hint-box warn">有 ' + s.autoClassified + ' 题的考点是自动判定的。' +
        '导入后可以到「题库检索」里逐题核对，或在错题本里修正——但更省事的做法是直接在 CSV 里填好考点再导一次。</div>'
        : '') +

      (s.withExplanation < s.ok
        ? '<div class="hint-box warn">有 ' + (s.ok - s.withExplanation) +
        ' 题没有解析。学生点「查看答案与详解」时只能看到答案，看不到思路。建议补上。</div>'
        : '') +

      '<div id="rows-host"></div>' +

      '<div class="row" style="margin-top:14px">' +
      '<button class="btn btn-primary btn-lg" id="do-import"' + (s.ok ? '' : ' disabled') + '>导入这 ' + s.ok + ' 题（只存我的浏览器）</button>' +
      '<select id="import-mode" style="width:auto">' +
      '<option value="merge">合并模式（推荐：保留已导入的其它题目）</option>' +
      '<option value="replace">覆盖模式（清空我导入的题库，只留这批）</option>' +
      '</select>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-lg" id="export-shared-from-preview"' + (s.ok ? '' : ' disabled') + '>导出为共享题库文件（发布给所有使用者）</button>' +
      '</div>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">' +
      '<b>两个按钮的区别：</b>' +
      '左边「导入」只把题存进<b>你自己浏览器</b>，方便你自己先试；' +
      '右边「导出为共享题库文件」才是<b>发给对方</b>的那一步——它生成一个文件，' +
      '你覆盖 <code>src/data/bank.shared.js</code> 后重新发布，对方刷新就能拿到。' +
      '</div>' +
      '</div>';

    var rowsHost = host.querySelector('#rows-host');
    var expanded = false;

    function renderRows() {
      var list = expanded ? result.rows : result.rows.slice(0, 40);
      rowsHost.innerHTML = list.map(function (r) {
        var q = r.question;
        var meta = '';
        if (q) {
          var kn = (q.knowledge || []).map(function (p) {
            var n = KY.getTaxNode(p); return n ? n.point.name : p;
          }).join('、');
          meta = ui.subTag(q.subject) + ' ' +
            ui.tag(q.type + (q.year ? ' · ' + q.year + ' 真题' : '')) + ' ' +
            ui.tag('答案：' + ui.answerText(q)) + ' ' +
            ui.knowledgeChips(q.knowledge) +
            (q.explanation ? ' ' + ui.tag('有解析', 'tag-ok') : ' ' + ui.tag('无解析', 'tag-err'));
          void kn;
        }
        return '<div class="row-status ' + (r.ok ? 'ok' : 'bad') + '">' +
          '<span class="ln">#' + r.line + '</span>' +
          '<span class="bd">' +
          '<div class="stem">' + esc(q ? U.truncate(q.stem, 150) : '（无法解析这一行）') + '</div>' +
          (r.issues.length ? '<div class="msgs">' + r.issues.map(function (m) { return '· ' + esc(m); }).join('<br>') + '</div>' : '') +
          (meta ? '<div class="meta">' + meta + '</div>' : '') +
          '</span>' +
          '</div>';
      }).join('') +
        (!expanded && result.rows.length > 40
          ? '<div style="text-align:center;padding:10px;font-size:12.5px;color:var(--text-3)">' +
          '只显示前 40 行，还有 ' + (result.rows.length - 40) + ' 行</div>'
          : '');
    }
    renderRows();

    host.querySelector('#toggle-all-rows').addEventListener('click', function () {
      expanded = !expanded;
      this.textContent = expanded ? '只看前 40 行' : ('展开全部 ' + result.rows.length + ' 行');
      renderRows();
    });

    /* 直接把这次预览的题目导出为共享题库（不用先导入到个人题库） */
    host.querySelector('#export-shared-from-preview').addEventListener('click', function () {
      var list = KY.importer.collectPublishable(result, 'preview');
      var mergeEl = mount.querySelector('#merge-shared');
      exportSharedFile(list, 'import-preview', mergeEl ? mergeEl.checked : true);
    });

    host.querySelector('#do-import').addEventListener('click', function () {
      var mode = host.querySelector('#import-mode').value;
      var res = KY.importer.commit(result, { mode: mode });
      U.toast('导入完成：新增 ' + res.added + ' 题，更新 ' + res.updated +
        ' 题，绑定视频 ' + res.boundVideos + ' 个', 'success');

      ui.alertBox(
        '导入完成。\n\n' +
        '· 新增：' + res.added + ' 题\n' +
        '· 更新：' + res.updated + ' 题（同 id 覆盖）\n' +
        '· 你导入的题库总计：' + res.total + ' 题\n' +
        '· 自动绑定视频：' + res.boundVideos + ' 个\n\n' +
        '现在这些题已经进入题库，会参与定制化推题、智能组卷与考试。\n' +
        '建议到「题库检索」里抽查几道，确认考点归类符合预期。',
        { title: '导入成功' }
      ).then(function () {
        KY.router.refresh();
      });
    });

    setTimeout(function () {
      if (host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }
})(window);
