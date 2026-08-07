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

function copy(rel) {
  const src = path.join(root, rel);
  const dst = path.join(dist, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

fs.rmSync(dist, { recursive: true, force: true });
FILES.forEach(copy);
console.log(`✓ 已构建 ${FILES.length} 个文件到 dist/`);
