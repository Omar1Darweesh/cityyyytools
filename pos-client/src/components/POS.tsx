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
        let appliedPrice = Number(product.priceRetail);
        if (selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale) {
            appliedPrice = Number(product.priceWholesale);
        }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            setCart(cart.map(item =>
                item.id === product.id
                    ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * item.price }
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
        } else {
            setCart(cart.map(item =>
                item.id === productId
                    ? { ...item, qty: newQty, lineTotal: newQty * item.price }
                    : item
            ));
        }
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

                    <div className="quick-actions-grid">
                        <button className="action-btn primary" onClick={() => setShowSearch(true)}>
                            <Search size={22} />
                            <span>بحث منتج</span>
                        </button>
                        <button className="action-btn" onClick={() => setCart([])}>
                            <Trash2 size={22} />
                            <span>مسح السلة</span>
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
                                <div key={p.id} className="search-item" onClick={() => {
                                    addToCart(p);
                                    setShowSearch(false);
                                }}>
                                    <span>{p.nameEn}</span>
                                    <span className="price">
                                        {(selectedCustomer?.type === 'WHOLESALE' && p.priceWholesale)
                                            ? p.priceWholesale
                                            : p.priceRetail} ر.س
                                        {p.stock !== undefined && (
                                            <div style={{ fontSize: '11px', color: p.stock <= 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '4px' }}>
                                                المتاح: {p.stock}
                                            </div>
                                        )}
                                    </span>
                                </div>
                            ))}
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
