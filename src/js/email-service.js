// EmailJS Configuration
// Untuk menggunakan EmailJS:
// 1. Daftar di https://www.emailjs.com/
// 2. Buat Email Service (Gmail/Outlook/dll)
// 3. Buat Email Template dengan format:
//    - Template Name: order_confirmation
//    - Variables: {{to_email}}, {{customer_name}}, {{order_id}}, {{restaurant_name}}, 
//                 {{order_items}}, {{total_price}}, {{payment_method}}
// 4. Copy PUBLIC KEY dan masukkan ke EMAILJS_PUBLIC_KEY
// 5. Copy SERVICE ID dan TEMPLATE ID

const EMAILJS_CONFIG = {
    PUBLIC_KEY: '6-9LWZEjdgOc_7cU9', // Public key dari EmailJS
    SERVICE_ID: 'service_i1siuo7', // Service ID dari EmailJS
    TEMPLATE_ID: 'template_qb6hidd', // Template ID dari EmailJS
};

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        console.log('✅ EmailJS initialized successfully');
        console.log('Config:', {
            SERVICE_ID: EMAILJS_CONFIG.SERVICE_ID,
            TEMPLATE_ID: EMAILJS_CONFIG.TEMPLATE_ID,
            PUBLIC_KEY: EMAILJS_CONFIG.PUBLIC_KEY.substring(0, 5) + '...'
        });
        return true;
    } else {
        console.error('❌ EmailJS library not loaded');
        return false;
    }
}

// Auto-initialize EmailJS saat script di-load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmailJS);
} else {
    initEmailJS();
}

// Format order items untuk email
function formatOrderItemsForEmail(items) {
    return items.map(item => {
        return `- ${item.nama_menu} (${item.quantity}x) @ Rp ${formatPrice(item.harga)} = Rp ${formatPrice(item.subtotal)}`;
    }).join('\n');
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('id-ID').format(price);
}

// Send order confirmation email
async function sendOrderConfirmationEmail(orderData) {
    try {
        console.log('📧 Sending order confirmation email...');
        console.log('Order data:', orderData);

        // Validasi EmailJS sudah diinit
        if (typeof emailjs === 'undefined') {
            console.error('❌ EmailJS not loaded!');
            return { success: false, error: 'EmailJS library tidak tersedia' };
        }

        // Validasi email user
        if (!orderData.customerEmail || !orderData.customerEmail.includes('@')) {
            console.warn('⚠️ Invalid or missing customer email:', orderData.customerEmail);
            return { success: false, error: 'Email tidak valid' };
        }
        
        console.log('✅ Email validation passed:', orderData.customerEmail);

        // Prepare email parameters dengan format template baru
        const templateParams = {
            email: orderData.customerEmail, // Untuk To Email field
            to_name: orderData.customerName,
            order_id: orderData.orderId,
            restaurant_name: orderData.restaurantName || 'Restoran',
            order_date: new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            order_total: `Rp ${formatPrice(orderData.totalPrice)}`
        };

        // Add item details (maksimal 10 items untuk template)
        orderData.items.forEach((item, index) => {
            if (index < 10) { // Limit to 10 items
                const itemNum = index + 1;
                const itemName = item.nama_menu || item.name || item.nama_makanan || 'Menu';
                const itemQty = item.quantity || 1;
                const itemSubtotal = item.subtotal || (item.harga * item.quantity) || 0;
                const itemImage = item.gambar_menu || item.foto || item.photo_url || item.image_url || 'https://via.placeholder.com/100x100?text=No+Image';
                
                templateParams[`item${itemNum}_name`] = itemName;
                templateParams[`item${itemNum}_qty`] = itemQty;
                templateParams[`item${itemNum}_price`] = `Rp ${formatPrice(itemSubtotal)}`;
                templateParams[`item${itemNum}_image`] = itemImage;
                
                console.log(`Item ${itemNum}:`, {
                    name: itemName,
                    qty: itemQty,
                    price: itemSubtotal,
                    image: itemImage
                });
            }
        });

        console.log('📋 Email template params (Full):', JSON.stringify(templateParams, null, 2));
        console.log('📤 Sending email with config:', {
            serviceId: EMAILJS_CONFIG.SERVICE_ID,
            templateId: EMAILJS_CONFIG.TEMPLATE_ID,
            to: templateParams.email
        });

        // Send email via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams
        );

        console.log('✅ Email sent successfully!', response);
        return { success: true, response };

    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.text || error.message };
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initEmailJS,
        sendOrderConfirmationEmail
    };
}
