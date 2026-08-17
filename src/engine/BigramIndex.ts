import { DictEntry, SearchResult } from '../types';

const SNIPPET_RADIUS = 60;

/**
 * Extracts unique CJK 2-grams (Bigrams) from text.
 */
export function extractCJKBigrams(text: string): Set<string> {
	const set = new Set<string>();
	let prevChar = '';
	for (let i = 0; i < text.length; i++) {
		const ch = text.charCodeAt(i);
		// CJK Unified Ideographs & Extension A
		if ((ch >= 0x4E00 && ch <= 0x9FFF) || (ch >= 0x3400 && ch <= 0x4DBF)) {
			const currChar = text[i];
			if (prevChar) set.add(prevChar + currChar);
			prevChar = currChar;
		} else {
			prevChar = '';
		}
	}
	return set;
}

/**
 * Intersects two sorted arrays of numbers.
 */
export function intersectSorted(a: number[], b: number[]): number[] {
	const out: number[] = [];
	let i = 0, j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] < b[j]) i++;
		else if (a[i] > b[j]) j++;
		else {
			out.push(a[i]);
			i++;
			j++;
		}
	}
	return out;
}

/**
 * In-memory index for a single dictionary file.
 */
export class BigramIndex {
	public fileId: number;
	public fileName: string;
	public sortedEntries: DictEntry[];
	public headwordBigrams: Map<string, number[]>;

	constructor(fileId: number, fileName: string, entries: DictEntry[]) {
		this.fileId = fileId;
		this.fileName = fileName;
		this.sortedEntries = [...entries];

		// Sort by clean headword for binary search
		this.sortedEntries.sort((a, b) => {
			if (a.cleanHeadword < b.cleanHeadword) return -1;
			if (a.cleanHeadword > b.cleanHeadword) return 1;
			return a.id - b.id;
		});

		this.headwordBigrams = new Map<string, number[]>();
		this.buildHeadwordBigramMap();
	}

	private buildHeadwordBigramMap(): void {
		this.sortedEntries.forEach((entry, idx) => {
			const bigrams = extractCJKBigrams(entry.cleanHeadword);
			for (const bg of bigrams) {
				let list = this.headwordBigrams.get(bg);
				if (!list) {
					list = [];
					this.headwordBigrams.set(bg, list);
				}
				list.push(idx);
			}
		});
	}

	/**
	 * Exact search on clean headwords using O(log N) binary search.
	 */
	findExact(headword: string): DictEntry | null {
		const q = headword.trim();
		if (!q || this.sortedEntries.length === 0) return null;

		const sorted = this.sortedEntries;
		let lo = 0, hi = sorted.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (sorted[mid].cleanHeadword < q) lo = mid + 1;
			else hi = mid;
		}

		if (lo < sorted.length && sorted[lo].cleanHeadword === q) {
			return sorted[lo];
		}
		return this.sortedEntries.find(e => e.cleanHeadword === q || e.headword === q) || null;
	}

	/**
	 * Prefix search on clean headwords using O(log N) binary search.
	 */
	searchPrefix(query: string, maxResults: number = 100): SearchResult[] {
		const q = query.trim();
		if (!q || this.sortedEntries.length === 0) return [];

		const sorted = this.sortedEntries;
		let lo = 0, hi = sorted.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (sorted[mid].cleanHeadword < q) lo = mid + 1;
			else hi = mid;
		}
		const start = lo;

		const upper = q + '\uffff';
		lo = start;
		hi = sorted.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (sorted[mid].cleanHeadword < upper) lo = mid + 1;
			else hi = mid;
		}
		const end = lo;

		const results: SearchResult[] = [];
		for (let i = start; i < end && results.length < maxResults; i++) {
			const entry = sorted[i];
			if (entry.cleanHeadword.startsWith(q)) {
				results.push({
					fileId: this.fileId,
					fileName: this.fileName,
					entryId: entry.id,
					headword: entry.cleanHeadword,
					lineStart: entry.lineStart
				});
			}
		}
		return results;
	}

	/**
	 * Fuzzy / Substring search on clean headwords using Bigram set intersection.
	 */
	searchFuzzy(query: string, maxResults: number = 100): SearchResult[] {
		const q = query.trim();
		if (!q || this.sortedEntries.length === 0) return [];

		const qBigrams = Array.from(extractCJKBigrams(q));
		let candidateIdxs: number[] | null = null;

		if (qBigrams.length > 0) {
			for (const bg of qBigrams) {
				const posting = this.headwordBigrams.get(bg);
				if (!posting || posting.length === 0) {
					candidateIdxs = [];
					break;
				}
				candidateIdxs = candidateIdxs === null ? posting : intersectSorted(candidateIdxs, posting);
				if (candidateIdxs.length === 0) break;
			}
		}

		const results: SearchResult[] = [];

		if (candidateIdxs && candidateIdxs.length > 0) {
			for (const idx of candidateIdxs) {
				if (results.length >= maxResults) break;
				const entry = this.sortedEntries[idx];
				if (entry.cleanHeadword.includes(q)) {
					results.push({
						fileId: this.fileId,
						fileName: this.fileName,
						entryId: entry.id,
						headword: entry.cleanHeadword,
						lineStart: entry.lineStart
					});
				}
			}
		} else if (candidateIdxs === null) {
			// Single character or non-CJK query: linear filter
			for (const entry of this.sortedEntries) {
				if (results.length >= maxResults) break;
				if (entry.cleanHeadword.includes(q)) {
					results.push({
						fileId: this.fileId,
						fileName: this.fileName,
						entryId: entry.id,
						headword: entry.cleanHeadword,
						lineStart: entry.lineStart
					});
				}
			}
		}

		return results;
	}

	/**
	 * Scans an entry's text content for search terms with proximity distance filtering.
	 */
	static scanEntryText(
		text: string,
		terms: string[],
		maxProximityDistance: number,
		fileId: number,
		fileName: string,
		entry: DictEntry
	): SearchResult[] {
		const results: SearchResult[] = [];
		if (!text) return results;

		if (terms.length === 1) {
			const term = terms[0];
			let pos = 0;
			while (pos < text.length) {
				const matchIdx = text.indexOf(term, pos);
				if (matchIdx === -1) break;

				const s = Math.max(0, matchIdx - SNIPPET_RADIUS);
				const e = Math.min(text.length, matchIdx + term.length + SNIPPET_RADIUS);
				let snippet = text.substring(s, e).replace(/\r?\n/g, ' ').trim();
				if (s > 0) snippet = '…' + snippet;
				if (e < text.length) snippet = snippet + '…';

				results.push({
					fileId,
					fileName,
					entryId: entry.id,
					headword: entry.cleanHeadword,
					lineStart: entry.lineStart,
					snippet
				});

				pos = matchIdx + term.length;
			}
			return results;
		}

		// Multi-term AND search with Proximity Distance Filtering
		if (!terms.every(t => text.includes(t))) return results;

		const termPositions: number[][] = [];
		for (const term of terms) {
			const positions: number[] = [];
			let p = 0;
			while (p < text.length) {
				const idx = text.indexOf(term, p);
				if (idx === -1) break;
				positions.push(idx);
				p = idx + term.length;
			}
			if (positions.length === 0) return results;
			termPositions.push(positions);
		}

		const p0List = termPositions[0];
		for (const p0 of p0List) {
			let clusterValid = true;
			let minPos = p0;
			let maxPos = p0 + terms[0].length;

			for (let tIdx = 1; tIdx < terms.length; tIdx++) {
				const tLen = terms[tIdx].length;
				const list = termPositions[tIdx];
				let foundClose = false;

				for (const p of list) {
					if (p > maxPos + maxProximityDistance) break;
					const potentialMin = Math.min(minPos, p);
					const potentialMax = Math.max(maxPos, p + tLen);
					if (potentialMax - potentialMin <= maxProximityDistance) {
						minPos = potentialMin;
						maxPos = potentialMax;
						foundClose = true;
						break;
					}
				}
				if (!foundClose) {
					clusterValid = false;
					break;
				}
			}

			if (clusterValid) {
				const s = Math.max(0, minPos - SNIPPET_RADIUS);
				const e = Math.min(text.length, maxPos + SNIPPET_RADIUS);
				let snippet = text.substring(s, e).replace(/\r?\n/g, ' ').trim();
				if (s > 0) snippet = '…' + snippet;
				if (e < text.length) snippet = snippet + '…';

				results.push({
					fileId,
					fileName,
					entryId: entry.id,
					headword: entry.cleanHeadword,
					lineStart: entry.lineStart,
					snippet
				});
				break; // One match per cluster is sufficient
			}
		}

		return results;
	}
}
