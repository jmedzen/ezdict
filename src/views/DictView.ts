import { ItemView, WorkspaceLeaf, MarkdownView, Editor, MarkdownRenderer, Component, setIcon, Notice } from 'obsidian';
import type EzdictPlugin from '../main';
import { DictEntry, DictFileMetadata, DictSearchMode, SearchResult } from '../types';
import { t } from '../i18n';

export const EZDICT_VIEW_TYPE = 'ezdict-dictionary-view';

export class DictView extends ItemView {
	plugin: EzdictPlugin;
	private currentMode: DictSearchMode = 'prefix';
	private currentQuery: string = '';
	private activeEntry: { fileId: number; entryId: number } | null = null;
	private searchDebounceTimer: number | null = null;
	private searchCache: Map<DictSearchMode, { query: string; results: SearchResult[] }> = new Map();
	private entryHistory: { fileId: number; entryId: number }[] = [];

	// DOM Elements
	private searchInputEl: HTMLInputElement;
	private modeTabsEl: HTMLElement;
	private dictListToggleEl: HTMLElement;
	private dictListDrawerEl: HTMLElement;
	private resultsContainerEl: HTMLElement;
	private entryDetailContainerEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: EzdictPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentMode = plugin.settings.defaultMode;
	}

	getViewType(): string {
		return EZDICT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Ezdict';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('ezdict-view-container');

		this.buildUI(container);
		this.renderDictListDrawer();

		this.plugin.engine.onReady((ready) => {
			if (ready) {
				this.renderDictListDrawer();
				if (this.currentQuery) {
					void this.executeSearch(this.currentQuery);
				}
			}
		});
	}

	private buildUI(parent: HTMLElement): void {
		// 1. Header & Search Bar
		const headerEl = parent.createDiv({ cls: 'ezdict-header' });

		const searchWrapEl = headerEl.createDiv({ cls: 'ezdict-search-wrap' });
		const searchIcon = searchWrapEl.createSpan({ cls: 'ezdict-search-icon' });
		setIcon(searchIcon, 'search');

		this.searchInputEl = searchWrapEl.createEl('input', {
			type: 'text',
			placeholder: t('search.placeholder'),
			cls: 'ezdict-search-input'
		});

		this.searchInputEl.addEventListener('input', (e) => {
			const val = (e.target as HTMLInputElement).value;
			const trimmed = val.trim();
			if (trimmed !== this.currentQuery.trim()) {
				this.searchCache.clear();
			}
			this.currentQuery = val;
			if (this.searchDebounceTimer !== null) {
				window.clearTimeout(this.searchDebounceTimer);
			}
			this.searchDebounceTimer = window.setTimeout(() => {
				void this.executeSearch(val);
			}, 80);
		});

		const clearBtn = searchWrapEl.createEl('button', {
			cls: 'ezdict-search-clear-btn',
			attr: { title: t('search.clear') }
		});
		setIcon(clearBtn, 'x');
		clearBtn.addEventListener('click', () => {
			this.searchInputEl.value = '';
			this.currentQuery = '';
			this.searchCache.clear();
			void this.executeSearch('');
			this.searchInputEl.focus();
		});

		// 2. Mode Selector Tabs
		this.modeTabsEl = headerEl.createDiv({ cls: 'ezdict-mode-tabs' });
		this.renderModeTabs();

		// 3. Dictionary Toggle & Drawer (inside header area)
		const toggleHeaderEl = headerEl.createDiv({ cls: 'ezdict-dict-toggle-header' });
		this.dictListToggleEl = toggleHeaderEl.createDiv({ cls: 'ezdict-dict-toggle-btn' });
		const chevronSpan = this.dictListToggleEl.createSpan({ cls: 'ezdict-dict-chevron' });
		setIcon(chevronSpan, 'chevron-right');
		this.dictListToggleEl.createSpan({ cls: 'ezdict-dict-toggle-label', text: t('drawer.title') });

		this.dictListDrawerEl = headerEl.createDiv({ cls: 'ezdict-dict-drawer collapsed' });

		this.dictListToggleEl.addEventListener('click', () => {
			const isCollapsed = this.dictListDrawerEl.hasClass('collapsed');
			if (isCollapsed) {
				this.renderDictListDrawer();
				this.dictListDrawerEl.removeClass('collapsed');
				this.dictListToggleEl.addClass('open');
			} else {
				this.dictListDrawerEl.addClass('collapsed');
				this.dictListToggleEl.removeClass('open');
			}
		});

		// 4. Results List Container
		this.resultsContainerEl = parent.createDiv({ cls: 'ezdict-results-container' });

		// 5. Entry Detail View Container (Hidden initially)
		this.entryDetailContainerEl = parent.createDiv({ cls: 'ezdict-entry-detail-container hidden' });

		// Initial Placeholder
		this.renderPlaceholder(t('view.initialPlaceholder'));
	}

	private renderModeTabs(): void {
		this.modeTabsEl.empty();

		const modes: { key: DictSearchMode; label: string }[] = [
			{ key: 'prefix', label: t('mode.tabPrefix') },
			{ key: 'fuzzy', label: t('mode.tabFuzzy') },
			{ key: 'fulltext', label: t('mode.tabFulltext') }
		];

		modes.forEach(m => {
			const tab = this.modeTabsEl.createEl('button', {
				cls: `ezdict-mode-tab ${this.currentMode === m.key ? 'active' : ''}`,
				text: m.label
			});
			tab.addEventListener('click', () => {
				if (this.currentMode !== m.key) {
					this.currentMode = m.key;
					this.renderModeTabs();
					void this.executeSearch(this.currentQuery);
				}
			});
		});
	}

	public renderDictListDrawer(): void {
		this.dictListDrawerEl.empty();
		const files = this.plugin.engine.files;

		if (files.length === 0) {
			this.dictListDrawerEl.createDiv({ cls: 'ezdict-drawer-empty', text: t('drawer.empty') });
			return;
		}

		const actionsEl = this.dictListDrawerEl.createDiv({ cls: 'ezdict-drawer-actions' });
		const allBtn = actionsEl.createEl('button', { cls: 'ezdict-drawer-action-btn', text: t('drawer.toggleAll') });
		allBtn.addEventListener('click', () => {
			void (async () => {
				const allOn = files.every(f => f.enabled);
				files.forEach(f => f.enabled = !allOn);
				this.plugin.settings.disabledDicts = files.filter(f => !f.enabled).map(f => f.path);
				this.searchCache.clear();
				await this.plugin.saveSettings();
				this.renderDictListDrawer();
				void this.executeSearch(this.currentQuery);
			})();
		});

		const listEl = this.dictListDrawerEl.createDiv({ cls: 'ezdict-drawer-list' });

		files.forEach((f, idx) => {
			const itemEl = listEl.createDiv({ cls: 'ezdict-drawer-item' });

			// Checkbox
			const cb = itemEl.createEl('input', { type: 'checkbox' });
			cb.checked = f.enabled;
			cb.addEventListener('change', (e) => {
				void (async () => {
					f.enabled = (e.target as HTMLInputElement).checked;
					this.plugin.settings.disabledDicts = files.filter(file => !file.enabled).map(file => file.path);
					this.searchCache.clear();
					await this.plugin.saveSettings();
					void this.executeSearch(this.currentQuery);
				})();
			});

			// Title & Count
			itemEl.createSpan({ cls: 'ezdict-drawer-item-name', text: f.name });
			itemEl.createSpan({ cls: 'ezdict-drawer-item-count', text: t('drawer.entriesCount', { count: f.entryCount.toLocaleString() }) });

			// Up/Down Sort buttons
			const sortBtnsEl = itemEl.createDiv({ cls: 'ezdict-drawer-sort-btns' });
			const upBtn = sortBtnsEl.createEl('button', { cls: 'ezdict-drawer-sort-btn', attr: { title: t('drawer.moveUp') } });
			setIcon(upBtn, 'arrow-up');
			upBtn.disabled = (idx === 0);
			upBtn.addEventListener('click', () => {
				void (async () => {
					if (idx > 0) {
						const temp = files[idx - 1];
						files[idx - 1] = files[idx];
						files[idx] = temp;
						this.plugin.settings.dictFileOrder = files.map(file => file.path);
						this.searchCache.clear();
						await this.plugin.saveSettings();
						this.renderDictListDrawer();
						void this.executeSearch(this.currentQuery);
					}
				})();
			});

			const downBtn = sortBtnsEl.createEl('button', { cls: 'ezdict-drawer-sort-btn', attr: { title: t('drawer.moveDown') } });
			setIcon(downBtn, 'arrow-down');
			downBtn.disabled = (idx === files.length - 1);
			downBtn.addEventListener('click', () => {
				void (async () => {
					if (idx < files.length - 1) {
						const temp = files[idx + 1];
						files[idx + 1] = files[idx];
						files[idx] = temp;
						this.plugin.settings.dictFileOrder = files.map(file => file.path);
						this.searchCache.clear();
						await this.plugin.saveSettings();
						this.renderDictListDrawer();
						void this.executeSearch(this.currentQuery);
					}
				})();
			});
		});
	}

	private renderPlaceholder(text: string): void {
		this.resultsContainerEl.empty();
		const ph = this.resultsContainerEl.createDiv({ cls: 'ezdict-placeholder' });
		ph.createSpan({ cls: 'ezdict-placeholder-text', text });
	}

	public async executeSearch(query: string): Promise<void> {
		this.showResultsView();
		const q = query.trim();

		if (!q) {
			this.renderPlaceholder(t('view.initialPlaceholder'));
			return;
		}

		if (!this.plugin.engine.isReady) {
			this.renderPlaceholder(t('view.indexingPlaceholder'));
			return;
		}

		// Check mode cache
		const cached = this.searchCache.get(this.currentMode);
		if (cached && cached.query === q) {
			this.renderResults(cached.results, q);
			return;
		}

		// Perform Search
		this.resultsContainerEl.empty();
		const loadingEl = this.resultsContainerEl.createDiv({ cls: 'ezdict-loading-spinner' });
		loadingEl.createSpan({ text: t('setting.reindex.scanning') });

		try {
			const results = await this.plugin.engine.search(q, this.currentMode);
			this.searchCache.set(this.currentMode, { query: q, results });
			this.renderResults(results, q);
		} catch {
			this.renderPlaceholder(t('view.errorPlaceholder'));
		}
	}

	private renderResults(results: SearchResult[], query: string): void {
		this.resultsContainerEl.empty();

		if (results.length === 0) {
			this.renderPlaceholder(t('view.noResultsPlaceholder', { query }));
			return;
		}

		// Result Header Count
		const countHeaderEl = this.resultsContainerEl.createDiv({ cls: 'ezdict-results-count-bar' });
		countHeaderEl.setText(t('view.resultsCount', { count: results.length.toLocaleString() }));

		// Group results by Dictionary file
		const grouped: Map<number, SearchResult[]> = new Map();
		results.forEach(r => {
			if (!grouped.has(r.fileId)) grouped.set(r.fileId, []);
			grouped.get(r.fileId)!.push(r);
		});

		grouped.forEach((items) => {
			const fileName = items[0].fileName;
			const groupEl = this.resultsContainerEl.createDiv({ cls: 'ezdict-result-group' });

			const groupHeaderEl = groupEl.createDiv({ cls: 'ezdict-result-group-header' });
			
			const leftWrapEl = groupHeaderEl.createDiv({ cls: 'ezdict-result-group-left' });
			const chevronSpan = leftWrapEl.createSpan({ cls: 'ezdict-result-group-chevron' });
			setIcon(chevronSpan, 'chevron-down');
			leftWrapEl.createSpan({ cls: 'ezdict-result-group-title', text: `📖 ${fileName}` });

			groupHeaderEl.createSpan({ cls: 'ezdict-result-group-badge', text: `${items.length.toLocaleString()}` });

			const itemsContainerEl = groupEl.createDiv({ cls: 'ezdict-result-items-list' });

			// Click header to collapse / uncollapse
			groupHeaderEl.addEventListener('click', () => {
				const isCollapsed = groupEl.hasClass('collapsed');
				if (isCollapsed) {
					groupEl.removeClass('collapsed');
					chevronSpan.empty();
					setIcon(chevronSpan, 'chevron-down');
				} else {
					groupEl.addClass('collapsed');
					chevronSpan.empty();
					setIcon(chevronSpan, 'chevron-right');
				}
			});

			items.forEach(item => {
				const itemEl = itemsContainerEl.createDiv({ cls: 'ezdict-result-item' });

				const titleRowEl = itemEl.createDiv({ cls: 'ezdict-result-item-title-row' });
				const titleSpan = titleRowEl.createSpan({ cls: 'ezdict-result-item-title' });
				this.renderHighlightedText(titleSpan, item.headword, query);

				if (item.snippet) {
					const snippetEl = itemEl.createDiv({ cls: 'ezdict-result-item-snippet' });
					this.renderHighlightedText(snippetEl, item.snippet, query);
				}

				itemEl.addEventListener('click', () => {
					void this.openEntryDetail(item.fileId, item.entryId);
				});
			});
		});
	}

	private renderHighlightedText(parent: HTMLElement, text: string, query: string): void {
		if (!query.trim()) {
			parent.setText(text);
			return;
		}

		const terms = query.split(/\s+/).filter(Boolean);
		if (terms.length === 0) {
			parent.setText(text);
			return;
		}

		const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
		const regex = new RegExp(`(${escaped})`, 'gi');
		const parts = text.split(regex);

		parts.forEach(part => {
			if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
				parent.createSpan({ text: part, cls: 'suggestion-highlight ezdict-highlight' });
			} else {
				parent.createSpan({ text: part });
			}
		});
	}

	public async openEntryDetail(fileId: number, entryId: number, recordHistory: boolean = true): Promise<void> {
		if (recordHistory && this.activeEntry && (this.activeEntry.fileId !== fileId || this.activeEntry.entryId !== entryId)) {
			this.entryHistory.push({ fileId: this.activeEntry.fileId, entryId: this.activeEntry.entryId });
		}

		this.activeEntry = { fileId, entryId };
		this.showDetailView();

		this.entryDetailContainerEl.empty();
		const loadingEl = this.entryDetailContainerEl.createDiv({ cls: 'ezdict-loading-spinner' });
		loadingEl.createSpan({ text: t('view.loadingEntry') });

		const result = await this.plugin.engine.getEntryContent(fileId, entryId);
		if (!result) {
			this.entryDetailContainerEl.empty();
			this.entryDetailContainerEl.createDiv({ cls: 'ezdict-placeholder', text: t('view.readError') });
			return;
		}

		this.entryDetailContainerEl.empty();

		// Detail Header Navigation Bar
		const navHeaderEl = this.entryDetailContainerEl.createDiv({ cls: 'ezdict-detail-nav' });

		const backBtn = navHeaderEl.createEl('button', {
			cls: 'ezdict-detail-nav-btn',
			attr: { title: t('nav.backTitle') }
		});
		setIcon(backBtn, 'arrow-left');
		backBtn.createSpan({ text: t('nav.back') });
		backBtn.addEventListener('click', () => {
			this.entryHistory = [];
			this.showResultsView();
		});

		navHeaderEl.createSpan({ cls: 'ezdict-detail-dict-tag', text: `📖 ${result.file.name}` });

		// Actions (Copy / Insert into note)
		const actionsEl = navHeaderEl.createDiv({ cls: 'ezdict-detail-actions' });

		const quoteBtn = actionsEl.createEl('button', { cls: 'ezdict-action-icon-btn', attr: { title: t('action.quote') } });
		setIcon(quoteBtn, 'quote');
		quoteBtn.addEventListener('click', () => this.insertEntryIntoActiveNote(result.entry, result.file, result.content));

		const copyBtn = actionsEl.createEl('button', { cls: 'ezdict-action-icon-btn', attr: { title: t('action.copy') } });
		setIcon(copyBtn, 'copy');
		copyBtn.addEventListener('click', () => {
			void (async () => {
				await navigator.clipboard.writeText(result.content);
				new Notice(t('notice.copied'));
			})();
		});

		// Detail Content Area
		const contentEl = this.entryDetailContainerEl.createDiv({ cls: 'ezdict-detail-content markdown-rendered' });

		// Use Obsidian native MarkdownRenderer
		const comp = new Component();
		comp.load();
		await MarkdownRenderer.render(this.app, result.content, contentEl, '', comp);

		// Intercept internal link clicks within dictionary reading area
		contentEl.addEventListener('click', (e: MouseEvent) => {
			void (async () => {
				const target = e.target as HTMLElement;
				const linkEl = target.closest('a');
				if (!linkEl) return;

				const href = linkEl.getAttribute('data-href') || linkEl.getAttribute('href');
				if (!href) return;

				// Skip external web links
				if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				let targetText = href.replace(/^#/, '').replace(/\.md$/i, '').trim();
				if (targetText.includes('#')) {
					targetText = targetText.split('#')[1].trim();
				}
				targetText = targetText.replace(/^【/, '').replace(/】$/, '').trim();
				if (!targetText) return;

				let found = this.plugin.engine.findEntryByHeadword(fileId, targetText);
				if (!found) {
					found = this.plugin.engine.findEntryInAnyDict(targetText);
				}

				if (found) {
					await this.openEntryDetail(found.fileId, found.entry.id, true);
				} else {
					new Notice(t('notice.exactNotFound', { query: targetText }));
					await this.searchExternal(targetText);
				}
			})();
		});

		// Bottom Prev/Next Pagination Bar
		const paginationEl = this.entryDetailContainerEl.createDiv({ cls: 'ezdict-detail-pagination' });

		const prevEntry = this.plugin.engine.getAdjacentEntry(fileId, entryId, -1);
		const prevBtn = paginationEl.createEl('button', {
			cls: 'ezdict-pagination-btn ezdict-pagination-btn-prev',
			attr: { title: prevEntry ? t('nav.prevTitle', { headword: prevEntry.cleanHeadword }) : t('nav.first') }
		});
		prevBtn.createSpan({ cls: 'ezdict-pagination-arrow', text: '←' });
		prevBtn.createSpan({
			cls: 'ezdict-pagination-label',
			text: prevEntry ? prevEntry.cleanHeadword : t('nav.first')
		});
		prevBtn.disabled = !prevEntry;
		if (prevEntry) {
			prevBtn.addEventListener('click', () => {
				void this.openEntryDetail(fileId, prevEntry.id, true);
			});
		}

		const nextEntry = this.plugin.engine.getAdjacentEntry(fileId, entryId, 1);
		const nextBtn = paginationEl.createEl('button', {
			cls: 'ezdict-pagination-btn ezdict-pagination-btn-next',
			attr: { title: nextEntry ? t('nav.nextTitle', { headword: nextEntry.cleanHeadword }) : t('nav.last') }
		});
		nextBtn.createSpan({
			cls: 'ezdict-pagination-label',
			text: nextEntry ? nextEntry.cleanHeadword : t('nav.last')
		});
		nextBtn.createSpan({ cls: 'ezdict-pagination-arrow', text: '→' });
		nextBtn.disabled = !nextEntry;
		if (nextEntry) {
			nextBtn.addEventListener('click', () => {
				void this.openEntryDetail(fileId, nextEntry.id, true);
			});
		}
	}

	private insertEntryIntoActiveNote(entry: DictEntry, file: DictFileMetadata, content: string): void {
		const template = this.plugin.settings.citationTemplate;
		let insertText = '';

		if (template === 'blockquote') {
			const cleanContent = content.trim().replace(/\n/g, '\n> ');
			insertText = `\n> [!quote] 《${file.name}》：${entry.cleanHeadword}\n> ${cleanContent}\n\n`;
		} else if (template === 'footnote') {
			const oneLineContent = content.trim().replace(/\r?\n/g, ' ');
			insertText = `[^${entry.cleanHeadword}]\n\n[^${entry.cleanHeadword}]: 《${file.name}》：${oneLineContent}\n`;
		} else if (template === 'wikilink') {
			insertText = `[[${entry.cleanHeadword}]]`;
		} else {
			insertText = `\n### 《${file.name}》【${entry.cleanHeadword}】\n${content.trim()}\n\n`;
		}

		let targetEditor: Editor | null = null;

		// 1. Try active MarkdownView
		const activeMdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeMdView && activeMdView.editor) {
			targetEditor = activeMdView.editor;
		}

		// 2. Try looking in all workspace leaves for an open MarkdownView
		if (!targetEditor) {
			const mdLeaves = this.app.workspace.getLeavesOfType('markdown');
			for (const leaf of mdLeaves) {
				if (leaf.view instanceof MarkdownView && leaf.view.editor) {
					targetEditor = leaf.view.editor;
					this.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		// 3. Try app.workspace.activeEditor
		if (!targetEditor) {
			const activeWorkspace = this.app.workspace as unknown as { activeEditor?: { editor?: Editor } };
			if (activeWorkspace.activeEditor?.editor) {
				targetEditor = activeWorkspace.activeEditor.editor;
			}
		}

		if (targetEditor) {
			targetEditor.focus();
			targetEditor.replaceSelection(insertText);
			new Notice(t('notice.inserted', { dict: file.name, entry: entry.cleanHeadword }));
		} else {
			void (async () => {
				await navigator.clipboard.writeText(insertText);
				new Notice(t('notice.clipboardFallback'));
			})();
		}
	}

	private showResultsView(): void {
		this.resultsContainerEl.removeClass('hidden');
		this.entryDetailContainerEl.addClass('hidden');
	}

	private showDetailView(): void {
		this.resultsContainerEl.addClass('hidden');
		this.entryDetailContainerEl.removeClass('hidden');
	}

	public async searchExternal(query: string): Promise<void> {
		this.searchInputEl.value = query;
		this.currentQuery = query;
		await this.executeSearch(query);
	}

	async onClose(): Promise<void> {}
}
