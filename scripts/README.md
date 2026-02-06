# Scripts

## migrate-images.mjs

Migrate external image links in Markdown files to Cloudflare R2. The script downloads images from third-party CDNs (e.g. Juejin), uploads them to an R2 bucket via `wrangler`, and replaces the URLs in-place.

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) authenticated (`npx wrangler login`)

### Usage

```bash
# Dry-run — preview what will happen without downloading or uploading
node scripts/migrate-images.mjs --dry-run

# Process a specific file
node scripts/migrate-images.mjs src/content/blog/react18-concurrent.zh.md

# Process all Markdown files under src/content/blog/
node scripts/migrate-images.mjs

# Pass a cookie for CDNs that require authentication (e.g. Juejin private links)
node scripts/migrate-images.mjs --cookie "sessionid=abc; _csrf=xyz" src/content/blog/react18-concurrent.zh.md
```

### How to get the cookie

Some CDNs (like Juejin's `xtjj-private` URLs) require browser cookies to download images. To obtain them:

1. Open the article page in your browser.
2. Open DevTools (`F12`) → **Network** tab.
3. Reload the page.
4. Click any request to the CDN domain.
5. In **Request Headers**, copy the full value of the `Cookie` header.
6. Pass it via the `--cookie` flag.

### Configuration

Edit the `CONFIG` object at the top of the script:

```js
const CONFIG = {
  bucket: 'h-r2',                // R2 bucket name
  customDomain: 'h-r2.kairi.cc', // Custom domain for the bucket
  blogDir: 'src/content/blog',   // Directory to scan for Markdown files
  tmpDir: '.tmp-images',         // Temporary download directory (auto-cleaned)
};
```

### What it does

1. Scans Markdown files for external image URLs (`![](url)` and `<img src="url">`).
2. Skips images already hosted on the configured R2 domain.
3. Downloads each image to a temporary directory.
4. Uploads to R2 using `wrangler r2 object put`.
5. Replaces the original URL with `https://{customDomain}/{key}`.
6. Writes the updated Markdown back to disk.
7. Cleans up the temporary directory.

Images are named `{slug}-{index}.{ext}` (e.g. `react18-concurrent-01.awebp`), where `slug` is derived from the Markdown filename.
