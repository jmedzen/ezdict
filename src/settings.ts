import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type EzdictPlugin from './main';
import { DictSearchMode } from './types';

export class EzdictSettingTab extends PluginSettingTab {
	plugin: EzdictPlugin;

	constructor(app: App, plugin: EzdictPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Declarative Setting Definitions for Obsidian 1.13.0+ and global Settings search.
	 */
	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: '辭典目錄與索引 (Dictionaries & Index)',
				items: [
					{
						name: '辭典目錄路徑 (Dictionary Path)',
						desc: '存放 .md 辭典檔案的資料夾路徑。支援 Vault 內部相對路徑（如 dictionary_folder）或電腦上的絕對路徑。',
						control: {
							type: 'text',
							key: 'dictDirectory',
							placeholder: '例如: dictionary_folder 或 /Users/jm/dictionary_folder'
						}
					},
					{
						name: '詞條標題層級 (Entry Heading Level)',
						desc: '定義 Markdown 中作為獨立詞條開頭的標題層級（預設為 h3 ###）。修改後將自動重新掃描辭典檔案並更新索引。',
						control: {
							type: 'dropdown',
							key: 'entryHeadingLevel',
							options: {
								'2': 'h2 (## 標題二)',
								'3': 'h3 (### 標題三 - 預設)',
								'4': 'h4 (#### 標題四)',
								'5': 'h5 (##### 標題五)',
								'6': 'h6 (###### 標題六)',
								'0': '自動偵測 (Auto-Detect 最深層級)'
							}
						}
					},
					{
						name: '從網址下載辭典 (Download Dictionary from URL)',
						desc: '輸入辭典檔案（.md 或 .zip）的直接下載網址。若是 .zip 壓縮包，將自動解壓縮至辭典目錄並刪除 .zip 檔案。',
						render: (setting: Setting) => {
							this.buildDownloadControl(setting);
						}
					},
					{
						name: '重新建立辭典索引',
						desc: '當您新增或更新了辭典 .md 檔案後，點擊此按鈕立即重新掃描並更新快取。',
						render: (setting: Setting) => {
							this.buildReindexControl(setting);
						}
					}
				]
			},
			{
				type: 'group',
				heading: '搜尋與引用 (Search & Citation)',
				items: [
					{
						name: '預設搜尋模式 (Default Search Mode)',
						desc: '開啟面板或進行查詢時的預設模式。',
						control: {
							type: 'dropdown',
							key: 'defaultMode',
							options: {
								'prefix': '📖 詞條前綴 (Prefix - 0延遲)',
								'fuzzy': '🔍 詞條模糊 (Fuzzy - 包含子字串)',
								'fulltext': '📑 內文全文 (Full-Text - 內文檢索)'
							}
						}
					},
					{
						name: '每本辭典最大搜尋筆數',
						desc: '限制每本辭典回傳之最大結果數量（預設 350 筆）。',
						control: {
							type: 'slider',
							key: 'maxResultsPerDict',
							min: 20,
							max: 1000,
							step: 10
						}
					},
					{
						name: '搜尋鄰近詞距上限 (Proximity Distance)',
						desc: '全文檢索多關鍵詞 (AND 查詢) 時允許的最大字元距離。',
						control: {
							type: 'slider',
							key: 'maxProximityDistance',
							min: 20,
							max: 500,
							step: 10
						}
					},
					{
						name: '一鍵引用插入格式 (Citation Template)',
						desc: '點擊「插入筆記」時的格式樣板。',
						control: {
							type: 'dropdown',
							key: 'citationTemplate',
							options: {
								'blockquote': '引用區塊 (> 釋義)',
								'footnote': '腳註引用 ([^詞條]: 釋義)',
								'wikilink': '雙向連結 ([[詞條]])',
								'raw': '原始文字'
							}
						}
					},
					{
						name: '啟用編輯器右鍵選單劃詞即查',
						desc: '選取文字後，右鍵選單顯示「在 Ezdict 查詢」項目。',
						control: {
							type: 'toggle',
							key: 'enableSelectionMenu'
						}
					}
				]
			}
		];
	}

	override getControlValue(key: string): unknown {
		if (key === 'entryHeadingLevel') {
			return String(this.plugin.settings.entryHeadingLevel ?? 3);
		}
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'entryHeadingLevel') {
			this.plugin.settings.entryHeadingLevel = parseInt(String(value), 10);
		} else {
			(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		}
		await this.plugin.saveSettings();
		if (key === 'dictDirectory' || key === 'entryHeadingLevel') {
			await this.plugin.engine.initialize();
			await this.plugin.saveIndexCache();
		}
	}

	private buildDownloadControl(setting: Setting): void {
		let downloadUrlInput = '';
		setting.addText(text => {
			text.setPlaceholder('https://example.com/dictionaries.zip');
			text.inputEl.addClass('ezdict-settings-input');
			text.onChange(value => {
				downloadUrlInput = value.trim();
			});
		});

		setting.addButton(button => button
			.setButtonText('⬇️ 下載並匯入')
			.setCta()
			.onClick(async () => {
				if (!downloadUrlInput) {
					new Notice('⚠️ 請先輸入辭典下載網址');
					return;
				}
				button.setDisabled(true);
				button.setButtonText('下載中…');

				try {
					const result = await this.plugin.downloader.downloadAndImport(
						downloadUrlInput,
						this.plugin.settings.dictDirectory,
						(status) => {
							button.setButtonText(status);
						}
					);

					new Notice(result.message, 6000);
					button.setButtonText('更新索引中…');
					await this.plugin.engine.initialize();
					await this.plugin.saveIndexCache();

					button.setButtonText('✅ 匯入完成');
					window.setTimeout(() => {
						button.setDisabled(false);
						button.setButtonText('⬇️ 下載並匯入');
					}, 3000);
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					new Notice(`❌ 下載失敗: ${errMsg}`, 7000);
					button.setDisabled(false);
					button.setButtonText('❌ 下載重試');
					window.setTimeout(() => {
						button.setButtonText('⬇️ 下載並匯入');
					}, 3000);
				}
			}));
	}

	private buildReindexControl(setting: Setting): void {
		setting.addButton(button => button
			.setButtonText('🔄 立即重新掃描索引')
			.onClick(async () => {
				button.setDisabled(true);
				button.setButtonText('掃描中…');
				await this.plugin.engine.initialize();
				await this.plugin.saveIndexCache();
				button.setDisabled(false);
				button.setButtonText('✅ 掃描完成');
				window.setTimeout(() => button.setButtonText('🔄 立即重新掃描索引'), 2500);
			}));
	}

	/**
	 * Imperative rendering for backward compatibility with Obsidian versions older than 1.13.0.
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Section 1: Dictionaries & Index
		new Setting(containerEl)
			.setName('辭典目錄與索引 (Dictionaries & Index)')
			.setHeading();

		// 1. Dictionary Directory Setting
		new Setting(containerEl)
			.setName('辭典目錄路徑 (Dictionary Path)')
			.setDesc('存放 .md 辭典檔案的資料夾路徑。支援 Vault 內部相對路徑（如 dictionary_folder）或電腦上的絕對路徑。')
			.addText(text => text
				.setPlaceholder('例如: dictionary_folder 或 /Users/jm/dictionary_folder')
				.setValue(this.plugin.settings.dictDirectory)
				.onChange(async (value) => {
					this.plugin.settings.dictDirectory = value.trim();
					await this.plugin.saveSettings();
					await this.plugin.engine.initialize();
				}));

		// 2. Entry Heading Level Setting (h2 ~ h6)
		new Setting(containerEl)
			.setName('詞條標題層級 (Entry Heading Level)')
			.setDesc('定義 Markdown 中作為獨立詞條開頭的標題層級（預設為 h3 ###）。修改後將自動重新掃描辭典檔案並更新索引。')
			.addDropdown(dropdown => dropdown
				.addOption('2', 'h2 (## 標題二)')
				.addOption('3', 'h3 (### 標題三 - 預設)')
				.addOption('4', 'h4 (#### 標題四)')
				.addOption('5', 'h5 (##### 標題五)')
				.addOption('6', 'h6 (###### 標題六)')
				.addOption('0', '自動偵測 (Auto-Detect 最深層級)')
				.setValue(String(this.plugin.settings.entryHeadingLevel ?? 3))
				.onChange(async (value) => {
					this.plugin.settings.entryHeadingLevel = parseInt(value, 10);
					await this.plugin.saveSettings();
					await this.plugin.engine.initialize();
					await this.plugin.saveIndexCache();
				}));

		// 3. Download Dictionary from URL Setting
		const downloadSetting = new Setting(containerEl)
			.setName('從網址下載辭典 (Download Dictionary from URL)')
			.setDesc('輸入辭典檔案（.md 或 .zip）的直接下載網址。若是 .zip 壓縮包，將自動解壓縮至辭典目錄並刪除 .zip 檔案。');
		this.buildDownloadControl(downloadSetting);

		// 4. Manual Re-index Button
		const reindexSetting = new Setting(containerEl)
			.setName('重新建立辭典索引')
			.setDesc('當您新增或更新了辭典 .md 檔案後，點擊此按鈕立即重新掃描並更新快取。');
		this.buildReindexControl(reindexSetting);

		// Section 2: Search & Citation
		new Setting(containerEl)
			.setName('搜尋與引用 (Search & Citation)')
			.setHeading();

		// 5. Default Search Mode
		new Setting(containerEl)
			.setName('預設搜尋模式 (Default Search Mode)')
			.setDesc('開啟面板或進行查詢時的預設模式。')
			.addDropdown(dropdown => dropdown
				.addOption('prefix', '📖 詞條前綴 (Prefix - 0延遲)')
				.addOption('fuzzy', '🔍 詞條模糊 (Fuzzy - 包含子字串)')
				.addOption('fulltext', '📑 內文全文 (Full-Text - 內文檢索)')
				.setValue(this.plugin.settings.defaultMode)
				.onChange(async (value) => {
					this.plugin.settings.defaultMode = value as DictSearchMode;
					await this.plugin.saveSettings();
				}));

		// 6. Max Results
		new Setting(containerEl)
			.setName('每本辭典最大搜尋筆數')
			.setDesc('限制每本辭典回傳之最大結果數量（預設 350 筆）。')
			.addSlider(slider => slider
				.setLimits(20, 1000, 10)
				.setValue(this.plugin.settings.maxResultsPerDict)
				.onChange(async (value) => {
					this.plugin.settings.maxResultsPerDict = value;
					await this.plugin.saveSettings();
				}));

		// 7. Proximity Distance
		new Setting(containerEl)
			.setName('搜尋鄰近詞距上限 (Proximity Distance)')
			.setDesc('全文檢索多關鍵詞 (AND 查詢) 時允許的最大字元距離。')
			.addSlider(slider => slider
				.setLimits(20, 500, 10)
				.setValue(this.plugin.settings.maxProximityDistance)
				.onChange(async (value) => {
					this.plugin.settings.maxProximityDistance = value;
					await this.plugin.saveSettings();
				}));

		// 8. Citation / Insert Format
		new Setting(containerEl)
			.setName('一鍵引用插入格式 (Citation Template)')
			.setDesc('點擊「插入筆記」時的格式樣板。')
			.addDropdown(dropdown => dropdown
				.addOption('blockquote', '引用區塊 (> 釋義)')
				.addOption('footnote', '腳註引用 ([^詞條]: 釋義)')
				.addOption('wikilink', '雙向連結 ([[詞條]])')
				.addOption('raw', '原始文字')
				.setValue(this.plugin.settings.citationTemplate)
				.onChange(async (value) => {
					this.plugin.settings.citationTemplate = value;
					await this.plugin.saveSettings();
				}));

		// 9. Right-click context menu
		new Setting(containerEl)
			.setName('啟用編輯器右鍵選單劃詞即查')
			.setDesc('選取文字後，右鍵選單顯示「在 Ezdict 查詢」項目。')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSelectionMenu)
				.onChange(async (value) => {
					this.plugin.settings.enableSelectionMenu = value;
					await this.plugin.saveSettings();
				}));
	}
}
