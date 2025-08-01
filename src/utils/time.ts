export function time() {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();

    return {
        date: `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`,
        time: today.toLocaleTimeString(),
        timestamp: today.getTime(),
        day: today.getDay(),
        month: months[today.getMonth()],
        hour: today.getHours(),
        year: today.getFullYear(),
        localeDay: days[today.getDay()],
        localeMonth: months[today.getMonth()],
    }
}