import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import he from './locales/he.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

const resources = {
  he: { translation: he },
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he',
    supportedLngs: ['he', 'en', 'fr', 'es'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mikveh-lang',
    },
  });

export default i18n;
