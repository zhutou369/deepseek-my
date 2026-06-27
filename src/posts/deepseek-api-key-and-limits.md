---
title: "API DeepSeek: kunci, had 429 & token"
description: "Cara mohon API Key DeepSeek, simpan kunci dengan selamat, fahami rate limit, dan tangani ralat 429 Too Many Requests."
date: 2026-06-27
updated: 2026-06-27
featured: true
tags: ["posts"]
layout: "layouts/post.njk"
permalink: "/posts/deepseek-api-key-and-limits/index.html"
---

Sebelum sambung DeepSeek API ke sistem CRM atau chatbot PKS, fahami dulu pengurusan kunci dan had kadar — ini mengelakkan 429 berulang selepas go-live.

## Mohon & simpan API Key

1. Log masuk portal pembangun DeepSeek, cipta projek, dan jana API Key.
2. Kunci hanya dipaparkan sekali; simpan ke Secret Manager (GitHub Secrets, Vault, atau storan awan).
3. Jangan letak Key dalam JavaScript frontend atau repo Git awam.
4. Guna Key berbeza untuk staging dan production supaya mudah putar semula.

## Fahami rate limit

429 bermaksud kadar permintaan atau token melebihi kuota. Dimensi biasa:

- Permintaan seminit (RPM)
- Token seminit (TPM)
- Had token setiap panggilan

Semasa pembangunan:

- Log medan `x-ratelimit-*` jika API menyediakan.
- Queue kerja batch — jangan hantar ratusan permintaan serentak.
- Pecahkan teks panjang supaya prompt tidak melebihi had satu panggilan.

## Apabila 429 muncul

1. **Hentikan retry berterusan** — ia memanjangkan tempoh sekatan.
2. **Baca Retry-After** dalam header respons jika ada.
3. **Backoff eksponen**: 1s → 2s → 4s, maksimum 3–5 cubaan.
4. **Downgrade**: waktu puncak, guna model lebih kecil atau cache jawapan serupa.

## Pantau penggunaan & kos

- Rekod `prompt_tokens` dan `completion_tokens` setiap panggilan.
- Asingkan statistik mengikut modul (chat, ringkasan dokumen, dll.).
- Putar Key secara berkala dan padam Key lama yang tidak digunakan.

## Senarai semak sebelum production

- [ ] Key tidak terdedah di frontend
- [ ] Timeout ditetapkan (30–60 saat)
- [ ] Retry 429/503 dan circuit breaker siap
- [ ] Log asas: status, masa, token

Langkah ini membuat integrasi API lebih stabil walaupun trafik meningkat di waktu puncak.
