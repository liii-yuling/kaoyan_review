/*!
 * auth.js —— 访问口令门（纯前端）
 * 挂载：KY.auth
 *
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *  ⚠ 请务必理解这个门的强度，不要高估它：
 *
 *  这个站没有服务器，所有验证都在浏览器里跑，代码也全部公开。
 *  所以它能做到的是：**挡住随手打开网址的人**（搜索引擎爬虫、误点链接的陌生人）。
 *  它做不到的是：挡住一个会按 F12 的人 —— 那种人可以直接改标志位进来。
 *
 *  真正的访问控制需要服务端，免费方案有两条（见 部署说明.md）：
 *    · Cloudflare Pages + Cloudflare Access（免费，真服务端鉴权，邮箱验证码）
 *    · 把仓库改成 Private（需要 GitHub Pro，付费）
 *
 *  本模块的作用是"防君子"，不是"防黑客"。
 * ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *
 * 设计要点：
 *   - 口令不存明文，只存 sha256(user \0 pass \0 salt)；源码和仓库里看不到密码
 *   - 登录凭据做成"令牌 = passHash"：运营者改了口令，旧令牌自然失效，所有人被重新拦下
 *   - 自带 SHA-256 实现（同步、支持中文），不依赖 crypto.subtle，
 *     这样 file:// 直接打开也能用（crypto.subtle 需要安全上下文）
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var TOKEN_KEY = 'authToken';

  /* ================================================================== */
  /* SHA-256（同步实现，自带自测向量见 tools/smoke-test.js）             */
  /* ================================================================== */

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  /** 字符串 → UTF-8 字节 */
  function utf8Bytes(str) {
    var s = String(str);
    if (typeof TextEncoder !== 'undefined') {
      try { return new TextEncoder().encode(s); } catch (e) { /* 走下面的兜底 */ }
    }
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var c2 = s.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63),
          0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return new Uint8Array(out);
  }

  function sha256Bytes(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    var l = bytes.length;
    var bitLen = l * 8;
    var withOne = l + 1;
    var total = withOne + (((56 - withOne % 64) + 64) % 64) + 8;

    var msg = new Uint8Array(total);
    msg.set(bytes);
    msg[l] = 0x80;

    var hi = Math.floor(bitLen / 0x100000000);
    var lo = bitLen >>> 0;
    msg[total - 8] = (hi >>> 24) & 0xff;
    msg[total - 7] = (hi >>> 16) & 0xff;
    msg[total - 6] = (hi >>> 8) & 0xff;
    msg[total - 5] = hi & 0xff;
    msg[total - 4] = (lo >>> 24) & 0xff;
    msg[total - 3] = (lo >>> 16) & 0xff;
    msg[total - 2] = (lo >>> 8) & 0xff;
    msg[total - 1] = lo & 0xff;

    var w = new Int32Array(64);
    for (var off = 0; off < total; off += 64) {
      var i;
      for (i = 0; i < 16; i++) {
        w[i] = (msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) |
          (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        var s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];

      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }

      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    var hex = '';
    for (var j = 0; j < 8; j++) {
      hex += ('00000000' + (H[j] >>> 0).toString(16)).slice(-8);
    }
    return hex;
  }

  function sha256(str) { return sha256Bytes(utf8Bytes(str)); }

  /* ================================================================== */
  /* 凭据                                                                */
  /* ================================================================== */

  var DEFAULT_SALT = 'kaoyan-review-v1';

  function config() {
    var c = KY.sharedAuth;
    if (!c || typeof c !== 'object') {
      return { enabled: false, user: '', passHash: '', salt: DEFAULT_SALT, title: '', hint: '' };
    }
    return {
      enabled: c.enabled !== false && !!(c.user && c.passHash),
      user: c.user || '',
      passHash: c.passHash || '',
      salt: c.salt || DEFAULT_SALT,
      title: c.title || '',
      hint: c.hint || ''
    };
  }

  /** 口令校验用的哈希：sha256(user \0 pass \0 salt) */
  function hashCred(user, pass, salt) {
    return sha256(String(user) + '\u0000' + String(pass) + '\u0000' + String(salt || DEFAULT_SALT));
  }

  function sameHash(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    // 定长比较，避免因为比较提前返回而泄露信息（对这个场景意义不大，但没坏处）
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    return diff === 0;
  }

  /* ================================================================== */
  /* 令牌（记住登录状态）                                                 */
  /* ================================================================== */

  function tokKey() { return 'ky.v1.' + TOKEN_KEY; }

  /** 取存储对象。sessionStorage 在部分环境（老浏览器、测试桩）可能不存在，所以必须容错 */
  function tokStore(session) {
    try {
      return session ? global.sessionStorage : global.localStorage;
    } catch (e) { return null; }
  }

  function readToken(session) {
    var s = tokStore(session);
    try { return s ? s.getItem(tokKey()) : null; }
    catch (e) { return null; }
  }

  /**
   * 写/清令牌。
   * 注意要同时管两个存储：否则「记住我」和「仅本次」两种状态会互相打架
   * （比如这次不勾记住，结果上次勾的令牌还在，照样免登录）。
   */
  function writeToken(val, session) {
    var primary = tokStore(session);
    var other = tokStore(!session);
    var okPrimary = false;
    try {
      if (val) {
        if (other) { try { other.removeItem(tokKey()); } catch (e1) { /* 忽略 */ } }
        if (primary) { primary.setItem(tokKey(), val); okPrimary = true; }
      } else {
        if (primary) { try { primary.removeItem(tokKey()); } catch (e2) { /* 忽略 */ } }
        if (other) { try { other.removeItem(tokKey()); } catch (e3) { /* 忽略 */ } }
        okPrimary = true;
      }
    } catch (e) {
      return false;
    }
    return okPrimary;
  }

  function isRequired() {
    var c = config();
    return !!(c.enabled && c.passHash);
  }

  /**
   * 令牌 = 当前 passHash。
   * 所以运营者一改口令，所有人手里的旧令牌自动作废、被重新拦下。
   */
  function isUnlocked() {
    if (!isRequired()) return true;
    var c = config();
    var t = readToken(false) || readToken(true);
    return sameHash(t, c.passHash);
  }

  /**
   * 尝试用账号口令解锁。
   * @returns {{ ok:Boolean, reason:String }}
   */
  function tryUnlock(user, pass, remember) {
    var c = config();
    if (!isRequired()) return { ok: true, reason: 'disabled' };
    if (!user || !pass) return { ok: false, reason: 'empty' };

    var h = hashCred(user, pass, c.salt);
    if (!sameHash(h, c.passHash)) {
      return { ok: false, reason: sameHash(user, c.user) ? 'badpass' : 'baduser' };
    }
    writeToken(c.passHash, remember === false);
    KY.bus.emit('auth:unlocked', { user: c.user });
    return { ok: true, reason: 'ok' };
  }

  function lock() {
    writeToken(null);
    KY.bus.emit('auth:locked', {});
  }

  /* ================================================================== */
  /* 导出（运营台改完账号后生成 auth.shared.js）                         */
  /* ================================================================== */

  function indent(obj, spaces) {
    var pad = new Array(spaces + 1).join(' ');
    return JSON.stringify(obj, null, 2).split('\n').map(function (line, i) {
      return i === 0 ? line : pad + line;
    }).join('\n');
  }

  function nowStamp() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /**
   * 生成 src/data/auth.shared.js
   * @param {Object} opts { enabled, user, pass, salt, title, hint }
   */
  function buildSharedJs(opts) {
    opts = opts || {};
    var salt = opts.salt || DEFAULT_SALT;
    var obj = {
      enabled: opts.enabled !== false,
      user: opts.user || '',
      salt: salt,
      passHash: opts.passHash || hashCred(opts.user || '', opts.pass || '', salt),
      title: opts.title || '',
      hint: opts.hint || ''
    };

    var header = [
      '/*!',
      ' * auth.shared.js —— 访问口令门（纯前端）',
      ' *',
      ' * 本文件由「运营台 → 访问口令」生成。',
      ' * 生成时间：' + nowStamp(),
      ' * 账号：' + (obj.user || '（未设置）'),
      ' *',
      ' * ⚠ 这个门只能挡住随手打开网址的人，挡不住会按 F12 的人。',
      ' *   原因：纯静态网站没有服务端，验证逻辑和代码全部公开。',
      ' *   需要真正的访问控制，请见 部署说明.md 里的 Cloudflare Access 方案。',
      ' *',
      ' * 口令不存明文，只存 sha256(账号 \\0 口令 \\0 盐)。',
      ' * 改口令时把本文件覆盖到 src/data/auth.shared.js 再发布即可；',
      ' * 一改口令，所有已登录的人都会被重新拦下。',
      ' */',
      '(function (global) {',
      "  'use strict';",
      '  var KY = (global.KY = global.KY || {});',
      ''
    ].join('\n');

    return header + '\n  KY.sharedAuth = ' + indent(obj, 2) + ';\n})(window);\n';
  }

  function buildSharedJson(opts) {
    opts = opts || {};
    var salt = opts.salt || DEFAULT_SALT;
    return JSON.stringify({
      type: 'kaoyan-shared-auth',
      version: 1,
      exportedAt: new Date().toISOString(),
      enabled: opts.enabled !== false,
      user: opts.user || '',
      salt: salt,
      passHash: opts.passHash || hashCred(opts.user || '', opts.pass || '', salt),
      title: opts.title || '',
      hint: opts.hint || ''
    }, null, 2) + '\n';
  }

  KY.auth = {
    /* 自测与工具 */
    sha256: sha256,
    sha256Bytes: sha256Bytes,
    utf8Bytes: utf8Bytes,
    hashCred: hashCred,
    DEFAULT_SALT: DEFAULT_SALT,

    /* 状态 */
    config: config,
    isRequired: isRequired,
    isUnlocked: isUnlocked,

    /* 动作 */
    tryUnlock: tryUnlock,
    lock: lock,

    /* 导出 */
    buildSharedJs: buildSharedJs,
    buildSharedJson: buildSharedJson
  };
})(window);
