import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface Sale {
    id: number;
    invoiceNo: string;
    createdAt: string;
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    platformCommission: number;
    total: number;
    channel?: string;
    paymentMethod: string;
    paymentStatus: string;
    customer?: { name: string };
    user: { fullName: string };
    branch: { name: string };
    // ✅ Profit fields
    costOfGoods?: number;
    grossProfit?: number;
    netProfit?: number;
    profitMargin?: number;
}

const Sales: React.FC = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    // ✅ ADDED: Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // ✅ MODIFIED: Added filter dependencies
    useEffect(() => {
        fetchSales();
    }, [paymentMethod, dateFilter, startDate, endDate]);

    // ✅ MODIFIED: Added filter params
    const fetchSales = async () => {
        try {
            const params: any = {};

            if (paymentMethod !== 'ALL') {
                params.paymentMethod = paymentMethod;
            }

            if (dateFilter) {
                params.dateFilter = dateFilter;
                if (dateFilter === 'custom' && startDate && endDate) {
                    params.startDate = startDate;
                    params.endDate = endDate;
                }
            }

            const response = await apiClient.get('/pos/sales', { params });
            setSales(response.data.data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ ADDED: Clear filters function
    const clearFilters = () => {
        setPaymentMethod('ALL');
        setDateFilter('');
        setStartDate('');
        setEndDate('');
    };

    const thStyle: React.CSSProperties = {
        padding: '12px',
        textAlign: 'right',
        background: '#f8fafc',
        fontWeight: '600',
        borderBottom: '2px solid #e2e8f0',
        fontSize: '14px',
        whiteSpace: 'nowrap',
    };

    const tdStyle: React.CSSProperties = {
        padding: '12px',
        textAlign: 'right',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '14px',
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <h2 style={{ margin: 0 }}>المبيعات</h2>

                {/* ✅ ADDED: Filter toggle button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    {showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
                </button>
            </div>

            {/* ✅ ADDED: Filter panel */}
            {showFilters && (
                <div style={{
                    background: '#f8fafc',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            طريقة الدفع
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <option value="ALL">الكل</option>
                            <option value="CASH">نقدي</option>
                            <option value="CARD">بطاقة</option>
                            <option value="TRANSFER">تحويل</option>
                            <option value="INSTAPAY">إنستاباي</option>
                            <option value="FAWRY">فوري</option>
                            <option value="WALLET">محفظة</option>
                            <option value="MIXED">مختلط</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            الفترة الزمنية
                        </label>
                        <select
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                if (e.target.value !== 'custom') {
                                    setStartDate('');
                                    setEndDate('');
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <option value="">كل الفترات</option>
                            <option value="today">اليوم</option>
                            <option value="yesterday">أمس</option>
                            <option value="thisWeek">هذا الأسبوع</option>
                            <option value="thisMonth">هذا الشهر</option>
                            <option value="custom">تاريخ محدد</option>
                        </select>
                    </div>

                    {dateFilter === 'custom' && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    من تاريخ
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    إلى تاريخ
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                />
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={clearFilters}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            مسح الفلاتر
                        </button>
                    </div>
                </div>
            )}

            {/* ORIGINAL TABLE - UNCHANGED */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '1400px'
                    }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>رقم الفاتورة</th>
                                <th style={thStyle}>التاريخ والوقت</th>
                                <th style={thStyle}>العميل</th>
                                <th style={thStyle}>الصافي</th>
                                <th style={thStyle}>الخصم</th>
                                <th style={thStyle}>الضريبة</th>
                                <th style={thStyle}>عمولة المنصة</th>
                                <th style={thStyle}>الإجمالي</th>
                                {/* ✅ Profit Columns */}
                                <th style={{ ...thStyle, background: '#dcfce7' }}>التكلفة</th>
                                <th style={{ ...thStyle, background: '#dcfce7' }}>الربح الصافي</th>
                                <th style={{ ...thStyle, background: '#dcfce7' }}>الهامش %</th>
                                <th style={thStyle}>القناة</th>
                                <th style={thStyle}>المدفوع</th>
                                <th style={thStyle}>بواسطة</th>
                                <th style={thStyle}>الحالة</th>
                                <th style={thStyle}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={16} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td colSpan={16} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                                        لا توجد مبيعات
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr
                                        key={sale.id}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        onClick={() => navigate(`${sale.id}`)}
                                    >
                                        <td style={tdStyle}>{sale.invoiceNo}</td>
                                        <td style={tdStyle}>
                                            {new Date(sale.createdAt).toLocaleString('ar-EG', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                        <td style={tdStyle}>{sale.customer?.name || 'عميل نقدي (Retail)'}</td>
                                        <td style={tdStyle}>{Number(sale.subtotal || 0).toFixed(2)} ر.س</td>
                                        <td style={tdStyle}>
                                            {sale.totalDiscount > 0 ? `-${Number(sale.totalDiscount).toFixed(2)} ر.س` : '-'}
                                        </td>
                                        <td style={tdStyle}>+{Number(sale.totalTax || 0).toFixed(2)} ر.س</td>
                                        <td style={tdStyle}>
                                            {sale.platformCommission > 0 ? `+${Number(sale.platformCommission).toFixed(2)} ر.س` : '-'}
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                            {Number(sale.total).toFixed(2)} ر.س
                                        </td>

                                        {/* ✅ Profit Cells */}
                                        <td style={{ ...tdStyle, background: '#f0fdf4' }}>
                                            {sale.costOfGoods !== undefined ? `${sale.costOfGoods.toFixed(2)} ر.س` : '-'}
                                        </td>
                                        <td style={{
                                            ...tdStyle,
                                            background: '#f0fdf4',
                                            color: (sale.netProfit || 0) >= 0 ? '#16a34a' : '#dc2626',
                                            fontWeight: 'bold'
                                        }}>
                                            {sale.netProfit !== undefined ? `${sale.netProfit.toFixed(2)} ر.س` : '-'}
                                        </td>
                                        <td style={{
                                            ...tdStyle,
                                            background: '#f0fdf4',
                                            color: (sale.profitMargin || 0) >= 0 ? '#16a34a' : '#dc2626',
                                            fontWeight: '600'
                                        }}>
                                            {sale.profitMargin !== undefined ? `${sale.profitMargin.toFixed(1)}%` : '-'}
                                        </td>

                                        <td style={tdStyle}>{sale.channel || '-'}</td>
                                        <td style={tdStyle}>{sale.paymentMethod}</td>
                                        <td style={tdStyle}>{sale.user?.fullName || '-'}</td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: '#dcfce7',
                                                color: '#16a34a',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                مكتملة
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`${sale.id}`);
                                                }}
                                                style={{
                                                    padding: '6px 16px',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                عرض
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Sales;
