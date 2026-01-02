const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let selectedRole = null;

// Role selection
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing event listeners...');

    // Image preview handler
    const fotoInput = document.getElementById('fotoRestoran');
    if (fotoInput) {
        fotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validasi ukuran file (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('Ukuran file terlalu besar! Maksimal 5MB', 'error');
                    this.value = '';
                    return;
                }

                // Validasi tipe file
                if (!file.type.startsWith('image/')) {
                    showMessage('File harus berupa gambar!', 'error');
                    this.value = '';
                    return;
                }

                // Preview gambar
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('imagePreview');
                    const previewImg = document.getElementById('previewImg');
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Only for register.html with role selection
    const roleButtons = document.querySelectorAll('.role-btn');
    if (roleButtons.length > 0) {
        roleButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                selectedRole = this.dataset.role;
                console.log('Role selected:', selectedRole);
                
                // Update UI
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show form
                setTimeout(() => {
                    document.getElementById('roleSelection').style.display = 'none';
                    document.getElementById('registerForm').style.display = 'block';
                    document.getElementById('userRole').value = selectedRole;
                    
                    // Show appropriate form section
                    if (selectedRole === 'pembeli') {
                        document.getElementById('pembeliForm').style.display = 'block';
                        document.getElementById('penjualForm').style.display = 'none';
                    } else {
                        document.getElementById('pembeliForm').style.display = 'none';
                        document.getElementById('penjualForm').style.display = 'block';
                    }
                }, 300);
            });
        });
    }

    // Back button (only in register.html)
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('Back button clicked');
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('roleSelection').style.display = 'block';
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            selectedRole = null;
        });
    }

    // Form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get role from hidden field or selected role
            const role = document.getElementById('userRole')?.value || selectedRole;
            console.log('Form submitted! Role:', role);
            
            // Remove previous messages
            const oldMessages = document.querySelectorAll('.error-message, .success-message');
            oldMessages.forEach(msg => msg.remove());
            
            const submitBtn = this.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mendaftar...';
            
            try {
                if (role === 'pembeli') {
                    console.log('Calling registerPembeli...');
                    await registerPembeli();
                } else {
                    console.log('Calling registerPenjual...');
                    await registerPenjual();
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Terjadi kesalahan: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Daftar';
            }
        });
    }
    
    console.log('All event listeners initialized!');
});

async function registerPembeli() {
    const nama = document.getElementById('nama').value.trim();
    const telepon = document.getElementById('telepon').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    console.log('RegisterPembeli called with:', { nama, telepon, email, username });
    
    // Validasi
    if (!nama || !telepon || !email || !username || !password) {
        showMessage('Semua field harus diisi!', 'error');
        return;
    }
    
    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Format email tidak valid!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Password dan konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password minimal 6 karakter!', 'error');
        return;
    }
    
    if (!validatePhone(telepon)) {
        showMessage('Format nomor telepon tidak valid!', 'error');
        return;
    }
    
    // Cek apakah username atau email sudah ada
    const { data: existingUser } = await supabaseClient
        .from('pembeli')
        .select('username, email')
        .or(`username.eq.${username},email.eq.${email}`)
        .single();
    
    if (existingUser) {
        if (existingUser.username === username) {
            showMessage('Username sudah digunakan!', 'error');
        } else {
            showMessage('Email sudah terdaftar!', 'error');
        }
        return;
    }
    
    // Insert data pembeli
    const { data, error } = await supabaseClient
        .from('pembeli')
        .insert([
            {
                nama: nama,
                nomor_telepon: telepon,
                email: email,
                username: username,
                password: password // CATATAN: Di production, gunakan hashing!
            }
        ])
        .select();
    
    if (error) {
        throw error;
    }
    
    showMessage('Registrasi berhasil! Silakan login.', 'success');
    
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
}

async function registerPenjual() {
    const namaRestoran = document.getElementById('namaRestoran').value.trim();
    const email = document.getElementById('email').value.trim();
    const telepon = document.getElementById('telepon').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const fotoInput = document.getElementById('fotoRestoran');
    const fotoFile = fotoInput ? fotoInput.files[0] : null;

    // Validasi
    if (!namaRestoran || !email || !telepon || !alamat || !password) {
        showMessage('Semua field harus diisi!', 'error');
        return;
    }
    
    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Format email tidak valid!', 'error');
        return;
    }

    if (fotoInput && !fotoFile) {
        showMessage('Foto restoran harus diupload!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Password dan konfirmasi password tidak cocok!', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password minimal 6 karakter!', 'error');
        return;
    }

    if (!validatePhone(telepon)) {
        showMessage('Format nomor telepon tidak valid!', 'error');
        return;
    }

    // Cek apakah nama restoran (username) atau email sudah ada
    const { data: existingRestoran } = await supabaseClient
        .from('restoran')
        .select('nama_restoran, email')
        .or(`nama_restoran.eq.${namaRestoran},email.eq.${email}`)
        .single();

    if (existingRestoran) {
        if (existingRestoran.nama_restoran === namaRestoran) {
            showMessage('Nama restoran sudah digunakan!', 'error');
        } else {
            showMessage('Email sudah terdaftar!', 'error');
        }
        return;
    }

    let fotoUrl = null;

    // Upload foto ke Supabase Storage jika ada
    if (fotoFile) {
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `${namaRestoran.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        const filePath = `restoran/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('resto-photos')
            .upload(filePath, fotoFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            showMessage('Gagal mengupload foto: ' + uploadError.message, 'error');
            return;
        }

        // Dapatkan public URL
        const { data: urlData } = supabaseClient.storage
            .from('resto-photos')
            .getPublicUrl(filePath);

        fotoUrl = urlData.publicUrl;
    }

    // Insert data penjual
    const { data, error } = await supabaseClient
        .from('restoran')
        .insert([
            {
                nama_restoran: namaRestoran,
                email: email,
                nomor_telepon: telepon,
                alamat: alamat,
                password: password, // CATATAN: Di production, gunakan hashing!
                foto_url: fotoUrl
            }
        ])
        .select();

    if (error) {
        throw error;
    }

    showMessage('Registrasi berhasil! Silakan login.', 'success');

    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
}

function validatePhone(phone) {
    // Format Indonesia: 08xxxxxxxxxx (minimal 10 digit)
    const phoneRegex = /^08\d{8,12}$/;
    return phoneRegex.test(phone);
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const form = document.getElementById('registerForm');
    form.insertBefore(messageDiv, form.firstChild);
}