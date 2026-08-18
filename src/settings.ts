import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type EzdictPlugin from './main';
import { DictSearchMode } from './types';
import { t } from './i18n';

const SAMPLE_DICT_URL = 'https://dl.mahabodhi.co/downloadFile?id=Kqf9yp2wb0PRgLV';

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
				heading: t('group.dictAndIndex'),
				items: [
					{
						name: t('setting.dictPath.name'),
						desc: t('setting.dictPath.desc'),
						control: {
							type: 'text',
							key: 'dictDirectory',
							placeholder: t('setting.dictPath.placeholder')
						}
					},
					{
						name: t('setting.headingLevel.name'),
						desc: t('setting.headingLevel.desc'),
						control: {
							type: 'dropdown',
							key: 'entryHeadingLevel',
							options: {
								'2': t('setting.headingLevel.h2'),
								'3': t('setting.headingLevel.h3'),
								'4': t('setting.headingLevel.h4'),
								'5': t('setting.headingLevel.h5'),
								'6': t('setting.headingLevel.h6'),
								'0': t('setting.headingLevel.auto')
							}
						}
					},
					{
						name: t('setting.downloadSample.name'),
						desc: t('setting.downloadSample.desc'),
						render: (setting: Setting) => {
							this.buildDownloadSampleControl(setting);
						}
					},
					{
						name: t('setting.reindex.name'),
						desc: t('setting.reindex.desc'),
						render: (setting: Setting) => {
							this.buildReindexControl(setting);
						}
					}
				]
			},
			{
				type: 'group',
				heading: t('group.searchAndCitation'),
				items: [
					{
						name: t('setting.defaultMode.name'),
						desc: t('setting.defaultMode.desc'),
						control: {
							type: 'dropdown',
							key: 'defaultMode',
							options: {
								'prefix': t('mode.prefix'),
								'fuzzy': t('mode.fuzzy'),
								'fulltext': t('mode.fulltext')
							}
						}
					},
					{
						name: t('setting.maxResults.name'),
						desc: t('setting.maxResults.desc'),
						control: {
							type: 'slider',
							key: 'maxResultsPerDict',
							min: 20,
							max: 1000,
							step: 10
						}
					},
					{
						name: t('setting.proximityDistance.name'),
						desc: t('setting.proximityDistance.desc'),
						control: {
							type: 'slider',
							key: 'maxProximityDistance',
							min: 20,
							max: 500,
							step: 10
						}
					},
					{
						name: t('setting.citationTemplate.name'),
						desc: t('setting.citationTemplate.desc'),
						control: {
							type: 'dropdown',
							key: 'citationTemplate',
							options: {
								'blockquote': t('citation.blockquote'),
								'footnote': t('citation.footnote'),
								'wikilink': t('citation.wikilink'),
								'raw': t('citation.raw')
							}
						}
					},
					{
						name: t('setting.selectionMenu.name'),
						desc: t('setting.selectionMenu.desc'),
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

	private buildDownloadSampleControl(setting: Setting): void {
		setting.addButton(button => button
			.setButtonText(t('setting.downloadSample.btn'))
			.setCta()
			.onClick(async () => {
				button.setDisabled(true);
				button.setButtonText(t('setting.downloadSample.connecting'));

				try {
					const result = await this.plugin.downloader.downloadAndImport(
						SAMPLE_DICT_URL,
						this.plugin.settings.dictDirectory,
						(status) => {
							button.setButtonText(status);
						}
					);

					new Notice(result.message, 6000);
					button.setButtonText(t('setting.reindex.scanning'));
					await this.plugin.engine.initialize();
					await this.plugin.saveIndexCache();

					button.setButtonText(t('setting.downloadSample.done'));
					window.setTimeout(() => {
						button.setDisabled(false);
						button.setButtonText(t('setting.downloadSample.btn'));
					}, 3000);
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					new Notice(`❌ ${errMsg}`, 7000);
					button.setDisabled(false);
					button.setButtonText(t('setting.downloadSample.retry'));
					window.setTimeout(() => {
						button.setButtonText(t('setting.downloadSample.btn'));
					}, 3000);
				}
			}));
	}

	private buildReindexControl(setting: Setting): void {
		setting.addButton(button => button
			.setButtonText(t('setting.reindex.btn'))
			.onClick(async () => {
				button.setDisabled(true);
				button.setButtonText(t('setting.reindex.scanning'));
				await this.plugin.engine.initialize();
				await this.plugin.saveIndexCache();
				button.setDisabled(false);
				button.setButtonText(t('setting.reindex.done'));
				window.setTimeout(() => button.setButtonText(t('setting.reindex.btn')), 2500);
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
			.setName(t('group.dictAndIndex'))
			.setHeading();

		// 1. Dictionary Directory Setting
		new Setting(containerEl)
			.setName(t('setting.dictPath.name'))
			.setDesc(t('setting.dictPath.desc'))
			.addText(text => text
				.setPlaceholder(t('setting.dictPath.placeholder'))
				.setValue(this.plugin.settings.dictDirectory)
				.onChange(async (value) => {
					this.plugin.settings.dictDirectory = value.trim();
					await this.plugin.saveSettings();
					await this.plugin.engine.initialize();
				}));

		// 2. Entry Heading Level Setting (h2 ~ h6)
		new Setting(containerEl)
			.setName(t('setting.headingLevel.name'))
			.setDesc(t('setting.headingLevel.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('2', t('setting.headingLevel.h2'))
				.addOption('3', t('setting.headingLevel.h3'))
				.addOption('4', t('setting.headingLevel.h4'))
				.addOption('5', t('setting.headingLevel.h5'))
				.addOption('6', t('setting.headingLevel.h6'))
				.addOption('0', t('setting.headingLevel.auto'))
				.setValue(String(this.plugin.settings.entryHeadingLevel ?? 3))
				.onChange(async (value) => {
					this.plugin.settings.entryHeadingLevel = parseInt(value, 10);
					await this.plugin.saveSettings();
					await this.plugin.engine.initialize();
					await this.plugin.saveIndexCache();
				}));

		// 3. Download Sample Dictionaries Setting
		const downloadSampleSetting = new Setting(containerEl)
			.setName(t('setting.downloadSample.name'))
			.setDesc(t('setting.downloadSample.desc'));
		this.buildDownloadSampleControl(downloadSampleSetting);

		// 4. Manual Re-index Button
		const reindexSetting = new Setting(containerEl)
			.setName(t('setting.reindex.name'))
			.setDesc(t('setting.reindex.desc'));
		this.buildReindexControl(reindexSetting);

		// Section 2: Search & Citation
		new Setting(containerEl)
			.setName(t('group.searchAndCitation'))
			.setHeading();

		// 5. Default Search Mode
		new Setting(containerEl)
			.setName(t('setting.defaultMode.name'))
			.setDesc(t('setting.defaultMode.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('prefix', t('mode.prefix'))
				.addOption('fuzzy', t('mode.fuzzy'))
				.addOption('fulltext', t('mode.fulltext'))
				.setValue(this.plugin.settings.defaultMode)
				.onChange(async (value) => {
					this.plugin.settings.defaultMode = value as DictSearchMode;
					await this.plugin.saveSettings();
				}));

		// 6. Max Results
		new Setting(containerEl)
			.setName(t('setting.maxResults.name'))
			.setDesc(t('setting.maxResults.desc'))
			.addSlider(slider => slider
				.setLimits(20, 1000, 10)
				.setValue(this.plugin.settings.maxResultsPerDict)
				.onChange(async (value) => {
					this.plugin.settings.maxResultsPerDict = value;
					await this.plugin.saveSettings();
				}));

		// 7. Proximity Distance
		new Setting(containerEl)
			.setName(t('setting.proximityDistance.name'))
			.setDesc(t('setting.proximityDistance.desc'))
			.addSlider(slider => slider
				.setLimits(20, 500, 10)
				.setValue(this.plugin.settings.maxProximityDistance)
				.onChange(async (value) => {
					this.plugin.settings.maxProximityDistance = value;
					await this.plugin.saveSettings();
				}));

		// 8. Citation / Insert Format
		new Setting(containerEl)
			.setName(t('setting.citationTemplate.name'))
			.setDesc(t('setting.citationTemplate.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('blockquote', t('citation.blockquote'))
				.addOption('footnote', t('citation.footnote'))
				.addOption('wikilink', t('citation.wikilink'))
				.addOption('raw', t('citation.raw'))
				.setValue(this.plugin.settings.citationTemplate)
				.onChange(async (value) => {
					this.plugin.settings.citationTemplate = value;
					await this.plugin.saveSettings();
				}));

		// 9. Right-click context menu
		new Setting(containerEl)
			.setName(t('setting.selectionMenu.name'))
			.setDesc(t('setting.selectionMenu.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSelectionMenu)
				.onChange(async (value) => {
					this.plugin.settings.enableSelectionMenu = value;
					await this.plugin.saveSettings();
				}));
	}
}
