import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import apiClient from '../api/client';

const styles = {
    container: { padding: '20px', fontFamily: 'inherit' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' },
    card: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '20px' },
    tableContainer: { overflowX: 'auto' as const },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px', textAlign: 'right' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#475569' },
    td: { padding: '12px', textAlign: 'right' as const, borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' },
    badgeSuccess: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', background: '#dcfce7', color: '#166534' },
    badgeNeutral: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', background: '#f1f5f9', color: '#64748b' },
    btnReturn: { padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: '#3b82f6', color: 'white', transition: 'all 0.2s' },
    modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'white', borderRadius: '12px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalHeader: { padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e293b' },
    modalBody: { padding: '20px', overflowY: 'auto' as const, flex: 1 },
    modalFooter: { padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '28px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 },
    btnConfirm: { padding: '10px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: '#10b981', color: 'white' },
    btnCancel: { padding: '10px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: '#f1f5f9', color: '#475569' },
    errorBanner: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
    successBanner: { background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }
};

interface ReturnItem {
    lineId: string;
    productId: number;
    productName: string;
    barcode: string;
    availableToReturn: number;
    returnQty: number;
    unitPrice: number;
    refundAmount: number;
    returnType: 'STOCK' | 'DEFECTIVE';
}

interface DefectedProductPricing {
    lineId: string;
    priceRetail: string;
    priceWholesale: string;
}

export default function Returns() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [defectedPricing, setDefectedPricing] = useState<DefectedProductPricing[]>([]);
    const [defectiveStatus, setDefectiveStatus] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const branchId = JSON.parse(localStorage.getItem('user') || '{}').branch?.id;
            if (!branchId) {
                setError('لم يتم العثور على الفرع');
                setLoading(false);
                return;
            }

            const { data } = await apiClient.get(`/pos/sales?branchId=${branchId}`);
            setInvoices(data.data || []);
        } catch (err: any) {
            console.error('Failed to fetch invoices:', err);
            setError('فشل تحميل الفواتير');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReturn = async (invoice: any) => {
        try {
            setError('');
            const branchId = JSON.parse(localStorage.getItem('user') || '{}').branch?.id;

            const { data: fullInvoice } = await apiClient.get(
                `/pos/sales/${invoice.id}?branchId=${branchId}`
            );

            const { data: existingReturns } = await apiClient.get(
                `/pos/returns?salesInvoiceId=${invoice.id}`
            );

            const returnedQty = new Map<number, number>();
            existingReturns.data?.forEach((ret: any) => {
                ret.lines?.forEach((line: any) => {
                    const current = returnedQty.get(line.productId) || 0;
                    returnedQty.set(line.productId, current + line.qtyReturned);
                });
            });

            console.log('Full invoice lines:', fullInvoice.lines);
            const items = fullInvoice.lines.map((line: any, index: number) => {
                // Handle both nested product object and direct productId
                const productId = line.productId || line.product?.id;
                const productName = line.productName || line.product?.nameAr || line.product?.nameEn;
                const barcode = line.barcode || line.product?.barcode;

                const alreadyReturned = returnedQty.get(productId) || 0;
                const availableToReturn = line.qty - alreadyReturned;

                return {
                    lineId: `${productId}-${index}`,  // Unique identifier
                    productId: productId,
                    productName: productName,
                    barcode: barcode,
                    availableToReturn,
                    returnQty: 0,
                    unitPrice: line.unitPrice,
                    refundAmount: 0,
                    returnType: 'STOCK' as 'STOCK' | 'DEFECTIVE',
                };
            });

            console.log('Created return items:', items);
            setReturnItems(items);
            setSelectedInvoice(invoice);
            setShowModal(true);
        } catch (err) {
            console.error('Failed to open return modal:', err);
            setError('فشل فتح نافذة الإرجاع');
        }
    };

    // ✅ FIXED: Properly update only the specific product
    const updateReturnQty = (lineId: string, qty: number) => {
        setReturnItems(prevItems =>
            prevItems.map(item => {
                // Only update the item with matching lineId
                if (item.lineId === lineId) {
                    const validQty = Math.max(0, Math.min(qty, item.availableToReturn));
                    return {
                        ...item,
                        returnQty: validQty,
                        refundAmount: validQty * item.unitPrice,
                    };
                }
                // Return other items unchanged
                return item;
            })
        );
    };

    const checkDefectiveStatus = async (productId: number, lineId: string) => {
        try {
            const response = await apiClient.get(`/pos/returns/check-defective/${productId}`);
            setDefectiveStatus(prev => ({
                ...prev,
                [lineId]: response.data
            }));
        } catch (error) {
            console.error('Failed to check defective status:', error);
        }
    };
    // ✅ FIXED: Properly update only the specific product's return type
    const updateReturnType = (lineId: string, type: 'STOCK' | 'DEFECTIVE') => {
        setReturnItems(prevItems =>
            prevItems.map(item => {
                if (item.lineId === lineId) {
                    // Check defective status when switching to DEFECTIVE
                    if (type === 'DEFECTIVE') {
                        checkDefectiveStatus(item.productId, lineId);
                    }
                    return { ...item, returnType: type };
                }
                return item;
            })
        );
    };

    // Update defected product pricing
    const updateDefectedPricing = (lineId: string, field: 'priceRetail' | 'priceWholesale', value: string) => {
        setDefectedPricing(prev => {
            const existing = prev.find(p => p.lineId === lineId);
            if (existing) {
                return prev.map(p =>
                    p.lineId === lineId
                        ? { ...p, [field]: value }
                        : p
                );
            } else {
                return [...prev, { lineId, priceRetail: '', priceWholesale: '', [field]: value }];
            }
        });
    };

    // Get defected pricing for a line
    const getDefectedPricing = (lineId: string): DefectedProductPricing => {
        return defectedPricing.find(p => p.lineId === lineId) || {
            lineId,
            priceRetail: '',
            priceWholesale: ''
        };
    };


    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError('');

            const returnLines = returnItems
                .filter(item => item.returnQty > 0)
                .map(i => {
                    const line: any = {
                        productId: i.productId,
                        qtyReturned: i.returnQty,
                        refundAmount: i.refundAmount,
                        returnType: i.returnType,
                    };

                    if (i.returnType === 'DEFECTIVE') {
                        const pricing = getDefectedPricing(i.lineId);
                        if (pricing.priceRetail && pricing.priceWholesale) {
                            line.defectedProductPricing = {
                                priceRetail: parseFloat(pricing.priceRetail),
                                priceWholesale: parseFloat(pricing.priceWholesale)
                            };
                        }
                    }

                    return line;
                });

            if (returnLines.length === 0) {
                alert('يرجى تحديد المنتجات المراد إرجاعها');
                setSubmitting(false);
                return;
            }

            await apiClient.post('/pos/returns', {
                salesInvoiceId: selectedInvoice.id,
                items: returnLines,
                reason
            });

            setSuccess('✅ تم إنشاء طلب الإرجاع بنجاح');
            setShowModal(false);
            setDefectedPricing([]);
            fetchInvoices();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Failed to submit return:', err);

            // Better error message
            let errorMessage = 'فشل إنشاء طلب الإرجاع';

            if (err.response?.data?.message) {
                const backendMessage = err.response.data.message;

                // Check if it's the pricing error
                if (backendMessage.includes('pricing is required')) {
                    errorMessage = '⚠️ يرجى إدخال أسعار البيع للمنتجات المعيبة (المرجعة لأول مرة)';
                } else {
                    errorMessage = backendMessage;
                }
            }

            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredInvoices = invoices;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>إدارة المرتجعات واسترداد الأموال</h1>
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}
            {success && <div style={styles.successBanner}>{success}</div>}

            <div style={styles.card}>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>رقم الفاتورة</th>
                                <th style={styles.th}>التاريخ</th>
                                <th style={styles.th}>العميل</th>
                                <th style={styles.th}>الفرع</th>
                                <th style={styles.th}>الإجمالي</th>
                                <th style={styles.th}>الحالة</th>
                                <th style={styles.th}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={styles.td}>جاري التحميل...</td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={styles.td}>لا توجد فواتير</td>
                                </tr>
                            ) : (
                                filteredInvoices.map(inv => (
                                    <tr
                                        key={inv.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                        style={{ transition: 'background 0.2s' }}
                                    >
                                        <td style={styles.td}>#{inv.invoiceNo}</td>
                                        <td style={styles.td}>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                                        <td style={styles.td}>{inv.customer?.name || 'عميل نقدي'}</td>
                                        <td style={styles.td}>{inv.branch.name}</td>
                                        <td style={styles.td}>{Number(inv.total).toFixed(2)} ر.س</td>
                                        <td style={styles.td}>
                                            <span style={styles.badgeSuccess}>مكتملة</span>
                                        </td>
                                        <td style={styles.td}>
                                            <button style={styles.btnReturn} onClick={() => handleOpenReturn(inv)}>
                                                إرجاع
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>إرجاع منتجات - فاتورة #{selectedInvoice?.invoiceNo}</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>المنتج</th>
                                            <th style={styles.th}>الباركود</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>متاح للإرجاع</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>الكمية</th>
                                            <th style={styles.th}>نوع الإرجاع</th>
                                            <th style={styles.th}>السعر</th>
                                            <th style={styles.th}>استرداد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnItems.map(item => (
                                            <tr key={item.lineId} style={{ background: item.availableToReturn === 0 ? '#f9fafb' : 'white' }}>
                                                <td style={{ ...styles.td, opacity: item.availableToReturn === 0 ? 0.5 : 1 }}>
                                                    {item.productName}
                                                </td>
                                                <td style={{ ...styles.td, fontFamily: 'monospace', color: '#64748b' }}>
                                                    {item.barcode}
                                                </td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    <span style={item.availableToReturn > 0 ? styles.badgeSuccess : styles.badgeNeutral}>
                                                        {item.availableToReturn}
                                                    </span>
                                                </td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    {item.availableToReturn > 0 ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <button
                                                                onClick={() => updateReturnQty(item.lineId, item.returnQty - 1)}
                                                                disabled={item.returnQty === 0}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #cbd5e1',
                                                                    background: 'white',
                                                                    cursor: item.returnQty === 0 ? 'not-allowed' : 'pointer',
                                                                    opacity: item.returnQty === 0 ? 0.5 : 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>
                                                                {item.returnQty}
                                                            </span>
                                                            <button
                                                                onClick={() => updateReturnQty(item.lineId, item.returnQty + 1)}
                                                                disabled={item.returnQty >= item.availableToReturn}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '6px',
                                                                    border: 'none',
                                                                    background: item.returnQty >= item.availableToReturn ? '#cbd5e1' : '#3b82f6',
                                                                    color: 'white',
                                                                    cursor: item.returnQty >= item.availableToReturn ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    {item.returnQty > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <select
                                                                value={item.returnType}
                                                                onChange={(e) => {
                                                                    console.log(`Changing line ${item.lineId} product ${item.productId} to ${e.target.value}`);
                                                                    updateReturnType(item.lineId, e.target.value as 'STOCK' | 'DEFECTIVE');
                                                                }}
                                                                style={{
                                                                    padding: '0.5rem',
                                                                    borderRadius: '0.375rem',
                                                                    border: '1px solid #d1d5db',
                                                                    background: item.returnType === 'DEFECTIVE' ? '#fee2e2' : '#f0fdf4',
                                                                    color: item.returnType === 'DEFECTIVE' ? '#7f1d1d' : '#14532d',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.875rem',
                                                                    width: '100%'
                                                                }}
                                                            >
                                                                <option value="STOCK">إعادة للمخزن</option>
                                                                <option value="DEFECTIVE">معيب</option>
                                                            </select>

                                                            {/* Price inputs for defected items */}
                                                            {item.returnType === 'DEFECTIVE' && (
                                                                <div style={{
                                                                    padding: '10px',
                                                                    background: defectiveStatus[item.lineId]?.exists ? '#f0f9ff' : '#fef3c7',
                                                                    border: `2px solid ${defectiveStatus[item.lineId]?.exists ? '#3b82f6' : '#fbbf24'}`,
                                                                    borderRadius: '8px',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    {/* Status Badge */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '8px',
                                                                        marginBottom: '10px',
                                                                        paddingBottom: '8px',
                                                                        borderBottom: '1px solid #e5e7eb'
                                                                    }}>
                                                                        {defectiveStatus[item.lineId] ? (
                                                                            defectiveStatus[item.lineId].exists ? (
                                                                                <>
                                                                                    <span style={{
                                                                                        fontSize: '11px',
                                                                                        padding: '4px 10px',
                                                                                        background: '#dbeafe',
                                                                                        color: '#1e40af',
                                                                                        borderRadius: '6px',
                                                                                        fontWeight: '600',
                                                                                        border: '1px solid #3b82f6'
                                                                                    }}>
                                                                                        ✓ منتج معيب موجود مسبقاً
                                                                                    </span>
                                                                                    <span style={{
                                                                                        fontSize: '10px',
                                                                                        color: '#64748b'
                                                                                    }}>
                                                                                        سيتم إضافة الكمية للمنتج الموجود
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span style={{
                                                                                        fontSize: '11px',
                                                                                        padding: '4px 10px',
                                                                                        background: '#fef3c7',
                                                                                        color: '#92400e',
                                                                                        borderRadius: '6px',
                                                                                        fontWeight: '600',
                                                                                        border: '1px solid #fbbf24'
                                                                                    }}>
                                                                                        ★ منتج معيب جديد
                                                                                    </span>
                                                                                    <span style={{
                                                                                        fontSize: '10px',
                                                                                        color: '#dc2626',
                                                                                        fontWeight: '600'
                                                                                    }}>
                                                                                        يجب إدخال أسعار البيع
                                                                                    </span>
                                                                                </>
                                                                            )
                                                                        ) : (
                                                                            <span style={{
                                                                                fontSize: '11px',
                                                                                padding: '4px 10px',
                                                                                background: '#f1f5f9',
                                                                                color: '#64748b',
                                                                                borderRadius: '6px',
                                                                                fontWeight: '600'
                                                                            }}>
                                                                                ⏳ جاري التحقق...
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Original Product Price Reference */}
                                                                    {defectiveStatus[item.lineId]?.originalProduct && (
                                                                        <div style={{
                                                                            background: '#f8fafc',
                                                                            padding: '8px',
                                                                            borderRadius: '6px',
                                                                            marginBottom: '10px',
                                                                            fontSize: '11px'
                                                                        }}>
                                                                            <div style={{ fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                                                                📋 السعر الأصلي للمنتج:
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '16px', color: '#64748b' }}>
                                                                                <span>تجزئة: <strong>{Number(defectiveStatus[item.lineId].originalProduct.priceRetail).toFixed(2)} ج.م</strong></span>
                                                                                <span>جملة: <strong>{Number(defectiveStatus[item.lineId].originalProduct.priceWholesale).toFixed(2)} ج.م</strong></span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Existing Defective Price Info */}
                                                                    {defectiveStatus[item.lineId]?.exists && defectiveStatus[item.lineId]?.defectiveProduct && (
                                                                        <div style={{
                                                                            background: '#ecfdf5',
                                                                            padding: '8px',
                                                                            borderRadius: '6px',
                                                                            marginBottom: '10px',
                                                                            fontSize: '11px',
                                                                            border: '1px solid #10b981'
                                                                        }}>
                                                                            <div style={{ fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>
                                                                                💰 السعر الحالي للمنتج المعيب:
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '16px', color: '#047857' }}>
                                                                                <span>تجزئة: <strong>{Number(defectiveStatus[item.lineId].defectiveProduct.priceRetail).toFixed(2)} ج.م</strong></span>
                                                                                <span>جملة: <strong>{Number(defectiveStatus[item.lineId].defectiveProduct.priceWholesale).toFixed(2)} ج.م</strong></span>
                                                                            </div>
                                                                            <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px' }}>
                                                                                💡 اترك الحقول فارغة لاستخدام هذه الأسعار، أو أدخل أسعار جديدة للتحديث
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Price Input Fields */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                fontSize: '11px',
                                                                                color: '#475569',
                                                                                marginBottom: '4px',
                                                                                fontWeight: '600'
                                                                            }}>
                                                                                <span>سعر التجزئة الجديد:</span>
                                                                                {defectiveStatus[item.lineId]?.exists ? (
                                                                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '400' }}>
                                                                                        (اختياري)
                                                                                    </span>
                                                                                ) : defectiveStatus[item.lineId] ? (
                                                                                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600' }}>
                                                                                        (مطلوب)
                                                                                    </span>
                                                                                ) : null}
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                placeholder={
                                                                                    defectiveStatus[item.lineId]?.exists && defectiveStatus[item.lineId]?.defectiveProduct
                                                                                        ? `الحالي: ${Number(defectiveStatus[item.lineId].defectiveProduct.priceRetail).toFixed(2)}`
                                                                                        : 'أدخل سعر التجزئة'
                                                                                }
                                                                                value={getDefectedPricing(item.lineId).priceRetail}
                                                                                onChange={(e) => updateDefectedPricing(item.lineId, 'priceRetail', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '6px 10px',
                                                                                    border: `1px solid ${defectiveStatus[item.lineId]?.exists ? '#10b981' : '#fbbf24'}`,
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    outline: 'none'
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <label style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                fontSize: '11px',
                                                                                color: '#475569',
                                                                                marginBottom: '4px',
                                                                                fontWeight: '600'
                                                                            }}>
                                                                                <span>سعر الجملة الجديد:</span>
                                                                                {defectiveStatus[item.lineId]?.exists ? (
                                                                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '400' }}>
                                                                                        (اختياري)
                                                                                    </span>
                                                                                ) : defectiveStatus[item.lineId] ? (
                                                                                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600' }}>
                                                                                        (مطلوب)
                                                                                    </span>
                                                                                ) : null}
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                placeholder={
                                                                                    defectiveStatus[item.lineId]?.exists && defectiveStatus[item.lineId]?.defectiveProduct
                                                                                        ? `الحالي: ${Number(defectiveStatus[item.lineId].defectiveProduct.priceWholesale).toFixed(2)}`
                                                                                        : 'أدخل سعر الجملة'
                                                                                }
                                                                                value={getDefectedPricing(item.lineId).priceWholesale}
                                                                                onChange={(e) => updateDefectedPricing(item.lineId, 'priceWholesale', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '6px 10px',
                                                                                    border: `1px solid ${defectiveStatus[item.lineId]?.exists ? '#10b981' : '#fbbf24'}`,
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    outline: 'none'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}



                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>{item.unitPrice.toFixed(2)}</td>
                                                <td style={{ ...styles.td, fontWeight: 'bold', color: item.refundAmount > 0 ? '#16a34a' : '#cbd5e1' }}>
                                                    {item.refundAmount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '14px', color: '#475569' }}>
                                    السبب (اختياري)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="اكتب سبب الإرجاع..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        minHeight: '80px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        resize: 'vertical' as const
                                    }}
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.btnCancel} onClick={() => setShowModal(false)}>
                                إلغاء
                            </button>
                            <button style={styles.btnConfirm} onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'جاري الإرجاع...' : 'تأكيد الإرجاع'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}