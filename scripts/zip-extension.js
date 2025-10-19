#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const extDir = path.join(repoRoot, "dynamic-display-extension");
const outDir = path.join(repoRoot, "public", "downloads");
const outZip = path.join(outDir, "bridgeui-extension.zip");

if (!fs.existsSync(extDir)) {
  console.error("Extension folder not found:", extDir);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

// Build exclusion patterns for zip (POSIX shell glob)
const exclude = [
  "dynamic-display-extension/config.js",
  "dynamic-display-extension/.env",
  "dynamic-display-extension/.git",
  "dynamic-display-extension/.git/**",
  "dynamic-display-extension/node_modules",
  "dynamic-display-extension/node_modules/**",
  // Editor files
  "dynamic-display-extension/.DS_Store"
].flatMap(p => ["-x", p]);

// Remove previous zip if exists
try {
  fs.unlinkSync(outZip);
} catch {}

// Use system zip to recursively archive the folder
const args = ["-r", outZip, "dynamic-display-extension", ...exclude];
const result = spawnSync("zip", args, { cwd: repoRoot, stdio: "inherit" });
if (result.status !== 0) {
  console.error("zip failed with code", result.status);
  process.exit(result.status || 1);
}
console.log("Wrote", path.relative(repoRoot, outZip));
