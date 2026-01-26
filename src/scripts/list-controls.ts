export interface ListControlsConfig {
	containerSelector: string;
	cardSelector: string;
}

function withViewTransition(callback: () => void) {
	if (document.startViewTransition) {
		document.startViewTransition(callback);
	} else {
		callback();
	}
}

export function initListControls({ containerSelector, cardSelector }: ListControlsConfig) {
	const container = document.querySelector(containerSelector) as HTMLElement | null;
	if (!container) return;

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
		});
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
			});
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
		});
	}
}
