#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, basename, extname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';

// ============ 配置 ============
const CONFIG = {
  bucket: 'h-r2',                // R2 bucket 名称
  customDomain: 'h-r2.kairi.cc', // 自定义域名
  blogDir: 'src/content/blog',   // 博客目录
  tmpDir: '.tmp-images',         // 临时下载目录
};

// 已经在 R2 上的域名，跳过这些
const SKIP_DOMAINS = ['h-r2.kairi.cc'];

// ============ 工具函数 ============

/** 从 URL 推断文件扩展名 */
function getExtFromUrl(url) {
  const pathname = new URL(url).pathname;
  // 处理类似 xxx.awebp 或 xxx~tplv-xxx:q75.awebp 的掘金格式
  const match = pathname.match(/\.(\w+)(?:\?|$)/);
  if (match) return '.' + match[1];
  // 从路径名尾部匹配
  const ext = extname(pathname.split('~')[0]);
  if (ext) return ext;
  return '.webp'; // 默认
}

/** 根据扩展名获取 MIME 类型 */
function getMimeType(ext) {
  const map = {
    '.webp': 'image/webp',
    '.awebp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}

/** 从 markdown 文件内容中提取所有外链图片 URL */
function extractImageUrls(content) {
  const urls = [];

  // 匹配 ![alt](url)
  const mdRegex = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  // 匹配 <img src="url" ...>
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/g;
  while ((match = htmlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  // 去重 & 过滤已在 R2 上的
  return [...new Set(urls)].filter((url) => {
    try {
      const hostname = new URL(url).hostname;
      return !SKIP_DOMAINS.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  });
}

/** 下载图片到本地 */
async function downloadImage(url, dest, cookie) {
  const headers = {
    'Referer': new URL(url).origin + '/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buffer);
  return buffer.length;
}

/** 上传文件到 R2 */
function uploadToR2(localPath, key, contentType, dryRun) {
  const cmd = `npx wrangler r2 object put "${CONFIG.bucket}/${key}" --file="${localPath}" --content-type="${contentType}"`;
  if (dryRun) {
    console.log(`  [dry-run] ${cmd}`);
    return;
  }
  execSync(cmd, { stdio: 'inherit', cwd: resolve('.') });
}

/** 获取博客文章 slug（从文件名去掉 .en.md / .zh.md） */
function getSlug(filePath) {
  const name = basename(filePath);
  return name.replace(/\.(en|zh)\.md$/, '').replace(/\.md$/, '');
}

// ============ 主流程 ============

async function processFile(filePath, dryRun, cookie) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    return;
  }

  const content = readFileSync(absPath, 'utf-8');
  const urls = extractImageUrls(content);

  if (urls.length === 0) {
    console.log(`⏭ ${filePath} — no external images found`);
    return;
  }

  console.log(`\n📄 ${filePath} — found ${urls.length} external image(s)`);

  const slug = getSlug(filePath);
  const tmpDir = resolve(CONFIG.tmpDir);
  if (!dryRun) mkdirSync(tmpDir, { recursive: true });

  let newContent = content;
  let idx = 0;

  for (const url of urls) {
    idx++;
    const ext = getExtFromUrl(url);
    const key = `${slug}-${String(idx).padStart(2, '0')}${ext}`;
    const localPath = join(tmpDir, key);
    const mime = getMimeType(ext);
    const r2Url = `https://${CONFIG.customDomain}/${key}`;

    console.log(`\n  [${idx}/${urls.length}] ${key}`);
    console.log(`    src: ${url.slice(0, 80)}...`);
    console.log(`    dst: ${r2Url}`);

    if (dryRun) {
      console.log(`    [dry-run] would download, upload, and replace`);
    } else {
      // 下载
      try {
        const size = await downloadImage(url, localPath, cookie);
        console.log(`    downloaded: ${(size / 1024).toFixed(1)} KB`);
      } catch (e) {
        console.error(`    ❌ download failed: ${e.message}`);
        continue;
      }

      // 上传
      try {
        uploadToR2(localPath, key, mime, false);
        console.log(`    ✅ uploaded`);
      } catch (e) {
        console.error(`    ❌ upload failed: ${e.message}`);
        continue;
      }
    }

    // 替换 URL（dry-run 时也展示替换效果）
    newContent = newContent.split(url).join(r2Url);
  }

  if (!dryRun) {
    writeFileSync(absPath, newContent, 'utf-8');
    console.log(`\n  ✅ ${filePath} updated`);
  } else {
    console.log(`\n  [dry-run] ${filePath} would be updated`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // 解析 --cookie "xxx" 参数
  let cookie = '';
  const cookieIdx = args.indexOf('--cookie');
  if (cookieIdx !== -1 && args[cookieIdx + 1]) {
    cookie = args[cookieIdx + 1];
  }

  const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--cookie');

  let targets;
  if (files.length > 0) {
    targets = files;
  } else {
    // 扫描所有博客 md 文件
    const blogDir = resolve(CONFIG.blogDir);
    const entries = await readdir(blogDir);
    targets = entries.filter((f) => f.endsWith('.md')).map((f) => join(CONFIG.blogDir, f));
  }

  if (dryRun) console.log('🔍 Dry-run mode — no files will be modified\n');

  for (const file of targets) {
    await processFile(file, dryRun, cookie);
  }

  // 清理临时目录
  if (!dryRun && existsSync(CONFIG.tmpDir)) {
    rmSync(CONFIG.tmpDir, { recursive: true });
    console.log('\n🧹 Temp directory cleaned up');
  }

  console.log('\n✨ Done!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
