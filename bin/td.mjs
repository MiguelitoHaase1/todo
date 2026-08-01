#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  execFileSync("npx", ["tsx", join(root, "src", "cli.ts"), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: root,
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
