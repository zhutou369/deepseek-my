#!/usr/bin/env node
/**
 * Tambah pautan dalaman pillar ke artikel deepseek-my.com
 * Penggunaan: node tools/add-internal-links.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "..", "src", "posts");
const DRY_RUN = process.argv.includes("--dry-run");

const PILLARS = [
  {
    path: "/posts/deepseek-api-key-and-limits/",
    label: "API Key, had kadar & ralat 429",
    keywords: ["api", "429", "rate limit", "token", "kunci", "key", "rpm", "tpm", "kuota", "platform"],
  },
  {
    path: "/posts/deepseek-api-retry-guide/",
    label: "Strategi ulang cuba 503/429",
    keywords: ["503", "429", "retry", "ulang cuba", "backoff", "circuit", "jitter", "timeout"],
  },
  {
    path: "/posts/deepseek-prompt-basics/",
    label: "Asas prompt & kawalan halusinasi",
    keywords: ["prompt", "halusinasi", "few-shot", "arahan", "rag", "output", "format"],
  },
  {
    path: "/posts/deepseek-web-login-troubleshoot/",
    label: "Penyelesaian log masuk web",
    keywords: ["log masuk", "login", "chat", "web", "cookie", "pelayar", "browser", "503", "unifi"],
  },
  {
    path: "/posts/deepseek-ollama-local-setup/",
    label: "Pemasangan Ollama tempatan",
    keywords: ["ollama", "tempatan", "local", "offline", "vllm", "gpu", "kad grafik", "ram", "vram", "deploy"],
  },
];

const DEFAULT_PILLARS = [PILLARS[0], PILLARS[2], PILLARS[4]];
const SECTION_HEADER = "## Bacaan Lanjutan";

function splitFrontMatter(raw) {
  if (!raw.startsWith("---")) return { fm: "", body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: "", body: raw };
  return { fm: raw.slice(0, end + 4), body: raw.slice(end + 4).replace(/^\s+/, "") };
}

function parseTitle(fm) {
  const m = fm.match(/^title:\s*"(.*)"/m);
  return m ? m[1] : "";
}

function parseDescription(fm) {
  const m = fm.match(/^description:\s*"(.*)"/m);
  return m ? m[1] : "";
}

function scorePillars(text) {
  const lower = text.toLowerCase();
  return PILLARS.map((p) => {
    let score = 0;
    for (const kw of p.keywords) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const hits = lower.match(re);
      if (hits) score += hits.length;
    }
    return { pillar: p, score };
  }).sort((a, b) => b.score - a.score);
}

function pickPillars(title, description, body, fileName) {
  const haystack = `${title}\n${description}\n${body.slice(0, 2000)}`;
  const ranked = scorePillars(haystack).filter((x) => x.score > 0);
  const chosen = [];

  for (const { pillar } of ranked) {
    if (chosen.length >= 3) break;
    if (fileName.includes("deepseek-api-key-and-limits") && pillar.path.includes("api-key-and-limits")) continue;
    if (fileName.includes("deepseek-api-retry-guide") && pillar.path.includes("api-retry-guide")) continue;
    if (fileName.includes("deepseek-prompt-basics") && pillar.path.includes("prompt-basics")) continue;
    if (fileName.includes("deepseek-web-login-troubleshoot") && pillar.path.includes("web-login-troubleshoot")) continue;
    if (fileName.includes("deepseek-ollama-local-setup") && pillar.path.includes("ollama-local-setup")) continue;
    if (!chosen.some((c) => c.path === pillar.path)) chosen.push(pillar);
  }

  if (chosen.length < 2) {
    for (const p of DEFAULT_PILLARS) {
      if (chosen.length >= 3) break;
      if (!chosen.some((c) => c.path === p.path)) chosen.push(p);
    }
  }

  return chosen.slice(0, 3);
}

function buildSection(pillars) {
  const lines = pillars.map((p) => `- [${p.label}](${p.path})`);
  return `\n${SECTION_HEADER}\n\nUntuk rujukan lanjut, lihat tutorial teras berikut:\n\n${lines.join("\n")}\n`;
}

function injectIntroLink(body, pillars) {
  if (/\]\(\/posts\//.test(body.split("\n").slice(0, 8).join("\n"))) return body;
  const first = pillars[0];
  if (!first) return body;
  const intro = `Artikel ini merangkumi butiran operasi DeepSeek; jika anda belum siapkan asas, mulakan dengan [${first.label}](${first.path}).\n\n`;
  const lines = body.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      insertAt = i;
      break;
    }
    if (lines[i].trim() && !lines[i].startsWith("#")) {
      insertAt = i + 1;
      break;
    }
  }
  if (insertAt === 0 && lines[0]?.trim()) insertAt = 1;
  lines.splice(insertAt, 0, intro.trim(), "");
  return lines.join("\n");
}

function ensureGeneratedFlag(fm, fileName) {
  if (!/\d{4}-\d{2}-\d{2}-post-\d+-\d+\.md$/i.test(fileName)) return fm;
  if (/^generated:\s*true/m.test(fm)) return fm;
  return fm.replace(/^---\n/m, "---\ngenerated: true\n");
}

const PILLAR_SKIP = new Set([
  "deepseek-api-key-and-limits.md",
  "deepseek-api-retry-guide.md",
  "deepseek-prompt-basics.md",
  "deepseek-web-login-troubleshoot.md",
  "deepseek-ollama-local-setup.md",
]);

function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (PILLAR_SKIP.has(fileName)) return { fileName, status: "skip-pillar" };

  const raw = fs.readFileSync(filePath, "utf-8");
  let { fm, body } = splitFrontMatter(raw);
  const hadSection = body.includes(SECTION_HEADER);

  if (hadSection) {
    return { fileName, status: "skip-has-section" };
  }

  const title = parseTitle(fm);
  const description = parseDescription(fm);
  const pillars = pickPillars(title, description, body, fileName);
  if (!pillars.length) return { fileName, status: "skip-no-pillars" };

  let newBody = body.replace(new RegExp(`\\n${SECTION_HEADER}[\\s\\S]*$`), "").trimEnd();
  const hasInline = /\]\(\/posts\//.test(newBody);
  if (!hasInline) newBody = injectIntroLink(newBody, pillars);
  newBody += buildSection(pillars);

  fm = ensureGeneratedFlag(fm, fileName);
  const updated = `${fm}\n\n${newBody.replace(/^\n+/, "")}`;
  if (!DRY_RUN) fs.writeFileSync(filePath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf-8");
  return { fileName, status: "updated", pillars: pillars.map((p) => p.path) };
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
const results = files.map((f) => processFile(path.join(POSTS_DIR, f)));
const updated = results.filter((r) => r.status === "updated");

console.log(DRY_RUN ? "DRY RUN\n" : "");
console.log(`Selesai: ${updated.length} dikemas kini, ${results.length - updated.length} dilangkau`);
if (updated.length) {
  updated.slice(0, 5).forEach((r) => console.log(`  ${r.fileName} → ${r.pillars.join(", ")}`));
}
