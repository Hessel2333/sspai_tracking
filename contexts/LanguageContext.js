import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('zh'); // Default to Chinese

    const toggleLang = () => {
        setLang(prev => prev === 'zh' ? 'en' : 'zh');
    };

    const t = (key) => {
        const keys = key.split('.');
        let val = translations[lang];
        for (const k of keys) {
            val = val ? val[k] : undefined;
        }
        return val || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
