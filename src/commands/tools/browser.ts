import puppeteer from 'puppeteer';
import { HttpsProxyAgent } from 'https-proxy-agent'; // Opsional, jika mau pakai IP Proxy

/**
 * Mengambil konten (diasumsikan JSON) dari URL menggunakan Puppeteer untuk melewati proteksi anti-bot.
 *
 * @param url URL yang akan diakses (misal: endpoint IDX yang diblokir).
 * @param proxyUrl URL proxy IP (opsional, format: 'http://user:pass@ip:port').
 * @returns Promise yang mengembalikan konten halaman sebagai string.
 */
export async function getJsonWithPuppeteer(url: string, proxyUrl?: string): Promise<string> {
    
    // Konfigurasi argumen browser
    const browserArgs: string[] = [
        '--no-sandbox', // Wajib di lingkungan server/CI/CD
        '--disable-setuid-sandbox',
        '--disable-web-security',
        // Menambahkan user-agent agar terlihat seperti browser nyata
        `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`
    ];
    
    // Tambahkan konfigurasi proxy IP jika disediakan
    if (proxyUrl) {
        // Puppeteer dapat menggunakan proxy SOCKS/HTTP/HTTPS
        browserArgs.push(`--proxy-server=${proxyUrl}`);
    }

    const browser = await puppeteer.launch({
        headless: true, // true untuk server, false untuk debugging visual
        args: browserArgs,
        // Jika Anda ingin menggunakan HttpsProxyAgent, ini akan lebih rumit karena
        // Anda perlu mengintersep request, jadi penggunaan '--proxy-server' di args lebih disarankan.
    });

    try {
        const page = await browser.newPage();

        // [Penting untuk Anti-Bot] Menetapkan dimensi viewport standar
        await page.setViewport({ width: 1366, height: 768 });

        // Arahkan ke URL
        await page.goto(url, {
            // Tunggu hingga jaringan menjadi idle (semua request selesai dimuat)
            // Ini membantu menunggu pemuatan JavaScript dan penyelesaian tantangan Cloudflare
            waitUntil: 'networkidle0', 
            timeout: 60000 // Timeout 60 detik
        });
        
        // 1. Cek apakah ada tantangan Cloudflare yang berhasil diselesaikan
        const content = await page.content();
        
        // Cek umum untuk memverifikasi halaman sudah dimuat (bisa disesuaikan)
        if (content.includes('Cloudflare') && content.includes('Checking your browser')) {
             console.log("⚠️ Peringatan: Cloudflare mungkin belum sepenuhnya terlewati atau butuh waktu lebih lama.");
             // Anda mungkin perlu menunggu lebih lama di sini: await page.waitForTimeout(5000);
        }

        // 2. Jika endpoint mengembalikan JSON mentah, konten halaman adalah string JSON tersebut
        // Jika endpoint menampilkan JSON di dalam tag <pre>, kita perlu mengekstraknya
        try {
            const jsonText = await page.evaluate(() => {
                // Asumsi umum: JSON API sering ditampilkan di dalam tag <pre>
                const pre = document.querySelector('pre');
                return pre ? pre.textContent : document.body.textContent;
            });

            if (!jsonText) {
                throw new Error("Konten halaman kosong atau tidak ditemukan.");
            }
            
            // Coba parsing untuk memastikan valid JSON (untuk tujuan error handling)
            JSON.parse(jsonText);
            return jsonText;

        } catch (e) {
            // Jika parsing gagal, kemungkinan besar itu HTML (berarti Cloudflare tidak terlewati)
            console.error("Gagal parsing sebagai JSON. Mungkin halaman adalah HTML (diblokir Cloudflare).");
            // Anda bisa mengembalikan HTML-nya jika ingin dianalisis:
            // return content; 
            throw new Error("Respons bukan format JSON. Kemungkinan diblokir atau format endpoint salah.");
        }
        
    } finally {
        await browser.close();
    }
}