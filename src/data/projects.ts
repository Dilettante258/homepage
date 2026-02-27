import type { Locale } from '../i18n/strings';

export type ProjectTag = 'fullstack' | 'frontend' | 'backend' | 'ai' | 'tooling' | 'oss';

export interface ProjectItem {
	slug: string;
	title: Record<Locale, string>;
	description: Record<Locale, string>;
	tags: ProjectTag[];
	tech: string[];
	avatar?: string;
	cover?: string;
	githubStars?: number;
	fallbackGradient: string;
	links: {
		github?: string;
		live?: string;
	};
	featured: boolean;
	createdAt: string;
}

export const projectItems: ProjectItem[] = [
	{
		slug: 'eztb',
		title: {
			en: 'EZTB - Tieba Toolbox',
			zh: 'Eztb-贴吧工具箱',
		},
		githubStars: 72,
		description: {
			en: 'A toolbox for Baidu Tieba: search, analyze, and export in one place, with an open-source backend and SDK.',
			zh: 'eztb 贴吧工具箱。查询·分析·导出,一站完成。（有开源后端与SDK）',
		},
		tags: ['fullstack', 'tooling', 'oss'],
		tech: ['React', 'Node.js', 'Monorepo', 'TypeScript'],
		cover: 'https://h-r2.kairi.cc/eztb-icon.webp',
		fallbackGradient: 'linear-gradient(135deg, #7EF3D1, #4566d0)',
		links: {
			github: 'https://github.com/Dilettante258/tieba-toolbox',
			live: 'https://www.eztb.org/',
		},
		featured: true,
		createdAt: '2024-11-11',
	},
	{
		slug: 'headwind-monorepo',
		title: {
			en: 'Headwind Monorepo',
			zh: 'Headwind Monorepo',
		},
		githubStars: 20,
		cover: 'https://h-r2.kairi.cc/headwind-icon.webp',
		description: {
			en: 'Headwind converts Tailwind CSS into semantic CSS, built with Rust and SWC, delivered as WASM with a VS Code extension.',
			zh: 'Headwind 是一个基于 Rust 和 SWC 构建的 Tailwind CSS 到语义化 CSS 转换器（WASM, VS Code插件）。',
		},
		tags: ['tooling', 'oss'],
		tech: ['Rust', 'WASM', 'VS Code', 'Node.js', 'TypeScript'],
		fallbackGradient: 'linear-gradient(135deg, #FFD166, #FF7EB6)',
		links: {
			github: 'https://github.com/Dilettante258/headwind-monorepo',
		},
		featured: true,
		createdAt: '2026-01-29',
	},
	{
		slug: 'homepage',
		title: {
			en: 'Personal Homepage',
			zh: '个人主页',
		},
		githubStars: 2,
		cover: 'https://h-r2.kairi.cc/homepage-icon.webp',
		description: {
			en: 'This very site — built with Astro, Solid.js, and React islands, featuring i18n and dark mode.',
			zh: '这个网站 — 基于 Astro，利用了如CSS Transition，View Animation等一众新技术。是我学习新技术的试验场。',
		},
		tags: ['frontend'],
		tech: ['Astro', 'React', 'Cloudflare', 'TypeScript'],
		fallbackGradient: 'linear-gradient(120deg, #9BB7FF, #c1a3ff)',
		links: {
			github: 'https://github.com/Dilettante258/homepage',
		},
		featured: true,
		createdAt: '2026-01-10',
	},
	{
		slug: 'tentix',
		title: {
			en: 'Tentix AI Ticketing System',
			zh: 'Tentix AI 工单系统',
		},
		githubStars: 221,
		// cover: 'https://h-r2.kairi.cc/homepage-icon.webp',
		description: {
			en: 'An AI-native ticketing platform built with a Node.js full-stack architecture.',
			zh: 'AI-native的工单系统，Node全栈构建。',
		},
		tags: ['fullstack', 'ai'],
		tech: ['React', 'Node.js', 'Drizzle ORM', 'TypeScript'],
		fallbackGradient: 'linear-gradient(120deg, #9BB7FF, #c1a3ff)',
		links: {
			github: 'https://github.com/labring/tentix',
		},
		featured: true,
		createdAt: '2026-04-10',
	},
	{
		slug: 'tieba-api-scf',
		title: {
			en: 'Tieba API SCF',
			zh: '贴吧 API 服务',
		},
		githubStars: 13,
		description: {
			en: 'HTTP API service for Tieba data query and analysis, built on Hono and tieba.js.',
			zh: '面向贴吧数据查询与分析的 HTTP API 服务，基于 Hono + tieba.js。',
		},
		tags: ['backend', 'oss'],
		tech: ['Hono', 'Node.js', 'TypeScript'],
		fallbackGradient: 'linear-gradient(135deg, #7CCBFF, #3E6AE1)',
		links: {
			github: 'https://github.com/Dilettante258/Tieba-API-SCF',
		},
		featured: false,
		createdAt: '2024-04-04',
	},
	{
		slug: 'tieba-js',
		title: {
			en: 'tieba.js SDK',
			zh: 'tieba.js SDK',
		},
		githubStars: 4,
		description: {
			en: 'A TypeScript SDK for Baidu Tieba, covering forum, thread, user, search, and interaction APIs.',
			zh: '百度贴吧 TypeScript SDK，提供论坛、帖子、用户、搜索与互动等类型化 API。',
		},
		tags: ['backend', 'tooling', 'oss'],
		tech: ['Node.js', 'TypeScript'],
		fallbackGradient: 'linear-gradient(135deg, #7EF3D1, #2F8F6F)',
		links: {
			github: 'https://github.com/Dilettante258/tieba.js',
		},
		featured: false,
		createdAt: '2024-09-23',
	},
	{
		slug: 'electron-monorepo-template',
		title: {
			en: 'Electron Monorepo Template',
			zh: 'Electron 全栈模板',
		},
		githubStars: 3,
		description: {
			en: 'A modern Electron template with monorepo architecture, React UI, and full-stack TypeScript workflow.',
			zh: '现代化 Electron 模板，基于 Monorepo 架构，集成 React UI 与全栈 TypeScript 工作流。',
		},
		tags: ['fullstack', 'tooling', 'oss'],
		tech: ['React', 'Monorepo', 'Node.js', 'TypeScript'],
		fallbackGradient: 'linear-gradient(135deg, #B9B8FF, #4E6DF8)',
		links: {
			github: 'https://github.com/Dilettante258/eletron-monorepo-template',
		},
		featured: false,
		createdAt: '2025-06-13',
	},
	{
		slug: 'hecto',
		title: {
			en: 'Hecto',
			zh: 'Hecto 文本编辑器',
		},
		githubStars: 0,
		description: {
			en: 'A text editor written in Rust, built as a learning project for the Rust language.',
			zh: '一个用 Rust 编写的文本编辑器项目，用于学习 Rust 语言。',
		},
		tags: ['tooling', 'oss'],
		tech: ['Rust'],
		fallbackGradient: 'linear-gradient(135deg, #F7D06B, #E07A5F)',
		links: {
			github: 'https://github.com/Dilettante258/hecto',
		},
		featured: false,
		createdAt: '2025-01-24',
	},
];

export function getAllProjectTags(): ProjectTag[] {
	const set = new Set<ProjectTag>();
	for (const item of projectItems) {
		for (const tag of item.tags) set.add(tag);
	}
	return Array.from(set);
}

export function getFeaturedProjects(): ProjectItem[] {
	return projectItems.filter((item) => item.featured);
}
