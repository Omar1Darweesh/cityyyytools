import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import apiClient from '../api/client';
import './CommonStyles.css';

interface Product {
    id: number;
    code: string;
    nameEn: string;
    nameAr?: string;
    priceRetail: number;
    priceWholesale: number;
    barcode: string;
}

interface PriceUpdate {
    productId: number;
    priceType: 'RETAIL' | 'WHOLESALE';
    newPrice: number;
    reason?: string;
}

export default function PriceManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [adjustmentType, setAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
    const [priceType, setPriceType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');

    // ✅ NEW: Operation type (increase or decrease)
    const [operation, setOperation] = useState<'INCREASE' | 'DECREASE'>('INCREASE');

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProducts();
    }, [searchQuery]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/products', {
                params: { active: true, search: searchQuery || undefined }
            });
            setProducts(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIXED: Proper numeric calculation with increase/decrease
    const calculateNewPrice = (currentPrice: number): number => {
        // ✅ Ensure all values are numbers
        const price = Number(currentPrice);
        const adjustment = Number(adjustmentValue);

        // ✅ Calculate change amount
        let changeAmount = 0;
        if (adjustmentType === 'PERCENTAGE') {
            changeAmount = price * (adjustment / 100);
        } else {
            changeAmount = adjustment;
        }

        // ✅ Apply operation (increase or decrease)
        let newPrice = operation === 'INCREASE'
            ? price + changeAmount
            : price - changeAmount;

        // ✅ Ensure price doesn't go below 0
        return Math.max(0, newPrice);
    };

    const toggleProduct = (productId: number) => {
        const newSet = new Set(selectedProducts);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setSelectedProducts(newSet);
    };

    const toggleAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(products.map(p => p.id)));
        }
    };

    const applyPriceChanges = async () => {
        if (selectedProducts.size === 0) {
            setMessage('⚠️ الرجاء تحديد منتجات أولاً');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setSaving(true);
        try {
            const updates = Array.from(selectedProducts)
                .map((productId) => {
                    const product = products.find((p) => p.id === productId);
                    if (!product) return null;

                    const currentPrice = Number(priceType === 'RETAIL' ? product.priceRetail : product.priceWholesale);
                    const newPrice = Math.round(calculateNewPrice(currentPrice) * 100) / 100;

                    return {
                        productId,
                        ...(priceType === 'RETAIL'
                            ? { priceRetail: newPrice }
                            : { priceWholesale: newPrice }
                        )
                    };
                })
                .filter((update) => update !== null); // ✅ Simple filter, no type guard needed

            await apiClient.post('products/prices/bulk-update', {
                updates,
                reason: `${adjustmentType === 'PERCENTAGE' ? `${adjustmentValue}%` : `${adjustmentValue} ر.س`} ${operation === 'INCREASE' ? 'زيادة' : 'تخفيض'}`
            });


            setMessage('✅ تم تحديث الأسعار بنجاح');
            setSelectedProducts(new Set());
            await fetchProducts();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('❌ فشل تحديث الأسعار');
        } finally {
            setSaving(false);
        }
    };



    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">
                    <DollarSign size={32} />
                    إدارة الأسعار
                </h1>
                <p className="page-subtitle">تحديث أسعار المنتجات بشكل جماعي</p>
            </div>

            <div className="card">
                {/* Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Price Type */}
                    <div>
                        <label className="form-label">نوع السعر</label>
                        <select
                            value={priceType}
                            onChange={(e) => setPriceType(e.target.value as 'RETAIL' | 'WHOLESALE')}
                            className="form-input"
                        >
                            <option value="RETAIL">سعر التجزئة</option>
                            <option value="WHOLESALE">سعر الجملة</option>
                        </select>
                    </div>

                    {/* ✅ NEW: Operation Type */}
                    <div>
                        <label className="form-label">نوع التعديل</label>
                        <select
                            value={operation}
                            onChange={(e) => setOperation(e.target.value as 'INCREASE' | 'DECREASE')}
                            className="form-input"
                            style={{
                                backgroundColor: operation === 'INCREASE' ? '#dcfce7' : '#fee2e2',
                                borderColor: operation === 'INCREASE' ? '#10b981' : '#ef4444',
                                fontWeight: 600
                            }}
                        >
                            <option value="INCREASE">زيادة ⬆️ (+)</option>
                            <option value="DECREASE">تخفيض ⬇️ (-)</option>
                        </select>
                    </div>

                    {/* Adjustment Type */}
                    <div>
                        <label className="form-label">نوع التعديل</label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                            className="form-input"
                        >
                            <option value="PERCENTAGE">نسبة مئوية (%)</option>
                            <option value="FIXED">مبلغ ثابت (ر.س)</option>
                        </select>
                    </div>

                    {/* ✅ FIXED: Adjustment Value with proper number handling */}
                    <div>
                        <label className="form-label">قيمة التعديل</label>
                        <input
                            type="number"
                            value={adjustmentValue}
                            onChange={(e) => setAdjustmentValue(Number(e.target.value) || 0)}
                            className="form-input"
                            placeholder={adjustmentType === 'PERCENTAGE' ? '10' : '50'}
                            min="0"
                            step={adjustmentType === 'PERCENTAGE' ? '1' : '0.01'}
                            style={{
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                color: operation === 'INCREASE' ? '#10b981' : '#ef4444'
                            }}
                        />
                    </div>
                </div>

                {/* ✅ NEW: Preview Summary */}
                {selectedProducts.size > 0 && adjustmentValue > 0 && (
                    <div style={{
                        padding: '1rem',
                        background: operation === 'INCREASE' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        border: `2px solid ${operation === 'INCREASE' ? '#10b981' : '#ef4444'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {operation === 'INCREASE' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            <strong style={{ fontSize: '1.125rem' }}>
                                {operation === 'INCREASE' ? 'زيادة' : 'تخفيض'} الأسعار
                            </strong>
                        </div>
                        <p style={{ margin: 0 }}>
                            سيتم {operation === 'INCREASE' ? 'زيادة' : 'تخفيض'} أسعار <strong>{selectedProducts.size}</strong> منتج بمقدار{' '}
                            <strong style={{ fontSize: '1.25rem', color: operation === 'INCREASE' ? '#065f46' : '#991b1b' }}>
                                {operation === 'INCREASE' ? '+' : '-'}
                                {adjustmentValue}{adjustmentType === 'PERCENTAGE' ? '%' : ' ر.س'}
                            </strong>
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={applyPriceChanges}
                        disabled={saving || selectedProducts.size === 0}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        {saving ? '⏳ جاري التحديث...' : `💾 تطبيق على ${selectedProducts.size} منتج`}
                    </button>
                    <button
                        onClick={() => setSelectedProducts(new Set())}
                        className="btn btn-secondary"
                    >
                        <RefreshCw size={18} /> إلغاء التحديد
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        borderRadius: '0.5rem',
                        background: message.startsWith('✅') ? '#d1fae5' : message.startsWith('⚠️') ? '#fef3c7' : '#fee2e2',
                        color: message.startsWith('✅') ? '#065f46' : message.startsWith('⚠️') ? '#92400e' : '#991b1b',
                        fontWeight: 600,
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم أو الكود..."
                        className="form-input"
                    />
                </div>

                {/* Products Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.size > 0 && selectedProducts.size === products.length}
                                        onChange={toggleAll}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>المنتج</th>
                                <th>السعر الحالي</th>
                                <th>السعر الجديد</th>
                                <th>التغيير</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                        لا توجد منتجات
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const currentPrice = Number(priceType === 'RETAIL' ? product.priceRetail : product.priceWholesale);
                                    const newPrice = Math.round(calculateNewPrice(currentPrice) * 100) / 100;
                                    const change = newPrice - currentPrice;

                                    return (
                                        <tr key={product.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.has(product.id)}
                                                    onChange={() => toggleProduct(product.id)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>
                                                    {product.nameAr || product.nameEn}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {product.code}
                                                </div>
                                            </td>
                                            <td>{currentPrice.toFixed(2)} ر.س</td>
                                            <td style={{ fontWeight: 600 }}>{newPrice.toFixed(2)} ر.س</td>
                                            <td>
                                                {selectedProducts.has(product.id) && change !== 0 && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        background: change > 0 ? '#d1fae5' : '#fee2e2',
                                                        color: change > 0 ? '#065f46' : '#991b1b',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                    }}>
                                                        {change > 0 ? '+' : ''}{change.toFixed(2)} ر.س
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
