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
        const { data, error } = await supabaseClient
            .from('catalog')
            .select('*')
            .eq('resto_id', restoId);
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('Error fetching catalog:', error);
        await showAlert('Gagal memuat data katalog. Silakan refresh halaman.', 'error');
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
                    Belum ada makanan di katalog. Klik "Tambah Makanan Baru" untuk mulai.
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
    
    const formattedPrice = item.harga.toLocaleString('id-ID');
    const isActive = item.is_aktif !== false; // default true if not set
    const statusClass = isActive ? 'active' : 'inactive';
    const statusText = isActive ? 'Aktif' : 'Nonaktif';
    
    // Add opacity to row if inactive
    if (!isActive) {
        tr.style.opacity = '0.5';
    }
    
    tr.innerHTML = `
        <td style="width:120px;">
            <img src="${item.foto}" alt="${item.nama_makanan}" 
                 style="width:100px;height:70px;object-fit:cover;border-radius:8px;"
                 onerror="this.src='../img/placeholder-food.png'">
        </td>
        <td>${item.nama_makanan}</td>
        <td>${item.stok}</td>
        <td>${formattedPrice}</td>
        <td class="actions">
            <div class="action-buttons">
                <a href="food-edit.html?id=${item.catalog_id}" class="btn-edit" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </a>
                <button class="btn-toggle ${statusClass}" title="${statusText}" onclick="handleToggleStatus(${item.catalog_id}, '${item.nama_makanan}', ${isActive})">
                    ${isActive ? 
                        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>` : 
                        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>`
                    }
                </button>
            </div>
        </td>
    `;
    
    return tr;
}


async function handleToggleStatus(catalogId, namaItem, currentStatus) {
    const newStatus = !currentStatus;
    const action = newStatus ? 'mengaktifkan' : 'menonaktifkan';
    
    const confirmed = await showConfirm(
        `Yakin ingin ${action} "${namaItem}"?`,
        'Ubah Status Makanan'
    );
    if (!confirmed) return;
    
    try {
        const { error } = await supabaseClient
            .from('catalog')
            .update({ is_aktif: newStatus })
            .eq('catalog_id', catalogId);
            
        if (error) throw error;
        
        const statusText = newStatus ? 'diaktifkan' : 'dinonaktifkan';
        await showAlert(`Makanan berhasil ${statusText}!`, 'success');
        await loadCatalog();
        
    } catch (error) {
        console.error('Error toggling status:', error);
        await showAlert('Gagal mengubah status makanan. Silakan coba lagi.', 'error');
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
