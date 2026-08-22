import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const projectDirectory = new URL("../", import.meta.url);
const staticFiles = ["index.html", "styles.css", "visual.css", "premium.css", "app.js", "src", "assets"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of staticFiles) {
  await cp(new URL(file, projectDirectory), new URL(file, outputDirectory), { recursive: ["src", "assets"].includes(file) });
}

const publicEnvironment = Object.fromEntries([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_0XPLAYSLOTS_PROXY_URL",
  "VITE_0XPLAYSLOTS_API_URL",
  "VITE_0XPLAYSLOTS_API_KEY",
].map((key) => [key, process.env[key] || ""]));

await writeFile(new URL("env.js", outputDirectory), `globalThis.__NOIR_ENV__ = Object.freeze(${JSON.stringify(publicEnvironment)});\n`);

console.log(`Built static NOIR application into dist/`);
