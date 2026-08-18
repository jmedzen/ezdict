import { App, SuggestModal } from 'obsidian';
import type EzdictPlugin from '../main';
import { SearchResult } from '../types';
import { EZDICT_VIEW_TYPE, DictView } from './DictView';
import { t } from '../i18n';

export class DictSuggestModal extends SuggestModal<SearchResult> {
	plugin: EzdictPlugin;
	private initialQuery: string;

	constructor(app: App, plugin: EzdictPlugin, initialQuery: string = '') {
		super(app);
		this.plugin = plugin;
		this.initialQuery = initialQuery;
		this.setPlaceholder(t('search.placeholderModal'));
	}

	onOpen(): void {
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
		el.addClass('ezdict-modal-suggest-item');
		
		const headerEl = el.createDiv({ cls: 'ezdict-modal-suggest-header' });
		headerEl.createSpan({ cls: 'ezdict-modal-suggest-title', text: item.headword });
		headerEl.createSpan({ cls: 'ezdict-modal-suggest-dict', text: `📖 ${item.fileName}` });

		if (item.snippet) {
			const snippetEl = el.createDiv({ cls: 'ezdict-modal-suggest-snippet' });
			snippetEl.setText(item.snippet);
		}
	}

	onChooseSuggestion(item: SearchResult, _evt: MouseEvent | KeyboardEvent): void {
		void (async () => {
			await this.plugin.activateSidebarView();
			const leaves = this.app.workspace.getLeavesOfType(EZDICT_VIEW_TYPE);
			if (leaves.length > 0) {
				const view = leaves[0].view as DictView;
				await view.openEntryDetail(item.fileId, item.entryId);
			}
		})();
	}
}
