# vite-plugin-mdicon2svg

Inline svgs in place of `<md-icon>` in your project.

## Usage

```js
import {mdicon2svg} from 'vite-plugin-mdicon2svg';

export default defineConfig({
	plugins: [mdicon2svg({devMode: true})],
});
```

`devMode: true` indicates to download and inline SVGs during development (or else it's done only during build time by default).  
However this is not the recommended approach for 2 reasons:

- A request is made to `fonts.gstatic.com` servers for each new icon added inside your source if they are not cached yet.
- Your source is re-analyzed on new changes so it can make development slower on older machines and delay page refresh.

Here's the recommended approach instead, remove `devMode` option:

```js
plugins: [mdicon2svg()];
```

And add the following to your html to display the icons:

```html
<head>
	<link
		id="symbols"
		href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
		rel="stylesheet"
	/>
</head>
```

_(note: it's important to include `id="symbols"` in the tag here to inform the plugin to remove this link at build time.)_

### Install

```
npm i -D vite-plugin-mdicon2svg
```

<!--
## Known limitations

- This plugin relies on `lit-html`, and the SVGs are wrapped inside `html` tagged templates. That means you will need `lit-html` (or `lit`) installed in your project. That also means icons in raw html files won't get inlined.
-->

## License

MIT ©️ 2024 [vdegenne](https://github.com/vdegenne)
