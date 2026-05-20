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
    
    // 🌟 修复并保持你的目录设计，移至正确的开发路径
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

        // 🌟 核心修正：严格限死 AI 生成的标语及标题长度，防止拼装后超长引发 SEO 警告
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

        try {
            console.log(`Menghubungi Gemini API untuk artikel ${currentLoop + 1}...`);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            let articleContent = response.text;
            const fileName = `${todayStr}-post-${randomId}-${currentLoop}.md`;
            const outputDir = path.join(__dirname, 'src', 'posts'); 
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            
            fs.writeFileSync(path.join(outputDir, fileName), articleContent, 'utf-8');
            console.log(`✅ Artikel berjaya dicipta: ${fileName}`);
        } catch (error) {
            console.error(`❌ Gagal menjana artikel:`, error.message);
            keywords.unshift(currentTopic); // Kembalikan kata kunci jika gagal
        }
    }

    // Kemas kini json keywords
    fs.writeFileSync(jsonPath, JSON.stringify(keywords, null, 2), 'utf-8');
    console.log(`📉 Selesai! Baki kata kunci: ${keywords.length}`);
}

runAutoBot();
