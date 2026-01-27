export interface ListControlsConfig {
	containerSelector: string;
	cardSelector: string;
}

// 使用 WeakMap 存储每个容器的 AbortController
const abortControllerMap = new WeakMap<HTMLElement, AbortController>();

function withViewTransition(callback: () => void) {
	// 检查 View Transitions API 是否可用
	if (typeof document.startViewTransition === 'function') {
		try {
			document.startViewTransition(callback);
		} catch (e) {
			// 如果 View Transitions 失败，直接执行回调
			callback();
		}
	} else {
		// 如果不支持，直接执行回调
		callback();
	}
}

export function initListControls({ containerSelector, cardSelector }: ListControlsConfig) {
	const container = document.querySelector(containerSelector) as HTMLElement | null;
	if (!container) return;

	// 中止之前的所有监听器
	const oldController = abortControllerMap.get(container);
	if (oldController) {
		oldController.abort();
	}

	// 创建新的 AbortController
	const controller = new AbortController();
	const { signal } = controller;
	abortControllerMap.set(container, controller);

	const filterBtns = document.querySelectorAll('.filter-btn');
	const layoutBtns = document.querySelectorAll('.layout-btn');
	const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;

	function getCards() {
		return Array.from(container!.querySelectorAll(cardSelector)) as HTMLElement[];
	}

	// Filter
	filterBtns.forEach((btn) => {
		btn.addEventListener('click', () => {
			const tag = (btn as HTMLElement).dataset.tag!;
			filterBtns.forEach((b) => b.classList.remove('active'));
			btn.classList.add('active');

			withViewTransition(() => {
				getCards().forEach((card) => {
					if (tag === 'all') {
						card.hidden = false;
					} else {
						const cardTags = card.dataset.tags?.split(',') ?? [];
						card.hidden = !cardTags.includes(tag);
					}
				});
			});
		}, { signal });
	});

	// Layout
	if (layoutBtns.length > 0) {
		layoutBtns.forEach((btn) => {
			btn.addEventListener('click', () => {
				const mode = (btn as HTMLElement).dataset.layout!;
				layoutBtns.forEach((b) => b.classList.remove('active'));
				btn.classList.add('active');
				withViewTransition(() => {
					container!.dataset.layout = mode;
				});
			}, { signal });
		});
	}

	// Sort
	if (sortSelect) {
		sortSelect.addEventListener('change', () => {
			const mode = sortSelect.value;
			const cards = getCards();

			cards.sort((a, b) => {
				if (mode === 'name-az') {
					return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '');
				}
				if (mode === 'name-za') {
					return (b.dataset.title ?? '').localeCompare(a.dataset.title ?? '');
				}
				if (mode === 'newest') {
					return (b.dataset.date ?? '').localeCompare(a.dataset.date ?? '');
				}
				if (mode === 'oldest') {
					return (a.dataset.date ?? '').localeCompare(b.dataset.date ?? '');
				}
				// default — restore original order
				return Number(a.dataset.order) - Number(b.dataset.order);
			});

			withViewTransition(() => {
				cards.forEach((card) => container!.appendChild(card));
			});
		}, { signal });
	}
}
