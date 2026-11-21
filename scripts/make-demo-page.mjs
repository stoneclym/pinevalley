// Wraps the demo build as a claude.ai Artifact page: the host adds the doctype/head,
// so this file holds only the title, the built stylesheet, the root and the built script.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const dir = new URL("../dist-demo/", import.meta.url);
const index = readFileSync(new URL("index.html", dir), "utf8");
const js = index.match(/src="\.\/(assets\/[^"]+\.js)"/)[1];
const css = index.match(/href="\.\/(assets\/[^"]+\.css)"/)[1];

writeFileSync(new URL("artifact.html", dir), `<title>Pine Valley Hub Demo</title>
<meta name="color-scheme" content="light only">
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" src="${js}"></script>
`);

const files = { "config.json": "dist-demo/config.json" };
for (const f of readdirSync(new URL("assets/", dir))) files[`assets/${f}`] = `dist-demo/assets/${f}`;
writeFileSync(new URL("artifact-files.json", dir), JSON.stringify(files, null, 2));
console.log(`artifact.html + ${Object.keys(files).length} files`);
