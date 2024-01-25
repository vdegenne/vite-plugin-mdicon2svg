import {ResolvedConfig, type Plugin} from 'vite';
import {MdIcon2SvgOptions} from './types.js';
import virtual from '@rollup/plugin-virtual';
import {
	MdIconName,
	Variant,
	findElementsFromFiles,
	findIconNamesFromContent,
	findIconNamesFromFiles,
} from 'mwc3-back-helpers';
import {
	IconData,
	MD_ICON_REGEX,
	dataIsEqual,
	fetchSvg,
	findIconsInContent,
	findIconsInFiles,
	getCachedSvg,
	loadCache,
	nameToConstant,
	readdir,
	saveCache,
	setCache,
	stripCommentsFromContent,
} from './utils.js';
import {type Cache} from './types.js';
import {createFilter} from '@rollup/pluginutils';
import {cache} from './utils.js';
import {log, setDebug} from './logger.js';

export async function mdicon2svg(
	options: Partial<MdIcon2SvgOptions> = {},
): Promise<Plugin[]> {
	// Should analyze the source here.
	options.include ??= 'src/**/*.{js,ts,jsx,tsx}';
	options.variant ??= Variant.OUTLINED;
	options.devMode ??= false;
	options.includeComments ??= false;
	options.debug ??= false;

	setDebug(options.debug);

	const filter = createFilter(options.include, options.exclude);

	setCache(
		(await loadCache()) ?? {
			// No cache yet default
			variant: options.variant,
		},
	);

	// Will hold the svg of icons found in the source
	const icons = {};
	let virtualVersion = 1;

	let config!: ResolvedConfig;
	let command!: 'serve' | 'build';

	let lastFoundIcons: IconData[] = [];

	async function updateVersion(data: IconData[]) {
		// Here we should download missing svgs from the cache
		cache[options.variant!] ??= [];
		const missingSvgs = data.filter((icon) => {
			return !(
				cache[options.variant!]!.findIndex(
					(i) => i.name == icon.name && i.fill == icon.fill && i.svg,
				) >= 0
			);
		});
		await Promise.all(
			missingSvgs.map(
				(missing) =>
					new Promise(async (resolve, _reject) => {
						log('=== DOWNLOADING MISSING SVG');
						missing.svg = await fetchSvg(
							missing.name,
							options.variant!,
							missing.fill,
						);
						// Push the data if the icon is not already in the cache
						if (
							cache[options.variant!]!.findIndex(
								(i) => missing.name == i.name && missing.fill == i.fill,
							) === -1
						) {
							cache[options.variant!]!.push(missing);
						}
						resolve(null);
					}),
			),
		);
		await saveCache(cache);
		// We update the virtual module version
		virtualVersion++;
		lastFoundIcons = data;
	}

	return [
		{
			name: 'mdicon2svg-leader',
			configResolved(resolvedConfig) {
				config = resolvedConfig;
				command = config.command;
			},

			async transformIndexHtml() {
				// Run only in dev mode
				if (command == 'serve' && options.devMode) {
					log('=== TRANSFORMINDEXHTML HOOK');
					const icons = await findIconsInFiles(
						options.include!,
						options.includeComments,
					);
					if (!dataIsEqual(icons, lastFoundIcons)) {
						await updateVersion(icons);
					}
					// Fill in the svgs for easy access in subroutines
					for (const icon of icons) {
						icon.svg = getCachedSvg(icon.name, options.variant!, icon.fill);
					}
				}
			},

			transform(code, id) {
				if ((command == 'build' || options.devMode) && filter(id)) {
					if (!options.includeComments) {
						code = stripCommentsFromContent(code);
					}
					const icons = findIconsInContent(code);
					code = code.replace(
						MD_ICON_REGEX,
						(_, opening: string, icon: string, closing: string) => {
							return (
								opening +
								'${' +
								nameToConstant(icon, opening.toLowerCase().includes('fill')) +
								'}' +
								closing
							);
						},
					);
					if (icons.length > 0) {
						log('=== TRANSFORM HOOK');
						// Here we should check if virtual module needs a
						// refresh. Question to ask is does the virtual module
						// contains all the icons found in the last check?
						return (
							`import {${icons.map((icon) => nameToConstant(icon.name, icon.fill))}} from 'virtual:icons${virtualVersion}';` +
							'\n' +
							code
						);
					}
				}
			},
		},

		{
			name: 'resolve-icons-module',
			async resolveId(id) {
				log('=== RESOLVEID HOOK');

				if (command == 'serve' && !options.devMode) {
					return;
				}
				if (id.startsWith('virtual:icons')) {
					const index = id.replace(/[a-zA-Z:]/g, '');
					if (!icons[`icons${index}`]) {
						icons[`icons${index}`] =
							`import {html} from 'lit-html';` +
							'\n' +
							lastFoundIcons
								.map(
									(icon) =>
										`export const ${nameToConstant(icon.name, icon.fill)} = ` +
										'html`' +
										icon.svg +
										'`;',
								)
								.join('\n');
						// TODO: should probably flush the previous cached virtual modules
						// console.log(icons);
					}
					return `\0${id}`;
				}
			},
		},

		// Virtual module that will hold the icon values
		virtual(icons),
	];
}
