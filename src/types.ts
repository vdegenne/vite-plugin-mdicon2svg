import {type Variant} from 'mwc3-back-helpers';
import {IconData} from './utils.js';

export interface MdIcon2SvgOptions {
	variant: Variant;
	include: string | string[];
	exclude: string | string[];
	includeComments: boolean;
	devMode: boolean;
	debug: boolean;
}

export interface Cache {
	variant: Variant;
	outlined?: IconData[];
	rounded?: IconData[];
	sharp?: IconData[];
}
