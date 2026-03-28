/**
 * Ensures apps/api/node_modules/express resolves so TypeScript/IDE find the package
 * (npm workspaces often hoist deps to the repo root only).
 */
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiNodeModules = join(root, "apps", "api", "node_modules");
const expressSrc = join(root, "node_modules", "express");
const expressDest = join(apiNodeModules, "express");

if (!existsSync(expressSrc)) {
  console.warn(
    "[link-api-express] skip: root node_modules/express not found (run npm install from repo root)",
  );
  process.exit(0);
}

if (existsSync(expressDest)) {
  process.exit(0);
}

mkdirSync(apiNodeModules, { recursive: true });

if (process.platform === "win32") {
  execSync(`cmd /c mklink /J "${expressDest}" "${expressSrc}"`, { stdio: "inherit" });
} else {
  const rel = relative(dirname(expressDest), expressSrc);
  symlinkSync(rel, expressDest, "dir");
}
