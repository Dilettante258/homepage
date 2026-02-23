import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';

interface ImageDef {
	key: string;
	url: string;
}

const SKILLICON_PARAMS =
	'i=ts,nodejs,react,astro,css,nodejs,nextjs,solidjs,cloudflare,docker,github,githubactions,vercel,npm,md,rust,wasm,latex&perline=10';

const IMAGES: Record<string, ImageDef[]> = {
	skillicons: [
		{
			key: 'cached-images/skillicons-dark.svg',
			url: `https://skillicons.dev/icons?${SKILLICON_PARAMS}&theme=dark`,
		},
		{
			key: 'cached-images/skillicons-light.svg',
			url: `https://skillicons.dev/icons?${SKILLICON_PARAMS}&theme=light`,
		},
	],
	wakatime: [
		{
			key: 'cached-images/wakatime-dark.svg',
			url: 'https://wakatime.com/share/@Dilettante258/82da426f-5fb5-41cf-991a-ea2c9cf12bdd.svg',
		},
		{
			key: 'cached-images/wakatime-light.svg',
			url: 'https://wakatime.com/share/@Dilettante258/342e0b6d-5547-48fc-8ca9-1d846c38c389.svg',
		},
	],
};

async function cacheImage(img: ImageDef, bucket: R2Bucket): Promise<void> {
	const res = await fetch(img.url, {
		headers: { 'User-Agent': 'HomepageCacheBot/1.0' },
	});
	if (!res.ok) {
		console.error(`Failed to fetch ${img.key}: HTTP ${res.status}`);
		return;
	}

	const body = await res.arrayBuffer();
	if (body.byteLength < 1024) {
		console.error(`Skipping ${img.key}: response too small (${body.byteLength} bytes)`);
		return;
	}

	await bucket.put(img.key, body, {
		httpMetadata: {
			contentType: 'image/svg+xml',
			cacheControl: 'public, max-age=86400',
		},
		customMetadata: {
			sourceUrl: img.url,
			cachedAt: new Date().toISOString(),
		},
	});
	console.log(`Cached ${img.key} (${body.byteLength} bytes)`);
}

export function createExports(manifest: SSRManifest) {
	const app = new App(manifest);

	return {
		default: {
			async fetch(request, env, ctx) {
				return handle(manifest, app, request as any, env as any, ctx);
			},

			async scheduled(controller, env, _ctx) {
				const group = controller.cron.includes('mon,wed,fri') ? 'wakatime' : 'skillicons';
				console.log(`[scheduled] cron="${controller.cron}" updating ${group}`);

				const images = IMAGES[group];
				const results = await Promise.allSettled(
					images.map((img) => cacheImage(img, env.HOMEPAGE_BUCKET)),
				);

				for (const result of results) {
					if (result.status === 'rejected') {
						console.error(`Rejected: ${result.reason}`);
					}
				}
			},
		} satisfies ExportedHandler<Env>,
	};
}
