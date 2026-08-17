import i18n, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import or from './locales/or.json';
import pa from './locales/pa.json';
import ta from './locales/ta.json';
import te from './locales/te.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: function (callback: (lang: string) => void) {
    if (typeof window === 'undefined') {
      return callback('en');
    }
    try {
      AsyncStorage.getItem(STORE_LANGUAGE_KEY).then((language) => {
        if (language) {
          return callback(language);
        } else {
          return callback('en');
        }
      });
    } catch (error) {
      console.log('Error reading language', error);
      callback('en');
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error caching language', error);
    }
  },
};

i18n
  .use(languageDetectorPlugin)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    fallbackLng: 'en',

    resources: {
      en: { translation: en },
      hi: { translation: hi },
      bn: { translation: bn },
      gu: { translation: gu },
      kn: { translation: kn },
      ml: { translation: ml },
      mr: { translation: mr },
      or: { translation: or },
      pa: { translation: pa },
      ta: { translation: ta },
      te: { translation: te },
      bho: { translation: {} },
      mai: { translation: {} },
      as: { translation: {} },
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
