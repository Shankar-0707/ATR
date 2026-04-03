import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiNodeModules = join(root, "apps", "api", "node_modules");

function linkPackage(name) {
  const src = join(root, "node_modules", name);
  const dest = join(apiNodeModules, name);

  if (!existsSync(src)) {
    console.warn(`[link-api-express] skip: root node_modules/${name} not found`);
    return;
  }

  if (existsSync(dest)) return;

  mkdirSync(dirname(dest), { recursive: true });

  if (process.platform === "win32") {
    execSync(`cmd /c mklink /J "${dest}" "${src}"`, { stdio: "inherit" });
  } else {
    const rel = relative(dirname(dest), src);
    symlinkSync(rel, dest, "dir");
  }
  console.log(`[link-api-express] linked ${name}`);
}

// Link express and its types for reliable TS resolution
linkPackage("express");
linkPackage("@types/express");
