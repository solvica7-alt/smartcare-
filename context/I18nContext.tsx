import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { translations, Language } from '../locales/translations';
import { getData, setData, StorageKeys } from '../services/StorageService';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['ar']) => string;
    dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('ar');

    useEffect(() => {
        getData<Language>('app_language', 'ar').then(saved => setLanguage(saved));
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        setData('app_language', lang);
    };

    const t = (key: keyof typeof translations['ar']): string => {
        return translations[language][key] || translations['ar'][key];
    };

    const dir = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t, dir }}>
            <div dir={dir}>{children}</div>
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
