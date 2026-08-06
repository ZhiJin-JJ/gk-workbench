/* 生成手机访问二维码（纯 Node，依赖 qrcode 包）
 * 用法： node qrcode.mjs [port]
 */
import qrcode from 'qrcode';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 5173);

function lanIP() {
  try {
    const out = execSync('ipconfig', { encoding: 'utf-8' });
    const m = out.match(/IPv4[^:]*:\s*([\d.]+)/);
    if (m) return m[1];
  } catch {}
  const nets = os.networkInterfaces();
  for (const k in nets) {
    for (const n of nets[k] || []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return '127.0.0.1';
}

const ip = lanIP();
const url = `http://${ip}:${port}`;
const outFile = path.join(root, '手机访问二维码.png');

try {
  await qrcode.toFile(outFile, url, { width: 360, margin: 2 });
  console.log('✓ 二维码已生成：' + outFile);
  console.log('  手机扫码打开：' + url);
} catch (e) {
  console.error('生成二维码失败（请先 npm install qrcode）：', e.message);
  process.exit(1);
}
