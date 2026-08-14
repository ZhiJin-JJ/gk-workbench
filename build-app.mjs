/* 构建前端产物到 dist/（供 Capacitor 打包用）
 * 仅做静态拷贝：index.html + css/ + js/ + 图标 + manifest + sw
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

const FILES = [
  'index.html',
  'js/config.js',
  '.nojekyll',
  'favicon.svg',
  'manifest.webmanifest',
  'sw.js',
  'css/base.css',
  'css/pages.css',
  'js/util.js',
  'js/store.js',
  'js/sync.js',
  'js/media.js',
  'js/asr.js',
  'js/ui.js',
  'js/charts.js',
  'js/widgets.js',
  'js/qrcode.min.js',
  'js/app.js',
  'js/pages/home.js',
  'js/pages/modules.js',
  'js/pages/mistakes.js',
  'js/pages/review.js',
  'js/pages/checkin.js',
  'js/pages/papers.js',
  'js/pages/settings.js',
];

// 需要递归复制的目录
const DIRS = [];

function copyFile(rel) {
  const src = path.join(root, rel);
  const dst = path.join(dist, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(rel) {
  const src = path.join(root, rel);
  const dst = path.join(dist, rel);
  if (!fs.existsSync(src)) return;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const out = path.join(dst, path.relative(src, full));
      if (e.isDirectory()) { fs.mkdirSync(out, { recursive: true }); walk(full); }
      else { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(full, out); }
    }
  }
  walk(src);
}

fs.rmSync(dist, { recursive: true, force: true });
FILES.forEach(copyFile);
DIRS.forEach(copyDir);
console.log(`✓ 已构建到 dist/（${FILES.length} 文件 + ${DIRS.join(',')} 目录）`);
