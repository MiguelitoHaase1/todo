// Inject Supabase credentials into index.html at build time.
// Reads SUPABASE_URL and SUPABASE_KEY from environment variables.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

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

// Copy manifest and static assets
writeFileSync("dist/manifest.json", readFileSync("manifest.json", "utf-8"));
for (const f of ["favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
  if (existsSync(f)) { copyFileSync(f, `dist/${f}`); }
}

console.log(`Built to dist/ (SB_URL: ${url ? "configured" : "empty — demo mode"})`);
