import { DictEntry, SectionIndex } from '../types';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

export function cleanHeadword(hw: string): string {
	return String(hw || '')
		.replace(/^【/, '')
		.replace(/】$/, '')
		.trim();
}

/**
 * Scans a markdown text to build an entry-level section index.
 * Uses targetHeadingLevel (default 3 for h3) or auto-detects.
 * Calculates exact UTF-8 byte offsets so byte-range reads never split code points.
 */
export function scanSections(
	text: string,
	fileId: number,
	filePath: string,
	size: number,
	mtime: number,
	targetHeadingLevel: number = 3
): SectionIndex {
	const rawHeadings: { depth: number; byteOffset: number; charOffset: number; lineStart: number; rawHeadword: string }[] = [];
	let byteOffset = 0;
	let lineNum = 1;
	let idx = 0;
	const len = text.length;

	// Use TextEncoder to get byte lengths across environments
	const encoder = new TextEncoder();

	while (idx < len) {
		const lineStartChar = idx;
		let nl = text.indexOf('\n', idx);
		if (nl === -1) nl = len;
		let contentEnd = nl;
		let isCRLF = false;
		if (contentEnd > idx && text.charCodeAt(contentEnd - 1) === 13) {
			contentEnd--;
			isCRLF = true;
		}
		const line = text.substring(idx, contentEnd);

		const m = HEADING_RE.exec(line);
		if (m) {
			rawHeadings.push({
				depth: m[1].length,
				byteOffset: byteOffset,
				charOffset: lineStartChar,
				lineStart: lineNum,
				rawHeadword: m[2].trim()
			});
		}

		// Calculate exact UTF-8 byte length
		const lineByteLen = encoder.encode(line).length;
		byteOffset += lineByteLen + (isCRLF ? 2 : 1);
		idx = (nl === len) ? len : nl + 1;
		lineNum++;
	}

	const totalBytes = byteOffset;
	const totalLines = lineNum - 1;

	if (rawHeadings.length === 0) {
		return {
			fileId,
			path: filePath,
			mtime,
			size,
			entryLevel: 0,
			totalLines,
			totalBytes,
			entries: []
		};
	}

	// Determine entry level: user-configured level if present in file, otherwise deepest level
	let entryLevel = 0;
	if (targetHeadingLevel && targetHeadingLevel >= 1 && targetHeadingLevel <= 6) {
		const hasTarget = rawHeadings.some(h => h.depth === targetHeadingLevel);
		if (hasTarget) {
			entryLevel = targetHeadingLevel;
		}
	}
	if (entryLevel === 0) {
		for (const h of rawHeadings) {
			if (h.depth > entryLevel) entryLevel = h.depth;
		}
	}

	const entries: DictEntry[] = [];
	let entrySeq = 0;
	let pendingGroupByteOffset = -1;
	let pendingGroupCharOffset = -1;
	let pendingGroupLine = -1;

	for (const h of rawHeadings) {
		if (h.depth < entryLevel) {
			// Shallower heading (category / volume header), fold into first following entry
			if (pendingGroupByteOffset === -1) {
				pendingGroupByteOffset = h.byteOffset;
				pendingGroupCharOffset = h.charOffset;
				pendingGroupLine = h.lineStart;
			}
		} else if (h.depth === entryLevel) {
			// Exact entry heading level
			const bOffset = pendingGroupByteOffset >= 0 ? pendingGroupByteOffset : h.byteOffset;
			const cOffset = pendingGroupCharOffset >= 0 ? pendingGroupCharOffset : h.charOffset;
			const lineStart = pendingGroupLine >= 0 ? pendingGroupLine : h.lineStart;
			const clean = cleanHeadword(h.rawHeadword);
			if (clean) {
				entries.push({
					id: entrySeq++,
					headword: h.rawHeadword,
					cleanHeadword: clean,
					byteOffset: bOffset,
					byteLength: 0,
					charOffset: cOffset,
					charLength: 0,
					lineStart: lineStart,
					lineEnd: totalLines
				});
			}
			pendingGroupByteOffset = -1;
			pendingGroupCharOffset = -1;
			pendingGroupLine = -1;
		}
		// h.depth > entryLevel is sub-heading within entry content, not a new entry boundary
	}

	// Compute byteLength, charLength, and lineEnd for each entry
	for (let i = 0; i < entries.length; i++) {
		const curr = entries[i];
		if (i + 1 < entries.length) {
			const next = entries[i + 1];
			curr.lineEnd = next.lineStart - 1;
			curr.byteLength = next.byteOffset - curr.byteOffset;
			if (curr.charOffset !== undefined && next.charOffset !== undefined) {
				curr.charLength = next.charOffset - curr.charOffset;
			}
		} else {
			curr.lineEnd = totalLines;
			curr.byteLength = totalBytes - curr.byteOffset;
			if (curr.charOffset !== undefined) {
				curr.charLength = len - curr.charOffset;
			}
		}
	}

	return {
		fileId,
		path: filePath,
		mtime,
		size,
		entryLevel,
		totalLines,
		totalBytes,
		entries
	};
}
