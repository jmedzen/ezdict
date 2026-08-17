import { App, SuggestModal, MarkdownRenderer, Component } from 'obsidian';
import type MdtermPlugin from '../main';
import { SearchResult } from '../types';
import { MDTERM_VIEW_TYPE, DictView } from './DictView';

export class DictSuggestModal extends SuggestModal<SearchResult> {
	plugin: MdtermPlugin;
	private initialQuery: string;

	constructor(app: App, plugin: MdtermPlugin, initialQuery: string = '') {
		super(app);
		this.plugin = plugin;
		this.initialQuery = initialQuery;
		this.setPlaceholder('輸入關鍵詞查詢辭典… (支援空白多詞 AND 檢索)');
	}

	onOpen(): void {
		super.onOpen();
		if (this.initialQuery) {
			this.inputEl.value = this.initialQuery;
			this.inputEl.dispatchEvent(new Event('input'));
		}
	}

	async getSuggestions(query: string): Promise<SearchResult[]> {
		const q = query.trim();
		if (!q || !this.plugin.engine.isReady) return [];
		return await this.plugin.engine.search(q, this.plugin.settings.defaultMode);
	}

	renderSuggestion(item: SearchResult, el: HTMLElement): void {
		el.addClass('mdterm-modal-suggest-item');
		
		const headerEl = el.createDiv({ cls: 'mdterm-modal-suggest-header' });
		headerEl.createSpan({ cls: 'mdterm-modal-suggest-title', text: item.headword });
		headerEl.createSpan({ cls: 'mdterm-modal-suggest-dict', text: `📖 ${item.fileName}` });

		if (item.snippet) {
			const snippetEl = el.createDiv({ cls: 'mdterm-modal-suggest-snippet' });
			snippetEl.setText(item.snippet);
		}
	}

	async onChooseSuggestion(item: SearchResult, evt: MouseEvent | KeyboardEvent): Promise<void> {
		// Open in right sidebar
		await this.plugin.activateSidebarView();
		const leaves = this.app.workspace.getLeavesOfType(MDTERM_VIEW_TYPE);
		if (leaves.length > 0) {
			const view = leaves[0].view as DictView;
			await view.openEntryDetail(item.fileId, item.entryId);
		}
	}
}
