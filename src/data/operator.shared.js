/*!
 * operator.shared.js —— 运营台口令（只有你能进管理界面）
 *
 * 初始运营口令： operator2027
 *   ⚠ 请你**第一次用完之后立刻改掉**（见下面"怎么改"）。
 *
 * 它和她的登录口令是**两套独立的**：
 *   · 她的登录口令（auth.shared.js，yxt123/yxt123）→ 打开网站用
 *   · 这个运营口令 → 只有你能进「运营台」，她不知道就打不开
 *
 * 怎么改：
 *   打开网站 → 运营台 → ① 首页那个「改运营口令」→ 填入新口令 → 导出 →
 *   用生成的文件覆盖本文件 → 双击「发布.cmd」。
 *   （也可以直接在运营台里点「改运营口令」，会下载新的 operator.shared.js）
 *
 * 口令不存明文，只存 sha256(账号 \0 口令 \0 盐)。
 *
 * ⚠ 强度说明：这是纯前端的门。网站没有服务端，代码公开，
 *   会按 F12 的人可以直接改浏览器的标志位进来。
 *   它能挡住"随手点进来"和"知道网址就想改口令"，挡不住会技术的人。
 *   要真正挡住，用下面两条之一：
 *     ① 发布时不把运营台打进 dist（tools/release.js --no-console）
 *     ② 上 Cloudflare Access（见 部署说明.md）
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  KY.sharedOperator = {
    "enabled": true,
    "user": "operator",
    "salt": "kaoyan-operator-v1",
    "passHash": "9ec54ed29d361141b1c4fd11b65be71fdd6161692854c0a47f2399ff6cdf2968",
    "hint": ""
  };
})(window);
