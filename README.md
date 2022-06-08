<p align="center">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="height: 128px; width: 128px;"><defs><filter id="shadow-1" height="300%" width="300%" x="-100%" y="-100%"><feFlood flood-color="rgba(80, 227, 194, 1)" result="flood"></feFlood><feComposite in="flood" in2="SourceGraphic" operator="atop" result="composite"></feComposite><feGaussianBlur in="composite" stdDeviation="4" result="blur"></feGaussianBlur><feOffset dx="0" dy="0" result="offset"></feOffset><feComposite in="SourceGraphic" in2="offset" operator="over"></feComposite></filter></defs><path d="M0 0h512v512H0z" fill="#000" fill-opacity="1"></path><g class="" transform="translate(-10,10)" style=""><path d="M470.7 20L368.2 49.81l41.5-28.09c-26.2 5.92-59.3 17.5-100.9 36.19l-67.9 70.79L265 79.25c-23.3 12.96-48 29.95-71.8 49.85l-15.8 64.3-3.4-47.6c-23.5 21.6-45.6 45.6-63.9 70.9-19.23 26.5-34.26 54.5-41.79 82.4l-28.12-18.8c2.52 23.7 10.31 44.3 23.09 63.2l-33.62-10.3c7.64 23.5 20.13 38.7 41.25 51-11.83 33.3-17.38 68.1-23.34 102.8l18.4 3.1C87.31 277.4 237.9 141.8 374 81.72l6.9 17.38c-121.7 54.5-216.3 146.5-265.8 279.1 18.1.1 35.8-2.1 52.2-6.3l4.9-60.9 13.1 55.5c10.9-4 20.9-8.8 29.8-14.4l-20.7-43.5 32.8 34.8c8-6.4 14.6-13.6 19.6-21.5 30.4-47.5 62.2-94.7 124.8-134.2l-45.7-16.2 70.1 2.1c11.4-5.8 23.4-12.9 32.5-19.6l-49.7-4 74.7-17.6c5.8-5.8 11.2-11.9 16.1-18 17.3-21.94 29-44.78 26.2-65.55-1.3-10.39-7.5-20.16-17.6-25.63-2.5-1.3-5.2-2.45-7.5-3.22z" fill="#fff" fill-opacity="1" transform="translate(25.6, 25.6) scale(0.9, 0.9) rotate(-90, 256, 256) skewX(0) skewY(0)" stroke="#ccc" stroke-opacity="1" stroke-width="0" filter="url(#shadow-1)"></path></g></svg>
<h1 align="center">Lightframe</h1>
</p>

<p align="center">
	<img alt="Star badge" src="https://img.shields.io/github/stars/FishingHacks/lightframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="License (MIT) Badge" src="https://img.shields.io/github/license/FishingHacks/lightframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="Size Badge" src="https://img.shields.io/github/languages/code-size/FishingHacks/lightframe?label=Size&style=for-the-badge&labelColor=000"
</p>

Use Lightframe at your own Risk!

Lightframe is a simple, lightweight and easy-to-understand solution for building Web Applications.

# Logo
Logo comes from [game-icons.net/lorc/feather](https://game-icons.net/1x1/lorc/feather.html) and was made by [Lorc](https://lorcblog.blogspot.com/)

# Documentation
Visit the [Wiki](https://www.github.com/FishingHacks/lightframe/wiki) to view the full Documentation

# Authors

[FishingHacks](https://github.com/FishingHacks)


## Lightframe snippets for VSCode or VSCodium
```json
"lightframecfg": {
	"prefix": "lightframecfg",
	"body": [
		"/**",
		" * @param {string} path",
		" * @returns {{name: string,description: string,launch?: Array<string>,customHTML?: string}}",
		" */",
		"",
		"module.exports = (path) => ({",
		"    name: \"$1\",",
		"    description: \"$2\",",
		"    customHTML: require(\"fs\").readFileSync(join(path, \"index.html\")).toString(),",
		"    e404page: require(\"fs\").readFileSync(join(path, \"404.html\")).toString()",
		"});"
	],
	"description": "Add a Config for lightframe"
},
"lightframecreatepage": {
	"prefix": "lfcreatepage",
	"body": [
		"import { html, render } from \"/framework\"",
		"",
		"render(()=>{",
		"$0",
		"return html`",
		"",
		"`",
		"});"
	],
	"description": "Create A lifeframe Page boilerplate"
}
```

Thanks to RedCrafter07 for an unused Logo Design
