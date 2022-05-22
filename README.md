# Lightframe
TODO: Insert Logo here!

---


Use Lightframe at your own Risk!

Lightframe is a simple, lightweight and easy-to-understand solution for building Web Applications.

## Lightframeconfig snippet for VSCode or VSCodium
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
		"name: \"$1\"",
		"description: \"$2\"",
		"customHTML: require(\"fs\").readFileSync(join(path, \"index.html\")).toString(),",
		"e404page: require(\"fs\").readFileSync(join(path, \"404.html\")).toString(),",
		"});"
	],
	"description": "Add a Config for lightframe"
}
```

TODO: Write more
