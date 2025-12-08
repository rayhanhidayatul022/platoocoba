const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let restaurantId = null;
let allOrders = [];
let currentPage = 1;
const ORDERS_PER_PAGE = 20;

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

    // Load all orders
    await loadOrders();

    // Setup pagination buttons
    document.getElementById('prevBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(1));
});

// Load orders from database
async function loadOrders() {
    const grid = document.getElementById('ordersGrid');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    grid.innerHTML = '<div class="loading">Loading orders...</div>';
    emptyState.style.display = 'none';
    pagination.style.display = 'none';

    try {
        // Load orders for logged-in restaurant only
        const { data: orders, error } = await supabase
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
            .order('order_id', { ascending: false });

        if (error) throw error;

        // Filter orders by restaurant ID
        const filteredOrders = (orders || []).filter(order => 
            order.catalog && order.catalog.resto_id === restaurantId
        );

        // Store all orders
        allOrders = filteredOrders;

        // Display orders
        if (allOrders.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        displayOrdersPage();
        pagination.style.display = 'flex';

    } catch (error) {
        console.error('Error loading orders:', error);
        grid.innerHTML = '<div class="loading">Failed to load orders: ' + error.message + '</div>';
    }
}

// Display orders for current page
function displayOrdersPage() {
    const grid = document.getElementById('ordersGrid');
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    const ordersToDisplay = allOrders.slice(startIndex, endIndex);

    grid.innerHTML = ordersToDisplay.map(order => {
        const statusClass = order.status_pesanan ? order.status_pesanan.toLowerCase().replace(/\s+/g, '-') : 'unknown';
        const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : '';

        return `
            <div class="order-card" onclick="goToManageOrder(${order.order_id})">
                <div class="order-image">
                    <img src="${order.catalog?.foto || 'https://via.placeholder.com/320x200'}"
                         alt="${order.catalog?.nama_makanan || 'Food'}"
                         onerror="this.src='https://via.placeholder.com/320x200?text=No+Image'">
                </div>
                <div class="order-content">
                    <div class="order-header">
                        <div class="order-id">Order #${order.order_id}</div>
                        ${orderDate ? `<div class="order-date">${orderDate}</div>` : ''}
                    </div>
                    <div class="order-info">
                        <div class="food-name">${order.catalog?.nama_makanan || 'Unknown Item'}</div>
                        <div class="order-details">Quantity: ${order.jumlah || 0}x</div>
                        <div class="order-details">@ Rp ${(order.catalog?.harga || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="order-price">
                        Total: Rp ${(order.total_harga || 0).toLocaleString('id-ID')}
                    </div>
                    <div class="order-footer">
                        <span class="status-badge ${statusClass}">
                            ${order.status_pesanan || 'Unknown'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(allOrders.length / ORDERS_PER_PAGE);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(allOrders.length / ORDERS_PER_PAGE);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayOrdersPage();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Navigate to manage order page
function goToManageOrder(orderId) {
    window.location.href = `manage-orders.html?orderId=${orderId}`;
}

// Make function available globally
window.goToManageOrder = goToManageOrder;
