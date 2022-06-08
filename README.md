# Lightframe

<svg src="https://raw.githubusercontent.com/FishingHacks/lightframe/master/.github/assets/logo.svg">

<p align="center">
	<img alt="Star badge" src="https://img.shields.io/github/stars/FishingHacks/lightframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="License (MIT) Badge" src="https://img.shields.io/github/license/FishingHacks/lightframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="Size Badge" src="https://img.shields.io/github/languages/code-size/FishingHacks/lightframe?label=Size&style=for-the-badge&labelColor=000"
</p>

Use Lightframe at your own Risk!

Lightframe is a simple, lightweight and easy-to-understand solution for building Web Applications.

# Logo
Logo comes from [game-icons.net/lorc/feater](https://game-icons.net/1x1/lorc/feather.html) and was made by [Lorc](https://lorcblog.blogspot.com/)

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
