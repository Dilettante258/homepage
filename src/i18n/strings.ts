export type Locale = 'en' | 'zh';

export type Messages = {
	nav: {
		home: string;
		blog: string;
		gallery: string;
		about: string;
		contact: string;
	};
	hero: {
		title: string;
		subtitle: string;
		ctaPrimary: string;
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
	};
	gallery: {
		title: string;
		subtitle: string;
		solidTitle: string;
		reactTitle: string;
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
			about: 'About',
			contact: 'Contact'
		},
		hero: {
			title: 'Full‑stack engineer crafting calm experiences.',
			subtitle:
				'I design resilient backends, expressive frontends, and the glue that keeps teams shipping fast.',
			ctaPrimary: 'View my work',
			ctaSecondary: 'Let’s talk'
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
			allPosts: 'Browse all posts'
		},
		gallery: {
			title: 'Gallery',
			subtitle: 'Small interactive pieces built with Solid and React islands.',
			solidTitle: 'Solid.js live controls',
			reactTitle: 'React micro-interaction'
		},
		contact: {
			title: 'Let’s build something together',
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
			about: '关于',
			contact: '联系'
		},
		hero: {
			title: '全栈工程师，专注平静而可靠的体验',
			subtitle: '我把复杂需求拆解成优雅的界面与稳健的后端，让团队高效落地想法。',
			ctaPrimary: '查看作品',
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
			allPosts: '查看全部'
		},
		gallery: {
			title: '组件示例',
			subtitle: '使用 Solid 与 React 构建的交互小品。',
			solidTitle: 'Solid.js 实时控制',
			reactTitle: 'React 微交互'
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
