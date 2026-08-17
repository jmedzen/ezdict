import { App, FileSystemAdapter, Platform } from 'obsidian';

interface NodeFS {
	open(path: string, flags: string, callback: (err: Error | null, fd: number) => void): void;
	read(fd: number, buffer: Uint8Array, offset: number, length: number, position: number, callback: (err: Error | null, bytesRead: number, buffer: Uint8Array) => void): void;
	close(fd: number, callback: (err: Error | null) => void): void;
	promises: {
		stat(path: string): Promise<{ mtimeMs: number; size: number }>;
		readFile(path: string, encoding: string): Promise<string>;
	};
}

interface NodePath {
	isAbsolute(path: string): boolean;
	join(...paths: string[]): string;
}

function getNodeModules(): { fs: NodeFS; pathModule: NodePath } | null {
	if (!Platform.isDesktop) return null;
	try {
		const nodeRequire = (window as unknown as { require?: (id: string) => unknown }).require;
		if (typeof nodeRequire === 'function') {
			const fs = nodeRequire('fs') as NodeFS;
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
		const node = getNodeModules();
		if (node) {
			try {
				let fullPath = filePath;
				if (!node.pathModule.isAbsolute(filePath)) {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						fullPath = node.pathModule.join(adapter.getBasePath(), filePath);
					}
				}

				return await new Promise<string>((resolve, reject) => {
					node.fs.open(fullPath, 'r', (err, fd) => {
						if (err) return reject(err instanceof Error ? err : new Error(String(err)));
						const buffer = new Uint8Array(length);
						node.fs.read(fd, buffer, 0, length, offset, (readErr, bytesRead) => {
							node.fs.close(fd, () => {});
							if (readErr) return reject(readErr instanceof Error ? readErr : new Error(String(readErr)));
							resolve(this.textDecoder.decode(buffer.subarray(0, bytesRead)));
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
			throw (adapterErr instanceof Error ? adapterErr : new Error(String(adapterErr)));
		}
	}

	/**
	 * Reads the entire text of a file with caching.
	 */
	async readFullText(filePath: string): Promise<string> {
		const normalizedPath = filePath.replace(/\\/g, '/');

		const node = getNodeModules();
		if (node) {
			try {
				let fullPath = filePath;
				if (!node.pathModule.isAbsolute(filePath)) {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						fullPath = node.pathModule.join(adapter.getBasePath(), filePath);
					}
				}

				const stat = await node.fs.promises.stat(fullPath);
				const cached = this.textCache.get(normalizedPath);
				if (cached && cached.mtime === stat.mtimeMs) {
					return cached.text;
				}

				const text = await node.fs.promises.readFile(fullPath, 'utf-8');
				this.textCache.set(normalizedPath, { mtime: stat.mtimeMs, text });
				return text;
			} catch {
				// Fallback to vault adapter
			}
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
		} catch {
			return await this.app.vault.adapter.read(normalizedPath);
		}
	}
}
