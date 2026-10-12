import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const resources = {
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
  as: { common: asCommon },
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
    } catch (error) {
      console.log('Error reading language', error);
    }
    callback('en'); // fallback
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('language', lng);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already safe from xss
    },
    react: {
      useSuspense: false, // Fixes issues with async loading in React Native
    }
  });

export default i18n;
