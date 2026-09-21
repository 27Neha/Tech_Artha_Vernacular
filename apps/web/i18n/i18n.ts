'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import mrCommon from './locales/mr/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      hi: { common: hiCommon },
      mr: { common: mrCommon }
    },
    lng: 'en', // Set default language
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  });

export default i18n;
