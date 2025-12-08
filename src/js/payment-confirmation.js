// Supabase Configuration
const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get payment info from localStorage or URL
let paymentData = {
    method: 'virtual_account',
    amount: 0,
    orderId: null,
    orderIds: [],
    items: [],
    voucher: null
};

let countdownTimer = null;
let timeRemaining = 900; // 15 minutes in seconds

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get payment data from localStorage
    const storedData = localStorage.getItem('platoo_payment_pending');
    if (storedData) {
        try {
            paymentData = JSON.parse(storedData);
            console.log('Payment data loaded:', paymentData);
        } catch (e) {
            console.error('Error parsing payment data:', e);
            alert('Data pembayaran tidak valid');
            window.location.href = '/catalog.html';
            return;
        }
    }

    if (!paymentData.orderId) {
        alert('Data pembayaran tidak ditemukan');
        window.location.href = '/catalog.html';
        return;
    }

    // Ensure amount exists (check if it's actually set)
    if (!paymentData.amount || paymentData.amount === 0) {
        console.error('Payment amount is 0 or undefined:', paymentData);
        alert('Total pembayaran tidak valid');
        window.location.href = '/catalog.html';
        return;
    }

    console.log('Final payment amount:', paymentData.amount);

    // Setup payment UI based on method
    setupPaymentUI();
    
    // Start countdown timer
    startCountdown();
});

function setupPaymentUI() {
    const method = paymentData.method;
    const amount = paymentData.amount;

    // Update total amount
    document.getElementById('totalAmount').textContent = formatCurrency(amount);

    if (method === 'virtual_account') {
        setupVirtualAccount();
    } else if (method === 'ewallet') {
        setupEWallet();
    }
}

function setupVirtualAccount() {
    document.getElementById('paymentTitle').textContent = 'Pembayaran Virtual Account';
    document.getElementById('vaNumberCard').style.display = 'block';
    document.getElementById('qrCard').style.display = 'none';

    // Generate random VA number (in production, this would come from payment gateway)
    const vaNumber = '8808' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    document.getElementById('vaNumber').textContent = vaNumber.match(/.{1,4}/g).join(' ');

    // Update payment steps for VA
    const stepsList = document.getElementById('paymentStepsList');
    stepsList.innerHTML = `
        <li>Buka aplikasi mobile banking Anda</li>
        <li>Pilih menu Transfer atau Bayar</li>
        <li>Masukkan nomor virtual account di atas</li>
        <li>Pastikan nominal transfer sesuai</li>
        <li>Konfirmasi dan selesaikan pembayaran</li>
        <li>Klik tombol "Saya Sudah Bayar" setelah selesai</li>
    `;
}

function setupEWallet() {
    document.getElementById('paymentTitle').textContent = 'Pembayaran QRIS';
    document.getElementById('vaNumberCard').style.display = 'none';
    document.getElementById('qrCard').style.display = 'block';

    // Update payment steps for E-Wallet
    const stepsList = document.getElementById('paymentStepsList');
    stepsList.innerHTML = `
        <li>Buka aplikasi mobile banking anda
        <li>Pilih menu Scan menggunakan QRIS</li>
        <li>Scan QR Code yang ditampilkan</li>
        <li>Periksa detail pembayaran</li>
        <li>Konfirmasi dan selesaikan pembayaran</li>
        <li>Klik tombol "Saya Sudah Bayar" setelah selesai</li>
    `;
}

function copyVANumber() {
    const vaNumber = document.getElementById('vaNumber').textContent.replace(/\s/g, '');
    navigator.clipboard.writeText(vaNumber).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tersalin!
        `;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

function startCountdown() {
    updateCountdownDisplay();
    
    countdownTimer = setInterval(() => {
        timeRemaining--;
        updateCountdownDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(countdownTimer);
            alert('Waktu pembayaran habis. Silakan buat pesanan baru.');
            localStorage.removeItem('platoo_payment_pending');
            window.location.href = '/catalog.html';
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('countdown').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function confirmPayment() {
    const btn = document.getElementById('confirmPaymentBtn');
    
    // Simulate payment verification (in production, verify with payment gateway)
    btn.disabled = true;
    btn.textContent = 'Memverifikasi Pembayaran...';
    btn.classList.add('loading');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // KURANGI STOK DI DATABASE SETELAH KONFIRMASI PEMBAYARAN
    let voucherUpdateResult = null;
    try {
        await updateFoodStockAfterPayment();
        voucherUpdateResult = await updateVoucherStockAfterPayment();
        console.log('💾 Voucher update result (digital payment):', voucherUpdateResult);
    } catch (error) {
        console.error('Error updating stock:', error);
        // Tetap lanjut redirect meskipun ada error (bisa dihandle lebih baik di production)
    }
    
    // Save voucher result to localStorage for debugging
    if (paymentData.voucher) {
        localStorage.setItem('platoo_last_voucher_result', JSON.stringify({
            updated: voucherUpdateResult?.success || false,
            voucherId: paymentData.voucher.voucher_id,
            voucherName: paymentData.voucher.nama_voucher,
            error: voucherUpdateResult?.error || null,
            timestamp: new Date().toISOString(),
            paymentMethod: paymentData.method
        }));
    }

    // SEND EMAIL CONFIRMATION
    let emailResult = null;
    try {
        emailResult = await sendPaymentConfirmationEmail();
    } catch (error) {
        console.error('Error sending email:', error);
        // Continue even if email fails
    }
    
    // Save email result untuk debugging
    if (emailResult) {
        const userData = JSON.parse(localStorage.getItem('platoo_user') || '{}');
        localStorage.setItem('platoo_last_email_result', JSON.stringify({
            sent: emailResult?.success || false,
            error: emailResult?.error || null,
            timestamp: new Date().toISOString(),
            orderId: paymentData.orderId,
            userEmail: userData.email,
            emailServiceLoaded: typeof sendOrderConfirmationEmail === 'function'
        }));
    }

    // BARU HAPUS CART SETELAH PAYMENT CONFIRMED
    localStorage.removeItem('platoo_cart');
    localStorage.removeItem('platoo_pending_order');

    // Stop countdown
    clearInterval(countdownTimer);

    // Show success state
    showSuccessState();

    // Redirect to order status after 3 seconds
    setTimeout(() => {
        localStorage.removeItem('platoo_payment_pending');
        // Pass payment method via URL
        window.location.href = `order-status.html?order=${paymentData.orderId}&payment=${paymentData.method}`;
    }, 3000);
}

function showSuccessState() {
    // Hide payment instructions
    document.getElementById('paymentInstructions').style.display = 'none';
    
    // Show success card
    const successCard = document.getElementById('successCard');
    successCard.style.display = 'block';

    // Fill in success details
    document.getElementById('successOrderNumber').textContent = paymentData.orderId;
    document.getElementById('successPaymentMethod').textContent = 
        paymentData.method === 'virtual_account' ? 'Virtual Account' : 'QRIS';
    document.getElementById('successAmount').textContent = formatCurrency(paymentData.amount);
}

async function updateFoodStockAfterPayment() {
    if (!paymentData.items || paymentData.items.length === 0) {
        console.log('No items to update stock');
        return;
    }

    try {
        console.log('🔄 Updating food stock after payment confirmation...');
        for (const item of paymentData.items) {
            // Get current stock
            const { data: food } = await supabase
                .from('catalog')
                .select('stok')
                .eq('catalog_id', item.id)
                .single();

            if (food) {
                const newStok = Math.max(0, food.stok - item.quantity);
                await supabase
                    .from('catalog')
                    .update({ stok: newStok })
                    .eq('catalog_id', item.id);
                
                console.log(`✅ Updated stock for item ${item.id}: ${food.stok} → ${newStok}`);
            }
        }
        console.log('✅ All food stocks updated successfully');
    } catch (error) {
        console.error('❌ Error updating food stock:', error);
        throw error;
    }
}

async function updateVoucherStockAfterPayment() {
    console.log('🎟️ Checking voucher data:', paymentData.voucher);
    
    if (!paymentData.voucher) {
        console.log('ℹ️ No voucher to update');
        return;
    }

    try {
        console.log('🔄 Updating voucher stock after payment confirmation...');
        const voucherId = paymentData.voucher.voucher_id;
        console.log('Voucher ID to update:', voucherId);

        // Get current stock
        const { data: voucher, error: fetchError } = await supabase
            .from('voucher')
            .select('stok')
            .eq('voucher_id', voucherId)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching voucher:', fetchError);
            throw fetchError;
        }

        if (voucher) {
            console.log('Current voucher stock:', voucher.stok);
            const oldStok = voucher.stok;
            const newStok = Math.max(0, oldStok - 1);
            
            const { data: updateData, error: updateError } = await supabase
                .from('voucher')
                .update({ stok: newStok })
                .eq('voucher_id', voucherId)
                .select();

            console.log('🔍 UPDATE RESPONSE (Digital Payment):');
            console.log('- updateData:', JSON.stringify(updateData, null, 2));
            console.log('- updateError:', JSON.stringify(updateError, null, 2));

            if (updateError) {
                console.error('❌ Error updating voucher:', updateError);
                return { success: false, error: updateError, oldStock: oldStok, newStock: newStok };
            }

            if (!updateData || updateData.length === 0) {
                console.error('⚠️ WARNING: No rows updated - possible RLS issue');
                return { success: false, error: 'No rows updated - possible RLS issue', oldStock: oldStok, newStock: newStok };
            }

            console.log(`✅ Voucher stock updated: ${oldStok} → ${newStok}`);
            return { success: true, oldStock: oldStok, newStock: newStok, updatedRow: updateData[0] };
        } else {
            console.warn('⚠️ Voucher not found in database');
            return { success: false, error: 'Voucher not found' };
        }
    } catch (error) {
        console.error('❌ Error updating voucher stock:', error);
        return { success: false, error: error.message };
    }
}

async function deleteOrders(orderIds) {
    try {
        // Delete orders dari database
        const { error } = await supabase
            .from('orders')
            .delete()
            .in('order_id', orderIds);
        
        if (error) throw error;
        console.log('✅ Orders deleted:', orderIds);
    } catch (error) {
        console.error('❌ Error deleting orders:', error);
        throw error;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function cancelPayment() {
    showCancelModal();
}

function showCancelModal() {
    const modal = document.getElementById('cancelModal');
    const overlay = document.getElementById('modalOverlay');
    modal.style.display = 'block';
    overlay.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
        overlay.classList.add('show');
    }, 10);
}

function hideCancelModal() {
    const modal = document.getElementById('cancelModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.remove('show');
    overlay.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }, 300);
}

function confirmCancel() {
    // Clear timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    // Hapus payment pending (biarkan cart & pending_order tetap ada)
    localStorage.removeItem('platoo_payment_pending');
    
    // HAPUS ORDERS yang sudah dibuat karena user cancel
    // Order sudah dibuat tapi belum bayar, jadi harus dihapus
    if (paymentData && paymentData.orderIds && paymentData.orderIds.length > 0) {
        console.log('Deleting cancelled orders:', paymentData.orderIds);
        deleteOrders(paymentData.orderIds).then(() => {
            console.log('Orders deleted successfully');
        }).catch(err => {
            console.error('Error deleting orders:', err);
        });
    }
    
    // Redirect ke halaman CHECKOUT (bukan catalog)
    // Agar user bisa ganti metode pembayaran
    console.log('Redirecting back to checkout page');
    window.location.href = '/checkout.html';
}

// Email Functions
async function sendPaymentConfirmationEmail() {
    try {
        console.log('📧 Sending payment confirmation email...');
        
        // Initialize EmailJS
        if (typeof initEmailJS === 'function') {
            initEmailJS();
        }
        
        // Get user data
        const userData = JSON.parse(localStorage.getItem('platoo_user') || '{}');
        
        // Fetch email from pembeli table
        const userId = userData.id || userData.id_pembeli || userData.pembeli_id;
        if (userId) {
            const { data: pembeliData, error: pembeliError } = await supabase
                .from('pembeli')
                .select('email, nama')
                .eq('id_pembeli', userId)
                .single();
            
            if (!pembeliError && pembeliData) {
                userData.email = pembeliData.email;
                userData.nama = pembeliData.nama;
                console.log('✅ Email fetched from database:', userData.email);
            }
        }
        
        // Check if user has email
        if (!userData.email) {
            console.warn('⚠️ User has no email address, skipping email send');
            return;
        }
        
        // Prepare email data dengan format yang sama seperti checkout
        const emailData = {
            customerEmail: userData.email,
            customerName: userData.nama || userData.username,
            orderId: paymentData.orderId,
            restaurantName: paymentData.restaurantInfo?.name || paymentData.restaurantInfo?.nama_restoran || 'Restoran',
            restaurantAddress: paymentData.restaurantInfo?.address || paymentData.restaurantInfo?.alamat || '-',
            restaurantPhone: paymentData.restaurantInfo?.phone || paymentData.restaurantInfo?.nomor_telepon || '-',
            items: (paymentData.items || []).map(item => ({
                nama_menu: item.name || item.nama_menu || item.nama_makanan,
                quantity: item.quantity,
                harga: item.price || item.harga,
                gambar_menu: item.photo_url || item.image_url || item.foto_menu || item.foto || item.gambar_menu,
                subtotal: (item.price || item.harga) * item.quantity
            })),
            totalPrice: paymentData.amount,
            paymentMethod: paymentData.method
        };
        
        console.log('📧 Full email data:', emailData);
        
        // Send email
        if (typeof sendOrderConfirmationEmail === 'function') {
            const result = await sendOrderConfirmationEmail(emailData);
            if (result.success) {
                console.log('✅ Email sent successfully!');
                return result;
            } else {
                console.warn('⚠️ Email send failed:', result.error);
                return result;
            }
        } else {
            console.warn('⚠️ Email service not loaded');
            return { success: false, error: 'Email service not loaded' };
        }
    } catch (error) {
        console.error('❌ Error sending email:', error);
        // Don't throw - email is optional
        return { success: false, error: error.message };
    }
}

// Make functions globally available
window.copyVANumber = copyVANumber;
window.confirmPayment = confirmPayment;
window.cancelPayment = cancelPayment;
window.showCancelModal = showCancelModal;
window.hideCancelModal = hideCancelModal;
window.confirmCancel = confirmCancel;