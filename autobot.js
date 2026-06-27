const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const SYSTEM_TAGS = new Set(['posts']);
const TAG_POOL = [
    'DeepSeek Malaysia',
    'Panduan API',
    'Ollama',
    'RAG',
    'Fine-Tuning',
    'Privasi Data',
    'PKS Malaysia',
    'Automasi Bisnes',
    'Prompt Engineering',
    'On-Premise AI',
    'Model Tempatan',
    'vLLM',
    'Keselamatan AI',
    'SEO Malaysia',
    'Gemini Workflow'
];
const FORBIDDEN_PHRASES = [
    'Kesimpulannya',
    'Tidak dapat dinafikan',
    'Dalam era digital masa kini',
    'Seiring dengan perkembangan pesat',
    'peneraju industri',
    'bertaraf dunia',
    'menyeluruh',
    'integrasi mendalam',
    'ekstrem'
];

function pickDynamicTags(topic, todayStr, randomId) {
    const seedText = `${topic}-${todayStr}-${randomId}`;
    let seed = 0;
    for (const char of seedText) seed += char.charCodeAt(0);

    const shuffled = [...TAG_POOL].sort((a, b) => {
        const scoreA = (seed + a.charCodeAt(0) + a.length * 17) % 97;
        const scoreB = (seed + b.charCodeAt(0) + b.length * 17) % 97;
        return scoreA - scoreB;
    });

    return ['posts', ...shuffled.slice(0, 4)];
}

function stripCodeFence(text) {
    return String(text || '')
        .trim()
        .replace(/^```(?:json|markdown)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function parseJsonResponse(text) {
    const clean = stripCodeFence(text);
    try {
        return JSON.parse(clean);
    } catch (error) {
        const match = clean.match(/\{[\s\S]*\}/);
        if (!match) throw error;
        return JSON.parse(match[0]);
    }
}

function slugify(value, fallback) {
    const slug = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || fallback;
}

function yamlEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

function removeForbiddenPhrases(value) {
    let output = String(value || '');
    for (const phrase of FORBIDDEN_PHRASES) {
        output = output.split(phrase).join('');
    }
    output = output.replace(/^Dalam era[^.\n]{0,80}[,.]\s*/i, '');
    output = output.replace(/^Seiring dengan[^.\n]{0,80}(?:pesat)?[^.\n]{0,30}[,.]\s*/i, '');
    return output.trim();
}

function normalizeArticle(article, currentTopic, dynamicTags) {
    const safeArticle = article && typeof article === 'object' ? article : {};
    const title = removeForbiddenPhrases(safeArticle.title || currentTopic);
    const description = removeForbiddenPhrases(
        safeArticle.description || `Nota praktikal tentang ${currentTopic} untuk pengguna DeepSeek di Malaysia.`
    );
    const slug = slugify(safeArticle.slug, 'deepseek-malaysia-guide');
    const aiTags = Array.isArray(safeArticle.tags) ? safeArticle.tags : [];
    const tags = [...new Set([...dynamicTags, ...aiTags])]
        .map(tag => String(tag || '').trim())
        .filter(Boolean)
        .filter(tag => tag.length <= 30)
        .slice(0, 7);
    const body = removeForbiddenPhrases(safeArticle.body || '');

    return {
        title,
        description,
        slug,
        tags: tags.length ? tags : ['posts'],
        body
    };
}

function buildMarkdown(article, todayStr, randomId) {
    const permalink = `/posts/${todayStr}-${article.slug}-${randomId}/index.html`;
    const tags = JSON.stringify(article.tags);

    return `---
title: "${yamlEscape(article.title)}"
description: "${yamlEscape(article.description)}"
date: ${todayStr}
tags: ${tags}
generated: true
layout: "layouts/post.njk"
permalink: "${permalink}"
---

${article.body}
`;
}

async function generateWithRetry(ai, contents, logLabel) {
    let response;
    let retryCount = 0;
    const maxRetries = 6;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    while (retryCount < maxRetries) {
        try {
            console.log(`${logLabel} (Percubaan ke-${retryCount + 1})`);
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
            });

            if (response && response.text) return response.text;
            throw new Error('Gemini returned empty response');
        } catch (error) {
            retryCount++;
            const errMsg = String(error.message || '').toLowerCase();
            if ((errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('429')) && retryCount < maxRetries) {
                const waitTime = retryCount * 5000;
                console.warn(`⚠️ Server Gemini sibuk (503/429). Menunggu ${waitTime / 1000} saat sebelum cuba semula...`);
                await delay(waitTime);
            } else {
                throw error;
            }
        }
    }

    throw new Error('Gemini API masih gagal selepas retry');
}

function getMalaysiaDateString() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(now);
}

async function runAutoBot() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ [Amaran] GEMINI_API_KEY tidak dikesan.");
        return; 
    }

    const args = process.argv.slice(2);
    let maxPosts = parseInt(args[0], 10) || 1;
    console.log(`🤖 Arahan diterima, menjana ${maxPosts} artikel...`);

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const jsonPath = path.join(__dirname, 'src', 'keywords.json');   
    const imagesPath = path.join(__dirname, 'src', 'images.txt'); 
    
    if (!fs.existsSync(jsonPath)) {
        console.warn("⚠️ keywords.json tidak dijumpai.");
        return;
    }
    
    let keywords = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    if (maxPosts > keywords.length) maxPosts = keywords.length;

    for (let currentLoop = 0; currentLoop < maxPosts; currentLoop++) {
        let selectedImages = [];
        if (fs.existsSync(imagesPath)) {
            const allImages = fs.readFileSync(imagesPath, 'utf-8').split(/\r?\n/).filter(line => line.startsWith('http'));
            selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, 2);
        }

        const currentTopic = keywords.shift();
        const todayStr = getMalaysiaDateString();
        const randomId = Math.floor(100 + Math.random() * 900);
        const dynamicTags = pickDynamicTags(currentTopic, todayStr, randomId);
        const visibleTags = dynamicTags.filter(tag => !SYSTEM_TAGS.has(tag)).join(', ');
        const imageInstruction = selectedImages.length
            ? `Masukkan imej berikut secara semula jadi dengan alt text Bahasa Melayu:\n${selectedImages.map((image, index) => `Imej ${index + 1}: ${image}`).join('\n')}`
            : 'Jika tiada imej sesuai, teruskan artikel tanpa imej.';

        const prompt = `
    Anda penulis sambilan blog teknikal untuk pengguna biasa di Malaysia, bukan penulis white paper. Tulis artikel praktikal tentang topik: "${currentTopic}".
    
    Syarat kandungan:
    1. Tajuk mesti seperti tajuk blog, bukan "white paper", "panduan lengkap rasmi", atau gaya korporat berat.
    2. Panjang 800-1500 patah perkataan. Perenggan mesti bervariasi, jangan semuanya 3-4 ayat.
    3. Badan artikel mesti ada: satu nombor versi atau tarikh khusus, sekurang-kurangnya 3 langkah operasi, dan seksyen "Soalan Lazim".
    4. Sekurang-kurangnya satu perenggan guna orang pertama, contohnya "Semasa saya uji..." atau "Minggu lepas saya naik taraf...".
    5. Jangan guna frasa: Kesimpulannya, Tidak dapat dinafikan, Dalam era digital masa kini, peneraju industri, menyeluruh, integrasi mendalam, ekstrem.
    6. Buang pembukaan seperti "Dalam era..." atau "Seiring dengan perkembangan pesat...".
    7. Pilih satu struktur secara rawak:
       A. Tutorial (langkah + penerangan tangkap layar)
       B. Ulasan (3 dimensi markah + rasa seperti jadual)
       C. Soal jawab (5 FAQ)
       D. Berita ringkas (300-600 patah perkataan)
    8. Gunakan "## Isi Kandungan" sebagai bahagian besar. Tags diurus oleh laman agregasi, jangan tambah senarai tags di akhir artikel.
    9. Gunakan istilah Malaysia seperti PKS, rangkaian, kad grafik, pelayan mandiri, dan Bahasa Melayu santai yang masih teknikal.
    10. Terjemah topik menjadi slug bahasa Inggeris yang ringkas, huruf kecil dan dipisahkan tanda sempang.
    11. Cadangan Front Matter Tags: ${visibleTags}.
    12. Jangan hasilkan H1 (#) dalam body. Body bermula dengan H2 (##).

    ${imageInstruction}

    Output mesti JSON sahaja, tanpa markdown code fence dan tanpa YAML:
    {
      "title": "Tajuk artikel",
      "description": "Ringkasan maksimum 120 aksara",
      "slug": "english-url-slug",
      "tags": ["posts", "Tag 1", "Tag 2"],
      "body": "Markdown body tanpa Front Matter dan tanpa H1"
    }
        `;

        try {
            const firstPassText = await generateWithRetry(ai, prompt, 'Menghubungi Gemini API untuk artikel JSON pusingan pertama...');
            const firstPassArticle = normalizeArticle(parseJsonResponse(firstPassText), currentTopic, dynamicTags);
            console.log('🎉 Artikel JSON pusingan pertama berjaya. Memulakan polish pusingan kedua.');

            const polishPrompt = `
    Tulis semula artikel JSON di bawah dengan gaya forum/Quora yang lebih manusia: kurangkan 20% bahasa korporat, tambah 1-2 frasa santai, kekalkan semua maklumat teknikal, dan output JSON dengan struktur yang sama.

    Syarat keras:
    - Tajuk seperti blog, bukan white paper atau panduan rasmi.
    - Body mesti ada satu versi/tarikh khusus, sekurang-kurangnya 3 langkah operasi, dan seksyen "Soalan Lazim".
    - Sekurang-kurangnya satu perenggan guna orang pertama.
    - Jangan guna: Kesimpulannya, Tidak dapat dinafikan, Dalam era digital masa kini, peneraju industri, menyeluruh, integrasi mendalam, ekstrem.
    - Buang pembukaan "Dalam era..." atau "Seiring dengan perkembangan pesat...".
    - Tukar sebahagian kata hubung supaya tidak asyik "selain itu", "oleh itu", "pada masa yang sama".
    - Panjang 800-1500 patah perkataan, perenggan bervariasi, guna "## Isi Kandungan".
    - Kekalkan fields JSON: title, description, slug, tags, body. Jangan output code fence.

    JSON asal:
    ${JSON.stringify(firstPassArticle, null, 2)}
            `;

            const polishedText = await generateWithRetry(ai, polishPrompt, 'Menjalankan polish pusingan kedua...');
            const polishedArticle = normalizeArticle(parseJsonResponse(polishedText), currentTopic, dynamicTags);
            const articleContent = buildMarkdown(polishedArticle, todayStr, randomId);

            const fileName = `${todayStr}-post-${randomId}-${currentLoop}.md`;
            const outputDir = path.join(__dirname, 'src', 'posts'); 
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            
            fs.writeFileSync(path.join(outputDir, fileName), articleContent, 'utf-8');
            console.log(`✅ Artikel berjaya dicipta: ${fileName}`);
        } catch (error) {
            console.error(`❌ Gagal menyimpan artikel:`, error.message);
            keywords.unshift(currentTopic); 
        }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(keywords, null, 2), 'utf-8');
    console.log(`📉 Selesai! Baki kata kunci: ${keywords.length}`);
}

runAutoBot();
