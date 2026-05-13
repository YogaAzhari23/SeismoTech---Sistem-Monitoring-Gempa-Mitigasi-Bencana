let map, marker, lastGempaId = "";
let audioEnabled = false;
const siren = document.getElementById('siren');

// Clock Function
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Jakarta'}) + " WIB";
}, 1000);

function toggleAudio() {
    audioEnabled = !audioEnabled;
    document.getElementById('audioBtn').innerText = audioEnabled ? "🔊" : "🔇";
    if(!audioEnabled) siren.pause();
}

function initMap(lat, lng) {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([lat, lng], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        marker = L.circleMarker([lat, lng], { color: '#ef4444', radius: 20, fillOpacity: 0.5 }).addTo(map);
    } else {
        map.flyTo([lat, lng], 7);
        marker.setLatLng([lat, lng]);
    }
}

async function fetchGempaData() {
    try {
        // 1. Fetch Gempa Utama (M 5.0+)
        const resAuto = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
        const dataAuto = await resAuto.json();
        const gempa = dataAuto.Infogempa.gempa;

        // 2. Fetch Riwayat 15 Gempa
        const resList = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');
        const dataList = await resList.json();
        const listGempa = dataList.Infogempa.gempa;

        updateMainUI(gempa);
        updateHistoryTable(listGempa);

    } catch (error) {
        console.error("Data fetch error", error);
    }
}

function updateMainUI(gempa) {
    document.getElementById('mag').innerText = gempa.Magnitude;
    document.getElementById('wilayah').innerText = gempa.Wilayah;
    document.getElementById('dalam').innerText = gempa.Kedalaman;
    document.getElementById('potensi').innerText = gempa.Potensi;
    document.getElementById('koordinat').innerText = gempa.Coordinates;

    const coords = gempa.Coordinates.split(',');
    initMap(parseFloat(coords[0]), parseFloat(coords[1]));

    const card = document.getElementById('main-card');
    const badge = document.getElementById('badge-tsunami');
    
    if (gempa.Potensi.toLowerCase().includes('tsunami')) {
        card.classList.add('danger-pulse');
        badge.innerText = "BAHAYA TSUNAMI";
        badge.className = "text-[10px] px-2 py-0.5 rounded border border-red-500 bg-red-900/30 text-red-500 uppercase font-bold";
        if(audioEnabled) siren.play();
    } else {
        card.classList.remove('danger-pulse');
        badge.innerText = "AMAN DARI TSUNAMI";
        badge.className = "text-[10px] px-2 py-0.5 rounded border border-green-500 bg-green-900/30 text-green-500 uppercase font-bold";
        siren.pause();
    }

    if (lastGempaId !== gempa.Jam && lastGempaId !== "") {
        sendNotification(gempa);
    }
    lastGempaId = gempa.Jam;
}

function updateHistoryTable(list) {
    const table = document.getElementById('historyTable');
    table.innerHTML = "";
    list.forEach(g => {
        const isTsunami = g.Potensi.toLowerCase().includes('tsunami');
        table.innerHTML += `
            <tr class="hover:bg-slate-800/30 transition border-b border-slate-800/50">
                <td class="px-6 py-4 text-slate-400 text-xs">${g.Tanggal}<br>${g.Jam}</td>
                <td class="px-6 py-4"><span class="font-header font-bold text-red-500">${g.Magnitude}</span></td>
                <td class="px-6 py-4 font-semibold">${g.Kedalaman}</td>
                <td class="px-6 py-4 text-slate-300">${g.Wilayah}</td>
                <td class="px-6 py-4">
                    <span class="text-[10px] px-2 py-1 rounded ${isTsunami ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-400'}">
                        ${isTsunami ? '⚠️ TSUNAMI' : 'TIDAK'}
                    </span>
                </td>
            </tr>
        `;
    });
}

function requestNotif() {
    Notification.requestPermission();
}

function sendNotification(gempa) {
    if (Notification.permission === "granted") {
        new Notification("ALERT GEMPA BARU", {
            body: `M ${gempa.Magnitude} - ${gempa.Wilayah}. ${gempa.Potensi}`
        });
    }
}

// Initial Call
fetchGempaData();
// Refresh every minute
setInterval(fetchGempaData, 60000);

// ... (Kode variabel dan fungsi clock yang lama tetap ada)

async function fetchGempaData() {
    try {
        // Cek apakah elemen ada sebelum memproses (untuk menghindari error di halaman yang berbeda)
        const isMainPage = document.getElementById('mag');
        const isHistoryPage = document.getElementById('historyTableFull');

        // Jika di halaman UTAMA
        if (isMainPage) {
            const resAuto = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
            const dataAuto = await resAuto.json();
            updateMainUI(dataAuto.Infogempa.gempa);
        }

        // Jika di halaman RIWAYAT atau butuh update tabel kecil di main page
        if (isHistoryPage || document.getElementById('historyTable')) {
            const resList = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');
            const dataList = await resList.json();
            const listGempa = dataList.Infogempa.gempa;
            
            // Render ke tabel yang sesuai
            if (isHistoryPage) {
                renderTable(listGempa, 'historyTableFull');
            } else {
                renderTable(listGempa, 'historyTable');
            }
        }

    } catch (error) {
        console.error("Gagal mengambil data BMKG:", error);
    }
}

// Fungsi render tabel yang bisa dipakai bersama
function renderTable(list, targetId) {
    const table = document.getElementById(targetId);
    if (!table) return;

    table.innerHTML = "";
    list.forEach(g => {
        const isTsunami = g.Potensi.toLowerCase().includes('tsunami');
        table.innerHTML += `
            <tr class="hover:bg-slate-800/30 transition border-b border-slate-800/50">
                <td class="px-6 py-4 text-slate-400 text-xs">
                    <span class="text-white block font-semibold">${g.Jam}</span>
                    ${g.Tanggal}
                </td>
                <td class="px-6 py-4">
                    <span class="font-header font-bold ${parseFloat(g.Magnitude) >= 6 ? 'text-red-500' : 'text-orange-500'} text-lg">
                        ${g.Magnitude}
                    </span>
                </td>
                <td class="px-6 py-4 font-medium text-slate-300">${g.Kedalaman}</td>
                <td class="px-6 py-4 text-slate-300 leading-relaxed">${g.Wilayah}</td>
                <td class="px-6 py-4">
                    <span class="text-[10px] px-2 py-1 rounded font-bold ${isTsunami ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-500'}">
                        ${isTsunami ? '⚠️ TSUNAMI' : 'TIDAK BERPOTENSI'}
                    </span>
                </td>
            </tr>
        `;
    });
}

// Jalankan fungsi
fetchGempaData();
setInterval(fetchGempaData, 60000);
// --- Logic Survival Kit Checklist ---

const survivalChecks = document.querySelectorAll('#survival-list input[type="checkbox"]');

// Load data saat halaman dibuka
function loadSurvivalData() {
    survivalChecks.forEach(checkbox => {
        const itemName = checkbox.getAttribute('data-item');
        const isChecked = localStorage.getItem('survival_' + itemName) === 'true';
        checkbox.checked = isChecked;
    });
}

// Simpan data setiap kali ada perubahan
survivalChecks.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const itemName = e.target.getAttribute('data-item');
        localStorage.setItem('survival_' + itemName, e.target.checked);
        
        // Feedback visual sederhana
        if (e.target.checked) {
            console.log(`Item ${itemName} siap!`);
        }
    });
});

// Jalankan fungsi load
loadSurvivalData();
let isEmergency = false;

function toggleEmergency() {
    const overlay = document.getElementById('emergency-overlay');
    isEmergency = !isEmergency;
    
    if (isEmergency) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        if(audioEnabled) siren.play();
    } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        siren.pause();
    }
}

// Fitur Pendeteksi Guncangan (Akselerometer)
if ('LinearAccelerationSensor' in window || 'DeviceMotionEvent' in window) {
    window.addEventListener('devicemotion', (event) => {
        const acceleration = event.accelerationIncludingGravity;
        const threshold = 15; // Sensitivitas guncangan

        if (acceleration) {
            const totalAccel = Math.sqrt(acceleration.x**2 + acceleration.y**2 + acceleration.z**2);
            
            if (totalAccel > threshold && !isEmergency) {
                toggleEmergency();
            }
        }
    });
}
let isEmergencyOpen = false;

function toggleEmergency() {
    const overlay = document.getElementById('emergency-overlay');
    isEmergencyOpen = !isEmergencyOpen;
    
    if (isEmergencyOpen) {
        overlay.classList.remove('hidden');
        overlay.classList.add('block');
        // Mencegah background scrolling saat modal terbuka
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('block');
        // Mengembalikan scrolling
        document.body.style.overflow = 'auto';
    }
}
function openEmergency() {
    const page = document.getElementById('emergency-page');
    page.classList.remove('translate-y-full');
    page.classList.add('translate-y-0');
    // Mencegah scroll pada halaman utama saat panduan terbuka
    document.body.style.overflow = 'hidden';
}

function closeEmergency() {
    const page = document.getElementById('emergency-page');
    page.classList.remove('translate-y-0');
    page.classList.add('translate-y-full');
    // Mengembalikan scroll
    document.body.style.overflow = 'auto';
}

// --- FITUR 1: NETWORK MONITOR & AUTO REFRESH TIMER ---
let refreshTimer = 60;

function updateNetworkStatus() {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const pingAnimate = document.getElementById('ping-animate');
    const syncText = document.getElementById('sync-text');

    if (navigator.onLine) {
        statusText.innerText = "SYSTEM ACTIVE";
        statusText.classList.replace('text-red-500', 'text-green-500');
        statusDot.classList.replace('bg-red-500', 'bg-green-500');
        pingAnimate.classList.remove('hidden');
        
        // Jalankan countdown
        refreshTimer--;
        if (refreshTimer <= 0) {
            refreshTimer = 60; // Reset ke 60 detik setelah fetch
            fetchGempaData(); // Panggil fungsi fetch yang sudah ada
        }
        syncText.innerText = `Syncing in ${refreshTimer}s...`;
    } else {
        statusText.innerText = "CONNECTION LOST";
        statusText.classList.replace('text-green-500', 'text-red-500');
        statusDot.classList.replace('bg-green-500', 'bg-red-500');
        pingAnimate.classList.add('hidden');
        syncText.innerText = "Waiting for network...";
    }
}

// Ganti setInterval(fetchGempaData, 60000) yang lama dengan ini:
setInterval(updateNetworkStatus, 1000);