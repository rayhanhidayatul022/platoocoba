const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase initialized for forgot-password');

// Initialize EmailJS
// SETUP EMAILJS (OPSIONAL - untuk email otomatis):
// 1. Daftar di https://www.emailjs.com/ (GRATIS)
// 2. Buat Email Service (pilih Gmail/Outlook/etc)
// 3. Buat Email Template dengan format di SETUP_EMAILJS.md
// 4. Ganti YOUR_EMAILJS_PUBLIC_KEY, YOUR_SERVICE_ID, YOUR_TEMPLATE_ID

// Mode: 'demo' atau 'production'
// - demo: Hanya tampilkan info tanpa kirim email (untuk testing)
// - production: Kirim email otomatis via EmailJS (perlu setup dulu)
const MODE = 'production'; // Ganti ke 'production' setelah setup EmailJS

if (MODE === 'production') {
    (function() {
        emailjs.init("P-lIwcoG_nHWyeym2"); // Ganti dengan public key EmailJS Anda
    })();
}

// Handle form submission
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        showNotification('❌ Username harus diisi!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check pembeli table by username
        let { data: pembeliData, error: pembeliError } = await supabaseClient
            .from('pembeli')
            .select('nama, password, email, username')
            .eq('username', username)
            .single();
        
        if (pembeliError && pembeliError.code !== 'PGRST116') {
            throw pembeliError;
        }
        
        // Check restoran table if not found in pembeli (using nama_restoran as username)
        let userData = pembeliData;
        let userType = 'Pembeli';
        
        if (!userData) {
            let { data: restoranData, error: restoranError } = await supabaseClient
                .from('restoran')
                .select('nama_restoran, password, email')
                .eq('nama_restoran', username)
                .single();
            
            if (restoranError && restoranError.code !== 'PGRST116') {
                throw restoranError;
            }
            
            if (restoranData) {
                userData = {
                    nama: restoranData.nama_restoran,
                    password: restoranData.password,
                    email: restoranData.email,
                    username: restoranData.nama_restoran
                };
                userType = 'Penjual/Restoran';
            }
        }
        
        if (!userData) {
            showLoading(false);
            showNotification('❌ Username tidak ditemukan dalam sistem!', 'error');
            return;
        }
        
        // Validasi apakah email terdaftar
        if (!userData.email) {
            showLoading(false);
            showNotification('❌ Akun ini belum memiliki email terdaftar!', 'error');
            return;
        }
        
        console.log('✅ Data ditemukan:', userData);
        
        // Validasi email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            showLoading(false);
            showNotification('❌ Format email tidak valid: ' + userData.email, 'error');
            return;
        }
        
        // Send email using EmailJS
        const templateParams = {
            to_email: userData.email,    // EmailJS akan kirim ke email ini
            to_name: userData.nama,
            user_password: userData.password,
            reply_to: userData.email      // Tambahan untuk compatibility
        };
        
        console.log('📧 Mengirim email ke:', userData.email);
        console.log('📦 Template params:', templateParams);
        
        if (MODE === 'demo') {
            // Demo mode: Tampilkan success tanpa kirim email (untuk testing)
            console.log('🎯 DEMO MODE - Data yang akan dikirim:', templateParams);
            showLoading(false);
            showSuccessDialog(userData.email, userData.password, userData.nama);
        } else {
            // Production mode: Kirim email via EmailJS
            emailjs.send('service_ffaxznh', 'template_f5unq2x', templateParams)
                .then((response) => {
                    console.log('✅ Email berhasil terkirim!', response);
                    showLoading(false);
                    showSuccessDialog(userData.email, userData.password, userData.nama);
                })
                .catch((error) => {
                    console.error('❌ EmailJS error:', error);
                    showLoading(false);
                    showNotification('❌ Gagal mengirim email: ' + error.text, 'error');
                });
        }
            
    } catch (error) {
        console.error('Error:', error);
        showLoading(false);
        showNotification('❌ Terjadi kesalahan. Silakan coba lagi.', 'error');
    }
});

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Show success dialog
function showSuccessDialog(email, password, nama) {
    const dialog = document.createElement('div');
    dialog.className = 'success-dialog-overlay';
    
    // Tentukan pesan berdasarkan mode
    let messageHTML = '';
    if (MODE === 'demo') {
        // Demo mode: Tampilkan password langsung (untuk testing)
        messageHTML = `
            <div style="background: #FFF3CD; border: 2px solid #FFC107; padding: 15px; border-radius: 12px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-weight: 600; font-size: 14px;">
                    🧪 MODE DEMO (Testing)
                </p>
                <p style="color: #856404; margin: 10px 0 5px 0; font-size: 13px;">
                    <strong>Nama:</strong> ${nama}<br>
                    <strong>Email:</strong> ${email}<br>
                    <strong>Password:</strong> <span style="background: #fff; padding: 3px 8px; border-radius: 5px; font-family: monospace;">${password}</span>
                </p>
                <p style="color: #856404; margin: 5px 0 0 0; font-size: 12px;">
                    ℹ️ Dalam mode production, password akan dikirim ke email.
                </p>
            </div>
        `;
    } else {
        // Production mode: Info email terkirim
        messageHTML = `
            <p>Kami telah mengirimkan password ke email:</p>
            <p class="email-sent"><strong>${email}</strong></p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                Silakan cek inbox atau folder spam Anda.<br>
                Kemudian login menggunakan password tersebut.
            </p>
        `;
    }
    
    dialog.innerHTML = `
        <div class="success-dialog">
            <div class="success-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h2>${MODE === 'demo' ? 'Data Ditemukan! ✅' : 'Password Terkirim! ✉️'}</h2>
            ${messageHTML}
            <button class="btn-close" onclick="window.location.href='login.html'">
                Kembali ke Login
            </button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Trigger animation
    setTimeout(() => dialog.classList.add('show'), 10);
}

console.log('✅ Forgot password page loaded successfully!');
