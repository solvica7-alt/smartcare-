
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LockClosedIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useI18n } from '../context/I18nContext';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { t, dir } = useI18n();
    const navigate = useNavigate();
    const location = useLocation();
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    useEffect(() => {
        // Clear success message after a few seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(''); // Clear success message on new login attempt
        const result = await login(username, password);

        if (result.success) {
            setError('');
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {t('loginTitle')}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    {error && <p className="text-sm text-center text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
                    {successMessage && (
                        <div className="text-sm text-center text-green-700 bg-green-50 p-3 rounded-md flex items-center justify-center">
                            <CheckCircleIcon className="h-5 w-5 me-2" />
                            {successMessage}
                        </div>
                    )}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="username" className="sr-only">{t('usernamePlaceholder')}</label>
                            <div className="relative">
                                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                    <UserIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    className={`appearance-none rounded-none relative block w-full px-3 py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} border border-blue-400 placeholder-gray-500 text-gray-900 bg-blue-100 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                                    placeholder={t('usernamePlaceholder')}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">{t('passwordPlaceholder')}</label>
                            <div className="relative">
                                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                    <LockClosedIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className={`appearance-none rounded-none relative block w-full px-3 py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} border border-blue-400 placeholder-gray-500 text-gray-900 bg-blue-100 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                                    placeholder={t('passwordPlaceholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                             </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('loginButton')}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6 text-sm">
                    <p className="text-gray-600">
                        {t('noAccount')}
                    </p>
                    <div className="flex justify-center gap-4 mt-2">
                        <Link to="/register/medic" className="font-medium text-blue-600 hover:text-blue-500 transition">
                            {t('registerMedic')}
                        </Link>
                        <span className="text-gray-400">|</span>
                        <Link to="/register/doctor" className="font-medium text-blue-600 hover:text-blue-500 transition">
                            {t('registerDoctor')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
