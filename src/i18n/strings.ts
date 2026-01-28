export type Locale = 'en' | 'zh';

export type Messages = {
	nav: {
		home: string;
		blog: string;
		gallery: string;
		projects: string;
		about: string;
		contact: string;
	};
	hero: {
		title: string;
		subtitle: string;
		ctaPrimary: string;
		ctaGallery: string;
		ctaSecondary: string;
	};
	intro: {
		title: string;
		body: string;
		badges: string[];
	};
	blog: {
		title: string;
		subtitle: string;
		readMore: string;
		allPosts: string;
		filterAll: string;
		sortBy: string;
		sortDefault: string;
		sortNameAZ: string;
		sortNameZA: string;
		sortNewest: string;
		sortOldest: string;
		layoutGrid: string;
		layoutList: string;
		backToBlog: string;
	};
	gallery: {
		title: string;
		subtitle: string;
		solidTitle: string;
		reactTitle: string;
		filterAll: string;
		layoutGrid: string;
		layoutList: string;
		layoutTiling: string;
		viewDemo: string;
		backToGallery: string;
		sortBy: string;
		sortDefault: string;
		sortNameAZ: string;
		sortNameZA: string;
		sortNewest: string;
		sortOldest: string;
		tagLabels: Record<string, string>;
	};
	projects: {
		title: string;
		subtitle: string;
		filterAll: string;
		sortBy: string;
		sortDefault: string;
		sortNameAZ: string;
		sortNameZA: string;
		sortNewest: string;
		sortOldest: string;
		layoutGrid: string;
		layoutList: string;
		viewProject: string;
		viewCode: string;
		viewAll: string;
		tagLabels: Record<string, string>;
	};
	home: {
		projectsTitle: string;
		projectsSubtitle: string;
	};
	about: {
		title: string;
		subtitle: string;
		techStackTitle: string;
		educationTitle: string;
		experienceTitle: string;
		codingActivityTitle: string;
		contactTitle: string;
		present: string;
	};
	contact: {
		title: string;
		subtitle: string;
		emailCta: string;
	};
	footer: {
		note: string;
	};
};

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh'];
export const FALLBACK_LOCALE: Locale = 'en';

export const messages: Record<Locale, Messages> = {
	en: {
		nav: {
			home: 'Home',
			blog: 'Blog',
			gallery: 'Gallery',
			projects: 'Projects',
			about: 'About',
			contact: 'Contact'
		},
		hero: {
			title: 'Hello,<br>I\'m Dilettante258.',
			subtitle:
				'Passionate about crafting beautiful, modern web experiences with cutting-edge technologies.',
			ctaPrimary: 'View projects',
			ctaGallery: 'Gallery',
			ctaSecondary: 'Let\u2019s talk'
		},
		intro: {
			title: 'Product-minded maker with end‑to‑end range',
			body: 'From data models to design systems, I enjoy turning complex ideas into crisp, fast interfaces backed by thoughtful APIs.',
			badges: ['TypeScript everywhere', 'Edge-friendly architecture', 'Design systems', 'DX tooling']
		},
		blog: {
			title: 'Writing',
			subtitle: 'Notes about architecture, DX, and the craft of shipping fast.',
			readMore: 'Read post',
			allPosts: 'Browse all posts',
			filterAll: 'All',
			sortBy: 'Sort by',
			sortDefault: 'Newest first',
			sortNameAZ: 'Title A \u2192 Z',
			sortNameZA: 'Title Z \u2192 A',
			sortNewest: 'Newest first',
			sortOldest: 'Oldest first',
			layoutGrid: 'Grid',
			layoutList: 'List',
			backToBlog: 'Back to Blog',
		},
		gallery: {
			title: 'Gallery',
			subtitle: 'Small interactive pieces built with Solid and React islands.',
			solidTitle: 'Solid.js live controls',
			reactTitle: 'React micro-interaction',
			filterAll: 'All',
			layoutGrid: 'Grid',
			layoutList: 'List',
			layoutTiling: 'Masonry',
			viewDemo: 'View demo',
			backToGallery: 'Back to Gallery',
			sortBy: 'Sort by',
			sortDefault: 'Default',
			sortNameAZ: 'Name A → Z',
			sortNameZA: 'Name Z → A',
			sortNewest: 'Newest first',
			sortOldest: 'Oldest first',
			tagLabels: {
				solid: 'Solid.js',
				react: 'React',
				css: 'CSS',
				ux: 'UX',
				interaction: 'Interaction',
			},
		},
		projects: {
			title: 'Projects',
			subtitle: 'Applications, tools, and open-source work.',
			filterAll: 'All',
			sortBy: 'Sort by',
			sortDefault: 'Default',
			sortNameAZ: 'Name A \u2192 Z',
			sortNameZA: 'Name Z \u2192 A',
			sortNewest: 'Newest first',
			sortOldest: 'Oldest first',
			layoutGrid: 'Grid',
			layoutList: 'List',
			viewProject: 'Live demo',
			viewCode: 'Source code',
			viewAll: 'View all projects',
			tagLabels: {
				fullstack: 'Full-stack',
				frontend: 'Frontend',
				backend: 'Backend',
				ai: 'AI',
				tooling: 'Tooling',
				oss: 'Open Source',
			},
		},
		home: {
			projectsTitle: 'Pinned Projects',
			projectsSubtitle: 'A few things I\'ve built recently.',
		},
		about: {
			title: 'About Me',
			subtitle: 'Education, experience, and background.',
			techStackTitle: 'Tech Stack',
			educationTitle: 'Education',
			experienceTitle: 'Work Experience',
			codingActivityTitle: 'Coding Activity',
			contactTitle: 'Get in Touch',
			present: 'Present',
		},
		contact: {
			title: 'Let\u2019s build something together',
			subtitle: 'Available for product engineering, frontend leadership, and rapid prototypes.',
			emailCta: 'Email me'
		},
		footer: {
			note: 'Made with Astro, Solid, and React.'
		}
	},
	zh: {
		nav: {
			home: '首页',
			blog: '博客',
			gallery: '组件集',
			projects: '项目',
			about: '关于',
			contact: '联系'
		},
		hero: {
			title: '你好，<br>我是 Dilettante258。',
			subtitle: '热衷于用前沿技术打造优雅、现代的 Web 体验。',
			ctaPrimary: '查看项目',
			ctaGallery: '组件集',
			ctaSecondary: '聊一聊'
		},
		intro: {
			title: '产品视角的端到端工程实践',
			body: '从数据模型到设计系统，我喜欢把想法打磨成清晰、快速、可扩展的体验。',
			badges: ['TypeScript 全栈', '边缘友好架构', '设计系统', '开发者体验']
		},
		blog: {
			title: '写作',
			subtitle: '记录架构思考、开发者体验与高效交付。',
			readMore: '阅读全文',
			allPosts: '查看全部',
			filterAll: '全部',
			sortBy: '排序',
			sortDefault: '最新优先',
			sortNameAZ: '标题 A \u2192 Z',
			sortNameZA: '标题 Z \u2192 A',
			sortNewest: '最新优先',
			sortOldest: '最早优先',
			layoutGrid: '网格',
			layoutList: '列表',
			backToBlog: '返回博客',
		},
		gallery: {
			title: '组件示例',
			subtitle: '使用 Solid 与 React 构建的交互小品。',
			solidTitle: 'Solid.js 实时控制',
			reactTitle: 'React 微交互',
			filterAll: '全部',
			layoutGrid: '网格',
			layoutList: '列表',
			layoutTiling: '瀑布流',
			viewDemo: '查看演示',
			backToGallery: '返回组件集',
			sortBy: '排序',
			sortDefault: '默认',
			sortNameAZ: '名称 A → Z',
			sortNameZA: '名称 Z → A',
			sortNewest: '最新优先',
			sortOldest: '最早优先',
			tagLabels: {
				solid: 'Solid.js',
				react: 'React',
				css: 'CSS',
				ux: '用户体验',
				interaction: '交互',
			},
		},
		projects: {
			title: '项目',
			subtitle: '应用、工具与开源作品。',
			filterAll: '全部',
			sortBy: '排序',
			sortDefault: '默认',
			sortNameAZ: '名称 A \u2192 Z',
			sortNameZA: '名称 Z \u2192 A',
			sortNewest: '最新优先',
			sortOldest: '最早优先',
			layoutGrid: '网格',
			layoutList: '列表',
			viewProject: '在线演示',
			viewCode: '源代码',
			viewAll: '查看全部项目',
			tagLabels: {
				fullstack: '全栈',
				frontend: '前端',
				backend: '后端',
				ai: 'AI',
				tooling: '工具链',
				oss: '开源',
			},
		},
		home: {
			projectsTitle: 'Pinned Project',
			projectsSubtitle: '近期构建的部分作品。',
		},
		about: {
			title: '关于我',
			subtitle: '教育背景与实习经历',
			techStackTitle: '技术栈',
			educationTitle: '教育经历',
			experienceTitle: '实习经历',
			codingActivityTitle: '编码活跃度',
			contactTitle: '联系方式',
			present: '至今',
		},
		contact: {
			title: '一起把想法做出来',
			subtitle: '可合作：产品工程、前端架构、快速原型。',
			emailCta: '写信给我'
		},
		footer: {
			note: '由 Astro、Solid 与 React 驱动。'
		}
	}
};

export const resolveLocale = (value: string | undefined): Locale =>
	(SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : FALLBACK_LOCALE);
