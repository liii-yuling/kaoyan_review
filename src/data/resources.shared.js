/*!
 * resources.shared.js —— 共享资料库（运营者维护，使用者查看）
 *
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *  这里放"视频资料"和"文档资料"的**入口**——也就是网盘链接，
 *  而不是把视频文件本身搬进仓库。
 *
 *  为什么不搬文件：
 *    GitHub 单个文件硬上限 100 MB，一集网课视频动辄 300 MB~1 GB，一集就超了；
 *    而且服务条款明确禁止把仓库当大文件存储/CDN 用，硬传会被限制甚至封号。
 *    放网盘链接：零上传、零等待、零成本、不超限。
 *
 *  怎么填（不用手写代码）：
 *    1. 打开网站的「运营台」→ ④ 资料库
 *    2. 按下面的格式粘贴你的网盘链接
 *    3. 点「导出资料库文件」→ 得到 resources.shared.js
 *    4. 用它覆盖本文件 → 双击「发布.cmd」→ 双击「推送.cmd」
 *
 *  文本格式（很简单）：
 *
 *    # 数学一
 *    视频 | 张宇高数基础班 第1讲 极限 | https://pan.baidu.com/s/1abc | 提取码: abcd | 45分钟 | 先看这个
 *    文档 | 高数讲义 第一章 | https://pan.baidu.com/s/1def | 提取码: 1234
 *    链接 | 考研数学公式大全 | https://example.com/formula
 *
 *    # 英语一
 *    视频 | 唐迟阅读基础 | https://pan.quark.cn/s/xyz
 *
 *  规则：
 *    · 以 # 或「科目:」单独一行 = 给后面所有条目设默认科目。
 *    · 每条一行，用 | 分段。第一段写类型（视频/文档/图片/链接），不写则按标题自动判断。
 *    · 必须有一段是 http/https 链接。
 *    · 「提取码: xxxx」「密码: xxxx」会被自动识别，她那边可以一键复制。
 *    · 「45分钟」「1小时20分」会被识别成时长。
 *    · 网盘平台（百度网盘/夸克/阿里云盘/天翼…）会根据链接自动识别并显示。
 *
 *  格式规范见 SCHEMA.md 第 13 节。
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  /** 资料条目；由「运营台」导出后覆盖本文件 */
  KY.sharedResources = KY.sharedResources || {
    updatedAt: '',
    note: '',
    items: []
  };

  /** 发布元信息 */
  KY.sharedResourcesMeta = KY.sharedResourcesMeta || {
    builtAt: '',
    count: 0,
    byKind: {},
    bySubject: {},
    source: 'empty'
  };
})(window);
