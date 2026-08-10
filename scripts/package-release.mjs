import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(projectRoot, "dist");
const releaseDirectory = resolve(projectRoot, "release");
const manifestPath = resolve(distDirectory, "manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error("dist/manifest.json is missing. Run npm run build before packaging.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

if (manifest.version !== packageJson.version) {
  throw new Error(
    `Version mismatch: manifest is ${manifest.version}, package.json is ${packageJson.version}.`
  );
}

mkdirSync(releaseDirectory, { recursive: true });
const archivePath = resolve(releaseDirectory, `receivd-v${manifest.version}.zip`);
if (existsSync(archivePath)) unlinkSync(archivePath);

execFileSync("zip", ["-q", "-r", archivePath, "."], { cwd: distDirectory });
console.log(`Created ${archivePath}`);
