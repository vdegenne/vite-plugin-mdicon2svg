export const SYMBOLS_LINK_REGEX = /<link\s+[^>]*id=["']?symbols["']?[^>]*>/;

export function removeSymbolsLink(html: string) {
	return html.replace(SYMBOLS_LINK_REGEX, ``);
}
