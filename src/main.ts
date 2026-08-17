import { Plugin, WorkspaceLeaf, Editor, MarkdownView, Menu, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, MdtermSettings, SectionIndex } from './types';
import { DictEngine } from './engine/DictEngine';
import { MdtermSettingTab } from './settings';
import { MDTERM_VIEW_TYPE, DictView } from './views/DictView';
import { DictSuggestModal } from './views/DictModal';

export default class MdtermPlugin extends Plugin {
	settings: MdtermSettings;
	engine: DictEngine;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize Dictionary Engine
		this.engine = new DictEngine(this.app, this.settings);

		// Register Sidebar View
		this.registerView(
			MDTERM_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new DictView(leaf, this)
		);

		// Add Ribbon Icon in left bar
		this.addRibbonIcon('book-open', 'mdterm 辭典', async () => {
			await this.activateSidebarView();
		});

		// Register Command: Open Sidebar View
		this.addCommand({
			id: 'open-mdterm-sidebar',
			name: '開啟 mdterm 辭典側邊欄',
			callback: async () => {
				await this.activateSidebarView();
			}
		});

		// Register Command: Quick Lookup Modal
		this.addCommand({
			id: 'quick-dict-lookup',
			name: '快速辭典查詢 (彈窗)',
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
			name: '在側邊欄查詢選取文字',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection().trim();
				if (!selection) {
					new Notice('請先選取要查詢的文字');
					return;
				}
				await this.searchInSidebar(selection);
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
							.setTitle(`在 mdterm 查詢「${preview}」`)
							.setIcon('book-open')
							.onClick(async () => {
								await this.searchInSidebar(selection);
							});
					});
				}
			})
		);

		// Register Settings Tab
		this.addSettingTab(new MdtermSettingTab(this.app, this));

		// Load Cache and initialize engine in background
		this.app.workspace.onLayoutReady(async () => {
			const cache = await this.loadIndexCache();
			await this.engine.initialize(cache);
			await this.saveIndexCache();
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(MDTERM_VIEW_TYPE);
	}

	async activateSidebarView(): Promise<WorkspaceLeaf> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(MDTERM_VIEW_TYPE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: MDTERM_VIEW_TYPE,
					active: true
				});
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		if (this.engine) {
			this.engine.updateSettings(this.settings);
		}
	}

	async loadIndexCache(): Promise<Record<string, SectionIndex> | undefined> {
		try {
			const data = await this.loadData();
			return data?._indexCache;
		} catch (e) {
			return undefined;
		}
	}

	async saveIndexCache(): Promise<void> {
		try {
			const current = await this.loadData() || {};
			current._indexCache = this.engine.getCacheData();
			await this.saveData(current);
		} catch (e) {
			console.warn('[mdterm] Failed to save index cache:', e);
		}
	}
}
