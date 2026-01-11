import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, Printer, RotateCcw, AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';

interface SaleDetail {
    id: number;
    invoiceNo: string;
    total: number;
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    platformCommission: number;
    shippingFee: number;
    costOfGoods: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    paymentMethod: string;
    paymentStatus: string;
    channel: string;
    notes: string;
    createdAt: string;
    customer: {
        name: string;
        type: string;
    } | null;
    branch: {
        name: string;
    };
    user: {
        fullName: string;
    };
    lines: Array<{
        id: number;
        qty: number;
        unitPrice: number;
        lineTotal: number;
        taxRate: number;
        product: {
            nameEn: string;
            nameAr?: string;
            barcode: string;
        };
        productId: number;
    }>;
}

interface ReturnData {
    id: number;
    createdAt: string;
    reason: string;
    totalRefund: number;
    lines: Array<{
        id: number;
        productId: number;
        qtyReturned: number;
        refundAmount: number;
        product: {
            nameAr: string;
            nameEn: string;
            barcode: string;
        };
    }>;
}

export default function SalesDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [returns, setReturns] = useState<ReturnData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setError(false);

                // Fetch sale details
                const saleResponse = await apiClient.get(`/pos/sales/${id}`);
                setSale(saleResponse.data);

                // Fetch returns for this invoice
                const returnsResponse = await apiClient.get('/pos/returns', {
                    params: { salesInvoiceId: id }
                });
                setReturns(returnsResponse.data.data || []);

            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    // Calculate totals after returns
    const totalRefunded = returns.reduce((sum, ret) => sum + Number(ret.totalRefund || 0), 0);
    const netRevenue = sale ? Number(sale.total) - totalRefunded : 0;

    // Calculate returned quantities per product
    const getReturnedQty = (productId: number) => {
        return returns.reduce((sum, ret) => {
            const line = ret.lines.find(l => l.productId === productId);
            return sum + (line ? line.qtyReturned : 0);
        }, 0);
    };

    const InfoCard = ({ label, value }: { label: string; value: string }) => (
        <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
        }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>{value}</div>
        </div>
    );

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontSize: '18px',
                color: '#6b7280'
            }}>
                جاري تحميل تفاصيل الفاتورة...
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                gap: '20px'
            }}>
                <div style={{ fontSize: '48px' }}>⚠️</div>
                <div style={{ fontSize: '20px', color: '#dc2626', fontWeight: 'bold' }}>
                    فشل تحميل تفاصيل الفاتورة
                </div>
                <button
                    onClick={() => navigate('/sales')}
                    style={{
                        padding: '10px 20px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    العودة إلى المبيعات
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Print Styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .thermal-receipt, .thermal-receipt * { visibility: visible; }
                    .thermal-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        background: white;
                    }
                    .no-print { display: none !important; }
                    @page {
                        margin: 5mm 0;
                        size: 80mm auto;
                    }
                    * { font-family: 'Courier New', monospace; }
                }
            `}</style>

            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Screen Header */}
                <div className="no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    paddingBottom: '20px',
                    borderBottom: '2px solid #e5e7eb'
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                            تفاصيل الفاتورة #{sale.invoiceNo}
                        </h1>
                        {returns.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                                <RotateCcw size={18} />
                                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                                    تحتوي على {returns.length} عملية إرجاع
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => navigate('/sales')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            <ArrowRight size={18} />
                            رجوع
                        </button>
                        <button
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            <Printer size={18} />
                            طباعة
                        </button>
                    </div>
                </div>

                {/* Thermal Receipt (Same as before) */}
                <div className="thermal-receipt" style={{
                    maxWidth: '80mm',
                    margin: '0 auto',
                    background: 'white',
                    padding: '10mm 5mm',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000'
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                            City Tools System
                        </div>
                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>{sale.branch.name}</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>نظام إدارة الأدوات والمبيعات</div>
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                    {/* Invoice Info */}
                    <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>رقم الفاتورة:</span>
                            <span style={{ fontWeight: 'bold' }}>{sale.invoiceNo}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>التاريخ:</span>
                            <span>{new Date(sale.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>الوقت:</span>
                            <span>{new Date(sale.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>الموظف:</span>
                            <span>{sale.user.fullName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>العميل:</span>
                            <span>{sale.customer?.name || 'نقدي'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>الدفع:</span>
                            <span>{sale.paymentMethod}</span>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                    {/* Products */}
                    <div style={{ marginBottom: '8px' }}>
                        {sale.lines.map(line => {
                            // ✅ Calculate line subtotal (before tax)
                            const lineSubtotal = line.qty * Number(line.unitPrice);

                            return (
                                <div key={line.id} style={{ marginBottom: '6px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                                        {line.product.nameAr || line.product.nameEn}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                        <span>{line.qty} x {Number(line.unitPrice).toFixed(2)}</span>
                                        {/* ✅ Show subtotal without tax */}
                                        <span style={{ fontWeight: 'bold' }}>{lineSubtotal.toFixed(2)} ر.س</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>


                    <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                    {/* Totals */}
                    <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span>المجموع الفرعي:</span>
                            <span>{Number(sale.subtotal).toFixed(2)} ر.س</span>
                        </div>
                        {Number(sale.totalDiscount) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span>الخصم:</span>
                                <span>-{Number(sale.totalDiscount).toFixed(2)} ر.س</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span>الضريبة:</span>
                            <span>+{Number(sale.totalTax).toFixed(2)} ر.س</span>
                        </div>
                    </div>

                    <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <span>الإجمالي:</span>
                        <span>{Number(sale.total).toFixed(2)} ر.س</span>
                    </div>

                    <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

                    {sale.notes && (
                        <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>ملاحظات:</div>
                            <div>{sale.notes}</div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '10px' }}>
                        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>شكراً لتعاملكم معنا</div>
                        <div style={{ fontSize: '9px', marginBottom: '4px' }}>Thank you for your business</div>
                        <div style={{ fontSize: '9px', color: '#666' }}>{new Date().toLocaleString('ar-EG')}</div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
                        <div style={{ background: '#000', height: '2px', width: '60%', margin: '0 auto 2px' }} />
                        <div style={{ background: '#000', height: '3px', width: '50%', margin: '0 auto 2px' }} />
                        <div style={{ background: '#000', height: '2px', width: '70%', margin: '0 auto 4px' }} />
                        <div>{sale.invoiceNo}</div>
                    </div>
                </div>

                {/* Screen-only Details */}
                <div className="no-print" style={{ marginTop: '40px' }}>
                    {/* Info Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <InfoCard
                            label="التاريخ والوقت"
                            value={new Date(sale.createdAt).toLocaleString('ar-EG', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })}
                        />
                        <InfoCard label="الموظف" value={sale.user.fullName} />
                        <InfoCard label="طريقة الدفع" value={sale.paymentMethod} />
                        <InfoCard label="القناة" value={sale.channel || '-'} />
                        <InfoCard
                            label="العميل"
                            value={sale.customer?.name ? `${sale.customer.name} (${sale.customer.type})` : 'عميل نقدي'}
                        />
                        <InfoCard label="الفرع" value={sale.branch.name} />
                    </div>

                    {/* 🔴 DETAILED ITEMS TABLE with Return History */}
                    <div style={{
                        background: '#ffffff',
                        padding: '24px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#111827',
                            marginBottom: '20px',
                            paddingBottom: '12px',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            📦 تفاصيل المنتجات
                        </h3>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#475569' }}>المنتج</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#475569' }}>الباركود</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#475569' }}>الكمية</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#475569' }}>مرتجع</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#475569' }}>السعر</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#475569' }}>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.lines.map((line) => {
                                        const returnedQty = getReturnedQty(line.productId);
                                        return (
                                            <tr key={line.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#334155' }}>
                                                    {line.product.nameAr || line.product.nameEn}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                                                    {line.product.barcode}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '4px 12px',
                                                        background: '#dbeafe',
                                                        color: '#1e40af',
                                                        borderRadius: '12px',
                                                        fontSize: '13px',
                                                        fontWeight: '600'
                                                    }}>
                                                        {line.qty}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    {returnedQty > 0 ? (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            borderRadius: '12px',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {returnedQty}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#334155' }}>
                                                    {Number(line.unitPrice).toFixed(2)} ر.س
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                                                    {Number(line.lineTotal).toFixed(2)} ر.س
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 🔴 RETURNS SECTION - NEW */}
                    {returns.length > 0 && (
                        <div style={{
                            background: '#fffbeb',
                            padding: '24px',
                            borderRadius: '8px',
                            border: '2px solid #fbbf24',
                            marginBottom: '30px'
                        }}>
                            <h3 style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#92400e',
                                marginBottom: '20px',
                                paddingBottom: '12px',
                                borderBottom: '2px solid #fcd34d'
                            }}>
                                <RotateCcw size={24} />
                                عمليات الإرجاع ({returns.length})
                            </h3>

                            {returns.map((returnData, idx) => (
                                <div key={returnData.id} style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    marginBottom: idx < returns.length - 1 ? '16px' : '0',
                                    border: '1px solid #fde68a'
                                }}>
                                    {/* Return Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '16px',
                                        paddingBottom: '12px',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                                                إرجاع #{idx + 1}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                {new Date(returnData.createdAt).toLocaleString('ar-EG', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            color: '#dc2626'
                                        }}>
                                            -{Number(returnData.totalRefund).toFixed(2)} ر.س
                                        </div>
                                    </div>

                                    {/* Return Reason */}
                                    {returnData.reason && (
                                        <div style={{
                                            background: '#fef3c7',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            marginBottom: '16px',
                                            fontSize: '14px',
                                            color: '#92400e'
                                        }}>
                                            <strong>السبب:</strong> {returnData.reason}
                                        </div>
                                    )}

                                    {/* Returned Items */}
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>المنتج</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>الكمية المرتجعة</th>
                                                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>مبلغ الاسترداد</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returnData.lines.map((line) => (
                                                    <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '10px', fontSize: '14px', color: '#374151' }}>
                                                            {line.product.nameAr || line.product.nameEn}
                                                            <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                                                                {line.product.barcode}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 10px',
                                                                background: '#fee2e2',
                                                                color: '#dc2626',
                                                                borderRadius: '8px',
                                                                fontSize: '13px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {line.qtyReturned}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>
                                                            {Number(line.refundAmount).toFixed(2)} ر.س
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            {/* Returns Summary */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                background: 'white',
                                border: '2px solid #ef4444',
                                borderRadius: '8px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                                        إجمالي المبالغ المستردة:
                                    </span>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                                        -{totalRefunded.toFixed(2)} ر.س
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CORRECTED PROFIT ANALYSIS */}
                    <div
                        style={{
                            background: '#ffffff',
                            padding: '24px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            marginBottom: '30px',
                        }}
                    >
                        <h3
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#111827',
                                marginBottom: '20px',
                                paddingBottom: '12px',
                                borderBottom: '2px solid #e5e7eb',
                            }}
                        >
                            💰 تحليل الربحية
                            {returns.length > 0 && (
                                <span
                                    style={{
                                        fontSize: '14px',
                                        padding: '4px 12px',
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                    }}
                                >
                                    بعد المرتجعات
                                </span>
                            )}
                        </h3>

                        {(() => {
                            // Calculate proportional adjustment based on returns
                            const originalTotal = Number(sale.total) || 0;
                            const totalRefunded = returns.reduce((sum, ret) => sum + Number(ret.totalRefund || 0), 0);
                            const netRevenue = originalTotal - totalRefunded;

                            // Calculate the proportion that remains after returns
                            const remainingProportion = originalTotal > 0 ? netRevenue / originalTotal : 1;

                            // Adjust all values proportionally
                            const adjustedTax = (Number(sale.totalTax) || 0) * remainingProportion;
                            const adjustedCost = (Number(sale.costOfGoods) || 0) * remainingProportion;
                            const adjustedCommission = (Number(sale.platformCommission) || 0) * remainingProportion;
                            const adjustedShipping = (Number(sale.shippingFee) || 0) * remainingProportion; // ✅ NEW

                            // Calculate actual revenue after removing tax component
                            const actualRevenue = netRevenue - adjustedTax;

                            // Calculate gross profit
                            const grossProfit = actualRevenue - adjustedCost;

                            // ✅ UPDATED: Calculate net profit (deduct both commission AND shipping)
                            const netProfit = grossProfit - adjustedCommission - adjustedShipping;

                            // Calculate profit margin
                            const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                                    {/* 1. Original Total */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f9fafb', fontSize: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>💵</span>
                                            <span style={{ fontWeight: 600, color: '#374151' }}>إجمالي الفاتورة الأصلي</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>{originalTotal.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 2. Returns Deduction */}
                                    {returns.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 14px 40px', background: '#ffffff', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#9ca3af' }}>↳</span>
                                                <span style={{ color: '#6b7280' }}>مرتجعات</span>
                                            </div>
                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{totalRefunded.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* 3. Net Revenue After Returns */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '14px 20px',
                                            background: '#eff6ff',
                                            fontSize: '15px',
                                            borderTop: '1px dashed #d1d5db',
                                            borderBottom: '1px dashed #d1d5db',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af' }}>📊</span>
                                            <span style={{ fontWeight: 600, color: '#1e40af' }}>صافي الإيرادات</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '16px' }}>{netRevenue.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 4. Tax (Adjusted) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 14px 40px', background: '#ffffff', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af' }}>↳</span>
                                            <span style={{ color: '#6b7280' }}>
                                                الضريبة {returns.length > 0 && '(معدّلة)'}
                                            </span>
                                        </div>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>-{adjustedTax.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 5. Actual Revenue (Net - Tax) */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '14px 20px',
                                            background: '#f9fafb',
                                            fontSize: '14px',
                                            borderTop: '1px dashed #d1d5db',
                                            borderBottom: '1px dashed #d1d5db',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af' }}>📈</span>
                                            <span style={{ fontWeight: 600, color: '#374151' }}>الإيرادات الفعلية</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#111827' }}>{actualRevenue.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 6. Cost of Goods (Adjusted) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 14px 40px', background: '#ffffff', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af' }}>↳</span>
                                            <span style={{ color: '#6b7280' }}>
                                                تكلفة البضاعة {returns.length > 0 && '(معدّلة)'}
                                            </span>
                                        </div>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>-{adjustedCost.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 7. Gross Profit */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '14px 20px',
                                            background: '#f9fafb',
                                            fontSize: '14px',
                                            borderTop: '1px dashed #d1d5db',
                                            borderBottom: '1px dashed #d1d5db',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af' }}>📦</span>
                                            <span style={{ fontWeight: 600, color: '#374151' }}>إجمالي الربح</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{grossProfit.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* 8. Platform Commission (Adjusted) */}
                                    {adjustedCommission > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 14px 40px', background: '#ffffff', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#9ca3af' }}>↳</span>
                                                <span style={{ color: '#6b7280' }}>
                                                    عمولة المنصة {returns.length > 0 && '(معدّلة)'}
                                                </span>
                                            </div>
                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{adjustedCommission.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* ✅ NEW: 9. Shipping Fee (Adjusted) */}
                                    {adjustedShipping > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 14px 40px', background: '#ffffff', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#9ca3af' }}>↳</span>
                                                <span style={{ color: '#6b7280' }}>
                                                    شحن المنصة {returns.length > 0 && '(معدّل)'}
                                                </span>
                                            </div>
                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{adjustedShipping.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* 10. Final Net Profit */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '18px 20px',
                                            background: netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                                            fontSize: '16px',
                                            borderTop: '2px solid #111827',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '20px' }}>{netProfit >= 0 ? '✅' : '⚠️'}</span>
                                            <span style={{ fontWeight: 'bold', color: '#111827' }}>صافي الربح</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{netProfit.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* Profit Margin Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                                        <div style={{ padding: '10px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', color: '#374151' }}>
                                            <span style={{ fontWeight: 600 }}>هامش الربح: </span>
                                            <span style={{ fontWeight: 'bold', color: profitMargin >= 0 ? '#16a34a' : '#dc2626' }}>{profitMargin.toFixed(2)}%</span>
                                        </div>
                                    </div>

                                    {/* Optional: Show adjustment note if returns exist */}
                                    {returns.length > 0 && (
                                        <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                                            <strong>📝 ملاحظة:</strong> جميع القيم معدّلة بناءً على المرتجعات ({(remainingProportion * 100).toFixed(1)}% من الفاتورة الأصلية)
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>



                </div>
            </div>
        </>
    );
}
