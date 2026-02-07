import * as React from 'react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import OfflineIndicator from './OfflineIndicator';
import {
    ChartPieIcon,
    DocumentPlusIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentListIcon,
    ScaleIcon,
    LanguageIcon,
    QrCodeIcon,
    SunIcon,
    MoonIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { name: 'لوحة التحكم', href: '/dashboard', icon: ChartPieIcon },
        { name: 'مريض جديد', href: '/new-patient', icon: DocumentPlusIcon },
        { name: 'التقارير', href: '/reports', icon: DocumentTextIcon },
        { name: 'تسليم واستلام حالات', href: '/transfer', icon: QrCodeIcon },
        { name: 'المخزون الطبي', href: '/inventory', icon: ClipboardDocumentListIcon },
        { name: 'تحليل تطوري', href: '/compare', icon: ScaleIcon },
        { name: 'مترجم فوري', href: '/translate', icon: LanguageIcon },
        { name: 'المستشار الذكي', href: '/chatbot', icon: ChatBubbleLeftRightIcon },
    ];

    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200`} dir="rtl">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 right-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col flex-shrink-0 transition-transform duration-300 transform 
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
                lg:relative lg:translate-x-0 transition-colors duration-200
            `}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">المساعد الطبي</h1>
                        {user && <p className="text-sm text-gray-500 dark:text-gray-400">مرحباً, {user.username}</p>}
                    </div>
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-500">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                                `flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${isActive
                                    ? 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900 dark:text-blue-200'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400'
                                }`
                            }
                        >
                            <item.icon className="h-5 w-5 me-3" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t dark:border-gray-700 space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {isDarkMode ? <SunIcon className="h-5 w-5 me-3 text-yellow-500" /> : <MoonIcon className="h-5 w-5 me-3 text-gray-500" />}
                        {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 me-3" />
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between transition-colors duration-200">
                    <button onClick={toggleSidebar} className="p-2 text-gray-600 dark:text-gray-300">
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">المساعد الطبي</h1>
                    <div className="w-10"></div> {/* Spacer for symmetry */}
                </header>

                <OfflineIndicator />
                <div className="flex-1 p-4 lg:p-6 overflow-y-auto print:p-0 print:overflow-visible">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;