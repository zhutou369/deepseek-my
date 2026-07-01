const fs = require('fs');
const path = require('path');
const https = require('https');

const DOMAIN = process.env.BING_DOMAIN || 'deepseek-my.com';
const BING_KEY = (process.env.INDEXNOW_KEY || '').trim();
const OUTPUT_DIR = path.join(__dirname, '..', '_site');

const BING_403_HELP = [
    '❌ IndexNow 403: Bing belum benarkan domain ini.',
    '   Fail pengesahan boleh diakses ≠ API sudah dibenarkan. Langkah:',
    '   1. Buka https://www.bing.com/webmasters dan tambah deepseek-my.com',
    '   2. Sahkan pemilikan via XML / Meta tag / DNS (jangan hanya import Google)',
    '   3. Settings → IndexNow: jana key, kemas kini GitHub Secret INDEXNOW_KEY',
    '   4. Pastikan https://deepseek-my.com/{key}.txt hanya mengandungi key (tiada baris baru)',
].join('\n');

function getAllHtmlFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllHtmlFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.html')) {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

function toPublicUrl(relativePath) {
    let normalized = relativePath.replace(/\\/g, '/');
    if (normalized.endsWith('index.html')) {
        normalized = normalized.slice(0, -10);
    } else if (normalized.endsWith('.html')) {
        normalized = normalized.slice(0, -5);
    }
    return `https://${DOMAIN}/${normalized}`;
}

function postIndexNow(requestData) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.indexnow.org',
            path: '/IndexNow',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(requestData),
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', reject);
        req.write(requestData);
        req.end();
    });
}

async function main() {
    if (!BING_KEY) {
        console.log('ℹ️ INDEXNOW_KEY tidak ditetapkan, langkau push IndexNow.');
        process.exit(0);
    }

    const htmlFiles = getAllHtmlFiles(OUTPUT_DIR);
    let urlList = htmlFiles.map((filePath) => {
        const relativePath = path.relative(OUTPUT_DIR, filePath);
        return toPublicUrl(relativePath);
    });

    urlList = urlList.filter(
        (url) => !url.includes('404') && !url.includes('admin') && !url.endsWith('.txt')
    );

    if (urlList.length === 0) {
        console.log('ℹ️ Tiada halaman sah, tidak perlu push.');
        process.exit(0);
    }

    console.log(`🚀 Menghantar ${urlList.length} URL ke Bing IndexNow...`);

    const requestData = JSON.stringify({
        host: DOMAIN,
        key: BING_KEY,
        keyLocation: `https://${DOMAIN}/${BING_KEY}.txt`,
        urlList,
    });

    const { statusCode, body } = await postIndexNow(requestData);

    if (statusCode === 200 || statusCode === 202) {
        console.log(`✅ IndexNow diterima! Kod status: ${statusCode}`);
        process.exit(0);
    }

    console.error(`❌ Push gagal, kod: ${statusCode}, respons: ${body}`);
    if (statusCode === 403 && body.includes('UserForbiddedToAccessSite')) {
        console.error(BING_403_HELP);
    }
    process.exit(1);
}

main().catch((err) => {
    console.error('❌ Ralat push automatik:', err.message);
    process.exit(1);
});
