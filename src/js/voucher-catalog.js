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

async function getCurrentUser() {
    const userData = JSON.parse(localStorage.getItem('platoo_user'));
    console.log('userData parsed:', userData);
    const restoId = userData.id;
     
    if (!restoId) {
        await showAlert('Sesi habis atau belum login. Silakan login kembali.', 'warning');
        window.location.href = '/login.html';
        return null;
    }
    
    return restoId;
}


async function fetchCatalogData(restoId) {
    try {
        const { data, error } = await supabase
            .from('voucher')
            .select('*')
            .eq('resto_id', restoId);
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('Error fetching voucher:', error);
        await showAlert('Gagal memuat data voucher. Silakan refresh halaman.', 'error');
        return [];
    }
}


function renderCatalogTable(catalogItems) {
    const tbody = document.querySelector('.table tbody');

    tbody.innerHTML = '';
    
    if (catalogItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px; color:#999;">
                    Belum ada voucher. Klik "Tambah Voucher Baru" untuk mulai.
                </td>
            </tr>
        `;
        return;
    }

    catalogItems.forEach(item => {
        const row = createTableRow(item);
        tbody.appendChild(row);
    });
}


function createTableRow(item) {
    const tr = document.createElement('tr');
    
    const formattedPrice = item.potongan.toLocaleString('id-ID');
    const formattedMinimal = item.minimal.toLocaleString('id-ID');
    
    tr.innerHTML = `
        <td>${item.nama_voucher}</td>
        <td>${formattedPrice}</td>
        <td>${item.stok}</td>
        <td>${formattedMinimal}</td>
        <td>${item.expired_date}</td>
        <td class="actions">
            <div class="action-buttons">
                <a href="voucher-edit.html?id=${item.voucher_id}" class="btn-edit" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </a>
                <button class="btn-delete" title="Hapus" onclick="handleDelete(${item.voucher_id}, '${item.nama_voucher}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}


async function handleDelete(catalogId, namaItem) {
    const confirmed = await showConfirm(
        `Yakin ingin menghapus "${namaItem}" dari katalog?`,
        'Hapus Voucher'
    );
    if (!confirmed) return;
    
    try {
        const { error } = await supabase
            .from('voucher')
            .delete()
            .eq('voucher_id', catalogId);
        if (error) throw error;
        
        await showAlert('Voucher berhasil dihapus!', 'success');
        await loadCatalog();
        
    } catch (error) {
        console.error('Error deleting item:', error);
        await showAlert('Gagal menghapus voucher. Silakan coba lagi.', 'error');
    }
}

async function loadCatalog() {
    try {
        const restoId = await getCurrentUser();
        
        if (!restoId) {
            console.log('User not logged in');
            window.location.href = '/login.html';
            return;
        }
        
        const catalogItems = await fetchCatalogData(restoId);
        
        renderCatalogTable(catalogItems);
        
    } catch (error) {
        console.error('Error loading catalog:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('Catalog page loaded');
    loadCatalog();
});
