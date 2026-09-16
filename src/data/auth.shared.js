/*!
 * auth.shared.js —— 访问口令门（纯前端）
 *
 * 初始账号： yxt123
 * 初始密码： yxt123
 *
 * ⚠ 请务必理解这个门的强度：
 *   它只能挡住"随手打开网址的人"（爬虫、误点链接的陌生人）。
 *   挡不住会按 F12 的人 —— 纯静态网站没有服务端，验证逻辑和代码全部公开。
 *   真正的访问控制见 部署说明.md 里的 Cloudflare Access 方案。
 *
 * 改账号密码：打开网站的「运营台 → 访问口令」，填新账号密码，点导出，
 * 用生成的文件覆盖本文件，然后重新发布。**一改口令，所有人都会被重新拦下。**
 *
 * 口令不存明文，只存 sha256(账号 \0 口令 \0 盐)。
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  KY.sharedAuth = {
    "enabled": true,
    "user": "yxt123",
    "salt": "kaoyan-review-v1",
    "passHash": "597d4a02c5a7d1ffa37a8c5d5c08833c63a0d80b79a87c2a27789da0a67db7d3",
    "title": "考研复习系统",
    "hint": ""
  };
})(window);
