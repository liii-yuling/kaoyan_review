/*!
 * views/resources.js —— 资料库（使用者视角）
 * 路由： #/resources
 *
 * 运营者把网盘链接整理成分类清单发布出来，她在这里按科目/类型浏览、搜索、
 * 一键复制"链接 + 提取码"、点开跳转网盘。
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  /* 页面内的筛选状态 */
  var F = { subject: '', kind: '', keyword: '' };

  /* ================================================================== */

  /* 从链接里认 B站 BV 号 —— 认得出才能内嵌播放，认不出就只给外链 */
  function bvidOfUrl(url) {
    if (!url) return '';
    var m = String(url).match(/BV[0-9A-Za-z]{10}/);
    return m ? m[0] : '';
  }

  /** points 可能是 [{id,name}] 也可能是 ['名字']，统一取显示名 */
  function pointName(p) {
    if (!p) return '';
    return typeof p === 'string' ? p : (p.name || '');
  }

  function itemHtml(it) {
    var km = KY.resources.kindMeta(it.kind);
    var bvid = it.kind === 'video' ? bvidOfUrl(it.url) : '';
    var points = (it.points || []).map(pointName).filter(Boolean);
    var html = '';

    html += '<div class="res-item">';
    html += '<div class="res-head">';
    html += ui.tag(km.icon + ' ' + km.name, km.cls);
    if (it.provider) html += ui.tag(it.provider);
    if (it.duration) html += ui.tag(it.duration);
    if (it.subject) html += ui.subTag(it.subject);
    if (it.fromQr) html += ui.tag('扫码课');
    html += '<span class="spacer"></span>';
    if (it.code) {
      html += '<span class="res-code" data-copy-code="' + esc(it.id) + '" title="点击复制提取码">' +
        '提取码 <b>' + esc(it.code) + '</b></span>';
    }
    html += '</div>';

    /* 章节：二维码里没有章节信息，这个值是运营者填的或从页面文字认出来的 */
    if (it.chapter) {
      html += '<div class="res-chapter"><span class="res-chapter-lbl">章节</span>' +
        esc(it.chapter) + '</div>';
    }

    html += '<div class="res-title">' + esc(it.title) + '</div>';
    if (it.note) html += '<div class="res-note">' + esc(it.note) + '</div>';

    /* 重要知识点：来自题库考点关键词匹配 */
    if (points.length) {
      html += '<div class="res-points"><span class="res-points-lbl">重点</span>' +
        points.map(function (n) { return ui.tag(n, 'tag-brand'); }).join('') + '</div>';
    }

    html += '<div class="res-actions">';
    if (bvid) {
      html += '<button class="btn btn-sm btn-primary" data-play="' + esc(it.id) + '">▶ 在这里播放</button>';
    }
    html += '<a class="btn btn-sm' + (bvid ? '' : ' btn-primary') + '" href="' + esc(it.url) +
      '" target="_blank" rel="noopener">打开链接</a>';
    html += '<button class="btn btn-sm" data-copy-all="' + esc(it.id) + '">复制链接和提取码</button>';
    html += '<span class="res-url" title="' + esc(it.url) + '">' + esc(U.truncate(it.url, 46)) + '</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /**
   * 把一组条目按"模块"再分一层。
   * 没有模块信息的条目排最后，归到「其他」。
   * 顺序按 taxonomy 里模块的先后（马原→毛中特→史纲→思修→时政）。
   */
  function splitByModule(items, subject) {
    var map = Object.create(null);
    items.forEach(function (it) {
      var k = it.module || '';
      (map[k] || (map[k] = [])).push(it);
    });

    var order = (KY.getModules(subject) || []).map(function (m) { return m.id; });
    var keys = order.filter(function (id) { return map[id]; });
    var extra = Object.keys(map).filter(function (k) { return k && order.indexOf(k) < 0; });
    keys = keys.concat(extra);
    if (map['']) keys.push('');

    return keys.map(function (k) {
      return {
        module: k,
        name: k ? ((map[k][0] && map[k][0].moduleName) || k) : '其他',
        items: map[k]
      };
    });
  }

  /* ================================================================== */

  KY.views.resources = function (ctx, mount) {
    ui.setTitle('资料库');

    var q = ctx.query || {};
    if (q.subject !== undefined) F.subject = q.subject;
    if (q.kind !== undefined) F.kind = q.kind;
    if (q.q !== undefined) F.keyword = q.q;

    var meta = KY.resources.getMeta();
    var shared = KY.resources.getShared();
    var sum = KY.resources.summary();

    /* ---------- 还没发布任何资料 ---------- */
    if (!sum.count) {
      mount.innerHTML = '' +
        '<div class="hero">' +
        '<h2>资料库</h2>' +
        '<p>这里会放着运营者整理好的视频资料和文档资料，按科目分好类，点一下就能打开网盘。</p>' +
        '<div class="slogans">' +
        '<span>▶ 视频课程</span>' +
        '<span>▤ 讲义与卷子</span>' +
        '<span>🔑 提取码一键复制</span>' +
        '</div>' +
        '</div>' +
        ui.empty('还没有收到资料',
          '运营者还没发布资料库。等他整理好发布后，你刷新页面就会出现「有新版本」，点一下就能看到。',
          '<a class="btn" href="#/plan">去看今日计划</a> <a class="btn" href="#/review">先刷题</a>');
      return;
    }

    /* ---------- 筛选控件 ---------- */
    var kindOrder = ['video', 'doc', 'image', 'link'].filter(function (k) { return sum.byKind[k]; });
    var kindTabs = '<div class="segmented" id="res-kind">' +
      '<button class="' + (F.kind === '' ? 'on' : '') + '" data-kind="">全部（' + sum.count + '）</button>' +
      kindOrder.map(function (k) {
        var km = KY.resources.kindMeta(k);
        return '<button class="' + (F.kind === k ? 'on' : '') + '" data-kind="' + k + '">' +
          km.icon + ' ' + km.name + '（' + sum.byKind[k] + '）</button>';
      }).join('') + '</div>';

    var subjOrder = KY.SUBJECTS.filter(function (s) { return sum.bySubject[s]; });
    var hasUncategorized = !!sum.bySubject.none;
    var subjTabs = '<div class="segmented" id="res-subject">' +
      '<button class="' + (F.subject === '' ? 'on' : '') + '" data-sub="">全部科目</button>' +
      subjOrder.map(function (s) {
        return '<button class="' + (F.subject === s ? 'on' : '') + '" data-sub="' + s + '">' +
          KY.subjectName(s) + '（' + sum.bySubject[s] + '）</button>';
      }).join('') +
      (hasUncategorized ? '<button class="' + (F.subject === '__none' ? 'on' : '') +
        '" data-sub="__none">未分类（' + sum.bySubject.none + '）</button>' : '') +
      '</div>';

    /* ---------- 分组列表 ---------- */
    var groups = KY.resources.grouped({
      subject: F.subject === '__none' ? '' : F.subject,
      kind: F.kind,
      keyword: F.keyword
    });
    /* __none 只显示未分类 */
    if (F.subject === '__none') {
      groups = groups.filter(function (g) { return !g.subject; });
    }

    var listHtml = groups.length
      ? groups.map(function (g) {
        var gSum = g.items.reduce(function (a, x) {
          a.total++;
          a[x.kind] = (a[x.kind] || 0) + 1;
          a.min += (x.durationMin || 0);
          return a;
        }, { total: 0, min: 0 });
        return '<div class="card">' +
          '<div class="card-head">' +
          '<div><h3 class="card-title">' + (g.subject ? ui.subTag(g.subject) : '📁') + ' ' +
          esc(g.subjectName) + '</h3>' +
          '<p class="card-sub" style="margin:0">' + gSum.total + ' 条' +
          ['video', 'doc', 'image', 'link'].filter(function (k) { return gSum[k]; })
            .map(function (k) { return ' · ' + KY.resources.kindMeta(k).name + ' ' + gSum[k]; }).join('') +
          (gSum.min ? ' · 视频/音频总时长约 ' + Math.round(gSum.min / 60 * 10) / 10 + ' 小时' : '') +
          '</p></div>' +
          '</div>' +
          /* 有模块信息就按模块再分一层（政治视频课就是靠这个归到马原/毛中特/史纲…下面） */
          splitByModule(g.items, g.subject).map(function (mg) {
            if (!mg.module) return mg.items.map(itemHtml).join('');
            return '<div class="res-module">' +
              '<div class="res-module-head">' +
              '<span class="res-module-name">' + esc(mg.name) + '</span>' +
              '<span class="res-module-count">' + mg.items.length + ' 条</span>' +
              '</div>' +
              mg.items.map(itemHtml).join('') +
              '</div>';
          }).join('') +
          '</div>';
      }).join('')
      : ui.empty('没有符合条件的资料', '试试切换科目或类型，或者清空搜索词。',
        '<button class="btn" id="res-reset2">清空筛选</button>');

    /* ---------- 渲染 ---------- */
    mount.innerHTML = '' +
      '<div class="hero">' +
      '<h2>资料库</h2>' +
      '<p>' + (shared.note ? esc(shared.note) + '　' : '') +
      '运营者整理好的视频与文档资料，按科目分好类。点「打开链接」跳网盘，' +
      '提取码点一下就能复制。</p>' +
      '<div class="slogans">' +
      '<span>▦ 共 ' + sum.count + ' 条资料</span>' +
      (sum.byKind.video ? '<span>▶ 视频 ' + sum.byKind.video + ' 个</span>' : '') +
      (sum.byKind.doc ? '<span>▤ 文档 ' + sum.byKind.doc + ' 份</span>' : '') +
      (sum.videoMin ? '<span>⏱ 视频总时长约 ' + Math.round(sum.videoMin / 60 * 10) / 10 + ' 小时</span>' : '') +
      '<span>🎯 覆盖 ' + sum.subjects + ' 个科目</span>' +
      (meta.builtAt ? '<span>发布于 ' + esc(meta.builtAt) + '</span>' : '') +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="filters" style="margin-bottom:12px">' +
      subjTabs +
      '</div>' +
      '<div class="filters" style="margin-bottom:0">' +
      kindTabs +
      '<span class="spacer"></span>' +
      '<input type="search" id="res-kw" placeholder="搜索资料名称…" value="' + esc(F.keyword) + '">' +
      '<button class="btn btn-sm" id="res-reset">清空筛选</button>' +
      '</div>' +
      '</div>' +

      listHtml;

    /* ---------- 事件 ---------- */

    function go(patch) {
      var next = { subject: F.subject, kind: F.kind, q: F.keyword };
      Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
      var query = {};
      Object.keys(next).forEach(function (k) {
        if (next[k]) query[k === 'q' ? 'q' : k] = next[k];
      });
      KY.router.go('resources', { query: query });
    }

    mount.querySelector('#res-kind').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-kind]');
      if (!b) return;
      go({ kind: b.getAttribute('data-kind') });
    });

    mount.querySelector('#res-subject').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sub]');
      if (!b) return;
      go({ subject: b.getAttribute('data-sub') });
    });

    mount.querySelector('#res-kw').addEventListener('input', U.debounce(function () {
      go({ q: this.value });
    }, 400));

    function resetAll() {
      F = { subject: '', kind: '', keyword: '' };
      KY.router.go('resources', { query: {} });
    }
    mount.querySelector('#res-reset').addEventListener('click', resetAll);
    var r2 = mount.querySelector('#res-reset2');
    if (r2) r2.addEventListener('click', resetAll);

    /* 播放 / 复制提取码 / 复制全部 */
    mount.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;

      /* 就地播放：同一个条目再点一次收起，避免同时开一堆播放器 */
      var playBtn = t.closest('[data-play]');
      if (playBtn) {
        var pid = playBtn.getAttribute('data-play');
        var pit = KY.resources.all().filter(function (x) { return x.id === pid; })[0];
        var host = playBtn.closest('.res-item');
        if (!pit || !host) return;

        var opened = host.querySelector('.res-player');
        if (opened) {
          opened.parentNode.removeChild(opened);
          playBtn.textContent = '▶ 在这里播放';
          return;
        }
        var bv = bvidOfUrl(pit.url);
        if (!bv) { U.toast('这条链接里没有 B站 BV 号，无法内嵌播放，请用「打开链接」', 'error'); return; }
        var div = document.createElement('div');
        div.className = 'res-player';
        div.innerHTML = '<iframe src="' + esc(KY.video.embedUrlOf(bv)) +
          '" scrolling="no" frameborder="0" allowfullscreen="true" loading="lazy"></iframe>';
        host.appendChild(div);
        playBtn.textContent = '收起播放器';
        return;
      }

      var codeEl = t.closest('[data-copy-code]');
      if (codeEl) {
        var id1 = codeEl.getAttribute('data-copy-code');
        var it1 = KY.resources.all().filter(function (x) { return x.id === id1; })[0];
        if (it1 && it1.code) {
          U.copyText(it1.code).then(function () {
            U.toast('提取码已复制：' + it1.code, 'success');
          });
        }
        return;
      }

      var allBtn = t.closest('[data-copy-all]');
      if (allBtn) {
        var id2 = allBtn.getAttribute('data-copy-all');
        var it2 = KY.resources.all().filter(function (x) { return x.id === id2; })[0];
        if (it2) {
          U.copyText(KY.resources.copyText(it2)).then(function () {
            U.toast('已复制：标题 + 链接' + (it2.code ? ' + 提取码' : ''), 'success');
          });
        }
      }
    });

    void q;
  };
})(window);
