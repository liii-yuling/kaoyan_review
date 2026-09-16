/*!
 * views/help.js —— 使用说明
 * 路由： #/help
 */
(function (global) {
  'use strict';
  var KY = global.KY;
  var U = KY.util, ui = KY.ui, esc = U.escapeHtml;

  KY.views = KY.views || {};

  KY.views.help = function (ctx, mount) {
    ui.setTitle('使用说明');

    var isPersistent = KY.store.persistent();

    mount.innerHTML = '' +
      (isPersistent ? '' :
        '<div class="hint-box err"><b>重要：</b>当前浏览器不允许本地存储（常见于无痕模式或某些安全设置），' +
        '刷新页面数据就会丢失。请到「设置与备份」导出备份，或改用普通窗口打开。</div>') +

      '<div class="card">' +
      '<h3 class="card-title">三分钟上手</h3>' +
      '<ol style="font-size:14px;line-height:2.1;padding-left:22px;margin:0">' +
      '<li><b>设置档案</b>：到「设置与备份」填姓名、目标院校、考试日期，首页会出现倒计时。</li>' +
      '<li><b>上传错题</b>：进「错题本 → 上传错题」，拍照截图（自动 OCR）或直接粘贴文字。' +
      '系统会用本地规则引擎把题目归类到具体考点，判定错因（概念不清 / 公式记错 / 计算失误 / 审题偏差…），' +
      '并生成错因总结与改进建议。<b>保存前请核对考点</b>——你的修正直接决定后面推题的准确度。</li>' +
      '<li><b>定制推送</b>：「定制化推送」页面按你掌握度最低的考点出题，做完立刻判分、更新掌握度，' +
      '答错的题一键进错题本。</li>' +
      '<li><b>看真题 + 视频</b>：「历年真题（英语一）」是真题墙。每道题答案默认收起，' +
      '点题目下方的「<b>查看答案与详解 ↓</b>」就会展开正确答案、解析、考点与 B站视频，并自动滚到该处。</li>' +
      '<li><b>模考</b>：「考试模式」选一套真题或智能组卷，限时作答，到点自动交卷，' +
      '客观题立即判分，主观题按评分要点自评。</li>' +
      '<li><b>导入自己的题库</b>：「题库导入」页支持 Excel/CSV 与 JSON，考点可以留空让系统自动归类。</li>' +
      '<li><b>看资料</b>：「资料库」页放着运营者整理的网盘视频和讲义，提取码点一下就能复制。</li>' +
      '</ol>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">资料库：视频为什么不放在站里</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '站里的「资料库」放的是<b>网盘链接入口</b>，不是视频文件本身。这是硬限制决定的：</p>' +
      '<table class="tbl"><thead><tr><th>限制</th><th>数值</th></tr></thead><tbody>' +
      '<tr><td><b>单个文件上限</b></td><td><b>100 MB</b>（GitHub 硬性）</td></tr>' +
      '<tr><td>仓库建议大小</td><td>&lt; 1 GB</td></tr>' +
      '<tr><td>服务条款</td><td>禁止把仓库当大文件存储 / CDN 用</td></tr>' +
      '</tbody></table>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2);margin-top:12px">' +
      '一集 45 分钟的考研网课通常 300 MB ~ 1 GB，<b>一集就超了</b>。' +
      '所以视频留在网盘，站里只放链接——零上传、零等待、不超限。</p>' +
      '<div class="hint-box">' +
      '运营者在「运营台 → ④ 资料库」里粘贴网盘链接，系统会自动识别' +
      '<b>科目、类型、网盘平台、提取码、时长</b>；她在「资料库」页按科目浏览，' +
      '提取码点一下就能复制。' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">登录门挡得住什么（重要）</h3>' +
      '<table class="tbl"><thead><tr><th>✅ 挡得住</th><th>❌ 挡不住</th></tr></thead><tbody>' +
      '<tr><td>搜索引擎爬虫</td><td>会按 F12 打开开发者工具的人</td></tr>' +
      '<tr><td>误点链接的陌生人</td><td>直接读源码的人（仓库是公开的）</td></tr>' +
      '<tr><td>随便试网址的人</td><td>手动改浏览器存储的人</td></tr>' +
      '</tbody></table>' +
      '<div class="hint-box warn" style="margin-top:14px">' +
      '<b>为什么挡不住：</b>这个网站没有服务器，所有验证都在浏览器里跑，代码全部公开。' +
      '口令只是比对了一个哈希值，懂技术的人可以直接绕过。<br>' +
      '<b>纯前端的"注册"也没有意义</b>——任何人都能注册就等于没有门。' +
      '所以这里只做"固定账号 + 口令"。<br>' +
      '需要<b>真正</b>的访问控制（未登录连网页文件都拿不到），用 ' +
      '<b>Cloudflare Access</b>（免费）或把仓库改成 Private（付费）。详见 <code>部署说明.md</code>。' +
      '</div>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '改口令在「运营台 → ⑤ 访问口令」。<b>一改口令，所有已登录设备都会被重新拦下</b>，' +
      '需要用新口令重新登录。口令不存明文，只存 sha256。</p>' +
      '</div>' +

      '<div class="grid grid-2">' +
      '<div class="card">' +
      '<h3 class="card-title">题库导入怎么用</h3>' +
      '<ol style="font-size:13.5px;line-height:1.95;color:var(--text-2);padding-left:22px">' +
      '<li>点「题库导入 → 下载 CSV 模板」，用 Excel 打开。模板里已有 4 道示例题，照着填空即可。</li>' +
      '<li>一行一道题。<b>每道题都必须有答案</b>——没答案的行会被拦下来并告诉你错在哪。</li>' +
      '<li>「考点」列可以留空，系统会用归类引擎自动判定，并明确标出"这是自动归类的，请核对"。</li>' +
      '<li>Excel 保存时选「CSV UTF-8（逗号分隔）」，否则中文会乱码。</li>' +
      '<li>回到页面点「解析并预览」，会逐行告诉你：这一行能不能导、自动补了什么、哪一行有问题。</li>' +
      '<li>确认无误后点「导入」，题目立刻进入题库，参与推题、组卷和考试。</li>' +
      '</ol>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '带年份的真题（「年份」列填 4 位数字）会<b>自动进入真题墙</b>，按板块汇编成套卷。' +
      '「B站视频」列填 BV 号，导入时自动完成视频绑定。</p>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">答案跳转与一题多讲</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '题库与真题页面的每道题，答案都<b>默认收起</b>，题目下方有一个「<b>查看答案与详解 ↓</b>」按钮。' +
      '点一下就会展开正确答案、完整解析、考点标签和视频入口，并把页面滚到答案位置；再点一次收起。' +
      '套卷页右上角还有「展开全部答案 / 收起全部答案」批量开关。</p>' +
      '<div class="hint-box warn">' +
      '<b>考试模式与练习作答中不会渲染任何答案</b>——不是藏起来，是根本不在页面里，' +
      '所以不可能通过"查看网页源代码"提前看到答案。' +
      '</div>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '<b>一题多讲：</b>同一道题可以绑定多个 B站讲解视频（不同老师讲法不同，自己挑）。' +
      '进入方式：题目 → 查看答案与详解 → 答案块里的「管理视频」，粘贴 BV 号即可，一次可粘多个。' +
      '要批量绑定，去「设置与备份 → 视频绑定管理 → 批量导入链接」，每行写「题目 ID 或题干关键词 + BV 号」。' +
      '</p>' +
      '</div>' +
      '</div>' +
      '<div class="card">' +
      '<h3 class="card-title">错题本是怎么"认出"你的错题类型的</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '系统内置了一棵覆盖四科的<b>考点知识树</b>（当前 ' + Object.keys(KY.taxIndex).length + ' 个考点），' +
      '每个考点都带一组特征词。归类时：</p>' +
      '<ol style="font-size:13.5px;line-height:1.95;color:var(--text-2);padding-left:22px">' +
      '<li>先用学科特征词判定属于哪一科（如出现 δ(t)、卷积、极点 → 信号与系统）；</li>' +
      '<li>再用考点特征词打分，取得分最高的 1~2 个考点；</li>' +
      '<li>错因判定结合三方面：你写的备注、你的作答与正确答案的差异、题型（多选漏选偏审题，多选多选偏概念…）；</li>' +
      '<li>最后按考点 + 错因生成针对性的错因总结与改进建议。</li>' +
      '</ol>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '如果你想让它更聪明，可以在「设置」里开启 <b>AI 增强</b> 并填入接口 Key，' +
      '系统会在本地判定结果之上再做大模型纠错——但本地引擎始终兜底，断网也能用。</p>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">推题是怎么算出来的</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">每道题的推送优先级：</p>' +
      '<div class="hint-box" style="font-family:ui-monospace,monospace;font-size:12.5px">' +
      '优先级 = (1 − 掌握度) × 真题加权 × 难度匹配 × 新鲜度 × 随机抖动' +
      '</div>' +
      '<ul style="font-size:13.5px;line-height:1.95;color:var(--text-2);padding-left:22px">' +
      '<li><b>掌握度</b>：初始 35%；答对 +25% 的剩余空间，答错 −35%；错题本新增该考点错题再 −10%。</li>' +
      '<li><b>真题加权</b>：标注了年份的真题权重 ×1.35。</li>' +
      '<li><b>难度匹配</b>：向你的薄弱考点题目平均难度靠拢。</li>' +
      '<li><b>新鲜度</b>：做过的题降权；做错过的题随时间回升（间隔重复）。</li>' +
      '<li>选题时还会限制"每个考点最多 2 题、单个板块不超过一半"，避免一份练习全挤在一个点上。</li>' +
      '</ul>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">数据安全与备份</h3>' +
      '<div class="hint-box">' +
      '<b>所有数据只存在你自己的浏览器里</b>（localStorage），不上传任何服务器。' +
      '这也意味着：<b>换浏览器、换电脑、清理浏览器数据都会丢</b>。' +
      '<br>请养成习惯：每周到「设置与备份 → 导出完整备份」存一份 JSON 文件。' +
      '换设备时用「导入并合并」恢复。' +
      '</div>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '当前存储引擎：<code>' + esc(KY.store.backend()) + '</code>' +
      (isPersistent ? '（刷新后保留数据）' : '（<b style="color:var(--err)">临时存储，刷新即丢</b>）') +
      '</p>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">题库分三层：个人题 vs 共享题（很重要）</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '你在「题库导入」页点「导入这 N 题」时，题目只进了<b>你自己浏览器的本地存储</b>——' +
      '对方是拿不到的。这是有意的：每个人可以有自己的一套题。' +
      '如果你想让题库也同步给对方，必须走<b>共享题库</b>。</p>' +
      '<table class="tbl"><thead><tr><th>层</th><th>存在哪</th><th>对方能看到吗</th><th>怎么改</th></tr></thead><tbody>' +
      '<tr><td>内置题库</td><td>程序文件 <code>src/data/bank.*.js</code></td><td>✅</td><td>改源码后重新发布</td></tr>' +
      '<tr><td><b>共享题库</b></td><td>程序文件 <code>src/data/bank.shared.js</code></td>' +
      '<td>✅ <b>刷新页面就拿到</b></td><td>导入页导出后重新发布</td></tr>' +
      '<tr><td>个人题库</td><td>你自己浏览器</td><td>❌</td><td>导入页直接导入</td></tr>' +
      '</tbody></table>' +
      '<div class="hint-box" style="margin-top:14px">' +
      '<b>合并优先级：内置题 &gt; 共享题 &gt; 个人题。</b>' +
      '<br>· 想<b>更新</b>你以前发布过的共享题：保持题目 id 不变，重新导出发布即可，对方会拿到新版。' +
      '<br>· <b>覆盖不了内置题</b>：内置优先级最高，共享题库里与内置题同 id 的题不会生效。' +
      '<br>· 你自己浏览器里如果有同 id 的个人副本，会被共享版覆盖，不会重复出现。' +
      '</div>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '<b>发布共享题库的两条路：</b><br>' +
      '<b>A（推荐）</b>「题库导入」→ 上传 → 解析并预览 → 点「导出为共享题库文件」→ ' +
      '覆盖 <code>src/data/bank.shared.js</code> → 双击 <code>发布.cmd</code> → 上传 dist。' +
      '<br><b>B</b>「题库导入」→ 点「导出 JSON 到项目根目录」→ 把 <code>共享题库.json</code> ' +
      '放到项目根目录 → 双击 <code>发布.cmd</code>（脚本会自动转换）。' +
      '</p>' +
      '<div class="hint-box warn">' +
      '<b>注意 id 不要重复：</b>共享题库里如果有题目的 id 和内置题一样，那道题会<b>静默失效</b>' +
      '（内置优先）。系统会在「题库导入」页和「设置」页弹红色警告列出冲突的 id——' +
      '看到警告就改个 id（建议加 <code>my-</code> 前缀）再发布。' +
      '</div>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '<b>对方的数据会受什么影响？</b>不受影响。他的错题本、掌握度、练习与考试记录' +
      '是按<b>考点</b>关联的，不是按具体题目，所以更新题库不会清掉他的数据。</p>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">这个站是"一个人维护、一个人使用"的</h3>' +
      '<table class="tbl"><thead><tr><th></th><th>运营者（维护的人）</th><th>使用者（复习的人）</th></tr></thead><tbody>' +
      '<tr><td>主要页面</td><td><b>运营台</b> <code>#/console</code></td><td><b>今日计划</b> <code>#/plan</code></td></tr>' +
      '<tr><td>做什么</td><td>上传题库、写每日计划、挑错题推送、安排考试</td>' +
      '<td>按计划刷题、打勾、收下布置的错题、自己做模考</td></tr>' +
      '<tr><td>看得到对方的私人数据吗</td><td>❌ 看不到</td><td>❌ 看不到</td></tr>' +
      '</tbody></table>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2);margin-top:14px">' +
      '<b>三条"我 → 她"的通道</b>（都在运营台里，导出后跟代码一起发布）：</p>' +
      '<ol style="font-size:13.5px;line-height:1.95;color:var(--text-2);padding-left:22px">' +
      '<li><b>共享题库</b>：我上传的题 → 她刷新就能刷到；</li>' +
      '<li><b>每日计划</b>：我手写每天的任务 → 她看到并逐项打勾，刷题/考试任务一键跳转；</li>' +
      '<li><b>错题推送</b>：我挑几道题 + 写一句提醒 → 她一键收进自己的错题本。</li>' +
      '</ol>' +
      '<div class="hint-box warn">' +
      '<b>为什么数据不是双向的：</b>她的错题本、掌握度、打勾进度、考试成绩都在<b>她自己的浏览器</b>里，' +
      '运营者碰不到。这是"免费、不租服务器"的必然结果——没有数据库就没有双向同步。<br>' +
      '想了解她的情况：让她「设置与备份 → 导出完整备份」把 JSON 发过来，' +
      '运营者在自己浏览器里「导入并合并」就能看到全部数据。' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">怎么往里加题 / 加功能</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' +
      '整个项目是纯前端、零依赖的经典脚本结构，用记事本就能改。</p>' +
      '<table class="tbl"><thead><tr><th>想做什么</th><th>改哪里</th></tr></thead><tbody>' +
      '<tr><td>加题目（不碰代码）</td><td>「题库导入」页，用 CSV/Excel 或 JSON 导入，考点可留空自动归类</td></tr>' +
      '<tr><td>加题目（写进源码）</td><td>按 <code>SCHEMA.md</code> 的格式往 <code>src/data/bank.&lt;科目&gt;.js</code> 的数组里追加</td></tr>' +
      '<tr><td>加考点</td><td><code>src/data/taxonomy.js</code> 里对应模块的 <code>points</code> 数组，填上特征词</td></tr>' +
      '<tr><td>加真题套卷</td><td>给题目加 <code>year</code> 字段即可，套卷自动按年份/板块汇编（<code>src/data/papers.shared.js</code>）</td></tr>' +
      '<tr><td>绑定讲解视频</td><td>题目 → 查看答案与详解 → 管理视频；或「设置 → 视频绑定管理 → 批量导入链接」</td></tr>' +
      '<tr><td>加新科目</td><td>taxonomy 加一门 + <code>src/data/bank.新科目.js</code> + <code>index.html</code> 加一行 script</td></tr>' +
      '<tr><td>加新页面</td><td>在 <code>src/ui/views/</code> 新建文件，注册到 <code>KY.views</code>，再到 <code>src/ui/app.js</code> 的 <code>registerRoutes()</code> 加一行</td></tr>' +
      '<tr><td>校验题库格式</td><td>命令行运行 <code>node tools/validate.js</code></td></tr>' +
      '</tbody></table>' +
      '<div class="hint-box ok" style="margin-top:14px">' +
      '所有模块之间只通过 <code>KY.&lt;模块名&gt;</code> 全局对象通信，没有打包工具、没有框架耦合，' +
      '新功能可以完全独立地作为一个新模块加进来。' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h3 class="card-title">常见问题</h3>' +
      '<dl class="detail-list">' +
      '<dt>图片识别不出来</dt><dd>OCR 对模糊截图和手写体效果有限。尽量用清晰的屏幕截图；' +
      '或在设置里改用「API 模式」接视觉大模型；实在不行直接粘贴文字，效果一样。</dd>' +
      '<dt>B站视频是搜索页</dt><dd>因为真实视频链接会失效，所以默认走搜索。' +
      '点题目 →「查看答案与详解」→ 答案块里的「管理视频」，粘贴你在看的 BV 号（可一次多个，' +
      '一道题可以绑多个老师），之后就会直接内嵌播放，永久生效。</dd>' +
      '<dt>导入题库时提示"没有答案"</dt><dd>这是有意的拦截：<b>每道题都必须有答案</b>，' +
      '没答案的题在系统里没有意义（判分、错题本、推题全都依赖答案）。请在「答案」列补上再导一次。' +
      '每行的问题都会明确写在预览列表里，告诉你错在哪。</dd>' +
      '<dt>导入后中文变乱码</dt><dd>Excel 默认存成 GBK。请选「CSV UTF-8（逗号分隔）」重新保存。' +
      '系统已经按 UTF-8 读取，并且导出的模板自带 BOM，Excel 打开不会乱码。</dd>' +
      '<dt>怎么让对方拿到我的更新</dt><dd>把网站部署到免费静态托管（见根目录 <code>部署说明.md</code>），' +
      '以后改完双击 <code>发布.cmd</code>，再把 <code>dist</code> 里的内容重新上传。' +
      '对方刷新页面时顶部会自动弹出「有新版本可用」提示条，点一下就是新版；' +
      '他的错题与掌握度存在本机浏览器里，刷新不会丢。</dd>' +
      '<dt>为什么不能直接把我电脑上的网址发给他</dt><dd>本地服务监听的是 <code>127.0.0.1</code>，' +
      '这个地址在别人电脑上指的是他自己那台机器，所以打不开；' +
      '而且你一关机服务就停了。要"我电脑关了对方也能用"，文件必须放在第三方托管上。</dd>' +
      '<dt>考点归类不准</dt><dd>点错题卡片上的「查看 / 修正归类」手动改考点和错因，改完掌握度与推题都会跟着变。' +
      '归类不准通常是因为题干里的特征词太少，可以把解析也一起粘进去。</dd>' +
      '<dt>真题卷不是完整原卷</dt><dd>英语一的套卷是按年份把题库里的真题汇编成的<b>精练卷</b>，' +
      '不是考场完整原卷（原卷每套 52 题）。卷子里有几道题就显示几道，标注得很清楚。' +
      '后续往题库补题，套卷会自动变长。</dd>' +
      '<dt>刷新后数据没了</dt><dd>可能是无痕模式或浏览器禁用了本地存储。' +
      '看左下角是否显示"临时存储模式"，并尽快导出备份。</dd>' +
      '</dl>' +
      '</div>';
  };
})(window);
