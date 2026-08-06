/* 公考工作台 · 一体化服务（前端托管 + 账号 + 跨设备同步）
 * 零运行时依赖，仅用 Node 内置模块。
 * 启动： node server-api.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 5173);
const DATA_DIR = path.join(root, '.data');
const DB_FILE = path.join(DATA_DIR, 'accounts.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- 账号库（JSON 文件） ---------- */
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { users: {} }; // users: { username: { salt, verifier, state, updatedAt } }
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db), 'utf-8');
}
let DB = loadDB();

/* ---------- 密码哈希（加盐） ---------- */
function hashPassword(pwd, salt) {
  return crypto.scryptSync(String(pwd), salt, 64).toString('hex');
}
function newSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/* ---------- 会话 token（签名） ---------- */
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');
function makeToken(username) {
  const body = Buffer.from(JSON.stringify({ u: username, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (sig !== expect) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.u || null;
  } catch {
    return null;
  }
}

/* ---------- 工具 ---------- */
function lanAddress() {
  try {
    const nets = os.networkInterfaces();
    for (const k in nets) {
      for (const n of nets[k] || []) {
        if (n.family === 'IPv4' && !n.internal) return n.address;
      }
    }
  } catch {}
  return '127.0.0.1';
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};
function sendJSON(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
function authUser(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const name = verifyToken(token);
  return name && DB.users[name] ? name : null;
}

/* ---------- API 路由 ---------- */
async function handleApi(req, res, url) {
  const p = url.pathname;

  // 注册
  if (p === '/api/register' && req.method === 'POST') {
    const { username, password } = await readBody(req);
    const u = String(username || '').trim();
    if (u.length < 2) return sendJSON(res, 400, { error: '用户名至少 2 个字符' });
    if (String(password || '').length < 4) return sendJSON(res, 400, { error: '密码至少 4 位' });
    if (DB.users[u]) return sendJSON(res, 409, { error: '该用户名已存在' });
    const salt = newSalt();
    DB.users[u] = { salt, verifier: hashPassword(password, salt), state: null, updatedAt: 0 };
    saveDB(DB);
    return sendJSON(res, 200, { token: makeToken(u), username: u });
  }

  // 登录
  if (p === '/api/login' && req.method === 'POST') {
    const { username, password } = await readBody(req);
    const u = String(username || '').trim();
    const rec = DB.users[u];
    if (!rec || rec.verifier !== hashPassword(password, rec.salt)) return sendJSON(res, 401, { error: '用户名或密码错误' });
    return sendJSON(res, 200, { token: makeToken(u), username: u });
  }

  // 以下均需登录
  const who = authUser(req);
  if (!who) return sendJSON(res, 401, { error: '未登录' });

  // 拉取云端状态
  if (p === '/api/state' && req.method === 'GET') {
    const rec = DB.users[who];
    return sendJSON(res, 200, { state: rec.state || null, updatedAt: rec.updatedAt || 0 });
  }

  // 返回本机局域网访问地址（供网页生成二维码）
  if (p === '/api/lan' && req.method === 'GET') {
    const host = req.headers['host'] || `localhost:${port}`;
    const lan = lanAddress();
    return sendJSON(res, 200, { lan: `http://${lan}:${port}`, host });
  }

  // 推送本地状态（全量覆盖云端）
  if (p === '/api/state' && req.method === 'PUT') {
    const { state, updatedAt } = await readBody(req);
    const rec = DB.users[who];
    // 简单冲突策略：以 updatedAt 较大者为准
    if (updatedAt && rec.updatedAt && updatedAt < rec.updatedAt) {
      return sendJSON(res, 409, { error: '云端版本更新，请先拉取', state: rec.state, updatedAt: rec.updatedAt });
    }
    rec.state = state;
    rec.updatedAt = Date.now();
    saveDB(DB);
    return sendJSON(res, 200, { ok: true, updatedAt: rec.updatedAt });
  }

  return sendJSON(res, 404, { error: 'not found' });
}

/* ---------- 前端静态托管 ---------- */
function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

/* ---------- 入口 ---------- */
http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url).catch(() => sendJSON(res, 400, { error: 'bad request' }));
    } else {
      serveStatic(req, res);
    }
  })
  .listen(port, () => {
    console.log(`公考工作台 → http://localhost:${port}`);
    console.log(`同步 API   → http://localhost:${port}/api/`);
  });
