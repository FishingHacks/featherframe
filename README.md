<p align="center">
<img src="https://raw.githubusercontent.com/FishingHacks/featherframe/master/.github/assets/logo.png" style="width: 128px; height: 128px;" />
<h1 align="center">Featherframe</h1>
</p>

<p align="center">
	<img alt="Star badge" src="https://img.shields.io/github/stars/FishingHacks/featherframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="License (MIT) Badge" src="https://img.shields.io/github/license/FishingHacks/featherframe?style=for-the-badge&labelColor=000">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img alt="Size Badge" src="https://img.shields.io/github/languages/code-size/FishingHacks/featherframe?label=Size&style=for-the-badge&labelColor=000"
</p>

Use Featherframe at your own Risk!

Featherframe is a simple, lightweight and easy-to-understand solution for building Web Applications.

# Logo

Logo comes from [game-icons.net/lorc/feather](https://game-icons.net/1x1/lorc/feather.html) and was made by [Lorc](https://lorcblog.blogspot.com/)

# Recommended VSCode Extensions
[lit-html](https://marketplace.visualstudio.com/items?itemName=bierner.lit-html)
	
# Documentation

Visit the [Wiki](https://www.github.com/FishingHacks/featherframe/wiki) to view the full Documentation. **It also contains important security Informations.**

# Authors

[FishingHacks](https://github.com/FishingHacks)

## Featherframe snippets for VSCode or VSCodium

```json
"featherframecfg": {
	"prefix": "featherframecfg",
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
	"description": "Add a Config for featherframe"
},
"featherframecreatepage": {
	"prefix": "ffcreatepage",
	"body": [
		"const { html } = require(\"featherframe\");",
		"",
		"export async function render() {",
		"",
		"return html`",
		"$1",
		"`",
		"}"
	],
	"description": "Create A featherframe Page boilerplate"
}
```

Thanks to RedCrafter07 for an unused Logo Design

# Changelogs
## 1.0.0
- Routing
- Render Engine
- Error pages
- Exception Pages
- CLI

## 1.1.0
- Context API
- NPM Integration

## 1.2.0
- XML Support
- useState & useIDState overhaul
Fixes:
- Improperly rerender

## 1.2.1
Better Module Support

## 1.2.2
Bugfixes:
- CWD is set to installing Directory, not the current application directory
- CWD is set to installing Directory, when used outside of blocking code (Promises, Certain Callbacks like setTimeout)

## 1.3.0
Additions: SPA Support

## 1.3.1
Added useFetch, server can now be require from /server in the featherframe package

## 1.3.2
- improved cli
- fixed bugs

## 1.4.0
- Added a Reconciler
- better CLI
- Bugfixes

## 1.5.0
- Bugfixes
- Finished off Reconciler

## 1.5.1
- Bugfixes
- Better require
- Better logging

## 1.5.3
- Featherframe Devtools