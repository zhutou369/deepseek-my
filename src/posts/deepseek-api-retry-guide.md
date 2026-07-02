---
title: "Strategi ulang cuba 503/429 API DeepSeek"
description: "Implement exponential backoff, jitter, dan circuit breaker apabila DeepSeek API return 503 atau 429."
date: 2026-06-27
updated: 2026-06-30
featured: true
coverImage: "/static/posts/deepseek-api-retry-cover.svg"
tags: ["posts"]
layout: "layouts/post.njk"
permalink: "/posts/deepseek-api-retry-guide/index.html"
---

503 dan 429 kedua-duanya sementara, tetapi perlakuan berbeza: 503 biasanya pelayan sibuk, 429 bermaksud anda terlalu pantas. Sebelum retry, pastikan [API Key & had kadar](/posts/deepseek-api-key-and-limits/) dikonfigurasi dengan betul.

## Bezakan jenis ralat

| Kod | Maksud | Retry? |
|-----|--------|--------|
| 503 | Perkhidmatan tidak tersedia sementara | Ya, dengan backoff |
| 429 | Melebihi rate limit | Ya, tunggu lebih lama |
| 401/403 | Auth atau kebenaran | Tidak — semak Key |
| 400 | Format permintaan salah | Tidak — betulkan parameter |

401/403? Kembali ke [panduan API Key](/posts/deepseek-api-key-and-limits/) semak Key tamat tempoh atau campur environment.

## Exponential backoff

![Garis masa backoff untuk 503 dan 429](/static/posts/deepseek-api-retry-step.svg)

Aliran asas:

1. Gagal pertama: tunggu 1 saat
2. Gagal kedua: 2 saat, ketiga: 4 saat
3. Tambah jitter rawak (0–0.5s) supaya banyak klien tidak retry serentak
4. Had `maxRetries = 4`, lepas itu pulangkan mesej mesra kepada pengguna

Contoh Python:

```python
import random, time

def call_with_retry(fn, max_retries=4):
    for attempt in range(max_retries):
        try:
            return fn()
        except TemporaryAPIError:
            if attempt == max_retries - 1:
                raise
            wait = (2 ** attempt) + random.uniform(0, 0.5)
            time.sleep(wait)
```

## Circuit breaker

Jika 503/429 berulang, hentikan seketika permintaan baru:

- Ambang: 5 kegagalan berturut-turut
- Buka litar: 30–60 saat
- Separuh-buka: benarkan 1 permintaan ujian; jika berjaya, tutup litar

## Khusus untuk 429

- Utamakan header `Retry-After`
- Kurangkan concurrency worker (contoh: dari 10 ke 2)
- Pecahkan batch job kepada slot masa berbeza
- Kurangkan panjang prompt — lihat [asas prompt](/posts/deepseek-prompt-basics/)

## Amalan production

- Jangan retry 401/403 — ia membazir kuota
- Log setiap retry dengan `attempt` dan `wait_ms`
- Uji dari rangkaian pejabat KL dengan VPN dimatikan sebelum salahkan API

Untuk ujian offline tanpa API awan, cuba [Ollama tempatan](/posts/deepseek-ollama-local-setup/). Masalah log masuk web? Lihat [penyelesaian login](/posts/deepseek-web-login-troubleshoot/).

## Tutorial berkaitan

- [API Key, had kadar & 429](/posts/deepseek-api-key-and-limits/)
- [Asas prompt & kawalan halusinasi](/posts/deepseek-prompt-basics/)
- [Penyelesaian log masuk web](/posts/deepseek-web-login-troubleshoot/)
