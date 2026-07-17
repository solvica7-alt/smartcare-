import * as React from 'react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
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
    XMarkIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { t, language, setLanguage, dir } = useI18n();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { name: t('dashboard'), href: '/dashboard', icon: ChartPieIcon },
        { name: t('newPatient'), href: '/new-patient', icon: DocumentPlusIcon },
        { name: t('reports'), href: '/reports', icon: DocumentTextIcon },
        { name: t('transfer'), href: '/transfer', icon: QrCodeIcon },
        { name: t('inventory'), href: '/inventory', icon: ClipboardDocumentListIcon },
        { name: t('compare'), href: '/compare', icon: ScaleIcon },
        { name: t('translate'), href: '/translate', icon: LanguageIcon },
        { name: t('chatbot'), href: '/chatbot', icon: ChatBubbleLeftRightIcon },
        { name: t('crisis'), href: '/crisis', icon: ExclamationTriangleIcon },
    ];

    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200`} dir={dir}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} z-30 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col flex-shrink-0 transition-transform duration-300 transform 
                ${isSidebarOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')} 
                lg:relative lg:translate-x-0 transition-colors duration-200
            `}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{t('appName')}</h1>
                        {user && <p className="text-sm text-gray-500 dark:text-gray-400">{t('welcome')}, {user.username}</p>}
                    </div>
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-500">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                                `flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${isActive
                                    ? 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900 dark:text-blue-200'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400'
                                }`
                            }
                        >
                            <item.icon className={`h-5 w-5 ${dir === 'rtl' ? 'me-3' : 'ms-3'}`} />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t dark:border-gray-700 space-y-2">
                    <button
                        onClick={() => {
                            if (language === 'ar') setLanguage('en');
                            else if (language === 'en') setLanguage('it');
                            else setLanguage('ar');
                        }}
                        className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <GlobeAltIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-3' : 'ms-3'} text-blue-500`} />
                        {language === 'ar' ? 'English' : language === 'en' ? 'Italiano' : 'العربية'}
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {isDarkMode ? <SunIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-3' : 'ms-3'} text-yellow-500`} /> : <MoonIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-3' : 'ms-3'} text-gray-500`} />}
                        {isDarkMode ? t('lightMode') : t('darkMode')}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
                    >
                        <ArrowRightOnRectangleIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-3' : 'ms-3'}`} />
                        {t('logout')}
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
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">{t('appName')}</h1>
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