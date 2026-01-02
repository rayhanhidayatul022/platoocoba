const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let orderData = null;
let orderIds = [];
let paymentMethod = 'cash'; // default

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check and display email result
    checkEmailResult();
    
    await loadOrderStatus();
    
    // Setup refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadOrderStatus();
        showNotification('Status pesanan diperbarui', 'success');
    });
});

// Check email sending result
function checkEmailResult() {
    const emailResult = localStorage.getItem('platoo_last_email_result');
    if (emailResult) {
        try {
            const result = JSON.parse(emailResult);
            console.log('='.repeat(60));
            console.log('📧 EMAIL NOTIFICATION RESULT');
            console.log('='.repeat(60));
            console.log('Status:', result.sent ? '✅ Email terkirim' : '❌ Email gagal terkirim');
            console.log('Order ID:', result.orderId);
            console.log('User Email:', result.userEmail || 'N/A');
            console.log('Email Service Loaded:', result.emailServiceLoaded ? 'Yes' : 'No');
            if (result.error) {
                console.log('Error:', result.error);
            }
            console.log('Timestamp:', new Date(result.timestamp).toLocaleString('id-ID'));
            console.log('='.repeat(60));
            
            // Don't clear yet - keep for debugging
            // localStorage.removeItem('platoo_last_email_result');
        } catch (error) {
            console.error('Error parsing email result:', error);
        }
    } else {
        console.log('ℹ️ No email notification sent (or not from cash payment)');
    }
    
    // Check voucher update result
    const voucherResult = localStorage.getItem('platoo_last_voucher_result');
    if (voucherResult) {
        try {
            const result = JSON.parse(voucherResult);
            console.log('\n' + '='.repeat(60));
            console.log('🎟️ VOUCHER UPDATE RESULT');
            console.log('='.repeat(60));
            console.log('Status:', result.updated ? '✅ Voucher stok berhasil dikurangi' : '❌ Voucher stok GAGAL dikurangi');
            console.log('Voucher ID:', result.voucherId);
            console.log('Voucher Name:', result.voucherName);
            console.log('Payment Method:', result.paymentMethod);
            if (result.error) {
                console.log('Error:', result.error);
            }
            console.log('Timestamp:', new Date(result.timestamp).toLocaleString('id-ID'));
            console.log('='.repeat(60));
            
            // Don't clear yet - keep for debugging
            // localStorage.removeItem('platoo_last_voucher_result');
        } catch (error) {
            console.error('Error parsing voucher result:', error);
        }
    } else {
        console.log('ℹ️ No voucher was used in this order');
    }
}

function goToRestaurant() {
    if (!orderData || !orderData.restaurant) {
        console.error('No restaurant data available');
        window.location.href = '/dashboard-pembeli.html';
        return;
    }

    // Redirect ke catalog page dengan restaurant ID di URL
    const restaurantId = orderData.restaurant.id_penjual;
    console.log('Redirecting to restaurant:', restaurantId);
    
    // Redirect dengan restaurant ID di URL params (catalog.js membaca dari URL)
    window.location.href = `catalog.html?id=${restaurantId}`;
}

async function loadOrderStatus() {
    try {
        // Get order IDs from URL parameter or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const orderIdParam = urlParams.get('orderId') || urlParams.get('order');
        const paymentParam = urlParams.get('payment');
        
        console.log('URL params:', { orderIdParam, paymentParam, fullUrl: window.location.href });

        // Get payment method from URL or localStorage
        if (paymentParam) {
            paymentMethod = paymentParam;
            // Save to localStorage for future refreshes
            localStorage.setItem('platoo_payment_method_' + orderIdParam, paymentParam);
        } else if (orderIdParam) {
            // Try to get from localStorage
            const savedMethod = localStorage.getItem('platoo_payment_method_' + orderIdParam);
            paymentMethod = savedMethod || 'cash';
        } else {
            paymentMethod = 'cash';
        }

        console.log('Payment method:', paymentMethod);

        if (orderIdParam) {
            // Parse order ID - bisa format ORD-42 atau langsung angka 42
            let numericId;
            if (typeof orderIdParam === 'string' && orderIdParam.includes('ORD-')) {
                numericId = parseInt(orderIdParam.replace('ORD-', ''));
            } else {
                numericId = parseInt(orderIdParam);
            }
            orderIds = [numericId];
            console.log('Parsed order ID:', numericId);
        } else {
            // Fallback: get from localStorage (last order)
            const lastOrder = localStorage.getItem('platoo_last_order');
            if (lastOrder) {
                orderIds = JSON.parse(lastOrder);
            }
        }

        if (!orderIds || orderIds.length === 0) {
            showError('Tidak ada data pesanan');
            return;
        }

        console.log('Loading orders:', orderIds);

        // Fetch orders from database
        const { data: orders, error: ordersError } = await supabaseClient
            .from('orders')
            .select('*')
            .in('order_id', orderIds);

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
            showError('Pesanan tidak ditemukan');
            return;
        }

        console.log('Orders loaded:', orders);

        // Get catalog items
        const catalogIds = orders.map(o => o.catalog_id);
        const { data: catalogItems, error: catalogError } = await supabaseClient
            .from('catalog')
            .select('*')
            .in('catalog_id', catalogIds);

        if (catalogError) throw catalogError;

        // Get restaurant info from first order
        const firstCatalogItem = catalogItems[0];
        const { data: restaurant, error: restoError } = await supabaseClient
            .from('restoran')
            .select('*')
            .eq('id_penjual', firstCatalogItem.resto_id)
            .single();

        if (restoError) console.error('Error loading restaurant:', restoError);

        // Combine data
        orderData = {
            orders: orders,
            items: catalogItems,
            restaurant: restaurant,
            status: orders[0].status_pesanan
        };

        // Render UI
        renderOrderStatus();
    } catch (error) {
        console.error('Error loading order status:', error);
        showError('Gagal memuat status pesanan');
    }
}

function renderOrderStatus() {
    // Update order number
    document.getElementById('orderNumber').textContent = `ORD-${orderIds[0]}`;

    // Update status
    updateStatusDisplay(orderData.status);

    // Update timeline
    updateTimeline(orderData.status);

    // Render restaurant info
    renderRestaurantInfo();

    // Render items
    renderItems();

    // Render payment info
    renderPaymentInfo();

    // Update time ordered
    if (orderData.orders && orderData.orders.length > 0) {
        const orderTime = new Date();
        document.getElementById('timeOrdered').textContent = formatDateTime(orderTime);
    }
}

function updateStatusDisplay(status) {
    const statusMap = {
        'Sedang Diproses': {
            title: 'Sedang Diproses',
            description: 'Pesanan Anda sedang disiapkan oleh restoran',
            icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>`
        },
        'Siap Diambil': {
            title: 'Siap Diambil',
            description: 'Pesanan siap untuk diambil di restoran',
            icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>`
        },
        'Selesai': {
            title: 'Selesai',
            description: 'Pesanan telah selesai. Terima kasih!',
            icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>`
        }
    };

    const statusInfo = statusMap[status] || statusMap['Sedang Diproses'];
    
    document.getElementById('statusTitle').textContent = statusInfo.title;
    document.getElementById('statusDescription').textContent = statusInfo.description;
    
    const iconCircle = document.querySelector('.icon-circle');
    iconCircle.innerHTML = statusInfo.icon;
}

function updateTimeline(status) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const statusOrder = ['Sedang Diproses', 'Siap Diambil', 'Selesai'];
    const currentIndex = statusOrder.indexOf(status);
    
    timelineItems.forEach((item, index) => {
        if (index === 0 || index <= currentIndex + 1) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function renderRestaurantInfo() {
    if (!orderData.restaurant) return;

    const resto = orderData.restaurant;
    const rating = resto.rate ? resto.rate.toFixed(1) : '0.0';
    
    // Check if restaurant has photo
    const hasPhoto = resto.foto_url && resto.foto_url.trim() !== '';
    const emojis = ['🍕', '🍔', '🍜', '🍱', '🍝', '🥘', '🍛', '🍲', '🥗', '🍖'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const imageHtml = hasPhoto
        ? `<img src="${resto.foto_url}" alt="${resto.nama_restoran}" class="restaurant-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="restaurant-image-fallback" style="display:none;">${randomEmoji}</div>`
        : `<div class="restaurant-image-fallback">${randomEmoji}</div>`;

    const html = `
        ${imageHtml}
        <div class="restaurant-details">
            <h4>${resto.nama_restoran || 'Restoran'}</h4>
            <div class="restaurant-meta">
                <p>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    ${resto.alamat || '-'}
                </p>
                <p>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    ${resto.nomor_telepon || '-'}
                </p>
            </div>
            <div class="restaurant-rating">
                ⭐ ${rating}
            </div>
        </div>
    `;

    document.getElementById('restaurantInfo').innerHTML = html;
}

function renderItems() {
    const container = document.getElementById('itemsList');
    let totalPrice = 0;

    const html = orderData.orders.map(order => {
        const item = orderData.items.find(i => i.catalog_id === order.catalog_id);
        if (!item) return '';

        const itemTotal = order.total_harga;
        totalPrice += itemTotal;

        const imageHtml = item.foto 
            ? `<img src="${item.foto}" alt="${item.nama_makanan}" class="item-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="item-image-fallback" style="display:none;">🍽️</div>`
            : `<div class="item-image-fallback">🍽️</div>`;

        return `
            <div class="order-item">
                ${imageHtml}
                <div class="item-info">
                    <h4>${item.nama_makanan}</h4>
                    <p>${order.jumlah}x ${formatCurrency(item.harga)}</p>
                </div>
                <div class="item-price">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Update price summary
    document.getElementById('subtotalAmount').textContent = formatCurrency(totalPrice);
    document.getElementById('totalAmount').textContent = formatCurrency(totalPrice);
}

function renderPaymentInfo() {
    console.log('=== Rendering Payment Info ===');
    console.log('Current payment method:', paymentMethod);
    
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentNoteEl = document.querySelector('.payment-note');
    
    if (!paymentMethodEl || !paymentNoteEl) {
        console.error('Payment elements not found!');
        return;
    }
    
    const paymentMethods = {
        'cash': {
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>`,
            label: 'Tunai saat pengambilan',
            note: 'Pembayaran akan dilakukan saat pengambilan pesanan'
        },
        'virtual_account': {
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>`,
            label: 'Virtual Account',
            note: 'Pembayaran telah berhasil dikonfirmasi melalui Virtual Account'
        },
        'ewallet': {
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>`,
            label: 'QRIS',
            note: 'Pembayaran telah berhasil dikonfirmasi melalui QRIS'
        }
    };
    
    const method = paymentMethods[paymentMethod] || paymentMethods['cash'];
    
    console.log('Selected method config:', method);
    
    paymentMethodEl.innerHTML = `
        ${method.icon}
        <span>${method.label}</span>
    `;
    
    paymentNoteEl.textContent = method.note;
    
    console.log('=== Payment Info Rendered Successfully ===');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDateTime(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Intl.DateTimeFormat('id-ID', options).format(date);
}

function showError(message) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="status-card">
            <div class="status-icon">
                <div class="icon-circle" style="background: #ef4444;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
            </div>
            <h2 class="status-title">Terjadi Kesalahan</h2>
            <p class="status-description">${message}</p>
            <div style="margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="window.location.href='catalog.html'">
                    Kembali ke Katalog
                </button>
            </div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    // Simple notification (you can enhance this)
    console.log(`[${type.toUpperCase()}] ${message}`);
}