# Peraturan Pautan Dalaman — deepseek-my.com

Rujukan: struktur sama seperti [hk-deepseek.com](https://hk-deepseek.com).

## Pillar (5 tutorial teras)

| URL | Topik |
|-----|-------|
| `/posts/deepseek-api-key-and-limits/` | API Key, had kadar, 429 |
| `/posts/deepseek-api-retry-guide/` | Ulang cuba 503/429, backoff |
| `/posts/deepseek-prompt-basics/` | Asas prompt, halusinasi |
| `/posts/deepseek-web-login-troubleshoot/` | Log masuk web, 503 |
| `/posts/deepseek-ollama-local-setup/` | Ollama tempatan |

## Peraturan setiap artikel

- **2–5** pautan dalaman ke pillar (anchor text semula jadi)
- **0–2** pautan rasmi: `platform.deepseek.com`, `chat.deepseek.com`, `ollama.com`
- Maksimum **1** pautan exact-match setiap kata kunci
- **Jangan** paut ke domain `deepseek-*.com` lain dalam body artikel
- Auto-post: tambah seksyen `## Bacaan Lanjutan` via `node tools/add-internal-links.js`

## Indeks

- `featured: true` → indexable (5 pillar)
- `generated: true` → noindex (auto-post)
- Fail `YYYY-MM-DD-post-*.md` → noindex melainkan `featured: true`
