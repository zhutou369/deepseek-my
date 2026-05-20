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
    2. Tajuk (Title) mestilah padat, menarik, dan TIDAK MELEBIHI 12 patah perkataan (Sangat Penting untuk SEO!).
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

    🚫 AMARAN KERAS排版死命令: 
    * Jangan sesekali hasilkan tag H1 (#) di dalam badan artikel.
    * Baris pertama artikel tidak perlu ulang tajuk utama.
    * Struktur tajuk bahagian dalam badan artikel mestilah bermula dengan H2 (##) diikuti H3 (###).
        `;

        // ==========================================
        // 🌟 核心修复：智能防拥堵自动重试逻辑 (应对 503/429 错误)
        // ==========================================
        let response;
        let retryCount = 0;
        const maxRetries = 3;
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        while (retryCount < maxRetries) {
            try {
                console.log(`Menghubungi Gemini API... (Percubaan ke-${retryCount + 1})`);
                
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                if (response && response.text) {
                    break; // 成功拿到数据，跳出重试循环
                } else {
                    throw new Error("Gemini returned empty response");
                }
            } catch (error) {
                retryCount++;
                const errMsg = error.message.toLowerCase();
                
                // 如果是服务忙碌(503)或触发限流(429)，且没超过最大重试次数，则等待后重试
                if (errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('429')) {
                    if (retryCount < maxRetries) {
                        console.warn(`⚠️ Server Gemini sibuk (503/429). Menunggu 5 saat sebelum cuba semula...`);
                        await delay(5000); 
                    }
                } else {
                    // 如果是其他致命错误（如API Key失效、语法错误等），不重试直接抛出
                    throw error;
                }
            }
        }

        if (!response || !response.text) {
            console.error(`❌ Gagal menjana artikel selepas ${maxRetries} kali cubaan disebabkan kesesakan server. Kata kunci dikembalikan ke dalam senarai.`);
            keywords.unshift(currentTopic); // 任务失败，把关键词塞回队列头部
            continue; 
        }
        // ==========================================

        try {
            let articleContent = response.text;
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
