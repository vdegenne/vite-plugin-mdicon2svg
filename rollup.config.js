import {nodeResolve} from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

/** @type {import('rollup').RollupOptions} */
export default {
	input: './lib/index.js',
	output: {file: './index.js'},
	plugins: [cjs(), nodeResolve(), terser()],
};
