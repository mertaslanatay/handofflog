// Build script for the Handofflog Figma plugin.
// Produces two artifacts in dist/:
//   - code.js : the plugin main thread (runs in the Figma sandbox, no DOM)
//   - ui.html : the plugin UI (React app inlined into a single HTML file)
import { build, context } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");
const watch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  format: "iife",
  target: "es2017",
  logLevel: "info",
  define: { "process.env.NODE_ENV": '"production"' },
};

const mainBuild = {
  ...commonOptions,
  entryPoints: [resolve(__dirname, "src/plugin/main.ts")],
  outfile: resolve(outdir, "code.js"),
};

const uiBuild = {
  ...commonOptions,
  entryPoints: [resolve(__dirname, "src/ui/index.tsx")],
  outfile: resolve(outdir, "ui.js"),
  loader: { ".css": "text" },
};

async function writeUiHtml() {
  const js = await readFile(resolve(outdir, "ui.js"), "utf8");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Handofflog</title>
</head>
<body>
  <div id="root"></div>
  <script>${js}</script>
</body>
</html>`;
  await writeFile(resolve(outdir, "ui.html"), html, "utf8");
}

async function run() {
  await mkdir(outdir, { recursive: true });
  if (watch) {
    const mainCtx = await context(mainBuild);
    const uiCtx = await context({
      ...uiBuild,
      plugins: [
        {
          name: "ui-html",
          setup(b) {
            b.onEnd(() => writeUiHtml());
          },
        },
      ],
    });
    await Promise.all([mainCtx.watch(), uiCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([build(mainBuild), build(uiBuild)]);
    await writeUiHtml();
    console.log("Build complete → dist/code.js, dist/ui.html");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
