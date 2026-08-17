import { App, FileSystemAdapter } from 'obsidian';

/**
 * Ultra-fast byte-range slice reader.
 * Uses native Node.js fs.read when available on Desktop,
 * falls back to Obsidian Vault FileSystemAdapter / readBinary on other environments.
 */
export class ByteReader {
	private app: App;
	private textDecoder: TextDecoder;

	constructor(app: App) {
		this.app = app;
		this.textDecoder = new TextDecoder('utf-8');
	}

	/**
	 * Reads a specific byte-range slice from a file.
	 * @param filePath Absolute path or relative path to vault
	 * @param offset Start byte offset
	 * @param length Number of bytes to read
	 */
	async readSlice(filePath: string, offset: number, length: number): Promise<string> {
		if (length <= 0) return '';

		// 1. Try Node.js fs on Desktop environment (fastest: reads ONLY the exact slice without loading full file)
		if (typeof window !== 'undefined' && (window as any).require) {
			try {
				const fs = (window as any).require('fs');
				const pathModule = (window as any).require('path');
				let fullPath = filePath;

				// Resolve relative path to vault root if needed
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
				console.warn('[mdterm] Node fs slice read failed, falling back to Vault adapter:', nodeErr);
			}
		}

		// 2. Fallback: Obsidian Vault FileSystemAdapter (Mobile / Web)
		try {
			const normalizedPath = filePath.replace(/\\/g, '/');
			const arrayBuffer = await this.app.vault.adapter.readBinary(normalizedPath);
			const slice = arrayBuffer.slice(offset, offset + length);
			return this.textDecoder.decode(slice);
		} catch (adapterErr) {
			console.error('[mdterm] Failed to read slice via adapter:', adapterErr);
			throw adapterErr;
		}
	}

	/**
	 * Reads the entire text of a file (used during initial indexing).
	 */
	async readFullText(filePath: string): Promise<string> {
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

				return await fs.promises.readFile(fullPath, 'utf-8');
			} catch (_) {}
		}

		const normalizedPath = filePath.replace(/\\/g, '/');
		return await this.app.vault.adapter.read(normalizedPath);
	}
}
