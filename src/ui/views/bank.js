/*!
 * views/bank.js —— 题库检索与浏览
 * 路由： #/bank?subject=&module=&point=&type=&yearFrom=&yearTo=&q=
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  var shown = 40;

  KY.views.bank = function (ctx, mount) {
    var q = ctx.query || {};
    ui.setTitle('题库检索');

    var subject = q.subject || '';
    var moduleId = q.module || '';
    var pointId = q.point || '';
    var type = q.type || '';
    var keyword = q.q || '';
    var realOnly = q.real === '1';
    var showAnswer = q.ans === '1';

    var results = KY.bank.search(keyword, {
      subject: subject || undefined,
      module: moduleId || undefined,
      knowledge: pointId || undefined,
      type: type || undefined,
      realOnly: realOnly,
      limit: 500
    });

    var stats = KY.bank.stats();

    /* ---- 模块/考点下拉 ---- */
    var moduleOpts = '<option value="">全部板块</option>';
    (subject ? KY.getModules(subject) : []).forEach(function (m) {
      moduleOpts += '<option value="' + esc(m.id) + '"' + (moduleId === m.id ? ' selected' : '') + '>' +
        esc(m.name) + '（' + KY.bank.byModule(m.id).length + '）</option>';
    });

    var pointOpts = '<option value="">全部考点</option>';
    (subject ? KY.getPoints(subject) : []).forEach(function (x) {
      pointOpts += '<option value="' + esc(x.point.id) + '"' + (pointId === x.point.id ? ' selected' : '') + '>' +
        esc(x.module.name + ' / ' + x.point.name) + '（' + KY.bank.byPoint(x.point.id).length + '）</option>';
    });

    /* ---- 结果渲染 ---- */
    var visible = results.slice(0, shown);
    var listHtml = visible.length ? visible.map(function (item, i) {
      return ui.questionCard(item, {
        index: i + 1,
        mode: 'answer',
        answerJump: true,               // 答案默认收起，点按钮展开并滚到详解
        value: undefined,
        showDifficulty: true,
        showVideo: false,
        embedVideo: KY.store.getSettings().video.preferEmbed,
        sectionName: KY.getTaxNode((item.knowledge || [])[0]) ? KY.getTaxNode(item.knowledge[0]).moduleName : ''
      });
    }).join('') : ui.empty('没有匹配的题目', '试试放宽筛选条件，或换一个关键词。');

    /* ---- 题库统计 ---- */
    var statRows = KY.SUBJECTS.map(function (s) {
      var n = KY.bank.countBySubject(s);
      var real = KY.bank.bySubject(s).filter(function (x) { return x.year; }).length;
      return '<tr><td>' + ui.subTag(s) + '</td><td class="num">' + n + '</td>' +
        '<td class="num">' + real + '</td>' +
        '<td class="num">' + KY.getPoints(s).length + '</td>' +
        '<td class="num">' + (KY.bank.bySubject(s).filter(function (x) { return KY.video.hasBvid(x); }).length) + '</td>' +
        '<td><a class="btn btn-sm btn-ghost" href="#/bank?subject=' + s + '">浏览</a></td></tr>';
    }).join('');

    mount.innerHTML = '' +
      '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">题库检索</h3>' +
      '<p class="card-sub" style="margin:0">共 ' + stats.total + ' 题（其中标注真题年份的 ' + stats.realCount +
      ' 题）· 知识点 ' + Object.keys(KY.taxIndex).length + ' 个</p></div>' +
      '<span class="spacer"></span>' +
      '<label class="checkbox"><input type="checkbox" id="b-answer"' + (showAnswer ? ' checked' : '') + '>默认展开答案</label>' +
      '</div>' +

      '<div class="filters">' +
      '<select id="b-subject"><option value="">全部科目</option>' +
      KY.SUBJECTS.map(function (s) {
        return '<option value="' + s + '"' + (subject === s ? ' selected' : '') + '>' +
          KY.subjectName(s) + '（' + KY.bank.countBySubject(s) + '）</option>';
      }).join('') + '</select>' +
      '<select id="b-module"' + (subject ? '' : ' disabled') + '>' + moduleOpts + '</select>' +
      '<select id="b-point"' + (subject ? '' : ' disabled') + '>' + pointOpts + '</select>' +
      '<select id="b-type"><option value="">全部题型</option>' +
      [['single', '单选'], ['multi', '多选'], ['blank', '填空'], ['subjective', '主观题'], ['judge', '判断']].map(function (t) {
        return '<option value="' + t[0] + '"' + (type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
      }).join('') + '</select>' +
      '<label class="checkbox"><input type="checkbox" id="b-real"' + (realOnly ? ' checked' : '') + '>只看真题</label>' +
      '<input type="search" id="b-kw" placeholder="搜索题干关键词…" value="' + esc(keyword) + '">' +
      '<button class="btn btn-sm" id="b-reset">重置</button>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">分科题库概况</h3>' +
      '<table class="tbl"><thead><tr><th>科目</th><th class="num">题目</th><th class="num">真题</th>' +
      '<th class="num">考点</th><th class="num">已绑视频</th><th></th></tr></thead><tbody>' +
      statRows + '</tbody></table>' +
      '<div class="hint-box" style="margin-top:12px;margin-bottom:0">题库是纯数据文件（<code>src/data/bank.*.js</code>），' +
      '按 <code>SCHEMA.md</code> 的格式往里加题即可，页面无需改动。也可以点下方按钮导出当前题库为 JSON，方便批量编辑。</div>' +
      '<div class="row" style="margin-top:10px">' +
      '<button class="btn btn-sm" id="b-export">导出题库 JSON</button>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><h3 class="card-title">检索结果（' + results.length + ' 题）</h3>' +
      '<span class="spacer"></span>' +
      (results.length > shown
        ? '<button class="btn btn-sm" id="b-more">再显示 ' + Math.min(40, results.length - shown) + ' 题</button>'
        : '') +
      '</div>' +
      listHtml +
      '</div>';

    /* ans=1 时把全部答案块默认展开（仍可逐个收起） */
    if (showAnswer) {
      Array.prototype.forEach.call(mount.querySelectorAll('.q-answer[hidden]'), function (b) {
        b.removeAttribute('hidden');
      });
      Array.prototype.forEach.call(mount.querySelectorAll('[data-jump-answer]'), function (b) {
        b.textContent = '收起答案与详解 ↑';
        b.classList.remove('btn-primary');
      });
    }

    /* ---- 事件 ---- */
    function go(patch) {
      var next = {
        subject: subject, module: moduleId, point: pointId, type: type,
        q: keyword, real: realOnly ? '1' : '', ans: showAnswer ? '1' : ''
      };
      Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
      if (patch.subject !== undefined) { next.module = ''; next.point = ''; }
      var query = {};
      Object.keys(next).forEach(function (k) { if (next[k]) query[k] = next[k]; });
      KY.router.go('bank', { query: query });
    }

    mount.querySelector('#b-subject').addEventListener('change', function () { go({ subject: this.value }); });
    mount.querySelector('#b-module').addEventListener('change', function () { go({ module: this.value }); });
    mount.querySelector('#b-point').addEventListener('change', function () { go({ point: this.value }); });
    mount.querySelector('#b-type').addEventListener('change', function () { go({ type: this.value }); });
    mount.querySelector('#b-real').addEventListener('change', function () { go({ real: this.checked ? '1' : '' }); });
    mount.querySelector('#b-answer').addEventListener('change', function () { go({ ans: this.checked ? '1' : '' }); });
    mount.querySelector('#b-kw').addEventListener('input', U.debounce(function () { go({ q: this.value }); }, 400));

    mount.querySelector('#b-reset').addEventListener('click', function () {
      KY.router.go('bank', { query: {} });
    });

    var more = mount.querySelector('#b-more');
    if (more) {
      more.addEventListener('click', function () { shown += 40; KY.router.refresh(); });
    }

    mount.querySelector('#b-export').addEventListener('click', function () {
      U.downloadText('题库-' + U.fmtDate(Date.now()) + '.json',
        JSON.stringify({ questions: KY.bank.all(), papers: KY.bank.papers() }, null, 2));
      U.toast('已导出题库 JSON', 'success');
    });
  };
})(window);
