import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, LogOut, Menu, X, Users, Settings, ShoppingCart, Plane, Building2, Tags, BarChart3, ClipboardList, RotateCcw, DollarSign } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/', section: 'main' },
        { icon: Package, label: 'المنتجات', path: '/products', section: 'inventory' },
        { icon: Tags, label: 'التصنيفات', path: '/categories', section: 'inventory' },
        { icon: ClipboardList, label: 'تسوية المخزون', path: '/stock-adjustments', section: 'inventory' },
        { icon: DollarSign, label: 'إدارة الأسعار', path: '/products/price-management', section: 'inventory' },
        { icon: ShoppingCart, label: 'المبيعات', path: '/sales', section: 'transactions' },
        { icon: RotateCcw, label: 'المرتجعات', path: '/returns', section: 'transactions' },
        { icon: Plane, label: 'استلام بضاعة', path: '/receive-goods', section: 'transactions' },
        { icon: Building2, label: 'الموردين', path: '/suppliers', section: 'people' },
        { icon: Users, label: 'العملاء', path: '/customers', section: 'people' },
        { icon: Users, label: 'المستخدمين', path: '/users', section: 'admin' },
        { icon: BarChart3, label: 'التقارير', path: '/reports', section: 'admin' },
        { icon: Settings, label: 'إعدادات المنصات', path: '/settings/platforms', section: 'admin' },
    ];

    const sections = {
        main: 'الرئيسية',
        inventory: 'المخزون',
        transactions: 'المعاملات',
        people: 'الأشخاص',
        admin: 'الإدارة'
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? '280px' : '0',
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                color: 'white',
                transition: 'width 0.3s ease',
                overflow: 'hidden',
                position: 'fixed',
                right: 0,
                height: '100vh',
                zIndex: 100,
                boxShadow: sidebarOpen ? '-4px 0 12px rgba(0,0,0,0.1)' : 'none'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold'
                    }}>
                        ن
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>نظام الإدارة</h2>
                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>ERP System</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{
                    padding: '16px 12px',
                    height: 'calc(100vh - 200px)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}>
                    {Object.entries(sections).map(([key, label]) => {
                        const sectionItems = navItems.filter(item => item.section === key);
                        if (sectionItems.length === 0) return null;

                        return (
                            <div key={key} style={{ marginBottom: '24px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    padding: '0 12px',
                                    marginBottom: '8px'
                                }}>
                                    {label}
                                </div>
                                {sectionItems.map(item => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                borderRadius: '10px',
                                                marginBottom: '4px',
                                                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                color: isActive ? '#818cf8' : '#cbd5e1',
                                                transition: 'all 0.2s ease',
                                                textDecoration: 'none',
                                                fontSize: '14px',
                                                fontWeight: isActive ? '600' : '500',
                                                border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.transform = 'translateX(-4px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }
                                            }}
                                        >
                                            <item.icon size={18} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    padding: '16px 20px',
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        padding: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: 'white'
                        }}>
                            {user.username?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#e2e8f0',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {user.fullName || 'مدير النظام'}
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                textTransform: 'capitalize'
                            }}>
                                {user.role || 'Admin'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                        }}
                    >
                        <LogOut size={16} />
                        تسجيل خروج
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginRight: sidebarOpen ? '280px' : '0',
                transition: 'margin 0.3s ease',
                minHeight: '100vh',
                background: '#f8fafc'
            }}>
                {/* Header */}
                <header style={{
                    background: 'white',
                    padding: '16px 32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '8px',
                            borderRadius: '6px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                        }}
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                            }}
                        >
                            <Settings color="#64748b" size={20} />
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div style={{ padding: '32px' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
