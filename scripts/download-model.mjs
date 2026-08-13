/**
 * 下载 whisper-tiny 模型文件到 models/whisper-tiny/ 目录
 * 运行: node scripts/download-model.mjs
 * 
 * Xenova/whisper-tiny 使用 ONNX 格式（非 safetensors），
 * transformers.js 会按需加载 onnx/ 下的量化模型。
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MODEL_DIR = join(__dirname, '..', 'models', 'whisper-tiny');

const SOURCES = [
  'https://hf-mirror.com/Xenova/whisper-tiny/resolve/main',
  'https://huggingface.co/Xenova/whisper-tiny/resolve/main',
];

// 必要的配置文件 + q8 量化 ONNX 模型（体积最小，够用）
const FILES = [
  // 配置
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
  'added_tokens.json',
  // ONNX 量化模型（q8/int8，约 75MB 总计）
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

async function download(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html')) {
    const text = (await r.text()).slice(0, 100);
    throw new Error(`返回HTML: ${text}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  console.log('=== 下载 Whisper Tiny 模型（ONNX q8） ===');
  console.log('目标目录:', MODEL_DIR);

  if (!existsSync(MODEL_DIR)) mkdirSync(MODEL_DIR, { recursive: true });

  let base = '';
  for (const src of SOURCES) {
    try {
      process.stdout.write(`探测 ${src} ...`);
      await download(src + '/config.json');
      console.log(' OK');
      base = src;
      break;
    } catch (e) {
      console.log(` 失败`);
    }
  }
  if (!base) {
    console.error('\n所有源均不可达！');
    process.exit(1);
  }
  console.log('使用源:', base, '\n');

  let ok = 0, fail = 0;
  for (const f of FILES) {
    const url = `${base}/${f}`;
    const out = join(MODEL_DIR, f);
    const dir = join(out, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    try {
      process.stdout.write(`  ${f} ... `);
      const buf = await download(url);
      writeFileSync(out, buf);
      const mb = (buf.length / 1024 / 1024).toFixed(1);
      console.log(`${mb} MB`);
      ok++;
    } catch (e) {
      console.log(`跳过 (${(e.message||e).slice(0,60)})`);
      fail++;
    }
  }

  writeFileSync(
    join(MODEL_DIR, '_manifest.json'),
    JSON.stringify({ model: 'Xenova/whisper-tiny', source: base, downloadedAt: new Date().toISOString(), files: FILES }, null, 2)
  );
  console.log(`\n完成：${ok} 成功 / ${fail} 失败。请 git add models/ && git commit 提交。`);
}

main().catch(console.error);
