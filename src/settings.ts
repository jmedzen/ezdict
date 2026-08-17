import { App, PluginSettingTab, Setting } from 'obsidian';
import type EzdictPlugin from './main';
import { DictSearchMode } from './types';

export class EzdictSettingTab extends PluginSettingTab {
	plugin: EzdictPlugin;

	constructor(app: App, plugin: EzdictPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

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

		// 3. Manual Re-index Button
		new Setting(containerEl)
			.setName('重新建立辭典索引')
			.setDesc('當您新增或更新了辭典 .md 檔案後，點擊此按鈕立即重新掃描並更新快取。')
			.addButton(button => button
				.setButtonText('🔄 立即重新掃描索引')
				.setCta()
				.onClick(async () => {
					button.setDisabled(true);
					button.setButtonText('掃描中…');
					await this.plugin.engine.initialize();
					await this.plugin.saveIndexCache();
					button.setDisabled(false);
					button.setButtonText('✅ 掃描完成');
					window.setTimeout(() => button.setButtonText('🔄 立即重新掃描索引'), 2500);
				}));

		// Section 2: Search & Citation
		new Setting(containerEl)
			.setName('搜尋與引用 (Search & Citation)')
			.setHeading();

		// 4. Default Search Mode
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

		// 5. Max Results
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

		// 6. Proximity Distance
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

		// 7. Citation / Insert Format
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

		// 8. Right-click context menu
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
