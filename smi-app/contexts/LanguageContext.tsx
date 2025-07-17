import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n, { setLanguage as setI18nLanguage } from '../i18n';

export type Language = 'en' | 'mr' | 'hi';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextProps>({
  language: 'en',
  setLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(i18n.locale as Language || 'en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setI18nLanguage(lang);
  };

  useEffect(() => {
    setI18nLanguage(language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext); 