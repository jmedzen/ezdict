import { App, Platform, requestUrl } from 'obsidian';
import { unzipSync } from 'fflate';

interface NodeFSSync {
	existsSync(path: string): boolean;
	mkdirSync(path: string, options?: { recursive?: boolean }): void;
	writeFileSync(path: string, data: Uint8Array): void;
}

interface NodePath {
	isAbsolute(path: string): boolean;
	join(...paths: string[]): string;
	basename(path: string): string;
}

function getNodeSync(): { fs: NodeFSSync; pathModule: NodePath } | null {
	if (!Platform.isDesktop) return null;
	try {
		const nodeRequire = (window as unknown as { require?: (id: string) => unknown }).require;
		if (typeof nodeRequire === 'function') {
			const fs = nodeRequire('fs') as NodeFSSync;
			const pathModule = nodeRequire('path') as NodePath;
			if (fs && pathModule) {
				return { fs, pathModule };
			}
		}
	} catch {
		return null;
	}
	return null;
}

export class DictDownloader {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Decodes raw zip filename by recovering bytes and applying UTF-8 / Big5 / GBK decoding.
	 * Fixes mojibake when zip packages were created without standard UTF-8 bit flags.
	 */
	private decodeZipEntryName(name: string): string {
		const bytes = new Uint8Array(name.length);
		for (let i = 0; i < name.length; i++) {
			bytes[i] = name.charCodeAt(i) & 0xff;
		}

		// 1. Try UTF-8 strict decoding
		try {
			return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		} catch {
			// 2. Try Big5 (Traditional Chinese)
			try {
				return new TextDecoder('big5').decode(bytes);
			} catch {
				// 3. Try GBK (Simplified Chinese)
				try {
					return new TextDecoder('gbk').decode(bytes);
				} catch {
					return name;
				}
			}
		}
	}

	/**
	 * Downloads a dictionary or zip archive from a URL and extracts it into the dictionary directory.
	 * If the downloaded file is a ZIP archive, automatically unpacks all files and deletes/omits the zip.
	 */
	async downloadAndImport(
		url: string,
		targetDir: string,
		onProgress?: (status: string) => void
	): Promise<{ success: boolean; filesCount: number; message: string }> {
		const cleanUrl = url.trim();
		if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
			throw new Error('請輸入以 http:// 或 https:// 開頭的有效網址');
		}

		onProgress?.('正在連線下載中…');
		const res = await requestUrl({
			url: cleanUrl,
			method: 'GET'
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`下載失敗 (伺服器回應 HTTP ${res.status})`);
		}

		const data = new Uint8Array(res.arrayBuffer);
		if (data.length === 0) {
			throw new Error('下載的檔案內容為空');
		}

		// Detect if zip: file ends with .zip or has zip magic header (PK\x03\x04)
		const isZip = cleanUrl.toLowerCase().endsWith('.zip') ||
			(data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04);

		const savedFiles: string[] = [];

		if (isZip) {
			onProgress?.('正在解壓縮 ZIP 辭典包…');
			let unzipped: Record<string, Uint8Array>;
			try {
				unzipped = unzipSync(data);
			} catch (zipErr) {
				throw new Error(`ZIP 解壓縮失敗: ${zipErr instanceof Error ? zipErr.message : String(zipErr)}`);
			}

			const entries = Object.keys(unzipped);
			if (entries.length === 0) {
				throw new Error('ZIP 壓縮檔內沒有可用的檔案');
			}

			for (const rawRelativePath of entries) {
				const relativePath = this.decodeZipEntryName(rawRelativePath);

				// Skip folder nodes and macOS metadata
				if (
					relativePath.endsWith('/') ||
					relativePath.includes('__MACOSX') ||
					relativePath.endsWith('.DS_Store') ||
					relativePath.includes('/._') ||
					relativePath.startsWith('._')
				) {
					continue;
				}

				const fileData = unzipped[rawRelativePath];
				const fileName = relativePath.split('/').pop() || relativePath;
				if (!fileName) continue;

				await this.saveFile(targetDir, fileName, fileData);
				savedFiles.push(fileName);
			}

			if (savedFiles.length === 0) {
				throw new Error('ZIP 壓縮檔內未找到任何有效檔案');
			}
		} else {
			// Single file download (e.g. .md dictionary)
			onProgress?.('正在儲存辭典檔案…');
			let fileName = 'dictionary.md';
			try {
				const urlObj = new URL(cleanUrl);
				const pathname = urlObj.pathname;
				const base = pathname.split('/').pop();
				if (base && base.includes('.')) {
					fileName = decodeURIComponent(base);
				}
			} catch {
				// fallback default name
			}

			if (!fileName.toLowerCase().endsWith('.md') && !fileName.toLowerCase().endsWith('.txt')) {
				fileName = `${fileName}.md`;
			}

			await this.saveFile(targetDir, fileName, data);
			savedFiles.push(fileName);
		}

		return {
			success: true,
			filesCount: savedFiles.length,
			message: isZip
				? `✅ 成功解壓縮並匯入 ${savedFiles.length} 個辭典檔案至「${targetDir}」（已自動清理 zip）`
				: `✅ 成功下載「${savedFiles[0]}」至「${targetDir}」`
		};
	}

	/**
	 * Saves a binary file to Vault relative path or Desktop absolute path.
	 */
	private async saveFile(targetDir: string, fileName: string, data: Uint8Array): Promise<void> {
		const node = getNodeSync();

		// 1. Desktop absolute path
		if (node && node.pathModule.isAbsolute(targetDir)) {
			if (!node.fs.existsSync(targetDir)) {
				node.fs.mkdirSync(targetDir, { recursive: true });
			}
			const fullPath = node.pathModule.join(targetDir, fileName);
			node.fs.writeFileSync(fullPath, data);
			return;
		}

		// 2. Vault relative path
		const normalizedDir = targetDir.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
		const adapter = this.app.vault.adapter;

		if (normalizedDir && !(await adapter.exists(normalizedDir))) {
			await adapter.mkdir(normalizedDir);
		}

		const filePath = normalizedDir ? `${normalizedDir}/${fileName}` : fileName;
		const copy = new Uint8Array(data.byteLength);
		copy.set(data);
		await adapter.writeBinary(filePath, copy.buffer as ArrayBuffer);
	}
}
