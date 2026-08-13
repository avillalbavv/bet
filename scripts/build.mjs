import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const projectDirectory = new URL("../", import.meta.url);
const staticFiles = ["index.html", "styles.css", "app.js", "src"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of staticFiles) {
  await cp(new URL(file, projectDirectory), new URL(file, outputDirectory), { recursive: file === "src" });
}

console.log(`Built static NOIR application into dist/`);
