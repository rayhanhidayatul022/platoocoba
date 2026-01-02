const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRestaurant = null;
let allMenuItems = [];
let cart = {}; // { itemId: quantity }

// Get restaurant ID from URL
const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('URL params:', window.location.search);
    console.log('Restaurant ID from URL:', restaurantId);
    
    if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
        console.error('Invalid restaurant ID:', restaurantId);
        showNotification('ID restoran tidak valid', 'error');
        setTimeout(() => window.location.href = '/dashboard-pembeli.html', 2000);
        return;
    }

    // Setup event listeners FIRST (before loading menu)
    setupEventListeners();
    
    await loadRestaurantInfo();
    await loadMenuItems();
});

function setupEventListeners() {
    // Event delegation untuk semua button di menu grid
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const action = target.getAttribute('data-action');
        const itemIdStr = target.getAttribute('data-id');
        
        console.log('Button clicked:', action, 'data-id attribute:', itemIdStr);
        console.log('Button element:', target);
        console.log('All button attributes:', target.attributes);
        
        if (!itemIdStr) {
            console.error('No data-id attribute found on button');
            return;
        }
        
        const itemId = parseInt(itemIdStr);
        
        if (isNaN(itemId)) {
            console.error('Invalid item ID (NaN):', itemIdStr);
            return;
        }
        
        console.log('Parsed itemId:', itemId, 'type:', typeof itemId);
        
        switch(action) {
            case 'add':
                addToCart(itemId);
                break;
            case 'increase':
                increaseQuantity(itemId);
                break;
            case 'decrease':
                decreaseQuantity(itemId);
                break;
            default:
                console.warn('Unknown action:', action);
        }
    });
}

async function loadRestaurantInfo() {
    try {
        const { data, error } = await supabaseClient
            .from('restoran')
            .select('*')
            .eq('id_penjual', restaurantId)
            .single();

        if (error) throw error;

        if (!data) {
            showNotification('Restoran tidak ditemukan', 'error');
            setTimeout(() => window.history.back(), 2000);
            return;
        }

        currentRestaurant = data;
        displayRestaurantInfo(data);
    } catch (error) {
        console.error('Error loading restaurant:', error);
        showNotification('Gagal memuat informasi restoran', 'error');
    }
}

function displayRestaurantInfo(restaurant) {
    const rating = restaurant.rate ? restaurant.rate.toFixed(1) : '0.0';
    
    // Navbar
    document.getElementById('restaurantName').textContent = restaurant.nama_restoran;
    document.getElementById('restaurantRating').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" style="vertical-align: middle; margin-right: 4px;">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        ${rating}`;
    document.getElementById('restaurantAddress').textContent = truncateText(restaurant.alamat, 30);

    // Header
    document.getElementById('headerName').textContent = restaurant.nama_restoran;
    document.getElementById('headerRating').innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFD700" style="vertical-align: middle; margin-right: 4px;">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        ${rating}`;
    document.getElementById('headerPhone').innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
        </svg>
        ${restaurant.nomor_telepon}`;

    // Set header background if photo available
    if (restaurant.foto_url && restaurant.foto_url.trim() !== '') {
        const headerImage = document.getElementById('headerImage');
        headerImage.style.backgroundImage = `url('${restaurant.foto_url}')`;
        headerImage.classList.add('has-photo');
    }
}

async function loadMenuItems() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const menuGrid = document.getElementById('menuGrid');

    try {
        console.log('=== DEBUG MENU LOADING ===');
        console.log('Raw restaurant ID from URL:', restaurantId);
        console.log('Type:', typeof restaurantId);
        
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';
        menuGrid.innerHTML = '';

        // First, check if catalog table has ANY data
        console.log('Test 1: Checking if catalog table has any data...');
        const { data: allCatalog, error: allError } = await supabaseClient
            .from('catalog')
            .select('*')
            .eq('is_aktif', true);
        
        console.log('All catalog data:', allCatalog);
        console.log('Total items in catalog:', allCatalog?.length || 0);
        
        if (allCatalog && allCatalog.length > 0) {
            console.log('Sample item structure:', allCatalog[0]);
            console.log('Available resto_id values:', [...new Set(allCatalog.map(item => item.resto_id))]);
        }

        // Convert to integer for database query
        const restoId = parseInt(restaurantId, 10);
        
        if (isNaN(restoId)) {
            throw new Error('Restaurant ID is not a valid number');
        }
        
        console.log('Test 2: Parsed resto_id:', restoId, '(type:', typeof restoId, ')');

        // Try to fetch specific restaurant's menu
        console.log('Test 3: Fetching menu for resto_id =', restoId);
        
        const { data: menuItems, error } = await supabaseClient
            .from('catalog')
            .select('*')
            .eq('resto_id', restoId)
            .eq('is_aktif', true);

        console.log('=== QUERY RESULT ===');
        console.log('Error:', error);
        console.log('Data:', menuItems);
        console.log('Number of items found:', menuItems?.length || 0);
        
        // Debug: Check if items have ID
        if (menuItems && menuItems.length > 0) {
            console.log('First item structure:', menuItems[0]);
            console.log('First item ID:', menuItems[0].id, 'type:', typeof menuItems[0].id);
        }

        if (error) {
            console.error('Supabase error object:', JSON.stringify(error, null, 2));
            throw error;
        }

        // Debug: Manual filter to double check
        if (allCatalog) {
            const manualFilter = allCatalog.filter(item => item.resto_id == restoId || item.resto_id === restoId);
            console.log('Manual filter result (using ==):', manualFilter.length, 'items');
            if (manualFilter.length > 0) {
                console.log('Manual filter found items:', manualFilter);
            }
        }

        allMenuItems = menuItems || [];
        loadingState.style.display = 'none';

        if (allMenuItems.length === 0) {
            console.warn('⚠️ No menu items found for resto_id:', restoId);
            console.warn('Please check:');
            console.warn('1. Does resto_id', restoId, 'exist in catalog table?');
            console.warn('2. Is the column name exactly "resto_id" (case-sensitive)?');
            console.warn('3. Are there any RLS policies blocking the query?');
            emptyState.style.display = 'block';
        } else {
            console.log('✅ Successfully loaded', allMenuItems.length, 'menu items');
            console.log('Menu items:', allMenuItems);
            displayMenuItems(allMenuItems);
        }
    } catch (error) {
        console.error('❌ Error loading menu:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        loadingState.style.display = 'none';
        emptyState.style.display = 'block';
        showNotification('Gagal memuat menu: ' + error.message, 'error');
    }
}

function displayMenuItems(items) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';

    items.forEach(item => {
        const card = createMenuCard(item);
        menuGrid.appendChild(card);
    });
}

function createMenuCard(item) {
    console.log('Creating card for item:', JSON.stringify(item));
    
    // CRITICAL: Check if item has ID
    if (!item || !item.id) {
        console.error('Item has no ID!', item);
        // Try to use alternative ID field if available
        if (item && item.catalog_id) {
            console.warn('Using catalog_id as fallback:', item.catalog_id);
            item.id = item.catalog_id;
        } else {
            console.error('Cannot create card without ID');
            return document.createElement('div'); // Return empty div
        }
    }
    
    const itemId = item.id;
    console.log('Creating card for itemId:', itemId, 'name:', item.nama_makanan);
    
    const card = document.createElement('div');
    card.setAttribute('data-item-id', itemId);
    
    // Check stock status
    const stok = item.stok || 0;
    const isAvailable = stok > 0;
    
    // Check if this item is in cart
    const itemQty = getItemQuantity(itemId);
    
    // Check if cart has other item (for inactive state)
    const cartItemIds = Object.keys(cart).filter(id => cart[id] > 0);
    const isInCart = cartItemIds.includes(String(itemId));
    const hasOtherItem = cartItemIds.length > 0 && !isInCart;
    
    // Add classes - produk lain jadi inactive kalau sudah ada yang dipilih
    let cardClass = 'menu-card';
    if (!isAvailable) cardClass += ' inactive';
    if (hasOtherItem) cardClass += ' inactive disabled';
    
    card.className = cardClass;

    // Food/drink emojis
    const emojis = ['🍕', '🍔', '🍜', '🍱', '🍝', '🥘', '🍛', '🍲', '🥗', '🍖', '🍗', '🥙', '🌮', '🌯', '🥪', '🍰', '🧁', '🍩', '☕', '🧃'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Check for photo - try multiple possible field names
    const photoUrl = item.foto_menu || item.photo_url || item.image_url || item.foto || '';
    const hasPhoto = photoUrl && photoUrl.trim() !== '';
    
    console.log(`Item ${itemId} photo:`, photoUrl, 'hasPhoto:', hasPhoto);
    
    const price = formatRupiah(item.harga);
    const originalPrice = item.harga_asli ? formatRupiah(item.harga_asli) : null;
    const discount = item.harga_asli ? Math.round(((item.harga_asli - item.harga) / item.harga_asli) * 100) : 0;

    card.innerHTML = `
        <div class="menu-card-image ${hasPhoto ? 'has-photo' : ''}" data-emoji="${randomEmoji}">
            ${hasPhoto 
                ? `<img src="${photoUrl}" 
                       alt="${item.nama_makanan || 'Menu'}" 
                       crossorigin="anonymous"
                       onerror="handleImageError(this, '${randomEmoji}')"
                       onload="console.log('✅ Image loaded:', '${item.nama_makanan}');">
                   <span class="emoji-fallback" style="font-size: 4rem; width: 100%; height: 100%; display: none; align-items: center; justify-content: center;">${randomEmoji}</span>`
                : `<span style="font-size: 4rem;">${randomEmoji}</span>`
            }
            ${discount > 0 ? `<div class="menu-badge">🔥 -${discount}%</div>` : ''}
            ${!isAvailable ? '<div class="sold-out-overlay">HABIS</div>' : ''}
        </div>
        <div class="menu-card-content">
            <div class="menu-card-header">
                <h3 class="menu-name">${item.nama_makanan || 'Menu Tanpa Nama'}</h3>
                ${item.deskripsi ? `<p class="menu-description">${item.deskripsi}</p>` : ''}
            </div>
            
            <div class="menu-footer">
                <div>
                    <span class="menu-price">${price}</span>
                    ${originalPrice ? `<span class="original-price">${originalPrice}</span>` : ''}
                </div>
                <div class="quantity-controls" data-item-id="${itemId}">
                    ${isAvailable && !hasOtherItem ? `
                        ${isInCart && itemQty > 0 ? `
                            <button class="btn-qty-control btn-decrease" data-action="decrease" data-id="${itemId}">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M3 8h10" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <span class="qty-display">${itemQty}</span>
                            <button class="btn-qty-control btn-increase" data-action="increase" data-id="${itemId}">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        ` : `
                            <button class="btn-add-simple" data-action="add" data-id="${itemId}">
                                + Tambah
                            </button>
                        `}
                    ` : hasOtherItem ? '<span class="disabled-label">Tidak Dapat Dipilih</span>' : !isAvailable ? '<span class="out-of-stock-label">Tidak Tersedia</span>' : ''}
                </div>
            </div>
        </div>
    `;

    return card;
}

// Cart Management Functions
function getItemQuantity(itemId) {
    // Convert to number untuk konsistensi
    const id = parseInt(itemId);
    return cart[id] || 0;
}

// Update single card quantity display
function updateCardQuantityDisplay(itemId) {
    const controls = document.querySelector(`.quantity-controls[data-item-id="${itemId}"]`);
    if (!controls) {
        console.warn('Controls not found for item:', itemId);
        return;
    }
    
    const item = allMenuItems.find(m => m.id == itemId);
    if (!item) {
        console.warn('Item not found:', itemId);
        return;
    }
    
    const qty = cart[itemId] || 0;
    const stok = item.stok || 0;
    
    if (qty > 0) {
        // Show quantity controls
        controls.innerHTML = `
            <button class="btn-qty-control btn-decrease" data-action="decrease" data-id="${itemId}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 8h10" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <span class="qty-display">${qty}</span>
            <button class="btn-qty-control btn-increase" data-action="increase" data-id="${itemId}" ${qty >= stok ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        `;
    } else {
        // Show add button
        controls.innerHTML = `
            <button class="btn-add-simple" data-action="add" data-id="${itemId}">
                + Tambah
            </button>
        `;
    }
}

// Refresh all cards inactive/active state
function refreshCardsState() {
    const cartItemIds = Object.keys(cart)
        .filter(id => cart[id] > 0)
        .map(id => parseInt(id));
    const hasItemInCart = cartItemIds.length > 0;
    const selectedItemId = hasItemInCart ? cartItemIds[0] : null;
    
    console.log('=== refreshCardsState ===');
    console.log('Cart items:', cartItemIds);
    console.log('Selected item:', selectedItemId);
    console.log('Full cart:', JSON.stringify(cart));
    
    // Update all cards
    document.querySelectorAll('.menu-card').forEach(card => {
        const itemIdStr = card.getAttribute('data-item-id');
        if (!itemIdStr) return;
        
        const itemId = parseInt(itemIdStr);
        if (isNaN(itemId)) return;
        
        const item = allMenuItems.find(m => m.id == itemId);
        if (!item) return;
        
        const isAvailable = (item.stok || 0) > 0;
        const isSelected = itemId === selectedItemId;
        const shouldBeDisabled = hasItemInCart && !isSelected;
        
        console.log(`Card ${itemId}: available=${isAvailable}, selected=${isSelected}, shouldBeDisabled=${shouldBeDisabled}, stok=${item.stok}`);
        
        // Update card class
        card.className = 'menu-card';
        if (!isAvailable) {
            card.classList.add('inactive');
        }
        if (shouldBeDisabled) {
            card.classList.add('inactive', 'disabled');
            console.log(`Disabling card ${itemId}`);
        }
        
        // Update controls di dalam card
        const footer = card.querySelector('.menu-footer');
        const quantityControls = footer?.querySelector('.quantity-controls');
        
        if (quantityControls) {
            if (shouldBeDisabled && isAvailable) {
                // Card disabled karena produk lain sudah dipilih
                quantityControls.innerHTML = '<span class="disabled-label">Tidak Dapat Dipilih</span>';
            } else if (!isAvailable) {
                // Card inactive karena stok habis
                quantityControls.innerHTML = '<span class="out-of-stock-label">Tidak Tersedia</span>';
            } else if (isSelected) {
                // Card ini yang aktif di cart - sudah di-handle oleh updateCardQuantityDisplay
                // Tidak perlu update di sini
            } else {
                // Card available dan tidak ada yang dipilih - tampilkan tombol tambah
                quantityControls.innerHTML = `
                    <button class="btn-add-simple" data-action="add" data-id="${itemId}">
                        + Tambah
                    </button>
                `;
            }
        }
    });
}

function addToCart(itemId) {
    console.log('=== addToCart called ===');
    console.log('itemId:', itemId, 'type:', typeof itemId);
    console.log('Current cart:', JSON.stringify(cart));
    
    // Convert to number untuk konsistensi
    itemId = parseInt(itemId);
    if (isNaN(itemId)) {
        console.error('Invalid itemId:', itemId);
        return;
    }
    
    // CRITICAL: Check if cart already has different item FIRST
    const existingItemIds = Object.keys(cart)
        .filter(id => cart[id] > 0)
        .map(id => parseInt(id));
    
    console.log('Existing items in cart:', existingItemIds);
    
    if (existingItemIds.length > 0 && !existingItemIds.includes(itemId)) {
        showNotification('⚠️ Anda hanya bisa memesan 1 jenis produk', 'error');
        console.log('BLOCKED: Cannot add item', itemId, ', cart already has:', existingItemIds[0]);
        return;
    }
    
    const item = allMenuItems.find(m => m.id == itemId);
    if (!item) {
        console.error('Item not found:', itemId);
        showNotification('Produk tidak ditemukan', 'error');
        return;
    }

    // Check stock
    if (!item.stok || item.stok <= 0) {
        showNotification('Menu ini sudah habis', 'error');
        return;
    }

    // Add to cart
    cart[itemId] = 1;
    console.log('✅ Item added to cart:', itemId);
    console.log('Cart after add:', JSON.stringify(cart));
    
    // Update UI - refresh card ini dan disable card lainnya
    updateCardQuantityDisplay(itemId);
    refreshCardsState();
    showCheckoutButton();
}

function increaseQuantity(itemId) {
    console.log('=== increaseQuantity called ===');
    console.log('itemId:', itemId, 'type:', typeof itemId);
    
    // Convert to number
    itemId = parseInt(itemId);
    if (isNaN(itemId)) {
        console.error('Invalid itemId:', itemId);
        return;
    }
    
    // Check if this item is in cart
    if (!cart[itemId] || cart[itemId] <= 0) {
        console.error('Item not in cart:', itemId);
        showNotification('Produk tidak ada di keranjang', 'error');
        return;
    }
    
    const item = allMenuItems.find(m => m.id == itemId);
    if (!item) {
        console.error('Item not found:', itemId);
        return;
    }

    const currentQty = cart[itemId] || 0;
    
    if (currentQty >= (item.stok || 0)) {
        showNotification('Stok tidak mencukupi', 'error');
        return;
    }

    cart[itemId] = currentQty + 1;
    console.log('✅ Quantity increased to:', cart[itemId]);
    console.log('Cart after increase:', JSON.stringify(cart));
    
    // Update UI tanpa re-render semua
    updateCardQuantityDisplay(itemId);
    updateCheckoutButton();
}

function decreaseQuantity(itemId) {
    console.log('=== decreaseQuantity called ===');
    console.log('itemId:', itemId, 'type:', typeof itemId);
    
    // Convert to number
    itemId = parseInt(itemId);
    if (isNaN(itemId)) {
        console.error('Invalid itemId:', itemId);
        return;
    }
    
    // Check if this item is in cart
    if (!cart[itemId] || cart[itemId] <= 0) {
        console.error('Item not in cart:', itemId);
        return;
    }
    
    const currentQty = cart[itemId] || 0;
    
    if (currentQty <= 1) {
        delete cart[itemId];
        console.log('✅ Item removed from cart');
        console.log('Cart after removal:', JSON.stringify(cart));
        
        // Update UI tanpa re-render semua
        updateCardQuantityDisplay(itemId);
        refreshCardsState();
        
        // Check if cart is empty
        const remainingItems = Object.keys(cart).filter(id => cart[id] > 0);
        if (remainingItems.length === 0) {
            console.log('Cart is empty, hiding checkout button');
            hideCheckoutButton();
        } else {
            updateCheckoutButton();
        }
    } else {
        cart[itemId] = currentQty - 1;
        console.log('✅ Quantity decreased to:', cart[itemId]);
        console.log('Cart after decrease:', JSON.stringify(cart));
        
        // Update UI tanpa re-render semua
        updateCardQuantityDisplay(itemId);
        updateCheckoutButton();
    }
}

// Checkout Button Functions
function showCheckoutButton() {
    console.log('showCheckoutButton called');
    let checkoutBtn = document.getElementById('floatingCheckoutBtn');
    
    if (!checkoutBtn) {
        console.log('Creating new checkout button');
        checkoutBtn = document.createElement('div');
        checkoutBtn.id = 'floatingCheckoutBtn';
        checkoutBtn.className = 'floating-checkout-btn';
        document.body.appendChild(checkoutBtn);
        console.log('Checkout button created and appended');
    }
    
    updateCheckoutButton();
    checkoutBtn.style.display = 'flex';
    console.log('Checkout button display set to flex');
    setTimeout(() => {
        checkoutBtn.classList.add('show');
        console.log('Show class added');
    }, 10);
}

function hideCheckoutButton() {
    const checkoutBtn = document.getElementById('floatingCheckoutBtn');
    if (checkoutBtn) {
        checkoutBtn.classList.remove('show');
        setTimeout(() => checkoutBtn.style.display = 'none', 300);
    }
}

function updateCheckoutButton() {
    const checkoutBtn = document.getElementById('floatingCheckoutBtn');
    if (!checkoutBtn) return;

    const itemIds = Object.keys(cart).filter(id => cart[id] > 0);
    if (itemIds.length === 0) {
        hideCheckoutButton();
        return;
    }

    const itemId = itemIds[0];
    const item = allMenuItems.find(m => m.id == itemId);
    if (!item) return;

    const qty = cart[itemId];
    const total = item.harga * qty;

    checkoutBtn.innerHTML = `
        <div class="checkout-left">
            <div class="checkout-item-info">
                <div class="checkout-qty-badge">${qty}</div>
                <span class="checkout-item-name">${item.nama_makanan || 'Menu'}</span>
            </div>
            <div class="checkout-item-price">@ ${formatRupiah(item.harga)}</div>
        </div>
        <button class="btn-checkout-main" onclick="proceedToCheckout()">
            <span class="checkout-btn-text">Checkout</span>
            <span class="checkout-total-price">${formatRupiah(total)}</span>
        </button>
    `;
}

function proceedToCheckout() {
    const itemIds = Object.keys(cart).filter(id => cart[id] > 0);
    if (itemIds.length === 0) {
        showNotification('Keranjang kosong', 'error');
        return;
    }

    const itemId = itemIds[0];
    const item = allMenuItems.find(m => m.id == itemId);
    if (!item) return;

    const qty = cart[itemId];

    // Save order to localStorage for checkout page
    const orderData = {
        restaurant: currentRestaurant,
        item: item,
        quantity: qty,
        subtotal: item.harga * qty,
        total: item.harga * qty,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('platoo_pending_order', JSON.stringify(orderData));

    // Redirect to checkout page
    showNotification('Mengalihkan ke halaman pembayaran...', 'success');
    setTimeout(() => {
        window.location.href = '/checkout.html';
    }, 1000);
}

// Handle image loading error
function handleImageError(img, emoji) {
    console.error('❌ Failed to load image:', img.src);
    console.log('Showing emoji fallback:', emoji);
    
    // Hide image
    img.style.display = 'none';
    
    // Show emoji fallback
    const fallback = img.nextElementSibling;
    if (fallback && fallback.classList.contains('emoji-fallback')) {
        fallback.style.display = 'flex';
    } else {
        // Create fallback if not exists
        const container = img.parentElement;
        const emojiSpan = document.createElement('span');
        emojiSpan.style.cssText = 'font-size: 4rem; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
        emojiSpan.textContent = emoji;
        container.appendChild(emojiSpan);
    }
}

function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#FFEBEE' : type === 'success' ? '#E8F5E9' : '#E3F2FD'};
        color: ${type === 'error' ? '#C62828' : type === 'success' ? '#2E7D32' : '#1565C0'};
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('Catalog page loaded successfully!');
