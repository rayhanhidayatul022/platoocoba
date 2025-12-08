const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let restaurantId = null;
let currentOrderId = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    // Get logged in restaurant from localStorage or session
    const loggedInRestaurant = localStorage.getItem('loggedInRestaurant');

    if (!loggedInRestaurant) {
        // TEMPORARY: For testing/display purposes
        console.warn('No restaurant logged in. Using demo mode');
        restaurantId = 1; // Demo mode
    } else {
        const restaurant = JSON.parse(loggedInRestaurant);
        restaurantId = restaurant.id_restoran;
    }

    // Get orderId from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentOrderId = urlParams.get('orderId');

    if (!currentOrderId) {
        alert('Order ID not specified');
        window.location.href = '/display-orders.html';
        return;
    }

    // Load single order
    await loadOrder();
});

// Load single order from database
async function loadOrder() {
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');

    container.innerHTML = '<div class="loading">Loading order...</div>';
    emptyState.style.display = 'none';

    try {
        // Load single order by ID
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                catalog:catalog_id (
                    nama_makanan,
                    harga,
                    resto_id,
                    foto
                )
            `)
            .eq('order_id', currentOrderId)
            .single();

        if (error) throw error;

        // Verify order belongs to logged-in restaurant
        if (!order || !order.catalog || order.catalog.resto_id !== restaurantId) {
            container.innerHTML = '<div class="message error">Order not found or you do not have permission to view this order.</div>';
            setTimeout(() => {
                window.location.href = '/display-orders.html';
            }, 2000);
            return;
        }

        displayOrderDetail(order);

    } catch (error) {
        console.error('Error loading order:', error);
        container.innerHTML = '<div class="message error">Failed to load order: ' + error.message + '</div>';
    }
}

// Display single order detail
function displayOrderDetail(order) {
    const container = document.getElementById('ordersContainer');
    const statusClass = order.status_pesanan.toLowerCase().replace(/\s+/g, '-');

    container.innerHTML = `
        <div class="order-card">
            <div class="order-content-wrapper">
                <div class="order-image">
                    <img src="${order.catalog?.foto || 'https://via.placeholder.com/150'}"
                         alt="${order.catalog?.nama_makanan || 'Food'}"
                         onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                </div>

                <div class="order-details">
                    <div class="order-header">
                        <div class="order-info">
                            <h3>Order #${order.order_id}</h3>
                            <div class="order-meta">
                                <span>👤 Customer #${order.id_pembeli || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="order-body">
                        <div class="item-name">${order.catalog?.nama_makanan || 'Item'}</div>
                        <div class="item-details">Jumlah: ${order.jumlah}x @ Rp ${(order.catalog?.harga || 0).toLocaleString('id-ID')}</div>
                        <div class="item-total">
                            <strong>Total: Rp ${(order.total_harga || 0).toLocaleString('id-ID')}</strong>
                        </div>
                    </div>

                    <div class="order-status-section">
                        <label>Status Pesanan:</label>
                        <select class="status-select ${statusClass}" id="status-select-${order.order_id}" data-order-id="${order.order_id}" data-original="${order.status_pesanan}">
                            <option value="Sedang Diproses" ${order.status_pesanan === 'Sedang Diproses' ? 'selected' : ''}>
                                Sedang Diproses
                            </option>
                            <option value="Siap Diambil" ${order.status_pesanan === 'Siap Diambil' ? 'selected' : ''}>
                                Siap Diambil
                            </option>
                            <option value="Selesai" ${order.status_pesanan === 'Selesai' ? 'selected' : ''}>
                                Selesai
                            </option>
                        </select>
                        <button class="btn-save-status" id="btn-save-${order.order_id}" onclick="saveStatusChange(${order.order_id})" style="display: none;">
                            💾 Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add event listener to dropdown
    setTimeout(() => {
        const selectElement = document.getElementById(`status-select-${order.order_id}`);
        if (selectElement) {
            selectElement.addEventListener('change', function() {
                const btnSave = document.getElementById(`btn-save-${order.order_id}`);
                const originalStatus = this.dataset.original;
                if (this.value !== originalStatus) {
                    btnSave.style.display = 'block';
                } else {
                    btnSave.style.display = 'none';
                }
            });
        }
    }, 100);
}

// Save status change
async function saveStatusChange(orderId) {
    const selectElement = document.getElementById(`status-select-${orderId}`);
    const newStatus = selectElement.value;
    const btnSave = document.getElementById(`btn-save-${orderId}`);
    
    try {
        btnSave.disabled = true;
        btnSave.textContent = '⏳ Menyimpan...';

        const { error } = await supabase
            .from('orders')
            .update({ status_pesanan: newStatus })
            .eq('order_id', orderId);

        if (error) throw error;

        showMessage(`Status pesanan berhasil diubah menjadi "${newStatus}"`, 'success');
        
        // Update original status
        selectElement.dataset.original = newStatus;
        btnSave.style.display = 'none';
        btnSave.disabled = false;
        btnSave.textContent = '💾 Simpan Perubahan';

        // Reload order after short delay
        setTimeout(() => {
            loadOrder();
        }, 1000);

    } catch (error) {
        console.error('Error updating status:', error);
        showMessage('Gagal mengubah status pesanan: ' + error.message, 'error');
        btnSave.disabled = false;
        btnSave.textContent = '💾 Simpan Perubahan';
    }
}

// Show message
function showMessage(message, type) {
    const container = document.getElementById('ordersContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    container.insertBefore(messageDiv, container.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Make MengupdateStatusPemesanan available globally
window.MengupdateStatusPemesanan = MengupdateStatusPemesanan;
