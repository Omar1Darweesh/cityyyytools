import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { X } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    nameAr: string;
}

interface Subcategory {
    id: number;
    name: string;
    nameAr: string;
    categoryId: number;
}

interface ItemType {
    id: number;
    name: string;
    nameAr: string;
    subcategoryId: number;
}

interface ProductFormProps {
    product?: any;
    onClose: () => void;
    onSave: () => void;
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
    // Hierarchy data
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [itemTypes, setItemTypes] = useState<ItemType[]>([]);

    // Selected values
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
    const [selectedItemTypeId, setSelectedItemTypeId] = useState<number | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        code: '', // Will be auto-generated if empty
        barcode: '',
        nameEn: '',
        nameAr: '',
        brand: '',
        unit: 'PCS',
        cost: 0,
        priceRetail: 0,
        priceWholesale: 0,
        minQty: 10,
        maxQty: 1000,
        initialStock: 0,
        active: true,
    });

    const [loading, setLoading] = useState(false);

    // Load categories on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Load existing product data
    // Load existing product data
    useEffect(() => {
        if (product) {
            setFormData({
                code: product.code || '',
                barcode: product.barcode || '',
                nameEn: product.nameEn || '',
                nameAr: product.nameAr || '',
                brand: product.brand || '',
                unit: product.unit || 'PCS',
                cost: Number(product.cost) || 0,
                priceRetail: Number(product.priceRetail) || 0,
                priceWholesale: Number(product.priceWholesale) || 0,
                minQty: product.minQty || 10,
                maxQty: product.maxQty || 1000,
                initialStock: product.stock || 0, // ✅ Load actual stock
                active: product.active ?? true,
            });

            // Load hierarchy if product has itemType
            if (product.itemType) {
                const itemType = product.itemType;
                const subcategory = itemType.subcategory;
                const category = subcategory?.category;

                if (category) {
                    setSelectedCategoryId(category.id);
                    loadSubcategories(category.id);
                }

                if (subcategory) {
                    setSelectedSubcategoryId(subcategory.id);
                    loadItemTypes(subcategory.id);
                }

                if (itemType) {
                    setSelectedItemTypeId(itemType.id);
                }
            }
        }
    }, [product]);


    const fetchCategories = async () => {
        try {
            const { data } = await apiClient.get('/products/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const loadSubcategories = async (categoryId: number) => {
        try {
            const { data } = await apiClient.get(`/products/subcategories?categoryId=${categoryId}`);
            setSubcategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch subcategories:', error);
        }
    };

    const loadItemTypes = async (subcategoryId: number) => {
        try {
            const { data } = await apiClient.get(`/products/item-types?subcategoryId=${subcategoryId}`);
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch item types:', error);
        }
    };

    const handleCategoryChange = (categoryId: number) => {
        setSelectedCategoryId(categoryId);
        setSelectedSubcategoryId(null);
        setSelectedItemTypeId(null);
        setSubcategories([]);
        setItemTypes([]);
        if (categoryId) {
            loadSubcategories(categoryId);
        }
    };

    const handleSubcategoryChange = (subcategoryId: number) => {
        setSelectedSubcategoryId(subcategoryId);
        setSelectedItemTypeId(null);
        setItemTypes([]);
        if (subcategoryId) {
            loadItemTypes(subcategoryId);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling

        // Strict double-submit prevention
        if (loading) {
            console.log('⚠️ Already submitting, blocked duplicate request');
            return;
        }

        if (!selectedItemTypeId) {
            alert('الرجاء اختيار التصنيف الكامل (التصنيف الرئيسي → الفرعي → نوع الصنف)');
            return;
        }

        setLoading(true);

        try {
            // Create base payload without initialStock first
            const { initialStock, ...baseData } = formData;
            
            const payload = {
                ...baseData,
                itemTypeId: selectedItemTypeId,
                categoryId: selectedCategoryId,
            };

            console.log('✅ Submitting product:', payload);

            if (product) {
                // Update: Send payload WITHOUT initialStock
                await apiClient.patch(`/products/${product.id}`, payload);
            } else {
                // Create: Include initialStock
                await apiClient.post('/products', { ...payload, initialStock });
            }

            console.log('✅ Product saved successfully!');

            // Success - close immediately
            onSave();
            onClose();

        } catch (error: any) {
            console.error('❌ Error saving product:', error);

            // Better error handling
            let errorMessage = 'فشل حفظ المنتج';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 409) {
                errorMessage = 'يوجد منتج بنفس الكود أو الباركود بالفعل';
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'خطأ في الاتصال بالخادم';
            }

            alert(errorMessage);

            // Only re-enable on error
            setLoading(false);
        }
        // Don't set loading to false on success
    };



    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    maxWidth: '900px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            color: '#6b7280',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* ========================================== */}
                    {/* HIERARCHY SELECTION (3 LEVELS) */}
                    {/* ========================================== */}
                    <div
                        style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '0.5rem',
                            color: 'white',
                        }}
                    >
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
                            🏷️ التصنيف (3 مستويات)
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {/* Category */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    1️⃣ التصنيف الرئيسي *
                                </label>
                                <select
                                    value={selectedCategoryId || ''}
                                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                    }}
                                >
                                    <option value="">اختر التصنيف...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nameAr || cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subcategory */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    2️⃣ التصنيف الفرعي *
                                </label>
                                <select
                                    value={selectedSubcategoryId || ''}
                                    onChange={(e) => handleSubcategoryChange(Number(e.target.value))}
                                    required
                                    disabled={!selectedCategoryId || subcategories.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                        opacity: !selectedCategoryId ? 0.6 : 1,
                                    }}
                                >
                                    <option value="">
                                        {!selectedCategoryId ? 'اختر التصنيف أولاً...' : 'اختر التصنيف الفرعي...'}
                                    </option>
                                    {subcategories.map((sub) => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.nameAr || sub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Item Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    3️⃣ نوع الصنف *
                                </label>
                                <select
                                    value={selectedItemTypeId || ''}
                                    onChange={(e) => setSelectedItemTypeId(Number(e.target.value))}
                                    required
                                    disabled={!selectedSubcategoryId || itemTypes.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                        opacity: !selectedSubcategoryId ? 0.6 : 1,
                                    }}
                                >
                                    <option value="">
                                        {!selectedSubcategoryId ? 'اختر التصنيف الفرعي أولاً...' : 'اختر نوع الصنف...'}
                                    </option>
                                    {itemTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.nameAr || type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Breadcrumb Preview */}
                        {selectedCategoryId && (
                            <div
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'center',
                                }}
                            >
                                <strong>المسار الكامل:</strong>{' '}
                                {categories.find((c) => c.id === selectedCategoryId)?.nameAr || 'التصنيف'}
                                {selectedSubcategoryId && (
                                    <>
                                        {' → '}
                                        {subcategories.find((s) => s.id === selectedSubcategoryId)?.nameAr || 'التصنيف الفرعي'}
                                    </>
                                )}
                                {selectedItemTypeId && (
                                    <>
                                        {' → '}
                                        {itemTypes.find((t) => t.id === selectedItemTypeId)?.nameAr || 'نوع الصنف'}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========================================== */}
                    {/* PRODUCT DETAILS */}
                    {/* ========================================== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {/* English Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الاسم (English) *
                            </label>
                            <input
                                type="text"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Arabic Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الاسم (عربي)
                            </label>
                            <input
                                type="text"
                                value={formData.nameAr}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    textAlign: 'right',
                                }}
                            />
                        </div>

                        {/* Barcode */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الباركود *</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Code */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الكود (اتركه فارغاً للإنشاء التلقائي)
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="سيتم توليده تلقائياً"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Brand */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الماركة</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Unit */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الوحدة *</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="PCS">PCS - قطعة</option>
                                <option value="BOX">BOX - علبة</option>
                                <option value="KG">KG - كيلو</option>
                                <option value="L">L - لتر</option>
                                <option value="M">M - متر</option>
                            </select>
                        </div>

                        {/* Cost */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                سعر التكلفة (Cost) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Retail Price */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                سعر البيع (قطاعي) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.priceRetail}
                                onChange={(e) => setFormData({ ...formData, priceRetail: Number(e.target.value) })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Wholesale Price */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                سعر البيع (جملة)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.priceWholesale}
                                onChange={(e) => setFormData({ ...formData, priceWholesale: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Min Qty */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الحد الأدنى</label>
                            <input
                                type="number"
                                value={formData.minQty}
                                onChange={(e) => setFormData({ ...formData, minQty: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Max Qty */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الحد الأقصى</label>
                            <input
                                type="number"
                                value={formData.maxQty}
                                onChange={(e) => setFormData({ ...formData, maxQty: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>
                        {/* ✅ UPDATED INITIAL STOCK FIELD */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                📦 {product ? 'الكمية الحالية في المخزون' : 'الكمية الابتدائية (عند الإنشاء فقط)'}
                            </label>
                            <input
                                type="number"
                                value={formData.initialStock}
                                onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                                min="0"
                                disabled={!!product} // Disabled when editing
                                placeholder={product ? 'للتعديل استخدم صفحة جرد المخزون' : 'أدخل الكمية الابتدائية'}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    background: product ? '#f3f4f6' : 'white',
                                    cursor: product ? 'not-allowed' : 'text',
                                    opacity: product ? 0.6 : 1,
                                    fontWeight: product ? 600 : 400,
                                    color: product ? '#374151' : 'inherit',
                                }}
                            />
                            {!product && (
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    💡 سيتم إضافة هذه الكمية تلقائياً إلى المخزون
                                </p>
                            )}
                            {product && (
                                <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.25rem', fontWeight: 500 }}>
                                    ℹ️ هذا هو الرصيد الحالي - للتعديل اذهب إلى صفحة "جرد المخزون"
                                </p>
                            )}
                        </div>

                        {/* Active Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="active" style={{ fontWeight: '600', cursor: 'pointer' }}>
                                منتج نشط
                            </label>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* ACTION BUTTONS */}
                    {/* ========================================== */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: loading ? '#9ca3af' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '1rem',
                                opacity: loading ? 0.6 : 1,
                                pointerEvents: loading ? 'none' : 'auto', // 👈 IMPORTANT: Prevents all clicks
                            }}
                        >
                            {loading ? 'جاري الحفظ...' : product ? 'تحديث المنتج' : 'حفظ المنتج'}
                        </button>


                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: '#e5e7eb',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                            }}
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
