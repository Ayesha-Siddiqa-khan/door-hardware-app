import { createContext, useContext, useMemo } from 'react';
import { translations } from './translations';

const LocalizationContext = createContext({
  language: 'en',
  t: (key) => key,
  setLanguage: () => {},
});

export function LocalizationProvider({ language, setLanguage, children }) {
  const value = useMemo(() => {
    const selected = translations[language] || translations.en;
    const translator = (key) => selected[key] ?? key;
    return {
      language,
      setLanguage,
      t: translator,
    };
  }, [language, setLanguage]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useTranslation() {
  return useContext(LocalizationContext);
}
