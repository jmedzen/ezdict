import { App, FileSystemAdapter, Notice, TFile, TFolder } from 'obsidian';
import { DictEntry, DictFileMetadata, DictSearchMode, MdtermSettings, SearchResult, SectionIndex } from '../types';
import { scanSections } from './SectionScanner';
import { ByteReader } from './ByteReader';
import { BigramIndex } from './BigramIndex';

export class DictEngine {
	private app: App;
	private settings: MdtermSettings;
	private byteReader: ByteReader;

	public files: DictFileMetadata[] = [];
	public sectionIndexes: Map<number, SectionIndex> = new Map();
	public bigramIndexes: Map<number, BigramIndex> = new Map();

	public isIndexing: boolean = false;
	public isReady: boolean = false;

	private listeners: ((ready: boolean) => void)[] = [];

	constructor(app: App, settings: MdtermSettings) {
		this.app = app;
		this.settings = settings;
		this.byteReader = new ByteReader(app);
	}

	public onReady(callback: (ready: boolean) => void): void {
		this.listeners.push(callback);
		if (this.isReady) callback(true);
	}

	private notifyReady(ready: boolean): void {
		this.listeners.forEach(cb => cb(ready));
	}

	public updateSettings(settings: MdtermSettings): void {
		this.settings = settings;
	}

	/**
	 * Scans the dictionary folder and loads or builds all section indexes.
	 */
	async initialize(cachedData?: Record<string, SectionIndex>): Promise<void> {
		if (this.isIndexing) return;
		this.isIndexing = true;
		this.notifyReady(false);

		try {
			const discovered = await this.discoverDictFiles();
			this.files = discovered;

			const newIndexes = new Map<number, SectionIndex>();
			const newBigrams = new Map<number, BigramIndex>();

			for (let i = 0; i < this.files.length; i++) {
				const f = this.files[i];
				let sectionIndex: SectionIndex | null = null;

				// Check cached index
				const targetLevel = this.settings.entryHeadingLevel || 3;
				if (cachedData && cachedData[f.path]) {
					const cached = cachedData[f.path];
					if (cached.mtime === f.mtime && cached.size === f.size && (!cached.entryLevel || cached.entryLevel === targetLevel)) {
						sectionIndex = { ...cached, fileId: f.id };
					}
				}

				// If cache miss, scan and build
				if (!sectionIndex) {
					const text = await this.byteReader.readFullText(f.path);
					sectionIndex = scanSections(text, f.id, f.path, f.size, f.mtime, targetLevel);
				}

				f.entryCount = sectionIndex.entries.length;
				newIndexes.set(f.id, sectionIndex);
				newBigrams.set(f.id, new BigramIndex(f.id, f.name, sectionIndex.entries));
			}

			this.sectionIndexes = newIndexes;
			this.bigramIndexes = newBigrams;
			this.isReady = true;
			this.notifyReady(true);
		} catch (err) {
			console.error('[mdterm] Failed to initialize dictionary engine:', err);
			new Notice('❌ mdterm 辭典引擎載入失敗，請檢查設定與辭典目錄');
		} finally {
			this.isIndexing = false;
		}
	}

	/**
	 * Discovers markdown files in the configured dictionary path.
	 */
	private async discoverDictFiles(): Promise<DictFileMetadata[]> {
		const result: DictFileMetadata[] = [];
		const dirPath = this.settings.dictDirectory.trim();
		if (!dirPath) return result;

		let fileSeq = 0;

		// 1. Check in Obsidian Vault
		const normalized = dirPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
		const folder = this.app.vault.getAbstractFileByPath(normalized);

		if (folder instanceof TFolder) {
			for (const child of folder.children) {
				if (child instanceof TFile && child.extension.toLowerCase() === 'md') {
					const name = child.basename;
					const enabled = !this.settings.disabledDicts.includes(child.path);
					const orderIdx = this.settings.dictFileOrder.indexOf(child.path);
					result.push({
						id: fileSeq++,
						name,
						path: child.path,
						isExternal: false,
						size: child.stat.size,
						mtime: child.stat.mtime,
						entryCount: 0,
						enabled,
						order: orderIdx !== -1 ? orderIdx : 999
					});
				}
			}
		}

		// 2. Check external absolute directory on Desktop Node.js environment
		if (result.length === 0 && typeof window !== 'undefined' && (window as any).require) {
			try {
				const fs = (window as any).require('fs');
				const pathModule = (window as any).require('path');
				let fullPath = dirPath;

				if (!pathModule.isAbsolute(dirPath)) {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						fullPath = pathModule.join(adapter.getBasePath(), dirPath);
					}
				}

				if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
					const items = fs.readdirSync(fullPath);
					for (const item of items) {
						if (item.startsWith('.') || !item.toLowerCase().endsWith('.md')) continue;
						const itemPath = pathModule.join(fullPath, item);
						const stat = fs.statSync(itemPath);
						if (stat.isFile()) {
							const name = item.replace(/\.md$/i, '');
							const enabled = !this.settings.disabledDicts.includes(itemPath);
							const orderIdx = this.settings.dictFileOrder.indexOf(itemPath);
							result.push({
								id: fileSeq++,
								name,
								path: itemPath,
								isExternal: true,
								size: stat.size,
								mtime: stat.mtimeMs,
								entryCount: 0,
								enabled,
								order: orderIdx !== -1 ? orderIdx : 999
							});
						}
					}
				}
			} catch (e) {
				console.warn('[mdterm] External directory scan error:', e);
			}
		}

		// Sort according to user preference
		result.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
		return result;
	}

	/**
	 * Search across all enabled dictionaries.
	 */
	async search(query: string, mode?: DictSearchMode): Promise<SearchResult[]> {
		const q = query.trim();
		if (!q || !this.isReady) return [];

		const searchMode = mode || this.settings.defaultMode;
		const maxResults = this.settings.maxResultsPerDict;
		const allResults: SearchResult[] = [];

		const activeFiles = this.files.filter(f => f.enabled);

		if (searchMode === 'prefix') {
			for (const file of activeFiles) {
				const bIdx = this.bigramIndexes.get(file.id);
				if (bIdx) {
					allResults.push(...bIdx.searchPrefix(q, maxResults));
				}
			}
		} else if (searchMode === 'fuzzy') {
			for (const file of activeFiles) {
				const bIdx = this.bigramIndexes.get(file.id);
				if (bIdx) {
					allResults.push(...bIdx.searchFuzzy(q, maxResults));
				}
			}
		} else if (searchMode === 'fulltext') {
			const terms = q.split(/\s+/).filter(Boolean);
			if (terms.length === 0) return [];

			for (const file of activeFiles) {
				const sIdx = this.sectionIndexes.get(file.id);
				if (!sIdx) continue;

				let foundCount = 0;
				for (const entry of sIdx.entries) {
					if (foundCount >= maxResults) break;
					// Read entry slice
					const text = await this.byteReader.readSlice(file.path, entry.byteOffset, entry.byteLength);
					const matches = BigramIndex.scanEntryText(
						text,
						terms,
						this.settings.maxProximityDistance,
						file.id,
						file.name,
						entry
					);
					if (matches.length > 0) {
						allResults.push(...matches);
						foundCount += matches.length;
					}
				}
			}
		}

		return allResults;
	}

	/**
	 * Fetches the Markdown content for a single entry.
	 */
	async getEntryContent(fileId: number, entryId: number): Promise<{ entry: DictEntry; file: DictFileMetadata; content: string } | null> {
		const file = this.files.find(f => f.id === fileId);
		const sIdx = this.sectionIndexes.get(fileId);
		if (!file || !sIdx) return null;

		const entry = sIdx.entries.find(e => e.id === entryId);
		if (!entry) return null;

		const content = await this.byteReader.readSlice(file.path, entry.byteOffset, entry.byteLength);
		return { entry, file, content };
	}

	/**
	 * Gets the adjacent entry (previous or next).
	 */
	getAdjacentEntry(fileId: number, currentEntryId: number, delta: number): DictEntry | null {
		const sIdx = this.sectionIndexes.get(fileId);
		if (!sIdx) return null;

		const idx = sIdx.entries.findIndex(e => e.id === currentEntryId);
		if (idx === -1) return null;

		const targetIdx = idx + delta;
		if (targetIdx >= 0 && targetIdx < sIdx.entries.length) {
			return sIdx.entries[targetIdx];
		}
		return null;
	}

	/**
	 * Serializes the section indexes for caching in data.json.
	 */
	getCacheData(): Record<string, SectionIndex> {
		const cache: Record<string, SectionIndex> = {};
		for (const [_, idx] of this.sectionIndexes.entries()) {
			cache[idx.path] = idx;
		}
		return cache;
	}
}
