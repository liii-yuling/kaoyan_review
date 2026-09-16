/*!
 * video.js —— B站/视频详解链接适配（支持一题多讲）
 * 挂载：KY.video
 *
 * 原则（见 SCHEMA.md §7）：
 *  - 只有真实 BVID 才内嵌播放器；没有就退化为 B站搜索深链，绝不编造 BVID；
 *  - 一道题可以绑定多个视频（真题墙上叫"一题多讲"），因为同一个老师讲同一道题
 *    有好有坏，多绑几个让学生自己挑；
 *  - 绑定数据存本地（ky.v1.videoOverrides），一次绑定永久生效。
 *
 * 存储结构（向后兼容旧的单视频格式）：
 *   { "<questionId>": { list: [ { bvid, title } ] } }   ← 新
 *   { "<questionId>": { bvid, title } }                 ← 旧，读取时自动迁移
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var BVID_RE = /BV[0-9A-Za-z]{10}/;

  function overrides() {
    var v = KY.store.getVideoOverrides();
    return (v && typeof v === 'object') ? v : {};
  }

  /** 取出某题在覆盖表里的记录，统一成 { list: [...] } */
  function overrideList(qid) {
    var rec = overrides()[qid];
    if (!rec) return [];
    if (Array.isArray(rec.list)) {
      return rec.list.filter(function (x) { return x && x.bvid; });
    }
    if (rec.bvid) return [{ bvid: rec.bvid, title: rec.title || '' }];
    return [];
  }

  /**
   * 一道题的全部已绑定视频。
   * @returns {Array<{bvid:String, title:String, fromBank:Boolean}>}
   */
  function links(q) {
    if (!q) return [];
    var out = [];
    var seen = Object.create(null);

    overrideList(q.id).forEach(function (l) {
      if (seen[l.bvid]) return;
      seen[l.bvid] = 1;
      out.push({ bvid: l.bvid, title: l.title || '', fromBank: false });
    });

    // 题库文件里自带的首个视频（若没被覆盖）
    if (q.video && q.video.bvid && !seen[q.video.bvid]) {
      seen[q.video.bvid] = 1;
      out.push({ bvid: q.video.bvid, title: q.video.title || '', fromBank: true });
    }

    return out;
  }

  /** 写入整份列表（内部用） */
  function writeList(qid, list) {
    var v = overrides();
    if (!list.length) delete v[qid];
    else v[qid] = { list: list };
    KY.store.raw.set('videoOverrides', v);
    KY.bus.emit('video:changed', { questionId: qid });
  }

  /** 追加一个视频；重复返回 false */
  function addLink(qid, bvid, title) {
    var parsed = parseBvid(bvid);
    if (!parsed || !qid) return false;
    var list = overrideList(qid);
    if (list.some(function (l) { return l.bvid === parsed; })) return false;
    list.push({ bvid: parsed, title: title || '' });
    writeList(qid, list);
    return true;
  }

  function removeLink(qid, bvid) {
    var list = overrideList(qid).filter(function (l) { return l.bvid !== bvid; });
    writeList(qid, list);
    return true;
  }

  function setTitle(qid, bvid, title) {
    var list = overrideList(qid);
    var hit = false;
    list.forEach(function (l) { if (l.bvid === bvid) { l.title = title; hit = true; } });
    if (!hit) list.push({ bvid: bvid, title: title });
    writeList(qid, list);
    return list;
  }

  /* ---------------- 关键词 ---------------- */

  function queryOf(q) {
    var rec = overrides()[q && q.id];
    if (rec && rec.title) return rec.title;
    if (rec && Array.isArray(rec.list) && rec.list.length && rec.list[0].title) return rec.list[0].title;
    if (q && q.video && q.video.query) return q.video.query;
    var parts = [];
    if (q && q.source) parts.push(q.source);
    var kn = (q && q.knowledge || []).map(function (pid) {
      var n = KY.getTaxNode(pid);
      return n ? n.point.name : '';
    }).filter(Boolean);
    if (kn.length) parts.push(kn[0]);
    if (q && q.stem) parts.push(q.stem.slice(0, 30));
    return parts.join(' ') || (q ? q.id : '考研 讲解');
  }

  /* ---------------- 链接 ---------------- */

  function searchUrl(q) {
    return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(queryOf(q));
  }

  function embedUrlOf(bvid) {
    if (!bvid) return '';
    return 'https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(bvid) +
      '&page=1&high_quality=1&danmaku=0&autoplay=0';
  }

  function pageUrlOf(bvid) {
    return bvid ? ('https://www.bilibili.com/video/' + encodeURIComponent(bvid)) : '';
  }

  /** 仅用于兼容旧调用：首个已绑定视频的 bvid，没有则空 */
  function bvidOf(q) {
    var l = links(q);
    return l.length ? l[0].bvid : '';
  }

  /* ---------------- 渲染 ---------------- */

  /**
   * 生成"该题讲解"区块。
   * opts.embed 为 true 时，已绑定的视频直接内嵌播放器。
   */
  function renderBlock(q, opts) {
    opts = opts || {};
    var esc = KY.util.escapeHtml;
    var list = links(q);
    var bound = list.length > 0;
    var keyword = queryOf(q);
    var html = '';

    html += '<div class="video-block">';
    html += '<div class="video-head">';
    html += '<span class="video-badge' + (bound ? ' is-bound' : '') + '">' +
      (bound ? ('B站详解 · ' + list.length + ' 个视频') : 'B站详解（搜索）') + '</span>';
    html += '<span class="video-kw" title="搜索关键词">' + esc(keyword) + '</span>';
    html += '<span class="video-actions">';
    html += '<a class="btn btn-sm btn-ghost" href="' +
      esc(bound ? pageUrlOf(list[0].bvid) : searchUrl(q)) + '" target="_blank" rel="noopener">去 B站看</a>';
    html += '<a class="btn btn-sm btn-ghost" href="' + esc(searchUrl(q)) + '" target="_blank" rel="noopener">更多讲解</a>';
    html += '<button class="btn btn-sm btn-ghost" data-bind-video="' + esc(q.id) + '">' +
      (bound ? '管理视频' : '绑定视频') + '</button>';
    html += '</span>';
    html += '</div>';

    if (bound) {
      html += '<div class="video-list">';
      list.forEach(function (l, i) {
        html += '<div class="video-item">';
        html += '<div class="video-item-head">';
        html += '<span class="video-idx">视频 ' + (i + 1) + '</span>';
        html += '<span class="video-title">' + esc(l.title || l.bvid) + '</span>';
        html += '<span class="mono video-bvid">' + esc(l.bvid) + '</span>';
        html += '<a class="btn btn-sm btn-ghost" href="' + esc(pageUrlOf(l.bvid)) +
          '" target="_blank" rel="noopener">打开</a>';
        html += '<button class="btn btn-sm btn-ghost" data-video-toggle="' + esc(q.id) + '|' + esc(l.bvid) +
          '">' + (opts.embed ? '收起' : '内嵌播放') + '</button>';
        html += '</div>';
        if (opts.embed) {
          html += '<div class="video-frame"><iframe src="' + esc(embedUrlOf(l.bvid)) +
            '" scrolling="no" frameborder="0" framespacing="0" allowfullscreen="true" loading="lazy"></iframe></div>';
        }
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="video-hint">还没有绑定视频。点「绑定视频」粘贴 B站链接或 BV 号即可内嵌播放；' +
        '也可以先在 B站搜索里找一个讲得好的，再回来绑定。</div>';
    }

    html += '</div>';
    return html;
  }

  /* ---------------- 解析与校验 ---------------- */

  /** 从任意输入里抽出 BVID（整条链接也认） */
  function parseBvid(input) {
    var s = String(input || '').trim();
    if (!s) return '';
    var m = s.match(BVID_RE);
    return m ? m[0] : '';
  }

  /** 抽出输入里的全部 BVID（用于批量粘贴） */
  function parseBvids(input) {
    var s = String(input || '');
    var out = [];
    var re = /BV[0-9A-Za-z]{10}/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (out.indexOf(m[0]) < 0) out.push(m[0]);
    }
    return out;
  }

  /* ---------------- 交互 ---------------- */

  /**
   * 视频管理弹窗：查看已有、追加、删除、批量粘贴。
   */
  function manageVideos(q, onDone) {
    var esc = KY.util.escapeHtml;
    var list = links(q);

    function bodyHtml() {
      list = links(q);
      var rows = list.length ? list.map(function (l) {
        return '<div class="video-manage-row">' +
          '<span class="mono" style="flex:0 0 128px">' + esc(l.bvid) + '</span>' +
          '<span style="flex:1;min-width:0;font-size:12.5px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(l.title || '（无标题）') + '</span>' +
          '<button class="btn btn-sm btn-danger" data-vdel="' + esc(l.bvid) + '">删除</button>' +
          '</div>';
      }).join('') : '<div class="video-hint">该题还没有绑定任何视频。</div>';

      return '' +
        '<div class="hint-box" style="white-space:pre-wrap;font-size:12.5px">' +
        esc(KY.util.truncate(q.stem, 160)) + '</div>' +
        '<div style="font-size:12.5px;color:var(--text-3);margin-bottom:6px">已绑定 ' + list.length + ' 个视频（一题多讲）</div>' +
        rows +
        '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">' +
        '<label class="field"><span class="lbl">粘贴 B站 链接或 BV 号（可以一次粘多个，自动全部识别）</span>' +
        '<textarea id="vm-input" rows="4" placeholder="https://www.bilibili.com/video/BV1xx411c7mD&#10;BV1yy411c7mE&#10;也可以直接粘贴一整段带多个链接的文字"></textarea>' +
        '<span class="hint">识别规则：BV 号 + 10 位字符。识别不到的会被跳过，不会瞎猜。</span></label>';
    }

    var m = KY.ui.modal({
      title: '该题的视频讲解',
      body: bodyHtml(),
      footer: '<button class="btn" data-modal-close>关闭</button>' +
        '<button class="btn btn-primary" id="vm-add">添加视频</button>',
      onMount: function (mask, close) {
        function refresh() {
          mask.querySelector('.modal-body').innerHTML = bodyHtml();
        }

        mask.querySelector('#vm-add').addEventListener('click', function () {
          var raw = mask.querySelector('#vm-input').value;
          var bvids = parseBvids(raw);
          if (!bvids.length) {
            // 用户可能只想要一条搜索链接
            KY.util.toast('没有识别出有效的 BV 号（形如 BV1xx411c7mD）', 'error');
            return;
          }
          var n = 0;
          bvids.forEach(function (b) { if (addLink(q.id, b, '')) n++; });
          KY.util.toast(n ? ('已绑定 ' + n + ' 个视频') : '这些视频之前已经绑定过了', n ? 'success' : 'info');
          refresh();
          if (typeof onDone === 'function') onDone();
        });

        mask.addEventListener('click', function (e) {
          var d = e.target.closest && e.target.closest('[data-vdel]');
          if (!d) return;
          removeLink(q.id, d.getAttribute('data-vdel'));
          KY.util.toast('已删除该视频绑定', 'success');
          refresh();
          if (typeof onDone === 'function') onDone();
        });

        void close;
      }
    });
    void m;
  }

  /** 兼容旧 API：单视频提示绑定（内部转向管理弹窗） */
  function promptBind(q, onDone) {
    manageVideos(q, onDone);
  }

  /* ---------------- 全局事件委托 ---------------- */

  KY.bindVideoDelegation = function () {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      /* 绑定 / 管理视频 */
      var btn = t.closest('[data-bind-video]');
      if (btn) {
        e.preventDefault();
        var qid = btn.getAttribute('data-bind-video');
        var q = KY.bank.get(qid);
        if (!q) {
          var w = KY.store.getWrongbook().filter(function (x) { return x.id === qid; })[0];
          if (w) q = { id: w.id, stem: w.stem, source: w.source, knowledge: w.knowledge, video: w.video };
        }
        if (!q) { KY.util.toast('找不到该题目', 'error'); return; }
        manageVideos(q, function () { KY.router.refresh(); });
        return;
      }

      /* 单个视频的内嵌/收起切换 */
      var tg = t.closest('[data-video-toggle]');
      if (tg) {
        e.preventDefault();
        var parts = tg.getAttribute('data-video-toggle').split('|');
        openVideoInline(parts[0], parts[1]);
      }
    });
  };

  /** 在按钮下方就地展开播放器（不改变全局设置） */
  function openVideoInline(qid, bvid) {
    var wrap = document.querySelector('[data-inline-video="' + qid + '"]');
    var host = document.querySelector('[data-video-toggle="' + qid + '|' + bvid + '"]');
    if (!host) return;
    var item = host.closest ? host.closest('.video-item') : null;
    if (!item) return;

    var existing = item.querySelector('.video-frame');
    if (existing) {
      existing.parentNode.removeChild(existing);
      host.textContent = '内嵌播放';
      return;
    }
    var div = document.createElement('div');
    div.className = 'video-frame';
    div.innerHTML = '<iframe src="' + embedUrlOf(bvid) +
      '" scrolling="no" frameborder="0" framespacing="0" allowfullscreen="true" loading="lazy"></iframe>';
    item.appendChild(div);
    host.textContent = '收起';
    void wrap;
  }

  KY.video = {
    /* 数据 */
    links: links,
    addLink: addLink,
    removeLink: removeLink,
    setTitle: setTitle,
    hasBvid: function (q) { return links(q).length > 0; },
    isBound: function (q) { return links(q).length > 0; },
    count: function (q) { return links(q).length; },
    bvid: bvidOf,

    /* 链接 */
    searchUrl: searchUrl,
    embedUrl: function (q) { var l = links(q); return l.length ? embedUrlOf(l[0].bvid) : ''; },
    embedUrlOf: embedUrlOf,
    pageUrl: function (q) { var l = links(q); return l.length ? pageUrlOf(l[0].bvid) : searchUrl(q); },
    pageUrlOf: pageUrlOf,
    label: function (q) { var l = links(q); return l.length ? ('B站详解 · ' + l.length + ' 个') : 'B站搜详解'; },

    /* 解析 */
    parseBvid: parseBvid,
    parseBvids: parseBvids,

    /* 渲染与交互 */
    renderBlock: renderBlock,
    manageVideos: manageVideos,
    promptBind: promptBind,
    openVideoInline: openVideoInline
  };
})(window);
