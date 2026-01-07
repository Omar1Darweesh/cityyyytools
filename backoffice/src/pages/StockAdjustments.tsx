import { useState, useEffect } from 'react';
import { ClipboardList, Search, AlertCircle, List, Plus, Minus, TrendingUp, TrendingDown, Package } from 'lucide-react';
import apiClient from '../api/client';
import './CommonStyles.css';

interface StockLocation {
    id: number;
    name: string;
    branchId: number;
    branch: { name: string };
}

interface Product {
    id: number;
    nameEn: string;
    nameAr?: string;
    barcode: string;
    code: string;
    stock?: number;
    unit?: string;
}

interface Adjustment {
    productId: number;
    product?: Product;
    systemQty: number;
    actualQty: number;
    variance: number;
}

export default function StockAdjustments() {
    const [locations, setLocations] = useState<StockLocation[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const [showProductList, setShowProductList] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const { data } = await apiClient.get('/stock/locations');
            setLocations(data);
            if (data.length > 0) {
                setSelectedLocationId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch locations:', error);
        }
    };

    const fetchAllProducts = async () => {
        setLoadingProducts(true);
        try {
            const { data } = await apiClient.get(`/products?active=true&take=100`);
            const products = Array.isArray(data) ? data : data.data || [];
            setAllProducts(products);
            setShowProductList(true);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            alert('فشل تحميل المنتجات');
        } finally {
            setLoadingProducts(false);
        }
    };

    const searchProducts = async (query: string) => {
        if (!query) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await apiClient.get(`/products?search=${query}&active=true`);
            setSearchResults(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const addProduct = async (product: Product) => {
        if (adjustments.find((a) => a.productId === product.id)) {
            alert('المنتج موجود بالفعل');
            return;
        }

        let systemQty = product.stock || 0;
        try {
            const { data } = await apiClient.get(`/products/${product.id}`);
            systemQty = data.stock || 0;
        } catch (error) {
            console.error('Failed to fetch product stock:', error);
        }

        setAdjustments([
            ...adjustments,
            {
                productId: product.id,
                product,
                systemQty,
                actualQty: systemQty,
                variance: 0,
            },
        ]);
        setSearchQuery('');
        setSearchResults([]);
        setShowProductList(false);
    };

    const updateActualQty = (productId: number, actualQty: number) => {
        if (actualQty < 0) actualQty = 0;
        setAdjustments(
            adjustments.map((adj) =>
                adj.productId === productId
                    ? { ...adj, actualQty, variance: actualQty - adj.systemQty }
                    : adj
            )
        );
    };

    const quickAdjust = (productId: number, amount: number) => {
        const adj = adjustments.find(a => a.productId === productId);
        if (adj) {
            const newQty = Math.max(0, adj.actualQty + amount);
            updateActualQty(productId, newQty);
        }
    };

    const removeAdjustment = (productId: number) => {
        setAdjustments(adjustments.filter((a) => a.productId !== productId));
    };

    const submitAdjustment = async () => {
        if (adjustments.length === 0) {
            alert('أضف منتجات للجرد');
            return;
        }

        const changes = adjustments.filter((a) => a.variance !== 0);
        if (changes.length === 0) {
            alert('لا توجد فروقات لحفظها');
            return;
        }

        setLoading(true);
        try {
            // ✅ FIXED: Send individual adjustment requests for each product
            const promises = changes.map((adj) =>
                apiClient.post('/stock/adjustments', {
                    productId: Number(adj.productId),  // ✅ Ensure integer
                    stockLocationId: Number(selectedLocationId), // ✅ Ensure integer
                    qtyChange: Number(adj.variance),  // ✅ Ensure number
                    notes: notes || `جرد: ${adj.product?.nameAr || adj.product?.nameEn}`,
                })
            );

            await Promise.all(promises);

            alert(`✅ تم حفظ التسوية بنجاح (${changes.length} منتج)`);
            setAdjustments([]);
            setNotes('');
        } catch (error: any) {
            console.error('Save error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'خطأ غير معروف';
            alert('❌ فشل الحفظ: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const summary = {
        totalItems: adjustments.length,
        totalIncrease: adjustments.filter(a => a.variance > 0).reduce((sum, a) => sum + a.variance, 0),
        totalDecrease: Math.abs(adjustments.filter(a => a.variance < 0).reduce((sum, a) => sum + a.variance, 0)),
        itemsWithChanges: adjustments.filter(a => a.variance !== 0).length,
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">
                    <ClipboardList size={32} />
                    جرد المخزون
                </h1>
                <p className="page-subtitle">تسجيل الفروقات بين المخزون الفعلي والمخزون في النظام</p>
            </div>

            <div className="card">
                {/* Location Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">المخزن</label>
                    <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                        className="form-input"
                    >
                        <option value={0}>اختر مخزن</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} - {loc.branch.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search + Browse */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">بحث منتج</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search
                                size={20}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af',
                                }}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    searchProducts(e.target.value);
                                }}
                                placeholder="اسم أو باركود..."
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                            />
                            {searchResults.length > 0 && (
                                <div className="search-dropdown">
                                    {searchResults.map((p) => (
                                        <div key={p.id} onClick={() => addProduct(p)} className="search-dropdown-item">
                                            <div>{p.nameAr || p.nameEn}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {p.barcode} | المخزون: {p.stock || 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={fetchAllProducts}
                            disabled={loadingProducts}
                            className="btn btn-secondary"
                            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <List size={20} />
                            {loadingProducts ? 'جاري التحميل...' : 'تصفح المنتجات'}
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                {adjustments.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '0.5rem', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Package size={20} />
                                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>إجمالي المنتجات</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.totalItems}</div>
                        </div>

                        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '0.5rem', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <TrendingUp size={20} />
                                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>زيادة في المخزون</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>+{summary.totalIncrease}</div>
                        </div>

                        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '0.5rem', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <TrendingDown size={20} />
                                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>نقص في المخزون</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>-{summary.totalDecrease}</div>
                        </div>

                        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: '0.5rem', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <AlertCircle size={20} />
                                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>منتجات بفروقات</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.itemsWithChanges}</div>
                        </div>
                    </div>
                )}

                {/* Product Cards */}
                {adjustments.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 className="form-label" style={{ marginBottom: '1rem' }}>المنتجات للجرد</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {adjustments.map((adj) => (
                                <div
                                    key={adj.productId}
                                    style={{
                                        border: adj.variance !== 0 ? '2px solid ' + (adj.variance > 0 ? '#10b981' : '#ef4444') : '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        padding: '1.5rem',
                                        background: adj.variance !== 0 ? (adj.variance > 0 ? '#f0fdf4' : '#fef2f2') : 'white',
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                                {adj.product?.nameAr || adj.product?.nameEn}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                الباركود: {adj.product?.barcode}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeAdjustment(adj.productId)}
                                            className="btn btn-danger btn-sm"
                                            style={{ marginTop: '-0.25rem' }}
                                        >
                                            حذف
                                        </button>
                                    </div>

                                    {/* Quantities Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                                الكمية بالنظام
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
                                                {adj.systemQty} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>{adj.product?.unit || 'PCS'}</span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', border: '2px solid #3b82f6' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                                الكمية الفعلية
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
                                                {adj.actualQty} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>{adj.product?.unit || 'PCS'}</span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center', padding: '1rem', background: adj.variance > 0 ? '#dcfce7' : adj.variance < 0 ? '#fee2e2' : '#f3f4f6', borderRadius: '0.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: adj.variance > 0 ? '#166534' : adj.variance < 0 ? '#991b1b' : '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                                الفرق
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: adj.variance > 0 ? '#16a34a' : adj.variance < 0 ? '#dc2626' : '#374151' }}>
                                                {adj.variance > 0 && '+'}{adj.variance}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Adjustment Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => quickAdjust(adj.productId, -10)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Minus size={16} /> 10
                                        </button>
                                        <button
                                            onClick={() => quickAdjust(adj.productId, -5)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Minus size={16} /> 5
                                        </button>
                                        <button
                                            onClick={() => quickAdjust(adj.productId, -1)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Minus size={16} /> 1
                                        </button>

                                        <input
                                            type="number"
                                            value={adj.actualQty}
                                            onChange={(e) => updateActualQty(adj.productId, Number(e.target.value))}
                                            className="form-input"
                                            style={{ width: '120px', textAlign: 'center', fontWeight: 600, fontSize: '1.125rem' }}
                                        />

                                        <button
                                            onClick={() => quickAdjust(adj.productId, 1)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Plus size={16} /> 1
                                        </button>
                                        <button
                                            onClick={() => quickAdjust(adj.productId, 5)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Plus size={16} /> 5
                                        </button>
                                        <button
                                            onClick={() => quickAdjust(adj.productId, 10)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: '1', minWidth: '80px' }}
                                        >
                                            <Plus size={16} /> 10
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Product List Modal */}
                {showProductList && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                        }}
                        onClick={() => setShowProductList(false)}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '0.5rem',
                                padding: '1.5rem',
                                maxWidth: '900px',
                                width: '90%',
                                maxHeight: '80vh',
                                overflow: 'auto',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>اختر منتج للجرد</h3>
                                <button onClick={() => setShowProductList(false)} className="btn btn-secondary">✕</button>
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {allProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => addProduct(product)}
                                        style={{
                                            padding: '1rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'white';
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                    {product.nameAr || product.nameEn}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    الباركود: {product.barcode} | الكود: {product.code}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>المخزون الحالي</div>
                                                <div
                                                    style={{
                                                        fontSize: '1.25rem',
                                                        fontWeight: 600,
                                                        color: product.stock && product.stock > 0 ? '#059669' : '#dc2626',
                                                    }}
                                                >
                                                    {product.stock || 0} {product.unit || 'PCS'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {allProducts.length === 0 && (
                                <div className="empty-state">
                                    <AlertCircle size={48} />
                                    <p>لا توجد منتجات</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">ملاحظات</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="form-input"
                        rows={3}
                        placeholder="سبب التسوية (مثال: جرد دوري، تلف، خطأ في الإدخال...)"
                    />
                </div>

                {/* Submit Button */}
                {adjustments.length > 0 && selectedLocationId > 0 && (
                    <button
                        onClick={submitAdjustment}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
                    >
                        {loading ? '⏳ جاري الحفظ...' : `💾 حفظ التسوية (${summary.itemsWithChanges} منتج)`}
                    </button>
                )}

                {adjustments.length > 0 && selectedLocationId === 0 && (
                    <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '0.5rem', color: '#dc2626', textAlign: 'center' }}>
                        ⚠️ يجب اختيار مخزن أولاً
                    </div>
                )}

                {adjustments.length === 0 && (
                    <div className="empty-state">
                        <AlertCircle size={48} />
                        <p>لم يتم إضافة منتجات بعد</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>ابحث عن منتج أو تصفح القائمة لإضافة منتجات للجرد</p>
                    </div>
                )}
            </div>
        </div>
    );
}
