---
title: "Jalankan DeepSeek tempatan dengan Ollama"
description: "Pasang Ollama di Windows/macOS, tarik model DeepSeek, uji output BM, dan selesaikan masalah RAM/GPU di Malaysia."
date: 2026-06-27
updated: 2026-06-27
featured: true
tags: ["posts"]
layout: "layouts/post.njk"
permalink: "/posts/deepseek-ollama-local-setup/index.html"
---

Deploy DeepSeek tempatan sesuai untuk ujian offline, data sensitif PKS, atau kawalan kos inferens. Ollama antara cara paling mudah untuk mula.

## Persediaan persekitaran

- **macOS**: Apple Silicon 16GB RAM ke atas lebih selesa; Intel Mac perlu semak saiz model.
- **Windows 11**: NVIDIA + driver terkini disyorkan; CPU-only boleh guna model kecil tetapi perlahan.
- **Storan**: sediakan 10–30GB bergantung tag model.

## Pasang Ollama

1. Muat turun installer dari laman Ollama untuk OS anda.
2. Jalankan `ollama --version` dalam terminal/PowerShell.
3. Muat turun pertama kali memerlukan internet stabil — elakkan potong sambungan.

## Tarik & uji model DeepSeek

```bash
ollama pull deepseek-r1:7b
ollama run deepseek-r1:7b
```

Pilih tag mengikut hardware (`1.5b`, `7b`, `14b`). Model besar biasanya lebih baik tetapi makan RAM/VRAM.

## Output Bahasa Melayu

Model tempatan kadang-kadang cenderung Inggeris atau campuran. Tambah di awal prompt:

```
Jawab dalam Bahasa Melayu. Kekalkan istilah teknikal Inggeris jika perlu (API, GPU, token).
```

Jika masih tidak konsisten:

- Cuba versi model lebih baru
- Beri 1 contoh jawapan BM (few-shot)
- Post-process hanya sebagai langkah akhir, bukan pengganti prompt

## Masalah biasa

### OOM (kehabisan memori)

- Turunkan saiz model (14b → 7b → 1.5b)
- Tutup app lain yang guna GPU
- Windows: pastikan Ollama guna GPU jika tersedia

### Kelajuan perlahan di CPU

- Kurangkan `num_ctx` jika konfigurasi dibenarkan
- Guna model distilled/quantized
- Untuk production, pertimbang vLLM atau pelayan dedikasi

### Firewall pejabat

Sesetengah rangkaian korporat memblok muat turun model — uji di rangkaian rumah atau hotspot mudah alih.

## Langkah seterusnya

Selepas Ollama stabil:

- Sambung ke skrip Python/Node melalui API tempatan Ollama
- Uji RAG kecil dengan dokumen syarikat (PDF → chunk → embedding)
- Banding output tempatan vs API awan sebelum commit ke production

Saya pasang `deepseek-r1:7b` pada laptop RTX 3060 di Penang — muat turun pertama ~15 minit di Unifi 300Mbps, selepas itu inferens chat ringkas sekitar 20–40 token/s untuk prompt BM pendek.
