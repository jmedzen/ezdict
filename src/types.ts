/**
 * Ezdict — Type Definitions
 */

export type DictSearchMode = 'prefix' | 'fuzzy' | 'fulltext';

export interface DictEntry {
	id: number;
	headword: string;
	cleanHeadword: string;
	byteOffset: number;
	byteLength: number;
	lineStart: number;
	lineEnd: number;
}

export interface DictFileMetadata {
	id: number;
	name: string;           // e.g. "法相辭典"
	path: string;           // file path relative to vault, or absolute path
	isExternal: boolean;    // true if located outside the Obsidian vault
	size: number;
	mtime: number;
	entryCount: number;
	enabled: boolean;
	order: number;
}

export interface SectionIndex {
	fileId: number;
	path: string;
	mtime: number;
	size: number;
	entryLevel: number;
	totalLines: number;
	totalBytes: number;
	entries: DictEntry[];
}

export interface SearchResult {
	fileId: number;
	fileName: string;
	entryId: number;
	headword: string;
	lineStart: number;
	snippet?: string;
	score?: number;
}

export interface EzdictSettings {
	dictDirectory: string;          // Directory containing dictionary .md files
	entryHeadingLevel: number;      // Heading level for dictionary entries (2..6, default: 3 for h3)
	defaultMode: DictSearchMode;    // 'prefix' | 'fuzzy' | 'fulltext'
	maxResultsPerDict: number;      // Max results to return per dictionary (default: 350)
	maxProximityDistance: number;   // Max proximity character distance for AND search (default: 150)
	autoLookupOnSelect: boolean;    // Auto lookup when opening modal with selection
	dictFileOrder: string[];        // Persisted file path order
	disabledDicts: string[];        // Persisted list of disabled dict paths
	citationTemplate: string;       // Template for inserting definitions into active note
	enableSelectionMenu: boolean;   // Enable right-click context menu item
}

export const DEFAULT_SETTINGS: EzdictSettings = {
	dictDirectory: "dicts",
	entryHeadingLevel: 3,           // default: h3 (###)
	defaultMode: "prefix",
	maxResultsPerDict: 350,
	maxProximityDistance: 150,
	autoLookupOnSelect: true,
	dictFileOrder: [],
	disabledDicts: [],
	citationTemplate: "blockquote", // 'blockquote' | 'footnote' | 'raw' | 'wikilink'
	enableSelectionMenu: true,
};
