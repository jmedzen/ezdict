import { App, FileSystemAdapter } from 'obsidian';

/**
 * Ultra-fast byte-range slice reader.
 * Uses native Node.js fs.read when available on Desktop,
 * uses memory-cached ArrayBuffer on Mobile (iOS / iPadOS / Android) to prevent repeated disk I/O.
 */
export class ByteReader {
	private app: App;
	private textDecoder: TextDecoder;
	private mobileBufferCache: Map<string, { mtime: number; buffer: ArrayBuffer }> = new Map();
	private textCache: Map<string, { mtime: number; text: string }> = new Map();

	constructor(app: App) {
		this.app = app;
		this.textDecoder = new TextDecoder('utf-8');
	}

	/**
	 * Clears memory cache.
	 */
	clearCache(): void {
		this.mobileBufferCache.clear();
		this.textCache.clear();
	}

	/**
	 * Reads a specific byte-range slice from a file.
	 * @param filePath Absolute path or relative path to vault
	 * @param offset Start byte offset
	 * @param length Number of bytes to read
	 */
	async readSlice(filePath: string, offset: number, length: number): Promise<string> {
		if (length <= 0) return '';

		// 1. Desktop: Direct native Node.js fs.read slice (fastest, never loads full file into memory)
		if (typeof window !== 'undefined' && (window as any).require) {
			try {
				const fs = (window as any).require('fs');
				const pathModule = (window as any).require('path');
				let fullPath = filePath;

				if (!pathModule.isAbsolute(filePath)) {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						fullPath = pathModule.join(adapter.getBasePath(), filePath);
					}
				}

				return await new Promise<string>((resolve, reject) => {
					fs.open(fullPath, 'r', (err: any, fd: number) => {
						if (err) return reject(err);
						const buffer = Buffer.alloc(length);
						fs.read(fd, buffer, 0, length, offset, (readErr: any, bytesRead: number) => {
							fs.close(fd, () => {});
							if (readErr) return reject(readErr);
							resolve(buffer.toString('utf-8', 0, bytesRead));
						});
					});
				});
			} catch (nodeErr) {
				console.warn('[Ezdict] Node fs slice read failed, falling back to Vault adapter:', nodeErr);
			}
		}

		// 2. Mobile (iOS / iPadOS / Android): In-memory cached ArrayBuffer slice (0ms without disk re-reading)
		try {
			const normalizedPath = filePath.replace(/\\/g, '/');
			let cached = this.mobileBufferCache.get(normalizedPath);

			if (!cached) {
				const stat = await this.app.vault.adapter.stat(normalizedPath);
				const buffer = await this.app.vault.adapter.readBinary(normalizedPath);
				cached = { mtime: stat?.mtime || 0, buffer };

				// Keep at most 3 dictionary buffers in cache to prevent mobile memory pressure
				if (this.mobileBufferCache.size >= 3) {
					const firstKey = this.mobileBufferCache.keys().next().value;
					if (firstKey) this.mobileBufferCache.delete(firstKey);
				}
				this.mobileBufferCache.set(normalizedPath, cached);
			}

			const slice = cached.buffer.slice(offset, offset + length);
			return this.textDecoder.decode(slice);
		} catch (adapterErr) {
			console.error('[Ezdict] Failed to read slice via adapter:', adapterErr);
			throw adapterErr;
		}
	}

	/**
	 * Reads the entire text of a file with caching.
	 */
	async readFullText(filePath: string): Promise<string> {
		const normalizedPath = filePath.replace(/\\/g, '/');

		if (typeof window !== 'undefined' && (window as any).require) {
			try {
				const fs = (window as any).require('fs');
				const pathModule = (window as any).require('path');
				let fullPath = filePath;

				if (!pathModule.isAbsolute(filePath)) {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						fullPath = pathModule.join(adapter.getBasePath(), filePath);
					}
				}

				const stat = await fs.promises.stat(fullPath);
				const cached = this.textCache.get(normalizedPath);
				if (cached && cached.mtime === stat.mtimeMs) {
					return cached.text;
				}

				const text = await fs.promises.readFile(fullPath, 'utf-8');
				this.textCache.set(normalizedPath, { mtime: stat.mtimeMs, text });
				return text;
			} catch (_) {}
		}

		// Mobile environment
		try {
			const stat = await this.app.vault.adapter.stat(normalizedPath);
			const cached = this.textCache.get(normalizedPath);
			if (cached && cached.mtime === (stat?.mtime || 0)) {
				return cached.text;
			}

			const text = await this.app.vault.adapter.read(normalizedPath);
			if (this.textCache.size >= 3) {
				const firstKey = this.textCache.keys().next().value;
				if (firstKey) this.textCache.delete(firstKey);
			}
			this.textCache.set(normalizedPath, { mtime: stat?.mtime || 0, text });
			return text;
		} catch (e) {
			return await this.app.vault.adapter.read(normalizedPath);
		}
	}
}
