import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import enCommon from '../locales/en/common.json';
import hiCommon from '../locales/hi/common.json';
import mrCommon from '../locales/mr/common.json';

const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  mr: { common: mrCommon }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Initialize with the saved language from authStore
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v4' // Required for React Native compatibility
  });

export default i18n;
