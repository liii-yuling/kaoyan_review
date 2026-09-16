/*!
 * server.js —— 零依赖静态服务器（可选）
 *
 * 为什么需要它：
 *   直接双击 index.html 也能用（file:// 模式），但部分浏览器在 file:// 下
 *   会限制 localStorage，导致数据刷新即丢。用这个服务器打开就完全没有这个问题。
 *
 * 用法：
 *   双击「启动.cmd」，或在本目录执行：  node server.js
 *   然后浏览器会自动打开 http://127.0.0.1:8788
 *
 * 只监听本机回环地址，不对外网开放。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const HOST = '127.0.0.1';
const START_PORT = 8788;
const MAX_PORT_TRIES = 20;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }, headers || {}));
  res.end(body);
}

function safeResolve(requestPath) {
  // 去掉查询串，解码，规范化，并确保不逃出 ROOT
  let p = decodeURIComponent(requestPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const abs = path.normalize(path.join(ROOT, p));
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  // 不用 url.parse（已弃用，且 Node 会打 DeprecationWarning）：
  // safeResolve 自己就会剥掉查询串
  const abs = safeResolve(req.url || '/');

  if (!abs) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.stat(abs, (err, stat) => {
    if (err) {
      send(res, 404,
        '<!DOCTYPE html><meta charset="utf-8"><title>404</title>' +
        '<body style="font-family:system-ui;padding:40px">' +
        '<h2>404 找不到文件</h2><p><code>' + (req.url || '') + '</code></p>' +
        '<p><a href="/">回到首页</a></p></body>',
        { 'Content-Type': 'text/html; charset=utf-8' });
      return;
    }

    const filePath = stat.isDirectory() ? path.join(abs, 'index.html') : abs;
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        send(res, 500, '读取文件失败：' + err2.message, { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
      }
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
      if (req.method === 'HEAD') {
        res.writeHead(200, headers);
        res.end();
        return;
      }
      send(res, 200, data, headers);
    });
  });
});

/**
 * 尝试打开浏览器。
 *
 * 这里刻意不用 exec：exec 会通过管道捕获子进程输出，在某些受限环境
 * （沙箱、企业策略）下会抛 EPERM，而且未捕获时会直接让整个服务进程崩掉。
 * 改用 spawn + stdio:'ignore' + detached，并挂上 error 处理——
 * 打开浏览器失败只是少一个便利功能，绝不该影响服务运行。
 */
function openBrowser(target) {
  try {
    const platform = process.platform;
    let cmd, args;
    if (platform === 'win32') {
      cmd = 'cmd';
      args = ['/c', 'start', '', target];
    } else if (platform === 'darwin') {
      cmd = 'open';
      args = [target];
    } else {
      cmd = 'xdg-open';
      args = [target];
    }

    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', (e) => {
      console.log('  （没能自动打开浏览器：' + (e && e.code ? e.code : e.message) +
        '，请手动访问上面的地址）');
    });
    child.unref();
  } catch (e) {
    console.log('  （没能自动打开浏览器，请手动访问上面的地址）');
  }
}

let port = START_PORT;
let tries = 0;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tries < MAX_PORT_TRIES) {
    tries++;
    port++;
    server.listen(port, HOST);
  } else {
    console.error('\n启动失败：' + err.message);
    console.error('请检查端口是否被占用，或改用其他方式打开 index.html。\n');
    process.exit(1);
  }
});

// 保持进程不因任何意外异常而静默退出
process.on('uncaughtException', (e) => {
  console.error('\n[server] 捕获到未处理异常（服务继续运行）：', e && e.message ? e.message : e);
});

server.listen(port, HOST, () => {
  const target = 'http://' + HOST + ':' + port + '/';
  console.log('');
  console.log('  考研定制化复习系统 已启动');
  console.log('  ─────────────────────────────────────');
  console.log('  访问地址： ' + target);
  console.log('  项目目录： ' + ROOT);
  console.log('');
  console.log('  要停止服务，请在这个窗口按 Ctrl+C 或直接关闭窗口。');
  console.log('  提示：数据保存在浏览器本地，换浏览器/清缓存都会丢，记得导出备份。');
  console.log('');

  // 仅在显式加 --open 时才尝试拉起浏览器（启动.cmd 会带这个参数）
  // 仅在显式加 --open 时才尝试拉起浏览器
  //   node server.js --open              打开首页
  //   node server.js --open=#/console    直接打开指定页面（运营台等）
  const openArg = process.argv.slice(2).find(function (a) { return a.indexOf('--open') === 0; });
  if (openArg) {
    const eq = openArg.indexOf('=');
    const suffix = eq > 0 ? openArg.slice(eq + 1) : '';
    openBrowser(target + suffix);
  }
});
