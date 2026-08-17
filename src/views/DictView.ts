import { ItemView, WorkspaceLeaf, MarkdownView, Editor, MarkdownRenderer, Component, setIcon, Notice } from 'obsidian';
import type MdtermPlugin from '../main';
import { DictEntry, DictFileMetadata, DictSearchMode, SearchResult } from '../types';

export const MDTERM_VIEW_TYPE = 'mdterm-dictionary-view';

export class DictView extends ItemView {
	plugin: MdtermPlugin;
	private currentMode: DictSearchMode = 'prefix';
	private currentQuery: string = '';
	private activeEntry: { fileId: number; entryId: number } | null = null;
	private searchDebounceTimer: any = null;

	// DOM Elements
	private searchInputEl: HTMLInputElement;
	private modeTabsEl: HTMLElement;
	private dictListToggleEl: HTMLElement;
	private dictListDrawerEl: HTMLElement;
	private resultsContainerEl: HTMLElement;
	private entryDetailContainerEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: MdtermPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentMode = plugin.settings.defaultMode;
	}

	getViewType(): string {
		return MDTERM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'mdterm 辭典';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('mdterm-view-container');

		this.buildUI(container);

		this.plugin.engine.onReady((ready) => {
			if (ready) {
				this.renderDictListDrawer();
				if (this.currentQuery) {
					this.executeSearch(this.currentQuery);
				}
			}
		});
	}

	private buildUI(parent: HTMLElement): void {
		// 1. Header & Search Bar
		const headerEl = parent.createDiv({ cls: 'mdterm-header' });

		const searchWrapEl = headerEl.createDiv({ cls: 'mdterm-search-wrap' });
		const searchIcon = searchWrapEl.createSpan({ cls: 'mdterm-search-icon' });
		setIcon(searchIcon, 'search');

		this.searchInputEl = searchWrapEl.createEl('input', {
			type: 'text',
			placeholder: '輸入關鍵詞查詢辭典…',
			cls: 'mdterm-search-input'
		});

		this.searchInputEl.addEventListener('input', (e) => {
			const val = (e.target as HTMLInputElement).value;
			this.currentQuery = val;
			if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
			this.searchDebounceTimer = setTimeout(() => {
				this.executeSearch(val);
			}, 80);
		});

		const clearBtn = searchWrapEl.createEl('button', {
			cls: 'mdterm-search-clear-btn',
			attr: { title: '清除' }
		});
		setIcon(clearBtn, 'x');
		clearBtn.addEventListener('click', () => {
			this.searchInputEl.value = '';
			this.currentQuery = '';
			this.executeSearch('');
			this.searchInputEl.focus();
		});

		// 2. Mode Selector Tabs
		this.modeTabsEl = headerEl.createDiv({ cls: 'mdterm-mode-tabs' });
		const modes: { id: DictSearchMode; label: string; icon: string }[] = [
			{ id: 'prefix', label: '詞條', icon: 'book' },
			{ id: 'fuzzy', label: '模糊', icon: 'search' },
			{ id: 'fulltext', label: '全文', icon: 'file-text' }
		];

		modes.forEach(m => {
			const tab = this.modeTabsEl.createEl('button', {
				cls: `mdterm-mode-tab ${this.currentMode === m.id ? 'active' : ''}`,
				text: m.label
			});
			tab.addEventListener('click', () => {
				this.currentMode = m.id;
				this.modeTabsEl.querySelectorAll('.mdterm-mode-tab').forEach(el => el.removeClass('active'));
				tab.addClass('active');
				this.executeSearch(this.currentQuery);
			});
		});

		// 3. Dictionary Toggle & Selection Drawer
		const dictToggleHeader = headerEl.createDiv({ cls: 'mdterm-dict-toggle-header' });
		this.dictListToggleEl = dictToggleHeader.createDiv({ cls: 'mdterm-dict-toggle-btn' });
		const chevronIcon = this.dictListToggleEl.createSpan({ cls: 'mdterm-dict-chevron' });
		setIcon(chevronIcon, 'chevron-right');
		this.dictListToggleEl.createSpan({ text: '📚 辭典選擇與排序', cls: 'mdterm-dict-toggle-label' });

		this.dictListDrawerEl = headerEl.createDiv({ cls: 'mdterm-dict-drawer collapsed' });

		this.dictListToggleEl.addEventListener('click', () => {
			const isCollapsed = this.dictListDrawerEl.hasClass('collapsed');
			this.dictListDrawerEl.toggleClass('collapsed', !isCollapsed);
			this.dictListToggleEl.toggleClass('open', isCollapsed);
		});

		// 4. Main Body: Results and Entry Detail
		const bodyEl = parent.createDiv({ cls: 'mdterm-body' });
		this.resultsContainerEl = bodyEl.createDiv({ cls: 'mdterm-results-container' });
		this.entryDetailContainerEl = bodyEl.createDiv({ cls: 'mdterm-entry-detail-container hidden' });

		this.renderPlaceholder('📖 輸入關鍵詞開始查詢');
	}

	private renderDictListDrawer(): void {
		this.dictListDrawerEl.empty();
		const files = this.plugin.engine.files;

		if (files.length === 0) {
			this.dictListDrawerEl.createDiv({ cls: 'mdterm-drawer-empty', text: '未掃描到辭典 .md 檔案，請檢查設定中的路徑。' });
			return;
		}

		const actionsEl = this.dictListDrawerEl.createDiv({ cls: 'mdterm-drawer-actions' });
		const allBtn = actionsEl.createEl('button', { cls: 'mdterm-drawer-action-btn', text: '切換全選' });
		allBtn.addEventListener('click', async () => {
			const allOn = files.every(f => f.enabled);
			files.forEach(f => f.enabled = !allOn);
			this.plugin.settings.disabledDicts = files.filter(f => !f.enabled).map(f => f.path);
			await this.plugin.saveSettings();
			this.renderDictListDrawer();
			this.executeSearch(this.currentQuery);
		});

		const listEl = this.dictListDrawerEl.createDiv({ cls: 'mdterm-drawer-list' });

		files.forEach((f, idx) => {
			const itemEl = listEl.createDiv({ cls: 'mdterm-drawer-item' });

			// Checkbox
			const cb = itemEl.createEl('input', { type: 'checkbox' });
			cb.checked = f.enabled;
			cb.addEventListener('change', async (e) => {
				f.enabled = (e.target as HTMLInputElement).checked;
				this.plugin.settings.disabledDicts = files.filter(file => !file.enabled).map(file => file.path);
				await this.plugin.saveSettings();
				this.executeSearch(this.currentQuery);
			});

			// Title & Count
			const nameEl = itemEl.createSpan({ cls: 'mdterm-drawer-item-name', text: f.name });
			itemEl.createSpan({ cls: 'mdterm-drawer-item-count', text: `${f.entryCount.toLocaleString()} 條` });

			// Up/Down Sort buttons
			const sortBtnsEl = itemEl.createDiv({ cls: 'mdterm-drawer-sort-btns' });
			const upBtn = sortBtnsEl.createEl('button', { cls: 'mdterm-drawer-sort-btn', attr: { title: '上移' } });
			setIcon(upBtn, 'arrow-up');
			upBtn.disabled = (idx === 0);
			upBtn.addEventListener('click', async () => {
				if (idx > 0) {
					const temp = files[idx - 1];
					files[idx - 1] = files[idx];
					files[idx] = temp;
					this.plugin.settings.dictFileOrder = files.map(file => file.path);
					await this.plugin.saveSettings();
					this.renderDictListDrawer();
					this.executeSearch(this.currentQuery);
				}
			});

			const downBtn = sortBtnsEl.createEl('button', { cls: 'mdterm-drawer-sort-btn', attr: { title: '下移' } });
			setIcon(downBtn, 'arrow-down');
			downBtn.disabled = (idx === files.length - 1);
			downBtn.addEventListener('click', async () => {
				if (idx < files.length - 1) {
					const temp = files[idx + 1];
					files[idx + 1] = files[idx];
					files[idx] = temp;
					this.plugin.settings.dictFileOrder = files.map(file => file.path);
					await this.plugin.saveSettings();
					this.renderDictListDrawer();
					this.executeSearch(this.currentQuery);
				}
			});
		});
	}

	private renderPlaceholder(text: string): void {
		this.resultsContainerEl.empty();
		const ph = this.resultsContainerEl.createDiv({ cls: 'mdterm-placeholder' });
		ph.createSpan({ cls: 'mdterm-placeholder-text', text });
	}

	public async searchExternal(query: string, mode?: DictSearchMode): Promise<void> {
		this.showResultsView();
		this.searchInputEl.value = query;
		this.currentQuery = query;
		if (mode) {
			this.currentMode = mode;
			this.modeTabsEl.querySelectorAll('.mdterm-mode-tab').forEach(el => {
				el.toggleClass('active', el.textContent?.includes(mode));
			});
		}
		await this.executeSearch(query);
	}

	private async executeSearch(query: string): Promise<void> {
		const q = query.trim();
		if (!q) {
			this.renderPlaceholder('📖 輸入關鍵詞開始查詢');
			return;
		}

		if (!this.plugin.engine.isReady) {
			this.renderPlaceholder('⏳ 辭典載入中…');
			return;
		}

		this.showResultsView();
		this.resultsContainerEl.empty();

		const loadingEl = this.resultsContainerEl.createDiv({ cls: 'mdterm-loading-spinner' });
		loadingEl.createSpan({ text: '搜尋中…' });

		try {
			const results = await this.plugin.engine.search(q, this.currentMode);
			this.renderSearchResults(results, q);
		} catch (err) {
			this.resultsContainerEl.empty();
			this.renderPlaceholder('⚠️ 搜尋發生錯誤');
		}
	}

	private renderSearchResults(results: SearchResult[], query: string): void {
		this.resultsContainerEl.empty();

		if (results.length === 0) {
			this.renderPlaceholder(`🔍 未找到符合「${query}」的詞條`);
			return;
		}

		const statusEl = this.resultsContainerEl.createDiv({ cls: 'mdterm-results-status' });
		statusEl.createSpan({ text: `找到 ${results.length} 筆結果` });

		// Group results by dictionary file
		const groups = new Map<number, { name: string; items: SearchResult[] }>();
		results.forEach(r => {
			if (!groups.has(r.fileId)) {
				groups.set(r.fileId, { name: r.fileName, items: [] });
			}
			groups.get(r.fileId)!.items.push(r);
		});

		groups.forEach((group) => {
			const groupEl = this.resultsContainerEl.createDiv({ cls: 'mdterm-result-group' });

			const groupHeaderEl = groupEl.createDiv({ cls: 'mdterm-result-group-header' });
			groupHeaderEl.createSpan({ cls: 'mdterm-result-group-title', text: `📖 ${group.name}` });
			groupHeaderEl.createSpan({ cls: 'mdterm-result-group-badge', text: `${group.items.length}` });

			groupHeaderEl.addEventListener('click', () => {
				groupEl.toggleClass('collapsed', !groupEl.hasClass('collapsed'));
			});

			const listEl = groupEl.createDiv({ cls: 'mdterm-result-items-list' });

			group.items.forEach(item => {
				const itemEl = listEl.createDiv({ cls: 'mdterm-result-item' });

				const headwordEl = itemEl.createDiv({ cls: 'mdterm-result-headword' });
				this.highlightText(headwordEl, item.headword, query);

				if (item.snippet) {
					const snippetEl = itemEl.createDiv({ cls: 'mdterm-result-snippet' });
					this.highlightText(snippetEl, item.snippet, query);
				}

				itemEl.addEventListener('click', () => {
					this.openEntryDetail(item.fileId, item.entryId);
				});
			});
		});
	}

	private highlightText(parent: HTMLElement, text: string, query: string): void {
		if (!query) {
			parent.setText(text);
			return;
		}
		const terms = query.trim().split(/\s+/).filter(Boolean);
		const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
		const parts = text.split(regex);

		parts.forEach(part => {
			if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
				parent.createSpan({ text: part, cls: 'mdterm-highlight' });
			} else {
				parent.createSpan({ text: part });
			}
		});
	}

	public async openEntryDetail(fileId: number, entryId: number): Promise<void> {
		this.activeEntry = { fileId, entryId };
		this.showDetailView();

		this.entryDetailContainerEl.empty();
		const loadingEl = this.entryDetailContainerEl.createDiv({ cls: 'mdterm-loading-spinner' });
		loadingEl.createSpan({ text: '載入詞條中…' });

		const result = await this.plugin.engine.getEntryContent(fileId, entryId);
		if (!result) {
			this.entryDetailContainerEl.empty();
			this.entryDetailContainerEl.createDiv({ cls: 'mdterm-placeholder', text: '⚠️ 無法讀取詞條內容' });
			return;
		}

		this.entryDetailContainerEl.empty();

		// Detail Header Navigation Bar
		const navHeaderEl = this.entryDetailContainerEl.createDiv({ cls: 'mdterm-detail-nav' });

		const backBtn = navHeaderEl.createEl('button', { cls: 'mdterm-detail-nav-btn', attr: { title: '返回結果列表' } });
		setIcon(backBtn, 'arrow-left');
		backBtn.createSpan({ text: '返回' });
		backBtn.addEventListener('click', () => this.showResultsView());

		const dictTagEl = navHeaderEl.createSpan({ cls: 'mdterm-detail-dict-tag', text: `📖 ${result.file.name}` });

		// Actions (Copy / Insert into note)
		const actionsEl = navHeaderEl.createDiv({ cls: 'mdterm-detail-actions' });

		const quoteBtn = actionsEl.createEl('button', { cls: 'mdterm-action-icon-btn', attr: { title: '引用並插入筆記' } });
		setIcon(quoteBtn, 'quote');
		quoteBtn.addEventListener('click', () => this.insertEntryIntoActiveNote(result.entry, result.file, result.content));

		const copyBtn = actionsEl.createEl('button', { cls: 'mdterm-action-icon-btn', attr: { title: '複製內文' } });
		setIcon(copyBtn, 'copy');
		copyBtn.addEventListener('click', () => {
			navigator.clipboard.writeText(result.content);
			new Notice('✅ 已複製辭典內文');
		});

		// Detail Content Area
		const contentEl = this.entryDetailContainerEl.createDiv({ cls: 'mdterm-detail-content markdown-rendered' });

		// Use Obsidian native MarkdownRenderer
		const comp = new Component();
		comp.load();
		await MarkdownRenderer.render(this.app, result.content, contentEl, '', comp);

		// Bottom Prev/Next Pagination Bar
		const paginationEl = this.entryDetailContainerEl.createDiv({ cls: 'mdterm-detail-pagination' });

		const prevEntry = this.plugin.engine.getAdjacentEntry(fileId, entryId, -1);
		const prevBtn = paginationEl.createEl('button', {
			cls: 'mdterm-pagination-btn',
			text: prevEntry ? `← ${prevEntry.cleanHeadword}` : '← 第一條',
			attr: { title: '前一條詞目' }
		});
		prevBtn.disabled = !prevEntry;
		if (prevEntry) {
			prevBtn.addEventListener('click', () => this.openEntryDetail(fileId, prevEntry.id));
		}

		const nextEntry = this.plugin.engine.getAdjacentEntry(fileId, entryId, 1);
		const nextBtn = paginationEl.createEl('button', {
			cls: 'mdterm-pagination-btn',
			text: nextEntry ? `${nextEntry.cleanHeadword} →` : '最後一條 →',
			attr: { title: '後一條詞目' }
		});
		nextBtn.disabled = !nextEntry;
		if (nextEntry) {
			nextBtn.addEventListener('click', () => this.openEntryDetail(fileId, nextEntry.id));
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

		// Find the active or most recent Markdown editor
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
		if (!targetEditor && (this.app.workspace as any).activeEditor?.editor) {
			targetEditor = (this.app.workspace as any).activeEditor.editor;
		}

		if (targetEditor) {
			targetEditor.focus();
			targetEditor.replaceSelection(insertText);
			new Notice(`✅ 已成功插入《${file.name}》【${entry.cleanHeadword}】`);
		} else {
			// If no editor is open, copy to clipboard and notify clearly
			navigator.clipboard.writeText(insertText);
			new Notice(`📋 目前未開啟任何筆記編輯器，已將引用複製至剪貼簿！`);
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

	async onClose(): Promise<void> {}
}
