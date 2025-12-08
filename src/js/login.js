const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRole = 'pembeli';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentRole = this.dataset.role;
        
        // Update UI
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update hidden field
        document.getElementById('userRole').value = currentRole;
        
        // Update label text
        const usernameLabel = document.getElementById('usernameLabel');
        if (currentRole === 'penjual') {
            usernameLabel.textContent = 'Nama Restoran';
            document.getElementById('username').placeholder = 'Masukkan nama restoran';
        } else {
            usernameLabel.textContent = 'Username';
            document.getElementById('username').placeholder = 'Masukkan username Anda';
        }
    });
});

// Form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get role from hidden field or currentRole
    const role = document.getElementById('userRole')?.value || currentRole;
    
    // Remove previous messages
    const oldMessages = document.querySelectorAll('.error-message, .success-message');
    oldMessages.forEach(msg => msg.remove());
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('Username dan password harus diisi!', 'error');
        return;
    }
    
    const submitBtn = this.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Login...';
    
    try {
        if (role === 'pembeli') {
            await loginPembeli(username, password);
        } else {
            await loginPenjual(username, password);
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

async function loginPembeli(username, password) {
    // Cek apakah username ada
    const { data: checkUser } = await supabase
        .from('pembeli')
        .select('*')
        .eq('username', username)
        .single();
    
    if (!checkUser) {
        showMessage('Akun tidak ditemukan!', 'error');
        return;
    }
    
    // Cek password
    const { data, error } = await supabase
        .from('pembeli')
        .select('*')
        .eq('username', username)
        .eq('password', password) // CATATAN: Di production, gunakan hashing!
        .single();
    
    if (error || !data) {
        showMessage('Password salah!', 'error');
        return;
    }
    
    // Simpan data user ke localStorage
    localStorage.setItem('platoo_user', JSON.stringify({
        id: data.id_pembeli,
        nama: data.nama,
        username: data.username,
        role: 'pembeli'
    }));
    
    showMessage('Login berhasil! Mengalihkan...', 'success');
    
    // Redirect ke dashboard pembeli
    setTimeout(() => {
        window.location.href = '/dashboard-pembeli.html';
    }, 1500);
}

async function loginPenjual(namaRestoran, password) {
    // Cek apakah restoran ada
    const { data: checkRestoran } = await supabase
        .from('restoran')
        .select('*')
        .eq('nama_restoran', namaRestoran)
        .single();
    
    if (!checkRestoran) {
        showMessage('Akun tidak ditemukan!', 'error');
        return;
    }
    
    // Cek password
    const { data, error } = await supabase
        .from('restoran')
        .select('*')
        .eq('nama_restoran', namaRestoran)
        .eq('password', password) // CATATAN: Di production, gunakan hashing!
        .single();
    
    if (error || !data) {
        showMessage('Password salah!', 'error');
        return;
    }
    
    const userData = {
        id: data.id_penjual,  // Coba kedua kemungkinan
        nama_restoran: data.nama_restoran,
        alamat: data.alamat,
        role: 'penjual'
    };
    
    localStorage.setItem('platoo_user', JSON.stringify(userData));
    localStorage.setItem('resto_id', userData.id);
    
    showMessage('Login berhasil! Mengalihkan...', 'success');
    
    // Redirect ke dashboard penjual
    setTimeout(() => {
        window.location.href = '/dashboard-penjual.html';
    }, 1500);
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const form = document.getElementById('loginForm');
    form.insertBefore(messageDiv, form.firstChild);
}