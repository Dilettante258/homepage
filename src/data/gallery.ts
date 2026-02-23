import type { Locale } from '../i18n/strings';

export type GalleryTag = 'solid' | 'react' | 'css' | 'ux' | 'interaction';

export interface GalleryItem {
	slug: string;
	title: Record<Locale, string>;
	description: Record<Locale, string>;
	tags: GalleryTag[];
	cover?: string;
	fallbackGradient: string;
	aspect: 'landscape' | 'portrait' | 'square';
	createdAt: string;
}

export const galleryItems: GalleryItem[] = [
	// {
	// 	slug: 'ios-input',
	// 	title: {
	// 		en: 'iOS Input UX',
	// 		zh: 'iOS 输入框体验',
	// 	},
	// 	description: {
	// 		en: 'Mobile-first input form with scroll-driven header shadows and fixed CTA.',
	// 		zh: '移动优先的输入表单，包含滚动驱动的标题阴影与固定 CTA。',
	// 	},
	// 	tags: ['css', 'ux'],
	// 	fallbackGradient: 'linear-gradient(135deg, #8b9bef, #c1a3ff)',
	// 	aspect: 'portrait',
	// 	createdAt: '2025-11-20',
	// },
	// {
	// 	slug: 'color-playground',
	// 	title: {
	// 		en: 'Color Playground',
	// 		zh: '色彩实验场',
	// 	},
	// 	description: {
	// 		en: 'Gradient angle picker with live swatch switching, built with Solid.js signals.',
	// 		zh: '渐变角度选择器，支持色板切换，基于 Solid.js 信号构建。',
	// 	},
	// 	tags: ['solid', 'interaction'],
	// 	fallbackGradient: 'linear-gradient(120deg, #7EF3D1, #9BB7FF)',
	// 	aspect: 'landscape',
	// 	createdAt: '2025-12-05',
	// },
	// {
	// 	slug: 'tilt-card',
	// 	title: {
	// 		en: 'Tilt Card',
	// 		zh: '倾斜卡片',
	// 	},
	// 	description: {
	// 		en: 'Tabbed micro-interaction card with glow effect, built with React hooks.',
	// 		zh: '选项卡式微交互卡片，带辉光效果，使用 React hooks 构建。',
	// 	},
	// 	tags: ['react', 'interaction'],
	// 	fallbackGradient: 'linear-gradient(120deg, #FF7EB6, #FFD166)',
	// 	aspect: 'landscape',
	// 	createdAt: '2026-01-10',
	// },
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
		cover: 'https://h-r2.kairi.cc/tb/slide2%401x.webp',
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
