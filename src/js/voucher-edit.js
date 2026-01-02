const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function getVoucherIdFromUrl(){
    const urlParams = new URLSearchParams(window.location.search);
    const voucherId = urlParams.get('id');
    
    if (!voucherId) {
        await showAlert('ID voucher tidak ditemukan!', 'error');
        window.location.href = '/voucher-catalog.html';
        return null;
    }
    
    return voucherId;
}

async function fetchVoucherData(voucherId) {
    try {
        const { data, error } = await supabaseClient
            .from('voucher')
            .select('*')
            .eq('voucher_id', voucherId)
            .single();
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error fetching voucher data:', error);
        await showAlert('Gagal memuat data voucher.', 'error');
        return null;
    }
}

function populateForm(voucherData) {
    document.getElementById('catalog_id').value = voucherData.voucher_id;
    document.getElementById('resto_id').value = voucherData.resto_id;
    document.getElementById('nama_voucher').value = voucherData.nama_voucher;
    document.getElementById('stok').value = voucherData.stok;
    document.getElementById('harga').value = voucherData.potongan;
    document.getElementById('minimal').value = voucherData.minimal;
    document.getElementById('expiry_date').value = voucherData.expired_date;
}

async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        const catalogId = document.getElementById('catalog_id').value;
        const namaVoucher = document.getElementById('nama_voucher').value;
        const kuota = parseInt(document.getElementById('stok').value);
        const potonganHarga = parseInt(document.getElementById('harga').value);
        const minimalTransaksi = parseInt(document.getElementById('minimal').value);
        const expiryDate = document.getElementById('expiry_date').value;
        
        if (!namaVoucher.trim() || isNaN(kuota) || kuota < 0 || isNaN(potonganHarga) || potonganHarga <= 0 || !expiryDate) {
            await showAlert('Mohon lengkapi semua field yang wajib!', 'warning');
            return;
        }
        
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;

        const updateData = {
            nama_voucher: namaVoucher,
            stok: kuota,
            potongan: potonganHarga,
            minimal: minimalTransaksi,
            expired_date: expiryDate
        };
        
        console.log('Updating to database...');
        const { data, error } = await supabaseClient
            .from('voucher')
            .update(updateData)
            .eq('voucher_id', catalogId);
        
        if (error) throw error;
        
        await showAlert('Voucher berhasil diupdate!', 'success');
        
        window.location.href = '/voucher-catalog.html';
        
    } catch (error) {
        console.error('Error submitting form:', error);
        await showAlert('Gagal menambahkan voucher. Silakan coba lagi.', 'error');
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Tambah';
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Voucher edit form page loaded');
    
    const voucherId = await getVoucherIdFromUrl();
    if (!voucherId) return;
    
    // Fetch existing data
    const voucherData = await fetchVoucherData(voucherId);
    if (!voucherData) {
        await showAlert('Data voucher tidak ditemukan!', 'error');
        window.location.href = '/voucher-catalog.html';
        return;
    }
    
    populateForm(voucherData);
    
    const form = document.getElementById('foodForm');
    form.addEventListener('submit', handleSubmit);
});
