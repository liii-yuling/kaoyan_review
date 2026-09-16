/*!
 * views/settings.js —— 设置与数据管理
 * 路由： #/settings
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  /* ================================================================== */
  /* 批量绑定解析（实现已移到 KY.importer，便于复用与测试）              */
  /* ================================================================== */

  function parseBatchBindings(text) {
    return KY.importer.parseBulkBindings(text);
  }

  /* ================================================================== */
  /* 视图                                                                */
  /* ================================================================== */

  KY.views.settings = function (ctx, mount) {
    ui.setTitle('设置与备份');

    var s = KY.store.getSettings();
    var p = KY.store.getProfile();
    var ocrDiag = KY.ocr.diagnose();
    var overrides = KY.store.getVideoOverrides();
    var overrideKeys = Object.keys(overrides);

    var boundQuestions = overrideKeys.filter(function (qid) { return KY.video.links(KY.bank.get(qid) || { id: qid }).length; });
    var totalVideos = overrideKeys.reduce(function (a, qid) {
      return a + KY.video.links(KY.bank.get(qid) || { id: qid }).length;
    }, 0);
    var userBank = KY.importer.getUserBank();
    var sharedBank = KY.importer.getSharedBank();
    var sharedMeta = KY.importer.getSharedBankMeta();
    var bankStats = KY.bank.stats();
    var builtinCount = bankStats.total - (bankStats.sharedCount || 0) - (bankStats.userCount || 0);

    /* ---- 视频绑定表 ---- */
    var bindRows = boundQuestions.map(function (qid) {
      var q = KY.bank.get(qid);
      var label = q ? U.truncate(q.stem, 56) : qid;
      var src = q ? (q.source || '') : '';
      var vids = KY.video.links(q || { id: qid });
      return '<tr>' +
        '<td style="max-width:420px">' + esc(label) +
        '<div style="font-size:11px;color:var(--text-3)">' + esc(src || qid) + '</div></td>' +
        '<td>' + vids.map(function (v) {
          return '<div class="row tight" style="margin-bottom:3px">' +
            '<span class="mono" style="font-size:11.5px">' + esc(v.bvid) + '</span>' +
            '<a class="btn btn-sm btn-ghost" href="' + esc(KY.video.pageUrlOf(v.bvid)) +
            '" target="_blank" rel="noopener">打开</a>' +
            '<button class="btn btn-sm btn-danger" data-unbind="' + esc(qid) + '|' + esc(v.bvid) + '">解绑</button>' +
            '</div>';
        }).join('') + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-bind-video="' + esc(qid) + '">管理</button></td>' +
        '</tr>';
    }).join('');

    mount.innerHTML = '' +
      /* ============ 学习档案 ============ */
      '<div class="card">' +
      '<h3 class="card-title">学习档案</h3>' +
      '<p class="card-sub">用于首页倒计时与个性化推送</p>' +
      '<div class="grid grid-3">' +
      '<label class="field"><span class="lbl">姓名 / 昵称</span>' +
      '<input type="text" id="s-name" value="' + esc(p.name || '') + '" placeholder="使用者姓名"></label>' +
      '<label class="field"><span class="lbl">目标院校 / 专业</span>' +
      '<input type="text" id="s-school" value="' + esc(p.targetSchool || '') + '" placeholder="例：XX大学 信息与通信工程"></label>' +
      '<label class="field"><span class="lbl">考试日期</span>' +
      '<input type="date" id="s-examdate" value="' + esc(p.examDate || '') + '"></label>' +
      '</div>' +
      '<button class="btn btn-primary" id="save-profile">保存档案</button>' +
      '</div>' +

      /* ============ 图片识别 ============ */
      '<div class="card">' +
      '<h3 class="card-title">图片识别（上传错题用）</h3>' +
      '<p class="card-sub">当前状态：' + esc(ocrDiag.mode) +
      ' · 网络' + (ocrDiag.online ? '在线' : '离线') +
      (ocrDiag.tesseractReady ? ' · 本地引擎已加载' : '') +
      (ocrDiag.apiConfigured ? ' · API 已配置' : '') + '</p>' +
      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">识别方式</span>' +
      '<select id="s-ocr-mode">' +
      [['tesseract', '浏览器本地识别（免费、离线可用，首次需联网下载语言包）'],
        ['api', '调用视觉大模型接口（准确率更高，需要 endpoint + Key，图片会上传）'],
        ['off', '关闭图片识别（只用文字粘贴）']].map(function (o) {
          return '<option value="' + o[0] + '"' + (s.ocr.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') +
      '</select></label>' +
      '<label class="field"><span class="lbl">识别语言</span>' +
      '<select id="s-ocr-lang">' +
      [['chi_sim+eng', '简体中文 + 英文（推荐）'], ['chi_sim', '仅简体中文'], ['eng', '仅英文']].map(function (o) {
        return '<option value="' + o[0] + '"' + (s.ocr.lang === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') +
      '</select></label>' +
      '</div>' +
      '<div id="ocr-api-fields"' + (s.ocr.mode === 'api' ? '' : ' style="display:none"') + '>' +
      '<div class="grid grid-3">' +
      '<label class="field"><span class="lbl">接口地址</span>' +
      '<input type="text" id="s-ocr-endpoint" value="' + esc(s.ocr.endpoint || '') + '" placeholder="https://api.openai.com/v1/chat/completions"></label>' +
      '<label class="field"><span class="lbl">API Key</span>' +
      '<input type="password" id="s-ocr-key" value="' + esc(s.ocr.apiKey || '') + '" placeholder="sk-..."></label>' +
      '<label class="field"><span class="lbl">模型</span>' +
      '<input type="text" id="s-ocr-model" value="' + esc(s.ocr.model || '') + '" placeholder="gpt-4o-mini"></label>' +
      '</div>' +
      '</div>' +
      '<div class="hint-box">' + esc(ocrDiag.note || '') + '</div>' +
      '<button class="btn btn-primary" id="save-ocr">保存识别设置</button>' +
      '</div>' +

      /* ============ AI 增强 ============ */
      '<div class="card">' +
      '<h3 class="card-title">AI 增强（可选）</h3>' +
      '<p class="card-sub">开启后，错题归类会在本地规则引擎之上再做一次大模型纠错与错因总结。' +
      '不开启也完全可用——本地引擎离线工作。</p>' +
      '<label class="switch" style="margin-bottom:14px">' +
      '<input type="checkbox" id="s-ai-enabled"' + (s.ai.enabled ? ' checked' : '') + '>' +
      '<span class="track"></span><span>启用 AI 增强</span></label>' +
      '<div class="grid grid-3">' +
      '<label class="field"><span class="lbl">接口地址（兼容 OpenAI 格式）</span>' +
      '<input type="text" id="s-ai-endpoint" value="' + esc(s.ai.endpoint || '') + '" placeholder="https://api.deepseek.com/chat/completions"></label>' +
      '<label class="field"><span class="lbl">API Key</span>' +
      '<input type="password" id="s-ai-key" value="' + esc(s.ai.apiKey || '') + '" placeholder="sk-..."></label>' +
      '<label class="field"><span class="lbl">模型</span>' +
      '<input type="text" id="s-ai-model" value="' + esc(s.ai.model || '') + '" placeholder="deepseek-chat"></label>' +
      '</div>' +
      '<div class="row"><button class="btn btn-primary" id="save-ai">保存 AI 设置</button>' +
      '<button class="btn" id="test-ai">测试连接</button>' +
      '<span style="font-size:12px;color:var(--text-3)">测试会发送一次极小的请求验证连通性。</span></div>' +
      '</div>' +

      /* ============ 推送与学习 ============ */
      '<div class="card">' +
      '<h3 class="card-title">推送与学习偏好</h3>' +
      '<p class="card-sub">推题引擎会参考这些参数</p>' +
      '<div class="grid grid-2">' +
      '<label class="field"><span class="lbl">每日推送题量</span>' +
      '<input type="number" id="s-daily" min="3" max="60" value="' + (s.study.dailyNewQuestions || 12) + '"></label>' +
      '<label class="field"><span class="lbl">B站视频打开方式</span>' +
      '<select id="s-embed">' +
      '<option value="0"' + (!s.video.preferEmbed ? ' selected' : '') + '>题内点按钮就地播放（推荐）</option>' +
      '<option value="1"' + (s.video.preferEmbed ? ' selected' : '') + '>答案块里直接展开播放器</option>' +
      '</select></label>' +
      '</div>' +
      '<button class="btn btn-primary" id="save-study">保存偏好</button>' +
      '</div>' +

      /* ============ 视频绑定管理 ============ */
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3 class="card-title">视频绑定管理</h3>' +
      '<p class="card-sub" style="margin:0">已为 ' + boundQuestions.length + ' 道题绑定 ' + totalVideos +
      ' 个视频（支持一题多讲）</p></div>' +
      '<span class="spacer"></span>' +
      '<div class="row tight">' +
      '<button class="btn btn-sm btn-primary" id="batch-bind">批量导入链接</button>' +
      '<button class="btn btn-sm" id="export-bind">导出绑定列表</button>' +
      '<button class="btn btn-sm" id="quick-bind">按题目 ID 添加</button>' +
      '</div>' +
      '</div>' +

      (boundQuestions.length
        ? '<table class="tbl"><thead><tr><th>题目</th><th>视频（可多个）</th><th></th></tr></thead><tbody>' +
        bindRows + '</tbody></table>'
        : '<p style="color:var(--text-3);font-size:13px;margin:0">还没有绑定任何视频。' +
        '在真题页面点每道题的「查看答案与详解」，答案块里的「管理视频」可以直接绑定；' +
        '或者点右上角「批量导入链接」一次性把一批链接贴进来。</p>') +

      '<div class="hint-box" style="margin-top:12px">' +
      '<b>为什么需要手动绑定：</b>B站视频会失效、会改标题，自动填进去的链接迟早变成死链。' +
      '绑定后存在你自己的浏览器里，永久有效，而且一道题可以绑多个（不同老师讲法不同，自己挑）。' +
      '</div>' +
      '</div>' +

      /* ============ 数据管理 ============ */
      '<div class="card">' +
      '<h3 class="card-title">数据与备份</h3>' +
      '<p class="card-sub">' +
      (KY.store.persistent()
        ? '数据保存在当前浏览器的本地存储中，不会上传到任何服务器。'
        : '<b style="color:var(--err)">当前为临时存储模式，刷新会丢失数据！</b>请立即导出备份。') +
      '</p>' +
      '<div class="grid grid-4" style="margin-bottom:14px">' +
      ui.stat(KY.store.getWrongbook().length, '错题条目') +
      ui.stat(Object.keys(KY.store.getMastery()).length, '有记录的考点') +
      ui.stat(KY.store.getPracticeHistory().length, '练习记录') +
      ui.stat(KY.store.getExams().length, '考试记录') +
      '</div>' +
      (userBank.length
        ? '<div class="hint-box ok">你还导入了 <b>' + userBank.length + '</b> 道<b>个人</b>题目' +
        '（只存在你这台电脑的浏览器里，对方看不到）。它们包含在完整备份里，' +
        '也可以用「题库导入」页单独导出成 CSV。</div>'
        : '') +
      '<div class="hint-box ' + (sharedBank.length ? 'ok' : 'warn') + '">' +
      (sharedBank.length
        ? '网站里带着 <b>' + (bankStats.sharedCount || 0) + '</b> 道<b>共享</b>题目（随网站发布，所有使用者都能看到）' +
        (sharedMeta.builtAt ? '，生成于 ' + esc(sharedMeta.builtAt) : '') +
        ((bankStats.sharedConflictCount || 0)
          ? '<br><b style="color:var(--err)">⚠ 另有 ' + bankStats.sharedConflictCount +
          ' 道共享题因 id 与内置题重复而未生效</b>，请到「题库导入」页看冲突列表。'
          : '') +
        '<br>注意：共享题库是网站文件的一部分，<b>不包含在下面的备份里</b>——' +
        '要改它得重新发布（见「题库导入」页的共享题库卡片）。'
        : '当前<b>没有共享题目</b>：网站里只有内置题库。' +
        '你在「题库导入」页传的题目前只存在你自己浏览器里，<b>对方看不到</b>。' +
        '要让对方也拿到，请到「题库导入」页用「导出为共享题库文件」并重新发布。') +
      '</div>' +
      '<div class="row">' +
      '<button class="btn btn-primary" id="d-export">导出完整备份（JSON）</button>' +
      '<button class="btn" id="d-import">导入备份</button>' +
      '<button class="btn" id="d-import-merge">导入并合并</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-danger" id="d-clear-wrong">清空错题本</button>' +
      '<button class="btn btn-danger" id="d-clear-all">清空全部数据</button>' +
      '</div>' +
      '<div style="margin-top:12px;font-size:12.5px;color:var(--text-3)">' +
      '存储引擎：<code>' + esc(KY.store.backend()) + '</code> · 已用键：' +
      esc(KY.store.raw.keys().join(', ') || '（无）') +
      (KY.store.backendError() ? '<br>错误信息：' + esc(KY.store.backendError()) : '') +
      '</div>' +
      '</div>' +

      /* ============ 版本与更新 ============ */
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">版本与更新</h3>' +
      '<p class="card-sub" style="margin:0">当前版本 <code>' + esc(KY.BUILD || 'dev') + '</code>' +
      (KY.BUILD_TIME ? ' · 构建于 ' + esc(KY.BUILD_TIME) : '') +
      ' · 打开方式 <code>' + esc(protocolOf()) + '</code></p></div>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-primary" id="chk-update">检查更新</button>' +
      '</div>' +
      '<div id="chk-result"></div>' +
      '<div class="hint-box" style="margin-bottom:0">' +
      (protocolOf() === 'file:'
        ? '<b>你现在是双击文件打开的。</b>这种方式下无法检查更新，也不建议用来长期使用' +
        '（部分浏览器会禁用本地存储，刷新就可能丢数据）。要长期用请双击 <code>启动.cmd</code>，' +
        '或使用部署到网上的网址。'
        : '部署到静态托管后，你在这边更新文件，对方<b>刷新页面就会出现「有新版本」提示条</b>，' +
        '点一下就拿到新版；他的错题与掌握度存在自己浏览器里，刷新不会丢。' +
        '详细的部署步骤见项目根目录的 <code>部署说明.md</code>。') +
      '</div>' +
      '</div>' +

      /* ============ 关于 ============ */
      '<div class="card">' +
      '<h3 class="card-title">关于</h3>' +
      '<div class="detail-list">' +
      '<dt>版本</dt><dd><code>' + esc(KY.BUILD || 'dev') + '</code>' +
      (KY.BUILD_TIME ? '（' + esc(KY.BUILD_TIME) + '）' : '') + '</dd>' +
      '<dt>科目</dt><dd>' + KY.SUBJECTS.map(function (x) { return KY.subjectName(x); }).join(' · ') + '</dd>' +
      '<dt>题库</dt><dd>' + bankStats.total + ' 题（内置 ' + builtinCount +
      ' + 共享 ' + (bankStats.sharedCount || 0) +
      ' + 我导入 ' + (bankStats.userCount || 0) + '），套卷 ' + KY.bank.papers().length + ' 套</dd>' +
      '<dt>知识树</dt><dd>' + Object.keys(KY.taxIndex).length + ' 个考点</dd>' +
      '<dt>架构</dt><dd>纯前端 · 零依赖 · 数据存本地浏览器</dd>' +
      '<dt>扩展</dt><dd>题库可在「题库导入」页用 CSV/JSON 灌入；也可按 <code>SCHEMA.md</code> 直接改 <code>src/data/bank.*.js</code></dd>' +
      '<dt>部署</dt><dd>发布用 <code>发布.cmd</code>（或 <code>node tools/release.js</code>），产物在 <code>dist/</code>，' +
      '整个文件夹传上任意免费静态托管即可</dd>' +
      '</div>' +
      '</div>';

    function protocolOf() {
      try { return (global.location && global.location.protocol) || 'unknown'; }
      catch (e) { return 'unknown'; }
    }

    /* ================= 事件 ================= */

    mount.querySelector('#save-profile').addEventListener('click', function () {
      KY.store.setProfile({
        name: mount.querySelector('#s-name').value.trim(),
        targetSchool: mount.querySelector('#s-school').value.trim(),
        examDate: mount.querySelector('#s-examdate').value
      });
      KY.app.refreshNavBadges();
      U.toast('档案已保存', 'success');
    });

    mount.querySelector('#s-ocr-mode').addEventListener('change', function () {
      mount.querySelector('#ocr-api-fields').style.display = this.value === 'api' ? '' : 'none';
    });

    mount.querySelector('#save-ocr').addEventListener('click', function () {
      KY.store.setSettings({
        ocr: {
          mode: mount.querySelector('#s-ocr-mode').value,
          lang: mount.querySelector('#s-ocr-lang').value,
          endpoint: mount.querySelector('#s-ocr-endpoint').value.trim(),
          apiKey: mount.querySelector('#s-ocr-key').value.trim(),
          model: mount.querySelector('#s-ocr-model').value.trim()
        }
      });
      U.toast('图片识别设置已保存', 'success');
      KY.router.refresh();
    });

    mount.querySelector('#save-ai').addEventListener('click', function () {
      KY.store.setSettings({
        ai: {
          enabled: mount.querySelector('#s-ai-enabled').checked,
          endpoint: mount.querySelector('#s-ai-endpoint').value.trim(),
          apiKey: mount.querySelector('#s-ai-key').value.trim(),
          model: mount.querySelector('#s-ai-model').value.trim()
        }
      });
      U.toast('AI 设置已保存', 'success');
    });

    mount.querySelector('#test-ai').addEventListener('click', function () {
      var btn = this;
      KY.store.setSettings({
        ai: {
          enabled: mount.querySelector('#s-ai-enabled').checked,
          endpoint: mount.querySelector('#s-ai-endpoint').value.trim(),
          apiKey: mount.querySelector('#s-ai-key').value.trim(),
          model: mount.querySelector('#s-ai-model').value.trim()
        }
      });
      btn.disabled = true;
      btn.textContent = '测试中…';
      KY.ai.testConnection().then(function () {
        U.toast('连接成功，AI 增强可用', 'success');
      }).catch(function (e) {
        U.toast('连接失败：' + e.message, 'error');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '测试连接';
      });
    });

    mount.querySelector('#save-study').addEventListener('click', function () {
      KY.store.setSettings({
        study: { dailyNewQuestions: parseInt(mount.querySelector('#s-daily').value, 10) || 12 },
        video: { preferEmbed: mount.querySelector('#s-embed').value === '1' }
      });
      U.toast('偏好已保存', 'success');
    });

    /* ---- 批量导入链接 ---- */
    mount.querySelector('#batch-bind').addEventListener('click', function () {
      ui.modal({
        title: '批量导入视频链接',
        wide: true,
        body: '' +
          '<div class="hint-box">每行写「题目 ID 或题干关键词」+「B站链接 / BV 号」。' +
          '一行可以放多个 BV 号（一题多讲）。以 <code>#</code> 开头的行会被忽略。</div>' +
          '<label class="field"><span class="lbl">粘贴内容</span>' +
          '<textarea id="bb-input" rows="12" placeholder="' +
          'en1-2023-cloze-01 BV1xx411c7mD' + '\n' +
          'en1-2023-cloze-01 https://www.bilibili.com/video/BV1yy411c7mE' + '\n' +
          '信号与系统 拉普拉斯反变换 BV1zz411c7mF BV1aa411c7mG' + '\n' +
          '政治 对立统一规律 BV1bb411c7mH"></textarea>' +
          '<span class="hint">关键词写法只在能唯一匹配到一道题时才生效；匹配到多道会提示你改用题目 ID。</span></label>' +
          '<div id="bb-result"></div>',
        footer: '<button class="btn" data-modal-close>取消</button>' +
          '<button class="btn" id="bb-check">先校验一遍</button>' +
          '<button class="btn btn-primary" id="bb-do">确认绑定</button>',
        onMount: function (mask, close) {
          function run() {
            var text = mask.querySelector('#bb-input').value;
            var res = parseBatchBindings(text);
            var host = mask.querySelector('#bb-result');
            if (!res.binds.length && !res.errors.length) {
              host.innerHTML = '<div class="hint-box warn">没解析出任何内容。</div>';
              return res;
            }
            host.innerHTML =
              '<div class="hint-box ' + (res.errors.length ? 'warn' : 'ok') + '">' +
              '可绑定 <b>' + res.binds.length + '</b> 条' +
              (res.errors.length ? '，<b>' + res.errors.length + ' 行有问题</b>' : '') + '</div>' +
              (res.binds.length ? '<div style="max-height:200px;overflow:auto;margin-bottom:10px">' +
                res.binds.map(function (b) {
                  return '<div class="row-status ok"><span class="ln">✓</span><span class="bd">' +
                    '<div class="stem">' + esc(U.truncate(b.question.stem, 70)) + '</div>' +
                    '<div class="meta"><span class="mono">' + esc(b.bvid) + '</span> → ' +
                    esc(b.qid) + '</div></span></div>';
                }).join('') + '</div>' : '') +
              (res.errors.length ? '<div style="max-height:180px;overflow:auto">' +
                res.errors.map(function (e) {
                  return '<div class="row-status bad"><span class="ln">!</span><span class="bd">' +
                    '<div class="msgs">' + esc(e) + '</div></span></div>';
                }).join('') + '</div>' : '');
            return res;
          }

          mask.querySelector('#bb-check').addEventListener('click', run);

          mask.querySelector('#bb-do').addEventListener('click', function () {
            var res = run();
            if (!res.binds.length) {
              U.toast('没有可绑定的条目', 'error');
              return;
            }
            var n = 0, dup = 0;
            res.binds.forEach(function (b) {
              if (KY.video.addLink(b.qid, b.bvid, '')) n++; else dup++;
            });
            close();
            U.toast('绑定成功 ' + n + ' 条' + (dup ? ('，跳过重复 ' + dup + ' 条') : ''), 'success');
            KY.router.refresh();
          });
        }
      });
    });

    /* ---- 导出绑定列表 ---- */
    mount.querySelector('#export-bind').addEventListener('click', function () {
      var rows = [['题目ID', '科目', '题干摘要', '来源', 'BVID', 'B站链接']];
      boundQuestions.forEach(function (qid) {
        var q = KY.bank.get(qid) || { id: qid, stem: '', subject: '' };
        var vids = KY.video.links(q);
        if (!vids.length) {
          rows.push([qid, KY.subjectName(q.subject || ''), q.stem || '', q.source || '', '', '']);
          return;
        }
        vids.forEach(function (v) {
          rows.push([qid, KY.subjectName(q.subject || ''), q.stem || '', q.source || '',
            v.bvid, KY.video.pageUrlOf(v.bvid)]);
        });
      });
      var csv = '\uFEFF' + rows.map(function (r) {
        return r.map(function (c) {
          var s = String(c === null || c === undefined ? '' : c);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',');
      }).join('\r\n') + '\r\n';
      U.downloadText('视频绑定列表-' + U.fmtDate(Date.now()) + '.csv', csv, 'text/csv');
      U.toast('已导出 ' + boundQuestions.length + ' 道题的绑定列表', 'success');
    });

    /* ---- 按题目 ID 单个添加 ---- */
    mount.querySelector('#quick-bind').addEventListener('click', function () {
      ui.modal({
        title: '按题目 ID 添加视频',
        body: '<label class="field"><span class="lbl">题目 ID</span>' +
          '<input type="text" id="qb-qid" placeholder="例：en1-2023-cloze-01">' +
          '<span class="hint">题目 ID 可以在「题库检索」的题目卡片或本页表格里看到。' +
          '更省事的做法是在真题页面点「查看答案与详解」，答案块里有「管理视频」。</span></label>' +
          '<label class="field"><span class="lbl">B站视频链接或 BV 号（可多个）</span>' +
          '<input type="text" id="qb-bvid" placeholder="BV1xx411c7mD BV1yy411c7mE"></label>',
        footer: '<button class="btn" data-modal-close>取消</button><button class="btn btn-primary" id="qb-ok">绑定</button>',
        onMount: function (mask, close) {
          mask.querySelector('#qb-ok').addEventListener('click', function () {
            var qid = mask.querySelector('#qb-qid').value.trim();
            var bvids = KY.video.parseBvids(mask.querySelector('#qb-bvid').value);
            if (!qid) { U.toast('请填写题目 ID', 'error'); return; }
            if (!KY.bank.get(qid)) { U.toast('找不到该题目 ID：' + qid, 'error'); return; }
            if (!bvids.length) { U.toast('没有识别出有效 BVID', 'error'); return; }
            var n = 0;
            bvids.forEach(function (b) { if (KY.video.addLink(qid, b, '')) n++; });
            close();
            U.toast(n ? ('已绑定 ' + n + ' 个视频') : '这些视频已经绑定过了', n ? 'success' : 'info');
            KY.router.refresh();
          });
        }
      });
    });

    /* ---- 解绑（题目ID|BVID） ---- */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-unbind]');
      if (!b) return;
      var parts = b.getAttribute('data-unbind').split('|');
      KY.video.removeLink(parts[0], parts[1]);
      U.toast('已解绑该视频', 'success');
      KY.router.refresh();
    });

    /* ---- 数据管理 ---- */
    mount.querySelector('#d-export').addEventListener('click', function () {
      var payload = KY.store.raw.dump();
      payload.__meta = {
        app: 'kaoyan-review',
        exportedAt: new Date().toISOString(),
        version: 1
      };
      U.downloadText('考研复习完整备份-' + U.fmtDate(Date.now()) + '.json', JSON.stringify(payload, null, 2));
      U.toast('已导出完整备份（含错题本、掌握度、视频绑定、自建题库）', 'success');
    });

    function doImport(merge) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', function () {
        var f = input.files[0];
        if (!f) return;
        U.readFileAsText(f).then(function (text) {
          var data;
          try { data = JSON.parse(text); }
          catch (e) { U.toast('文件不是合法 JSON', 'error'); return; }
          delete data.__meta;
          var n = Object.keys(data).length;
          return ui.confirm('将导入 ' + n + ' 项数据' + (merge ? '（合并模式，已有数据保留）' : '（覆盖模式，当前数据将被替换）') +
            '。确定吗？', { okText: '导入', danger: !merge }).then(function (ok) {
              if (!ok) return;
              var cnt = KY.store.raw.restore(data, merge);
              U.toast('已导入 ' + cnt + ' 项，正在重新加载…', 'success');
              setTimeout(function () { location.reload(); }, 600);
            });
        }).catch(function (e) {
          U.toast('读取失败：' + e.message, 'error');
        });
      });
      input.click();
    }

    mount.querySelector('#d-import').addEventListener('click', function () { doImport(false); });
    mount.querySelector('#d-import-merge').addEventListener('click', function () { doImport(true); });

    mount.querySelector('#d-clear-wrong').addEventListener('click', function () {
      ui.confirm('确定清空错题本吗？掌握度数据会保留。', { danger: true, okText: '清空' }).then(function (ok) {
        if (!ok) return;
        KY.store.setWrongbook([]);
        U.toast('错题本已清空', 'success');
        KY.router.refresh();
      });
    });

    mount.querySelector('#d-clear-all').addEventListener('click', function () {
      ui.confirm('这会删除全部错题、掌握度、练习与考试记录、视频绑定、以及你导入的题库，且无法恢复。\n\n建议先导出备份。确定清空吗？',
        { danger: true, okText: '确认清空' }).then(function (ok) {
          if (!ok) return;
          KY.store.raw.clearAll();
          U.toast('已清空全部数据，正在重新加载…', 'success');
          setTimeout(function () { location.reload(); }, 600);
        });
    });
    /* ---- 检查更新 ---- */
    mount.querySelector('#chk-update').addEventListener('click', function () {
      var btn = this;
      var host = mount.querySelector('#chk-result');
      var st = KY.update.state();

      if (protocolOf() === 'file:') {
        host.innerHTML = '<div class="hint-box warn">双击文件打开时没有服务器，无法检查更新。' +
          '要接收更新请使用 <code>启动.cmd</code> 或部署后的网址。</div>';
        return;
      }

      btn.disabled = true;
      btn.textContent = '检查中…';
      host.innerHTML = '<div class="hint-box">正在检查…</div>';

      KY.update.check({ silent: false }).then(function (s) {
        btn.disabled = false;
        btn.textContent = '检查更新';

        if (s.lastError) {
          host.innerHTML = '<div class="hint-box err">检查失败：' + esc(s.lastError) +
            '<br>常见原因：没联网、托管还没生效、或 <code>version.json</code> 没上传。' +
            '这不影响你现在的使用。</div>';
          return;
        }

        if (s.hasUpdate) {
          host.innerHTML = '<div class="hint-box warn"><b>发现新版本：' +
            esc(s.remoteVersion) + '</b>（当前 ' + esc(KY.update.localBuild()) + '）' +
            (s.remoteNotes ? '<br>更新内容：' + esc(s.remoteNotes) : '') +
            '<br>点页面顶部的「立即刷新」即可拿到新版；你的错题与掌握度不会丢。</div>';
          KY.update.showBanner();
        } else {
          host.innerHTML = '<div class="hint-box ok">已是最新版本（' +
            esc(KY.update.localBuild()) + '）。</div>';
        }
      });
    });
  };

  KY.settingsHelper = { parseBatchBindings: parseBatchBindings };
})(window);
