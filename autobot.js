const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

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
        const todayStr = new Date().toISOString().split('T')[0];
        const randomId = Math.floor(100 + Math.random() * 900);

        const prompt = `
    Tulis satu artikel tutorial teknikal yang mendalam dan asli tentang topik: "${currentTopic}".
    
    Syarat Utama SEO:
    1. Panjang artikel mestilah antara 1000 hingga 1500 patah perkataan.
    2. Tajuk (Title) mestilah sangat padat, ringkas dan TIDAK MELEBIHI 8 patah perkataan.
    3. Nada profesional, gunakan istilah tempatan Malaysia (cth: PKS, transformasi digital, rangkaian, kad grafik).
    4. Output Front Matter secara ketat (Gunakan Description yang mantap antara 15 hingga 25 patah perkataan):

    ---
    title: "Tajuk Ringkas Untuk ${currentTopic}"
    description: "Ketahui cara lengkap dan langkah demi langkah untuk mengoptimumkan ${currentTopic} bagi meningkatkan prestasi perniagaan anda di Malaysia."
    date: ${todayStr}
    tags: ["posts"]
    layout: "layouts/post.njk"
    ---

    Sila masukkan imej ini secara semulajadi dengan alt text Bahasa Melayu:
    Imej 1: ${selectedImages[0]}
    Imej 2: ${selectedImages[1]}

    🚫 AMARAN KERAS: 
    * Jangan sesekali hasilkan tag H1 (#) di dalam badan artikel.
    * Baris pertama artikel tidak perlu ulang tajuk utama.
    * Struktur tajuk bahagian dalam badan artikel mestilah bermula dengan H2 (##) diikuti H3 (###).
        `;

        // ==========================================
        // 🌟 终极加固：6次抗压重试 + 阶梯递增等待机制
        // ==========================================
        let response;
        let retryCount = 0;
        const maxRetries = 6; // 提高到 6 次重试
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        while (retryCount < maxRetries) {
            try {
                console.log(`Menghubungi Gemini API... (Percubaan ke-${retryCount + 1})`);
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                if (response && response.text) {
                    break; 
                } else {
                    throw new Error("Gemini returned empty response");
                }
            } catch (error) {
                retryCount++;
                const errMsg = error.message.toLowerCase();
                if (errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('429')) {
                    if (retryCount < maxRetries) {
                        // 阶梯式等待：第1次等5秒，第2次等10秒，第3次等15秒... 完美避开拥堵波峰
                        const waitTime = retryCount * 5000;
                        console.warn(`⚠️ Server Gemini sibuk (503/429). Menunggu ${waitTime / 1000} saat sebelum cuba semula...`);
                        await delay(waitTime); 
                    }
                } else {
                    throw error;
                }
            }
        }

        if (!response || !response.text) {
            console.error(`❌ Gagal menjana artikel selepas ${maxRetries} kali cubaan. Kata kunci dikembalikan.`);
            keywords.unshift(currentTopic); 
            continue; 
        }

        try {
            let articleContent = response.text;

            const titleMatch = articleContent.match(/title:\s*["']?([^"'\n]+)["']?/);
            if (titleMatch && titleMatch[1]) {
                let generatedTitle = titleMatch[1].trim();
                if (generatedTitle.length > 45) {
                    let truncatedTitle = generatedTitle.substring(0, 42) + "...";
                    articleContent = articleContent.replace(titleMatch[0], `title: "${truncatedTitle}"`);
                    console.log(`✂️ Title terlalu panjang (${generatedTitle.length} char), dipotong kepada: "${truncatedTitle}"`);
                }
            }

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
