import type { Locale } from '../i18n/strings';

export type ProjectTag = 'fullstack' | 'frontend' | 'backend' | 'ai' | 'tooling' | 'oss';

export interface ProjectItem {
	slug: string;
	title: Record<Locale, string>;
	description: Record<Locale, string>;
	tags: ProjectTag[];
	tech: string[];
	cover?: string;
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
		slug: 'sealos-desktop',
		title: {
			en: 'Sealos Desktop',
			zh: 'Sealos 桌面端',
		},
		description: {
			en: 'Cloud-native desktop experience for managing Kubernetes clusters with an intuitive UI.',
			zh: '云原生桌面体验，通过直观的界面管理 Kubernetes 集群。',
		},
		tags: ['fullstack', 'frontend'],
		tech: ['React', 'TypeScript', 'Kubernetes'],
		fallbackGradient: 'linear-gradient(135deg, #7EF3D1, #4566d0)',
		links: {
			github: 'https://github.com/labring/sealos',
			live: 'https://sealos.io',
		},
		featured: true,
		createdAt: '2025-05-01',
	},
	{
		slug: 'devbox-manager',
		title: {
			en: 'Devbox Manager',
			zh: 'Devbox 管理器',
		},
		description: {
			en: 'A streamlined tool for provisioning and managing cloud development environments.',
			zh: '一款简洁高效的云端开发环境配置与管理工具。',
		},
		tags: ['fullstack', 'tooling'],
		tech: ['Node.js', 'React', 'Docker'],
		fallbackGradient: 'linear-gradient(135deg, #FFD166, #FF7EB6)',
		links: {
			github: 'https://github.com/labring/sealos',
		},
		featured: true,
		createdAt: '2025-09-15',
	},
	{
		slug: 'homepage',
		title: {
			en: 'Personal Homepage',
			zh: '个人主页',
		},
		description: {
			en: 'This very site — built with Astro, Solid.js, and React islands, featuring i18n and dark mode.',
			zh: '你正在看的这个网站 — 基于 Astro、Solid.js 和 React 岛屿架构，支持国际化与深色模式。',
		},
		tags: ['frontend', 'oss'],
		tech: ['Astro', 'React', 'TypeScript'],
		fallbackGradient: 'linear-gradient(120deg, #9BB7FF, #c1a3ff)',
		links: {
			github: 'https://github.com/Dilettante258he/homepage',
		},
		featured: true,
		createdAt: '2026-01-10',
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
