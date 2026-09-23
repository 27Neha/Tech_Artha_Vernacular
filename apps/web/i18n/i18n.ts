'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import mrCommon from './locales/mr/common.json';
import guCommon from './locales/gu/common.json';
import bnCommon from './locales/bn/common.json';
import taCommon from './locales/ta/common.json';
import teCommon from './locales/te/common.json';
import knCommon from './locales/kn/common.json';
import mlCommon from './locales/ml/common.json';
import paCommon from './locales/pa/common.json';
import orCommon from './locales/or/common.json';
import asCommon from './locales/as/common.json';


i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      hi: { common: hiCommon },
      mr: { common: mrCommon },
      gu: { common: guCommon },
      bn: { common: bnCommon },
      ta: { common: taCommon },
      te: { common: teCommon },
      kn: { common: knCommon },
      ml: { common: mlCommon },
      pa: { common: paCommon },
      or: { common: orCommon },
      as: { common: asCommon }

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
