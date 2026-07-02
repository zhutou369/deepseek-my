---
title: "Asas prompt DeepSeek kurangkan halusinasi"
description: "Gunakan peranan, tugas, dan format output untuk prompt DeepSeek yang lebih konsisten — dengan contoh Bahasa Melayu."
date: 2026-06-27
updated: 2026-06-30
featured: true
coverImage: "/static/posts/deepseek-prompt-cover.svg"
tags: ["posts"]
layout: "layouts/post.njk"
permalink: "/posts/deepseek-prompt-basics/index.html"
---

Perbezaan prompt yang “ok” dan yang bagus biasanya pada satu perkara: model tahu apa tugasnya, format apa yang diharapkan, dan bila perlu kata “tidak pasti”. Prompt yang panjang tanpa had juga boleh picu [429 rate limit](/posts/deepseek-api-key-and-limits/) — kawal output dari awal.

## Tiga elemen asas

![Struktur prompt DeepSeek: peranan, tugas, format](/static/posts/deepseek-prompt-step.svg)

Setiap prompt patut ada:

1. **Peranan** — contoh: “Anda jurutera Python senior”
2. **Tugas** — contoh: “Tukar JSON di bawah kepada jadual Markdown”
3. **Format output** — bullet, jadual, JSON, had perkataan

Contoh:

```
Anda editor dokumentasi teknikal. Tulis semula penjelasan ralat API di bawah sebagai FAQ Bahasa Melayu.
Syarat:
- Guna ## untuk setiap soalan
- Jawapan maksimum 80 patah perkataan
- Jika tiada bukti, tulis "perlu disahkan dengan dokumentasi rasmi"
```

## Kurangkan halusinasi

- Minta: “Jawab hanya berdasarkan teks yang diberi; jika maklumat tidak cukup, kata tidak tahu.”
- Untuk nombor, tarikh, atau peraturan: minta rujukan atau tanda “perlu disahkan”.
- Elakkan soalan terbuka tanpa konteks — beri contoh input/output.

## Few-shot (1–2 contoh)

Untuk klasifikasi tiket sokongan:

```
Input: Log masuk dapat 503
Output: {"type":"server","action":"retry_later"}

Input: API return 401
Output: {"type":"auth","action":"check_api_key"}
```

Ralat 503/429 dalam pipeline API? Rujuk [strategi ulang cuba](/posts/deepseek-api-retry-guide/).

## Masalah biasa

| Gejala | Punca | Pembetulan |
|--------|-------|------------|
| Jawapan terlalu panjang | Tiada had | Tambah “maksimum N patah perkataan” |
| Format berbeza setiap kali | Tiada template | Minta JSON atau Markdown tetap |
| Fakta rekaan | Tiada sempadan | Larangan mengada-adakan ciri |
| Campur BM/BI | Bahasa tidak jelas | Nyatakan “jawab dalam Bahasa Melayu” |

## Cara iterasi

1. Tulis prompt minimum
2. Uji 3–5 input sebenar
3. Tambah constraint hanya pada kes yang gagal
4. Simpan versi prompt dalam repo (contoh: `prompts/v2-ringkasan.md`)

Semasa saya susun template untuk pasukan khidmat pelanggan Shopee seller di JB, satu perenggan contoh output BM sudah cukup menstabilkan nada. Untuk ujian tanpa API awan, cuba [Ollama tempatan](/posts/deepseek-ollama-local-setup/). Masalah log masuk web ada di [panduan login](/posts/deepseek-web-login-troubleshoot/).

## Tutorial berkaitan

- [API Key, had kadar & 429](/posts/deepseek-api-key-and-limits/)
- [503/429 ulang cuba & circuit breaker](/posts/deepseek-api-retry-guide/)
- [Penyelesaian log masuk web](/posts/deepseek-web-login-troubleshoot/)
- [Pemasangan Ollama tempatan](/posts/deepseek-ollama-local-setup/)
