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

async function getCatalogIdFromUrl(){
    const urlParams = new URLSearchParams(window.location.search);
    const catalogId = urlParams.get('id');
    
    if (!catalogId) {
        await showAlert('ID makanan tidak ditemukan!', 'error');
        window.location.href = '/food-catalog.html';
        return null;
    }
    
    return catalogId;
}


async function fetchFoodData(catalogId) {
    try {
        const { data, error } = await supabase
            .from('catalog')
            .select('*')
            .eq('catalog_id', catalogId)
            .single();
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error fetching food data:', error);
        await showAlert('Gagal memuat data makanan.', 'error');
        return null;
    }
}


function populateForm(foodData) {
    document.getElementById('catalog_id').value = foodData.catalog_id;
    document.getElementById('resto_id').value = foodData.resto_id;
    document.getElementById('nama_makanan').value = foodData.nama_makanan;
    document.getElementById('stok').value = foodData.stok;
    document.getElementById('harga').value = foodData.harga;
}

async function uploadImage(file, restoId) {
    try {
        const fileName = `${restoId}_${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
            .from('resto-photos/katalog')
            .upload(fileName, file);
        
        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('resto-photos/katalog')
            .getPublicUrl(fileName);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}


async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        const catalogId = document.getElementById('catalog_id').value;
        const restoId = document.getElementById('resto_id').value;
        const namaMakanan = document.getElementById('nama_makanan').value;
        const stok = parseInt(document.getElementById('stok').value);
        const harga = parseInt(document.getElementById('harga').value);
        const fotoFile = document.getElementById('foto').files[0];
        
        if (!namaMakanan.trim() || isNaN(stok) || stok < 0 || isNaN(harga) || harga <= 0) {
            await showAlert('Mohon lengkapi semua field yang wajib dengan benar!', 'warning');
            return;
        }
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;
        
        const updateData = {
            nama_makanan: namaMakanan,
            stok: parseInt(stok),
            harga: parseInt(harga)
        };
        
        // Debug: cek data yang mau diupdate
        console.log('catalogId:', catalogId);
        console.log('updateData:', updateData);
        
        if (fotoFile) {
            console.log('Uploading new image...');
            const newFotoUrl = await uploadImage(fotoFile, restoId);
            updateData.foto = newFotoUrl;
        }
        
        console.log('Updating database...');
        const { data, error } = await supabase
            .from('catalog')
            .update(updateData)
            .eq('catalog_id', parseInt(catalogId));
        
        console.log('Update result - data:', data, 'error:', error);
        
        if (error) throw error;
        
        await showAlert('Makanan berhasil diupdate!', 'success');

        window.location.href = '/food-catalog.html';
        
    } catch (error) {
        console.error('Error updating food:', error);
        await showAlert('Gagal mengupdate makanan. Silakan coba lagi.', 'error');
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Update';
        submitBtn.disabled = false;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Food edit page loaded');
    
    // Get catalog ID from URL
    const catalogId = await getCatalogIdFromUrl();
    if (!catalogId) return;
    
    // Fetch existing data
    const foodData = await fetchFoodData(catalogId);
    if (!foodData) {
        await showAlert('Data makanan tidak ditemukan!', 'error');
        window.location.href = '/food-catalog.html';
        return;
    }
    
    populateForm(foodData);
    
    // Setup form submit handler
    const form = document.getElementById('foodEditForm');
    form.addEventListener('submit', handleSubmit);
});
