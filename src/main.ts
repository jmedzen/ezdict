import { Plugin, WorkspaceLeaf, Editor, Menu, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, EzdictSettings, SectionIndex } from './types';
import { DictEngine } from './engine/DictEngine';
import { DictDownloader } from './services/DictDownloader';
import { EzdictSettingTab } from './settings';
import { EZDICT_VIEW_TYPE, DictView } from './views/DictView';
import { DictSuggestModal } from './views/DictModal';
import { t } from './i18n';

export default class EzdictPlugin extends Plugin {
	settings: EzdictSettings;
	engine: DictEngine;
	downloader: DictDownloader;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize Downloader & Dictionary Engine
		this.downloader = new DictDownloader(this.app);
		this.engine = new DictEngine(this.app, this.settings);

		// Register Sidebar View
		this.registerView(
			EZDICT_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new DictView(leaf, this)
		);

		// Add Ribbon Icon in left bar
		this.addRibbonIcon('book-open', 'Ezdict', () => {
			void this.activateSidebarView();
		});

		// Register Command: Open Sidebar View (ID without plugin prefix per guidelines)
		this.addCommand({
			id: 'open-sidebar',
			name: t('command.openSidebar'),
			callback: () => {
				void this.activateSidebarView();
			}
		});

		// Register Command: Quick Lookup Modal
		this.addCommand({
			id: 'quick-dict-lookup',
			name: t('command.quickLookup'),
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection().trim();
				new DictSuggestModal(this.app, this, selection).open();
			},
			callback: () => {
				new DictSuggestModal(this.app, this).open();
			}
		});

		// Register Command: Lookup Selection in Sidebar
		this.addCommand({
			id: 'lookup-selection-in-sidebar',
			name: t('command.lookupSelection'),
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection().trim();
				if (!selection) {
					new Notice(t('notice.selectTextFirst'));
					return;
				}
				void this.searchInSidebar(selection);
			}
		});

		// Register Editor Context Menu for Selection Lookup
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				if (!this.settings.enableSelectionMenu) return;
				const selection = editor.getSelection().trim();
				if (selection && selection.length > 0) {
					menu.addItem((item) => {
						const preview = selection.length > 10 ? selection.slice(0, 10) + '…' : selection;
						item
							.setTitle(t('menu.searchInEzdict', { query: preview }))
							.setIcon('book-open')
							.onClick(() => {
								void this.searchInSidebar(selection);
							});
					});
				}
			})
		);

		// Register Settings Tab
		this.addSettingTab(new EzdictSettingTab(this.app, this));

		// Load Cache and initialize engine in background
		this.app.workspace.onLayoutReady(() => {
			void (async () => {
				const cache = await this.loadIndexCache();
				await this.engine.initialize(cache);
				await this.saveIndexCache();
			})();
		});
	}

	onunload(): void {
		// Do not detach leaves in onunload to preserve user layout
	}

	async activateSidebarView(): Promise<WorkspaceLeaf> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(EZDICT_VIEW_TYPE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: EZDICT_VIEW_TYPE,
					active: true
				});
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			await workspace.revealLeaf(leaf);
		}
		return leaf;
	}

	async searchInSidebar(query: string): Promise<void> {
		const leaf = await this.activateSidebarView();
		if (leaf && leaf.view instanceof DictView) {
			await leaf.view.searchExternal(query);
		}
	}

	async loadSettings(): Promise<void> {
		const loaded = await this.loadData() as Partial<EzdictSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		if (this.engine) {
			this.engine.updateSettings(this.settings);
		}
	}

	async loadIndexCache(): Promise<Record<string, SectionIndex> | undefined> {
		try {
			const data = await this.loadData() as Record<string, unknown> | null;
			if (data && typeof data === 'object' && '_indexCache' in data) {
				return data._indexCache as Record<string, SectionIndex>;
			}
			return undefined;
		} catch {
			return undefined;
		}
	}

	async saveIndexCache(): Promise<void> {
		try {
			const current = (await this.loadData() as Record<string, unknown> | null) ?? {};
			current._indexCache = this.engine.getCacheData();
			await this.saveData(current);
		} catch (err) {
			console.warn('[Ezdict] Failed to save index cache:', err);
		}
	}
}
