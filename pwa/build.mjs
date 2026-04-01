// Inject Supabase credentials into index.html at build time.
// Reads SUPABASE_URL and SUPABASE_KEY from environment variables.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("index.html", "utf-8");
const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_KEY || "";

const injected = html.replace(
  "const SB_URL = window.__SB_URL__ || '';",
  `const SB_URL = '${url}';`
).replace(
  "const SB_KEY = window.__SB_KEY__ || '';",
  `const SB_KEY = '${key}';`
);

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", injected);

// Copy manifest
writeFileSync("dist/manifest.json", readFileSync("manifest.json", "utf-8"));

console.log(`Built to dist/ (SB_URL: ${url ? "configured" : "empty — demo mode"})`);
