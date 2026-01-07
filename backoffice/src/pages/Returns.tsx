import React, { useState, useEffect } from 'react';
import { Package, Search, RotateCcw, ArrowRight, Minus, Plus, AlertCircle, Check } from 'lucide-react';
import apiClient from '../api/client';

// --- Shared Styles (Matching Sales.tsx) ---
const styles = {
    container: { padding: '20px', fontFamily: 'inherit' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' },
    card: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '1000px' },
    th: { padding: '12px', textAlign: 'right' as const, background: '#f8fafc', fontWeight: '600', borderBottom: '2px solid #e2e8f0', fontSize: '14px', whiteSpace: 'nowrap' as const, color: '#475569' },
    td: { padding: '12px', textAlign: 'right' as const, borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' },
    badgeSuccess: { padding: '4px 12px', background: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    badgeNeutral: { padding: '4px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    buttonPrimary: { padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
    buttonSecondary: { padding: '8px 20px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
    input: { width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
};

// ... (Interfaces remain the same)
interface SalesInvoice {
    id: number;
    invoiceNo: string;
    total: number;
    customer?: { name: string };
    createdAt: string;
    branch: { name: string };
    lines?: any[];
}

interface ReturnItem {
    productId: number;
    productName: string;
    barcode: string;
    originalQty: number;
    alreadyReturned: number;
    availableToReturn: number;
    returnQty: number;
    unitPrice: number;
    refundAmount: number;
}

export default function Returns() {
    const [searchTerm, setSearchTerm] = useState('');
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SalesInvoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ... (Keep all your existing useEffects and functions: fetchInvoices, handleSelectInvoice, etc.)
    // For brevity, I am assuming the logic code is pasted here exactly as it was in your previous file.
    // I will focus on the RETURN statement to fix the UI.

    useEffect(() => { fetchInvoices(); }, []);
    useEffect(() => {
        if (!searchTerm) setFilteredInvoices(invoices);
        else {
            const lower = searchTerm.toLowerCase();
            setFilteredInvoices(invoices.filter(i => i.invoiceNo.toLowerCase().includes(lower) || i.customer?.name?.toLowerCase().includes(lower)));
        }
    }, [searchTerm, invoices]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/pos/sales', { params: { take: 100 } });
            setInvoices(res.data.data || []);
            setFilteredInvoices(res.data.data || []);
        } catch (err: any) { setError('فشل في تحميل البيانات'); } finally { setLoading(false); }
    };

    const handleSelectInvoice = async (invoice: SalesInvoice) => {
        // ... (Paste your exact logic here)
        setLoading(true);
        try {
            const fullInv = (await apiClient.get(`/pos/sales/${invoice.id}`)).data;
            const returns = (await apiClient.get('/pos/returns', { params: { salesInvoiceId: invoice.id } })).data;
            const returnedMap = new Map();
            if (returns.data) returns.data.forEach((r: any) => r.lines.forEach((l: any) => returnedMap.set(l.productId, (returnedMap.get(l.productId) || 0) + l.qtyReturned)));

            setSelectedInvoice(fullInv);
            setReturnItems(fullInv.lines.map((l: any) => {
                const already = returnedMap.get(l.productId) || 0;
                return {
                    productId: l.productId, productName: l.product.nameAr, barcode: l.product.barcode,
                    originalQty: l.qty, alreadyReturned: already, availableToReturn: l.qty - already,
                    returnQty: 0, unitPrice: Number(l.unitPrice), refundAmount: 0
                };
            }));
        } catch (e) { setError('خطأ في تحميل الفاتورة'); } finally { setLoading(false); }
    };

    const updateReturnQty = (pid: number, qty: number) => {
        setReturnItems(prev => prev.map(item => {
            if (item.productId === pid) {
                const valid = Math.max(0, Math.min(qty, item.availableToReturn));
                return { ...item, returnQty: valid, refundAmount: valid * item.unitPrice };
            }
            return item;
        }));
    };

    const handleSubmitReturn = async () => {
        // ... (Paste your exact logic here)
        if (!selectedInvoice) return;
        const items = returnItems.filter(i => i.returnQty > 0);
        if (!items.length) return setError('حدد منتج واحد على الأقل');

        setLoading(true);
        try {
            await apiClient.post('/pos/returns', {
                salesInvoiceId: selectedInvoice.id,
                items: items.map(i => ({ productId: i.productId, qtyReturned: i.returnQty, refundAmount: i.refundAmount })),
                reason
            });
            setSuccess('تم الإرجاع بنجاح');
            setTimeout(() => { setSelectedInvoice(null); setReturnItems([]); fetchInvoices(); }, 2000);
        } catch (e) { setError('فشل العملية'); } finally { setLoading(false); }
    };

    const totalRefund = returnItems.reduce((sum, item) => sum + item.refundAmount, 0);

    return (
        <div style={styles.container} dir="rtl">
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>مرتجعات المبيعات</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>إدارة المرتجعات واسترداد الأموال</p>
                </div>
                {selectedInvoice && (
                    <button onClick={() => setSelectedInvoice(null)} style={styles.buttonSecondary}>
                        <ArrowRight size={16} /> العودة للقائمة
                    </button>
                )}
            </div>

            {/* Alerts */}
            {error && <div style={{ padding: '16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}
            {success && <div style={{ padding: '16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>{success}</div>}

            {!selectedInvoice ? (
                // --- INVOICE LIST VIEW (Matches Sales Table) ---
                <div style={styles.card}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ position: 'relative', maxWidth: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                style={{ ...styles.input, paddingRight: '40px' }}
                                placeholder="بحث برقم الفاتورة..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
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
                                    <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>جاري التحميل...</td></tr>
                                ) : filteredInvoices.map(inv => (
                                    <tr key={inv.id} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'} style={{ transition: 'background 0.2s' }}>
                                        <td style={styles.td}>#{inv.invoiceNo}</td>
                                        <td style={styles.td}>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                                        <td style={styles.td}>{inv.customer?.name || 'عميل نقدي'}</td>
                                        <td style={styles.td}>{inv.branch.name}</td>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{Number(inv.total).toFixed(2)} ر.س</td>
                                        <td style={styles.td}><span style={styles.badgeSuccess}>مكتملة</span></td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleSelectInvoice(inv)}
                                                style={{ ...styles.buttonPrimary, padding: '6px 16px', fontSize: '13px' }}
                                            >
                                                <RotateCcw size={14} /> إرجاع
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // --- RETURN DETAIL VIEW ---
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    {/* Invoice Info Card */}
                    <div style={{ ...styles.card, padding: '20px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>العميل</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{selectedInvoice.customer?.name || 'عميل نقدي'}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>التاريخ</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{new Date(selectedInvoice.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>إجمالي الفاتورة</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#3b82f6' }}>{Number(selectedInvoice.total).toFixed(2)} ر.س</span>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div style={styles.card}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>المنتجات</h3>
                        </div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>المنتج</th>
                                    <th style={styles.th}>الباركود</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>متاح للإرجاع</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>الكمية</th>
                                    <th style={styles.th}>السعر</th>
                                    <th style={styles.th}>استرداد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map(item => (
                                    <tr key={item.productId} style={{ background: item.availableToReturn === 0 ? '#f9fafb' : 'white' }}>
                                        <td style={{ ...styles.td, opacity: item.availableToReturn === 0 ? 0.5 : 1 }}>{item.productName}</td>
                                        <td style={{ ...styles.td, fontFamily: 'monospace', color: '#64748b' }}>{item.barcode}</td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <span style={item.availableToReturn > 0 ? styles.badgeSuccess : styles.badgeNeutral}>
                                                {item.availableToReturn}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            {item.availableToReturn > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} dir="ltr">
                                                    <button
                                                        onClick={() => updateReturnQty(item.productId, item.returnQty - 1)}
                                                        disabled={item.returnQty <= 0}
                                                        style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    ><Minus size={14} /></button>
                                                    <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{item.returnQty}</span>
                                                    <button
                                                        onClick={() => updateReturnQty(item.productId, item.returnQty + 1)}
                                                        disabled={item.returnQty >= item.availableToReturn}
                                                        style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    ><Plus size={14} /></button>
                                                </div>
                                            ) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>}
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

                    {/* Footer Actions */}
                    <div style={styles.card}>
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ width: '60%' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>ملاحظات</label>
                                <input
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    style={styles.input}
                                    placeholder="سبب الإرجاع..."
                                />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ marginBottom: '10px', fontSize: '14px', color: '#64748b' }}>إجمالي الاسترداد</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '16px' }}>
                                    {totalRefund.toFixed(2)} <span style={{ fontSize: '16px', color: '#94a3b8' }}>ر.س</span>
                                </div>
                                <button
                                    onClick={handleSubmitReturn}
                                    disabled={totalRefund === 0 || loading}
                                    style={{ ...styles.buttonPrimary, padding: '12px 32px', opacity: totalRefund === 0 ? 0.5 : 1 }}
                                >
                                    {loading ? 'جاري المعالجة...' : <><Check size={18} /> تأكيد الإرجاع</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
