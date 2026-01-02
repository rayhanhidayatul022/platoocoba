const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allRestaurants = [];
let currentFilter = 'all';

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await loadRestaurants();
    setupEventListeners();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('platoo_user') || '{}');
    
    // Check if user exists and is pembeli
    if (!user || !user.username || user.role !== 'pembeli') {
        console.log('Auth check failed:', user);
        window.location.href = '/login.html';
        return;
    }
    
    console.log('Auth success:', user);
    
    // Set user info
    document.getElementById('userName').textContent = user.nama || user.username || 'Pembeli';
    document.getElementById('welcomeName').textContent = user.nama || user.username || 'Pembeli';
    document.getElementById('userInitial').textContent = (user.nama || user.username || 'P').charAt(0).toUpperCase();
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('platoo_user');
        window.location.href = '/login.html';
    });
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterRestaurants(searchTerm);
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterRestaurants();
        });
    });
    
    // Advanced filter button
    document.getElementById('advancedFilterBtn').addEventListener('click', function() {
        showNotification('Fitur filter lanjutan akan segera hadir!', 'info');
    });
}

async function loadRestaurants() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const restaurantGrid = document.getElementById('restaurantGrid');
    
    try {
        console.log('Loading restaurants...');
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        restaurantGrid.innerHTML = '';
        
        // Fetch restaurants from Supabase
        const { data: restaurants, error } = await supabaseClient
            .from('restoran')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('Supabase response:', { restaurants, error });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        // Sort: Restaurants dengan ads true tampil paling atas, sisanya by id
        allRestaurants = (restaurants || []).sort((a, b) => {
            // Priority 1: ads (true first)
            if (a.ads && !b.ads) return -1;
            if (!a.ads && b.ads) return 1;
            
            // Priority 2: By id_penjual (ascending)
            return a.id_penjual - b.id_penjual;
        });
        
        console.log('Total restaurants loaded:', allRestaurants.length);
        console.log('Ads restaurants:', allRestaurants.filter(r => r.ads).length);
        
        loadingState.style.display = 'none';
        
        if (allRestaurants.length === 0) {
            console.log('No restaurants found, showing empty state');
            emptyState.style.display = 'block';
        } else {
            console.log('Displaying restaurants:', allRestaurants);
            displayRestaurants(allRestaurants);
            updateStats();
        }
        
    } catch (error) {
        console.error('Error loading restaurants:', error);
        loadingState.style.display = 'none';
        emptyState.style.display = 'block';
        showNotification('Gagal memuat data restoran: ' + error.message, 'error');
    }
}

function displayRestaurants(restaurants) {
    const restaurantGrid = document.getElementById('restaurantGrid');
    restaurantGrid.innerHTML = '';
    
    if (restaurants.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    restaurants.forEach(restaurant => {
        const card = createRestaurantCard(restaurant);
        restaurantGrid.appendChild(card);
    });
}

function createRestaurantCard(restaurant) {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    
    // Add special class for ads restaurants
    if (restaurant.ads) {
        card.classList.add('restaurant-card-ads');
    }
    
    card.onclick = () => viewRestaurantCatalog(restaurant.id_penjual);
    
    // Use restaurant photo if available, otherwise use emoji
    const emojis = ['🍕', '🍔', '🍜', '🍱', '🍝', '🥘', '🍛', '🍲', '🥗', '🍖'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const hasPhoto = restaurant.foto_url && restaurant.foto_url.trim() !== '';
    const rating = restaurant.rate ? restaurant.rate.toFixed(1) : '0.0';
    
    card.innerHTML = `
        <div class="card-image ${hasPhoto ? 'has-photo' : ''}">
            ${hasPhoto 
                ? `<img src="${restaurant.foto_url}" alt="${restaurant.nama_restoran}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <span style="display:none;">${randomEmoji}</span>`
                : `<span>${randomEmoji}</span>`
            }
            ${restaurant.ads ? '<div class="ads-badge">Ad</div>' : ''}
            <div class="card-badge">
                ⭐ ${rating}
            </div>
        </div>
        <div class="card-content">
            <div class="card-header">
                <h3 class="card-title">${restaurant.nama_restoran}</h3>
                <div class="card-location">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C5.2 0 3 2.2 3 5c0 3.9 5 11 5 11s5-7.1 5-11c0-2.8-2.2-5-5-5zm0 7.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 2.5 8 2.5s2.5 1.1 2.5 2.5S9.4 7.5 8 7.5z"/>
                    </svg>
                    <span>${truncateText(restaurant.alamat, 35)}</span>
                </div>
            </div>
            <div class="card-info">
                <div class="card-phone">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/>
                    </svg>
                    <span>${restaurant.nomor_telepon}</span>
                </div>
                <button class="card-button" onclick="event.stopPropagation(); viewRestaurantCatalog(${restaurant.id_penjual})">
                    Lihat Menu
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function filterRestaurants(searchTerm = '') {
    let filtered = allRestaurants;
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(restaurant => 
            restaurant.nama_restoran.toLowerCase().includes(searchTerm) ||
            restaurant.alamat.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by category
    if (currentFilter === 'popular') {
        filtered = filtered.filter(restaurant => {
            const rate = restaurant.rate || 0;
            return rate >= 4.5;
        });
    }
    
    // Always sort with Ads restaurants first
    filtered.sort((a, b) => {
        // Priority 1: ads (true first)
        if (a.ads && !b.ads) return -1;
        if (!a.ads && b.ads) return 1;
        
        // Priority 2: For popular filter, sort by rating
        if (currentFilter === 'popular') {
            return (b.rate || 0) - (a.rate || 0);
        }
        
        // Priority 3: Default - by id_penjual
        return a.id_penjual - b.id_penjual;
    });
    
    displayRestaurants(filtered);
}

function updateStats() {
    // Update total restaurants
    document.getElementById('totalRestaurants').textContent = allRestaurants.length;
    updateFilterCounts();
}

function updateFilterCounts() {
    const total = allRestaurants.length;
    const popular = allRestaurants.filter(r => (r.rate || 0) >= 4.5).length;
    
    document.getElementById('countAll').textContent = total;
    document.getElementById('countAvailable').textContent = total;
    document.getElementById('countPopular').textContent = popular;
}

function viewRestaurantCatalog(restaurantId) {
    // Navigate to catalog page with restaurant ID
    window.location.href = `catalog.html?id=${restaurantId}`;
}

function showNotification(message, type = 'info') {
    // Simple notification (you can make it more fancy)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#fee' : '#efe'};
        color: ${type === 'error' ? '#c33' : '#3c3'};
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('Dashboard Pembeli loaded successfully!');
