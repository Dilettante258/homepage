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
	{
		slug: 'ios-input',
		title: {
			en: 'iOS Input UX',
			zh: 'iOS 输入框体验',
		},
		description: {
			en: 'Mobile-first input form with scroll-driven header shadows and fixed CTA.',
			zh: '移动优先的输入表单，包含滚动驱动的标题阴影与固定 CTA。',
		},
		tags: ['css', 'ux'],
		fallbackGradient: 'linear-gradient(135deg, #8b9bef, #c1a3ff)',
		aspect: 'portrait',
		createdAt: '2025-11-20',
	},
	{
		slug: 'color-playground',
		title: {
			en: 'Color Playground',
			zh: '色彩实验场',
		},
		description: {
			en: 'Gradient angle picker with live swatch switching, built with Solid.js signals.',
			zh: '渐变角度选择器，支持色板切换，基于 Solid.js 信号构建。',
		},
		tags: ['solid', 'interaction'],
		fallbackGradient: 'linear-gradient(120deg, #7EF3D1, #9BB7FF)',
		aspect: 'landscape',
		createdAt: '2025-12-05',
	},
	{
		slug: 'tilt-card',
		title: {
			en: 'Tilt Card',
			zh: '倾斜卡片',
		},
		description: {
			en: 'Tabbed micro-interaction card with glow effect, built with React hooks.',
			zh: '选项卡式微交互卡片，带辉光效果，使用 React hooks 构建。',
		},
		tags: ['react', 'interaction'],
		fallbackGradient: 'linear-gradient(120deg, #FF7EB6, #FFD166)',
		aspect: 'landscape',
		createdAt: '2026-01-10',
	},
];

export function getAllTags(): GalleryTag[] {
	const set = new Set<GalleryTag>();
	for (const item of galleryItems) {
		for (const tag of item.tags) set.add(tag);
	}
	return Array.from(set);
}
