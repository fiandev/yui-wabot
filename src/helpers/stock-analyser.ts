// --- 1. Definisi Tipe/Interface berdasarkan struktur JSON ---
// Ini membantu memastikan data yang kita gunakan konsisten

export interface Shareholder {
    Nama: string;
    Jumlah: number;
    Persentase: number;
    Kategori: string;
    Pengendali: boolean;
}

export interface Profile {
    NamaEmiten: string;
    KodeEmiten: string;
    Sektor: string;
    Industri: string;
}

export interface CompanyData {
    Profiles: Profile[];
    PemegangSaham: Shareholder[];
}

// --- 2. Fungsi untuk Menghitung Metrik Fundamental ---

/**
 * Menghitung Earning Per Share (EPS)
 * Rumus: Laba Bersih / Jumlah Saham Beredar
 * @param netIncome - Laba Bersih Perusahaan (dari Laporan Laba Rugi)
 * @param totalShares - Jumlah Total Saham yang Beredar
 * @returns Nilai EPS
 */
export function calculateEPS(netIncome: number, totalShares: number): number {
    if (totalShares === 0) return 0;
    return netIncome / totalShares;
}

/**
 * Menghitung Return on Equity (ROE)
 * Rumus: (Laba Bersih / Total Ekuitas) * 100%
 * @param netIncome - Laba Bersih Perusahaan (dari Laporan Laba Rugi)
 * @param totalEquity - Total Ekuitas Perusahaan (dari Neraca)
 * @returns Nilai ROE dalam persentase
 */
export function calculateROE(netIncome: number, totalEquity: number): number {
    if (totalEquity === 0) return 0;
    return (netIncome / totalEquity) * 100;
}

/**
 * Menghitung Price to Earnings Ratio (PE Ratio)
 * Rumus: Harga Saham per Lembar / EPS
 * @param stockPrice - Harga saham saat ini
 * @param eps - Nilai Earning Per Share
 * @returns Nilai PE Ratio
 */
export function calculatePERatio(stockPrice: number, eps: number): number {
    if (eps === 0) return 0; // atau bisa dianggap tidak terdefinisi
    return stockPrice / eps;
}

/**
 * Menghitung Price to Book Value (PBV)
 * Rumus: Harga Saham per Lembar / (Total Ekuitas / Jumlah Saham Beredar)
 * @param stockPrice - Harga saham saat ini
 * @param totalEquity - Total Ekuitas Perusahaan (dari Neraca)
 * @param totalShares - Jumlah Total Saham yang Beredar
 * @returns Nilai PBV
 */
export function calculatePBV(stockPrice: number, totalEquity: number, totalShares: number): number {
    if (totalShares === 0 || totalEquity === 0) return 0;
    const bookValuePerShare = totalEquity / totalShares;
    return stockPrice / bookValuePerShare;
}

/**
 * Mengolah dan mengelompokkan alokasi distribusi pemegang saham
 * @param shareholders - Array objek pemegang saham dari data JSON
 * @returns Objek yang berisi data untuk visualisasi pie chart
 */
export function calculateShareholderDistribution(shareholders: Shareholder[]) {
    // Kategori utama untuk pie chart
    const distribution = {
        'Pengendali': { count: 0, percentage: 0 },
        'Masyarakat': { count: 0, percentage: 0 },
        'Direksi & Komisaris': { count: 0, percentage: 0 },
        'Lainnya': { count: 0, percentage: 0 }
    };

    shareholders.forEach(sh => {
        if (sh.Pengendali) {
            distribution['Pengendali'].count += sh.Jumlah;
            distribution['Pengendali'].percentage += sh.Persentase;
        } else if (sh.Kategori.includes('Masyarakat')) {
            distribution['Masyarakat'].count += sh.Jumlah;
            distribution['Masyarakat'].percentage += sh.Persentase;
        } else if (sh.Kategori === 'Direksi' || sh.Kategori === 'Komisaris') {
            distribution['Direksi & Komisaris'].count += sh.Jumlah;
            distribution['Direksi & Komisaris'].percentage += sh.Persentase;
        } else {
             // Mengelompokkan sisanya seperti Afiliasi, Saham Treasury, dll.
            distribution['Lainnya'].count += sh.Jumlah;
            distribution['Lainnya'].percentage += sh.Persentase;
        }
    });

    return distribution;
}


// // --- 3. Contoh Penggunaan ---

// // Anggap 'jsonData' adalah hasil parse dari file GetCompanyProfilesDetail.json
// const jsonData: CompanyData = /* ... data JSON Anda di sini ... */;

// // A. Mengolah Alokasi Distribusi (Bisa langsung dilakukan)
// const shareholderData = calculateShareholderDistribution(jsonData.PemegangSaham);
// console.log("Alokasi Distribusi Saham:");
// console.log(shareholderData);

// // B. Menghitung Fundamental (Membutuhkan data eksternal)
// // Anda perlu mendapatkan data ini dari laporan keuangan dan market data
// const labaBersihTahunan = 1000000000000; // Contoh: 1 Triliun Rupiah
// const totalEkuitas = 5000000000000;      // Contoh: 5 Triliun Rupiah
// const hargaSaham = 2500;                  // Contoh: Rp 2.500 per lembar
// const totalSahamBeredar = 7787687500;   // Didapat dari penjumlahan atau data resmi

// const eps = calculateEPS(labaBersihTahunan, totalSahamBeredar);
// const roe = calculateROE(labaBersihTahunan, totalEkuitas);
// const peRatio = calculatePERatio(hargaSaham, eps);
// const pbv = calculatePBV(hargaSaham, totalEkuitas, totalSahamBeredar);

// console.log(`\n--- Analisis Fundamental (Contoh) ---`);
// console.log(`EPS: ${eps.toFixed(2)}`);
// console.log(`ROE: ${roe.toFixed(2)}%`);
// console.log(`PE Ratio: ${peRatio.toFixed(2)}x`);
// console.log(`PBV: ${pbv.toFixed(2)}x`);