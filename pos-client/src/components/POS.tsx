import { useState, useRef, useEffect } from 'react';
import { Search, Trash2, ShoppingCart, User, Building, Users } from 'lucide-react';
import apiClient from '../api/client';
import './POS.css';

interface Product {
    id: number;
    barcode: string;
    nameEn: string;
    nameAr?: string;
    code?: string;
    priceRetail: number;
    priceWholesale?: number;
    taxRate?: number;
    cost: number;
    stock?: number;
}

interface Customer {
    id: number;
    name: string;
    type: 'RETAIL' | 'WHOLESALE';
}

interface CartItem extends Product {
    qty: number;
    discount?: number;
    price: number;
    lineTotal: number;
}

interface PlatformConfig {
    id: string;
    code: string;
    name: string;
    icon: string;
    tax: number;
    platform: number;
    btnText: string;
    active: boolean;
}

// ✅ REMOVED: No more DEFAULT_CHANNELS!

function POS() {
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [showProductBrowser, setShowProductBrowser] = useState(false);
    const [browserProducts, setBrowserProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categories, setCategories] = useState<any[]>([]);



    const PAYMENT_METHODS = [
        { id: 'CASH', name: 'نقدي', icon: '💵' },
        { id: 'CARD', name: 'بطاقة', icon: '💳' },
        { id: 'INSTAPAY', name: 'InstaPay', icon: '📱' },
        { id: 'FAWRY', name: 'فوري', icon: '🏪' },
        { id: 'WALLET', name: 'محفظة', icon: '👛' },
    ];

    // ✅ NEW: Start with EMPTY channels - load from database only
    const [CHANNELS, setChannels] = useState<Record<string, PlatformConfig>>({});
    const [activeTab, setActiveTab] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
    const [message, setMessage] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const user = JSON.parse(localStorage.getItem('user')!);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    // ✅ Load platforms from database on mount
    useEffect(() => {
        loadPlatformSettings();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await apiClient.get('/products/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load categories:', e);
            setCategories([]);
        }
    };

    const loadProductsForBrowser = async (categoryId?: string) => {
        try {
            const branchId = user.branchId || user.branch?.id || 1;
            const url = categoryId
                ? `/products?branchId=${branchId}&categoryId=${categoryId}&active=true`
                : `/products?branchId=${branchId}&active=true`;

            const response = await apiClient.get(url);
            const products = (response.data || response || []).map((p: any) => ({
                ...p,
                priceRetail: Number(p.priceRetail || 0),
                priceWholesale: p.priceWholesale ? Number(p.priceWholesale) : undefined,
                cost: Number(p.cost || 0),
            }));

            setBrowserProducts(products);
        } catch (e) {
            console.error('Failed to load products:', e);
            setBrowserProducts([]);
        }
    };

    useEffect(() => {
        if (showProductBrowser) {
            loadCategories();
            loadProductsForBrowser();
        }
    }, [showProductBrowser]);



    const loadPlatformSettings = async () => {
        try {
            setLoading(true);
            console.log('📡 Loading platforms from database...');
            const data = await apiClient.get('/settings/platforms');

            if (!data || !Array.isArray(data) || data.length === 0) {
                setMessage('⚠️ لا توجد منصات! يرجى إضافة منصات من صفحة الإعدادات');
                setLoading(false);
                return;
            }

            // ✅ Build channels object using DATABASE ID (not platform code)
            const loadedChannels: Record<string, PlatformConfig> = {};
            data.forEach((platform: any) => {
                if (platform.active) {
                    // ✅ CHANGED: Use platform.id instead of platform.platform
                    loadedChannels[platform.id.toString()] = {
                        id: platform.id.toString(),      // ✅ Use database ID
                        code: platform.platform,          // ✅ Keep original code
                        name: platform.name,
                        icon: platform.icon || '📦',
                        tax: Number(platform.taxRate) / 100,
                        platform: Number(platform.commission) / 100,
                        btnText: platform.name,
                        active: platform.active,
                    };
                }
            });

            console.log('✅ Loaded platforms:', loadedChannels);
            setChannels(loadedChannels);

            // Set first active channel as default
            const firstChannel = Object.keys(loadedChannels)[0];
            if (firstChannel) {
                setActiveTab(firstChannel);
            }

            setLoading(false);
        } catch (error) {
            console.error('❌ Failed to load platforms:', error);
            setMessage('❌ فشل تحميل المنصات');
            setLoading(false);
        }
    };


    // Auto-focus barcode input
    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [cart]);

    // Refocus barcode input when modals close
    useEffect(() => {
        if (!showSearch && !showCustomerModal && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [showSearch, showCustomerModal]);

    // Fetch customers when modal opens
    useEffect(() => {
        if (showCustomerModal) {
            apiClient.get('/customers').then(data => {
                setCustomersList(data.data);
            });
        }
    }, [showCustomerModal]);

    // Recalculate cart prices when customer changes
    useEffect(() => {
        if (cart.length > 0) {
            const newCart = cart.map(item => {
                let price = Number(item.priceRetail);
                if (selectedCustomer?.type === 'WHOLESALE' && item.priceWholesale) {
                    price = Number(item.priceWholesale);
                }
                return {
                    ...item,
                    price,
                    lineTotal: price * item.qty
                };
            });
            setCart(newCart);
        }
    }, [selectedCustomer]);

    const playBeep = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success'
                ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBja2LDciUFLIHO8tiJNwgZaLvt559NEAxQpPwtmMcBjiR1LMeSwFJHfH8N2QQAoUXrTp66hVFApGnDyvmwhBjuO1OKczs'
                : 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
        );
        audio.play().catch(() => { });
    };

    const handleBarcodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcode.trim()) return;

        setLoading(true);
        setMessage('');
        try {
            const branchId = user.branchId || user.branch?.id || 1;
            const data = await apiClient.get(`/products/find/${barcode}?branchId=${branchId}`);
            addToCart(data);
            setMessage(`✅ ${data.nameAr || data.nameEn}`);
            setBarcode('');
        } catch (err: any) {
            playBeep('error');
            setMessage(`❌ ${err.response?.data?.message || 'المنتج غير موجود'}`);
            setBarcode('');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const branchId = user.branchId || user.branch?.id || 1;
            const data = await apiClient.get(`/products?search=${query}&branchId=${branchId}`);
            setSearchResults(Array.isArray(data) ? data : data.data);
        } catch (e) {
            console.error(e);
        }
    };

    const addToCart = (product: Product) => {
        // ✅ Check if product has stock information
        const availableStock = product.stock !== undefined ? product.stock : Infinity;

        // ✅ Check if stock is 0
        if (availableStock === 0) {
            playBeep('error');
            setMessage('❌ المنتج غير متوفر في المخزن');
            return;
        }

        let appliedPrice = Number(product.priceRetail);
        if (selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale) {
            appliedPrice = Number(product.priceWholesale);
        }

        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            // ✅ Check if we can increase quantity
            const newQty = existingItem.qty + 1;

            if (newQty > availableStock) {
                playBeep('error');
                setMessage(`❌ المخزون المتاح فقط ${availableStock} وحدة`);
                return;
            }

            setCart(cart.map(item =>
                item.id === product.id
                    ? { ...item, qty: newQty, lineTotal: newQty * item.price }
                    : item
            ));
        } else {
            setCart([...cart, {
                ...product,
                price: appliedPrice,
                qty: 1,
                lineTotal: appliedPrice,
            }]);
        }

        playBeep('success');
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };


    const updateQty = (productId: number, newQty: number) => {
        if (newQty <= 0) {
            setCart(cart.filter(item => item.id !== productId));
            return;
        }

        // ✅ Find the cart item to check stock
        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;

        // ✅ Check available stock
        const availableStock = cartItem.stock !== undefined ? cartItem.stock : Infinity;

        if (newQty > availableStock) {
            playBeep('error');
            setMessage(`❌ المخزون المتاح فقط ${availableStock} وحدة`);
            return;
        }

        setCart(cart.map(item =>
            item.id === productId
                ? { ...item, qty: newQty, lineTotal: newQty * item.price }
                : item
        ));
    };


    const calculateTotals = () => {
        if (!CHANNELS[activeTab]) {
            return {
                subtotal: 0,
                subtotalAfterDiscount: 0,
                discountAmount: 0,
                taxAmount: 0,
                platformAmount: 0,
                finalTotal: 0
            };
        }

        const config = CHANNELS[activeTab];
        const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
        const discountAmount = (subtotal * appliedDiscount) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxAmount = subtotalAfterDiscount * config.tax;
        const platformAmount = subtotalAfterDiscount * config.platform;
        const finalTotal = subtotalAfterDiscount + taxAmount + platformAmount;

        return {
            subtotal,
            subtotalAfterDiscount,
            discountAmount,
            taxAmount,
            platformAmount,
            finalTotal
        };
    };

    const handleApplyDiscount = () => {
        setAppliedDiscount(discountValue);
        setMessage(`✅ تم تطبيق خصم ${discountValue}%`);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            setMessage('⚠️ السلة فارغة');
            return;
        }

        if (!CHANNELS[activeTab]) {
            setMessage('⚠️ يرجى اختيار منصة');
            return;
        }

        setLoading(true);
        try {
            const totals = calculateTotals();
            const config = CHANNELS[activeTab];
            const paymentMethodName = PAYMENT_METHODS.find(p => p.id === paymentMethod)?.name;

            const saleData = {
                branchId: user.branchId || user.branch?.id || 1,
                channel: CHANNELS[activeTab].code,  // ✅ CHANGED: Send the original code
                customerId: selectedCustomer?.id || null,
                lines: cart.map(item => ({
                    productId: item.id,
                    qty: item.qty,
                    unitPrice: parseFloat(item.price.toFixed(2)),
                    taxRate: parseFloat((config.tax * 100).toFixed(2)),
                    lineDiscount: 0
                })),
                paymentMethod: paymentMethod,
                totalDiscount: parseFloat(totals.discountAmount.toFixed(2)),
                platformCommission: parseFloat(totals.platformAmount.toFixed(2)),
                notes: `${config.name} | ${paymentMethodName}`
            };


            console.log('Sending Sale Data:', saleData);
            const response = await apiClient.post('/pos/sales', saleData);

            playBeep('success');
            // ✅ FIXED: response is now the direct data
            setMessage(`✅ تمت العملية بنجاح! رقم الفاتورة: ${response.invoiceNo}`);

            // Reset
            setCart([]);
            setPaymentMethod('CASH');
            setShowCustomerModal(false);
            setSelectedCustomer(null);
            setDiscountValue(0);
            setAppliedDiscount(0);
        } catch (error: any) {
            console.error(error);
            playBeep('error');
            setMessage(`❌ ${error.response?.data?.message || 'حدث خطأ'}`);
        } finally {
            setLoading(false);
        }
    };


    const handleLogout = () => {
        localStorage.clear();
        window.location.reload();
    };

    const refreshPlatformSettings = async () => {
        await loadPlatformSettings();
        setMessage('✅ تم تحديث المنصات');
    };

    // ✅ Show loading state
    if (loading && Object.keys(CHANNELS).length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <div style={{ fontSize: '18px', color: '#64748b' }}>جاري تحميل المنصات...</div>
            </div>
        );
    }

    // ✅ Show error if no platforms
    if (Object.keys(CHANNELS).length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>لا توجد منصات نشطة</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>يرجى إضافة منصات من صفحة الإعدادات</p>
                <button
                    onClick={() => window.location.href = '/settings'}
                    style={{
                        padding: '12px 24px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    انتقل إلى الإعدادات
                </button>
            </div>
        );
    }

    return (
        <div className="pos-container" dir="rtl">
            {/* Header */}
            <div className="pos-header">
                <div className="header-top">
                    <h1><ShoppingCart size={32} /> نقطة البيع</h1>
                    <div className="user-info">
                        <div className="user-tag"><User size={14} /> {user.fullName}</div>
                        <div className="branch-tag"><Building size={14} /> {user.branch?.name}</div>
                        <button onClick={handleLogout} className="logout-btn">تسجيل خروج</button>
                        <button
                            onClick={refreshPlatformSettings}
                            className="btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            title="تحديث المنصات"
                        >
                            🔄 تحديث
                        </button>
                    </div>
                </div>

                {/* Platform Tabs - Now Dynamic! */}
                <div className="channel-tabs">
                    {Object.values(CHANNELS).map(channel => (
                        <button
                            key={channel.id}
                            className={`tab-btn ${activeTab === channel.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(channel.id)}
                        >
                            {channel.name}
                        </button>
                    ))}
                </div>

                {/* Channel Info Bar */}
                {CHANNELS[activeTab] && (
                    <div className="channel-info-bar">
                        <div className="info-item" onClick={() => setShowCustomerModal(true)} style={{ cursor: 'pointer', background: selectedCustomer ? '#dbeafe' : 'transparent', padding: '5px 10px', borderRadius: '6px' }}>
                            <span className="info-label"><Users size={16} /> العميل:</span>
                            <span className="info-value" style={{ marginRight: '5px', fontWeight: 'bold' }}>
                                {selectedCustomer ? selectedCustomer.name : 'Retail'}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">المنصة:</span>
                            <span className="info-value">{CHANNELS[activeTab].name}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">الضريبة:</span>
                            <span className="info-value">{(CHANNELS[activeTab].tax * 100).toFixed(0)}%</span>
                        </div>
                        {CHANNELS[activeTab].platform > 0 && (
                            <div className="info-item">
                                <span className="info-label">العمولة:</span>
                                <span className="info-value">{(CHANNELS[activeTab].platform * 100).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="pos-main">
                <div className="scanner-section">
                    <h2 className="section-title">🔍 مسح الباركود</h2>
                    <form onSubmit={handleBarcodeSubmit}>
                        <div className="barcode-wrapper">
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder="امسح الباركود هنا (أو الكود الداخلي)..."
                                className="barcode-input"
                                disabled={loading}
                                dir="ltr"
                            />
                        </div>
                    </form>

                    {message && (
                        <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setShowSearch(true)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Search size={18} />
                            بحث منتج
                        </button>

                        {/* NEW: Browse Products Button */}
                        <button
                            onClick={() => setShowProductBrowser(true)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <ShoppingCart size={18} />
                            عرض المنتجات
                        </button>

                        <button
                            onClick={() => setCart([])}
                            style={{
                                padding: '12px 20px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Trash2 size={18} />
                            مسح السلة
                        </button>
                    </div>



                    <div className="discount-card">
                        <h3>🎟️ خصم العميل</h3>
                        <div className="discount-group">
                            <input
                                type="number"
                                placeholder="%"
                                value={discountValue || ''}
                                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                className="discount-field"
                            />
                            <button className="apply-btn" onClick={handleApplyDiscount}>تطبيق</button>
                        </div>
                    </div>
                </div>

                <div className="cart-section">
                    <div className="cart-header">
                        <h2 className="cart-title">🛒 سلة المبيعات ({cart.length} منتجات)</h2>
                    </div>

                    {cart.length === 0 ? (
                        <div className="empty-cart" style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
                            <ShoppingCart size={80} style={{ marginBottom: '20px' }} />
                            <p>السلة بانتظار أول منتج...</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items-list">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="item-main">
                                            <div className="item-name">{item.nameAr || item.nameEn}</div>
                                            <div className="item-meta">
                                                باركود: {item.barcode} | السعر: {item.price.toFixed(2)} ر.س
                                                {item.stock !== undefined && <span style={{ marginRight: '10px', color: item.stock <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                    (المخزون: {item.stock})
                                                </span>}
                                            </div>
                                        </div>

                                        <div className="item-quantity">
                                            <button className="qty-control" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                                            <div className="qty-val">{item.qty}</div>
                                            <button className="qty-control" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                                        </div>

                                        <div className="item-pricing">
                                            <div className="item-line-total">{item.lineTotal.toFixed(2)} ر.س</div>
                                        </div>

                                        <button onClick={() => updateQty(item.id, 0)} className="delete-btn">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-footer">
                                {(() => {
                                    const totals = calculateTotals();
                                    return (
                                        <>
                                            <div className="summary-details">
                                                {/* 1️⃣ Products Total (first) */}
                                                <div className="summary-item">
                                                    <span className="sum-label">المنتجات:</span>
                                                    <span className="sum-value">{totals.subtotal.toFixed(2)} ر.س</span>
                                                </div>

                                                {/* 2️⃣ Discount (if any) */}
                                                {totals.discountAmount > 0 && (
                                                    <div className="summary-item">
                                                        <span className="sum-label">الخصم ({appliedDiscount}%):</span>
                                                        <span className="sum-value minus">-{totals.discountAmount.toFixed(2)} ر.س</span>
                                                    </div>
                                                )}

                                                {/* Add visual divider after discount */}
                                                {totals.discountAmount > 0 && <div className="summary-divider"></div>}

                                                {/* 3️⃣ Subtotal after discount */}
                                                <div className="summary-item subtotal-row">
                                                    <span className="sum-label">بعد الخصم:</span>
                                                    <span className="sum-value">{totals.subtotalAfterDiscount.toFixed(2)} ر.س</span>
                                                </div>

                                                {/* 4️⃣ Tax */}
                                                <div className="summary-item">
                                                    <span className="sum-label">الضريبة ({(CHANNELS[activeTab].tax * 100).toFixed(0)}%):</span>
                                                    <span className="sum-value plus">+{totals.taxAmount.toFixed(2)} ر.س</span>
                                                </div>

                                                {/* 5️⃣ Platform Commission (if any) */}
                                                {totals.platformAmount > 0 && (
                                                    <div className="summary-item">
                                                        <span className="sum-label">العمولة ({(CHANNELS[activeTab].platform * 100).toFixed(0)}%):</span>
                                                        <span className="sum-value plus">+{totals.platformAmount.toFixed(2)} ر.س</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Payment Methods */}
                                            <div className="payment-section">
                                                <span className="section-subtitle">طريقة الدفع (مصر 2025)</span>
                                                <div className="payment-methods-row">
                                                    {PAYMENT_METHODS.map(pm => (
                                                        <button
                                                            key={pm.id}
                                                            className={`pm-btn ${paymentMethod === pm.id ? 'active' : ''}`}
                                                            onClick={() => setPaymentMethod(pm.id)}
                                                            title={pm.name}
                                                        >
                                                            <span className="pm-icon">{pm.icon}</span>
                                                            <span className="pm-name">{pm.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Final Total Column */}
                                            <div className="final-checkout-column">
                                                <div className="total-display">
                                                    <div className="total-label">الإجمالي النهائي</div>
                                                    <div className="total-val">{totals.finalTotal.toFixed(2)} ر.س</div>
                                                </div>
                                                <button
                                                    className="pay-btn"
                                                    onClick={handleCheckout}
                                                    disabled={loading || cart.length === 0}
                                                >
                                                    {loading ? '⏳...' : `✅ ${CHANNELS[activeTab].btnText}`}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}


                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Search Modal */}
            {showSearch && (
                <div className="modal-overlay" onClick={() => setShowSearch(false)}>
                    <div className="search-modal" onClick={e => e.stopPropagation()}>
                        <div className="search-header">
                            <Search size={20} />
                            <input
                                autoFocus
                                placeholder="ابحث باسم المنتج..."
                                value={searchQuery}
                                onChange={e => handleSearch(e.target.value)}
                            />
                            <button onClick={() => setShowSearch(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>✕</button>
                        </div>
                        <div className="search-results">
                            {searchResults.map(p => (
                                <div
                                    key={p.id}
                                    style={{
                                        padding: '12px',
                                        borderBottom: '1px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: p.stock === 0 ? 'not-allowed' : 'pointer', // ✅
                                        opacity: p.stock === 0 ? 0.5 : 1, // ✅
                                        background: 'white',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (p.stock !== 0) e.currentTarget.style.background = '#f9fafb';
                                    }}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{p.nameEn}</div>
                                        <div style={{ fontSize: '14px', color: '#10b981' }}>
                                            {(selectedCustomer?.type === 'WHOLESALE' && p.priceWholesale)
                                                ? p.priceWholesale
                                                : p.priceRetail} ر.س
                                        </div>
                                        {p.stock !== undefined && (
                                            <div style={{
                                                fontSize: '12px',
                                                color: p.stock === 0 ? '#ef4444' : p.stock < 10 ? '#f59e0b' : '#10b981',
                                                fontWeight: '600',
                                                marginTop: '4px'
                                            }}>
                                                المتاح: {p.stock}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (p.stock !== 0) {
                                                addToCart(p);
                                            } else {
                                                playBeep('error');
                                                setMessage('❌ المنتج غير متوفر');
                                            }
                                        }}
                                        disabled={p.stock === 0} // ✅
                                        style={{
                                            padding: '8px 16px',
                                            background: p.stock === 0 ? '#9ca3af' : '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            opacity: p.stock === 0 ? 0.6 : 1
                                        }}
                                    >
                                        {p.stock === 0 ? '🚫 غير متوفر' : '+ إضافة'}
                                    </button>
                                </div>
                            ))}

                        </div>
                    </div>
                </div>
            )}

            {/* Product Browser Modal - ENHANCED DESIGN */}
            {showProductBrowser && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowProductBrowser(false)}
                    style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '95%',
                            maxWidth: '1400px',
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#f9fafb',
                            borderRadius: '20px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Modern Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '25px 30px',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', marginBottom: '5px' }}>
                                    🛍️ عرض المنتجات
                                </h2>
                                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                                    {browserProducts.length} منتج متاح
                                </p>
                            </div>
                            <button
                                onClick={() => setShowProductBrowser(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '24px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Filter Section */}
                        <div style={{
                            padding: '20px 30px',
                            background: 'white',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            gap: '15px',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {/* Search Bar */}
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 بحث سريع..."
                                    onChange={(e) => {
                                        const query = e.target.value.toLowerCase();
                                        if (query) {
                                            const filtered = browserProducts.filter(p =>
                                                (p.nameAr?.toLowerCase().includes(query)) ||
                                                (p.nameEn?.toLowerCase().includes(query)) ||
                                                (p.code?.toLowerCase().includes(query)) ||
                                                (p.barcode?.toLowerCase().includes(query))
                                            );
                                            setBrowserProducts(filtered);
                                        } else {
                                            loadProductsForBrowser(selectedCategory || undefined);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 20px',
                                        fontSize: '15px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '12px',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            {/* Category Pills */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        setSelectedCategory('');
                                        loadProductsForBrowser();
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: selectedCategory === '' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                                        color: selectedCategory === '' ? 'white' : '#4b5563',
                                        border: '2px solid',
                                        borderColor: selectedCategory === '' ? 'transparent' : '#e5e7eb',
                                        borderRadius: '25px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    الكل
                                </button>
                                {categories.slice(0, 5).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id.toString());
                                            loadProductsForBrowser(cat.id.toString());
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: selectedCategory === cat.id.toString()
                                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                : 'white',
                                            color: selectedCategory === cat.id.toString() ? 'white' : '#4b5563',
                                            border: '2px solid',
                                            borderColor: selectedCategory === cat.id.toString() ? 'transparent' : '#e5e7eb',
                                            borderRadius: '25px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {cat.nameAr || cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products Grid - FIXED ALIGNMENT */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '25px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '20px',
                            alignContent: 'start'
                        }}>
                            {browserProducts.length === 0 ? (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    textAlign: 'center',
                                    padding: '80px 20px',
                                    color: '#9ca3af'
                                }}>
                                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
                                    <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
                                        لا توجد منتجات
                                    </div>
                                    <div style={{ fontSize: '14px' }}>
                                        جرب تغيير الفئة أو البحث
                                    </div>
                                </div>
                            ) : (
                                browserProducts.map(product => (
                                    <div
                                        key={product.id}
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            height: '420px' // ✅ Fixed height for all cards
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-8px)';
                                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.25)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                        }}
                                    >
                                        {/* Stock Badge - Top Right */}
                                        {product.stock !== undefined && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                left: '12px', // ✅ Changed to left for RTL
                                                padding: '6px 12px',
                                                background: product.stock > 10
                                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                    : product.stock > 0
                                                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                zIndex: 1,
                                                minWidth: '50px',
                                                textAlign: 'center'
                                            }}>
                                                {product.stock} متاح
                                            </div>
                                        )}

                                        {/* Product Image Area - Fixed Height */}
                                        <div style={{
                                            width: '100%',
                                            height: '140px', // ✅ Fixed height
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '60px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            flexShrink: 0 // ✅ Prevent shrinking
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                            }}></div>
                                            <span style={{ position: 'relative', zIndex: 1 }}>📦</span>
                                        </div>

                                        {/* Product Info - Flexbox with fixed structure */}
                                        <div style={{
                                            padding: '16px',
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between' // ✅ Space between top and bottom
                                        }}>
                                            {/* Top Section - Name and Code */}
                                            <div>
                                                {/* Product Name - Fixed 2 lines */}
                                                <h3 style={{
                                                    margin: '0 0 8px 0',
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    color: '#1f2937',
                                                    lineHeight: '1.4',
                                                    height: '42px', // ✅ Fixed height for 2 lines
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    textAlign: 'right',
                                                    direction: 'rtl' // ✅ RTL direction
                                                }}>
                                                    {product.nameAr || product.nameEn}
                                                </h3>

                                                {/* Product Code */}
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: '#9ca3af',
                                                    fontFamily: 'monospace',
                                                    textAlign: 'right',
                                                    direction: 'ltr', // ✅ LTR for codes
                                                    marginBottom: '8px'
                                                }}>
                                                    #{product.code || product.barcode}
                                                </div>
                                            </div>

                                            {/* Bottom Section - Price and Button */}
                                            <div>
                                                {/* Divider */}
                                                <div style={{
                                                    height: '1px',
                                                    background: 'linear-gradient(to left, transparent, #e5e7eb, transparent)',
                                                    marginBottom: '12px'
                                                }}></div>

                                                {/* Price - Always same position */}
                                                <div style={{
                                                    fontSize: '22px',
                                                    fontWeight: '800',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    textAlign: 'center', // ✅ Center aligned
                                                    marginBottom: '12px',
                                                    height: '28px', // ✅ Fixed height
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    direction: 'rtl'
                                                }}>
                                                    {(() => {
                                                        const price = (selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale)
                                                            ? Number(product.priceWholesale)
                                                            : Number(product.priceRetail);
                                                        return price.toFixed(2);
                                                    })()} ر.س
                                                </div>

                                                {/* Add Button - Disabled if no stock */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(product);
                                                    }}
                                                    disabled={product.stock === 0} // ✅ Disable if no stock
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        background: product.stock === 0
                                                            ? '#9ca3af'
                                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        transition: 'all 0.2s',
                                                        boxShadow: product.stock === 0
                                                            ? 'none'
                                                            : '0 4px 12px rgba(102, 126, 234, 0.3)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        opacity: product.stock === 0 ? 0.6 : 1
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (product.stock !== 0) {
                                                            e.currentTarget.style.transform = 'scale(1.02)';
                                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (product.stock !== 0) {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                                        }
                                                    }}
                                                >
                                                    {product.stock === 0 ? (
                                                        <>
                                                            <span style={{ fontSize: '18px' }}>🚫</span>
                                                            غير متوفر
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: '18px' }}>+</span>
                                                            إضافة للسلة
                                                        </>
                                                    )}
                                                </button>

                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            )}




            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="search-modal" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                        <div className="search-header">
                            <Users size={20} />
                            <input
                                autoFocus
                                placeholder="ابحث عن عميل..."
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                            />
                            <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>✕</button>
                        </div>
                        <div className="search-results">
                            <div className="search-item" onClick={() => {
                                setSelectedCustomer(null); // Retail
                                setShowCustomerModal(false);
                            }}>
                                <span className="font-bold">عميل نقدي / عام</span>
                                <span className="text-gray-500">Retail</span>
                            </div>
                            {customersList
                                .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                                .map(c => (
                                    <div key={c.id} className="search-item" onClick={() => {
                                        setSelectedCustomer(c);
                                        setShowCustomerModal(false);
                                    }}>
                                        <span>{c.name}</span>
                                        <span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>
                                            {c.type}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default POS;
