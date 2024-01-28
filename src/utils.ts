import fastGlob from 'fast-glob';
import {existsSync} from 'node:fs';
import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {type Cache} from './types.js';
import {CodePointsMap, Variant, type MdIconName} from 'mwc3-back-helpers';

export const MD_ICON_REGEX =
	/(<md-icon[^>]*?>)\s*([0-9a-z_]+)\s*(<\/md-icon\s*>)/g;

const CACHE_DIR = '.mdicon2svg';

export let cache!: Cache;

export async function readdir(glob: string | string[]) {
	return await fastGlob(glob, {dot: true});
}

export async function loadCache(): Promise<Cache | undefined> {
	const cachePath = join(CACHE_DIR, 'cache.json');
	if (!existsSync(cachePath)) {
		return undefined;
	}
	return JSON.parse((await readFile(cachePath)).toString());
}

export async function saveCache(cache: Cache): Promise<void> {
	if (!existsSync(CACHE_DIR)) {
		await mkdir(CACHE_DIR, {recursive: true});
	}
	await writeFile(join(CACHE_DIR, 'cache.json'), JSON.stringify(cache));
}

export function setCache(newCache: Cache) {
	cache = newCache;
}

export function stripCommentsFromContent(content: string): string {
	const pattern = /(?<!:)\/\/.*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g;
	return content.replace(pattern, '');
}

export interface IconData {
	name: MdIconName;
	fill: boolean;
	svg?: string;
}

/**
 * This function returns a *distinct* list.
 */
export function findIconsInContent(
	content: string,
	includeComments = false
): IconData[] {
	let icons: IconData[] = [];
	if (!includeComments) {
		content = stripCommentsFromContent(content);
	}
	const matches = content.matchAll(MD_ICON_REGEX);
	for (const match of matches) {
		const name = match[2] as MdIconName;
		// Not a valid icon name, passing
		if (!(name in CodePointsMap)) {
			continue;
		}
		const fill = match[1].toLowerCase().includes('fill');
		if (icons.findIndex((i) => i.name == name && i.fill == fill) >= 0) {
			continue;
		}
		icons.push({name, fill});
	}
	return icons;
}

export async function findIconsInFiles(
	glob: string | string[],
	includeComments = false
) {
	const files = await readdir(glob);
	let icons: IconData[] = [];
	const result = await Promise.all(
		files.map(
			(filepath) =>
				new Promise<IconData[]>(async (resolve, _reject) => {
					const content = (await readFile(filepath)).toString();
					resolve(findIconsInContent(content, includeComments));
				})
		)
	);
	return unifyIconData(result.flat());
}

function unifyIconData(iconData: IconData[]) {
	const data: IconData[] = [];
	for (const icon of iconData) {
		if (data.some((i) => i.name == icon.name && i.fill == icon.fill)) {
			continue;
		}
		data.push(icon);
	}
	return data;
}

export function dataIsEqual(data1: IconData[], data2: IconData[]) {
	return (
		data1.length == data2.length &&
		data1.every(
			(icon) =>
				data2.findIndex((i) => icon.name === i.name && icon.fill === i.fill) >=
				0
		)
	);
}

function generateSvgFetchUrl(iconName: string, variant: Variant, fill = false) {
	return `https://fonts.gstatic.com/s/i/short-term/release/materialsymbols${variant}/${iconName}${
		fill ? '/fill1' : '/default'
	}/24px.svg`;
}

export async function fetchSvg(
	iconName: string,
	variant: Variant,
	fill = false
) {
	const res = await fetch(generateSvgFetchUrl(iconName, variant, fill));
	return await res.text();
}

export function nameToConstant(iconName: string, fill = false) {
	return iconName.toUpperCase() + (fill ? '_FILL' : '');
}

export function getCachedSvg(iconName: string, variant: Variant, fill = false) {
	return cache[variant]?.find(
		(icon) => icon.name === iconName && icon.fill === fill
	)?.svg;
}
