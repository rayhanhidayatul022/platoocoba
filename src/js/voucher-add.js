const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showModal(title, message, type = 'success', showCancel = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalIcon = document.getElementById('modalIcon');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        modalIcon.className = 'modal-icon ' + type;
        
        if (showCancel) {
            modalCancel.style.display = 'block';
        } else {
            modalCancel.style.display = 'none';
        }
        
        modal.classList.add('show');
        
        modalConfirm.onclick = () => {
            modal.classList.remove('show');
            resolve(true);
        };
        
        modalCancel.onclick = () => {
            modal.classList.remove('show');
            resolve(false);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                resolve(false);
            }
        };
    });
}

function showAlert(message, type = 'success') {
    const titles = {
        success: 'Berhasil!',
        error: 'Gagal!',
        warning: 'Peringatan!',
        question: 'Konfirmasi'
    };
    return showModal(titles[type] || 'Informasi', message, type, false);
}

function showConfirm(message, title = 'Konfirmasi') {
    return showModal(title, message, 'question', true);
}

async function getCurrentRestoId() {
    const userData = JSON.parse(localStorage.getItem('platoo_user'));
    const restoId = userData.id;
    
    if (!restoId) {
        await showAlert('Sesi habis atau belum login. Silakan login kembali.', 'warning');
        window.location.href = '/login.html';
        return null;
    }
    
    return restoId;
}

async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        const namaVoucher = document.getElementById('nama_voucher').value;
        const kuota = parseInt(document.getElementById('stok').value);
        const potonganHarga = parseInt(document.getElementById('harga').value);
        const minimalTransaksi = parseInt(document.getElementById('minimal').value);
        const expiryDate = document.getElementById('expiry_date').value;
        
        if (!namaVoucher.trim() || isNaN(kuota) || kuota < 0 || isNaN(potonganHarga) || potonganHarga <= 0 || !expiryDate) {
            await showAlert('Mohon lengkapi semua field yang wajib!', 'warning');
            return;
        }
        
        const restoId = await getCurrentRestoId();
        
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;
        
        console.log('Inserting to database...');
        const { data, error } = await supabase
            .from('voucher')
            .insert([
                {
                    resto_id: restoId,
                    nama_voucher: namaVoucher,
                    stok: kuota,
                    potongan: potonganHarga,
                    minimal: minimalTransaksi,
                    expired_date: expiryDate
                    
                }
            ]);
        
        if (error) throw error;
        
        await showAlert('Voucher berhasil ditambahkan!', 'success');
        
        window.location.href = '/voucher-catalog.html';
        
    } catch (error) {
        console.error('Error submitting form:', error);
        await showAlert('Gagal menambahkan voucher. Silakan coba lagi.', 'error');
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Tambah';
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Voucher form page loaded');
    
    const form = document.getElementById('foodForm');
    form.addEventListener('submit', handleSubmit);
});
