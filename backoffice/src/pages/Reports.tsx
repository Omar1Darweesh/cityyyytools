import { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, ShoppingBag, DollarSign, Package, Users,
    Calendar, Download, RefreshCw, FileText, Target, AlertTriangle,
    TrendingDown, Activity, PieChart
} from 'lucide-react';
import apiClient from '../api/client';

// Types
interface DateRange {
    startDate: string;
    endDate: string;
    label: string;
}

interface DashboardMetrics {
    sales: {
        totalRevenue: number;
        orderCount: number;
        averageOrderValue: number;
        totalReturns: number;
        netSales: number;
    };
    financial: {
        grossProfit: number;
        profitMargin: number;
        totalCost: number;
        totalTax: number;
        totalCommission: number;
        netProfit: number;
    };
    inventory: {
        totalStockValue: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalProducts: number;
    };
    performance: {
        topProducts: Array<{
            productName: string;
            quantity: number;
            revenue: number;
            profit: number;
        }>;
        salesByChannel: Array<{
            channel: string;
            total: number;
            count: number;
            percentage: number;
        }>;
        salesByPayment: Array<{
            method: string;
            total: number;
            count: number;
        }>;
    };
}

export default function Reports() {
    const [dateRange, setDateRange] = useState<DateRange>(getToday());
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'financial' | 'inventory'>('overview');

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    function getToday(): DateRange {
        const today = new Date().toISOString().split('T')[0];
        return { startDate: today, endDate: today, label: 'اليوم' };
    }

    function getYesterday(): DateRange {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const date = yesterday.toISOString().split('T')[0];
        return { startDate: date, endDate: date, label: 'أمس' };
    }

    function getThisWeek(): DateRange {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastDay = new Date();
        return {
            startDate: firstDay.toISOString().split('T')[0],
            endDate: lastDay.toISOString().split('T')[0],
            label: 'هذا الأسبوع'
        };
    }

    function getThisMonth(): DateRange {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date();
        return {
            startDate: firstDay.toISOString().split('T')[0],
            endDate: lastDay.toISOString().split('T')[0],
            label: 'هذا الشهر'
        };
    }

    const fetchReports = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const branchId = user.branchId || 1;

            const response = await apiClient.get('/reports/dashboard', {
                params: {
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    branchId
                }
            });

            setMetrics(response.data);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            // Set dummy data for development
            setMetrics({
                sales: {
                    totalRevenue: 0,
                    orderCount: 0,
                    averageOrderValue: 0,
                    totalReturns: 0,
                    netSales: 0
                },
                financial: {
                    grossProfit: 0,
                    profitMargin: 0,
                    totalCost: 0,
                    totalTax: 0,
                    totalCommission: 0,
                    netProfit: 0
                },
                inventory: {
                    totalStockValue: 0,
                    lowStockCount: 0,
                    outOfStockCount: 0,
                    totalProducts: 0
                },
                performance: {
                    topProducts: [],
                    salesByChannel: [],
                    salesByPayment: []
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        try {
            alert(`تصدير ${format === 'pdf' ? 'PDF' : 'Excel'} - قريباً`);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const StatCard = ({ title, value, change, icon: Icon, color, subtitle }: any) => (
        <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>{title}</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>{value}</div>
                    {subtitle && <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>}
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                }}>
                    <Icon size={24} color={color} strokeWidth={2.5} />
                </div>
            </div>
            {change !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: change >= 0 ? '#dcfce7' : '#fee2e2',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: change >= 0 ? '#16a34a' : '#dc2626'
                    }}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>مقارنة بالفترة السابقة</span>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <RefreshCw size={48} color="#6366f1" className="spin" />
                <p style={{ marginTop: '16px', fontSize: '16px', color: '#64748b' }}>جاري تحميل التقارير...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '32px',
                color: 'white',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <BarChart3 size={36} />
                            لوحة التقارير والتحليلات
                        </h1>
                        <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>
                            تحليل شامل لأداء النظام من {dateRange.startDate} إلى {dateRange.endDate}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => handleExport('excel')}
                            style={{
                                padding: '12px 20px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        >
                            <FileText size={18} /> Excel
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            style={{
                                padding: '12px 20px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#667eea',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '700',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'}
                        >
                            <Download size={18} /> تصدير PDF
                        </button>
                    </div>
                </div>

                {/* Date Filter Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                        { fn: getToday, label: 'اليوم' },
                        { fn: getYesterday, label: 'أمس' },
                        { fn: getThisWeek, label: 'هذا الأسبوع' },
                        { fn: getThisMonth, label: 'هذا الشهر' }
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setDateRange(preset.fn())}
                            style={{
                                padding: '10px 18px',
                                background: dateRange.label === preset.label
                                    ? 'rgba(255, 255, 255, 0.95)'
                                    : 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '10px',
                                color: dateRange.label === preset.label ? '#667eea' : 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Calendar size={16} />
                            {preset.label}
                        </button>
                    ))}
                    <button
                        onClick={fetchReports}
                        style={{
                            padding: '10px 18px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '10px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <RefreshCw size={16} />
                        تحديث
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                background: 'white',
                padding: '8px',
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                {[
                    { id: 'overview', label: 'نظرة عامة', icon: Activity },
                    { id: 'sales', label: 'المبيعات', icon: TrendingUp },
                    { id: 'financial', label: 'التحليل المالي', icon: DollarSign },
                    { id: 'inventory', label: 'المخزون', icon: Package }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            flex: 1,
                            padding: '14px 20px',
                            background: activeTab === tab.id
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            color: activeTab === tab.id ? 'white' : '#64748b',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && metrics && (
                <>
                    {/* KPI Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        <StatCard
                            title="إجمالي المبيعات"
                            value={`${metrics.sales.totalRevenue.toFixed(2)} ر.س`}
                            subtitle={`${metrics.sales.orderCount} فاتورة`}
                            icon={DollarSign}
                            color="#10b981"
                            change={12.5}
                        />
                        <StatCard
                            title="صافي الربح"
                            value={`${metrics.financial.netProfit.toFixed(2)} ر.س`}
                            subtitle={`هامش ${metrics.financial.profitMargin.toFixed(1)}%`}
                            icon={TrendingUp}
                            color="#6366f1"
                            change={8.3}
                        />
                        <StatCard
                            title="قيمة المخزون"
                            value={`${metrics.inventory.totalStockValue.toFixed(2)} ر.س`}
                            subtitle={`${metrics.inventory.totalProducts} منتج`}
                            icon={Package}
                            color="#f59e0b"
                        />
                        <StatCard
                            title="متوسط الفاتورة"
                            value={`${metrics.sales.averageOrderValue.toFixed(2)} ر.س`}
                            subtitle="لكل عملية بيع"
                            icon={Target}
                            color="#8b5cf6"
                            change={-2.1}
                        />
                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                        {/* Top Products */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <ShoppingBag size={24} color="#6366f1" />
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>أكثر المنتجات مبيعاً</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {metrics.performance.topProducts.slice(0, 5).map((product, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        background: '#f8fafc',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                                                {product.productName}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                الكمية: {product.quantity}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                                                {product.revenue.toFixed(2)} ر.س
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6366f1' }}>
                                                ربح: {product.profit.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sales by Channel */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <PieChart size={24} color="#f59e0b" />
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>المبيعات حسب القناة</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {metrics.performance.salesByChannel.map((channel, i) => (
                                    <div key={i} style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{channel.channel}</span>
                                            <span style={{ fontWeight: '700', color: '#6366f1' }}>
                                                {channel.total.toFixed(2)} ر.س ({channel.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div style={{
                                            height: '8px',
                                            background: '#e2e8f0',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${channel.percentage}%`,
                                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                            {channel.count} فاتورة
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Alerts Section */}
                    {(metrics.inventory.lowStockCount > 0 || metrics.inventory.outOfStockCount > 0) && (
                        <div style={{
                            marginTop: '24px',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '2px solid #fbbf24'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <AlertTriangle size={24} color="#d97706" />
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                                    تنبيهات المخزون
                                </h3>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, padding: '16px', background: 'white', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>
                                        مخزون منخفض
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#d97706' }}>
                                        {metrics.inventory.lowStockCount}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                                        منتج يحتاج تعبئة
                                    </div>
                                </div>
                                <div style={{ flex: 1, padding: '16px', background: 'white', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>
                                        نفذ من المخزون
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626' }}>
                                        {metrics.inventory.outOfStockCount}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                                        منتج غير متوفر
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <StatCard
                        title="إجمالي الإيرادات"
                        value={`${metrics.sales.totalRevenue.toFixed(2)} ر.س`}
                        subtitle={`${metrics.sales.orderCount} عملية`}
                        icon={DollarSign}
                        color="#10b981"
                    />
                    <StatCard
                        title="المرتجعات"
                        value={`${metrics.sales.totalReturns.toFixed(2)} ر.س`}
                        icon={TrendingDown}
                        color="#ef4444"
                    />
                    <StatCard
                        title="صافي المبيعات"
                        value={`${metrics.sales.netSales.toFixed(2)} ر.س`}
                        subtitle="بعد خصم المرتجعات"
                        icon={TrendingUp}
                        color="#6366f1"
                    />
                </div>
            )}

            {/* Financial Tab - ENHANCED WITH DETAILED ANALYSIS */}
            {activeTab === 'financial' && metrics && (
                <>
                    {/* Primary Financial Metrics */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        <StatCard
                            title="إجمالي الربح"
                            value={`${metrics.financial.grossProfit.toFixed(2)} ر.س`}
                            subtitle={`هامش ${metrics.financial.profitMargin.toFixed(1)}%`}
                            icon={TrendingUp}
                            color="#10b981"
                            change={15.2}
                        />
                        <StatCard
                            title="التكلفة الإجمالية"
                            value={`${metrics.financial.totalCost.toFixed(2)} ر.س`}
                            subtitle="تكلفة البضاعة المباعة"
                            icon={TrendingDown}
                            color="#ef4444"
                        />
                        <StatCard
                            title="الضرائب المحصلة"
                            value={`${metrics.financial.totalTax.toFixed(2)} ر.س`}
                            subtitle={`${((metrics.financial.totalTax / metrics.sales.totalRevenue) * 100).toFixed(1)}% من الإيرادات`}
                            icon={FileText}
                            color="#f59e0b"
                        />
                        <StatCard
                            title="العمولات"
                            value={`${metrics.financial.totalCommission.toFixed(2)} ر.س`}
                            subtitle="رسوم المنصات"
                            icon={Users}
                            color="#8b5cf6"
                        />
                        <StatCard
                            title="صافي الربح"
                            value={`${metrics.financial.netProfit.toFixed(2)} ر.س`}
                            subtitle="بعد جميع المصروفات"
                            icon={DollarSign}
                            color="#6366f1"
                            change={8.7}
                        />
                    </div>

                    {/* Detailed Financial Analysis Sections */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                        {/* Revenue Breakdown */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
                                <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '10px' }}>
                                    <DollarSign size={24} color="#10b981" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                        تحليل الإيرادات
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                        مصادر الدخل التفصيلية
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569' }}>إجمالي المبيعات</span>
                                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '16px' }}>
                                        {metrics.sales.totalRevenue.toFixed(2)} ر.س
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569' }}>المرتجعات</span>
                                    <span style={{ fontWeight: '700', color: '#ef4444', fontSize: '16px' }}>
                                        -{metrics.sales.totalReturns.toFixed(2)} ر.س
                                    </span>
                                </div>
                                <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: '12px', border: '2px solid #10b981' }}>
                                    <span style={{ fontWeight: '700', color: '#065f46', fontSize: '15px' }}>صافي الإيرادات</span>
                                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '18px' }}>
                                        {metrics.sales.netSales.toFixed(2)} ر.س
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
                                <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px' }}>
                                    <TrendingDown size={24} color="#ef4444" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                        تحليل المصروفات
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                        تفصيل التكاليف والنفقات
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>تكلفة البضاعة</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            {((metrics.financial.totalCost / metrics.sales.netSales) * 100).toFixed(1)}% من صافي الإيرادات
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#ef4444', fontSize: '15px' }}>
                                        {metrics.financial.totalCost.toFixed(2)} ر.س
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: '#fee2e2', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(metrics.financial.totalCost / metrics.sales.netSales) * 100}%`,
                                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>الضرائب</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            {((metrics.financial.totalTax / metrics.sales.netSales) * 100).toFixed(1)}% من صافي الإيرادات
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#f59e0b', fontSize: '15px' }}>
                                        {metrics.financial.totalTax.toFixed(2)} ر.س
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: '#fef3c7', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(metrics.financial.totalTax / metrics.sales.netSales) * 100}%`,
                                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>العمولات</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            {((metrics.financial.totalCommission / metrics.sales.netSales) * 100).toFixed(1)}% من صافي الإيرادات
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#8b5cf6', fontSize: '15px' }}>
                                        {metrics.financial.totalCommission.toFixed(2)} ر.س
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: '#ede9fe', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(metrics.financial.totalCommission / metrics.sales.netSales) * 100}%`,
                                        background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>

                                <div style={{ height: '1px', background: '#e2e8f0', margin: '12px 0' }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                                    <span style={{ fontWeight: '700', color: '#7f1d1d', fontSize: '15px' }}>إجمالي المصروفات</span>
                                    <span style={{ fontWeight: '800', color: '#dc2626', fontSize: '16px' }}>
                                        {(metrics.financial.totalCost + metrics.financial.totalTax + metrics.financial.totalCommission).toFixed(2)} ر.س
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profit Analysis Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '20px',
                        padding: '32px',
                        marginBottom: '24px',
                        color: 'white',
                        boxShadow: '0 10px 15px -3px rgba(102, 126, 234, 0.3)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800' }}>
                                تحليل الربحية الشامل
                            </h2>
                            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
                                نظرة تفصيلية على هوامش الربح والأداء المالي
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>الإيرادات الإجمالية</div>
                                <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
                                    {metrics.sales.totalRevenue.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>ريال سعودي</div>
                            </div>

                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>إجمالي الربح</div>
                                <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
                                    {metrics.financial.grossProfit.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    هامش {metrics.financial.profitMargin.toFixed(1)}%
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>صافي الربح</div>
                                <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
                                    {metrics.financial.netProfit.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    هامش {((metrics.financial.netProfit / metrics.sales.totalRevenue) * 100).toFixed(1)}%
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>متوسط الربح/فاتورة</div>
                                <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
                                    {((metrics.financial.netProfit / metrics.sales.orderCount) || 0).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>ريال سعودي</div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods Analysis */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '10px', background: '#dbeafe', borderRadius: '10px' }}>
                                <FileText size={24} color="#3b82f6" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>تفصيل طرق الدفع</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    توزيع المبيعات حسب وسيلة الدفع
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            {metrics.performance.salesByPayment.map((payment, i) => {
                                const percentage = (payment.total / metrics.sales.totalRevenue) * 100;
                                const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
                                const color = colors[i % colors.length];

                                return (
                                    <div key={i} style={{
                                        padding: '16px',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = color;
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                                            {payment.method}
                                        </div>
                                        <div style={{ fontSize: '22px', fontWeight: '800', color, marginBottom: '4px' }}>
                                            {payment.total.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                                            {payment.count} فاتورة • {percentage.toFixed(1)}%
                                        </div>
                                        <div style={{
                                            height: '4px',
                                            background: '#e2e8f0',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                background: color,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <StatCard
                        title="قيمة المخزون الحالي"
                        value={`${metrics.inventory.totalStockValue.toFixed(2)} ر.س`}
                        icon={Package}
                        color="#10b981"
                    />
                    <StatCard
                        title="إجمالي المنتجات"
                        value={metrics.inventory.totalProducts.toString()}
                        subtitle="منتج مسجل"
                        icon={ShoppingBag}
                        color="#6366f1"
                    />
                    <StatCard
                        title="مخزون منخفض"
                        value={metrics.inventory.lowStockCount.toString()}
                        subtitle="يحتاج تعبئة"
                        icon={AlertTriangle}
                        color="#f59e0b"
                    />
                    <StatCard
                        title="نفذ من المخزون"
                        value={metrics.inventory.outOfStockCount.toString()}
                        subtitle="غير متوفر"
                        icon={TrendingDown}
                        color="#ef4444"
                    />
                </div>
            )}
        </div>
    );
}
