
import React, { useState } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserIcon, LockClosedIcon, IdentificationIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useI18n } from '../context/I18nContext';

const RegisterPage: React.FC = () => {
    const { role } = useParams<{ role: string }>();
    const navigate = useNavigate();
    const { register } = useAuth();
    const { t, dir } = useI18n();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (role !== 'medic' && role !== 'doctor') {
        return <Navigate to="/" replace />;
    }

    const roleText = role === 'medic' ? t('medic') : t('doctor');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !username || !password) {
            setError(t('fillAllFields'));
            return;
        }

        const result = await register({ name, username, password, role: role as 'medic' | 'doctor' });

        if (result.success) {
            navigate('/', { state: { message: result.message } });
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {t('createNewAccount').replace('{role}', roleText)}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-sm text-center text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
                    
                     <div>
                        <label htmlFor="name" className="sr-only">{t('fullName')}</label>
                        <div className="relative">
                            <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                <IdentificationIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
                            </div>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className={`appearance-none rounded-md relative block w-full px-3 py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} border border-blue-400 placeholder-gray-500 text-gray-900 bg-blue-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder={t('fullName')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="username" className="sr-only">{t('usernameEnglish')}</label>
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
                                className={`appearance-none rounded-md relative block w-full px-3 py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} border border-blue-400 placeholder-gray-500 text-gray-900 bg-blue-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder={t('usernameEnglish')}
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
                                autoComplete="new-password"
                                required
                                className={`appearance-none rounded-md relative block w-full px-3 py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} border border-blue-400 placeholder-gray-500 text-gray-900 bg-blue-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder={t('passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                         </div>
                    </div>
                    

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('createAccount')}
                        </button>
                    </div>
                </form>
                 <div className="text-center mt-6 text-sm">
                    <Link to="/" className="font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center gap-2">
                        {dir === 'rtl' ? <ArrowRightIcon className="h-4 w-4" /> : <ArrowLeftIcon className="h-4 w-4" />}
                        {t('backToLogin')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
