import { moment } from 'obsidian';
import en from './locales/en';
import zhTw from './locales/zh-tw';
import zhCn from './locales/zh-cn';
import es from './locales/es';
import ja from './locales/ja';
import ko from './locales/ko';
import th from './locales/th';

export type LocaleKey = keyof typeof en;

const locales: Record<string, Record<string, string>> = {
	en,
	'zh-tw': zhTw,
	'zh-hk': zhTw,
	'zh': zhCn,
	'zh-cn': zhCn,
	es,
	ja,
	ko,
	th
};

/**
 * Returns the active language string from Obsidian environment.
 */
export function getLanguage(): string {
	const lang = (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('language') : null) || moment.locale() || 'en';
	return lang.toLowerCase();
}

/**
 * Internationalization helper function.
 * Translates key into the active Obsidian UI language with variable interpolation.
 * @param key String key defined in locales
 * @param params Optional key-value variables to replace in format `{varName}`
 */
export function t(key: LocaleKey, params?: Record<string, string | number>): string {
	const lang = getLanguage();
	const dict = locales[lang] || locales[lang.split('-')[0]] || en;
	let str = dict[key] || en[key] || key;

	if (params) {
		for (const [k, v] of Object.entries(params)) {
			str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
		}
	}
	return str;
}
