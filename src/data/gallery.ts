import type { Locale } from '../i18n/strings';

export type GalleryTag = 'solid' | 'react' | 'css' | 'ux' | 'interaction';

export interface GalleryItem {
	slug: string;
	title: Record<Locale, string>;
	description: Record<Locale, string>;
	tags: GalleryTag[];
	cover?: string;
	fallbackGradient: string;
	// Recommended export sizes for gallery covers:
	// - landscape (16:10): 960 x 600
	// - portrait (9:14): 720 x 1120
	// - square (1:1): 800 x 800
	// Notes:
	// - Actual card rendering can be smaller (for example around 330 x 330 in some cases).
	// - Keep source a bit larger to stay crisp on high-DPI screens and during transitions.
	aspect: 'landscape' | 'portrait' | 'square';
	createdAt: string;
}

export const galleryItems: GalleryItem[] = [
	{
		slug: 'span-timeline-display',
		title: {
			en: 'Span Timeline Table',
			zh: 'Span 时间线表格',
		},
		description: {
			en: 'Collapsible trace timeline with details/summary, badges, and span bars.',
			zh: '基于 details/summary 的可折叠链路时间线，包含状态徽标与跨度条。',
		},
		tags: ['css', 'interaction'],
		fallbackGradient: 'linear-gradient(120deg, #DDEEE5, #F1D9D6)',
		cover: "https://h-r2.kairi.cc/tree-table-cover.webp",
		aspect: 'landscape',
		createdAt: '2026-02-22',
	},
	{
		slug: 'carousel-display',
		title: {
			en: 'Carousel',
			zh: '轮播图',
		},
		description: {
			en: 'Auto-playing snap carousel with touch pause and arrow navigation.',
			zh: '支持自动播放、触摸暂停与箭头切换的吸附轮播。',
		},
		tags: ['css', 'interaction'],
		cover: 'https://h-r2.kairi.cc/carousel-cover.webp',
		fallbackGradient: 'linear-gradient(120deg, #93C5FD, #86EFAC)',
		aspect: 'square',
		createdAt: '2026-02-22',
	},
	{
		slug: 'theme-toggle-display',
		title: {
			en: 'Theme Toggle',
			zh: '主题切换',
		},
		description: {
			en: 'Smooth animated theme switcher with rotation and cross-fade effects.',
			zh: '流畅的主题切换器，带旋转和淡入淡出效果。',
		},
		tags: ['css', 'interaction'],
		fallbackGradient: 'linear-gradient(120deg, #FFA07A, #FFD700)',
		cover: 'https://h-r2.kairi.cc/theme-btn-cover.webp',
		aspect: 'square',
		createdAt: '2026-01-27',
	},
];

export function getAllTags(): GalleryTag[] {
	const set = new Set<GalleryTag>();
	for (const item of galleryItems) {
		for (const tag of item.tags) set.add(tag);
	}
	return Array.from(set);
}
